import { Appointment } from '../types';
import { safeLocalStorage } from './storage';

export interface CalendarTimeData {
  startDate: Date;
  endDate: Date;
  startUtcIso: string;
  endUtcIso: string;
  startIcsStr: string;
  endIcsStr: string;
  dtStampIcs: string;
  formattedLocal: string;
}

export interface ReminderPreferences {
  h24: boolean;   // H-24 jam sebelum
  h1: boolean;    // H-1 jam sebelum
  h30m: boolean;  // H-30 menit sebelum
  h10m: boolean;  // H-10 menit sebelum
  h24Sent?: boolean;
  h1Sent?: boolean;
  h30mSent?: boolean;
  h10mSent?: boolean;
}

const STORAGE_REMINDER_PREFS_KEY = 'ruangtenang_reminder_preferences';

/**
 * Parse appointment date, time, and timezone into exact JS Date and UTC timestamps.
 */
export function parseAppointmentDateTime(
  dateStr: string, // e.g. "2026-08-10"
  timeStr: string, // e.g. "09:00 WIB" or "14:00"
  timezoneStr?: 'WIB' | 'WITA' | 'WIT'
): CalendarTimeData {
  // Extract time portion e.g. "09:00"
  const cleanTimeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
  const hour = cleanTimeMatch ? parseInt(cleanTimeMatch[1], 10) : 9;
  const minute = cleanTimeMatch ? parseInt(cleanTimeMatch[2], 10) : 0;

  // Determine timezone offset in hours relative to UTC
  // WIB = UTC+7, WITA = UTC+8, WIT = UTC+9
  let tz = timezoneStr;
  if (!tz) {
    if (timeStr.includes('WITA')) tz = 'WITA';
    else if (timeStr.includes('WIT')) tz = 'WIT';
    else tz = 'WIB';
  }

  const offsetMap: Record<string, number> = {
    WIB: 7,
    WITA: 8,
    WIT: 9
  };
  const tzOffsetHours = offsetMap[tz] || 7;

  // Construct local date/time string
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10) || new Date().getFullYear();
  const month = (parseInt(monthStr, 10) || 1) - 1; // 0-indexed month
  const day = parseInt(dayStr, 10) || 1;

  // Create UTC date object by subtracting timezone offset from local hour
  const startUtc = new Date(Date.UTC(year, month, day, hour - tzOffsetHours, minute, 0));

  // Default session duration = 50 minutes
  const endUtc = new Date(startUtc.getTime() + 50 * 60 * 1000);

  const formatIcsDate = (d: Date) => {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const dtStampIcs = formatIcsDate(new Date());
  const startIcsStr = formatIcsDate(startUtc);
  const endIcsStr = formatIcsDate(endUtc);

  const formattedLocal = `${dateStr} pukul ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${tz}`;

  return {
    startDate: startUtc,
    endDate: endUtc,
    startUtcIso: startUtc.toISOString(),
    endUtcIso: endUtc.toISOString(),
    startIcsStr,
    endIcsStr,
    dtStampIcs,
    formattedLocal
  };
}

/**
 * Generate RFC 5545 compliant .ics calendar file content
 */
