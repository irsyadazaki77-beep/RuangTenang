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
  createChunks(doc: NormalizedDocument, onTruncated?: () => void): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const maxChars = DEFAULT_FILE_LIMITS.maxChunkChars;
    const overlapChars = DEFAULT_FILE_LIMITS.chunkOverlapChars;

    let currentChunkText = '';
    let currentPages: number[] = [];
    let currentSlide: number | undefined;
    let currentSheet: string | undefined;
    let currentSection: string | undefined;
    let currentIsVisual = false;
    let currentOcrConf: number | undefined;
    let currentUncertainty: string | undefined;
    let chunkIndex = 0;
    let hasUnchunkedContent = false;
    let isTruncated = false;
    const maxChunksPerDocument = DEFAULT_FILE_LIMITS.maxChunksPerDocument;

    const markTruncated = () => {
      if (isTruncated) return;
      isTruncated = true;
      onTruncated?.();
    };

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
        checksum,
        isVisualExtraction: currentIsVisual || undefined,
        ocrConfidence: currentOcrConf,
        readingUncertainty: currentUncertainty
      });

      chunkIndex++;

      // Retain trailing characters for overlap
      if (cleanText.length > overlapChars) {
        currentChunkText = cleanText.substring(cleanText.length - overlapChars) + '\n\n';
      } else {
        currentChunkText = '';
      }
      hasUnchunkedContent = false;
      currentPages = [];
      currentIsVisual = false;
      currentOcrConf = undefined;
      currentUncertainty = undefined;
    };

    for (let blockIndex = 0; blockIndex < doc.blocks.length; blockIndex += 1) {
      const block = doc.blocks[blockIndex];
      if (chunks.length >= maxChunksPerDocument) {
        if (hasUnchunkedContent || doc.blocks.slice(blockIndex).some(item => item.text.trim().length > 0)) markTruncated();
        break;
      }
      if (block.pageNumber !== undefined) currentPages.push(block.pageNumber);
      if (block.slideNumber !== undefined) currentSlide = block.slideNumber;
      if (block.sheetName !== undefined) currentSheet = block.sheetName;
      if (block.section) currentSection = block.section;
      if (block.isVisualExtraction) currentIsVisual = true;
      if (block.ocrConfidence) currentOcrConf = block.ocrConfidence;
      if (block.readingUncertainty) currentUncertainty = block.readingUncertainty;

      const blockText = block.text.trim();
      if (!blockText) continue;

      if ((currentChunkText.length + blockText.length + 2) <= maxChars) {
        currentChunkText += (currentChunkText ? '\n\n' : '') + blockText;
        hasUnchunkedContent = true;
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
              if (chunks.length >= maxChunksPerDocument) {
                markTruncated();
                break;
              }
            }
            currentChunkText += (currentChunkText ? ' ' : '') + sent;
            hasUnchunkedContent = true;
          }
        } else {
          currentChunkText = blockText;
          hasUnchunkedContent = true;
        }
      }

      if (chunks.length >= maxChunksPerDocument) {
        if (hasUnchunkedContent || doc.blocks.slice(blockIndex + 1).some(item => item.text.trim().length > 0)) markTruncated();
        break;
      }
    }

    if (currentChunkText.trim() && chunks.length < maxChunksPerDocument) {
      finalizeChunk();
    } else if (chunks.length >= maxChunksPerDocument && hasUnchunkedContent) {
      markTruncated();
    }

    return chunks;
  }
};
