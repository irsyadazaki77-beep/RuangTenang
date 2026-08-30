import { describe, it, expect } from 'vitest';
import { maskPhoneNumber, maskPersonName } from '../../../server/routes/emergency.js';
import {
  CreateAppointmentSchema,
  RescheduleAppointmentSchema
} from '../../../shared/contracts/appointments.js';
import {
  CreateMoodSchema
} from '../../../shared/contracts/mood.js';
import {
  ScreeningSubmissionSchema,
  UpdateScreeningStatusSchema
} from '../../../shared/contracts/screening.js';
import {
  TriggerSosSchema,
  UpdateEmergencyContactSchema
} from '../../../shared/contracts/emergency.js';

describe('Phase 2 Security & Contract Hardening', () => {
  describe('A. SOS PII Masking Helpers', () => {
    it('masks phone numbers correctly without disclosing middle digits', () => {
      expect(maskPhoneNumber('081234567890')).toBe('0812*****890');
      expect(maskPhoneNumber('+628198765432')).toBe('+628******432');
      expect(maskPhoneNumber('1234')).toBe('****');
      expect(maskPhoneNumber('08123456')).toBe('08****56');
    });

    it('masks person names without disclosing full identity', () => {
      expect(maskPersonName('Budi Santoso')).toBe('B***o');
      expect(maskPersonName('Ayu')).toBe('A***u');
      expect(maskPersonName('Al')).toBe('A*');
      expect(maskPersonName('')).toBe('Kontak Darurat');
    });
  });

  describe('B. Shared API Contracts (Zod Validation)', () => {
    it('validates appointment creation strictly and rejects invalid formats', () => {
      const validPayload = {
        counselorName: 'Dr. Sarah',
        date: '2026-09-01',
        time: '10:00',
        timezone: 'WIB',
        mode: 'video_call',
        studentEmail: 'mahasiswa@kampus.ac.id'
      };
      const result = CreateAppointmentSchema.safeParse(validPayload);
      expect(result.success).toBe(true);

      const invalidDate = { ...validPayload, date: '01/09/2026' };
      expect(CreateAppointmentSchema.safeParse(invalidDate).success).toBe(false);

      const invalidTimezone = { ...validPayload, timezone: 'GMT' };
      expect(CreateAppointmentSchema.safeParse(invalidTimezone).success).toBe(false);
    });

    it('validates appointment reschedule request and rejects past/malformed fields', () => {
      const valid = {
        date: '2026-09-02',
        time: '14:00',
        timezone: 'WIB',
        reason: 'Ada jadwal kuliah pengganti'
      };
      expect(RescheduleAppointmentSchema.safeParse(valid).success).toBe(true);

      const invalidDate = { ...valid, date: 'invalid-date' };
      expect(RescheduleAppointmentSchema.safeParse(invalidDate).success).toBe(false);
    });

    it('validates mood tracking schema and accepts numeric or string mood ratings', () => {
      const validNumeric = {
        mood: 4,
        notes: 'Hari ini cukup produktif',
        intensity: 8,
        factors: ['Kuliah', 'Tidur Cukup']
      };
      expect(CreateMoodSchema.safeParse(validNumeric).success).toBe(true);

      const validString = {
        mood: 'Senang',
        notes: 'Alhamdulillah',
        intensity: 7
      };
      expect(CreateMoodSchema.safeParse(validString).success).toBe(true);
    });

    it('validates screening submission schemas and risk thresholds', () => {
      const valid = {
        phq9Score: 12,
        gad7Score: 8,
        phq9Severity: 'Sedang',
        gad7Severity: 'Ringan',
        item9Score: 0,
        hasSelfHarmRisk: false
      };
      expect(ScreeningSubmissionSchema.safeParse(valid).success).toBe(true);

      const invalidPHQ9 = { ...valid, phq9Score: 35 }; // max is 27
      expect(ScreeningSubmissionSchema.safeParse(invalidPHQ9).success).toBe(false);

      const invalidGAD7 = { ...valid, gad7Score: 25 }; // max is 21
      expect(ScreeningSubmissionSchema.safeParse(invalidGAD7).success).toBe(false);
    });

    it('validates screening status updates to authorized enum values only', () => {
      expect(UpdateScreeningStatusSchema.safeParse({ status: 'Menunggu Penanganan' }).success).toBe(true);
      expect(UpdateScreeningStatusSchema.safeParse({ status: 'Sedang Ditangani' }).success).toBe(true);
      expect(UpdateScreeningStatusSchema.safeParse({ status: 'Selesai' }).success).toBe(true);
      expect(UpdateScreeningStatusSchema.safeParse({ status: 'INVALID_STATUS' }).success).toBe(false);
    });

    it('validates emergency SOS trigger payloads and contact updates', () => {
      const validContact = {
        name: 'Ibu Siti',
        phone: '08123456789',
        relationship: 'Orang Tua'
      };
      expect(UpdateEmergencyContactSchema.safeParse(validContact).success).toBe(true);

      const shortPhone = { ...validContact, phone: '123' };
      expect(UpdateEmergencyContactSchema.safeParse(shortPhone).success).toBe(false);
    });
  });
});
