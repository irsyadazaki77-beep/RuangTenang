import { SupportedFileKind, ExtractedDocument, DocumentBlock } from '../../../../shared/contracts/files.js';
import { DocumentExtractorAdapter, ExtractionInput } from './types.js';
import { DEFAULT_FILE_LIMITS, DocumentProcessingException } from '../fileTypes.js';

export class DocxAdapter implements DocumentExtractorAdapter {
  supports(kind: SupportedFileKind): boolean {
    return kind === 'docx';
  }

  async extract(input: ExtractionInput): Promise<ExtractedDocument> {
    if (input.abortSignal?.aborted) {
      throw new DocumentProcessingException('PROCESSING_ABORTED', 'Proses ekstraksi dibatalkan.');
    }

    try {
      const mammoth = await import('mammoth');
      const mammothAny: any = mammoth.default || mammoth;
      const result = await mammothAny.convertToMarkdown({ buffer: input.buffer });
      const markdown = (result?.value || '').trim();

      if (!markdown) {
        throw new DocumentProcessingException('PARSER_ERROR', 'Dokumen Word kosong atau tidak memuat teks.');
      }

      if (markdown.length > DEFAULT_FILE_LIMITS.maxExtractedChars) {
        throw new DocumentProcessingException(
          'EXTRACTION_LIMIT',
          `Jumlah karakter dokumen DOCX (${markdown.length}) melebihi batas ${DEFAULT_FILE_LIMITS.maxExtractedChars}.`
        );
      }

      // Split markdown by headings (# , ## , etc.) to preserve sections
      const sections = markdown.split(/(?=^#{1,3}\s+)/m);
      const blocks: DocumentBlock[] = [];
      let blockIdx = 0;

      for (const sec of sections) {
        if (input.abortSignal?.aborted) {
          throw new DocumentProcessingException('PROCESSING_ABORTED', 'Proses ekstraksi dibatalkan.');
        }

        const trimmed = sec.trim();
        if (!trimmed) continue;

        const headingMatch = trimmed.match(/^#{1,3}\s+(.+)$/m);
        const heading = headingMatch ? headingMatch[1].trim() : undefined;

        // Split section into manageable paragraphs while preserving markdown tables intact
        // A markdown table starts with | and consists of multiple rows, which should not be broken
        const parts = trimmed.split(/(?<=\n)\s*\n(?=(?:[^\n]*\|[^\n]*\n\|[-:\s|]+\|)|(?:[^\n]*\n\n))/g);

        for (const p of parts) {
          const partText = p.trim();
          if (!partText) continue;
          blocks.push({
            blockId: `${input.documentId}_b${blockIdx}`,
            text: partText,
            section: heading
          });
          blockIdx++;
        }
      }

      if (blocks.length === 0) {
        blocks.push({
          blockId: `${input.documentId}_b0`,
          text: markdown
        });
      }

      return {
        documentId: input.documentId,
        filename: input.filename,
        mimeType: input.mimeType,
        kind: 'docx',
        size: input.buffer.length,
        checksum: input.checksum,
        blocks,
        normalizedText: blocks.map(b => b.text).join('\n\n')
      };
    } catch (err: any) {
      if (err instanceof DocumentProcessingException) throw err;
      throw new DocumentProcessingException('PARSER_ERROR', `Gagal mengekstrak berkas DOCX: ${err.message || 'Format tidak valid'}`);
    }
  }
}
