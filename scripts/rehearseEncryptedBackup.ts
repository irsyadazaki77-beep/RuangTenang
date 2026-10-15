import 'dotenv/config';
import '../server/config/loadFileSecrets.js';
import crypto from 'crypto';
import { Client } from 'pg';
import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import util from 'util';
import { resolveDatabaseConfiguration } from '../server/config/databaseConfig.js';
import { decryptBackupFile, runBackup } from '../server/scripts/backupTool.js';

const execFileAsync = util.promisify(execFile);

async function rehearseEncryptedBackupRestore() {
  if (process.env.RESTORE_REHEARSAL_ALLOW_TARGET !== 'isolated') {
    throw new Error('Set RESTORE_REHEARSAL_ALLOW_TARGET=isolated only when running against a disposable/staging PostgreSQL server.');
  }
  const config = resolveDatabaseConfiguration();
  if (config.provider !== 'postgresql') throw new Error('Encrypted PostgreSQL restore rehearsal requires PostgreSQL.');

  const sourceUrl = new URL(config.url);
  sourceUrl.searchParams.delete('schema');
  const sourceUser = decodeURIComponent(sourceUrl.username);
  const targetDb = `ruangtenang_restore_${crypto.randomUUID().replace(/-/g, '')}`;
  const targetUrl = new URL(sourceUrl.toString());
  targetUrl.pathname = `/${targetDb}`;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ruangtenang-restore-rehearsal-'));
  fs.chmodSync(tempDir, 0o700);
  const plaintextPath = path.join(tempDir, 'restore.dump');
  let backupPath: string | undefined;
  let adminConnected = false;
  let operationError: unknown;
  let cleanupError: unknown;
  const admin = new Client({ connectionString: sourceUrl.toString() });

  try {
    const backup = await runBackup();
    backupPath = backup.backupPath;
    await decryptBackupFile(backup.backupPath, plaintextPath);
    await admin.connect();
    adminConnected = true;
    await admin.query(`CREATE DATABASE "${targetDb}"`);
    await admin.end();
    adminConnected = false;

    const pgEnv = { ...process.env };
    delete pgEnv.DATABASE_URL;
    if (sourceUrl.password) pgEnv.PGPASSWORD = decodeURIComponent(sourceUrl.password);
    else delete pgEnv.PGPASSWORD;
    const sslMode = sourceUrl.searchParams.get('sslmode');
    if (sslMode) pgEnv.PGSSLMODE = sslMode;
    const args = [
      '--no-owner', '--no-privileges',
      '--host', sourceUrl.hostname,
      '--port', sourceUrl.port || '5432',
      '--username', sourceUser,
      '--dbname', targetDb,
      '--no-password',
      plaintextPath,
    ];
    await execFileAsync('pg_restore', args, { env: pgEnv, maxBuffer: 8 * 1024 * 1024 });

    const restored = new Client({ connectionString: targetUrl.toString() });
    let restoredConnected = false;
    let usersTableFound = false;
    try {
      await restored.connect();
      restoredConnected = true;
      const result = await restored.query(`SELECT to_regclass('public."Users"') AS users_table`);
      usersTableFound = Boolean(result.rows[0]?.users_table);
    } finally {
      if (restoredConnected) await restored.end();
    }
    if (!usersTableFound) throw new Error('Restore completed but the expected Users table is missing.');
    console.log(`[BACKUP_REHEARSAL] Encrypted archive restored and verified in isolated database ${targetDb}.`);
  } catch (error) {
    operationError = error;
  } finally {
    if (adminConnected) {
      try { await admin.end(); } catch {}
    }
    const cleanup = new Client({ connectionString: sourceUrl.toString() });
    try {
      await cleanup.connect();
      await cleanup.query(`DROP DATABASE IF EXISTS "${targetDb}" WITH (FORCE)`);
    } catch (error) {
      console.error('[BACKUP_REHEARSAL] Could not remove isolated restore database.');
      cleanupError = error;
    } finally {
      await cleanup.end().catch(() => undefined);
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
    if (backupPath) fs.rmSync(backupPath, { force: true });
  }
  if (operationError) throw operationError;
  if (cleanupError) throw cleanupError;
}

rehearseEncryptedBackupRestore().catch(error => {
  console.error('[BACKUP_REHEARSAL] Failed:', error?.message || 'unknown error');
  process.exitCode = 1;
});
