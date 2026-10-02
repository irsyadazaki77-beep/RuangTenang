import { describe, expect, it } from 'vitest';
import { encryptionService } from '../../services/encryptionService.js';

describe('DocumentChunk encrypted storage compatibility', () => {
  it('round-trips encrypted content and continues to read legacy plaintext rows', () => {
    const previous = process.env.DATA_ENCRYPTION_KEY;
    process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 'c').toString('base64');
    try {
      const content = 'Sensitive extracted document text';
      const row = {
        content: encryptionService.encryptRequiredSensitive(content),
        isEncrypted: true,
        encryptionVersion: encryptionService.getCurrentKeyVersion()
      };
      expect(row.content).not.toContain(content);
      expect(encryptionService.decryptSensitive(row.content)).toBe(content);

      const legacyRow = { content, isEncrypted: false };
      const readable = legacyRow.isEncrypted ? encryptionService.decryptSensitive(legacyRow.content) : legacyRow.content;
      expect(readable).toBe(content);
    } finally {
      if (previous === undefined) delete process.env.DATA_ENCRYPTION_KEY;
      else process.env.DATA_ENCRYPTION_KEY = previous;
    }
  });
});
