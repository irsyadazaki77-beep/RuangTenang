import { describe, expect, it } from 'vitest';
import { calculateScheduledAtUtc, utcToLocalAppointmentFields } from '../../../src/repositories/appointmentRepository.js';
import { canJoinAppointmentRoom, isValidAppointmentStatusTransition } from '../../services/appointmentRoomPolicy.js';

const start = new Date('2026-09-20T03:00:00.000Z');
const confirmed = { scheduledAt: start, status: 'CONFIRMED', approvalStatus: 'APPROVED', attendanceStatus: 'SCHEDULED' };
const fakeClock = (instant: string) => ({ now: () => new Date(instant) });

describe('appointment room access policy', () => {
  it('enforces the inclusive early boundary, exact start, active session, and late expiry', () => {
    expect(canJoinAppointmentRoom(confirmed, fakeClock('2026-09-20T02:44:59Z'))).toMatchObject({ allowed: false, reason: 'ROOM_ACCESS_TOO_EARLY' });
    expect(canJoinAppointmentRoom(confirmed, fakeClock('2026-09-20T02:45:00Z')).allowed).toBe(true);
    expect(canJoinAppointmentRoom(confirmed, fakeClock('2026-09-20T03:00:00Z')).allowed).toBe(true);
    expect(canJoinAppointmentRoom(confirmed, fakeClock('2026-09-20T04:00:00Z')).allowed).toBe(true);
    expect(canJoinAppointmentRoom(confirmed, fakeClock('2026-09-20T04:30:00Z')).allowed).toBe(true);
    expect(canJoinAppointmentRoom(confirmed, fakeClock('2026-09-20T04:30:00.001Z'))).toMatchObject({ allowed: false, reason: 'ROOM_ACCESS_EXPIRED' });
  });

  it('requires confirmed or in-progress and approved state, and rejects terminal states', () => {
    expect(canJoinAppointmentRoom({ ...confirmed, status: 'PENDING' }, fakeClock('2026-09-20T03:00:00Z'))).toMatchObject({ allowed: false, reason: 'ROOM_ACCESS_NOT_APPROVED' });
    expect(canJoinAppointmentRoom({ ...confirmed, approvalStatus: 'PENDING_APPROVAL' }, fakeClock('2026-09-20T03:00:00Z'))).toMatchObject({ allowed: false, reason: 'ROOM_ACCESS_NOT_APPROVED' });
    expect(canJoinAppointmentRoom({ ...confirmed, status: 'IN_PROGRESS' }, fakeClock('2026-09-20T03:00:00Z')).allowed).toBe(true);
    for (const status of ['CANCELLED', 'REJECTED', 'COMPLETED']) {
      expect(canJoinAppointmentRoom({ ...confirmed, status }, fakeClock('2026-09-20T03:00:00Z')).allowed).toBe(false);
    }
    expect(canJoinAppointmentRoom({ ...confirmed, attendanceStatus: 'ATTENDED' }, fakeClock('2026-09-20T03:00:00Z')).allowed).toBe(false);
  });

  it('fails closed when the persisted appointment time is invalid', () => {
    expect(canJoinAppointmentRoom({ ...confirmed, scheduledAt: 'not-a-date' }, fakeClock('2026-09-20T03:00:00Z'))).toMatchObject({ allowed: false, reason: 'ROOM_ACCESS_INVALID_TIME' });
  });

  it('converts WIB, WITA, and WIT local booking times to the correct UTC instant', () => {
    expect(calculateScheduledAtUtc('2026-09-20', '10:00', 'WIB').toISOString()).toBe('2026-09-20T03:00:00.000Z');
    expect(calculateScheduledAtUtc('2026-09-20', '10:00', 'WITA').toISOString()).toBe('2026-09-20T02:00:00.000Z');
    expect(calculateScheduledAtUtc('2026-09-20', '10:00', 'WIT').toISOString()).toBe('2026-09-20T01:00:00.000Z');
    expect(utcToLocalAppointmentFields(new Date('2026-09-20T01:00:00Z'), 'WIT')).toMatchObject({ date: '2026-09-20', time: '10:00', timezone: 'WIT' });
  });

  it('rejects malformed booking dates and times and blocks invalid state transitions', () => {
    expect(() => calculateScheduledAtUtc('2026-02-30', '10:00', 'WIB')).toThrow('INVALID_APPOINTMENT_DATETIME');
    expect(() => calculateScheduledAtUtc('2026-09-20', '25:00', 'WIB')).toThrow('INVALID_APPOINTMENT_DATETIME');
    expect(() => calculateScheduledAtUtc('2026-09-20', '10:00', 'UNKNOWN')).toThrow('INVALID_APPOINTMENT_DATETIME');
    expect(isValidAppointmentStatusTransition('PENDING', 'CONFIRMED')).toBe(true);
    expect(isValidAppointmentStatusTransition('CONFIRMED', 'IN_PROGRESS')).toBe(true);
    expect(isValidAppointmentStatusTransition('CONFIRMED', 'COMPLETED')).toBe(false);
    expect(isValidAppointmentStatusTransition('CANCELLED', 'CONFIRMED')).toBe(false);
    expect(isValidAppointmentStatusTransition('COMPLETED', 'PENDING')).toBe(false);
  });
});
