import cron from 'node-cron';
import { prisma } from '../database.js';
import { DistributedLockService } from '../services/distributedLockService.js';
import { redisService } from '../services/redisService.js';
import { emailService } from '../services/emailService.js';

/**
 * Appointment Reminder Job Queue
 * - Runs every 5 minutes
 * - H-24 Hours: Email confirmation & agenda preparation
 * - H-1 Hour: Email alert & meeting link
 * - H-15 Minutes: Urgent reminder before session start
 *
 * Performance Architecture:
 * - Leverages database index [scheduledAt, status] to avoid full table scans.
 * - Restricts memory footprint by querying only the relevant [now .. now + 25h] time window.
 * - Distributed locking prevents concurrent execution across multi-pod clusters.
 * - Deduplication via Redis TTL prevents redundant duplicate notifications.
 */

export function startAppointmentReminderJob() {
  cron.schedule('*/5 * * * *', async () => {
    const lockId = 'job-appointment-reminder';

    // Attempt to acquire lock for 4 minutes to ensure single-instance execution
    await DistributedLockService.withLock(lockId, 240, async () => {
      try {
        await processReminders();
      } catch (err) {
        console.error('[ReminderJob] Error processing reminders:', err);
      }
    });
  });
  console.log('[ReminderJob] Appointment reminder background scheduler initialized.');
}

export async function processReminders(): Promise<{ checked: number; sent: number }> {
  const now = new Date();
  // Look forward up to 25 hours to cover H-24H milestone with safety margin
  const maxWindow = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  // Performance query: hits composite index @@index([scheduledAt, status])
  const upcomingAppointments = await prisma.appointments.findMany({
    where: {
      status: 'CONFIRMED',
      scheduledAt: {
        gte: now,
        lte: maxWindow
      }
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      counselor: {
        select: {
          id: true,
          name: true,
          contactPhone: true
        }
      }
    },
    orderBy: {
      scheduledAt: 'asc'
    },
    take: 200 // Bound batch size per run to safeguard Node memory
  });

  let sentCount = 0;

  for (const appt of upcomingAppointments) {
    try {
      const apptDate = new Date(appt.scheduledAt);
      if (isNaN(apptDate.getTime())) {
        continue;
      }

      const diffMinutes = Math.floor((apptDate.getTime() - now.getTime()) / (1000 * 60));

      if (diffMinutes > 0 && diffMinutes <= 15) {
        // H-15 Minutes
        const sent = await sendReminder(appt, 'H-15M', 'Urgent: Sesi konseling Anda akan dimulai dalam 15 menit!');
        if (sent) sentCount++;
      } else if (diffMinutes > 15 && diffMinutes <= 60) {
        // H-1 Hour
        const sent = await sendReminder(appt, 'H-1H', 'Sesi konseling Anda akan dimulai dalam 1 jam.');
        if (sent) sentCount++;
      } else if (diffMinutes > 60 && diffMinutes <= 24 * 60) {
        // H-24 Hours
        const sent = await sendReminder(appt, 'H-24H', 'Sesi konseling Anda dijadwalkan besok. Harap persiapkan diri Anda.');
        if (sent) sentCount++;
      }
    } catch (apptErr) {
      console.error(`[ReminderJob] Error processing appointment ${appt.id}:`, apptErr);
    }
  }

  return { checked: upcomingAppointments.length, sent: sentCount };
}

async function sendReminder(appt: any, milestone: 'H-15M' | 'H-1H' | 'H-24H', message: string): Promise<boolean> {
  const reminderKey = `reminder:${appt.id}:${milestone}`;

  try {
    // Check if already sent in Redis
    const existing = await redisService.get<string>(reminderKey);
    if (existing) return false; // Already sent

    const studentDisplayName = appt.studentName || appt.user?.name || 'Mahasiswa';
    const studentEmail = appt.studentEmail || appt.user?.email;
    const counselorName = appt.counselorName || appt.counselor?.name || 'Konselor Kampus';
    const formattedDate = new Date(appt.scheduledAt).toLocaleString('id-ID', {
      timeZone: appt.timezone || 'Asia/Jakarta',
      dateStyle: 'full',
      timeStyle: 'short'
    });

    console.info(`[ReminderJob] Dispatching ${milestone} reminder (${message}) to ${studentDisplayName} for appointment ${appt.id}`);

    // Real transactional email delivery if email is available
    if (studentEmail) {
      await emailService.sendAppointmentReminder({
        to: studentEmail,
        recipientName: studentDisplayName,
        counselorName,
        scheduledAt: `${formattedDate} (${appt.timezone || 'WIB'})`,
        milestone,
        mode: appt.mode,
        meetingLink: appt.meetingLink || undefined
      });
    }

    // Mark as sent atomically in Redis with a 7-day TTL
    await redisService.set(reminderKey, 'SENT', 7 * 24 * 60 * 60);
    return true;
  } catch (err) {
    console.error(`[ReminderJob] Failed to send ${milestone} reminder for appointment ${appt.id}:`, err);
    return false;
  }
}
