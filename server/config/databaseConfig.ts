export type DatabaseProvider = 'sqlite';
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
  return {
    provider: 'sqlite',
    url: 'file:./prisma/ruangtenang_sqlite.db',
    isProduction: process.env.NODE_ENV === 'production',
    poolSize: parseInt(process.env.DB_POOL_SIZE || '20', 10),
    connectionTimeoutMs: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '5000', 10),
    statementTimeoutMs: parseInt(process.env.DB_STATEMENT_TIMEOUT_MS || '10000', 10),
    sslEnabled: false,
  };
}
export const dbConfig = resolveDatabaseConfiguration();
