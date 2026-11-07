import { describe, it, expect } from 'vitest';
import {
  isQuizContent,
  parseQuizSpec,
  evaluateQuizAttempt,
  quizToMarkdown,
  QuizSpec
} from '../../features/workspace/utils/quizModel';

describe('Quiz Model Utilities', () => {
  const sampleQuiz: QuizSpec = {
    format: 'ruangtenang-quiz-v1',
    id: 'quiz_123',
    title: 'Simulasi Ujian Biologi Sel',
    topic: 'Biologi Sel',
    difficulty: 'sedang',
    timeLimitMinutes: 10,
    totalQuestions: 2,
    questions: [
      {
        id: 'q1',
        question: 'Organel sel yang berfungsi sebagai penghasil energi utama (ATP) adalah?',
        options: ['Mitokondria', 'Ribosom', 'Lisosom', 'Badan Golgi'],
        correctIndex: 0,
        explanation: 'Mitokondria adalah pusat respirasi seluler dan pembangkit energi ATP.',
        topicTag: 'Organel'
      },
      {
        id: 'q2',
        question: 'Dinding sel tumbuhan tersusun terutama oleh senyawa?',
        options: ['Kitin', 'Selulosa', 'Peptidoglikan', 'Glikogen'],
        correctIndex: 1,
        explanation: 'Selulosa adalah komponen utama penyusun dinding sel pada tumbuhan.',
        topicTag: 'Dinding Sel'
      }
    ]
  };

  it('detects valid quiz content correctly', () => {
    const raw = JSON.stringify(sampleQuiz);
    expect(isQuizContent(raw)).toBe(true);
    expect(isQuizContent('Bukan kuis')).toBe(false);
    expect(isQuizContent('{"format": "other"}')).toBe(false);
  });

  it('parses valid quiz spec', () => {
    const raw = JSON.stringify(sampleQuiz);
    const parsed = parseQuizSpec(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.title).toBe('Simulasi Ujian Biologi Sel');
    expect(parsed?.questions.length).toBe(2);
  });

  it('evaluates quiz attempt with accurate score and diagnostics', () => {
    // q1 correct (0), q2 incorrect (0 instead of 1)
    const userAnswers = { q1: 0, q2: 0 };
    const result = evaluateQuizAttempt(sampleQuiz, userAnswers, 120);

    expect(result.totalQuestions).toBe(2);
    expect(result.correctAnswersCount).toBe(1);
    expect(result.incorrectAnswersCount).toBe(1);
    expect(result.scorePercentage).toBe(50);
    expect(result.gradeLetter).toBe('D');
    expect(result.masteredTopics).toContain('Organel');
    expect(result.weakTopics).toContain('Dinding Sel');
  });

  it('converts quiz to readable markdown for Canvas', () => {
    const md = quizToMarkdown(sampleQuiz);
    expect(md).toContain('# 📝 Simulasi Ujian Biologi Sel');
    expect(md).toContain('Mitokondria');
    expect(md).toContain('Selulosa');
    expect(md).toContain('💡 Pembahasan:');
  });
});
