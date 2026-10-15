import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { serverDb } from '../database.js';
import { loginSchema, registerSchema } from '../validators/authSchemas.js';
import { authService } from '../services/authService.js';
import { mobileAuthService } from '../services/mobileAuthService.js';
import { emailService } from '../services/emailService.js';
import { metricsService } from '../services/metricsService.js';

export function nativeMobileClientOnly(req: Request, res: Response, next: NextFunction) {
  if (authService.isBrowserRequest(req) || req.headers.cookie) {
    return res.status(400).json({
      success: false,
      code: 'NATIVE_CLIENT_REQUIRED',
      error: 'Endpoint ini khusus aplikasi native; gunakan autentikasi browser berbasis cookie.',
    });
  }
  next();
}

export class MobileAuthController {
  static async register(req: Request, res: Response) {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Validasi gagal.',
          details: parsed.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })),
        });
      }

      const { name, email, password, university } = parsed.data;
      const normalizedEmail = email.trim().toLowerCase();
      if (await serverDb.getUserByEmail(normalizedEmail)) {
        return res.status(400).json({ error: 'Email sudah terdaftar.' });
      }

      const user = await serverDb.addUser({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash: await bcrypt.hash(password, 10),
        role: 'mahasiswa',
        tier: 'Free',
        university: university || '',
        emailVerified: false,
        mfaEnabled: false,
      });
      const verificationCode = authService.generate6DigitCode();
      await serverDb.setEmailVerificationCode(user.id, verificationCode);
      await emailService.sendVerificationCode(user.email, verificationCode, user.name);

      const tokens = await mobileAuthService.createSession(user, req);
      const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
      return res.status(201).json({
        ...tokens,
        userId: user.id,
        message: isDev
          ? `Registrasi berhasil. [DEV MODE] Kode verifikasi Anda: ${verificationCode}`
          : 'Registrasi berhasil. Kode verifikasi email telah dikirim.',
      });
    } catch (error) {
      console.error('Mobile registration error:', error);
      return res.status(500).json({ error: 'Gagal melakukan registrasi.' });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Validasi gagal.',
          details: parsed.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })),
        });
      }

      const email = parsed.data.email.trim().toLowerCase();
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'Native mobile client';
      const user = await serverDb.getUserByEmail(email);
      if (!user) return res.status(401).json({ error: 'Email atau kata sandi salah.' });

      const lock = serverDb.isAccountLocked(user);
      if (lock.locked && lock.lockUntil) {
        const remainingMins = Math.ceil((new Date(lock.lockUntil).getTime() - Date.now()) / 60000);
        return res.status(423).json({ error: `Akun terkunci sementara. Coba lagi dalam ${remainingMins} menit.` });
      }

      if (!await bcrypt.compare(parsed.data.password, user.passwordHash)) {
        const failure = await serverDb.recordFailedAttempt(email);
        await serverDb.recordLoginHistory(user.id, { ip: clientIp, userAgent, status: 'FAILED' });
        if (failure.isLocked) {
          return res.status(423).json({ error: 'Akun terkunci 15 menit karena percobaan masuk gagal.' });
        }
        return res.status(401).json({ error: 'Email atau kata sandi salah.' });
      }

      await serverDb.resetFailedAttempts(user.id);
      if (user.role === 'admin' || user.role === 'konselor' || user.role === 'campus_admin' || user.mfaEnabled) {
        const code = authService.generate6DigitCode();
        const mfaToken = `mfa-${crypto.randomBytes(32).toString('hex')}`;
        await serverDb.setMfaCode(user.id, code, mfaToken);
        await emailService.sendMfaOtp(user.email, code);
        const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
        return res.json({
          success: true,
          mfaRequired: true,
          mfaToken,
          message: isDev ? `MFA diperlukan. [DEV MODE] Kode MFA: ${code}` : 'Kode MFA telah dikirim.',
        });
      }

      await serverDb.recordLoginHistory(user.id, { ip: clientIp, userAgent, status: 'SUCCESS' });
      return res.json(await mobileAuthService.createSession(user, req));
    } catch (error) {
      console.error('Mobile login error:', error);
      return res.status(500).json({ error: 'Gagal melakukan login.' });
    }
  }

  static async verifyMfa(req: Request, res: Response) {
    try {
      const { mfaToken, code } = req.body || {};
      if (typeof mfaToken !== 'string' || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
        return res.status(400).json({ error: 'MFA token dan kode verifikasi 6-digit wajib diisi.' });
      }
      const user = await serverDb.verifyMfaCode(mfaToken, code);
      if (!user) return res.status(400).json({ error: 'Kode MFA tidak valid atau telah kedaluwarsa.' });

      await serverDb.recordLoginHistory(user.id, {
        ip: req.ip || req.socket.remoteAddress || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'Native mobile client',
        status: 'SUCCESS',
      });
      return res.json(await mobileAuthService.createSession(user, req));
    } catch (error) {
      console.error('Mobile MFA verification error:', error);
      return res.status(500).json({ error: 'Gagal memverifikasi MFA.' });
    }
  }

  static async refresh(req: Request, res: Response) {
    const refreshToken = req.body?.refreshToken;
    if (!mobileAuthService.isRefreshTokenFormatValid(refreshToken)) {
      metricsService.recordMobileRefresh('failure', req.headers['x-client-version']);
      return res.status(401).json({ success: false, code: 'INVALID_REFRESH_TOKEN', error: 'Refresh token tidak valid.' });
    }
    try {
      const result = await mobileAuthService.refresh(refreshToken);
      if (result.ok === false) {
        metricsService.recordMobileRefresh(result.code === 'REFRESH_TOKEN_REUSED' ? 'replay' : 'failure', req.headers['x-client-version']);
        return res.status(401).json({
          success: false,
          code: result.code,
          error: result.code === 'REFRESH_TOKEN_REUSED'
            ? 'Refresh token lama digunakan kembali. Sesi dicabut; silakan masuk lagi.'
            : 'Refresh token tidak valid atau telah kedaluwarsa.',
        });
      }
      metricsService.recordMobileRefresh('success', req.headers['x-client-version']);
      return res.json(result.result);
    } catch (error) {
      metricsService.recordMobileRefresh('failure', req.headers['x-client-version']);
      console.error('Mobile token refresh error:', error);
      return res.status(500).json({ error: 'Gagal memperbarui sesi.' });
    }
  }

  static async logout(req: Request, res: Response) {
    const refreshToken = req.body?.refreshToken;
    if (mobileAuthService.isRefreshTokenFormatValid(refreshToken)) {
      try {
        await mobileAuthService.revoke(refreshToken);
      } catch (error) {
        console.error('Mobile logout error:', error);
      }
    }
    metricsService.recordMobileLogout();
    return res.json({ success: true, message: 'Sesi aplikasi telah dicabut.' });
  }
}
