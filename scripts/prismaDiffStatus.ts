export function assertNoPrismaSchemaDrift(status: number | null, output: string): void {
  const details = output.trim();
  if (status === 0) return;
  if (status === 2) {
    throw new Error(`Database schema drift detected${details ? `:\n${details}` : '.'}`);
  }
  throw new Error(`Prisma schema drift check failed with exit code ${status ?? 'unknown'}${details ? `:\n${details}` : '.'}`);
}
