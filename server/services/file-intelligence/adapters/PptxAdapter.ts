import JSZip from 'jszip';
import { SupportedFileKind, ExtractedDocument, DocumentBlock } from '../../../../shared/contracts/files.js';
import { DocumentExtractorAdapter, ExtractionInput } from './types.js';
import { DEFAULT_FILE_LIMITS, DocumentProcessingException } from '../fileTypes.js';

export class PptxAdapter implements DocumentExtractorAdapter {
  supports(kind: SupportedFileKind): boolean {
    return kind === 'pptx';
  }

  async extract(input: ExtractionInput): Promise<ExtractedDocument> {
    if (input.abortSignal?.aborted) {
      throw new DocumentProcessingException('PROCESSING_ABORTED', 'Proses ekstraksi dibatalkan.');
    }

    try {
      const zip = await JSZip.loadAsync(input.buffer);
      const slideEntries: { name: string; slideNum: number; file: JSZip.JSZipObject }[] = [];

      for (const [filename, fileObj] of Object.entries(zip.files)) {
        const match = filename.match(/^ppt\/slides\/slide(\d+)\.xml$/i);
        if (match) {
          slideEntries.push({
            name: filename,
            slideNum: parseInt(match[1], 10),
            file: fileObj
          });
        }
      }

      slideEntries.sort((a, b) => a.slideNum - b.slideNum);

      if (slideEntries.length === 0) {
        throw new DocumentProcessingException('PARSER_ERROR', 'Tidak ditemukan slide yang dapat diekstrak dari presentasi PowerPoint.');
      }

      if (slideEntries.length > DEFAULT_FILE_LIMITS.maxPptxSlides) {
        throw new DocumentProcessingException(
          'EXTRACTION_LIMIT',
          `Jumlah slide presentasi (${slideEntries.length}) melebihi batas maksimal ${DEFAULT_FILE_LIMITS.maxPptxSlides} slide.`
        );
      }

      const blocks: DocumentBlock[] = [];
      let totalChars = 0;

      for (const entry of slideEntries) {
        if (input.abortSignal?.aborted) {
          throw new DocumentProcessingException('PROCESSING_ABORTED', 'Proses ekstraksi dibatalkan.');
        }

        const xmlContent = await entry.file.async('text');
        
        // Extract text inside <a:t>...</a:t> tags
        const textMatches = Array.from(xmlContent.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/gi));
        const textSnippets = textMatches.map(m => m[1].trim()).filter(Boolean);
        
        if (textSnippets.length === 0) continue;

        const slideText = textSnippets.join(' ');
        totalChars += slideText.length;
        if (totalChars > DEFAULT_FILE_LIMITS.maxExtractedChars) {
          throw new DocumentProcessingException(
            'EXTRACTION_LIMIT',
            `Ekstraksi slide melebihi batas ${DEFAULT_FILE_LIMITS.maxExtractedChars} karakter.`
          );
        }

        const title = textSnippets[0] ? textSnippets[0].substring(0, 80) : `Slide ${entry.slideNum}`;

        blocks.push({
          blockId: `${input.documentId}_s${entry.slideNum}`,
          text: slideText,
          slideNumber: entry.slideNum,
          section: title
        });
      }

      if (blocks.length === 0) {
        throw new DocumentProcessingException('PARSER_ERROR', 'Slide presentasi tidak memuat teks.');
      }

      return {
        documentId: input.documentId,
        filename: input.filename,
        mimeType: input.mimeType,
        kind: 'pptx',
        size: input.buffer.length,
        checksum: input.checksum,
        slideCount: slideEntries.length,
        blocks,
        normalizedText: blocks.map(b => `Slide ${b.slideNumber}\n---\n${b.text}`).join('\n\n')
      };
    } catch (err: any) {
      if (err instanceof DocumentProcessingException) throw err;
      throw new DocumentProcessingException('PARSER_ERROR', `Gagal memproses berkas presentasi PPTX: ${err.message || 'Format tidak valid'}`);
    }
  }
}
