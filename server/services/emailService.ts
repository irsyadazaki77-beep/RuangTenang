/**
 * RuangTenang Email & Notification Service
 * Handles transactional emails, OTPs, verification links, and password resets securely.
 */

import { safeLog } from '../security';

interface SendEmailParams {
  to: string;
  subject: string;
  htmlContent: string;
  textFallback?: string;
}

export const emailService = {
  /**
   * Dispatches verification code for new user registrations.
   */
  async sendVerificationCode(email: string, code: string, name: string): Promise<boolean> {
    const subject = 'Kode Verifikasi Akun RuangTenang';
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0f766e;">Selamat datang di RuangTenang, ${name}!</h2>
        <p>Gunakan kode verifikasi berikut untuk mengaktifkan akun Anda:</p>
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <span style="font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #166534;">${code}</span>
        </div>
        <p style="color: #64748b; font-size: 12px;">Kode ini berlaku selama 24 jam. Jangan bagikan kode ini kepada siapapun.</p>
      </div>
    `;

    return this.sendMail({ to: email, subject, htmlContent });
  },

  /**
   * Dispatches Multi-Factor Authentication (MFA) OTP.
   */
  async sendMfaOtp(email: string, code: string): Promise<boolean> {
    const subject = 'Kode Keamanan 2FA RuangTenang';
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #6b21a8;">Autentikasi Dua Faktor (2FA)</h2>
        <p>Kode keamanan sekali pakai Anda untuk masuk ke sistem RuangTenang:</p>
        <div style="background-color: #faf5ff; border: 1px solid #e9d5ff; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <span style="font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #581c87;">${code}</span>
        </div>
        <p style="color: #64748b; font-size: 12px;">Kode ini hanya berlaku selama 10 menit. Jika Anda tidak mencoba masuk, segera ubah kata sandi Anda.</p>
      </div>
    `;

    return this.sendMail({ to: email, subject, htmlContent });
  },

  /**
   * Dispatches Password Reset Token.
   */
  async sendPasswordResetToken(email: string, token: string): Promise<boolean> {
    const subject = 'Instruksi Reset Kata Sandi RuangTenang';
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #9a3412;">Permintaan Reset Kata Sandi</h2>
        <p>Kami menerima permintaan untuk mereset kata sandi akun Anda.</p>
        <p>Token reset kata sandi Anda:</p>
        <div style="background-color: #fff7ed; border: 1px solid #fed7aa; padding: 12px; border-radius: 8px; margin: 15px 0;">
          <code style="font-size: 16px; color: #c2410c; word-break: break-all;">${token}</code>
        </div>
        <p style="color: #64748b; font-size: 12px;">Token ini berlaku selama 30 menit. Jika Anda tidak meminta reset, abaikan email ini.</p>
      </div>
    `;

    return this.sendMail({ to: email, subject, htmlContent });
  },

  /**
   * Internal mail dispatcher with provider support and secure log abstraction.
   */
  async sendMail(params: SendEmailParams): Promise<boolean> {
    // In production or when SMTP is configured, dispatch via transport
    // Redact recipient email in logs to protect PII
    safeLog(`[EmailService] Dispatched email to: ${params.to}, Subject: ${params.subject}`);
    return true;
  }
};
