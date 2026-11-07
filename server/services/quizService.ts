import { aiRequestService } from './ai/aiRequestService.js';
import { DEFAULT_AI_MODEL } from '../config/aiConfig.js';
import { logger } from '../utils/logger.js';

export interface QuizQuestionRaw {
  id?: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topicTag?: string;
  referenceSnippet?: string;
}

export interface QuizSpecRaw {
  format: 'ruangtenang-quiz-v1';
  id?: string;
  title: string;
  topic: string;
  difficulty: 'mudah' | 'sedang' | 'sulit';
  timeLimitMinutes: number;
  totalQuestions: number;
  questions: QuizQuestionRaw[];
  sourceDocumentNames?: string[];
  createdAt?: string;
}

export interface GenerateQuizPayload {
  contextText: string;
  topic?: string;
  difficulty?: 'mudah' | 'sedang' | 'sulit';
  totalQuestions?: number;
  sourceDocumentNames?: string[];
  modelId?: string;
  userId?: string;
  userTier?: string;
}

export function extractJsonFromAiOutput(output: string): string {
  let cleaned = output.trim();
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    cleaned = codeBlockMatch[1].trim();
  }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned;
}

export const quizService = {
  async generateQuiz(payload: GenerateQuizPayload): Promise<QuizSpecRaw> {
    const {
      contextText,
      topic = 'Materi Akademik Terlampir',
      difficulty = 'sedang',
      totalQuestions = 5,
      sourceDocumentNames = [],
      modelId = DEFAULT_AI_MODEL,
      userId,
      userTier = 'Free'
    } = payload;

    const count = Math.min(Math.max(Number(totalQuestions) || 5, 3), 15);
    const difficultyLevel = ['mudah', 'sedang', 'sulit'].includes(difficulty) ? difficulty : 'sedang';

    const systemInstruction = `Kamu adalah Asisten Penguji & Dosen Pembuat Soal Ujian Akademik di RuangKerja.
Tugasmu adalah membuat kuis/ujian pilihan ganda berkualitas tinggi berdasarkan materi/dokumen yang diberikan.

ATURAN PEMBUATAN SOAL:
1. Soal harus berbasis FAKTA dan KONSEP dari materi yang diberikan, bukan mengarang bebas.
2. Gunakan taksonomi Bloom (C1-C4): analisis konsep, penerapan rumus, perbandingan, atau pemahaman mendalam.
3. Setiap soal WAJIB memiliki tepat 4 opsi pilihan ganda [A, B, C, D].
4. Pengecoh (distractor) harus realistis dan masuk akal, tidak boleh jawaban konyol.
5. "correctIndex" adalah nomor indeks jawaban yang benar (0 untuk A, 1 untuk B, 2 untuk C, 3 untuk D).
6. Berikan penjelasan (explanation) komprehensif MENGAPA jawaban itu benar dan MENGAPA pengecoh lainnya salah.
7. Output WAJIB berupa JSON valid MURNI dengan format ruangtenang-quiz-v1. JANGAN menambahkan teks obrolan di luar JSON.

SCHEMA JSON WAJIB:
{
  "format": "ruangtenang-quiz-v1",
  "title": "Simulasi Ujian: [Judul Topik]",
  "topic": "${topic.replace(/"/g, "'")}",
  "difficulty": "${difficultyLevel}",
  "timeLimitMinutes": ${count * 2},
  "totalQuestions": ${count},
  "questions": [
    {
      "id": "q1",
      "question": "Pertanyaan soal...",
      "options": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
      "correctIndex": 0,
      "explanation": "Penjelasan mengapa jawaban A tepat...",
      "topicTag": "Nama Subtopik",
      "referenceSnippet": "Kutipan singkat dari materi acuan"
    }
  ]
}`;

    const userPrompt = `Buatkan ${count} butir soal pilihan ganda tingkat kesulitan "${difficultyLevel}" untuk topik: "${topic}".

Berikut materi/dokumen acuan:
"""
${contextText.slice(0, 24000)}
"""`;

    try {
      const response = await aiRequestService.generateChatResponse({
        userId,
        userTier,
        requestedModelId: modelId,
        prompt: userPrompt,
        systemInstruction,
        responseFormat: 'json'
      });

      const jsonStr = extractJsonFromAiOutput(response.text);
      const parsed = JSON.parse(jsonStr) as QuizSpecRaw;

      if (!parsed || parsed.format !== 'ruangtenang-quiz-v1' || !Array.isArray(parsed.questions)) {
        throw new Error('Format output JSON dari AI tidak sesuai schema ruangtenang-quiz-v1');
      }

      // Validasi dan normalisasi tiap pertanyaan
      const validQuestions: QuizQuestionRaw[] = parsed.questions
        .filter(q => q && typeof q.question === 'string' && Array.isArray(q.options) && q.options.length >= 2)
        .map((q, idx) => ({
          id: q.id || `q_${idx + 1}_${Date.now()}`,
          question: q.question.trim(),
          options: q.options.map(opt => String(opt).trim()),
          correctIndex: typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < q.options.length ? q.correctIndex : 0,
          explanation: (q.explanation || 'Jawaban didasarkan pada dokumen acuan materi.').trim(),
          topicTag: q.topicTag || topic,
          referenceSnippet: q.referenceSnippet ? String(q.referenceSnippet).trim() : undefined
        }));

      if (validQuestions.length === 0) {
        throw new Error('Tidak ada butir soal yang valid yang dihasilkan AI');
      }

      return {
        format: 'ruangtenang-quiz-v1',
        id: `quiz_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        title: parsed.title || `Simulasi Ujian: ${topic}`,
        topic: parsed.topic || topic,
        difficulty: difficultyLevel,
        timeLimitMinutes: parsed.timeLimitMinutes || Math.max(5, validQuestions.length * 2),
        totalQuestions: validQuestions.length,
        questions: validQuestions,
        sourceDocumentNames,
        createdAt: new Date().toISOString()
      };
    } catch (error: any) {
      logger.error('Failed to generate quiz with AI:', { error: error?.message });
      throw new Error(error?.message || 'Gagal menghasilkan kuis simulasi ujian');
    }
  }
};
