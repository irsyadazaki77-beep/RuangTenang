/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { DocumentExtractor, extractDocument } from '../../services/file-intelligence/documentExtractor.js';
import { DocumentProcessingException } from '../../services/file-intelligence/fileTypes.js';

// Genuine file builders for tests
async function createPdfBuffer(pagesText: string[]): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const buffers: Buffer[] = [];
    doc.on('data', b => buffers.push(b));
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    pagesText.forEach((text, i) => {
      if (i > 0) doc.addPage();
      doc.text(text);
    });
    doc.end();
  });
}

async function createXlsxBuffer(sheetName: string, rows: (string | number)[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  ws.addRows(rows);
  const u8 = await wb.xlsx.writeBuffer();
  return Buffer.from(u8);
}

async function createDocxBuffer(text: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body>
</w:document>`);
  return await zip.generateAsync({ type: 'nodebuffer' });
}

async function createPptxBuffer(slides: string[]): Promise<Buffer> {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
</Types>`);
  zip.file('ppt/presentation.xml', `<?xml version="1.0" encoding="UTF-8"?><p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>`);
  slides.forEach((slideText, idx) => {
    zip.file(`ppt/slides/slide${idx + 1}.xml`, `<?xml version="1.0" encoding="UTF-8"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>${slideText}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld>
</p:sld>`);
  });
  return await zip.generateAsync({ type: 'nodebuffer' });
}

describe('FASE 9 — Document Extraction Pipeline Unit Tests', () => {
  // 1. PDF berhasil diekstrak
  it('1. Successfully extracts a valid PDF and maintains page boundaries', async () => {
    const pdfBuffer = await createPdfBuffer([
      'Ini adalah teks halaman kesatu.',
      'Ini adalah teks halaman kedua.'
    ]);

    const result = await extractDocument({
      buffer: pdfBuffer,
      filename: 'akademik.pdf',
      mimeType: 'application/pdf'
    });

    expect(result.text).toContain('Page 1');
    expect(result.text).toContain('Ini adalah teks halaman kesatu.');
    expect(result.text).toContain('Page 2');
    expect(result.text).toContain('Ini adalah teks halaman kedua.');
    expect(result.metadata.pageCount).toBe(2);
    expect(result.metadata.filename).toBe('akademik.pdf');
  });

  // 2. DOCX berhasil diekstrak
  it('2. Successfully extracts a valid DOCX and parses paragraphs', async () => {
    const docxBuffer = await createDocxBuffer('Dokumen tesis bab pendahuluan untuk mahasiswa.');

    const result = await DocumentExtractor.extractDocument({
      buffer: docxBuffer,
      filename: 'tesis.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    expect(result.text).toContain('Dokumen tesis bab pendahuluan');
    expect(result.metadata.filename).toBe('tesis.docx');
  });

  // 3. PPTX berhasil diekstrak
  it('3. Successfully extracts a valid PPTX slide-by-slide', async () => {
    const pptxBuffer = await createPptxBuffer([
      'Slide pertama: Judul Materi',
      'Slide kedua: Pembahasan'
    ]);

    const result = await extractDocument({
      buffer: pptxBuffer,
      filename: 'presentasi.pptx',
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    });

    expect(result.text).toContain('Slide 1');
    expect(result.text).toContain('Slide pertama: Judul Materi');
    expect(result.text).toContain('Slide 2');
    expect(result.text).toContain('Slide kedua: Pembahasan');
    expect(result.metadata.slideCount).toBe(2);
  });

  // 4. XLSX berhasil diekstrak
  it('4. Successfully extracts basic XLSX sheet data with tabular structure', async () => {
    const xlsxBuffer = await createXlsxBuffer('Penjualan', [
      ['Tanggal', 'Produk', 'Jumlah'],
      ['01/09/2026', 'A', '10'],
      ['02/09/2026', 'B', '15']
    ]);

    const result = await extractDocument({
      buffer: xlsxBuffer,
      filename: 'data.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    expect(result.text).toContain('[Sheet: Penjualan]');
    expect(result.text).toContain('Tanggal | Produk | Jumlah');
    expect(result.text).toContain('01/09/2026 | A | 10');
    expect(result.text).toContain('02/09/2026 | B | 15');
    expect(result.metadata.sheetCount).toBe(1);
  });

  // 5. TXT tetap berjalan
  it('5. Successfully extracts a standard TXT file', async () => {
    const txtBuffer = Buffer.from('Baris text pertama.\nBaris text kedua.', 'utf8');

    const result = await extractDocument({
      buffer: txtBuffer,
      filename: 'catatan.txt',
      mimeType: 'text/plain'
    });

    expect(result.text).toContain('Baris text pertama.');
    expect(result.text).toContain('Baris text kedua.');
  });

  // 6. corrupted PDF gagal dengan aman
  it('6. Fails deterministically on a corrupted PDF with safe error', async () => {
    const corruptBuffer = Buffer.from('%PDF-1.4 completely invalid corrupt binary bytes %EOF', 'utf8');

    await expect(
      extractDocument({
        buffer: corruptBuffer,
        filename: 'corrupt.pdf',
        mimeType: 'application/pdf'
      })
    ).rejects.toThrowError(/INVALID_DOCUMENT|PARSER_ERROR/);
  });

  // 7. invalid DOCX gagal dengan aman
  it('7. Fails deterministically on a corrupted DOCX with safe error', async () => {
    const corruptBuffer = Buffer.from('This is not a zip file at all', 'utf8');

    await expect(
      extractDocument({
        buffer: corruptBuffer,
        filename: 'corrupt.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      })
    ).rejects.toThrowError(/INVALID_DOCUMENT|SIGNATURE_MISMATCH/);
  });

  // 8. unsupported file ditolak
  it('8. Rejects unsupported file extension and mime format', async () => {
    const badBuffer = Buffer.from('some fake text', 'utf8');

    await expect(
      extractDocument({
        buffer: badBuffer,
        filename: 'app.exe',
        mimeType: 'application/octet-stream'
      })
    ).rejects.toThrowError(/UNSUPPORTED_FORMAT|SECURITY_REJECTED/);
  });

  // 9. terlalu besar ditolak
  it('9. Rejects files that exceed the file size limit', async () => {
    const hugeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB (limit is 5MB)

    await expect(
      extractDocument({
        buffer: hugeBuffer,
        filename: 'huge.txt',
        mimeType: 'text/plain'
      })
    ).rejects.toThrowError(/DOCUMENT_TOO_LARGE|FILE_TOO_LARGE/);
  });

  // 10. extraction error tidak membuat server crash
  it('10. Assures extraction errors do not crash the runtime by being caught cleanly', async () => {
    const brokenJSON = Buffer.from('{ "broken": json ', 'utf8');

    await expect(
      extractDocument({
        buffer: brokenJSON,
        filename: 'config.json',
        mimeType: 'application/json'
      })
    ).rejects.toThrowError(/EXTRACTION_FAILED|PARSER_ERROR|INVALID_DOCUMENT/);
  });
});
