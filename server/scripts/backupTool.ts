import 'dotenv/config';
import '../config/loadFileSecrets.js';

/**
 * Database backup utility
 * Supports automated PostgreSQL backups and SQLite fallback backups.
 */
import { execFile } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';
import util from 'util';
import crypto from 'crypto';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { resolveDatabaseConfiguration } from '../config/databaseConfig.js';

const execFileAsync = util.promisify(execFile);
const BACKUP_MAGIC = Buffer.from('RTBK1');
const BACKUP_HEADER_BYTES = BACKUP_MAGIC.length + 12;
const BACKUP_TAG_BYTES = 16;

function getBackupEncryptionKey(): Buffer {
  let raw = process.env.BACKUP_ENCRYPTION_KEY;
  if (!raw && process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'staging') {
    raw = 'local-only-backup-encryption-key';
  }
  if (!raw) throw new Error('BACKUP_ENCRYPTION_KEY is required; backups are never written in plaintext.');

  let key: Buffer;
  const isProduction = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
  if (isProduction && !/^[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error('BACKUP_ENCRYPTION_KEY must be 64 hexadecimal characters in production.');
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) key = Buffer.from(raw, 'hex');
  else if (/^[A-Za-z0-9+/]+={0,2}$/.test(raw) && Buffer.from(raw, 'base64').length === 32) key = Buffer.from(raw, 'base64');
  else if (Buffer.byteLength(raw, 'utf8') === 32) key = Buffer.from(raw, 'utf8');
  else throw new Error('BACKUP_ENCRYPTION_KEY must encode exactly 32 bytes (64 hex characters or base64).');

  const otherKeys = [process.env.ENCRYPTION_KEY, process.env.BLIND_INDEX_SECRET, process.env.JWT_SECRET]
    .filter((value): value is string => Boolean(value));
  const keyRepresentations = new Set([raw, key.toString('hex'), key.toString('base64'), key.toString('base64url'), key.toString('utf8')]);
  const keyDigest = crypto.createHash('sha256').update(key).digest();
  if (otherKeys.some(value => keyRepresentations.has(value) || crypto.timingSafeEqual(crypto.createHash('sha256').update(value).digest(), keyDigest))) {
    throw new Error('BACKUP_ENCRYPTION_KEY must be independent from application encryption, blind-index, and JWT keys.');
  }
  return key;
}

export async function encryptBackupFile(plaintextPath: string, encryptedPath: string, key = getBackupEncryptionKey()): Promise<void> {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const fd = fs.openSync(encryptedPath, 'wx', 0o600);
  try {
    fs.writeSync(fd, Buffer.concat([BACKUP_MAGIC, iv]));
    const output = createWriteStream(encryptedPath, { fd, autoClose: false });
    await pipeline(createReadStream(plaintextPath), cipher, output);
    fs.writeSync(fd, cipher.getAuthTag());
    fs.fchmodSync(fd, 0o600);
  } catch (error) {
    try { fs.closeSync(fd); } catch {}
    fs.rmSync(encryptedPath, { force: true });
    throw error;
  }
  fs.closeSync(fd);
}

export async function decryptBackupFile(encryptedPath: string, plaintextPath: string, key = getBackupEncryptionKey()): Promise<void> {
  const inputFd = fs.openSync(encryptedPath, 'r');
  let outputFd: number | undefined;
  let outputCreated = false;
  try {
    const stat = fs.fstatSync(inputFd);
    if (stat.size < BACKUP_HEADER_BYTES + BACKUP_TAG_BYTES) throw new Error('Encrypted backup is truncated.');
    const header = Buffer.alloc(BACKUP_HEADER_BYTES);
    const tag = Buffer.alloc(BACKUP_TAG_BYTES);
    fs.readSync(inputFd, header, 0, header.length, 0);
    fs.readSync(inputFd, tag, 0, tag.length, stat.size - tag.length);
    if (!header.subarray(0, BACKUP_MAGIC.length).equals(BACKUP_MAGIC)) throw new Error('Encrypted backup format is unsupported.');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, header.subarray(BACKUP_MAGIC.length));
    decipher.setAuthTag(tag);
    outputFd = fs.openSync(plaintextPath, 'wx', 0o600);
    outputCreated = true;
    const input = createReadStream(encryptedPath, { start: BACKUP_HEADER_BYTES, end: stat.size - BACKUP_TAG_BYTES - 1 });
    const output = createWriteStream(plaintextPath, { fd: outputFd, autoClose: false });
    await pipeline(input, decipher, output);
    fs.fchmodSync(outputFd, 0o600);
  } catch (error) {
    if (outputFd !== undefined) {
      try { fs.closeSync(outputFd); } catch {}
    }
    if (outputCreated) fs.rmSync(plaintextPath, { force: true });
    throw error;
  } finally {
    fs.closeSync(inputFd);
  }
  if (outputFd !== undefined) fs.closeSync(outputFd);
}

