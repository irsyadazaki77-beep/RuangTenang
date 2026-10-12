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
      const extractionWarnings: string[] = [];
      const hasImages = Object.keys(zip.files).some(name => /^ppt\/media\//i.test(name));
      const hasCharts = Object.keys(zip.files).some(name => /^ppt\/charts\/chart\d+\.xml$/i.test(name));
      const hasSpeakerNotes = Object.keys(zip.files).some(name => /^ppt\/notesSlides\/notesSlide\d+\.xml$/i.test(name));
      if (hasImages || hasCharts) {
        extractionWarnings.push('Teks slide diekstrak, tetapi gambar dan grafik tertanam belum dianalisis secara visual.');
      }
      if (hasSpeakerNotes) {
        extractionWarnings.push('File memiliki speaker notes; notes belum diekstrak.');
      }
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
        
        // Preserve text order by shape and use title placeholders when available.
        const shapeXml = Array.from(xmlContent.matchAll(/<p:sp\b[\s\S]*?<\/p:sp>/gi)).map(match => match[0]);
        const decodeXml = (text: string) => text
          .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"').replace(/&apos;/g, "'");
        const shapeText = shapeXml.map(shape => ({
          text: Array.from(shape.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/gi)).map(match => decodeXml(match[1])).join('').trim(),
          isTitle: /<p:ph\b[^>]*\btype=["'](?:title|ctrTitle)["']/i.test(shape)
        })).filter(shape => shape.text);
        const textSnippets = shapeText.length
          ? shapeText.map(shape => shape.text)
          : Array.from(xmlContent.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/gi)).map(match => decodeXml(match[1]).trim()).filter(Boolean);

        if (textSnippets.length === 0) continue;

        const slideText = textSnippets.join('\n');
        totalChars += slideText.length;
        if (totalChars > DEFAULT_FILE_LIMITS.maxExtractedChars) {
          throw new DocumentProcessingException(
            'EXTRACTION_LIMIT',
            `Ekstraksi slide melebihi batas ${DEFAULT_FILE_LIMITS.maxExtractedChars} karakter.`
          );
        }

        const title = shapeText.find(shape => shape.isTitle)?.text?.substring(0, 160);

        blocks.push({
          blockId: `${input.documentId}_s${entry.slideNum}`,
          text: slideText,
          slideNumber: entry.slideNum,
          ...(title ? { section: title } : {})
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
        normalizedText: blocks.map(b => `Slide ${b.slideNumber}\n---\n${b.text}`).join('\n\n'),
        ...(extractionWarnings.length ? { extractionWarnings } : {})
      };
    } catch (err: any) {
      if (err instanceof DocumentProcessingException) throw err;
      throw new DocumentProcessingException('PARSER_ERROR', `Gagal memproses berkas presentasi PPTX: ${err.message || 'Format tidak valid'}`);
    }
  }
}
