import { describe, it, expect, beforeEach } from 'vitest';
import { emailService } from '../../services/emailService.js';
import { LocalInferenceQueue } from '../../services/ai/ollamaRuntime.js';
import { getStorageDriver, LocalStorageDriver } from '../../services/storage/storageDriver.js';
import { processReminders } from '../../jobs/appointmentReminderJob.js';
import { executeSafeShellCommand, killProcessTree } from '../../services/coder/coderAgentService.js';

describe('Backend Performance & Architectural Upgrades', () => {
  beforeEach(() => {
    emailService.clearSentEmailsForTesting();
  });

  describe('EmailService Upgrades', () => {
    it('dispatches verification code with PII safety and fallback text', async () => {
      const ok = await emailService.sendVerificationCode('student@universitas.ac.id', '123456', 'Ahmad Dani');
      expect(ok).toBe(true);

      const lastSent = emailService.getLastSentEmailForTesting();
      expect(lastSent).toBeDefined();
      expect(lastSent?.to).toBe('student@universitas.ac.id');
      expect(lastSent?.subject).toContain('Kode Verifikasi Akun');
      expect(lastSent?.htmlContent).toContain('123456');
      expect(lastSent?.textFallback).toContain('123456');
    });

    it('dispatches MFA OTP email', async () => {
      const ok = await emailService.sendMfaOtp('counselor@universitas.ac.id', '987654');
      expect(ok).toBe(true);

      const lastSent = emailService.getLastSentEmailForTesting();
      expect(lastSent?.to).toBe('counselor@universitas.ac.id');
      expect(lastSent?.subject).toContain('2FA');
      expect(lastSent?.htmlContent).toContain('987654');
    });

    it('dispatches password reset token email', async () => {
      const ok = await emailService.sendPasswordResetToken('user@domain.com', 'reset-token-xyz');
      expect(ok).toBe(true);

      const lastSent = emailService.getLastSentEmailForTesting();
      expect(lastSent?.subject).toContain('Reset Kata Sandi');
      expect(lastSent?.htmlContent).toContain('reset-token-xyz');
    });

    it('dispatches appointment reminder with meeting links and milestones', async () => {
      const ok = await emailService.sendAppointmentReminder({
        to: 'mahasiswa@kampus.id',
        recipientName: 'Budi Santoso',
        counselorName: 'Dr. Sarah M.Psi',
        scheduledAt: 'Senin, 10 November 2026 pukul 10:00 WIB',
        milestone: 'H-15M',
        meetingLink: 'https://meet.ruangtenang.ac.id/room-123'
      });
      expect(ok).toBe(true);

      const lastSent = emailService.getLastSentEmailForTesting();
      expect(lastSent?.to).toBe('mahasiswa@kampus.id');
      expect(lastSent?.subject).toContain('Mendesak');
      expect(lastSent?.htmlContent).toContain('Budi Santoso');
      expect(lastSent?.htmlContent).toContain('Dr. Sarah M.Psi');
      expect(lastSent?.htmlContent).toContain('https://meet.ruangtenang.ac.id/room-123');
    });
  });

  describe('LocalInferenceQueue Concurrency & Priority Scheduling', () => {
    it('supports multi-slot concurrent execution', async () => {
      const queue = new LocalInferenceQueue(2);
      expect(queue.getStats()).toEqual({ active: 0, waiting: 0, maxConcurrent: 2 });

      // Acquire slot 1
      const release1 = await queue.acquire();
      expect(queue.getStats()).toEqual({ active: 1, waiting: 0, maxConcurrent: 2 });

      // Acquire slot 2 concurrently
      const release2 = await queue.acquire();
      expect(queue.getStats()).toEqual({ active: 2, waiting: 0, maxConcurrent: 2 });

      release1();
      expect(queue.getStats()).toEqual({ active: 1, waiting: 0, maxConcurrent: 2 });

      release2();
      expect(queue.getStats()).toEqual({ active: 0, waiting: 0, maxConcurrent: 2 });
    });

    it('promotes high-priority interactive requests ahead of normal background jobs', async () => {
      const queue = new LocalInferenceQueue(1);
      const executionOrder: string[] = [];

      // Acquire sole slot
      const releaseInitial = await queue.acquire();

      // Normal priority background job arrives first
      queue.acquire(undefined, 'normal').then(release => {
        executionOrder.push('background_summary');
        release();
      });

      // High priority interactive chat arrives second
      queue.acquire(undefined, 'high').then(release => {
        executionOrder.push('user_chat');
        release();
      });

      expect(queue.getStats().waiting).toBe(2);

      // Release initial slot
      releaseInitial();

      // Allow microtasks to execute
      await new Promise(r => setTimeout(r, 20));

      // 'user_chat' must execute ahead of 'background_summary'
      expect(executionOrder).toEqual(['user_chat', 'background_summary']);
    });
  });

  describe('Storage Driver Abstraction', () => {
    it('initializes LocalStorageDriver and writes/reads safely', async () => {
      const driver = getStorageDriver();
      expect(driver).toBeDefined();

      const testContent = Buffer.from('RuangTenang Encrypted File Content', 'utf-8');
      const testPath = 'test-file-storage.bin';

      const writtenPath = await driver.write(testPath, testContent);
      expect(writtenPath).toBeDefined();

      const exists = await driver.exists(testPath);
      expect(exists).toBe(true);

      const readBuffer = await driver.read(testPath);
      expect(readBuffer.toString('utf-8')).toBe('RuangTenang Encrypted File Content');

      await driver.delete(testPath);
      const existsAfter = await driver.exists(testPath);
      expect(existsAfter).toBe(false);
    });
  });

  describe('Appointment Reminder Job Bounded Range Scan', () => {
    it('runs processReminders query within bounded time window without errors', async () => {
      const result = await processReminders();
      expect(result).toBeDefined();
      expect(typeof result.checked).toBe('number');
      expect(typeof result.sent).toBe('number');
    });
  });

  describe('Terminal Sandbox Process-Tree Termination', () => {
    it('safely handles killProcessTree with invalid or non-existent pid without throwing', () => {
      expect(() => killProcessTree(undefined)).not.toThrow();
      expect(() => killProcessTree(9999999)).not.toThrow();
    });

    it('terminates hanging command and cleans up process tree on timeout', async () => {
      const started = Date.now();
      // Command designed to run for 5 seconds, but timeout is set to 2 seconds
      const res = await executeSafeShellCommand('node -e "setTimeout(()=>{}, 5000)"', undefined, 2000);
      const duration = Date.now() - started;

      expect(res.exitCode).toBe(124);
      expect(res.stderr).toContain('Batas waktu eksekusi');
      expect(res.stderr).toContain('Seluruh pohon proses terminal anak telah dihentikan secara aman');
      // Verify execution was stopped around 2 seconds, not letting it run the full 5 seconds
      expect(duration).toBeLessThan(3500);
    }, 10000);
  });
});