export function generateIcsFileContent(apt: Appointment): string {
  const { startIcsStr, endIcsStr, dtStampIcs, formattedLocal } = parseAppointmentDateTime(
    apt.date,
    apt.timeSlot,
    apt.timezone
  );

  const meetingLocation = apt.mode === 'video_call'
    ? (isHttpsUrl(apt.meetingLink) ? apt.meetingLink : 'Video call; tautan diberikan setelah konfirmasi')
    : 'Pusat layanan kampus';
  const descriptionText = [
    'Pengingat janji sesi RuangTenang.',
    `Format: ${apt.mode === 'video_call' ? 'Video call' : 'Tatap muka'}`,
    `Waktu: ${formattedLocal}`
  ].join('\n');
  const safeUid = String(apt.id || 'appointment').replace(/[^a-zA-Z0-9._-]/g, '');
  const icsStatus = apt.status === 'CONFIRMED' ? 'CONFIRMED' : ['CANCELLED', 'REJECTED'].includes(apt.status) ? 'CANCELLED' : 'TENTATIVE';

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//RuangTenang//Konseling Mahasiswa Kampus//ID
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:appt-${safeUid}@ruangtenang.ac.id
DTSTAMP:${dtStampIcs}
DTSTART:${startIcsStr}
DTEND:${endIcsStr}
SUMMARY:${escapeIcsText('Janji RuangTenang')}
DESCRIPTION:${escapeIcsText(descriptionText)}
LOCATION:${escapeIcsText(meetingLocation)}
STATUS:${icsStatus}
BEGIN:VALARM
TRIGGER:-P1D
ACTION:DISPLAY
DESCRIPTION:${escapeIcsText('Pengingat janji RuangTenang besok.')}
END:VALARM
BEGIN:VALARM
TRIGGER:-PT1H
ACTION:DISPLAY
DESCRIPTION:${escapeIcsText('Pengingat janji RuangTenang dalam 1 jam.')}
END:VALARM
BEGIN:VALARM
TRIGGER:-PT30M
ACTION:DISPLAY
DESCRIPTION:${escapeIcsText('Pengingat janji RuangTenang dalam 30 menit.')}
END:VALARM
BEGIN:VALARM
TRIGGER:-PT10M
ACTION:DISPLAY
DESCRIPTION:${escapeIcsText('Pengingat janji RuangTenang dalam 10 menit.')}
END:VALARM
END:VEVENT
END:VCALENDAR`;
}

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function isHttpsUrl(value?: string | null): value is string {
  return typeof value === 'string' && /^https:\/\//i.test(value);
}

/**
 * Download .ics calendar file
 */
export function downloadIcsCalendarFile(apt: Appointment): void {
  const icsData = generateIcsFileContent(apt);
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Janji_RuangTenang_${apt.date}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

export const downloadIcsFile = downloadIcsCalendarFile;

/**
 * Generate dynamic Google Calendar URL
 */
export function generateGoogleCalendarUrl(apt: Appointment): string {
  const { startIcsStr, endIcsStr } = parseAppointmentDateTime(
    apt.date,
    apt.timeSlot,
    apt.timezone
  );

  const title = encodeURIComponent('Janji RuangTenang');
  const details = encodeURIComponent(`Pengingat janji sesi RuangTenang.\nFormat: ${apt.mode === 'video_call' ? 'Video call' : 'Tatap muka'}`);
  const location = encodeURIComponent(apt.mode === 'video_call'
    ? (isHttpsUrl(apt.meetingLink) ? apt.meetingLink : 'Video call; tautan diberikan setelah konfirmasi')
    : 'Pusat layanan kampus');

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${startIcsStr}/${endIcsStr}`;
}

/**
 * Generate Outlook Calendar URL
 */
export function generateOutlookCalendarUrl(apt: Appointment): string {
  const { startUtcIso, endUtcIso } = parseAppointmentDateTime(
    apt.date,
    apt.timeSlot,
    apt.timezone
  );

  const title = encodeURIComponent('Janji RuangTenang');
  const details = encodeURIComponent(`Pengingat janji sesi RuangTenang.\nFormat: ${apt.mode === 'video_call' ? 'Video call' : 'Tatap muka'}`);
  const location = encodeURIComponent(apt.mode === 'video_call'
    ? (isHttpsUrl(apt.meetingLink) ? apt.meetingLink : 'Video call; tautan diberikan setelah konfirmasi')
    : 'Pusat layanan kampus');

  return `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${title}&body=${details}&location=${location}&startdt=${startUtcIso}&enddt=${endUtcIso}`;
}

/**
 * Play a smooth two-tone notification audio chime using Web Audio API
 */
export function playNotificationChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // First note (C5 - 523.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
    gain1.gain.setValueAtTime(0.25, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.3);

    // Second note (E5 - 659.25 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.6);
  } catch (err) {
    console.warn('Audio chime playback omitted:', err);
  }
}

/**
 * Trigger native browser web notification
 */
export function triggerNativeNotification(title: string, body: string, tag?: string): boolean {
  playNotificationChime();
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: tag || `ruangtenang-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
      });
      return true;
    } catch (e) {
      console.warn('Browser notification display error:', e);
    }
  }
  return false;
}

/**
 * Helper to get or set appointment reminder preferences in localStorage
 */
export function getAppointmentReminderPrefs(apptId: string): ReminderPreferences {
  try {
    const stored = safeLocalStorage.getItem(`${STORAGE_REMINDER_PREFS_KEY}_${apptId}`);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<ReminderPreferences>;
      return {
        h24: parsed.h24 !== false,
        h1: parsed.h1 !== false,
        h30m: parsed.h30m !== false,
        h10m: parsed.h10m !== false,
        h24Sent: parsed.h24Sent === true,
        h1Sent: parsed.h1Sent === true,
        h30mSent: parsed.h30mSent === true,
        h10mSent: parsed.h10mSent === true
      };
    }
  } catch (e) {
    console.warn('Failed to parse stored reminder prefs:', e);
  }
  return { h24: true, h1: true, h30m: true, h10m: true };
}

export function saveAppointmentReminderPrefs(apptId: string, prefs: ReminderPreferences): void {
  try {
    safeLocalStorage.setItem(`${STORAGE_REMINDER_PREFS_KEY}_${apptId}`, JSON.stringify(prefs));
  } catch (e) {
    console.warn('Failed to save reminder prefs:', e);
  }
}

export function resetAppointmentReminderDelivery(apptId: string): void {
  const prefs = getAppointmentReminderPrefs(apptId);
  saveAppointmentReminderPrefs(apptId, {
    ...prefs,
    h24Sent: false,
    h1Sent: false,
    h30mSent: false,
    h10mSent: false
  });
}
