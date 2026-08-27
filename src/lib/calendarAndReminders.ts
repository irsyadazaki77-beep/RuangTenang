import { Appointment } from '../types';

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

  const counselorName = apt.counselorName || 'Psikolog RuangTenang';
  const meetingLocation = apt.mode === 'video_call' 
    ? (apt.meetingLink || 'Ruang Video Call Virtual (Jitsi Meet)') 
    : 'Pusat Bimbingan & Konseling UPT Kampus';
  
  const descriptionText = [
    `Sesi Konseling Mental Mahasiswa dengan ${counselorName}`,
    `Mode: ${apt.mode}`,
    `Topik/Keluhan: ${apt.primaryConcern || 'Konseling Mental'}`,
    `Link Meeting: ${apt.meetingLink || 'https://meet.jit.si/ruangtenang-session'}`,
    `Waktu Sesi: ${formattedLocal}`,
    `Kerahasiaan data dan isi konseling terjamin sesuai norma etika psikologi.`
  ].join('\\n');

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//RuangTenang//Konseling Mahasiswa Kampus//ID
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:appt-${apt.id}@ruangtenang.ac.id
DTSTAMP:${dtStampIcs}
DTSTART:${startIcsStr}
DTEND:${endIcsStr}
SUMMARY:Sesi Konseling Psikolog - ${counselorName}
DESCRIPTION:${descriptionText}
LOCATION:${meetingLocation}
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-P1D
ACTION:DISPLAY
DESCRIPTION:Pengingat H-24 Jam: Sesi Konseling Psikolog dengan ${counselorName} besok.
END:VALARM
BEGIN:VALARM
TRIGGER:-PT1H
ACTION:DISPLAY
DESCRIPTION:Pengingat H-1 Jam: Sesi Konseling Psikolog dengan ${counselorName} akan dimulai dalam 1 jam.
END:VALARM
BEGIN:VALARM
TRIGGER:-PT30M
ACTION:DISPLAY
DESCRIPTION:Pengingat H-30 Menit: Sesi Konseling Psikolog dengan ${counselorName} akan dimulai dalam 30 menit.
END:VALARM
BEGIN:VALARM
TRIGGER:-PT10M
ACTION:DISPLAY
DESCRIPTION:Pengingat H-10 Menit: Sesi Konseling Psikolog dengan ${counselorName} dimulai dalam 10 menit!
END:VALARM
END:VEVENT
END:VCALENDAR`;
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
  link.setAttribute('download', `Jadwal_Konseling_${apt.counselorName.replace(/\s+/g, '_')}_${apt.date}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Generate dynamic Google Calendar URL
 */
export function generateGoogleCalendarUrl(apt: Appointment): string {
  const { startIcsStr, endIcsStr } = parseAppointmentDateTime(
    apt.date,
    apt.timeSlot,
    apt.timezone
  );

  const title = encodeURIComponent(`Sesi Konseling Psikolog: ${apt.counselorName}`);
  const details = encodeURIComponent(
    `Sesi Konseling Mental Mahasiswa (${apt.mode})\nTopik: ${apt.primaryConcern}\nLink Video Call: ${apt.meetingLink || 'https://meet.jit.si/ruangtenang'}\nKerahasiaan sesi terjamin.`
  );
  const location = encodeURIComponent(
    apt.mode === 'video_call' ? (apt.meetingLink || 'Online Video Call Jitsi') : 'Pusat Bimbingan & Konseling Kampus'
  );

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

  const title = encodeURIComponent(`Sesi Konseling Psikolog: ${apt.counselorName}`);
  const details = encodeURIComponent(
    `Sesi Konseling Mental Mahasiswa (${apt.mode})\nTopik: ${apt.primaryConcern}\nLink Video Call: ${apt.meetingLink || 'https://meet.jit.si/ruangtenang'}`
  );
  const location = encodeURIComponent(
    apt.mode === 'video_call' ? (apt.meetingLink || 'Online Video Call Jitsi') : 'Pusat Bimbingan & Konseling Kampus'
  );

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
export function triggerNativeNotification(title: string, body: string): void {
  playNotificationChime();
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'ruangtenang-reminder'
      });
    } catch (e) {
      console.warn('Browser notification display error:', e);
    }
  }
}

/**
 * Helper to get or set appointment reminder preferences in localStorage
 */
export function getAppointmentReminderPrefs(apptId: string): ReminderPreferences {
  try {
    const stored = localStorage.getItem(`${STORAGE_REMINDER_PREFS_KEY}_${apptId}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to parse stored reminder prefs:', e);
  }
  return { h24: true, h1: true, h30m: true, h10m: true };
}

export function saveAppointmentReminderPrefs(apptId: string, prefs: ReminderPreferences): void {
  try {
    localStorage.setItem(`${STORAGE_REMINDER_PREFS_KEY}_${apptId}`, JSON.stringify(prefs));
  } catch (e) {
    console.warn('Failed to save reminder prefs:', e);
  }
}
