import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { serverDb } from '../database.js';
import { authService } from '../services/authService.js';
import { emailService } from '../services/emailService.js';
import { registerSchema, loginSchema } from '../validators/authSchemas.js';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Validasi gagal.',
          details: parsed.error.issues.map(e => ({ path: e.path.join('.'), message: e.message }))
        });
      }

      const { name, email, password, university } = parsed.data;
      const trimmedEmail = email.trim().toLowerCase();
      const existingUser = await serverDb.getUserByEmail(trimmedEmail);
      if (existingUser) {
        return res.status(400).json({ error: 'Email sudah terdaftar.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      // STRICT SECURITY ENFORCEMENT (Phase 1): Public registration is restricted to 'mahasiswa' ONLY
      const assignedRole = 'mahasiswa' as const;
      const newUser = await serverDb.addUser({
        name: name.trim(),
        email: trimmedEmail,
        passwordHash,
        role: assignedRole,
        tier: 'Free',
        university: university || 'Universitas Indonesia',
        emailVerified: false,
        mfaEnabled: false
      });

      const verificationCode = authService.generate6DigitCode();
      await serverDb.setEmailVerificationCode(newUser.id, verificationCode);
      await emailService.sendVerificationCode(newUser.email, verificationCode, newUser.name);

      const isDev = process.env.NODE_ENV !== 'production';
      
      return res.status(201).json({
        success: true,
        userId: newUser.id,
        message: isDev ? `Registrasi berhasil. [DEV MODE] Kode verifikasi Anda: ${verificationCode}` : 'Registrasi berhasil. Kode verifikasi email telah dikirim.'
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      return res.status(500).json({ error: 'Gagal melakukan registrasi.' });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Validasi gagal.',
          details: parsed.error.issues.map(e => ({ path: e.path.join('.'), message: e.message }))
        });
      }

      const { email, password } = parsed.data;
      const trimmedEmail = email.trim().toLowerCase();
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'Browser';

      const user = await serverDb.getUserByEmail(trimmedEmail);
      if (!user) {
        return res.status(401).json({ error: 'Email atau kata sandi salah.' });
      }

      const lockCheck = serverDb.isAccountLocked(user);
      if (lockCheck.locked && lockCheck.lockUntil) {
        const remainingMins = Math.ceil((new Date(lockCheck.lockUntil).getTime() - Date.now()) / 60000);
        return res.status(423).json({
          error: `Akun terkunci sementara demi keamanan akibat 5x salah kata sandi. Silakan coba lagi dalam ${remainingMins} menit.`
        });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        const failStatus = await serverDb.recordFailedAttempt(trimmedEmail);
        await serverDb.recordLoginHistory(user.id, { ip: clientIp, userAgent, status: 'FAILED' });

        if (failStatus.isLocked) {
          return res.status(423).json({
            error: 'Akun Anda telah terkunci selama 15 menit karena 5 kali percobaan masuk yang gagal.'
          });
        }

        const remainingAttempts = 5 - (failStatus.failedAttempts || 0);
        return res.status(401).json({
          error: `Email atau kata sandi salah. Sisa percobaan sebelum akun dikunci: ${remainingAttempts}x.`
        });
      }

      await serverDb.resetFailedAttempts(user.id);

      if (user.role === 'admin' || user.role === 'konselor' || user.mfaEnabled) {
        const mfaCode = authService.generate6DigitCode();
        const mfaToken = 'mfa-tok-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex');
        await serverDb.setMfaCode(user.id, mfaCode, mfaToken);
        await emailService.sendMfaOtp(user.email, mfaCode);

        const isDev = process.env.NODE_ENV !== 'production';

        return res.json({
          success: true,
          mfaRequired: true,
          mfaToken,
          message: isDev ? `Autentikasi Multi-Faktor (MFA 2FA) diperlukan. [DEV MODE] Kode MFA: ${mfaCode}` : 'Autentikasi Multi-Faktor (MFA 2FA) diperlukan. Kode verifikasi telah dikirim.'
        });
      }

      const sessionId = 'sess-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex');
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

      await serverDb.recordLoginHistory(user.id, { ip: clientIp, userAgent, status: 'SUCCESS' });
      authService.setSessionCookie(res, token);

      return res.json({
        success: true,
        user: authService.sanitizeUser(user)
      });
    } catch (err: any) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Gagal melakukan login.' });
    }
  }

  static async me(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.json({ user: null });
      }
      const user = await serverDb.getUserById(req.user.userId);
      if (!user) {
        authService.clearSessionCookie(res);
        return res.json({ user: null });
      }
      if (req.user.sessionId && !await serverDb.isSessionActive(user.id, req.user.sessionId)) {
        authService.clearSessionCookie(res);
        return res.json({ user: null, sessionRevoked: true });
      }
      return res.json({ success: true, user: authService.sanitizeUser(user) });
    } catch (err: any) {
      console.error('Me endpoint error:', err);
      return res.status(500).json({ error: 'Gagal mengambil data profil.' });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      if (req.user && req.user.sessionId) {
        await serverDb.removeActiveSession(req.user.userId, req.user.sessionId);
      }
      authService.clearSessionCookie(res);
      return res.json({ success: true, message: 'Berhasil keluar.' });
    } catch (err: any) {
      console.error('Logout error:', err);
      authService.clearSessionCookie(res);
      return res.json({ success: true });
    }
  }
}
