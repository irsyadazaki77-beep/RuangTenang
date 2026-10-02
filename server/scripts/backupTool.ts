/**
 * Database backup utility
 * Supports automated PostgreSQL backups and SQLite fallback backups.
 */
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import util from 'util';
import { resolveDatabaseConfiguration } from '../config/databaseConfig.js';

const execFileAsync = util.promisify(execFile);

export async function runBackup() {
  const dbConfig = resolveDatabaseConfiguration();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(process.cwd(), 'backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });
  }
  fs.chmodSync(backupDir, 0o700);

  console.log(`[BACKUP] Starting backup for provider: ${dbConfig.provider}`);

  if (dbConfig.provider === 'postgresql') {
    const backupPath = path.join(backupDir, `postgres-backup-${timestamp}.dump`);
    const partialPath = `${backupPath}.partial`;
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
      fs.renameSync(partialPath, backupPath);
      console.log(`[BACKUP] PostgreSQL backup created and archive-checked (${stat.size} bytes).`);
      return {
        provider: 'postgresql',
        backupPath,
        sizeBytes: stat.size,
        timestamp
      };
    } catch (err: any) {
      if (fs.existsSync(partialPath)) fs.rmSync(partialPath, { force: true });
      console.error(`[BACKUP] PostgreSQL backup failed:`, err.message);
      throw err;
    }
  } else if (dbConfig.provider === 'sqlite') {
    // Audit SQLite path logic
    const rawPath = dbConfig.url.replace('file:', '').replace('sqlite:', '').trim();
    const absoluteDbPath = path.isAbsolute(rawPath)
      ? rawPath
      : (rawPath.startsWith('./prisma/') || rawPath.startsWith('prisma/'))
        ? path.resolve(process.cwd(), rawPath)
        : path.resolve(process.cwd(), 'prisma', rawPath);
    const backupPath = path.join(backupDir, `sqlite-backup-${timestamp}.db`);
    const partialPath = `${backupPath}.partial`;

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
      fs.renameSync(partialPath, backupPath);
      console.log(`[BACKUP] SQLite Backup completed successfully at ${backupPath} (${stat.size} bytes)`);
      return {
        provider: 'sqlite',
        backupPath,
        sizeBytes: stat.size,
        timestamp
      };
    } catch (err: any) {
      if (fs.existsSync(partialPath)) fs.rmSync(partialPath, { force: true });
      console.error(`[BACKUP] SQLite Backup failed:`, err.message);
      throw err;
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
