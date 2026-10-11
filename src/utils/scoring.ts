/**
 * Compatibility wrapper around the shared clinical scoring engine (shared/clinical/scoring.ts).
 * It no longer contains its own thresholds.
 */
import { calculatePhq9Severity, calculateGad7Severity } from '../../shared/clinical/scoring';

export { calculatePhq9Severity, calculateGad7Severity };

export function computeScreeningSummary(phqScore: number, gadScore: number) {
  const phqSeverity = calculatePhq9Severity(phqScore);
  const gadSeverity = calculateGad7Severity(gadScore);

  let recommendation = 'Skor skrining berada di rentang rendah. Ini bukan diagnosis atau jaminan bahwa tidak ada masalah; cari bantuan profesional bila keluhan mengganggu atau Anda merasa khawatir.';
  if (phqSeverity === 'Berat' || phqSeverity === 'Sedang-Berat' || gadSeverity === 'Berat') {
    recommendation = 'Skor skrining menunjukkan gejala yang perlu segera dibicarakan dengan konselor atau tenaga kesehatan. Jika Anda berada dalam bahaya langsung, hubungi 119 atau pergi ke IGD; untuk dukungan psikologis awal, hubungi Healing119 melalui 119 ekstensi 8 atau healing119.id.';
  } else if (phqSeverity === 'Sedang' || gadSeverity === 'Sedang') {
    recommendation = 'Pertimbangkan membicarakan hasil skrining ini dengan konselor atau tenaga kesehatan, terutama bila gejala mengganggu aktivitas. Hasil ini bukan diagnosis.';
  }

  return { phqScore, gadScore, phqSeverity, gadSeverity, recommendation };
}
