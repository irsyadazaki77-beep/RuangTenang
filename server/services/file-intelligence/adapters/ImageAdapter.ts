import { SupportedFileKind, ExtractedDocument } from '../../../../shared/contracts/files.js';
import { DocumentExtractorAdapter, ExtractionInput } from './types.js';

export class ImageAdapter implements DocumentExtractorAdapter {
  supports(kind: SupportedFileKind): boolean {
    return kind === 'image';
  }

  async extract(input: ExtractionInput): Promise<ExtractedDocument> {
    // Honest: Image extraction / OCR is not executed on server without an OCR engine.
    // Preserves image for multimodal UI preview without pretending fake text extraction.
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
        extractionStatus: 'preview_only',
        note: 'Berkas gambar disiapkan untuk pratinjau visual.'
      }
    };
  }
}
