import { SupportedFileKind, ExtractedDocument, DocumentBlock } from '../../../../shared/contracts/files.js';
import { DocumentExtractorAdapter, ExtractionInput } from './types.js';
import { DEFAULT_FILE_LIMITS, DocumentProcessingException } from '../fileTypes.js';
import { isVisualOcrAvailable, performVisualOcr } from '../visualIntelligenceService.js';

function ensurePdfJsNodeGlobals(): void {
  const g = globalThis as Record<string, any>;

  if (typeof g.DOMMatrix === 'undefined') {
    class NodeDOMMatrix {
      a = 1;
      b = 0;
      c = 0;
      d = 1;
      e = 0;
      f = 0;
      m11 = 1;
      m12 = 0;
      m21 = 0;
      m22 = 1;
      m41 = 0;
      m42 = 0;
      is2D = true;
      isIdentity = true;

      constructor(init?: number[] | Float32Array | Float64Array | NodeDOMMatrix) {
        if (Array.isArray(init) || ArrayBuffer.isView(init)) {
          const arr = Array.from(init as ArrayLike<number>);
          if (arr.length >= 6) {
            this.#set2D(arr[0], arr[1], arr[2], arr[3], arr[4], arr[5]);
          }
        } else if (init && typeof init === 'object' && 'a' in init) {
          this.#set2D(init.a, init.b, init.c, init.d, init.e, init.f);
        }
      }

      #set2D(a: number, b: number, c: number, d: number, e: number, f: number): this {
        this.a = this.m11 = a;
        this.b = this.m12 = b;
        this.c = this.m21 = c;
        this.d = this.m22 = d;
        this.e = this.m41 = e;
        this.f = this.m42 = f;
        this.isIdentity = a === 1 && b === 0 && c === 0 && d === 1 && e === 0 && f === 0;
        return this;
      }

      multiplySelf(other?: Partial<NodeDOMMatrix>): this {
        if (!other) return this;
        const oa = other.a ?? 1;
        const ob = other.b ?? 0;
        const oc = other.c ?? 0;
        const od = other.d ?? 1;
        const oe = other.e ?? 0;
        const of = other.f ?? 0;
        return this.#set2D(
          this.a * oa + this.c * ob,
          this.b * oa + this.d * ob,
          this.a * oc + this.c * od,
          this.b * oc + this.d * od,
          this.a * oe + this.c * of + this.e,
          this.b * oe + this.d * of + this.f
        );
      }

      preMultiplySelf(other?: Partial<NodeDOMMatrix>): this {
        if (!other) return this;
        const oa = other.a ?? 1;
        const ob = other.b ?? 0;
        const oc = other.c ?? 0;
        const od = other.d ?? 1;
        const oe = other.e ?? 0;
        const of = other.f ?? 0;
        return this.#set2D(
          oa * this.a + oc * this.b,
          ob * this.a + od * this.b,
          oa * this.c + oc * this.d,
          ob * this.c + od * this.d,
          oa * this.e + oc * this.f + oe,
          ob * this.e + od * this.f + of
        );
      }

      multiply(other?: Partial<NodeDOMMatrix>): NodeDOMMatrix {
        return new NodeDOMMatrix(this).multiplySelf(other);
      }

      translateSelf(tx = 0, ty = 0): this {
        return this.multiplySelf({ a: 1, b: 0, c: 0, d: 1, e: tx, f: ty });
      }

      translate(tx = 0, ty = 0): NodeDOMMatrix {
        return new NodeDOMMatrix(this).translateSelf(tx, ty);
      }

      scaleSelf(scaleX = 1, scaleY = scaleX): this {
        return this.multiplySelf({ a: scaleX, b: 0, c: 0, d: scaleY, e: 0, f: 0 });
      }

      scale(scaleX = 1, scaleY = scaleX): NodeDOMMatrix {
        return new NodeDOMMatrix(this).scaleSelf(scaleX, scaleY);
      }

      invertSelf(): this {
        const det = this.a * this.d - this.b * this.c;
        if (!det || !Number.isFinite(det)) {
          return this.#set2D(NaN, NaN, NaN, NaN, NaN, NaN);
        }
        return this.#set2D(
          this.d / det,
          -this.b / det,
          -this.c / det,
          this.a / det,
          (this.c * this.f - this.d * this.e) / det,
          (this.b * this.e - this.a * this.f) / det
        );
      }

      inverse(): NodeDOMMatrix {
        return new NodeDOMMatrix(this).invertSelf();
      }

      transformPoint(point?: { x?: number; y?: number }) {
        const x = point?.x ?? 0;
        const y = point?.y ?? 0;
        return {
          x: x * this.a + y * this.c + this.e,
          y: x * this.b + y * this.d + this.f,
          z: 0,
          w: 1
        };
      }
    }

    g.DOMMatrix = NodeDOMMatrix;
  }

  if (typeof g.ImageData === 'undefined') {
    class NodeImageData {
      data: Uint8ClampedArray;
      width: number;
      height: number;

      constructor(dataOrWidth: Uint8ClampedArray | number, widthOrHeight: number, height?: number) {
        if (typeof dataOrWidth === 'number') {
          this.width = dataOrWidth;
          this.height = widthOrHeight;
          this.data = new Uint8ClampedArray(this.width * this.height * 4);
        } else {
          this.data = dataOrWidth;
          this.width = widthOrHeight;
          this.height = height ?? Math.floor(this.data.length / (4 * Math.max(1, this.width)));
        }
      }
    }

    g.ImageData = NodeImageData;
  }

  if (typeof g.Path2D === 'undefined') {
    class NodePath2D {
      addPath() {}
      closePath() {}
      moveTo() {}
      lineTo() {}
      bezierCurveTo() {}
      quadraticCurveTo() {}
      arc() {}
      arcTo() {}
      ellipse() {}
      rect() {}
    }

    g.Path2D = NodePath2D;
  }
}

