import { describe, it, expect } from 'vitest';
import {
  auditThesisCitations,
  addBibliographyEntry,
  removeGhostReferenceLine,
  injectCitationAtCursor
} from '../../features/workspace/utils/citationIntegrity';

describe('Thesis Citation Consistency & Audit Engine', () => {
  it('correctly matches in-text citations with bibliography entries', () => {
    const document = `
# Bab 1 Pendahuluan
Menurut penelitian terdahulu (Santoso, 2021), kecerdasan buatan membantu mahasiswa.
Hal ini diperkuat oleh temuan empiris (Rahmawati, 2023) dalam konteks pembelajaran mandiri.

### Daftar Pustaka
Santoso, B. (2021). Peran AI dalam Pendidikan Tinggi. Jurnal Teknologi, 10(2), 45-56.
Rahmawati, S. (2023). Pembelajaran Mandiri Generasi Z. Jurnal Psikologi Pendidikan, 5(1), 12-24.
    `;

    const report = auditThesisCitations(document);
    expect(report.totalInTextCitations).toBe(2);
    expect(report.totalBibliographyEntries).toBe(2);
    expect(report.matchedCitations.length).toBe(2);
    expect(report.ghostReferences.length).toBe(0);
    expect(report.missingBibliography.length).toBe(0);
    expect(report.healthScore).toBeGreaterThanOrEqual(90);
  });

  it('detects Ghost References (entries in bibliography not cited in text)', () => {
    const document = `
# Bab 1 Pendahuluan
Penelitian ini mengacu pada (Santoso, 2021).

### Daftar Pustaka
Santoso, B. (2021). Peran AI dalam Pendidikan Tinggi. Jurnal Teknologi, 10(2), 45-56.
Wijaya, D. (2019). Manajemen Waktu Mahasiswa Tingkat Akhir. Jurnal Konseling, 8(3), 88-99.
    `;

    const report = auditThesisCitations(document);
    expect(report.ghostReferences.length).toBe(1);
    expect(report.ghostReferences[0].author).toContain('Wijaya');
    expect(report.healthScore).toBeLessThan(100);
  });

  it('detects Missing Bibliography (in-text citations missing from references)', () => {
    const document = `
# Bab 1 Pendahuluan
Penelitian ini mengacu pada (Santoso, 2021) dan teori motivasi dari (Handoko, 2022).

### Daftar Pustaka
Santoso, B. (2021). Peran AI dalam Pendidikan Tinggi. Jurnal Teknologi, 10(2), 45-56.
    `;

    const report = auditThesisCitations(document);
    expect(report.missingBibliography.length).toBe(1);
    expect(report.missingBibliography[0].author).toBe('Handoko');
    expect(report.missingBibliography[0].year).toBe('2022');
  });

  it('adds missing bibliography entries gracefully', () => {
    const initial = `
# Bab 1
Kutipan (Pratama, 2024).

### Daftar Pustaka
Santoso, B. (2021). Judul Artikel.
    `;

    const updated = addBibliographyEntry(initial, 'Pratama', '2024', 'Studi Kualitatif', 'Jurnal Riset');
    expect(updated).toContain('Pratama, Inisial. (2024). Studi Kualitatif');
    const report = auditThesisCitations(updated);
    expect(report.missingBibliography.length).toBe(0);
  });

  it('removes ghost reference lines cleanly', () => {
    const ghostLine = 'Wijaya, D. (2019). Manajemen Waktu Mahasiswa Tingkat Akhir. Jurnal Konseling, 8(3), 88-99.';
    const initial = `
# Bab 1
Teks tanpa rujukan.

### Daftar Pustaka
${ghostLine}
    `;

    const cleaned = removeGhostReferenceLine(initial, ghostLine);
    expect(cleaned).not.toContain(ghostLine);
  });

  it('injects in-text citation string at target cursor position', () => {
    const text = 'Penerapan teknologi baru dapat meningkatkan produktivitas mahasiswa.';
    const targetOffset = 24; // right after "teknologi baru"
    const injected = injectCitationAtCursor(text, '(Utami, 2023)', targetOffset);
    expect(injected).toContain('teknologi baru (Utami, 2023)');
  });
});
