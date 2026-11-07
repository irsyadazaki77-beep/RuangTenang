export interface QuizQuestion {
  id: string;
  question: string;
  options: string[]; // [A, B, C, D]
  correctIndex: number; // 0, 1, 2, 3
  explanation: string;
  topicTag?: string;
  referenceSnippet?: string;
}

export interface QuizSpec {
  format: 'ruangtenang-quiz-v1';
  id?: string;
  title: string;
  topic: string;
  difficulty: 'mudah' | 'sedang' | 'sulit';
  timeLimitMinutes: number;
  totalQuestions: number;
  questions: QuizQuestion[];
  sourceDocumentNames?: string[];
  createdAt?: string;
}

export interface QuizEvaluationSummary {
  totalQuestions: number;
  correctAnswersCount: number;
  incorrectAnswersCount: number;
  unansweredCount: number;
  scorePercentage: number;
  gradeLetter: 'A+' | 'A' | 'B' | 'C' | 'D' | 'E';
  timeSpentSeconds: number;
  masteredTopics: string[];
  weakTopics: string[];
  summaryFeedback: string;
}

/**
 * Validasi apakah teks content merupakan artefak kuis JSON format ruangtenang-quiz-v1
 */
export function isQuizContent(content: string): boolean {
  if (!content || typeof content !== 'string') return false;
  const trimmed = content.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return false;

  try {
    const parsed = JSON.parse(trimmed) as Partial<QuizSpec>;
    return (
      parsed.format === 'ruangtenang-quiz-v1' &&
      Array.isArray(parsed.questions) &&
      parsed.questions.length > 0 &&
      typeof parsed.questions[0].question === 'string' &&
      Array.isArray(parsed.questions[0].options)
    );
  } catch {
    return false;
  }
}

/**
 * Parsing teks JSON menjadi QuizSpec yang aman
 */
export function parseQuizSpec(content: string): QuizSpec | null {
  try {
    const parsed = JSON.parse(content.trim()) as QuizSpec;
    if (parsed.format === 'ruangtenang-quiz-v1' && Array.isArray(parsed.questions)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Kalkulasi skor dan diagnostik pemahaman materi
 */
export function evaluateQuizAttempt(
  quiz: QuizSpec,
  userAnswers: Record<string, number>,
  timeSpentSeconds: number
): QuizEvaluationSummary {
  const total = quiz.questions.length;
  let correct = 0;
  let unanswered = 0;

  const topicResults: Record<string, { correct: number; total: number }> = {};

  quiz.questions.forEach((q) => {
    const topic = q.topicTag || 'Umum';
    if (!topicResults[topic]) {
      topicResults[topic] = { correct: 0, total: 0 };
    }
    topicResults[topic].total += 1;

    const userSelected = userAnswers[q.id];
    if (userSelected === undefined || userSelected === null || userSelected < 0) {
      unanswered += 1;
    } else if (userSelected === q.correctIndex) {
      correct += 1;
      topicResults[topic].correct += 1;
    }
  });

  const incorrect = total - correct - unanswered;
  const scorePercentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  let gradeLetter: QuizEvaluationSummary['gradeLetter'] = 'E';
  if (scorePercentage >= 90) gradeLetter = 'A+';
  else if (scorePercentage >= 80) gradeLetter = 'A';
  else if (scorePercentage >= 70) gradeLetter = 'B';
  else if (scorePercentage >= 60) gradeLetter = 'C';
  else if (scorePercentage >= 50) gradeLetter = 'D';

  const masteredTopics: string[] = [];
  const weakTopics: string[] = [];

  Object.entries(topicResults).forEach(([topic, stats]) => {
    const ratio = stats.correct / stats.total;
    if (ratio >= 0.75) {
      masteredTopics.push(topic);
    } else {
      weakTopics.push(topic);
    }
  });

  let summaryFeedback: string;
  if (scorePercentage >= 85) {
    summaryFeedback = 'Performa sangat baik! Anda menguasai konsep inti dengan pemahaman mendalam.';
  } else if (scorePercentage >= 70) {
    summaryFeedback = 'Capaian baik! Anda memahami sebagian besar materi, namun perlu mengulas kembali bagian pengecoh.';
  } else if (scorePercentage >= 50) {
    summaryFeedback = 'Cukup. Terdapat beberapa konsep kunci yang perlu dibaca ulang sebelum ujian sesungguhnya.';
  } else {
    summaryFeedback = 'Perlu pendalaman lebih lanjut. Disarankan mempelajari kembali naskah rujukan pada topik-topik lemah.';
  }

  return {
    totalQuestions: total,
    correctAnswersCount: correct,
    incorrectAnswersCount: incorrect,
    unansweredCount: unanswered,
    scorePercentage,
    gradeLetter,
    timeSpentSeconds,
    masteredTopics,
    weakTopics,
    summaryFeedback
  };
}

/**
 * Konversi kuis & hasil evaluasi menjadi dokumen Markdown untuk Canvas
 */
export function quizToMarkdown(quiz: QuizSpec, evaluation?: QuizEvaluationSummary): string {
  let md = `# 📝 ${quiz.title}\n\n`;
  md += `**Topik:** ${quiz.topic} · **Tingkat Kesulitan:** ${quiz.difficulty.toUpperCase()} · **Batas Waktu:** ${quiz.timeLimitMinutes} menit\n\n`;

  if (quiz.sourceDocumentNames?.length) {
    md += `*Dokumen Acuan: ${quiz.sourceDocumentNames.join(', ')}*\n\n`;
  }

  if (evaluation) {
    md += `## 🏆 Ringkasan Hasil Ujian\n`;
    md += `- **Skor Akhir:** ${evaluation.scorePercentage}% (Nilai: ${evaluation.gradeLetter})\n`;
    md += `- **Jawaban Benar:** ${evaluation.correctAnswersCount} dari ${evaluation.totalQuestions} soal\n`;
    md += `- **Waktu Pengerjaan:** ${Math.floor(evaluation.timeSpentSeconds / 60)} menit ${evaluation.timeSpentSeconds % 60} detik\n`;
    md += `- **Catatan Evaluasi:** ${evaluation.summaryFeedback}\n\n`;

    if (evaluation.weakTopics.length > 0) {
      md += `### ⚠️ Topik yang Perlu Diulas Kembali:\n`;
      evaluation.weakTopics.forEach(t => {
        md += `- ${t}\n`;
      });
      md += `\n`;
    }
  }

  md += `## 📋 Lembar Soal & Pembahasan\n\n`;
  quiz.questions.forEach((q, idx) => {
    md += `### Soal ${idx + 1}. ${q.question}\n\n`;
    const optionLabels = ['A', 'B', 'C', 'D'];
    q.options.forEach((opt, optIdx) => {
      const isCorrect = optIdx === q.correctIndex;
      md += `- **${optionLabels[optIdx]}.** ${opt}${isCorrect ? ' *(Kunci Jawaban)*' : ''}\n`;
    });
    md += `\n> **💡 Pembahasan:** ${q.explanation}\n`;
    if (q.referenceSnippet) {
      md += `>\n> *Rujukan:* "${q.referenceSnippet}"\n`;
    }
    md += `\n---\n\n`;
  });

  return md;
}
