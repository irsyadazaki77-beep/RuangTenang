import { apiClient } from '../lib/apiClient';
import { QuizSpec } from '../features/workspace/utils/quizModel';

export interface GenerateQuizClientPayload {
  contextText: string;
  topic?: string;
  difficulty?: 'mudah' | 'sedang' | 'sulit';
  totalQuestions?: number;
  sourceDocumentNames?: string[];
  modelId?: string;
}

export interface GenerateQuizClientResponse {
  success: boolean;
  data?: QuizSpec;
  message?: string;
}

/**
 * Panggil backend untuk membuat kuis simulasi ujian interaktif dari konten materi.
 */
export async function generateQuiz(payload: GenerateQuizClientPayload): Promise<QuizSpec> {
  const response = await apiClient.post<QuizSpec>('/api/ai/generate-quiz', payload);

  if (!response.success || !response.data) {
    throw new Error(response.error || response.message || 'Gagal menghasilkan kuis simulasi ujian');
  }

  return response.data;
}
