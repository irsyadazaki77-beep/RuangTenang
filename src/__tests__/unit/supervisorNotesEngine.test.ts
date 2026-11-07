import { describe, it, expect } from 'vitest';
import {
  parseSupervisorNotes,
  generateSupervisorControlSheetMarkdown
} from '../../features/workspace/utils/supervisorNotesEngine';

describe('Supervisor Notes & Action Plan Parser', () => {
  it('detects chapter contexts and priority levels from consultation notes', () => {
    const rawNotes = `
- Bab 1: Pertegas latar belakang masalah paragraf 3 dengan data statistik BPS terbaru
- Bab 2: Wajib tambahkan 2 jurnal internasional bereputasi terkait variabel mediasi sebelum sidang
- Bab 3: Ganti teknik sampling menggunakan stratified random sampling N=120
- Rapikan typo dan format font margin naskah
    `;

    const summary = parseSupervisorNotes(rawNotes, 'Prof. Dr. Suryono');
    expect(summary.supervisorName).toBe('Prof. Dr. Suryono');
    expect(summary.revisionItems.length).toBe(4);

    const bab1 = summary.revisionItems.find(i => i.chapter === 'BAB_1');
    expect(bab1).toBeDefined();
    expect(bab1?.details).toContain('Pertegas latar belakang');

    const bab2 = summary.revisionItems.find(i => i.chapter === 'BAB_2');
    expect(bab2).toBeDefined();
    expect(bab2?.priority).toBe('kritis'); // Contains "wajib" & "sebelum sidang"

    const minor = summary.revisionItems.find(i => i.priority === 'minor');
    expect(minor).toBeDefined();
    expect(minor?.details).toContain('typo');
  });

  it('generates a formal supervisor tracking sheet (Lembar Kendali) in markdown', () => {
    const rawNotes = `
- Bab 1: Tambahkan data fenomena faktual lapangan
- Bab 3: Justifikasi teknik penentuan sampel dengan rumus Slovin
    `;

    const summary = parseSupervisorNotes(rawNotes, 'Dr. Ir. Hendra');
    const md = generateSupervisorControlSheetMarkdown(summary);

    expect(md).toContain('Lembar Kendali & Tindak Lanjut Bimbingan Skripsi');
    expect(md).toContain('Dr. Ir. Hendra');
    expect(md).toContain('Daftar Tindak Lanjut Revisi (Action Plan)');
    expect(md).toContain('Bab 1: Pendahuluan');
    expect(md).toContain('Bab 3: Metodologi');
  });
});
