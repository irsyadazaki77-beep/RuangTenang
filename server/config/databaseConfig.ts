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
  const rawProvider = (process.env.DB_PROVIDER || (hasPostgresUrl ? 'postgresql' : 'sqlite')).toLowerCase().trim();
  const isPostgres = hasPostgresUrl || (rawProvider === 'postgresql' && hasPostgresUrl);

  const provider: DatabaseProvider = isPostgres ? 'postgresql' : 'sqlite';
  const defaultUrl = isPostgres
    ? dbUrl
    : (dbUrl && dbUrl.startsWith('file:') ? dbUrl : 'file:./prisma/ruangtenang_sqlite.db');

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
