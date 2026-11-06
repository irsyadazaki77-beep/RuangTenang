/**
 * Password Strength Evaluator & OWASP Baseline Checker
 * Provides real-time entropy estimation, criteria checks, and common weak password detection.
 */

export interface PasswordCriterion {
  id: string;
  label: string;
  met: boolean;
}

export interface PasswordEvaluation {
  score: number; // 0 to 4
  label: 'Sangat Lemah' | 'Lemah' | 'Cukup' | 'Kuat' | 'Sangat Kuat';
  color: string;
  criteria: PasswordCriterion[];
  isCommonWeak: boolean;
  isValid: boolean;
}

const COMMON_WEAK_PASSWORDS = new Set([
  'password123',
  'password1234',
  'password12345',
  'admin12345',
  'qwerty12345',
  '1234567890',
  'indonesia123',
  'kampus12345',
  'mahasiswa123',
  'rahasia12345',
  'rahasia123',
  'bismillah123',
  'semangat123'
]);

export function evaluatePasswordStrength(password: string): PasswordEvaluation {
  const trimmed = password || '';
  const isCommonWeak = COMMON_WEAK_PASSWORDS.has(trimmed.toLowerCase());

  const criteria: PasswordCriterion[] = [
    {
      id: 'length',
      label: 'Minimal 10 karakter',
      met: trimmed.length >= 10
    },
    {
      id: 'uppercase',
      label: 'Memuat huruf kapital (A-Z)',
      met: /[A-Z]/.test(trimmed)
    },
    {
      id: 'lowercase',
      label: 'Memuat huruf kecil (a-z)',
      met: /[a-z]/.test(trimmed)
    },
    {
      id: 'number',
      label: 'Memuat angka (0-9)',
      met: /[0-9]/.test(trimmed)
    },
    {
      id: 'symbol',
      label: 'Memuat karakter khusus / simbol (!@#$%^&*)',
      met: /[^A-Za-z0-9]/.test(trimmed)
    }
  ];

  const metCount = criteria.filter(c => c.met).length;

  let score = 0;
  if (trimmed.length > 0) {
    if (isCommonWeak) {
      score = 0;
    } else if (metCount <= 2 || trimmed.length < 8) {
      score = 1;
    } else if (metCount === 3 || metCount === 4) {
      score = 2;
    } else if (metCount === 5 && trimmed.length < 14) {
      score = 3;
    } else if (metCount === 5 && trimmed.length >= 14) {
      score = 4;
    }
  }

  const scoreLabels: Record<number, { label: PasswordEvaluation['label']; color: string }> = {
    0: { label: 'Sangat Lemah', color: 'bg-rose-500 text-rose-600 dark:text-rose-400' },
    1: { label: 'Lemah', color: 'bg-orange-500 text-orange-600 dark:text-orange-400' },
    2: { label: 'Cukup', color: 'bg-amber-500 text-amber-600 dark:text-amber-400' },
    3: { label: 'Kuat', color: 'bg-teal-600 text-teal-600 dark:text-teal-400' },
    4: { label: 'Sangat Kuat', color: 'bg-emerald-600 text-emerald-600 dark:text-emerald-400' }
  };

  const current = scoreLabels[score];
  const isValid = metCount === 5 && !isCommonWeak;

  return {
    score,
    label: current.label,
    color: current.color,
    criteria,
    isCommonWeak,
    isValid
  };
}
