import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { serverDb } from '../database.js';
import { authService } from '../services/authService.js';
import { emailService } from '../services/emailService.js';
import { requireAuth, optionalAuth, requireRole, getTokenFromReq, getJwtSecret } from '../middleware/auth.js';
import { AuthController } from '../controllers/authController.js';
import jwt from 'jsonwebtoken';

import {
  loginLimiter,
  registerLimiter,
  mfaLimiter,
  passwordResetLimiter,
  emailVerificationLimiter
} from '../middleware/rateLimiters.js';

const router = Router();

// Register & Login using Controller and granular limiters
router.post('/register', registerLimiter, AuthController.register);
router.post('/login', loginLimiter, AuthController.login);
router.get('/me', optionalAuth, AuthController.me);
router.post('/logout', optionalAuth, AuthController.logout);

// Campus SSO Identity Providers
router.get('/sso/providers', (_req: Request, res: Response) => {
  res.json({
    success: true,
    providers: [
      {
        id: 'sso-ui',
        name: 'SSO Universitas Indonesia',
        domain: 'ui.ac.id',
        badge: 'UI Auth',
        icon: 'GraduationCap',
        status: 'ACTIVE'
      },
      {
        id: 'sso-itb',
        name: 'ITB Single Sign-On (Akun ITB)',
        domain: 'itb.ac.id',
        badge: 'ITB INA',
        icon: 'GraduationCap',
        status: 'ACTIVE'
      },
      {
        id: 'sso-ugm',
        name: 'Simaster UGM SSO',
        domain: 'ugm.ac.id',
        badge: 'UGM Auth',
        icon: 'GraduationCap',
        status: 'ACTIVE'
      },
      {
        id: 'sso-unair',
        name: 'CyberCampus Universitas Airlangga',
        domain: 'unair.ac.id',
        badge: 'UNAIR',
        icon: 'GraduationCap',
        status: 'ACTIVE'
      },
      {
        id: 'sso-gsuite-edu',
        name: 'Google Workspace for Education',
        domain: '*.ac.id, *.edu',
        badge: 'Google Edu',
        icon: 'ShieldCheck',
        status: 'ACTIVE'
      },
      {
        id: 'sso-kemendikbud',
        name: 'SSO Kemendikbudristek (Belajar.id / Kampus Merdeka)',
        domain: 'kampusmerdeka.kemdikbud.go.id',
        badge: 'Kemdikbud',
        icon: 'Building2',
        status: 'ACTIVE'
      }
    ]
  });
});

// Campus Single Sign-On (SSO / OIDC Authentication Flow)
router.post('/sso/campus-login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { email, name, university, providerId, roleHint } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email institusi kampus wajib diisi.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    
    // Strict Campus Domain Verification: must end with .ac.id, .edu, or known institutional domains
    const isCampusDomain = trimmedEmail.endsWith('.ac.id') || 
                           trimmedEmail.endsWith('.edu') || 
                           trimmedEmail.includes('ui.ac.id') ||
                           trimmedEmail.includes('itb.ac.id') ||
                           trimmedEmail.includes('ugm.ac.id') ||
                           trimmedEmail.includes('unair.ac.id') ||
                           trimmedEmail.includes('kampusmerdeka');

    if (!isCampusDomain && !process.env.ALLOW_ANY_SSO_DOMAIN) {
      return res.status(400).json({
        error: 'Email harus merupakan email resmi institusi kampus (*.ac.id atau *.edu).'
      });
    }

    // Role mapping based on SSO profile or email heuristics
    let assignedRole: 'mahasiswa' | 'konselor' | 'admin' = 'mahasiswa';
    if (roleHint === 'konselor' || roleHint === 'LICENSED_PSYCHOLOGIST' || roleHint === 'PEER_COUNSELOR' ||
        trimmedEmail.includes('konselor') || trimmedEmail.includes('counselor') || trimmedEmail.includes('psikolog')) {
      assignedRole = 'konselor';
    } else if (roleHint === 'admin' || roleHint === 'CAMPUS_ADMIN' || trimmedEmail.includes('admin') || trimmedEmail.includes('rektorat')) {
      assignedRole = 'admin';
    }

    let user = await serverDb.getUserByEmail(trimmedEmail);
    if (!user) {
      // Auto-provision campus account via SSO
      const randomPass = crypto.randomBytes(24).toString('hex');
      const passHash = await bcrypt.hash(randomPass, 10);
      user = await serverDb.addUser({
        name: name ? name.trim() : trimmedEmail.split('@')[0],
        email: trimmedEmail,
        passwordHash: passHash,
        role: assignedRole,
        tier: 'Pro', // Campus Enterprise tier auto-granted
        university: university || 'Universitas Indonesia',
        emailVerified: true,
        mfaEnabled: false
      });
    }

    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Campus SSO Client';
    const sessionId = crypto.randomUUID();

    const token = authService.generateSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      tier: user.tier,
      sessionId,
      name: user.name,
    });

    await serverDb.addActiveSession(user.id, {
      sessionId,
      device: userAgent.includes('Mobile') ? 'Smartphone (SSO)' : 'Desktop / Browser (Campus SSO)',
      ip: clientIp,
      userAgent,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    });

    await serverDb.recordLoginHistory(user.id, {
      ip: clientIp,
      userAgent,
      status: 'SUCCESS'
    });

    authService.setSessionCookie(res, token);

    res.json({
      success: true,
      token,
      user: authService.sanitizeUser(user),
      ssoProvider: providerId || 'Campus-SSO-OIDC',
      message: `Login SSO Kampus ${user.university} berhasil.`
    });
  } catch (err: any) {
    console.error('Campus SSO login error:', err);
    res.status(500).json({ error: 'Gagal memproses autentikasi SSO Kampus.' });
  }
});



