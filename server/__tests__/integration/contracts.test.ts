import { describe, it, expect } from 'vitest';
import { sosTriggerSchema } from '../../routes/emergency';
import { createScreeningSchema } from '../../routes/screening';
import { createAppointmentSchema, rescheduleAppointmentSchema } from '../../routes/appointments';

describe('Frontend/Backend Payload Contracts', () => {

  it('validates SOS frontend payload against backend schema', () => {
    // Simulated payload from EmergencyCenter.tsx:88
    const frontendPayload = {
      location: {
        latitude: -6.2088,
        longitude: 106.8456,
        address: 'Jl. Margonda Raya'
      },
      hasUserConsent: true,
      studentName: 'Anonim'
    };
    
    // Will throw if mismatch
    const result = sosTriggerSchema.parse(frontendPayload);
    expect(result).toBeDefined();
    expect(result.studentName).toBe('Anonim');
  });

  it('validates Screening frontend payload against backend schema', () => {
    // Simulated payload from ScreeningModal.tsx:219
    const frontendPayload = {
      phq9Score: 12,
      gad7Score: 8,
      phq9Severity: 'Sedang',
      gad7Severity: 'Ringan',
      item9Score: 1,
      riskIndicators: {
        item9Score: 1,
        hasSelfHarmRisk: true,
        immediateDanger: false,
        planOrIntent: false,
        contactedTrustedPerson: false
      }
    };
    
    const result = createScreeningSchema.parse(frontendPayload);
    expect(result).toBeDefined();
    expect(result.phq9Score).toBe(12);
  });

  it('validates Appointment frontend payload against backend schema', () => {
    // Simulated payload from BookingForm.tsx:215
    const frontendPayload = {
      counselorId: 'c-1',
      counselorName: 'Dr. John',
      date: '2023-10-12',
      time: '14:00',
      timezone: 'WIB',
      mode: 'video_call',
      notes: 'I feel anxious',
      userId: 'user-1',
      studentName: 'Budi',
      studentNIM: '123456',
      studentEmail: 'budi@ui.ac.id'
    };
    
    const result = createAppointmentSchema.parse(frontendPayload);
    expect(result).toBeDefined();
    expect(result.counselorName).toBe('Dr. John');
  });

  it('validates Reschedule Appointment frontend payload against backend schema', () => {
    const frontendPayload = {
      date: '2026-09-01',
      time: '10:30',
      timezone: 'WIB',
      reason: 'Jadwal kuliah bentrok dengan praktikum'
    };

    const result = rescheduleAppointmentSchema.parse(frontendPayload);
    expect(result).toBeDefined();
    expect(result.date).toBe('2026-09-01');
    expect(result.time).toBe('10:30');
    expect(result.timezone).toBe('WIB');
    expect(result.reason).toBe('Jadwal kuliah bentrok dengan praktikum');
  });

  it('rejects invalid reschedule date format', () => {
    const invalidPayload = {
      date: '01-09-2026',
      time: '10:30'
    };

    expect(() => rescheduleAppointmentSchema.parse(invalidPayload)).toThrow();
  });
});