export async function runBackup() {
  const dbConfig = resolveDatabaseConfiguration();
  const backupKey = getBackupEncryptionKey();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(process.cwd(), 'backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });
  }
  fs.chmodSync(backupDir, 0o700);

  console.log(`[BACKUP] Starting backup for provider: ${dbConfig.provider}`);

  if (dbConfig.provider === 'postgresql') {
    const backupPath = path.join(backupDir, `postgres-backup-${timestamp}.dump.enc`);
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ruangtenang-backup-'));
    fs.chmodSync(workDir, 0o700);
    const partialPath = path.join(workDir, 'postgres-backup.partial.dump');
    const encryptedPartialPath = `${backupPath}.partial.enc`;
    try {
      console.log('[BACKUP] Running PostgreSQL custom-format backup...');
      const databaseUrl = new URL(dbConfig.url);
      const databaseName = decodeURIComponent(databaseUrl.pathname.replace(/^\//, ''));
      if (!databaseUrl.hostname || !databaseName || !databaseUrl.username) {
        throw new Error('PostgreSQL DATABASE_URL must include host, database, and username.');
      }

      const pgEnv = { ...process.env };
      delete pgEnv.DATABASE_URL;
      if (databaseUrl.password) pgEnv.PGPASSWORD = decodeURIComponent(databaseUrl.password);
      else delete pgEnv.PGPASSWORD;
      const sslMode = databaseUrl.searchParams.get('sslmode');
      if (sslMode) pgEnv.PGSSLMODE = sslMode;
      else delete pgEnv.PGSSLMODE;
      const pgArgs = [
        '--format=custom',
        '--file', partialPath,
        '--host', databaseUrl.hostname,
        '--port', databaseUrl.port || '5432',
        '--username', decodeURIComponent(databaseUrl.username),
        '--dbname', databaseName,
        '--no-password'
      ];
      fs.closeSync(fs.openSync(partialPath, 'wx', 0o600));
      const { stderr } = await execFileAsync('pg_dump', pgArgs, { env: pgEnv, maxBuffer: 4 * 1024 * 1024 });
      if (stderr) {
        console.warn(`[BACKUP] pg_dump warning:`, stderr);
      }

      if (!fs.existsSync(partialPath)) {
        throw new Error('[BACKUP] PostgreSQL backup output file was not created.');
      }
      const stat = fs.statSync(partialPath);
      if (stat.size === 0) {
        throw new Error('[BACKUP] PostgreSQL backup file is empty.');
      }
      await execFileAsync('pg_restore', ['--list', partialPath], { env: pgEnv, maxBuffer: 64 * 1024 * 1024 });
      fs.chmodSync(partialPath, 0o600);
      await encryptBackupFile(partialPath, encryptedPartialPath, backupKey);
      fs.rmSync(partialPath, { force: true });
      fs.renameSync(encryptedPartialPath, backupPath);
      const encryptedSize = fs.statSync(backupPath).size;
      console.log(`[BACKUP] PostgreSQL archive validated and encrypted (${encryptedSize} bytes).`);
      return {
        provider: 'postgresql',
        backupPath,
        sizeBytes: encryptedSize,
        timestamp
      };
    } catch (err: any) {
      if (fs.existsSync(partialPath)) fs.rmSync(partialPath, { force: true });
      if (fs.existsSync(encryptedPartialPath)) fs.rmSync(encryptedPartialPath, { force: true });
      console.error(`[BACKUP] PostgreSQL backup failed:`, err.message);
      throw err;
    } finally {
      fs.rmSync(workDir, { recursive: true, force: true });
    }
  } else if (dbConfig.provider === 'sqlite') {
    // Audit SQLite path logic
    const rawPath = dbConfig.url.replace('file:', '').replace('sqlite:', '').trim();
    const absoluteDbPath = path.isAbsolute(rawPath)
      ? rawPath
      : (rawPath.startsWith('./prisma/') || rawPath.startsWith('prisma/'))
        ? path.resolve(process.cwd(), rawPath)
        : path.resolve(process.cwd(), 'prisma', rawPath);
    const backupPath = path.join(backupDir, `sqlite-backup-${timestamp}.db.enc`);
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ruangtenang-backup-'));
    fs.chmodSync(workDir, 0o700);
    const partialPath = path.join(workDir, 'sqlite-backup.partial.db');
    const encryptedPartialPath = `${backupPath}.partial.enc`;

    try {
      if (!fs.existsSync(absoluteDbPath)) {
        throw new Error(`SQLite database not found at ${absoluteDbPath}`);
      }
      console.log(`[BACKUP] Copying SQLite DB from ${absoluteDbPath} to ${backupPath}...`);
      fs.closeSync(fs.openSync(partialPath, 'wx', 0o600));
      fs.copyFileSync(absoluteDbPath, partialPath);
      const stat = fs.statSync(partialPath);
      if (stat.size === 0) throw new Error('SQLite backup file is empty.');
      fs.chmodSync(partialPath, 0o600);
      await encryptBackupFile(partialPath, encryptedPartialPath, backupKey);
      fs.rmSync(partialPath, { force: true });
      fs.renameSync(encryptedPartialPath, backupPath);
      const encryptedSize = fs.statSync(backupPath).size;
      console.log(`[BACKUP] Encrypted SQLite backup created at ${backupPath} (${encryptedSize} bytes)`);
      return {
        provider: 'sqlite',
        backupPath,
        sizeBytes: encryptedSize,
        timestamp
      };
    } catch (err: any) {
      if (fs.existsSync(partialPath)) fs.rmSync(partialPath, { force: true });
      if (fs.existsSync(encryptedPartialPath)) fs.rmSync(encryptedPartialPath, { force: true });
      console.error(`[BACKUP] SQLite Backup failed:`, err.message);
      throw err;
    } finally {
      fs.rmSync(workDir, { recursive: true, force: true });
    }
  } else {
    throw new Error(`Unknown provider: ${dbConfig.provider}`);
  }
}

const isDirectCliExecution =
  (typeof import.meta !== 'undefined' && import.meta.url === `file://${process.argv[1]}`) ||
  (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module);

if (isDirectCliExecution) {
  runBackup().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
