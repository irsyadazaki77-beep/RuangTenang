import { apiClient } from '../../../lib/apiClient';
import {
  DefenseExamType,
  DefenseQuestion,
  DefenseExaminer,
  DefenseAnswerEvaluation,
  generateMockQuestions,
  evaluateDefenseAnswer
} from '../utils/mockDefenseModel';

export interface GenerateDefenseQuestionsApiOptions {
  thesisTitle: string;
  examType: DefenseExamType;
  contextText?: string;
  rigorLevel?: 'standar' | 'killer';
  modelId?: string;
}

export interface EvaluateDefenseAnswerApiOptions {
  question: DefenseQuestion;
  studentAnswer: string;
  examiner: DefenseExaminer;
  thesisTitle: string;
  examType: DefenseExamType;
  rigorLevel?: 'standar' | 'killer';
  modelId?: string;
}

export const defenseApiService = {
  /**
   * Generates dynamic questions tailored to the student's thesis topic via AI.
   * Gracefully falls back to local heuristic if offline or on network failure.
   */
  async generateQuestions(options: GenerateDefenseQuestionsApiOptions): Promise<{ questions: DefenseQuestion[]; isAi: boolean }> {
    try {
      const response = await apiClient.post<DefenseQuestion[]>('/api/v1/ai/defense/generate-questions', {
        thesisTitle: options.thesisTitle,
        examType: options.examType,
        contextText: options.contextText,
        rigorLevel: options.rigorLevel || 'standar',
        modelId: options.modelId
      });

      if (response && response.success && Array.isArray(response.data) && response.data.length > 0) {
        return {
          questions: response.data,
          isAi: true
        };
      }
    } catch {
      // Fallback silently
    }

    // Offline / fallback heuristic
    return {
      questions: generateMockQuestions(options.thesisTitle, options.examType, options.contextText),
      isAi: false
    };
  },

  /**
   * Evaluates student's oral/written argument with AI First-Principles reasoning.
   * Gracefully falls back to local heuristic if offline or on network failure.
   */
  async evaluateAnswer(options: EvaluateDefenseAnswerApiOptions): Promise<DefenseAnswerEvaluation> {
    try {
      const response = await apiClient.post<DefenseAnswerEvaluation>('/api/v1/ai/defense/evaluate', {
        question: options.question,
        studentAnswer: options.studentAnswer,
        examiner: options.examiner,
        thesisTitle: options.thesisTitle,
        examType: options.examType,
        rigorLevel: options.rigorLevel || 'standar',
        modelId: options.modelId
      });

      if (response && response.success && response.data && typeof response.data.score === 'number') {
        return {
          ...response.data,
          isAiEvaluated: true
        };
      }
    } catch {
      // Fallback silently
    }

    // Offline / fallback heuristic
    const localEval = evaluateDefenseAnswer(options.question, options.studentAnswer);
    return {
      ...localEval,
      isAiEvaluated: false
    };
  }
};
