import { describe, it, expect } from 'vitest';
import { sanitizeUrlForLogs, formatP2002ErrorMessage } from '../../apiV1Helpers.js';
import { parseAppointmentToUtcDate } from '../../routes/appointments.js';

describe('API v1 Helpers & Error Handling Unit Tests', () => {
  describe('sanitizeUrlForLogs (Allowlist Policy)', () => {
    it('preserves allowlisted query parameters (page, limit, sort)', () => {
      const url = '/api/v1/appointments?page=2&limit=10&sort=asc';
      const sanitized = sanitizeUrlForLogs(url);
      expect(sanitized).toBe('/api/v1/appointments?page=2&limit=10&sort=asc');
    });

    it('redacts non-allowlisted sensitive clinical/personal query parameters', () => {
      const url = '/api/v1/appointments?page=1&keluhan=depresi&token=secret123&studentEmail=user@test.com';
      const sanitized = sanitizeUrlForLogs(url);
      expect(sanitized).toContain('page=1');
      expect(sanitized).toContain('keluhan=%5BREDACTED%5D');
      expect(sanitized).toContain('token=%5BREDACTED%5D');
      expect(sanitized).toContain('studentEmail=%5BREDACTED%5D');
    });

    it('handles URLs without query strings', () => {
      const url = '/api/v1/auth/me';
      expect(sanitizeUrlForLogs(url)).toBe('/api/v1/auth/me');
    });
  });

  describe('formatP2002ErrorMessage (Dynamic Unique Constraint Mapping)', () => {
    it('formats duplicate email error message', () => {
      const err = { meta: { target: ['email'] } };
      const res = formatP2002ErrorMessage(err);
      expect(res.code).toBe('DUPLICATE_EMAIL');
      expect(res.message).toContain('Email sudah terdaftar');
      expect(res.field).toBe('email');
    });

    it('formats duplicate NIM error message', () => {
      const err = { meta: { target: ['studentNimHash'] } };
      const res = formatP2002ErrorMessage(err);
      expect(res.code).toBe('DUPLICATE_NIM');
      expect(res.message).toContain('NIM ini sudah terdaftar');
      expect(res.field).toBe('studentNIM');
    });

    it('formats duplicate appointment slot error message', () => {
      const err = { meta: { target: ['Appointments_counselorId_date_time_key'] } };
      const res = formatP2002ErrorMessage(err);
      expect(res.code).toBe('SLOT_ALREADY_BOOKED');
      expect(res.message).toContain('Slot jadwal konseling');
      expect(res.field).toBe('slot');
    });
  });

  describe('parseAppointmentToUtcDate (Timezone UTC Normalization)', () => {
    it('parses WIB (+07:00) appointment into UTC Date', () => {
      const dt = parseAppointmentToUtcDate('2026-09-20', '10:00', 'WIB');
      expect(dt.toISOString()).toBe('2026-09-20T03:00:00.000Z');
    });

    it('parses WITA (+08:00) appointment into UTC Date', () => {
      const dt = parseAppointmentToUtcDate('2026-09-20', '10:00', 'WITA');
      expect(dt.toISOString()).toBe('2026-09-20T02:00:00.000Z');
    });

    it('parses WIT (+09:00) appointment into UTC Date', () => {
      const dt = parseAppointmentToUtcDate('2026-09-20', '10:00', 'WIT');
      expect(dt.toISOString()).toBe('2026-09-20T01:00:00.000Z');
    });
  });
});
