import path from 'path';

export type DatabaseProvider = 'sqlite' | 'postgresql';

export interface DatabaseConfiguration {
  provider: DatabaseProvider;
  url: string;
  isProduction: boolean;
  poolSize: number;
  connectionTimeoutMs: number;
  statementTimeoutMs: number;
  sslEnabled: boolean;
}

export function resolveDatabaseConfiguration(): DatabaseConfiguration {
  const isProduction = process.env.NODE_ENV === 'production';
  const dbUrl = (process.env.DATABASE_URL || '').trim();
  const hasPostgresUrl = dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://');
  const explicitProvider = (process.env.DB_PROVIDER || '').toLowerCase().trim();

  const isTest = process.env.VITEST === 'true' || process.env.NODE_ENV === 'test';

  if (isProduction) {
    if (!hasPostgresUrl) {
      console.warn('[DATABASE CONFIG] PostgreSQL DATABASE_URL not detected. Falling back safely to SQLite database for resilience.');
    }
  }

  const isPostgres = hasPostgresUrl || (explicitProvider === 'postgresql' && hasPostgresUrl);
  const provider: DatabaseProvider = isPostgres ? 'postgresql' : 'sqlite';

  let defaultUrl: string;
  if (isPostgres) {
    defaultUrl = dbUrl;
  } else {
    if (dbUrl && dbUrl.startsWith('file:')) {
      const rawPath = dbUrl.replace('file:', '').trim();
      const resolvedPath = path.isAbsolute(rawPath)
        ? rawPath
        : (rawPath.startsWith('./prisma/') || rawPath.startsWith('prisma/'))
          ? path.resolve(process.cwd(), rawPath)
          : path.resolve(process.cwd(), 'prisma', rawPath.replace(/^\.\//, ''));
      defaultUrl = `file:${resolvedPath}`;
    } else {
      defaultUrl = `file:${path.resolve(process.cwd(), 'prisma', 'ruangtenang_sqlite.db')}`;
    }
  }

  return {
    provider,
    url: defaultUrl,
    isProduction,
    poolSize: parseInt(process.env.DB_POOL_SIZE || (isProduction ? '20' : '10'), 10),
    connectionTimeoutMs: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '5000', 10),
    statementTimeoutMs: parseInt(process.env.DB_STATEMENT_TIMEOUT_MS || '10000', 10),
    sslEnabled: isPostgres && process.env.DB_SSL !== 'false',
  };
}

export const dbConfig = resolveDatabaseConfiguration();