export class PdfAdapter implements DocumentExtractorAdapter {
  supports(kind: SupportedFileKind): boolean {
    return kind === 'pdf';
  }

  async extract(input: ExtractionInput): Promise<ExtractedDocument> {
    const throwIfAborted = () => {
      if (input.abortSignal?.aborted) {
        throw new DocumentProcessingException('PROCESSING_ABORTED', 'Proses ekstraksi dibatalkan.');
      }
    };
    throwIfAborted();

    try {
      ensurePdfJsNodeGlobals();
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: input.buffer });

      let textResult: any;
      let totalPages = 0;
      try {
        const documentInfo = await parser.getInfo();
        throwIfAborted();
        totalPages = documentInfo.total || 0;
        if (totalPages > DEFAULT_FILE_LIMITS.maxPdfPages) {
          throw new DocumentProcessingException(
            'EXTRACTION_LIMIT',
            `Jumlah halaman PDF (${totalPages}) melebihi batas maksimal ${DEFAULT_FILE_LIMITS.maxPdfPages} halaman.`
          );
        }
        textResult = await parser.getText();
        throwIfAborted();
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
      const ocrSucceededPages = new Set<number>();

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
          throwIfAborted();

          if (screenshots?.pages && screenshots.pages.length > 0) {
            // OCR two pages at a time to reduce scan latency without flooding a vision provider.
            for (let index = 0; index < screenshots.pages.length; index += 2) {
              throwIfAborted();
              const batch = screenshots.pages.slice(index, index + 2);
              const results = await Promise.all(batch.map(async (shot: any) => {
                const pageNum = Number.isInteger(shot.pageNumber) ? shot.pageNumber : undefined;
                const dataUrl = shot.dataUrl;
                if (!pageNum || !dataUrl || !dataUrl.includes(',')) return { pageNum, result: null };
                const imageBuf = Buffer.from(dataUrl.split(',')[1], 'base64');
                try {
                  const result = await performVisualOcr({
                    buffer: imageBuf,
                    mimeType: 'image/png',
                    filename: `${input.filename}_hal_${pageNum}.png`,
                    purpose: 'document_ocr',
                    abortSignal: input.abortSignal
                  });
                  return { pageNum, result };
                } catch (error) {
                  if (input.abortSignal?.aborted) throw error;
                  // A provider failure on one page should not discard a successful sibling page.
                  return { pageNum, result: null };
                }
              }));

              throwIfAborted();

              // Apply results in page order so chunk ordering stays deterministic.
              for (const { pageNum, result } of results) {
                if (!pageNum || !result?.text.trim()) continue;
                ocrSucceededPages.add(pageNum);
                ocrApplied = true;
                const ocrText = result.text.trim();
                const ocrParas = ocrText.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0);
                ocrParas.forEach((p: string, pIdx: number) => {
                  blocks.push({
                    blockId: `${input.documentId}_p${pageNum}_ocr_b${pIdx}`,
                    text: p.trim(),
                    pageNumber: pageNum,
                    section: `Halaman ${pageNum} (OCR)`,
                    isVisualExtraction: true,
                    ocrConfidence: result.ocrConfidence,
                    readingUncertainty: result.readingUncertainty
                  });
                });
              }
            }
          }
        } catch (ocrErr: any) {
          if (input.abortSignal?.aborted) {
            throw new DocumentProcessingException('PROCESSING_ABORTED', 'Proses ekstraksi dibatalkan.');
          }
          // Fallback: if canvas screenshot rendering is unavailable (e.g. native binding missing)
          // and the PDF is scanned, send the PDF directly to the multimodal OCR service.
          if (blocks.length === 0 && isVisualOcrAvailable()) {
            try {
              const directPdfOcr = await performVisualOcr({
                buffer: input.buffer,
                mimeType: 'application/pdf',
                filename: input.filename,
                purpose: 'document_ocr',
                abortSignal: input.abortSignal
              });
              throwIfAborted();
              if (directPdfOcr?.text?.trim()) {
                ocrApplied = true;
                for (const pageNum of pagesToOcr) {
                  ocrSucceededPages.add(pageNum);
                }
                const ocrParas = directPdfOcr.text.trim().split(/\n\s*\n/).filter((p: string) => p.trim().length > 0);
                ocrParas.forEach((p: string, pIdx: number) => {
                  blocks.push({
                    blockId: `${input.documentId}_p1_ocr_b${pIdx}`,
                    text: p.trim(),
                    pageNumber: 1,
                    section: 'Halaman 1 (OCR)',
                    isVisualExtraction: true,
                    ocrConfidence: directPdfOcr.ocrConfidence,
                    readingUncertainty: directPdfOcr.readingUncertainty
                  });
                });
              }
            } catch (directErr: any) {
              if (input.abortSignal?.aborted) {
                throw new DocumentProcessingException('PROCESSING_ABORTED', 'Proses ekstraksi dibatalkan.');
              }
              console.warn('[PDF_ADAPTER] Direct PDF OCR fallback failed:', directErr.message);
            }
          } else {
            console.warn('[PDF_ADAPTER] Tiered OCR failed or unavailable:', ocrErr.message);
          }
        }
      }

      // Report the pages that actually remained unread; attempted OCR pages may still fail.
      const unreadAfterOcr = unextractedPageNums.filter(pageNum => !ocrSucceededPages.has(pageNum));
      for (const pageNum of unreadAfterOcr.filter(pageNum => pagesToOcr.includes(pageNum))) {
        extractionWarnings.push(`Halaman ${pageNum} berupa pindaian dan belum berhasil dibaca oleh OCR.`);
      }
      const notAttemptedCount = unextractedPageNums.length - pagesToOcr.length;
      if (notAttemptedCount > 0) {
        extractionWarnings.push(`OCR dibatasi hingga ${MAX_OCR_PAGES} halaman; ${notAttemptedCount} halaman pindaian lainnya belum dibaca.`);
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
            visualAnalysisAvailable: isVisualOcrAvailable(),
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
          visualAnalysisAvailable: isVisualOcrAvailable(),
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
