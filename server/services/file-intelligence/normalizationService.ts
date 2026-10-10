import { DocumentBlock, ExtractedDocument } from '../../../shared/contracts/files.js';

export interface NormalizedDocument {
  documentId: string;
  filename: string;
  kind: string;
  blocks: DocumentBlock[];
  normalizedFullText: string;
}

export const normalizationService = {
  /**
   * Normalizes document text while respecting semantic paragraphs and table structures.
   */
  normalizeDocument(doc: ExtractedDocument): NormalizedDocument {
    const normalizedBlocks: DocumentBlock[] = doc.blocks.map(block => {
      let text = block.text;

      // 1. Replace zero-width spaces and control chars except newlines and tabs
      text = text.replace(/[\u200B-\u200D\uFEFF]/g, '');
      // eslint-disable-next-line no-control-regex
      text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

      // 2. Normalize CRLF to LF
      text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

      // 3. Normalize horizontal whitespace per line without flattening intentional newlines
      const lines = text.split('\n').map(line => {
        // If line is a markdown table row, keep column spacing reasonably intact
        if (line.trim().startsWith('|')) {
          return line.trim();
        }
        return line.replace(/[^\S\r\n]+/g, ' ').trim();
      });

      // 4. Collapse 3+ successive newlines into double newlines (paragraphs)
      text = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();

      return {
        ...block,
        text
      };
    }).filter(b => b.text.length > 0);

    const fullText = normalizedBlocks.map(b => b.text).join('\n\n');

    return {
      documentId: doc.documentId,
      filename: doc.filename,
      kind: doc.kind,
      blocks: normalizedBlocks,
      normalizedFullText: fullText
    };
  }
};
