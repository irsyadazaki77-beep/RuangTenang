import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const dbUrl = (process.env.DATABASE_URL || '').trim();
const hasPostgresUrl = dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://');
const explicitProvider = (process.env.DB_PROVIDER || '').toLowerCase().trim();

const isPostgres = hasPostgresUrl || (explicitProvider === 'postgresql' && hasPostgresUrl);
const rawProvider = isPostgres ? 'postgresql' : 'sqlite';
const schemaPath = isPostgres
  ? 'prisma/schema.postgres.prisma'
  : 'prisma/schema.sqlite.prisma';

console.log(`[PRISMA GENERATE] Selected schema: ${schemaPath} (Provider: ${rawProvider}, NODE_ENV: ${process.env.NODE_ENV || 'development'})`);

const clientPath = path.resolve(process.cwd(), 'node_modules', '.prisma', 'client', 'index.js');
const clientExists = fs.existsSync(clientPath);

if (clientExists && !isPostgres) {
  console.log('[PRISMA GENERATE] Prisma Client is already available. Skipping regeneration.');
  process.exit(0);
}

const isWin = process.platform === 'win32';
const prismaBin = path.resolve(process.cwd(), 'node_modules', '.bin', isWin ? 'prisma.cmd' : 'prisma');

if (fs.existsSync(prismaBin)) {
  try {
    execSync(`"${prismaBin}" generate --schema ${schemaPath}`, {
      stdio: 'inherit',
      timeout: 8000,
    });
  } catch (err) {
    console.warn('[PRISMA GENERATE] Notice: Prisma generate skipped or timed out; falling back to safe runtime store.', err?.message || err);
  }
} else {
  console.log('[PRISMA GENERATE] Local prisma binary not found; using safe runtime store.');
}

