import { SupportedFileKind, ExtractedDocument, DocumentBlock } from '../../../../shared/contracts/files.js';
import { DocumentExtractorAdapter, ExtractionInput } from './types.js';
import { DEFAULT_FILE_LIMITS, DocumentProcessingException } from '../fileTypes.js';
import { performVisualOcr } from '../visualIntelligenceService.js';

export class PdfAdapter implements DocumentExtractorAdapter {
  supports(kind: SupportedFileKind): boolean {
    return kind === 'pdf';
  }

  async extract(input: ExtractionInput): Promise<ExtractedDocument> {
    if (input.abortSignal?.aborted) {
      throw new DocumentProcessingException('PROCESSING_ABORTED', 'Proses ekstraksi dibatalkan.');
    }

    try {
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: input.buffer });

      let textResult: any;
      let totalPages = 0;
      try {
        const documentInfo = await parser.getInfo();
        totalPages = documentInfo.total || 0;
        if (totalPages > DEFAULT_FILE_LIMITS.maxPdfPages) {
          throw new DocumentProcessingException(
            'EXTRACTION_LIMIT',
            `Jumlah halaman PDF (${totalPages}) melebihi batas maksimal ${DEFAULT_FILE_LIMITS.maxPdfPages} halaman.`
          );
        }
        textResult = await parser.getText();
      } finally {
        await parser.destroy();
      }

      const pagesList: any[] = textResult?.pages || [];
      if (totalPages === 0 && pagesList.length > 0) {
        totalPages = pagesList.length;
      }

      // Check if text extraction yielded text or if pages are blank/scanned
      const blocks: DocumentBlock[] = [];
      let totalChars = 0;
      const extractionWarnings: string[] = [];
      const unextractedPageNums: number[] = [];

