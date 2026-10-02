import fs from 'fs';
import path from 'path';

export const ATTACHMENT_STORAGE_DIR = path.resolve(process.cwd(), 'uploads', 'attachments');

export class AttachmentStoragePathError extends Error {
  constructor() {
    super('ATTACHMENT_PATH_OUTSIDE_STORAGE');
    this.name = 'AttachmentStoragePathError';
  }
}

function isInsideAttachmentStorage(fullPath: string, storageRoot = ATTACHMENT_STORAGE_DIR): boolean {
  const relativePath = path.relative(storageRoot, fullPath);
  return relativePath !== '' &&
    relativePath !== '..' &&
    !relativePath.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativePath);
}

function isLegacyInlineData(value: string): boolean {
  if (/^data:[^,]*,/i.test(value)) return true;
  return value.length >= 8 &&
    /^[A-Za-z0-9+/_=-]+$/.test(value) &&
    value.length % 4 !== 1;
}

/** Resolve only file paths contained by the attachment store. Legacy inline payloads have no disk path. */
export function resolveStoredAttachmentFilePath(storedData: string): string | null {
  const value = typeof storedData === 'string' ? storedData.trim() : '';
  if (!value) throw new AttachmentStoragePathError();

  let fullPath: string;
  try {
    fullPath = path.resolve(path.isAbsolute(value) ? value : path.join(process.cwd(), value));
  } catch {
    throw new AttachmentStoragePathError();
  }

  if (isInsideAttachmentStorage(fullPath)) return fullPath;
  if (isLegacyInlineData(value)) return null;
  throw new AttachmentStoragePathError();
}

/** Validate the physical path too, so symlinks cannot escape the attachment store. */
export async function resolveExistingStoredAttachmentFilePath(storedData: string): Promise<string | null> {
  const fullPath = resolveStoredAttachmentFilePath(storedData);
  if (!fullPath) return null;

  try {
    const [storageRoot, realFilePath, fileInfo] = await Promise.all([
      fs.promises.realpath(ATTACHMENT_STORAGE_DIR),
      fs.promises.realpath(fullPath),
      fs.promises.lstat(fullPath)
    ]);
    if (fileInfo.isSymbolicLink() || !isInsideAttachmentStorage(realFilePath, storageRoot)) {
      throw new AttachmentStoragePathError();
    }
    return fullPath;
  } catch (error) {
    if (error instanceof AttachmentStoragePathError) throw error;
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') return fullPath;
    throw new Error('ATTACHMENT_FILE_ACCESS_FAILED');
  }
}

/** Remove a stored file without following an untrusted path outside the attachment directory. */
export async function deleteStoredAttachmentFile(storedData: string): Promise<boolean> {
  const fullPath = await resolveExistingStoredAttachmentFilePath(storedData);
  if (!fullPath) return false;

  try {
    await fs.promises.unlink(fullPath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') return false;
    throw new Error('ATTACHMENT_FILE_DELETE_FAILED');
  }
}
