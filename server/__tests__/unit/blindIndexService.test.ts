import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BlindIndexService, getBlindIndexService, resetBlindIndexServiceInstance } from '../../src/services/crypto/BlindIndexService';
import { appointmentRepository } from '../../src/repositories/appointmentRepository';
import { encryptionService } from '../../server/services/encryptionService';

describe('BlindIndexService Unit & Cryptographic Tests', () => {
  const TEST_SECRET = 'test-secret-key-for-blind-indexing-32-chars-minimum-length';
  let service: BlindIndexService;

  beforeEach(() => {
    delete process.env.BLIND_INDEX_SECRET;
    resetBlindIndexServiceInstance();
    process.env.BLIND_INDEX_SECRET = TEST_SECRET;
    service = new BlindIndexService(TEST_SECRET);
  });

  afterEach(() => {
    delete process.env.BLIND_INDEX_SECRET;
    resetBlindIndexServiceInstance();
  });

  it('initializes successfully with valid secret and throws when secret is missing', () => {
    expect(service).toBeInstanceOf(BlindIndexService);

    // Should throw descriptive error when BLIND_INDEX_SECRET is missing or empty
    delete process.env.BLIND_INDEX_SECRET;
    expect(() => new BlindIndexService('')).toThrow(/BLIND_INDEX_SECRET/);
  });

  it('generates deterministic HMAC-SHA256 hashes for identical inputs', () => {
    const nim = '13520999';
    const hash1 = service.generateHash(nim);
    const hash2 = service.generateHash(nim);

    expect(hash1).toBeDefined();
    expect(typeof hash1).toBe('string');
    expect(hash1?.length).toBe(64); // 256 bits in hex format = 64 characters
    expect(hash1).toBe(hash2);
  });

  it('normalizes inputs (trimming and lowercasing) before generating hashes', () => {
    const rawNim = '  13520999  ';
    const cleanNim = '13520999';

    const hashRaw = service.generateHash(rawNim);
    const hashClean = service.generateHash(cleanNim);

    expect(hashRaw).toBe(hashClean);

    const emailUpper = 'MAHASISWA@UI.AC.ID';
    const emailLower = 'mahasiswa@ui.ac.id';

    expect(service.generateHash(emailUpper)).toBe(service.generateHash(emailLower));
  });

  it('returns null for empty, undefined, or null inputs in generateHash', () => {
    expect(service.generateHash(null)).toBeNull();
    expect(service.generateHash(undefined)).toBeNull();
    expect(service.generateHash('')).toBeNull();
    expect(service.generateHash('   ')).toBeNull();
  });

  it('throws descriptive error in generateHashRequired for empty inputs', () => {
    expect(() => service.generateHashRequired('')).toThrow(/BLIND_INDEX_VALIDATION_ERROR/);
  });

  it('verifies hashes using timing-safe comparison', () => {
    const nim = '13520999';
    const hash = service.generateHash(nim);

    expect(service.verifyHash('13520999', hash)).toBe(true);
    expect(service.verifyHash('99902531', hash)).toBe(false);
    expect(service.verifyHash('', hash)).toBe(false);
    expect(service.verifyHash(nim, '')).toBe(false);
  });
});

describe('AppointmentRepository Blind Indexing Integration Tests', () => {
  beforeEach(() => {
    process.env.BLIND_INDEX_SECRET = 'integration-test-blind-index-secret-32-chars';
  });

  it('addAppointment encrypts PII and generates blind index hashes', async () => {
    const testNim = '13520888';
    const testEmail = 'student.test@ui.ac.id';
    const rawNotes = 'Sensitif: Gejala kecemasan akademik';

    const created = await appointmentRepository.addAppointment({
      counselorId: 'c-test-1',
      counselorName: 'Dr. Test Counselor',
      date: '2026-10-15',
      time: '09:00',
      timezone: 'WIB',
      notes: rawNotes,
      status: 'PENDING',
      approvalStatus: 'PENDING_APPROVAL',
      attendanceStatus: 'SCHEDULED',
      meetingLink: 'https://meet.ui.ac.id/test',
      mode: 'video_call',
      studentName: 'Budi Santoso',
      studentNIM: testNim,
      studentEmail: testEmail,
    });

    expect(created.id).toBeDefined();
    expect(created.studentNIM).toBe(testNim); // Decrypted
    expect(created.studentEmail).toBe(testEmail); // Decrypted
    expect(created.notes).toBe(rawNotes); // Decrypted

    // Query directly by NIM using findAppointmentsByNIM
    const foundByNim = await appointmentRepository.findAppointmentsByNIM(testNim);
    expect(foundByNim.length).toBeGreaterThan(0);
    const matched = foundByNim.find(a => a.id === created.id);
    expect(matched).toBeDefined();
    expect(matched?.studentNIM).toBe(testNim);
    expect(matched?.studentEmail).toBe(testEmail);

    // Query directly by Email using findAppointmentsByEmail
    const foundByEmail = await appointmentRepository.findAppointmentsByEmail(testEmail);
    expect(foundByEmail.length).toBeGreaterThan(0);
    expect(foundByEmail.some(a => a.id === created.id)).toBe(true);

    // Clean up test appointment
    await appointmentRepository.deleteAppointment(created.id);
  });
});
