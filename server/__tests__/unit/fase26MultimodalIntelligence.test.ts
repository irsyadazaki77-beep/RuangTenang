/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PDFDocument from 'pdfkit';
import { smartModelRouter } from '../../services/ai/smartModelRouter.js';
import { AI_MODEL_REGISTRY, getModelDefinition } from '../../services/ai/aiModelRegistry.js';
import { ImageAdapter } from '../../services/file-intelligence/adapters/ImageAdapter.js';
import { PdfAdapter } from '../../services/file-intelligence/adapters/PdfAdapter.js';
import * as visualIntel from '../../services/file-intelligence/visualIntelligenceService.js';
import { aiProviderConfig } from '../../config/aiProviderConfig.js';
import { DocumentProcessingException } from '../../services/file-intelligence/fileTypes.js';

// Deterministic fixture generator for PDFs
async function createPdf(pagesText: string[]): Promise<Buffer> {
  return new Promise(resolve => {
    const doc = new PDFDocument();
    const buffers: Buffer[] = [];
    doc.on('data', b => buffers.push(b));
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    pagesText.forEach((text, i) => {
      if (i > 0) doc.addPage();
      if (text) doc.text(text);
    });
    doc.end();
  });
}

describe('FASE 26 — Multimodal Intelligence & Visual Document Understanding Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Model Capabilities & Routing', () => {
    it('registers vision and OCR capabilities for multimodal models', () => {
      const flash = getModelDefinition('gemini-3.8-flash');
      expect(flash).toBeDefined();
      expect(flash?.capabilities).toContain('vision');
      expect(flash?.capabilities).toContain('image_understanding');
      expect(flash?.capabilities).toContain('document_ocr');

      const deepseek = getModelDefinition('deepseek-chat');
      expect(deepseek).toBeDefined();
      expect(deepseek?.capabilities).not.toContain('vision');

      const gptMini = getModelDefinition('openai-gpt-5-mini');
      expect(gptMini).toBeDefined();
      expect(gptMini?.capabilities).toContain('vision');
    });

    it('routes requests with image attachments strictly to vision-capable models', () => {
      vi.spyOn(aiProviderConfig, 'isConfigured').mockReturnValue(true);

      const decision = smartModelRouter.routeProfile('kerja-hard', {
        workspaceMode: true,
        userTier: 'Free',
        attachments: [{ filename: 'error_screenshot.png', mimeType: 'image/png', size: 1024 }]
      }, 'Ini screenshot error di VS Code. Tolong perbaiki.');

      const model = getModelDefinition(decision.selectedModelId);
      expect(model?.capabilities).toContain('vision');
    });

    it('rejects manual selection of text-only models when image attachment is provided', () => {
      vi.spyOn(aiProviderConfig, 'isConfigured').mockReturnValue(true);

      expect(() => {
        smartModelRouter.routeModel({
          manualModelId: 'deepseek-reasoner',
          userTier: 'Pro',
          attachments: [{ filename: 'diagram.png', mimeType: 'image/png', size: 1024 }]
        }, 'Analisis diagram BPMN ini');
      }).toThrow();
    });
  });

  describe('2. True Image Understanding & Fixture Tests', () => {
    it('analyzes VS Code error screenshots using vision mock', async () => {
      vi.spyOn(visualIntel, 'performVisualOcr').mockResolvedValueOnce({
        text: 'TypeError: Cannot read properties of undefined (reading "execute")\n    at WorkflowService.ts:42',
        isVisualExtraction: true,
        ocrConfidence: 0.98,
        modelUsed: 'gemini-3.8-flash'
      });

      const adapter = new ImageAdapter();
      const extracted = await adapter.extract({
        documentId: 'doc_img_error_1',
        filename: 'vscode_error.png',
        mimeType: 'image/png',
        kind: 'image',
        buffer: Buffer.from('fake_image_bytes'),
        checksum: 'hash123'
      });

      expect(extracted.metadata?.visualAnalysisAvailable).toBe(true);
      expect(extracted.metadata?.ocrApplied).toBe(true);
      expect(extracted.normalizedText).toContain('TypeError');
      expect(extracted.blocks.length).toBeGreaterThan(0);
      expect(extracted.blocks[0].isVisualExtraction).toBe(true);
    });

    it('analyzes BPMN diagram fixtures and identifies process flow and gateways', async () => {
      vi.spyOn(visualIntel, 'performVisualOcr').mockResolvedValueOnce({
        text: 'BPMN Diagram: Order Fulfillment Process\nStart Event: Order Received\nExclusive Gateway: Payment Validated?\nTask: Pack Items\nEnd Event: Order Shipped',
        isVisualExtraction: true,
        ocrConfidence: 0.95,
        modelUsed: 'gemini-3.8-flash'
      });

      const adapter = new ImageAdapter();
      const extracted = await adapter.extract({
        documentId: 'doc_bpmn_1',
        filename: 'order_flow_bpmn.png',
        mimeType: 'image/png',
        kind: 'image',
        buffer: Buffer.from('fake_bpmn_bytes'),
        checksum: 'hashbpmn'
      });

      expect(extracted.normalizedText).toContain('BPMN Diagram');
      expect(extracted.normalizedText).toContain('Exclusive Gateway');
      expect(extracted.blocks[0].isVisualExtraction).toBe(true);
    });

    it('falls back honestly to preview_only when vision provider is unavailable', async () => {
      vi.spyOn(visualIntel, 'performVisualOcr').mockResolvedValueOnce(null);
      vi.spyOn(visualIntel, 'isVisualOcrAvailable').mockReturnValue(false);

      const adapter = new ImageAdapter();
      const extracted = await adapter.extract({
        documentId: 'doc_img_preview_only',
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
        kind: 'image',
        buffer: Buffer.from('fake_photo_bytes'),
        checksum: 'hashphoto'
      });

      expect(extracted.metadata?.previewOnly).toBe(true);
      expect(extracted.metadata?.visualAnalysisAvailable).toBe(false);
      expect(extracted.blocks.length).toBe(0);
      expect(extracted.normalizedText).toBe('');
    });
  });

  describe('3. Tiered Scanned PDF Intelligence', () => {
    it('extracts normal text without triggering unnecessary visual OCR', async () => {
      const ocrSpy = vi.spyOn(visualIntel, 'performVisualOcr');
      const pdfBuf = await createPdf(['Halaman 1: Teks digital lengkap dan jelas untuk skripsi.']);

      const adapter = new PdfAdapter();
      const extracted = await adapter.extract({
        documentId: 'doc_pdf_digital_1',
        filename: 'skripsi_digital.pdf',
        mimeType: 'application/pdf',
        kind: 'pdf',
        buffer: pdfBuf,
        checksum: 'hashpdf1'
      });

      expect(extracted.blocks.length).toBeGreaterThan(0);
      expect(extracted.normalizedText).toContain('Teks digital lengkap');
      expect(extracted.metadata?.ocrApplied).toBe(false);
      // OCR should NOT be called when text extraction is already sufficient
      expect(ocrSpy).not.toHaveBeenCalled();
    });

    it('identifies scanned pages without digital text and triggers tiered OCR', async () => {
      vi.spyOn(visualIntel, 'performVisualOcr').mockResolvedValueOnce({
        text: 'Ekstraksi OCR: Dokumen Akreditasi Kampus Tahun 2026',
        isVisualExtraction: true,
        ocrConfidence: 0.92,
        modelUsed: 'gemini-3.8-flash'
      });

      // Page 1 is an empty/scanned page (no text)
      const scannedPdfBuf = await createPdf(['']);

      const adapter = new PdfAdapter();
      const extracted = await adapter.extract({
        documentId: 'doc_pdf_scanned_1',
        filename: 'scan_arsip.pdf',
        mimeType: 'application/pdf',
        kind: 'pdf',
        buffer: scannedPdfBuf,
        checksum: 'hashpdfscan'
      });

      expect(extracted.metadata?.ocrApplied).toBe(true);
      expect(extracted.normalizedText).toContain('Dokumen Akreditasi');
      expect(extracted.blocks[0].isVisualExtraction).toBe(true);
      expect(extracted.blocks[0].pageNumber).toBe(1);
    });

    it('merges digital text and scanned OCR pages accurately in mixed PDF', async () => {
      vi.spyOn(visualIntel, 'performVisualOcr').mockResolvedValueOnce({
        text: 'Lampiran Pindaian: Bukti Kwitansi Pembayaran UKT Semester Ganjil',
        isVisualExtraction: true,
        ocrConfidence: 0.90,
        modelUsed: 'gemini-3.8-flash'
      });

      // Page 1 has digital text, Page 2 is scanned (blank text)
      const mixedPdfBuf = await createPdf([
        'Halaman 1: Surat Keterangan Mahasiswa Aktif Departemen Teknik.',
        ''
      ]);

      const adapter = new PdfAdapter();
      const extracted = await adapter.extract({
        documentId: 'doc_pdf_mixed_1',
        filename: 'berkas_mahasiswa.pdf',
        mimeType: 'application/pdf',
        kind: 'pdf',
        buffer: mixedPdfBuf,
        checksum: 'hashpdfmixed'
      });

      expect(extracted.pageCount).toBe(2);
      expect(extracted.normalizedText).toContain('Surat Keterangan');
      expect(extracted.normalizedText).toContain('Bukti Kwitansi');
      expect(extracted.blocks.some(b => b.isVisualExtraction === true)).toBe(true);
      expect(extracted.blocks.some(b => !b.isVisualExtraction)).toBe(true);
    });

    it('rejects corrupted PDF files deterministically', async () => {
      const adapter = new PdfAdapter();
      await expect(adapter.extract({
        documentId: 'corrupt_pdf',
        filename: 'corrupted.pdf',
        mimeType: 'application/pdf',
        kind: 'pdf',
        buffer: Buffer.from('not a pdf at all'),
        checksum: 'corrupt'
      })).rejects.toThrow(DocumentProcessingException);
    });
  });
});
