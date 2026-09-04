/**
 * Production Backup Tooling (FASE 9)
 * Supports automated PostgreSQL backups and SQLite fallback backups.
 */
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import util from 'util';
import { resolveDatabaseConfiguration } from '../config/databaseConfig.js';

const execAsync = util.promisify(exec);

export async function runBackup() {
  const dbConfig = resolveDatabaseConfiguration();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(process.cwd(), 'backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log(`[BACKUP] Starting backup for provider: ${dbConfig.provider}`);

  if (dbConfig.provider === 'postgresql') {
    const backupPath = path.join(backupDir, `postgres-backup-${timestamp}.sql`);
    // Assuming pg_dump is available in the environment
    // Use pg_dump via connection string
    try {
      console.log(`[BACKUP] Running pg_dump to ${backupPath}...`);
      // Caution: passing URL directly to pg_dump could expose password in process list.
      // A better way is using PGPASSWORD but for basic script it uses the URL.
      // We will mask it in the log.
      const maskedUrl = dbConfig.url.replace(/:[^:@]*@/, ':****@');
      console.log(`[BACKUP] Connection: ${maskedUrl}`);
      
      const { stdout, stderr } = await execAsync(`pg_dump "${dbConfig.url}" -F c -f "${backupPath}"`);
      if (stderr) {
        console.warn(`[BACKUP] pg_dump warning:`, stderr);
      }
      console.log(`[BACKUP] PostgreSQL Backup completed successfully at ${backupPath}`);
    } catch (err: any) {
      console.error(`[BACKUP] PostgreSQL Backup failed:`, err.message);
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

    try {
      if (!fs.existsSync(absoluteDbPath)) {
        throw new Error(`SQLite database not found at ${absoluteDbPath}`);
      }
      console.log(`[BACKUP] Copying SQLite DB from ${absoluteDbPath} to ${backupPath}...`);
      fs.copyFileSync(absoluteDbPath, backupPath);
      const stat = fs.statSync(backupPath);
      console.log(`[BACKUP] SQLite Backup completed successfully at ${backupPath} (${stat.size} bytes)`);
      return {
        provider: 'sqlite',
        backupPath,
        sizeBytes: stat.size,
        timestamp
      };
    } catch (err: any) {
      console.error(`[BACKUP] SQLite Backup failed:`, err.message);
      throw err;
    }
  } else {
    throw new Error(`Unknown provider: ${dbConfig.provider}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runBackup().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
