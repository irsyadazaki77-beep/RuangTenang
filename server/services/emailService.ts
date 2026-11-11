/**
 * RuangTenang Email & Notification Service
 * Production-grade transactional email dispatcher supporting:
 * - SMTP Transport (Nodemailer with connection pooling)
 * - Modern HTTP Cloud Providers (Resend API fallback)
 * - Development & Testing Mock Sink (Zero-config fallback with PII masking)
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { safeLog } from '../security.js';

export interface SendEmailParams {
  to: string;
  subject: string;
  htmlContent: string;
  textFallback?: string;
  from?: string;
}

export interface AppointmentReminderEmailParams {
  to: string;
  recipientName: string;
  counselorName: string;
  scheduledAt: string;
  milestone: 'H-24H' | 'H-1H' | 'H-15M';
  mode?: string;
  meetingLink?: string;
}

function maskEmailForLogging(email: string): string {
  if (!email || !email.includes('@')) return '***@***';
  const [user, domain] = email.split('@');
  const maskedUser = user.length <= 2 ? `${user.charAt(0)}*` : `${user.charAt(0)}***${user.charAt(user.length - 1)}`;
  return `${maskedUser}@${domain}`;
}

export class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured = false;
  private defaultFrom: string;
  private testSentEmails: Array<SendEmailParams & { sentAt: string }> = [];

  constructor() {
    this.defaultFrom = process.env.SMTP_FROM || process.env.EMAIL_FROM || 'RuangTenang Kampus <no-reply@ruangtenang.ac.id>';
    this.initTransporter();
  }

  private initTransporter(): void {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
    const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

    if (smtpHost && smtpUser && smtpPass) {
      try {
        this.transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          auth: {
            user: smtpUser,
            pass: smtpPass
          },
          pool: true,
          maxConnections: 5,
          maxMessages: 100
        });
        this.isConfigured = true;
        safeLog(`[EmailService] SMTP transporter initialized with host: ${smtpHost}:${smtpPort}`);
      } catch (err: any) {
        console.error('[EmailService] Failed to initialize SMTP transporter:', err?.message || err);
        this.transporter = null;
        this.isConfigured = false;
      }
    } else {
      // In dev or test environments without SMTP env vars, use simulated sink
      this.isConfigured = false;
    }
  }

  /**
   * Internal mail dispatcher with provider support, HTML+text generation, and secure log abstraction.
   */
  async sendMail(params: SendEmailParams): Promise<boolean> {
    const from = params.from || this.defaultFrom;
    const maskedTo = maskEmailForLogging(params.to);

    // Record for automated test verification
    if (process.env.NODE_ENV === 'test' || !this.isConfigured) {
      this.testSentEmails.push({
        ...params,
        sentAt: new Date().toISOString()
      });
      // Cap memory for test array
      if (this.testSentEmails.length > 100) this.testSentEmails.shift();
    }

    // 1. Try Resend HTTP API if configured and SMTP is missing
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!this.transporter && resendApiKey) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendApiKey}`
          },
          body: JSON.stringify({
            from,
            to: [params.to],
            subject: params.subject,
            html: params.htmlContent,
            text: params.textFallback
          }),
          signal: AbortSignal.timeout(8000)
        });

        if (res.ok) {
          safeLog(`[EmailService] Dispatched email via Resend API to: ${maskedTo}, Subject: "${params.subject}"`);
          return true;
        } else {
          const errBody = await res.text().catch(() => '');
          console.warn(`[EmailService] Resend API failed (${res.status}): ${errBody}`);
        }
      } catch (err: any) {
        console.error('[EmailService] Resend API request error:', err?.message || err);
      }
    }

    // 2. Dispatch via Nodemailer SMTP if configured
    if (this.transporter && this.isConfigured) {
      try {
        await this.transporter.sendMail({
          from,
          to: params.to,
          subject: params.subject,
          html: params.htmlContent,
          text: params.textFallback || params.htmlContent.replace(/<[^>]+>/g, ' ')
        });
        safeLog(`[EmailService] Dispatched email via SMTP to: ${maskedTo}, Subject: "${params.subject}"`);
        return true;
      } catch (err: any) {
        console.error(`[EmailService] SMTP delivery error to ${maskedTo}:`, err?.message || err);
        return false;
      }
    }

    // 3. Fallback mock / simulation mode (development / staging / offline)
    safeLog(`[EmailService] [SIMULATED] Dispatched email to: ${maskedTo}, Subject: "${params.subject}"`);
    return true;
  }

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

    return this.sendMail({
      to: email,
      subject,
      htmlContent,
      textFallback: `Selamat datang di RuangTenang, ${name}! Kode verifikasi Anda adalah: ${code}. Kode berlaku selama 24 jam.`
    });
  }

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

    return this.sendMail({
      to: email,
      subject,
      htmlContent,
      textFallback: `Kode keamanan 2FA RuangTenang Anda adalah: ${code}. Berlaku selama 10 menit.`
    });
  }

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

    return this.sendMail({
      to: email,
      subject,
      htmlContent,
      textFallback: `Permintaan reset kata sandi RuangTenang. Token Anda: ${token}. Berlaku selama 30 menit.`
    });
  }

  /**
   * Dispatches real-time automated Appointment Reminders to Students / Counselors.
   */
  async sendAppointmentReminder(params: AppointmentReminderEmailParams): Promise<boolean> {
    const milestoneLabels: Record<AppointmentReminderEmailParams['milestone'], string> = {
      'H-24H': 'Pengingat Janji Temu Konseling (Besok)',
      'H-1H': 'Perhatian: Sesi Konseling Dimulai dalam 1 Jam',
      'H-15M': 'Mendesak: Sesi Konseling Dimulai dalam 15 Menit!'
    };

    const subject = `[RuangTenang] ${milestoneLabels[params.milestone] || 'Pengingat Janji Temu Konseling'}`;
    const meetingSection = params.meetingLink
      ? `<p><strong>Tautan Pertemuan Virtual:</strong> <a href="${params.meetingLink}" style="color: #0284c7; text-decoration: underline;">${params.meetingLink}</a></p>`
      : `<p><strong>Mode Pertemuan:</strong> ${params.mode || 'Sesuai Kesepakatan Kampus'}</p>`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <div style="background-color: #0f766e; color: white; padding: 16px; border-radius: 8px 8px 0 0; text-align: center;">
          <h2 style="margin: 0; font-size: 20px;">RuangTenang Kampus</h2>
          <p style="margin: 4px 0 0 0; font-size: 14px;">Layanan Konseling & Kesejahteraan Mahasiswa</p>
        </div>
        <div style="padding: 20px;">
          <h3 style="color: #1e293b;">Halo, ${params.recipientName}!</h3>
          <p>Ini adalah pengingat resmi bahwa Anda memiliki sesi konseling dengan <strong>${params.counselorName}</strong>.</p>
          <div style="background-color: #f8fafc; border-left: 4px solid #0f766e; padding: 12px 16px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Waktu Sesi:</strong> ${params.scheduledAt}</p>
            ${meetingSection}
          </div>
          <p style="color: #475569; font-size: 13px;">Harap bersiap 5 menit sebelum sesi dimulai. Ruang obrolan dan video call aman dapat diakses langsung melalui dashboard RuangTenang Anda.</p>
        </div>
        <div style="background-color: #f1f5f9; padding: 12px; text-align: center; font-size: 11px; color: #64748b; border-radius: 0 0 8px 8px;">
          Pesan otomatis dari Sistem Konseling RuangTenang Kampus.
        </div>
      </div>
    `;

    return this.sendMail({
      to: params.to,
      subject,
      htmlContent,
      textFallback: `Pengingat Konseling RuangTenang untuk ${params.recipientName} dengan ${params.counselorName} pada ${params.scheduledAt}.`
    });
  }

  // --- Test & Inspection Helpers ---
  getLastSentEmailForTesting() {
    return this.testSentEmails[this.testSentEmails.length - 1];
  }

  getAllSentEmailsForTesting() {
    return [...this.testSentEmails];
  }

  clearSentEmailsForTesting() {
    this.testSentEmails = [];
  }
}

export const emailService = new EmailService();
