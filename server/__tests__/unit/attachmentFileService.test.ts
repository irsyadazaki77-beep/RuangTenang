import path from 'path';
import { describe, expect, it } from 'vitest';
import {
  ATTACHMENT_STORAGE_DIR,
  resolveStoredAttachmentFilePath
} from '../../services/attachmentFileService.js';

describe('attachment storage path boundary', () => {
  it('resolves application-relative attachment paths inside the private store', () => {
    expect(resolveStoredAttachmentFilePath('uploads/attachments/file.bin'))
      .toBe(path.join(ATTACHMENT_STORAGE_DIR, 'file.bin'));
  });

  it('accepts absolute paths only when they remain inside the private store', () => {
    const storedPath = path.join(ATTACHMENT_STORAGE_DIR, 'file.bin');
    expect(resolveStoredAttachmentFilePath(storedPath)).toBe(storedPath);
    expect(() => resolveStoredAttachmentFilePath(path.resolve('outside-secret.txt'))).toThrow('ATTACHMENT_PATH_OUTSIDE_STORAGE');
  });

  it('rejects traversal paths that resolve outside the attachment store', () => {
    expect(() => resolveStoredAttachmentFilePath('uploads/attachments/../../.env'))
      .toThrow('ATTACHMENT_PATH_OUTSIDE_STORAGE');
  });

  it('recognizes legacy inline payloads without treating them as filesystem paths', () => {
    expect(resolveStoredAttachmentFilePath('aGVsbG8gd29ybGQ=')).toBeNull();
    expect(resolveStoredAttachmentFilePath('data:image/png;base64,iVBORw0KGgo=')).toBeNull();
  });
});
