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
  const rawProvider = (process.env.DB_PROVIDER || (isProduction ? 'postgresql' : 'sqlite')).toLowerCase().trim();

  if (isProduction) {
    if (rawProvider === 'sqlite') {
      throw new Error(
        'FATAL DATABASE CONFIG ERROR: SQLite cannot be used in production environment. Set DB_PROVIDER=postgresql and provide a valid PostgreSQL DATABASE_URL.'
      );
    }
    if (rawProvider !== 'postgresql') {
      throw new Error(`FATAL DATABASE CONFIG ERROR: Unsupported production database provider: "${rawProvider}". Must be "postgresql".`);
    }

    const dbUrl = process.env.DATABASE_URL?.trim();
    if (!dbUrl || (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://'))) {
      throw new Error(
        'FATAL DATABASE CONFIG ERROR: Production PostgreSQL DATABASE_URL is missing or invalid. Must start with postgresql:// or postgres://'
      );
    }

    const sslEnabled = process.env.DB_SSL !== 'false';

    return {
      provider: 'postgresql',
      url: dbUrl,
      isProduction: true,
      poolSize: parseInt(process.env.DB_POOL_SIZE || '20', 10),
      connectionTimeoutMs: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '5000', 10),
      statementTimeoutMs: parseInt(process.env.DB_STATEMENT_TIMEOUT_MS || '10000', 10),
      sslEnabled,
    };
  }

  // Development / Test resolution
  const provider: DatabaseProvider = rawProvider === 'postgresql' ? 'postgresql' : 'sqlite';
  const defaultUrl = provider === 'postgresql'
    ? (process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ruangtenang')
    : (process.env.DATABASE_URL || 'file:./prisma/ruangtenang_sqlite.db');

  return {
    provider,
    url: defaultUrl,
    isProduction: false,
    poolSize: parseInt(process.env.DB_POOL_SIZE || '10', 10),
    connectionTimeoutMs: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '5000', 10),
    statementTimeoutMs: parseInt(process.env.DB_STATEMENT_TIMEOUT_MS || '10000', 10),
    sslEnabled: process.env.DB_SSL === 'true',
  };
}

export const dbConfig = resolveDatabaseConfiguration();
