/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { buildPresentationOutline, createEditablePptxBuffer } from '../../features/workspace/utils/exportPptx';

const researchContent = `# Dampak Metode Belajar

# Perbandingan
### Metode A
- Menggunakan umpan balik mingguan dari 24 peserta.
- Hasil pengukuran dicatat selama satu semester.
### Metode B
- Menggunakan umpan balik bulanan dari 26 peserta.
- Pengukuran berlangsung selama dua semester.

## Temuan Utama
- Kelompok A menyelesaikan 18 tugas dan kelompok B menyelesaikan 20 tugas.

## Kesimpulan
- Temuan hanya berlaku untuk kelompok dan periode yang tercatat.

## Daftar Pustaka
- A. Peneliti. (2022). Evaluasi metode belajar. Jurnal Pendidikan.
`;

describe('editable PowerPoint export', () => {
  it('creates an outline with comparison, findings, conclusion, and reference layouts', () => {
    const outline = buildPresentationOutline({ title: 'Dampak Metode Belajar', content: researchContent });
    expect(outline[0]).toMatchObject({ layout: 'title', title: 'Dampak Metode Belajar' });
    expect(outline.some(slide => slide.layout === 'comparison' && slide.columns?.length === 2)).toBe(true);
    expect(outline.some(slide => slide.title === 'Temuan Utama' && slide.layout === 'content')).toBe(true);
    expect(outline.some(slide => slide.title === 'Kesimpulan' && slide.layout === 'content')).toBe(true);
    expect(outline.some(slide => slide.layout === 'references')).toBe(true);
  });

  it('produces valid OOXML with editable text, shapes, a native chart, notes, and in-bounds placements', async () => {
    const content = JSON.stringify({
      type: 'bar', title: 'Rata-rata skor per kelompok', xColumn: 'Kelompok', yColumn: 'Skor',
      aggregation: 'mean', groupBy: 'Kelompok', datasetVersion: 'sha256-version-123456',
      provenance: { filename: 'hasil.xlsx', sheetName: 'Ringkasan', sourceFileId: 'att_test' },
      rows: [{ Kelompok: 'A', Skor: 3.5 }, { Kelompok: 'B', Skor: 4.1 }]
    });
    const buffer = await createEditablePptxBuffer({ title: 'Hasil Penelitian', content, artifactType: 'CHART' });
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 2).toString()).toBe('PK');

    const zip = await JSZip.loadAsync(buffer);
    expect(zip.file('ppt/presentation.xml')).not.toBeNull();
    expect(zip.file('ppt/charts/chart1.xml')).not.toBeNull();
    const slideNames = Object.keys(zip.files).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name));
    expect(slideNames).toHaveLength(2);

    const titleSlide = await zip.file('ppt/slides/slide1.xml')!.async('text');
    expect(titleSlide).toContain('<p:sp');
    expect(titleSlide).toContain('<a:t>Hasil Penelitian</a:t>');
    expect(Object.keys(zip.files).some(name => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(name))).toBe(true);

    for (const name of slideNames) {
      const xml = await zip.file(name)!.async('text');
      const placements = [...xml.matchAll(/<a:off x="(\d+)" y="(\d+)"\/><a:ext cx="(\d+)" cy="(\d+)"\/>/g)];
      for (const match of placements) {
        const x = Number(match[1]);
        const y = Number(match[2]);
        const width = Number(match[3]);
        const height = Number(match[4]);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(x + width).toBeLessThanOrEqual(12_192_000);
        expect(y + height).toBeLessThanOrEqual(6_858_000);
      }
    }
  });

  it('rejects chart content without matching deterministic source data', () => {
    expect(() => buildPresentationOutline({ title: 'Chart', artifactType: 'CHART', content: '{"type":"bar","rows":[]}' })).toThrow(/sumber yang tercatat|baris dengan nilai numerik/);
  });

  it('exports the PowerPoint Studio slide order, editable text, selected theme, and speaker notes', async () => {
    const content = JSON.stringify({
      format: 'ruangtenang-presentation-v1', theme: 'professional',
      slides: [
        { id: 's1', title: 'Opening', body: 'Editable opening text', notes: 'Welcome the audience' },
        { id: 's2', title: 'Findings', body: 'First finding\nSecond finding', notes: 'Explain the result' }
      ]
    });
    expect(buildPresentationOutline({ title: 'Deck', content })).toEqual([
      { title: 'Opening', layout: 'title', bullets: ['Editable opening text'], notes: 'Welcome the audience' },
      { title: 'Findings', layout: 'content', bullets: ['First finding', 'Second finding'], notes: 'Explain the result' }
    ]);
    const buffer = await createEditablePptxBuffer({ title: 'Deck', content });
    const zip = await JSZip.loadAsync(buffer);
    const firstSlide = await zip.file('ppt/slides/slide1.xml')!.async('text');
    const secondSlide = await zip.file('ppt/slides/slide2.xml')!.async('text');
    expect(firstSlide).toContain('<a:t>Opening</a:t>');
    expect(firstSlide).toContain('<a:t>Editable opening text</a:t>');
    expect(secondSlide).toContain('<a:t>Findings</a:t>');
    expect(secondSlide).toContain('<a:t>First finding</a:t>');
    const notesXml = await zip.file('ppt/notesSlides/notesSlide1.xml')!.async('text');
    expect(notesXml).toContain('Welcome the audience');
    expect(firstSlide).toContain('2563EB');
  });

  it('splits large deterministic charts so each editable slide has at most twelve categories', () => {
    const rows = Array.from({ length: 27 }, (_, index) => ({ Group: `Group ${index + 1}`, Total: index + 1 }));
    const outline = buildPresentationOutline({
      title: 'Totals', artifactType: 'CHART', content: JSON.stringify({
        type: 'bar', title: 'Totals by group', xColumn: 'Group', yColumn: 'Total', aggregation: 'sum',
        datasetVersion: 'sha256-version', provenance: { sourceFileId: 'att-1', filename: 'results.xlsx', sheetName: 'Sheet 1' }, rows
      })
    });
    const chartSlides = outline.filter(slide => slide.layout === 'chart');
    expect(outline).toHaveLength(4);
    expect(chartSlides.map(slide => slide.chart?.categories.length)).toEqual([12, 12, 3]);
    expect(chartSlides.flatMap(slide => slide.chart?.categories || [])).toEqual(rows.map(row => row.Group));
  });
});
