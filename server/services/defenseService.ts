import { aiRequestService } from './ai/aiRequestService.js';
import { DEFAULT_AI_MODEL } from '../config/aiConfig.js';
import { logger } from '../utils/logger.js';

export type DefenseExamType = 'SEMINAR_PROPOSAL' | 'SEMINAR_HASIL' | 'SIDANG_SKRIPSI';

export interface DefenseQuestionItem {
  id: string;
  examinerId: string;
  chapterTag: string;
  question: string;
  contextHint: string;
  expectedKeyPoints: string[];
  suggestedCounterDefense: string;
}

export interface DefenseEvaluationResult {
  questionId: string;
  studentAnswer: string;
  score: number;
  grade: 'A' | 'B+' | 'B' | 'C' | 'Perlu Perbaikan';
  confidenceScore: number;
  theoryScore: number;
  defenseLogicScore: number;
  critique: string;
  strengths: string[];
  weaknesses: string[];
  suggestedImprovement: string;
  followUpQuestion?: string;
}

export interface GenerateDefenseQuestionsPayload {
  thesisTitle: string;
  examType: DefenseExamType;
  contextText?: string;
  rigorLevel?: 'standar' | 'killer';
  modelId?: string;
  userId?: string;
  userTier?: string;
}

export interface EvaluateDefenseAnswerPayload {
  question: {
    id: string;
    chapterTag: string;
    question: string;
    expectedKeyPoints?: string[];
  };
  studentAnswer: string;
  examiner: {
    id: string;
    name: string;
    title: string;
    role: string;
    focusArea: string;
  };
  thesisTitle: string;
  examType?: DefenseExamType;
  rigorLevel?: 'standar' | 'killer';
  modelId?: string;
  userId?: string;
  userTier?: string;
}

export function extractJsonFromAi(output: string): string {
  let cleaned = output.trim();
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    cleaned = codeBlockMatch[1].trim();
  }

  // Handle object or array JSON
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace > firstBrace) {
      return cleaned.substring(firstBrace, lastBrace + 1);
    }
  } else if (firstBracket !== -1) {
    const lastBracket = cleaned.lastIndexOf(']');
    if (lastBracket > firstBracket) {
      return cleaned.substring(firstBracket, lastBracket + 1);
    }
  }

  return cleaned;
}