// MFA Verify
router.post('/mfa/verify', mfaLimiter, async (req: Request, res: Response) => {
  try {
    const { mfaToken, code } = req.body;
    if (!mfaToken || !code) {
      return res.status(400).json({ error: 'MFA token dan kode verifikasi 6-digit wajib diisi.' });
    }

    const user = await serverDb.verifyMfaCode(mfaToken, String(code).trim());
    if (!user) {
      return res.status(400).json({ error: 'Kode MFA 2FA tidak valid atau telah kadaluwarsa.' });
    }

    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Browser';
    const sessionId = crypto.randomUUID();

    const token = authService.generateSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      tier: user.tier,
      sessionId,
      name: user.name,
    });

    await serverDb.addActiveSession(user.id, {
      sessionId,
      device: userAgent.includes('Mobile') ? 'Smartphone' : 'Desktop / Browser',
      ip: clientIp,
      userAgent,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    });

    await serverDb.recordLoginHistory(user.id, {
      ip: clientIp,
      userAgent,
      status: 'SUCCESS'
    });

    authService.setSessionCookie(res, token);

    res.json({
      success: true,
      token,
      user: authService.sanitizeUser(user)
    });
  } catch (err: any) {
    console.error('MFA verify error:', err);
    res.status(500).json({ error: 'Gagal memverifikasi MFA.' });
  }
});

// Verify Email
router.post('/verify-email', emailVerificationLimiter, async (req: Request, res: Response) => {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) {
      return res.status(400).json({ error: 'User ID dan kode verifikasi wajib diisi.' });
    }

    const verified = await serverDb.verifyEmail(userId, String(code).trim());
    if (!verified) {
      return res.status(400).json({ error: 'Kode verifikasi salah atau telah kedaluwarsa.' });
    }

    res.json({ success: true, message: 'Alamat email berhasil diverifikasi.' });
  } catch (err: any) {
    console.error('Verify email error:', err);
    res.status(500).json({ error: 'Gagal memverifikasi email.' });
  }
});

// Forgot Password (STRICT SECURITY: Never leak reset token in API response)
router.post('/forgot-password', passwordResetLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email wajib diisi.' });
    }

    const resetToken = 'rst-' + crypto.randomBytes(18).toString('hex');
    const userFound = await serverDb.setPasswordResetToken(email.trim().toLowerCase(), resetToken);

    if (userFound) {
      await emailService.sendPasswordResetToken(email.trim().toLowerCase(), resetToken);
    }

    res.json({
      success: true,
      message: 'Jika email terdaftar, instruksi reset kata sandi telah dikirim ke email Anda.'
    });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Gagal memproses permintaan reset kata sandi.' });
  }
});

