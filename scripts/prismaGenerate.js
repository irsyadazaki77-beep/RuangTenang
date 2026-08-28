import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const isProd = process.env.NODE_ENV === 'production';
const rawProvider = (process.env.DB_PROVIDER || (isProd ? 'postgresql' : 'sqlite')).toLowerCase().trim();

const isPostgres = rawProvider === 'postgresql' || rawProvider === 'postgres';
const schemaPath = isPostgres
  ? 'prisma/schema.postgres.prisma'
  : 'prisma/schema.sqlite.prisma';

console.log(`[PRISMA GENERATE] Selected schema: ${schemaPath} (Provider: ${rawProvider}, NODE_ENV: ${process.env.NODE_ENV || 'development'})`);

try {
  execSync(`npx prisma generate --schema ${schemaPath}`, { stdio: 'inherit' });
} catch (err) {
  console.error('[PRISMA GENERATE] Failed to generate Prisma Client:', err);
  process.exit(1);
}

// Auto-initialize SQLite database and synchronize schema if absent in development/test
if (!isPostgres && !isProd) {
  const dbPath = path.resolve(process.cwd(), 'prisma', 'ruangtenang_sqlite.db');
  if (!fs.existsSync(dbPath)) {
    console.log('[PRISMA INIT] SQLite database not detected. Auto-creating database and synchronizing schema...');
    try {
      execSync('npx prisma db push --schema prisma/schema.sqlite.prisma --skip-generate', { stdio: 'inherit' });
      console.log('[PRISMA INIT] SQLite database schema synchronized successfully.');
    } catch (pushErr) {
      console.error('[PRISMA INIT] Warning: Failed to auto-initialize SQLite schema:', pushErr);
    }
  }
}

