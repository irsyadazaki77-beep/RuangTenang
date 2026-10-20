import { describe, expect, it } from 'vitest';
import { DEFAULT_FILE_LIMITS } from '../../services/file-intelligence/fileTypes.js';
import { chunkingService } from '../../services/file-intelligence/chunkingService.js';
import type { NormalizedDocument } from '../../services/file-intelligence/normalizationService.js';

describe('file chunking limits', () => {
  it('never exceeds the per-document chunk limit when a single block is long', () => {
    const sentence = 'Evidence supports reproducible analysis and study methods.';
    const text = Array.from({ length: 8_000 }, () => sentence).join(' ');
    expect(text.length).toBeLessThanOrEqual(500_000);
    const document: NormalizedDocument = {
      documentId: 'large-document',
      filename: 'large.txt',
      kind: 'text',
      blocks: [{ blockId: 'large-block', text }],
      normalizedFullText: text
    };

    let wasTruncated = false;
    const chunks = chunkingService.createChunks(document, () => { wasTruncated = true; });

    expect(chunks).toHaveLength(DEFAULT_FILE_LIMITS.maxChunksPerDocument);
    expect(chunks.map(chunk => chunk.index)).toEqual(Array.from({ length: chunks.length }, (_, index) => index));
    expect(wasTruncated).toBe(true);
  });
});
