import { describe, it, expect } from 'vitest';
import { scanAndSanitizePII } from './services/piiService.js';

describe('PII Protection & Redaction Engine', () => {
  it('Redacts Indonesian phone numbers (+62 / 08...)', () => {
    const text = 'Hubungi saya di 081234567890 untuk info lebih lanjut.';
    const result = scanAndSanitizePII(text);
    expect(result.hasPii).toBe(true);
    expect(result.sanitizedText).toContain('[NOMOR_HP_TERSEMBUNYI]');
    expect(result.sanitizedText).not.toContain('081234567890');
    expect(result.detectedTypes).toContain('phone');
  });

  it('Redacts emails', () => {
    const text = 'Email saya budi.santoso@ui.ac.id tolong kirim balasan.';
    const result = scanAndSanitizePII(text);
    expect(result.hasPii).toBe(true);
    expect(result.sanitizedText).toContain('[EMAIL_TERSEMBUNYI]');
    expect(result.sanitizedText).not.toContain('budi.santoso@ui.ac.id');
    expect(result.detectedTypes).toContain('email');
  });

  it('Redacts 16-digit NIK (Nomor Induk Kependudukan)', () => {
    const text = 'NIK saya 3171012304950001 di KTP.';
    const result = scanAndSanitizePII(text);
    expect(result.hasPii).toBe(true);
    expect(result.sanitizedText).toContain('[NIK_TERSEMBUNYI]');
    expect(result.sanitizedText).not.toContain('3171012304950001');
    expect(result.detectedTypes).toContain('nik');
  });

  it('Redacts NIM (8-14 digits)', () => {
    const text = 'NIM saya 1234567890.';
    const result = scanAndSanitizePII(text);
    expect(result.hasPii).toBe(true);
    expect(result.sanitizedText).toContain('[NIM_TERSEMBUNYI]');
    expect(result.sanitizedText).not.toContain('1234567890');
    expect(result.detectedTypes).toContain('nim');
  });

  it('Redacts self identifying names', () => {
    const text = 'Halo, nama saya Budi Santoso dan saya sedih.';
    const result = scanAndSanitizePII(text);
    expect(result.hasPii).toBe(true);
    expect(result.sanitizedText).toBe('Halo, nama saya [MAHASISWA] dan saya sedih.');
    expect(result.detectedTypes).toContain('name');
  });

  it('Redacts detailed street address', () => {
    const text = 'Rumah saya di Jl. Margonda Raya No. 100 Depok';
    const result = scanAndSanitizePII(text);
    expect(result.hasPii).toBe(true);
    expect(result.sanitizedText).toContain('[ALAMAT_TERSEMBUNYI]');
    expect(result.detectedTypes).toContain('address');
  });

  it('Passes clean text without modification', () => {
    const text = 'Saya merasa cemas menghadapi ujian akhir semester ini.';
    const result = scanAndSanitizePII(text);
    expect(result.hasPii).toBe(false);
    expect(result.sanitizedText).toBe(text);
    expect(result.detectedTypes).toHaveLength(0);
  });
});
