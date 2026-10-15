import { SupportedFileKind, ExtractedDocument, DocumentBlock } from '../../../../shared/contracts/files.js';
import { DocumentExtractorAdapter, ExtractionInput } from './types.js';
import { performVisualOcr } from '../visualIntelligenceService.js';

export class ImageAdapter implements DocumentExtractorAdapter {
  supports(kind: SupportedFileKind): boolean {
    return kind === 'image';
  }

  async extract(input: ExtractionInput): Promise<ExtractedDocument> {
    if (input.abortSignal?.aborted) {
      throw new Error('Proses ekstraksi dibatalkan.');
    }

    // Attempt real multimodal OCR & Visual Understanding if provider vision is configured
    try {
      const ocrResult = await performVisualOcr({
        buffer: input.buffer,
        mimeType: input.mimeType,
        filename: input.filename,
        purpose: 'diagram_analysis',
        abortSignal: input.abortSignal
      });

      if (ocrResult && ocrResult.text.trim()) {
        const text = ocrResult.text.trim();
        const paragraphs = text.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0);
        const blocks: DocumentBlock[] = (paragraphs.length ? paragraphs : [text]).map((p, idx) => ({
          blockId: `${input.documentId}_img_b${idx}`,
          text: p.trim(),
          isVisualExtraction: true,
          ocrConfidence: ocrResult.ocrConfidence,
          readingUncertainty: ocrResult.readingUncertainty,
          section: 'Ekstraksi Visual'
        }));

        return {
          documentId: input.documentId,
          filename: input.filename,
          mimeType: input.mimeType,
          kind: 'image',
          size: input.buffer.length,
          checksum: input.checksum,
          blocks,
          normalizedText: text,
          metadata: {
            previewOnly: false,
            visualAnalysisAvailable: true,
            ocrApplied: true,
            ocrConfidence: ocrResult.ocrConfidence,
            readingUncertainty: ocrResult.readingUncertainty,
            modelUsed: ocrResult.modelUsed
          }
        };
      }
    } catch (err: any) {
      console.warn('[IMAGE_ADAPTER] Multimodal vision OCR skipped or unavailable:', err.message);
    }

    // Honest fallback: Preserves image for multimodal UI preview without pretending fake text extraction
    return {
      documentId: input.documentId,
      filename: input.filename,
      mimeType: input.mimeType,
      kind: 'image',
      size: input.buffer.length,
      checksum: input.checksum,
      blocks: [],
      normalizedText: '',
      metadata: {
        previewOnly: true,
        visualAnalysisAvailable: true,
        extractionStatus: 'preview_only',
        note: 'Berkas gambar disiapkan untuk analisis multimodal langsung atau pratinjau visual.'
      }
    };
  }
}