      for (let i = 0; i < pagesList.length; i++) {
        const pageItem = pagesList[i];
        const pageNum = Number.isInteger(pageItem.num) && pageItem.num > 0 ? pageItem.num : i + 1;
        const pageText = (pageItem.text || '').trim();

        if (!pageText || pageText.length < 15) {
          // Page has no text or inadequate extraction (likely scanned)
          unextractedPageNums.push(pageNum);
          continue;
        }

        totalChars += pageText.length;
        if (totalChars > DEFAULT_FILE_LIMITS.maxExtractedChars) {
          throw new DocumentProcessingException(
            'EXTRACTION_LIMIT',
            `Ekstraksi dokumen melebihi batas ${DEFAULT_FILE_LIMITS.maxExtractedChars} karakter.`
          );
        }

        // Split text into paragraphs
        const paragraphs = pageText.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0);
        if (paragraphs.length === 0) {
          blocks.push({
            blockId: `${input.documentId}_p${pageNum}_b0`,
            text: pageText,
            pageNumber: pageNum,
            section: `Halaman ${pageNum}`
          });
        } else {
          paragraphs.forEach((p: string, pIdx: number) => {
            blocks.push({
              blockId: `${input.documentId}_p${pageNum}_b${pIdx}`,
              text: p.trim(),
              pageNumber: pageNum,
              section: `Halaman ${pageNum}`
            });
          });
        }
      }

      // If textResult had fallback text and no pages were identified as scanned/empty
      if (blocks.length === 0 && unextractedPageNums.length === 0 && textResult?.text?.trim()) {
        const rawText = textResult.text.trim();
        blocks.push({
          blockId: `${input.documentId}_b0`,
          text: rawText
        });
      }

      // Step 2 & 3: TIERED OCR / VISION EXTRACTION for pages that require OCR
      // Limit OCR to at most 5 pages to control cost, timeout, and memory
      const MAX_OCR_PAGES = 5;
      let ocrApplied = false;
      const pagesToOcr = unextractedPageNums.slice(0, MAX_OCR_PAGES);

      if (pagesToOcr.length > 0) {
        try {
          const freshParser = new PDFParse({ data: input.buffer });
          let screenshots: any;
          try {
            screenshots = await freshParser.getScreenshot({
              partial: pagesToOcr,
              imageDataUrl: true
            });
          } finally {
            await freshParser.destroy();
          }

          if (screenshots?.pages && screenshots.pages.length > 0) {
            for (const shot of screenshots.pages) {
              if (input.abortSignal?.aborted) break;
              const pageNum = shot.pageNumber;
              const dataUrl = shot.dataUrl;
              if (!dataUrl || !dataUrl.includes(',')) continue;

              const base64Data = dataUrl.split(',')[1];
              const imageBuf = Buffer.from(base64Data, 'base64');

              const ocrRes = await performVisualOcr({
                buffer: imageBuf,
                mimeType: 'image/png',
                filename: `${input.filename}_hal_${pageNum}.png`,
                purpose: 'document_ocr',
                abortSignal: input.abortSignal
              });

              if (ocrRes && ocrRes.text.trim()) {
                ocrApplied = true;
                const ocrText = ocrRes.text.trim();
                const ocrParas = ocrText.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0);
                ocrParas.forEach((p: string, pIdx: number) => {
                  blocks.push({
                    blockId: `${input.documentId}_p${pageNum}_ocr_b${pIdx}`,
                    text: p.trim(),
                    pageNumber: pageNum,
                    section: `Halaman ${pageNum} (OCR)`,
                    isVisualExtraction: true,
                    ocrConfidence: ocrRes.ocrConfidence,
                    readingUncertainty: ocrRes.readingUncertainty
                  });
                });
              } else {
                extractionWarnings.push(`Halaman ${pageNum} berupa pindaian dan tidak berhasil dibaca oleh OCR.`);
              }
            }
          }
        } catch (ocrErr: any) {
          console.warn('[PDF_ADAPTER] Tiered OCR failed or unavailable:', ocrErr.message);
        }
      }

      // Step 6: Note pages that were not read
      const remainingUnreadPages = unextractedPageNums.length - (ocrApplied ? pagesToOcr.length : 0);
      if (remainingUnreadPages > 0) {
        extractionWarnings.push(`${remainingUnreadPages} halaman PDF berupa pindaian/gambar dan belum menghasilkan teks OCR.`);
      }

      if (blocks.length === 0) {
        return {
          documentId: input.documentId,
          filename: input.filename,
          mimeType: input.mimeType,
          kind: 'pdf',
          size: input.buffer.length,
          checksum: input.checksum,
          pageCount: totalPages || 1,
          blocks: [],
          normalizedText: '',
          extractionWarnings: extractionWarnings.length
            ? extractionWarnings
            : ['Dokumen PDF berupa hasil pindaian (scan). Teks belum tersedia dari parser standar; disiapkan untuk analisis visual multimodal.'],
          metadata: {
            ocrApplied: false,
            previewOnly: true,
            visualAnalysisAvailable: true,
            unextractedPageCount: unextractedPageNums.length || totalPages || 1
          }
        };
      }

      // Sort blocks by page number ascending
      blocks.sort((a, b) => (a.pageNumber || 0) - (b.pageNumber || 0));

      const pageGroups: Record<number, string[]> = {};
      blocks.forEach(b => {
        const pNum = b.pageNumber || 1;
        if (!pageGroups[pNum]) pageGroups[pNum] = [];
        pageGroups[pNum].push(b.text);
      });

      const pageBoundaryTexts: string[] = [];
      Object.keys(pageGroups).map(Number).sort((a, b) => a - b).forEach(pageNum => {
        pageBoundaryTexts.push(`Page ${pageNum}\n---\n${pageGroups[pageNum].join('\n\n')}`);
      });

      const normalizedText = pageBoundaryTexts.length > 0
        ? pageBoundaryTexts.join('\n\n')
        : blocks.map(b => b.text).join('\n\n');

      return {
        documentId: input.documentId,
        filename: input.filename,
        mimeType: input.mimeType,
        kind: 'pdf',
        size: input.buffer.length,
        checksum: input.checksum,
        pageCount: totalPages || 1,
        blocks,
        normalizedText,
        metadata: {
          ocrApplied,
          visualAnalysisAvailable: true,
          unextractedPageCount: unextractedPageNums.length
        },
        ...(extractionWarnings.length ? { extractionWarnings } : {})
      };
    } catch (err: any) {
      if (err instanceof DocumentProcessingException) throw err;
      throw new DocumentProcessingException('PARSER_ERROR', `Gagal memproses berkas PDF: ${err.message || 'Format tidak valid'}`);
    }
  }
}
