import { isValidAppointmentStatusTransition } from '../../shared/contracts/appointments.js';

export interface Clock {
  now(): Date;
}

export const SystemClock: Clock = { now: () => new Date() };
export const ROOM_EARLY_ACCESS_MINUTES = 15;
export const DEFAULT_SESSION_DURATION_MINUTES = 60;
export const ROOM_LATE_GRACE_MINUTES = 30;
export const APPOINTMENT_TIMEZONE_IANA: Record<string, string> = {
  WIB: 'Asia/Jakarta',
  WITA: 'Asia/Makassar',
  WIT: 'Asia/Jayapura',
};

export { isValidAppointmentStatusTransition };

export type RoomAccessReason =
  | 'ROOM_ACCESS_NOT_APPROVED'
  | 'ROOM_ACCESS_COMPLETED'
  | 'ROOM_ACCESS_CANCELLED'
  | 'ROOM_ACCESS_TOO_EARLY'
  | 'ROOM_ACCESS_EXPIRED'
  | 'ROOM_ACCESS_INVALID_TIME';

export interface RoomWindow {
  serverTime: Date;
  scheduledStart: Date;
  scheduledEnd: Date;
  earliestJoinAt: Date;
  latestJoinAt: Date;
}

export function buildAppointmentStartTime(appointment: { scheduledAt?: Date | string | null }): Date | null {
  if (appointment.scheduledAt == null) return null;
  const start = appointment.scheduledAt instanceof Date
    ? new Date(appointment.scheduledAt.getTime())
    : new Date(appointment.scheduledAt);
  return Number.isFinite(start.getTime()) ? start : null;
}

/** Convert a wall-clock appointment time in its declared IANA timezone to UTC, rejecting gaps and invalid input. */
export function buildScheduledAppointmentTime(date: string, time: string, timezone: string = 'WIB'): Date {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || '');
  const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec((time || '').trim());
  const timeZone = APPOINTMENT_TIMEZONE_IANA[timezone.toUpperCase()] || timezone;
  if (!dateMatch || !timeMatch || !Number.isFinite(Date.parse(`${date}T00:00:00Z`))) throw new Error('INVALID_APPOINTMENT_DATETIME');
  const [year, month, day] = dateMatch.slice(1).map(Number);
  const [hours, minutes] = timeMatch.slice(1).map(Number);
  const localAsUtc = Date.UTC(year, month - 1, day, hours, minutes);
  const calendarDate = new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
  if (calendarDate !== date) throw new Error('INVALID_APPOINTMENT_DATETIME');

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    });
    let instant = localAsUtc;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).map(part => [part.type, part.value]));
      const representedAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
      const correction = localAsUtc - representedAsUtc;
      if (correction === 0) break;
      instant += correction;
    }
    const result = new Date(instant);
    const parts = Object.fromEntries(formatter.formatToParts(result).map(part => [part.type, part.value]));
    if (Number(parts.year) !== year || Number(parts.month) !== month || Number(parts.day) !== day || Number(parts.hour) !== hours || Number(parts.minute) !== minutes) {
      throw new Error('INVALID_APPOINTMENT_DATETIME');
    }
    return result;
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_APPOINTMENT_DATETIME') throw error;
    throw new Error('INVALID_APPOINTMENT_DATETIME');
  }
}

export function getAppointmentRoomWindow(
  appointment: { scheduledAt?: Date | string | null },
  clock: Clock = SystemClock,
): RoomWindow | null {
  const scheduledStart = buildAppointmentStartTime(appointment);
  const serverTime = clock.now();
  if (!scheduledStart || !Number.isFinite(serverTime.getTime())) return null;
  const scheduledEnd = new Date(scheduledStart.getTime() + DEFAULT_SESSION_DURATION_MINUTES * 60_000);
  return {
    serverTime,
    scheduledStart,
    scheduledEnd,
    earliestJoinAt: new Date(scheduledStart.getTime() - ROOM_EARLY_ACCESS_MINUTES * 60_000),
    latestJoinAt: new Date(scheduledEnd.getTime() + ROOM_LATE_GRACE_MINUTES * 60_000),
  };
}

export function canJoinAppointmentRoom(
  appointment: { status?: string | null; approvalStatus?: string | null; attendanceStatus?: string | null; scheduledAt?: Date | string | null },
  clock: Clock = SystemClock,
): { allowed: true; window: RoomWindow } | { allowed: false; reason: RoomAccessReason; window?: RoomWindow } {
  const status = appointment.status?.toUpperCase();
  const approvalStatus = appointment.approvalStatus?.toUpperCase();
  const attendanceStatus = appointment.attendanceStatus?.toUpperCase();

  if (status === 'CANCELLED' || attendanceStatus === 'CANCELLED') return { allowed: false, reason: 'ROOM_ACCESS_CANCELLED' };
  if (status === 'COMPLETED' || status === 'SELESAI' || status === 'ATTENDED' || status === 'REJECTED' || attendanceStatus === 'ATTENDED' || attendanceStatus === 'NO_SHOW') {
    return { allowed: false, reason: 'ROOM_ACCESS_COMPLETED' };
  }
  if (!['CONFIRMED', 'IN_PROGRESS'].includes(status || '') || approvalStatus !== 'APPROVED') {
    return { allowed: false, reason: 'ROOM_ACCESS_NOT_APPROVED' };
  }

  const window = getAppointmentRoomWindow(appointment, clock);
  if (!window) return { allowed: false, reason: 'ROOM_ACCESS_INVALID_TIME' };
  if (window.serverTime < window.earliestJoinAt) return { allowed: false, reason: 'ROOM_ACCESS_TOO_EARLY', window };
  if (window.serverTime > window.latestJoinAt) return { allowed: false, reason: 'ROOM_ACCESS_EXPIRED', window };
  return { allowed: true, window };
}
