import { describe, expect, it } from 'vitest';
import { assertNoPrismaSchemaDrift } from '../../../scripts/prismaDiffStatus';

describe('Prisma schema diff exit status', () => {
  it('accepts Prisma’s non-empty no-difference message when exit code is zero', () => {
    expect(() => assertNoPrismaSchemaDrift(0, 'No difference detected.')).not.toThrow();
  });

  it('reports a real schema diff when Prisma exits with code two', () => {
    expect(() => assertNoPrismaSchemaDrift(2, 'ALTER TABLE "Users" ADD COLUMN "example" TEXT;'))
      .toThrow(/Database schema drift detected[\s\S]*ALTER TABLE/);
  });

  it('keeps Prisma execution errors distinct from schema drift', () => {
    expect(() => assertNoPrismaSchemaDrift(1, 'Could not connect to database.'))
      .toThrow(/drift check failed with exit code 1[\s\S]*Could not connect/);
  });
});
