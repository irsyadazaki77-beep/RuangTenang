/**
 * Standardized PHQ-9 (Patient Health Questionnaire) and GAD-7 (Generalized Anxiety Disorder) Scoring Engine
 */

export function calculatePhq9Severity(score: number): 'Minimal' | 'Ringan' | 'Sedang' | 'Berat' {
  if (score <= 4) return 'Minimal';
  if (score <= 9) return 'Ringan';
  if (score <= 14) return 'Sedang';
  return 'Berat';
}

export function calculateGad7Severity(score: number): 'Minimal' | 'Ringan' | 'Sedang' | 'Berat' {
  if (score <= 4) return 'Minimal';
  if (score <= 9) return 'Ringan';
  if (score <= 14) return 'Sedang';
  return 'Berat';
}

export function computeScreeningSummary(phqScore: number, gadScore: number) {
  const phqSeverity = calculatePhq9Severity(phqScore);
  const gadSeverity = calculateGad7Severity(gadScore);

  let recommendation = 'Kondisi kesehatan emosional dalam rentang wajar. Tetap jaga pola tidur dan manajemen waktu.';
  if (phqSeverity === 'Berat' || gadSeverity === 'Berat') {
    recommendation = 'Disarankan untuk berkonsultasi dengan konselor/psikolog kampus atau mengakses hotline krisis 24 jam.';
  } else if (phqSeverity === 'Sedang' || gadSeverity === 'Sedang') {
    recommendation = 'Disarankan menjadwalkan sesi konseling ringan atau mengikuti kelas manajemen kecemasan.';
  }

  return {
    phqScore,
    gadScore,
    phqSeverity,
    gadSeverity,
    recommendation
  };
}