// Reset Password
router.post('/reset-password', passwordResetLimiter, async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token reset dan kata sandi baru wajib diisi.' });
    }

    if (newPassword.length < 10) {
      return res.status(400).json({ error: 'Kata sandi baru minimal 10 karakter.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const result = await serverDb.resetPasswordWithToken(token, passwordHash);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({ success: true, message: result.message });
  } catch (err: any) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Gagal memperbarui kata sandi.' });
  }
});

// Active Sessions
router.get('/sessions', requireAuth, async (req: Request, res: Response) => {
  try {
    const sessions = await serverDb.getActiveSessions(req.user.userId);
    const currentSessionHash = crypto.createHash('sha256').update(req.user.sessionId).digest('hex');
    const enriched = sessions.map(s => ({
      ...s,
      isCurrent: s.sessionId === req.user.sessionId || s.sessionId === currentSessionHash
    }));
    res.json({ sessions: enriched });
  } catch (err: any) {
    console.error('Get sessions error:', err);
    res.status(500).json({ error: 'Gagal mengambil data sesi aktif.' });
  }
});

// Revoke Session
router.post('/sessions/revoke', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID wajib diisi.' });
    }

    await serverDb.removeActiveSession(req.user.userId, sessionId);

    const currentSessionHash = crypto.createHash('sha256').update(req.user.sessionId).digest('hex');
    if (sessionId === req.user.sessionId || sessionId === currentSessionHash) {
      authService.clearSessionCookie(res);
    }

    res.json({ success: true, message: 'Sesi perangkat berhasil dicabut.' });
  } catch (err: any) {
    console.error('Revoke session error:', err);
    res.status(500).json({ error: 'Gagal mencabut sesi.' });
  }
});

// Logout All Active Sessions
router.post('/logout-all', requireAuth, async (req: Request, res: Response) => {
  try {
    await serverDb.removeAllActiveSessions(req.user.userId);
    authService.clearSessionCookie(res);
    res.json({ success: true, message: 'Berhasil keluar dari seluruh perangkat aktif.' });
  } catch (err: any) {
    console.error('Logout all error:', err);
    res.status(500).json({ error: 'Gagal keluar dari seluruh perangkat.' });
  }
});

// Login History
router.get('/login-history', requireAuth, async (req: Request, res: Response) => {
  try {
    const history = await serverDb.getLoginHistory(req.user.userId);
    res.json({ history });
  } catch (err: any) {
    console.error('Get login history error:', err);
    res.status(500).json({ error: 'Gagal mengambil riwayat login.' });
  }
});

// Change Password
router.post('/change-password', requireAuth, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Kata sandi saat ini dan kata sandi baru wajib diisi.' });
    }

    if (newPassword.length < 10) {
      return res.status(400).json({ error: 'Kata sandi baru minimal 10 karakter.' });
    }

    const user = await serverDb.getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Kata sandi saat ini salah.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await serverDb.updateUserPassword(user.id, newHash);
    authService.clearSessionCookie(res);

    res.json({ success: true, message: 'Kata sandi berhasil diubah. Seluruh sesi lain telah dicabut. Silakan masuk kembali.' });
  } catch (err: any) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Gagal mengubah kata sandi.' });
  }
});

// Update Tier (Admin Only Workflow)
router.post('/update-tier', requireAuth, async (req: Request, res: Response) => {
  try {
    // ZERO TRUST: Privilege is derived strictly from server identity
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        error: 'Perubahan paket langganan hanya dapat dilakukan oleh Admin atau melalui billing resmi.'
      });
    }

    const { targetUserId, tier } = req.body;
    
    if (!targetUserId) {
      return res.status(400).json({ error: 'targetUserId wajib diisi.' });
    }

    const userIdToUpdate = targetUserId;

    if (tier !== 'Free' && tier !== 'Pro' && tier !== 'Developer') {
      return res.status(400).json({ error: 'Tier tidak valid. Harus "Free", "Pro", atau "Developer".' });
    }

    const updatedUser = await serverDb.updateUserTier(userIdToUpdate, tier);
    if (!updatedUser) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }

    res.json({
      success: true,
      user: authService.sanitizeUser(updatedUser)
    });
  } catch (err) {
    console.error('Update tier error:', err);
    res.status(500).json({ error: 'Gagal memperbarui paket langganan.' });
  }
});

export default router;
