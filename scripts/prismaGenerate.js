import { execSync } from 'child_process';

const isProd = process.env.NODE_ENV === 'production';
const rawProvider = (process.env.DB_PROVIDER || (isProd ? 'postgresql' : 'sqlite')).toLowerCase().trim();

const schemaPath = (rawProvider === 'postgresql' || rawProvider === 'postgres')
  ? 'prisma/schema.postgres.prisma'
  : 'prisma/schema.sqlite.prisma';

console.log(`[PRISMA GENERATE] Selected schema: ${schemaPath} (Provider: ${rawProvider}, NODE_ENV: ${process.env.NODE_ENV || 'development'})`);

try {
  execSync(`npx prisma generate --schema ${schemaPath}`, { stdio: 'inherit' });
} catch (err) {
  console.error('[PRISMA GENERATE] Failed to generate Prisma Client:', err);
  process.exit(1);
}
