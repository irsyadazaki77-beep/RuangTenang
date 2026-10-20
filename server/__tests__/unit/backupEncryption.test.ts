import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { decryptBackupFile, encryptBackupFile } from '../../scripts/backupTool.js';

const testKey = crypto.randomBytes(32);
let tempDirectory = '';

afterEach(() => {
  if (tempDirectory) fs.rmSync(tempDirectory, { recursive: true, force: true });
  tempDirectory = '';
});

describe('Authenticated encrypted database backups', () => {
  it('round trips backup bytes and stores a versioned encrypted artifact', async () => {
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'ruangtenang-backup-'));
    const plaintext = path.join(tempDirectory, 'source.dump');
    const encrypted = path.join(tempDirectory, 'backup.dump.enc');
    const restored = path.join(tempDirectory, 'restored.dump');
    const payload = crypto.randomBytes(128 * 1024);
    fs.writeFileSync(plaintext, payload, { mode: 0o600 });

    await encryptBackupFile(plaintext, encrypted, testKey);
    expect(fs.readFileSync(encrypted).subarray(0, 5).toString()).toBe('RTBK1');
    if (process.platform !== 'win32') expect(fs.statSync(encrypted).mode & 0o777).toBe(0o600);
    await decryptBackupFile(encrypted, restored, testKey);
    expect(fs.readFileSync(restored).equals(payload)).toBe(true);
  });

  it('rejects modified ciphertext and removes any untrusted partial plaintext', async () => {
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'ruangtenang-backup-'));
    const plaintext = path.join(tempDirectory, 'source.db');
    const encrypted = path.join(tempDirectory, 'backup.db.enc');
    const restored = path.join(tempDirectory, 'restored.db');
    fs.writeFileSync(plaintext, 'sensitive database contents');
    await encryptBackupFile(plaintext, encrypted, testKey);

    const bytes = fs.readFileSync(encrypted);
    bytes[20] ^= 0x01;
    fs.writeFileSync(encrypted, bytes);
    await expect(decryptBackupFile(encrypted, restored, testKey)).rejects.toThrow();
    expect(fs.existsSync(restored)).toBe(false);
  });
});
