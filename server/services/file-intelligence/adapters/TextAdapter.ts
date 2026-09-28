import { SupportedFileKind, ExtractedDocument, DocumentBlock } from '../../../../shared/contracts/files.js';
import { DocumentExtractorAdapter, ExtractionInput } from './types.js';
import { DEFAULT_FILE_LIMITS, DocumentProcessingException } from '../fileTypes.js';

export class TextAdapter implements DocumentExtractorAdapter {
  supports(kind: SupportedFileKind): boolean {
    return ['text', 'markdown', 'csv', 'json', 'code'].includes(kind);
  }

  async extract(input: ExtractionInput): Promise<ExtractedDocument> {
    if (input.abortSignal?.aborted) {
      throw new DocumentProcessingException('PROCESSING_ABORTED', 'Proses ekstraksi dibatalkan.');
    }

    const rawText = input.buffer.toString('utf8');
    if (rawText.length > DEFAULT_FILE_LIMITS.maxExtractedChars) {
      throw new DocumentProcessingException(
        'EXTRACTION_LIMIT',
        `Jumlah karakter teks (${rawText.length}) melebihi batas ${DEFAULT_FILE_LIMITS.maxExtractedChars}.`
      );
    }

    const blocks: DocumentBlock[] = [];

    if (input.kind === 'json') {
      try {
        const parsed = JSON.parse(rawText);
        const formatted = JSON.stringify(parsed, null, 2);
        blocks.push({
          blockId: `${input.documentId}_b0`,
          text: formatted,
          section: 'JSON Root'
        });
      } catch {
        throw new DocumentProcessingException('PARSER_ERROR', 'Gagal memproses struktur berkas JSON.');
      }
    } else if (input.kind === 'csv') {
      const lines = rawText.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length > DEFAULT_FILE_LIMITS.maxCsvRows) {
        throw new DocumentProcessingException(
          'EXTRACTION_LIMIT',
          `Jumlah baris CSV (${lines.length}) melebihi batas maksimal ${DEFAULT_FILE_LIMITS.maxCsvRows} baris.`
        );
      }

      // Group CSV into batches of ~25 rows for coherent semantic blocks
      const header = lines[0] || '';
      const batchSize = 25;
      let blockIdx = 0;
      for (let i = 1; i < lines.length; i += batchSize) {
        const batchLines = lines.slice(i, i + batchSize);
        const textContent = [header, ...batchLines].join('\n');
        blocks.push({
          blockId: `${input.documentId}_b${blockIdx}`,
          text: textContent,
          section: `Baris ${i}-${Math.min(i + batchSize - 1, lines.length - 1)}`
        });
        blockIdx++;
      }
      if (blocks.length === 0) {
        blocks.push({
          blockId: `${input.documentId}_b0`,
          text: header,
          section: 'Header CSV'
        });
      }
    } else if (input.kind === 'markdown') {
      // Split markdown by headings (# , ## , ### )
      const sections = rawText.split(/(?=^#{1,3}\s+)/m);
      let blockIdx = 0;
      for (const section of sections) {
        const trimmed = section.trim();
        if (!trimmed) continue;
        const headingMatch = trimmed.match(/^#{1,3}\s+(.+)$/m);
        const heading = headingMatch ? headingMatch[1].trim() : undefined;
        blocks.push({
          blockId: `${input.documentId}_b${blockIdx}`,
          text: trimmed,
          section: heading
        });
        blockIdx++;
      }
      if (blocks.length === 0) {
        blocks.push({
          blockId: `${input.documentId}_b0`,
          text: rawText.trim()
        });
      }
    } else {
      // Text or Code
      const paragraphs = rawText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
      let blockIdx = 0;
      for (const p of paragraphs) {
        blocks.push({
          blockId: `${input.documentId}_b${blockIdx}`,
          text: p.trim()
        });
        blockIdx++;
      }
      if (blocks.length === 0) {
        blocks.push({
          blockId: `${input.documentId}_b0`,
          text: rawText.trim()
        });
      }
    }

    return {
      documentId: input.documentId,
      filename: input.filename,
      mimeType: input.mimeType,
      kind: input.kind,
      size: input.buffer.length,
      checksum: input.checksum,
      blocks,
      normalizedText: blocks.map(b => b.text).join('\n\n')
    };
  }
}
