/**
 * Gentle, non-clinical grounding lines shown on the RuangTenang empty state.
 * One line is picked per calendar day so the message feels stable, not random.
 */
export const DAILY_GROUNDING_LINES: readonly string[] = [
  'Tidak apa-apa melangkah pelan. Pelan tetap berarti maju.',
  'Perasaanmu valid, bahkan yang belum bisa kamu beri nama.',
  'Satu tarikan napas panjang sudah termasuk merawat diri.',
  'Kamu tidak harus menyelesaikan semuanya hari ini.',
  'Istirahat bukan kemalasan; itu bagian dari bertahan.',
  'Hal kecil yang kamu lakukan hari ini tetap layak dihargai.',
  'Boleh meminta bantuan. Itu tanda keberanian, bukan kelemahan.',
];

export function getDailyGroundingLine(date: Date = new Date(), lines: readonly string[] = DAILY_GROUNDING_LINES): string {
  if (lines.length === 0) return '';
  const dayNumber = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  return lines[((dayNumber % lines.length) + lines.length) % lines.length];
}
