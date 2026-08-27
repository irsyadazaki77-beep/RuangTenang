import cron from 'node-cron';
import { prisma } from '../database';
import { DistributedLockService } from '../services/distributedLockService';
import fetch from 'node-fetch';

/**
 * Appointment Reminder Job Queue
 * - Runs every 5 minutes
 * - H-24 Hours: Email confirmation
 * - H-1 Hour: Push/SMS alert
 * - H-15 Minutes: Urgent Push/SMS alert
 */

export function startAppointmentReminderJob() {
  // Run every 5 minutes
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
}

async function processReminders() {
  const now = new Date();
  
  // Need to find appointments that are CONFIRMED
  const upcomingAppointments = await prisma.appointments.findMany({
    where: {
      status: 'CONFIRMED',
      // Assuming date is YYYY-MM-DD and time is HH:MM
    },
    include: {
      user: true,
      counselor: true,
    }
  });

  for (const appt of upcomingAppointments) {
    // Parse date and time in WIB (assuming server time or parsing accurately)
    // WIB is UTC+7. But for simplicity, we parse as local time and compute diff.
    const apptDateStr = `${appt.date}T${appt.time}:00`;
    const apptDate = new Date(apptDateStr);
    
    // Since input is like '2026-08-26' and '14:00', parsing it directly as local timezone
    // Let's get diff in minutes
    const diffMinutes = Math.floor((apptDate.getTime() - now.getTime()) / (1000 * 60));

    // We use DistributedState to ensure we only send once per milestone
    
    if (diffMinutes > 0 && diffMinutes <= 15) {
      // H-15 Minutes
      await sendReminder(appt, 'H-15M', 'Urgent: Sesi konseling Anda akan dimulai dalam 15 menit!');
    } else if (diffMinutes > 15 && diffMinutes <= 60) {
      // H-1 Hour
      await sendReminder(appt, 'H-1H', 'Sesi konseling Anda akan dimulai dalam 1 jam.');
    } else if (diffMinutes > 60 && diffMinutes <= 24 * 60) {
      // H-24 Hours
      await sendReminder(appt, 'H-24H', 'Sesi konseling Anda dijadwalkan besok. Harap persiapkan diri Anda.');
    }
  }
}

async function sendReminder(appt: any, milestone: string, message: string) {
  const reminderKey = `reminder:${appt.id}:${milestone}`;
  
  // Check if already sent
  const existing = await prisma.distributedState.findUnique({ where: { key: reminderKey } });
  if (existing) return; // Already sent

  console.log(`[ReminderJob] Sending ${milestone} reminder to ${appt.studentName} for appointment ${appt.id}`);
  
  // Simulate Webhook/Gateway for SMS/WA
  try {
    // Mock webhook call
    /*
    await fetch('https://api.mock-gateway.com/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: appt.studentEmail, // or phone
        message,
        channel: milestone === 'H-24H' ? 'email' : 'whatsapp'
      })
    });
    */
    
    // Mark as sent
    await prisma.distributedState.create({
      data: {
        key: reminderKey,
        category: 'REMINDER_LOG',
        value: 'SENT',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Keep log for 7 days
      }
    });
  } catch (err) {
    console.error(`[ReminderJob] Failed to send ${milestone} reminder:`, err);
  }
}