export const defenseService = {
  /**
   * Generates dynamic, highly critical thesis defense questions based on student's research title & context.
   */
  async generateQuestions(payload: GenerateDefenseQuestionsPayload): Promise<DefenseQuestionItem[]> {
    const {
      thesisTitle,
      examType,
      contextText = '',
      rigorLevel = 'standar',
      modelId = DEFAULT_AI_MODEL,
      userId,
      userTier = 'Free'
    } = payload;

    const isKiller = rigorLevel === 'killer';
    const examLabel = examType === 'SEMINAR_PROPOSAL' 
      ? 'Seminar Proposal (Sempro)' 
      : examType === 'SEMINAR_HASIL' 
      ? 'Seminar Hasil (Semhas)' 
      : 'Sidang Skripsi / Tugas Akhir';

    const systemInstruction = `Kamu adalah Dewan Penguji Skripsi & Tugas Akhir Akademik Perguruan Tinggi Indonesia (Ketua Penguji, Penguji Ahli, dan Sekretaris).
Tugasmu adalah menyusun 4 pertanyaan sidang ${examLabel} yang mendalam, kontekstual, dan menantang berdasarkan judul dan abstrak/materi skripsi yang diberikan mahasiswa.

${isKiller ? 'PERHATIAN KHUSUS MODE "DOSEN PENGUJI KILLER": Pertanyaan harus SANGAT KRITIS, tajam, mencari celah metodologi (sample bias, threat to validity, confounding factors, kelemahan grand theory, atau overclaiming hasil penelitian).' : 'Gaya pertanyaan: Kritis, akademik, objektif, dan mendorong argumentasi ilmiah berbasis bukti.'}

PEMBAGIAN PENGUJI:
1. "examiner-1": Dr. Ir. Hendra Suhartono, M.Kom. (Ketua Penguji - Fokus: Metodologi, Validitas Instrumen, Pengambilan Sampel, Uji Statistik, Bias)
2. "examiner-2": Prof. Dr. Ratna Kusuma Dewi, M.Si. (Penguji Ahli - Fokus: Grand Theory, State-of-the-Art, Research Gap 5 tahun terakhir, Novelty)
3. "examiner-3": Dra. Hj. Nurul Hidayati, M.Pd. (Sekretaris Sidang - Fokus: Sistematika Penulisan, Konsistensi Temuan Bab 4 vs Bab 5, Etika Penelitian, Mitigasi Keterbatasan)
4. Satu pertanyaan pendalaman metodologi/hasil dari Dr. Hendra Suhartono ("examiner-1").

FORMAT OUTPUT WAJIB:
Berikan HANYA JSON array berisi tepat 4 objek dengan skema:
[
  {
    "id": "q-ai-1",
    "examinerId": "examiner-2",
    "chapterTag": "Bab 1 & 2: Urgensi & Grand Theory",
    "question": "Kalimat pertanyaan tajam penguji...",
    "contextHint": "Petunjuk arah argumentasi yang diharapkan...",
    "expectedKeyPoints": ["Poin 1", "Poin 2", "Poin 3"],
    "suggestedCounterDefense": "Contoh kalimat pembelaan ilmiah yang elegan dan meyakinkan..."
  },
  ...
]`;

    const userPrompt = `JUDUL PENELITIAN MAHASISWA:
"${thesisTitle}"

${contextText ? `KONTEKS / ABSTRAK PENELITIAN:\n${contextText.slice(0, 3000)}\n` : ''}
JENIS UJIAN: ${examLabel}
TINGKAT KEKETATAN PENGUJI: ${isKiller ? 'DOSEN PENGUJI KILLER (Sangat Kritis & Mencecar)' : 'Standar Akademik'}

Buatlah 4 pertanyaan sidang yang spesifik merujuk pada judul dan materi di atas sekarang dalam format JSON array murni!`;

    try {
      const response = await aiRequestService.generateChatResponse({
        userId,
        userTier,
        requestedModelId: modelId,
        prompt: userPrompt,
        systemInstruction,
        responseFormat: 'json'
      });

      const extracted = extractJsonFromAi(response.text);
      const parsed = JSON.parse(extracted);

      const list = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.questions)
        ? parsed.questions
        : Array.isArray(parsed?.pertanyaan)
        ? parsed.pertanyaan
        : Array.isArray(parsed?.data)
        ? parsed.data
        : Array.isArray(parsed?.items)
        ? parsed.items
        : null;

      if (Array.isArray(list) && list.length >= 3) {
        return list.map((item, idx) => ({
          id: item.id || `q-ai-${idx + 1}`,
          examinerId: ['examiner-1', 'examiner-2', 'examiner-3'].includes(item.examinerId) ? item.examinerId : (idx === 1 ? 'examiner-2' : idx === 2 ? 'examiner-3' : 'examiner-1'),
          chapterTag: String(item.chapterTag || `Bab ${idx + 1}: Tinjauan Khusus`),
          question: String(item.question || 'Jelaskan metodologi dan justifikasi penelitian saudara.'),
          contextHint: String(item.contextHint || 'Fokuskan pada argumentasi ilmiah yang valid.'),
          expectedKeyPoints: Array.isArray(item.expectedKeyPoints) && item.expectedKeyPoints.length > 0 
            ? item.expectedKeyPoints.map((p: unknown) => String(p))
            : ['Menyebutkan landasan ilmiah', 'Menjelaskan langkah metodologis'],
          suggestedCounterDefense: String(item.suggestedCounterDefense || 'Berdasarkan telaah literatur dan data empiris, pendekatan ini telah sesuai dengan kaidah ilmiah.')
        }));
      }
      throw new Error('Format JSON pertanyaan AI tidak sesuai array standar');
    } catch (err: any) {
      logger.warn('Failed to generate AI defense questions, falling back to local heuristic:', { error: err?.message });
      throw err;
    }
  },

  /**
   * Evaluates student's oral/written defense answer from the perspective of the specific examiner.
   */
  async evaluateAnswer(payload: EvaluateDefenseAnswerPayload): Promise<DefenseEvaluationResult> {
    const {
      question,
      studentAnswer,
      examiner,
      thesisTitle,
      examType = 'SIDANG_SKRIPSI',
      rigorLevel = 'standar',
      modelId = DEFAULT_AI_MODEL,
      userId,
      userTier = 'Free'
    } = payload;

    const isKiller = rigorLevel === 'killer';
    const cleanAnswer = studentAnswer.trim();

    if (!cleanAnswer || cleanAnswer.split(/\s+/).length < 5) {
      return {
        questionId: question.id,
        studentAnswer: cleanAnswer,
        score: 40,
        grade: 'Perlu Perbaikan',
        confidenceScore: 30,
        theoryScore: 35,
        defenseLogicScore: 40,
        critique: `${examiner.name} (${examiner.role}): "Saudara mahasiswa, jawaban saudara terlalu singkat dan belum memuat argumentasi ilmiah apa pun. Di ruang sidang, saudara harus membuktikan integritas riset saudara dengan landasan teori dan bukti empiris."`,
        strengths: ['Mencoba merespons pertanyaan penguji'],
        weaknesses: ['Belum ada elaborasi ilmiah', 'Tidak ada data pendukung atau rujukan metodologi'],
        suggestedImprovement: 'Jelaskan kembali dengan struktur: 1. Penegasan premis, 2. Bukti/formula metodologis, 3. Mitigasi keterbatasan.'
      };
    }

    const systemInstruction = `Kamu berperan sebagai ${examiner.name}, bertindak sebagai ${examiner.role} dalam ${examType}.
Fokus keahlianmu: ${examiner.focusArea}.
Judul skripsi mahasiswa: "${thesisTitle}".

Tugasmu adalah menguji, menganalisis, dan mengevaluasi jawaban mahasiswa terhadap pertanyaan sidang berikut:
"${question.question}"

Karakter Penguji:
${isKiller 
  ? '- MODE "DOSEN PENGUJI KILLER": Kamu sangat jeli, tidak mudah terkesan oleh kata-kata manis tanpa data. Jika ada cacat logika, overclaiming, atau ketidaksinkronan metodologi, kamu kritisi dengan tajam dan lugas khas dosen senior universitas ternama.' 
  : '- MODE STANDAR: Objektif, mendidik, tegas namun konstruktif, menuntut bukti rasionalitas ilmiah.'}

KRITERIA PENILAIAN (Skala 0 - 100):
- score: Nilai total komposit (0 - 100)
- grade: 'A' (>= 85), 'B+' (75-84), 'B' (65-74), 'C' (55-64), atau 'Perlu Perbaikan' (< 55)
- confidenceScore: Keyakinan dan ketegasan retorika akademis (0 - 100)
- theoryScore: Kedalaman rujukan teori, metodologi, dan formula ilmiah (0 - 100)
- defenseLogicScore: Ketepatan kausalitas dan kemampuan menyanggah kritik (0 - 100)
- critique: Komentar/kritik langsung dari sudut pandangmu sebagai ${examiner.name} (Gunakan sapaan "Saudara mahasiswa" atau sejenisnya, berikan kritik tajam yang mendidik).
- strengths: Array berisi 1-3 poin kekuatan jawaban mahasiswa.
- weaknesses: Array berisi 1-3 poin kelemahan fatal atau celah logika yang belum terjawab.
- suggestedImprovement: Rekomendasi kalimat pembelaan ilmiah (*counter-defense*) yang elegan jika ditanya lagi di sidang sebenarnya.
- followUpQuestion: Satu pertanyaan cecaran lanjutan yang lebih menohok untuk menguji ketahanan mahasiswa.

FORMAT OUTPUT: Berikan HANYA JSON objek valid sesuai properti di atas tanpa markdown penjelasan di luar JSON.`;

    const userPrompt = `PERTANYAAN PENGUJI (${question.chapterTag}):
"${question.question}"

${question.expectedKeyPoints ? `POIN KUNCI YANG DIHARAPKAN:\n- ${question.expectedKeyPoints.join('\n- ')}\n` : ''}

JAWABAN / ARGUMENTASI MAHASISWA:
"""${cleanAnswer}"""

Evaluasilah jawaban mahasiswa ini sekarang secara profesional dalam format JSON!`;

    try {
      const response = await aiRequestService.generateChatResponse({
        userId,
        userTier,
        requestedModelId: modelId,
        prompt: userPrompt,
        systemInstruction,
        responseFormat: 'json'
      });

      const extracted = extractJsonFromAi(response.text);
      const parsed = JSON.parse(extracted);

      const score = Math.min(100, Math.max(0, Number(parsed.score) || 70));
      let grade: DefenseEvaluationResult['grade'] = 'B';
      if (score >= 85) grade = 'A';
      else if (score >= 75) grade = 'B+';
      else if (score >= 65) grade = 'B';
      else if (score >= 55) grade = 'C';
      else grade = 'Perlu Perbaikan';

      return {
        questionId: question.id,
        studentAnswer: cleanAnswer,
        score,
        grade,
        confidenceScore: Math.min(100, Math.max(0, Number(parsed.confidenceScore) || score)),
        theoryScore: Math.min(100, Math.max(0, Number(parsed.theoryScore) || score)),
        defenseLogicScore: Math.min(100, Math.max(0, Number(parsed.defenseLogicScore) || score)),
        critique: String(parsed.critique || `${examiner.name}: Argumen saudara cukup baik, namun perhatikan validitas pembuktian secara empiris.`),
        strengths: Array.isArray(parsed.strengths) && parsed.strengths.length > 0 
          ? parsed.strengths.map((s: unknown) => String(s))
          : ['Merespons pertanyaan penguji dengan jelas'],
        weaknesses: Array.isArray(parsed.weaknesses) && parsed.weaknesses.length > 0 
          ? parsed.weaknesses.map((w: unknown) => String(w))
          : ['Masih perlu penguatan pada aspek justifikasi metodologis'],
        suggestedImprovement: String(parsed.suggestedImprovement || 'Sertakan data rujukan literatur dan justifikasi sampel.'),
        followUpQuestion: parsed.followUpQuestion ? String(parsed.followUpQuestion) : undefined
      };
    } catch (err: any) {
      logger.warn('Failed to evaluate AI defense answer, caller should handle fallback:', { error: err?.message });
      throw err;
    }
  }
};
