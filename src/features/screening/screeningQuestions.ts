import { PHQ9_QUESTIONS, GAD7_QUESTIONS } from './constants';

// Combine all 16 questions into a unified sequence for the Card Swiper
export const ALL_QUESTIONS = [
  ...PHQ9_QUESTIONS.map((q, idx) => ({
    id: idx,
    section: 'phq9' as const,
    sectionTitle: 'Bagian 1/2: PHQ-9 (Depresi)',
    sectionBadge: 'Evaluasi Mood & Depresi',
    questionIndexInSection: idx,
    numberDisplay: idx + 1,
    totalInSection: 9,
    questionText: q,
  })),
  ...GAD7_QUESTIONS.map((q, idx) => ({
    id: idx + 9,
    section: 'gad7' as const,
    sectionTitle: 'Bagian 2/2: GAD-7 (Kecemasan)',
    sectionBadge: 'Evaluasi Kecemasan',
    questionIndexInSection: idx,
    numberDisplay: idx + 1,
    totalInSection: 7,
    questionText: q,
  }))
];

export const TOTAL_QUESTIONS = ALL_QUESTIONS.length;
