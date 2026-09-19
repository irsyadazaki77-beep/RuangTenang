import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Establish schema.postgres.prisma as Single Source of Truth (SSOT)
const pgSchemaPath = path.resolve(process.cwd(), 'prisma', 'schema.postgres.prisma');
const sqliteSchemaPath = path.resolve(process.cwd(), 'prisma', 'schema.sqlite.prisma');

if (fs.existsSync(pgSchemaPath)) {
  const pgContent = fs.readFileSync(pgSchemaPath, 'utf8');
  const sqliteDatasource = `datasource db {\n  provider = "sqlite"\n  url      = "file:./ruangtenang_sqlite.db"\n}`;
  const synchronizedSqlite = pgContent.replace(/datasource db \{[\s\S]*?\}/, sqliteDatasource);
  
  fs.writeFileSync(sqliteSchemaPath, synchronizedSqlite, 'utf8');
  console.log('[PRISMA VALIDATE] Successfully synchronized schema.sqlite.prisma from PostgreSQL Single Source of Truth (schema.postgres.prisma).');
}

const dbUrl = (process.env.DATABASE_URL || '').trim();
const hasPostgresUrl = dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://');
const explicitProvider = (process.env.DB_PROVIDER || '').toLowerCase().trim();

// Use PostgreSQL ONLY if a valid postgres URL is present or explicitly configured with valid connection string
const isPostgres = hasPostgresUrl || (explicitProvider === 'postgresql' && hasPostgresUrl);
const rawProvider = isPostgres ? 'postgresql' : 'sqlite';
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

// Auto-initialize SQLite database and synchronize schema if absent
if (!isPostgres) {
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

