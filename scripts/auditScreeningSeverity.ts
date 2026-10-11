/**
 * READ-ONLY audit of historical screening severity labels.
 *
 * Counts rows whose stored severity differs from the unified shared engine and rows with
 * out-of-range scores. Prints only aggregate counts - never user IDs, scores per user or
 * answers. It performs NO writes. A backfill must be a separate, reviewed, approved step.
 *
 * Usage: npm run audit:screening-severity
 */
import { PrismaClient } from '@prisma/client';
import { calculatePhq9Severity, calculateGad7Severity } from '../shared/clinical/scoring';

async function main() {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.screenings.findMany({
      select: { phq9Score: true, gad7Score: true, phq9Severity: true, gad7Severity: true, riskIndicators: true },
    });
    const phqTransitions: Record<string, number> = {};
    let invalid = 0;
    let gadDiffers = 0;
    let phqDiffers = 0;
    let missingItem9Context = 0;
    for (const r of rows) {
      try {
        const phq = calculatePhq9Severity(r.phq9Score);
        const gad = calculateGad7Severity(r.gad7Score);
        if (r.phq9Severity !== phq) {
          phqDiffers++;
          const key = `${r.phq9Severity} -> ${phq}`;
          phqTransitions[key] = (phqTransitions[key] ?? 0) + 1;
        }
        if (r.gad7Severity !== gad) gadDiffers++;
      } catch {
        invalid++;
      }
      if (!r.riskIndicators) missingItem9Context++;
    }
    console.log(JSON.stringify({
      totalRows: rows.length,
      invalidScoreRows: invalid,
      phq9LabelDiffersFromUnifiedEngine: phqDiffers,
      gad7LabelDiffersFromUnifiedEngine: gadDiffers,
      phq9Transitions: phqTransitions,
      rowsWithoutVersionedIndicators: missingItem9Context,
      note: 'Read-only. Original scores are untouched; API responses re-derive severity and keep the stored label as legacyStored*Severity.',
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error('Audit failed:', e instanceof Error ? e.message : e); process.exit(1); });
