/**
 * @vitest-environment node
 *
 * FASE 8 — end-to-end workspace scenarios executed against the real extraction,
 * analysis, verification, and export code (no mocked services). Each scenario
 * re-opens the generated Office files and checks their actual contents.
 */
import { describe, it, expect } from 'vitest';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { extractDocument } from '../../services/file-intelligence/documentExtractor.js';
import { verifyClaimsAgainstEvidence } from '../../services/file-intelligence/claimVerificationService.js';
import { parseTabularWorkbook, runTabularAnalysis } from '../../services/tabularDatasetService.js';
import { TabularAnalysisRequestSchema } from '../../../shared/contracts/tabular.js';
import type { FileSourceReference } from '../../../shared/contracts/files.js';
import { createAcademicDocxBlob, createAcademicStylePreset } from '../../../src/features/workspace/utils/exportDocx';
import { createEditablePptxBuffer, buildPresentationOutline } from '../../../src/features/workspace/utils/exportPptx';
import { createXlsxBuffer, extractMarkdownTables } from '../../../src/features/workspace/utils/exportXlsx';

function pdfBuffer(pages: string[]): Promise<Buffer> {
  return new Promise(resolve => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    pages.forEach((text, index) => { if (index) doc.addPage(); doc.text(text); });
    doc.end();
  });
}

