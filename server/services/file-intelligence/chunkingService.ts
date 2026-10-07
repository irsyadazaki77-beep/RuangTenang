import crypto from 'crypto';
import { DocumentChunk } from '../../../shared/contracts/files.js';
import { NormalizedDocument } from './normalizationService.js';
import { DEFAULT_FILE_LIMITS } from './fileTypes.js';

export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  // Conservative token estimator: 1 token ≈ 4 characters or ~0.75 words
  const charEstimate = Math.ceil(text.length / 4);
  const wordEstimate = Math.ceil(text.trim().split(/\s+/).length * 1.3);
  return Math.max(charEstimate, wordEstimate);
}

export function buildSourceRef(params: {
  filename: string;
  pageStart?: number;
  pageEnd?: number;
  slideNumber?: number;
  sheetName?: string;
  section?: string;
}): string {
  const { filename, pageStart, pageEnd, slideNumber, sheetName, section } = params;

  if (pageStart !== undefined) {
    const pageRange = (pageEnd && pageEnd !== pageStart) ? `${pageStart}-${pageEnd}` : `${pageStart}`;
    return `${filename} [Halaman ${pageRange}]`;
  }

  if (slideNumber !== undefined) {
    return `${filename} [Slide ${slideNumber}${section ? `: ${section}` : ''}]`;
  }

  if (sheetName) {
    return `${filename} [Sheet: "${sheetName}"]`;
  }

  if (section) {
    return `${filename} [Bagian: ${section}]`;
  }

  // Chunk ordering is an internal retrieval detail, not a source location.
  return filename;
}

export const chunkingService = {
  createChunks(doc: NormalizedDocument): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const maxChars = DEFAULT_FILE_LIMITS.maxChunkChars;
    const overlapChars = DEFAULT_FILE_LIMITS.chunkOverlapChars;

    let currentChunkText = '';
    let currentPages: number[] = [];
    let currentSlide: number | undefined;
    let currentSheet: string | undefined;
    let currentSection: string | undefined;
    let chunkIndex = 0;

    const finalizeChunk = () => {
      if (!currentChunkText.trim()) return;

      const pageStart = currentPages.length > 0 ? Math.min(...currentPages) : undefined;
      const pageEnd = currentPages.length > 0 ? Math.max(...currentPages) : undefined;
      const cleanText = currentChunkText.trim();
      const chunkId = `${doc.documentId}_c${chunkIndex}`;
      const checksum = crypto.createHash('sha256').update(cleanText).digest('hex');

      const sourceRef = buildSourceRef({
        filename: doc.filename,
        pageStart,
        pageEnd,
        slideNumber: currentSlide,
        sheetName: currentSheet,
        section: currentSection
      });

      chunks.push({
        id: chunkId,
        documentId: doc.documentId,
        index: chunkIndex,
        text: cleanText,
        tokenEstimate: estimateTokenCount(cleanText),
        pageStart,
        pageEnd,
        slideNumber: currentSlide,
        sheetName: currentSheet,
        section: currentSection,
        sourceRef,
        checksum
      });

      chunkIndex++;

      // Retain trailing characters for overlap
      if (cleanText.length > overlapChars) {
        currentChunkText = cleanText.substring(cleanText.length - overlapChars) + '\n\n';
      } else {
        currentChunkText = '';
      }
      currentPages = [];
    };

    for (const block of doc.blocks) {
      if (block.pageNumber !== undefined) currentPages.push(block.pageNumber);
      if (block.slideNumber !== undefined) currentSlide = block.slideNumber;
      if (block.sheetName !== undefined) currentSheet = block.sheetName;
      if (block.section) currentSection = block.section;

      const blockText = block.text.trim();
      if (!blockText) continue;

      if ((currentChunkText.length + blockText.length + 2) <= maxChars) {
        currentChunkText += (currentChunkText ? '\n\n' : '') + blockText;
      } else {
        // Current buffer is full, flush it
        if (currentChunkText.length > 0) {
          finalizeChunk();
        }

        // If the single block is larger than maxChars, split it by words/sentences
        if (blockText.length > maxChars) {
          const sentences = blockText.split(/(?<=[.?!])\s+/);
          for (const sent of sentences) {
            if ((currentChunkText.length + sent.length + 1) > maxChars && currentChunkText.length > 0) {
              finalizeChunk();
            }
            currentChunkText += (currentChunkText ? ' ' : '') + sent;
          }
        } else {
          currentChunkText = blockText;
        }
      }

      if (chunks.length >= DEFAULT_FILE_LIMITS.maxChunksPerDocument) {
        break;
      }
    }

    if (currentChunkText.trim()) {
      finalizeChunk();
    }

    return chunks;
  }
};
