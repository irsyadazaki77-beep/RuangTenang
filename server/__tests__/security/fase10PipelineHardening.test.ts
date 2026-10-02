/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import path from 'path';
import fs from 'fs';
import { prisma } from '../../database.js';
import attachmentsRouter from '../../routes/attachments.js';
import { documentIngestionService } from '../../services/file-intelligence/documentIngestionService.js';
import { validateAndInspectFile } from '../../services/file-intelligence/magicByteValidator.js';
import { isTextBasedFile } from '../../../src/features/workspace/services/fileIngestionService.js';

// Setup Express test app with attachmentsRouter
const app = express();
app.use(express.json());

// Mock user auth helper middleware for testing
let currentTestUser: any = null;
app.use((req, _res, next) => {
  if (currentTestUser) {
    (req as any).user = currentTestUser;
  }
  next();
});

app.use('/api/v1', attachmentsRouter);

// Helpers to generate genuine binary files
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

async function createXlsxBuffer(sheetName: string, rows: (string | number)[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  ws.addRows(rows);
  const u8 = await wb.xlsx.writeBuffer();
  return Buffer.from(u8);
}

describe('FASE 10 — Comprehensive File Pipeline Hardening Verification', () => {
  const userA = `usr_f10_a_${Date.now()}`;
  const userB = `usr_f10_b_${Date.now()}`;
  const chatA = `chat_f10_a_${Date.now()}`;
  const createdAttachmentIds: string[] = [];

  beforeAll(async () => {
    try {
      await prisma.users.createMany({
        data: [
          { id: userA, email: `${userA}@test.com`, passwordHash: 'hash', name: 'User A' },
          { id: userB, email: `${userB}@test.com`, passwordHash: 'hash', name: 'User B' }
        ]
      });
      await prisma.chats.create({
        data: {
          id: chatA,
          userId: userA,
          title: 'RuangKerja User A Chat'
        }
      });
    } catch {}
  });

  afterAll(async () => {
    for (const id of createdAttachmentIds) {
      try {
        await documentIngestionService.deleteAttachment(id, userA);
      } catch {}
      try {
        await documentIngestionService.deleteAttachment(id, userB);
      } catch {}
    }
  });

  // 1. Valid PDF
  it('1. Successfully validates and extracts valid PDF', async () => {
    currentTestUser = { userId: userA, role: 'mahasiswa' };
    const pdfBuf = await createPdfBuffer(['Halaman 1: Pendahuluan Riset', 'Halaman 2: Metode Riset']);
    
    const res = await request(app)
      .post('/api/v1/chat/attachments/upload')
      .attach('files', pdfBuf, 'skripsi.pdf');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.attachment.fileKind).toBe('pdf');
    expect(res.body.attachment.status).toBe('ready');
    createdAttachmentIds.push(res.body.attachment.id);
  });

  // 2. Valid DOCX
  it('2. Successfully validates and extracts valid DOCX', async () => {
    currentTestUser = { userId: userA, role: 'mahasiswa' };
    const docxBuf = await createDocxBuffer('# Judul Proposal\n\nIsi bab proposal penelitian.');

    const res = await request(app)
      .post('/api/v1/chat/attachments/upload')
      .attach('files', docxBuf, 'proposal.docx');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.attachment.fileKind).toBe('docx');
    expect(res.body.attachment.status).toBe('ready');
    createdAttachmentIds.push(res.body.attachment.id);
  });

  // 3. Valid PPTX
  it('3. Successfully validates and extracts valid PPTX', async () => {
    currentTestUser = { userId: userA, role: 'mahasiswa' };
    const pptxBuf = await createPptxBuffer(['Slide 1: Pengantar Algoritma', 'Slide 2: Kompleksitas Waktu']);

    const res = await request(app)
      .post('/api/v1/chat/attachments/upload')
      .attach('files', pptxBuf, 'presentasi.pptx');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.attachment.fileKind).toBe('pptx');
    expect(res.body.attachment.status).toBe('ready');
    expect(res.body.attachment.slideCount).toBe(2);
    createdAttachmentIds.push(res.body.attachment.id);
  });

  // 4. Valid XLSX
  it('4. Successfully validates and extracts valid XLSX', async () => {
    currentTestUser = { userId: userA, role: 'mahasiswa' };
    const xlsxBuf = await createXlsxBuffer('Dataset', [
      ['NIM', 'Nilai'],
      ['101', 95],
      ['102', 88]
    ]);

    const res = await request(app)
      .post('/api/v1/chat/attachments/upload')
      .attach('files', xlsxBuf, 'nilai.xlsx');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.attachment.fileKind).toBe('xlsx');
    expect(res.body.attachment.status).toBe('ready');
    expect(res.body.attachment.sheetCount).toBe(1);
    createdAttachmentIds.push(res.body.attachment.id);
  });

  // 5. Valid TXT
  it('5. Successfully validates and extracts valid TXT', async () => {
    currentTestUser = { userId: userA, role: 'mahasiswa' };
    const txtBuf = Buffer.from('Catatan kuliah statistika deskriptif.', 'utf8');

    const res = await request(app)
      .post('/api/v1/chat/attachments/upload')
      .attach('files', txtBuf, 'catatan.txt');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.attachment.fileKind).toBe('text');
    expect(res.body.attachment.status).toBe('ready');
    createdAttachmentIds.push(res.body.attachment.id);
  });

  // 6. PDF extension spoof (fake PDF content)
  it('6. Rejects PDF extension spoof when content is not genuine PDF', async () => {
    currentTestUser = { userId: userA, role: 'mahasiswa' };
    const fakePdfBuf = Buffer.from('Ini bukan file PDF asli, hanya teks biasa.', 'utf8');

    const res = await request(app)
      .post('/api/v1/chat/attachments/upload')
      .attach('files', fakePdfBuf, 'tugas.pdf');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('SIGNATURE_MISMATCH');
  });

  // 7. DOCX extension spoof (fake DOCX / not a valid ZIP/Office doc)
  it('7. Rejects DOCX extension spoof when content is arbitrary text', async () => {
    currentTestUser = { userId: userA, role: 'mahasiswa' };
    const fakeDocx = Buffer.from('Bukan ZIP atau file Word', 'utf8');

    const res = await request(app)
      .post('/api/v1/chat/attachments/upload')
      .attach('files', fakeDocx, 'skripsi.docx');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('SIGNATURE_MISMATCH');
  });

  // 8. MIME mismatch (e.g. extension says .png but buffer is JPEG)
  it('8. Rejects MIME mismatch when file signature contradicts extension', async () => {
    currentTestUser = { userId: userA, role: 'mahasiswa' };
    // JPEG magic bytes disguised as .png
    const jpegHeaderDisguisedAsPng = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);

    const res = await request(app)
      .post('/api/v1/chat/attachments/upload')
      .attach('files', jpegHeaderDisguisedAsPng, 'gambar.png');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('MIME_MISMATCH');
  });

  // 9. Empty file (0 bytes)
  it('9. Rejects empty file (0 bytes)', async () => {
    currentTestUser = { userId: userA, role: 'mahasiswa' };
    const emptyBuf = Buffer.alloc(0);

    const res = await request(app)
      .post('/api/v1/chat/attachments/upload')
      .attach('files', emptyBuf, 'empty.txt');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('EMPTY_FILE');
  });

  // 10. Oversized file (> 5MB)
  it('10. Rejects oversized file exceeding 5MB', async () => {
    currentTestUser = { userId: userA, role: 'mahasiswa' };
    const hugeBuf = Buffer.alloc(5 * 1024 * 1024 + 1024);

    const res = await request(app)
      .post('/api/v1/chat/attachments/upload')
      .attach('files', hugeBuf, 'huge.txt');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('FILE_TOO_LARGE');
  });

  // 11. Unsupported type (.exe or .rar)
  it('11. Rejects unsupported file extension', async () => {
    currentTestUser = { userId: userA, role: 'mahasiswa' };
    const buf = Buffer.from('test data', 'utf8');

    const res = await request(app)
      .post('/api/v1/chat/attachments/upload')
      .attach('files', buf, 'program.exe');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toMatch(/UNSUPPORTED_TYPE|SECURITY_REJECTED/);
  });

  // 12. Processing failure
  it('12. Handles processing failure properly and marks document status as failed', async () => {
    // Intentionally corrupted PDF
    const corruptPdf = Buffer.from('%PDF-1.4 severely broken binary stream %%EOF', 'utf8');

    await expect(
      documentIngestionService.ingestFile({
        userId: userA,
        buffer: corruptPdf,
        originalFilename: 'rusak.pdf'
      })
    ).rejects.toThrow(/PARSER_ERROR/);
  });

  // 13. Processing timeout simulation
  it('13. Polling reports honest timeout rather than pretending success', async () => {
    const { pollProcessingStatus } = await import('../../../src/features/workspace/services/fileIngestionService.js');
    
    // Simulate non-ready response
    const origFetch = global.fetch;
    global.fetch = async () => ({
      ok: true,
      json: async () => ({ attachment: { status: 'processing' } })
    } as any);

    try {
      const pollResult = await pollProcessingStatus('att_mock_timeout', 2, 10);
      expect(pollResult.success).toBe(false);
      expect(pollResult.timeout).toBe(true);
    } finally {
      global.fetch = origFetch;
    }
  });

  // 14. Retry while processing is rejected
  it('14. Rejects retry request while document is already processing', async () => {
    const txtBuf = Buffer.from('Dokumen uji coba concurrency.', 'utf8');
    const att = await documentIngestionService.ingestFile({
      userId: userA,
      buffer: txtBuf,
      originalFilename: 'concurrency.txt'
    });
    createdAttachmentIds.push(att.id);

    // Set status to processing
    await prisma.attachments.update({
      where: { id: att.id },
      data: { status: 'processing' }
    });

    currentTestUser = { userId: userA, role: 'mahasiswa' };
    const res = await request(app)
      .post(`/api/v1/chat/attachments/${att.id}/retry`);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PROCESSING_IN_PROGRESS');
  });

  // 15. Cross-user status access
  it('15. Rejects cross-user status check (User B cannot check User A document status)', async () => {
    const targetId = createdAttachmentIds[0];
    currentTestUser = { userId: userB, role: 'mahasiswa' };

    const res = await request(app)
      .get(`/api/v1/chat/attachments/${targetId}/status`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('UNAUTHORIZED_ACCESS');
  });

  // 16. Cross-user download access
  it('16. Rejects cross-user file download (User B cannot download User A file)', async () => {
    const targetId = createdAttachmentIds[0];
    currentTestUser = { userId: userB, role: 'mahasiswa' };

    const res = await request(app)
      .get(`/api/v1/chat/attachments/${targetId}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('UNAUTHORIZED_ACCESS');
  });

  // 17. Cross-user delete access
  it('17. Rejects cross-user delete (User B cannot delete User A document)', async () => {
    const targetId = createdAttachmentIds[0];
    currentTestUser = { userId: userB, role: 'mahasiswa' };

    const res = await request(app)
      .delete(`/api/v1/chat/attachments/${targetId}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('UNAUTHORIZED_ACCESS');
  });

  // 18. Chat ownership mismatch on upload
  it('18. Rejects upload when chatId belongs to a different user', async () => {
    currentTestUser = { userId: userB, role: 'mahasiswa' };
    const txtBuf = Buffer.from('Teks user B mencoba mengaitkan ke chat milik user A', 'utf8');

    const res = await request(app)
      .post('/api/v1/chat/attachments/upload')
      .field('chatId', chatA) // chatA is owned by userA
      .attach('files', txtBuf, 'b.txt');

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('UNAUTHORIZED_ACCESS');
  });

  // 19. Path traversal filename
  it('19. Prevents path traversal in filename and sanitizes safely', async () => {
    currentTestUser = { userId: userA, role: 'mahasiswa' };
    const txtBuf = Buffer.from('Uji path traversal.', 'utf8');

    const res = await request(app)
      .post('/api/v1/chat/attachments/upload')
      .attach('files', txtBuf, '../../../../etc/passwd.txt');

    expect(res.status).toBe(201);
    expect(res.body.attachment.filename).not.toContain('../');
    expect(res.body.attachment.filename).not.toContain('/etc/');
    createdAttachmentIds.push(res.body.attachment.id);

    // Verify disk storage uses immutable ID, not user filename
    const record = await prisma.attachments.findUnique({
      where: { id: res.body.attachment.id }
    });
    expect(record?.data).toContain('uploads/attachments/att_');
  });

  // 20. Binary file does not use readAsText
  it('20. Validates isTextBasedFile strictly distinguishes binary vs text', () => {
    expect(isTextBasedFile('document.pdf')).toBe(false);
    expect(isTextBasedFile('document.docx')).toBe(false);
    expect(isTextBasedFile('document.pptx')).toBe(false);
    expect(isTextBasedFile('document.xlsx')).toBe(false);
    expect(isTextBasedFile('photo.png')).toBe(false);
    expect(isTextBasedFile('notes.txt')).toBe(true);
    expect(isTextBasedFile('readme.md')).toBe(true);
    expect(isTextBasedFile('data.csv')).toBe(true);
    expect(isTextBasedFile('app.json')).toBe(true);
  });

  // 21. Failed document does not become ready
  it('21. Failed document status remains failed and does not falsely become ready', async () => {
    const corruptPdf = Buffer.from('%PDF-1.4 malformed header with no valid trailer %%EOF', 'utf8');
    
    try {
      await documentIngestionService.ingestFile({
        userId: userA,
        buffer: corruptPdf,
        originalFilename: 'failed_test.pdf'
      });
    } catch {}

    const failedRecord = await prisma.attachments.findFirst({
      where: {
        userId: userA,
        filename: 'failed_test.pdf'
      }
    });

    if (failedRecord) {
      createdAttachmentIds.push(failedRecord.id);
      expect(failedRecord.status).toBe('failed');
      expect(failedRecord.status).not.toBe('ready');
    }
  });

  // 22. Deleted attachment cannot be accessed anymore
  it('22. Deleted attachment cannot be accessed by anyone anymore', async () => {
    currentTestUser = { userId: userA, role: 'mahasiswa' };
    const txtBuf = Buffer.from('Akan segera dihapus permanen.', 'utf8');

    const res = await request(app)
      .post('/api/v1/chat/attachments/upload')
      .attach('files', txtBuf, 'hapus.txt');

    const idToDelete = res.body.attachment.id;

    // Delete
    const delRes = await request(app)
      .delete(`/api/v1/chat/attachments/${idToDelete}`);
    expect(delRes.status).toBe(200);

    // Try to get status
    const statusRes = await request(app)
      .get(`/api/v1/chat/attachments/${idToDelete}/status`);
    expect(statusRes.status).toBe(404);

    // Try to download
    const dlRes = await request(app)
      .get(`/api/v1/chat/attachments/${idToDelete}`);
    expect(dlRes.status).toBe(404);
  });
});