async function xlsxBuffer(sheet: string, rows: unknown[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet(sheet).addRows(rows);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function docxBuffer(text: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`);
  return zip.generateAsync({ type: 'nodebuffer' });
}

describe('FASE 8 end-to-end scenarios', () => {
  it('Scenario 1: PDF -> analysis -> DOCX report with verified citations and flagged unverified claims', async () => {
    const quote = 'Rata-rata kehadiran peserta pelatihan mencapai delapan puluh persen';
    const pdf = await pdfBuffer([`${quote}. Data dikumpulkan selama satu semester.`]);
    const extracted = await extractDocument({ buffer: pdf, filename: 'laporan.pdf', mimeType: 'application/pdf' });
    expect(extracted.kind).toBe('pdf');
    expect(extracted.text).toContain('delapan puluh persen');

    const source: FileSourceReference = {
      citationId: 'c1', documentId: extracted.documentId || 'doc', filename: 'laporan.pdf', page: 1,
      sourceRef: 'laporan.pdf#p1', snippet: extracted.text
    };
    const answer = `${quote}. [cite:c1]\nPeserta wajib hadir setiap hari pada semester berikutnya. [cite:fabricated99]\nKesimpulan ini belum memiliki sumber apa pun di dokumen.`;
    const verification = verifyClaimsAgainstEvidence(answer, [source]);
    const statuses = verification.claims.map(claim => claim.verificationStatus);
    expect(statuses[0]).toBe('supported');
    expect(statuses[1]).toBe('unsupported'); // fabricated citation id is rejected
    expect(statuses[2]).toBe('unsupported'); // no citation at all
    expect(verification.rejectedCitationIds).toEqual(['fabricated99']);
    expect(verification.semanticSupportVerified).toBe(false);

    // Report marks unverified claims explicitly instead of presenting them as fact.
    const body = verification.claims.map(claim => claim.verificationStatus === 'supported'
      ? `${claim.text} (laporan.pdf, hlm. 1)`
      : `[BELUM TERVERIFIKASI] ${claim.text}`).join('\n\n');
    const content = `# Laporan Analisis\n\n${body}\n\n# Daftar Pustaka\n- Laporan Pelatihan. (2024). laporan.pdf.\n`;
    const blob = await createAcademicDocxBlob({ title: 'Laporan Analisis', content, templateType: 'makalah', style: createAcademicStylePreset('makalah') });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const xml = await zip.file('word/document.xml')!.async('text');
    expect(xml).toContain('delapan puluh persen');
    expect(xml).toContain('BELUM TERVERIFIKASI');
    expect(xml).toContain('Daftar Pustaka');
    expect(await zip.file('word/styles.xml')!.async('text')).toContain('<w:styles');
  });

  it('Scenario 2: XLSX -> real computation -> table/chart artifact -> XLSX and PPTX export', async () => {
    const data = await xlsxBuffer('Penjualan', [
      ['Wilayah', 'Omzet'], ['Barat', 100], ['Timur', 250], ['Barat', 50], ['Timur', 150], ['Utara', 75]
    ]);
    const workbook = await parseTabularWorkbook(data, 'penjualan.xlsx');
    const result = runTabularAnalysis({
      attachmentId: 'att_1', filename: 'penjualan.xlsx', checksum: 'sha256-abc123', createdAt: new Date(), workbook,
      plan: TabularAnalysisRequestSchema.parse({ groupBy: 'Wilayah', column: 'Omzet', aggregation: 'sum' })
    });
    // Independently computed expectation: Barat 150, Timur 400, Utara 75.
    const totals = Object.fromEntries(result.rows.map(row => [row.Wilayah as string, row.sum_Omzet as number]));
    expect(totals).toEqual({ Barat: 150, Timur: 400, Utara: 75 });
    expect(result.provenance.filename).toBe('penjualan.xlsx');

    const artifact = JSON.stringify({
      type: 'bar', title: 'Total omzet per wilayah', xColumn: 'Wilayah', yColumn: 'sum_Omzet', aggregation: 'sum',
      datasetVersion: result.datasetVersion, provenance: result.provenance, rows: result.rows
    });

    const xlsx = await createXlsxBuffer({ title: 'Omzet', content: artifact, artifactType: 'CHART' });
    const reread = new ExcelJS.Workbook();
    await reread.xlsx.load(Buffer.from(xlsx) as unknown as ArrayBuffer);
    const dataSheet = reread.worksheets[0];
    expect(dataSheet.getRow(1).values).toEqual([undefined, 'Wilayah', 'sum_Omzet']);
    expect(dataSheet.getRow(3).getCell(2).value).toBe(400);
    const info = reread.getWorksheet('Sumber data')!;
    expect(JSON.stringify(info.getSheetValues())).toContain('penjualan.xlsx');

    const pptx = await createEditablePptxBuffer({ title: 'Omzet', content: artifact, artifactType: 'CHART' });
    const zip = await JSZip.loadAsync(pptx);
    expect(zip.file('ppt/charts/chart1.xml')).not.toBeNull();
    const chartXml = await zip.file('ppt/charts/chart1.xml')!.async('text');
    expect(chartXml).toContain('Timur');
    expect(chartXml).toContain('400');
  });

  it('XLSX export neutralises formula injection and refuses artifacts without tabular data', async () => {
    const table = '| Nama | Nilai |\n| --- | --- |\n| =HYPERLINK("http://evil") | 5 |\n| Aman | 7 |\n';
    expect(extractMarkdownTables(table)).toHaveLength(1);
    const buffer = await createXlsxBuffer({ title: 'Uji', content: table });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.from(buffer) as unknown as ArrayBuffer);
    expect(String(wb.worksheets[0].getRow(2).getCell(1).value).startsWith("'=")).toBe(true);
    expect(wb.worksheets[0].getRow(3).getCell(2).value).toBe(7);
    await expect(createXlsxBuffer({ title: 'Kosong', content: '# Hanya teks\n\nTidak ada tabel.' })).rejects.toThrow(/tabel/);
  });

  it('Scenario 3: multiple documents -> comparison -> editable PPTX', async () => {
    const pdf = await pdfBuffer(['Metode A memakai umpan balik mingguan dengan 24 peserta.']);
    const docx = await docxBuffer('Metode B memakai umpan balik bulanan dengan 26 peserta.');
    const first = await extractDocument({ buffer: pdf, filename: 'metode_a.pdf', mimeType: 'application/pdf' });
    const second = await extractDocument({ buffer: docx, filename: 'metode_b.docx' });
    expect(first.text).toContain('24 peserta');
    expect(second.text).toContain('26 peserta');

    const pick = (text: string) => (text.split('\n').find(line => line.includes('peserta')) || '').replace(/\\/g, '').trim();
    const content = `# Perbandingan Metode\n\n# Perbandingan\n### Metode A (${first.filename})\n- ${pick(first.text)}\n### Metode B (${second.filename})\n- ${pick(second.text)}\n\n## Kesimpulan\n- Perbandingan hanya berdasarkan dua dokumen yang diunggah.\n`;
    const outline = buildPresentationOutline({ title: 'Perbandingan Metode', content });
    expect(outline.some(slide => slide.layout === 'comparison' && slide.columns?.length === 2)).toBe(true);

    const buffer = await createEditablePptxBuffer({ title: 'Perbandingan Metode', content });
    expect(buffer.subarray(0, 2).toString()).toBe('PK');
    const zip = await JSZip.loadAsync(buffer);
    const slides = Object.keys(zip.files).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name));
    expect(slides.length).toBeGreaterThanOrEqual(3);
    const allText = (await Promise.all(slides.map(name => zip.file(name)!.async('text')))).join('');
    expect(allText).toContain('24 peserta');
    expect(allText).toContain('26 peserta');
    expect(allText).toContain('metode_a.pdf');
    expect(allText).toContain('<a:t>'); // editable text runs, not flattened images
    expect(Object.values(zip.files).some(file => !file.dir && file.name.startsWith('ppt/media/'))).toBe(false);
  });
});
