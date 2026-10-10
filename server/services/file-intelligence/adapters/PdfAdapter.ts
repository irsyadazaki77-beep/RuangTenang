import { SupportedFileKind, ExtractedDocument, DocumentBlock } from '../../../../shared/contracts/files.js';
import { DocumentExtractorAdapter, ExtractionInput } from './types.js';
import { DEFAULT_FILE_LIMITS, DocumentProcessingException } from '../fileTypes.js';

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
      try {
        const documentInfo = await parser.getInfo();
        if (documentInfo.total > DEFAULT_FILE_LIMITS.maxPdfPages) {
          throw new DocumentProcessingException(
            'EXTRACTION_LIMIT',
            `Jumlah halaman PDF (${documentInfo.total}) melebihi batas maksimal ${DEFAULT_FILE_LIMITS.maxPdfPages} halaman.`
          );
        }
        textResult = await parser.getText();
      } finally {
        await parser.destroy();
      }



      if (!textResult || !textResult.pages || textResult.pages.length === 0) {
        // Fallback if pages array is empty but raw text exists
        const rawText = (textResult?.text || '').trim();
        if (!rawText) {
          throw new DocumentProcessingException('PARSER_ERROR', 'Dokumen PDF tidak memuat teks yang dapat diekstraksi (mungkin pindaian gambar murni).');
        }

        return {
          documentId: input.documentId,
          filename: input.filename,
          mimeType: input.mimeType,
          kind: 'pdf',
          size: input.buffer.length,
          checksum: input.checksum,
          pageCount: 1,
          blocks: [{
            blockId: `${input.documentId}_p1_b0`,
            text: rawText,
            pageNumber: 1
          }],
          normalizedText: rawText
        };
      }

      const totalPages = textResult.total || textResult.pages.length;
      if (totalPages > DEFAULT_FILE_LIMITS.maxPdfPages) {
        throw new DocumentProcessingException(
          'EXTRACTION_LIMIT',
          `Jumlah halaman PDF (${totalPages}) melebihi batas maksimal ${DEFAULT_FILE_LIMITS.maxPdfPages} halaman.`
        );
      }

      const blocks: DocumentBlock[] = [];
      let totalChars = 0;

      for (let i = 0; i < textResult.pages.length; i++) {
        if (input.abortSignal?.aborted) {
          throw new DocumentProcessingException('PROCESSING_ABORTED', 'Proses ekstraksi dibatalkan.');
        }

        const pageItem = textResult.pages[i];
        const pageNum = pageItem.num || (i + 1);
        const pageText = (pageItem.text || '').trim();
        if (!pageText) continue;

        totalChars += pageText.length;
        if (totalChars > DEFAULT_FILE_LIMITS.maxExtractedChars) {
          throw new DocumentProcessingException(
            'EXTRACTION_LIMIT',
            `Ekstraksi dokumen melebihi batas ${DEFAULT_FILE_LIMITS.maxExtractedChars} karakter.`
          );
        }

        // Split long page text into paragraphs
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

      if (blocks.length === 0) {
        throw new DocumentProcessingException('PARSER_ERROR', 'Tidak ditemukan teks terbaca pada dokumen PDF.');
      }

      const pageGroups: Record<number, string[]> = {};
      blocks.forEach(b => {
        if (b.pageNumber) {
          if (!pageGroups[b.pageNumber]) pageGroups[b.pageNumber] = [];
          pageGroups[b.pageNumber].push(b.text);
        }
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
        pageCount: totalPages,
        blocks,
        normalizedText
      };
    } catch (err: any) {
      if (err instanceof DocumentProcessingException) throw err;
      throw new DocumentProcessingException('PARSER_ERROR', `Gagal memproses berkas PDF: ${err.message || 'Format tidak valid'}`);
    }
  }
}
