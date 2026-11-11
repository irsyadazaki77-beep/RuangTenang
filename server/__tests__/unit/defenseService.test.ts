import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractJsonFromAi, defenseService } from '../../services/defenseService.js';
import { aiRequestService } from '../../services/ai/aiRequestService.js';

describe('Defense Service - extractJsonFromAi', () => {
  it('extracts JSON object from markdown code block', () => {
    const raw = 'Berikut ulasan sidang:\n```json\n{\n  "score": 88,\n  "grade": "A"\n}\n```\nCatatan dosen penguji selesai.';
    const result = extractJsonFromAi(raw);
    expect(result).toBe('{\n  "score": 88,\n  "grade": "A"\n}');
  });

  it('extracts JSON array from markdown code block', () => {
    const raw = 'Daftar pertanyaan:\n```json\n[\n  {"id": "q1", "question": "Apa novelty riset saudara?"}\n]\n```';
    const result = extractJsonFromAi(raw);
    expect(result).toBe('[\n  {"id": "q1", "question": "Apa novelty riset saudara?"}\n]');
  });

  it('extracts raw JSON array without markdown fences', () => {
    const raw = 'Hasil pertanyaan penguji: [{"id": "q1", "question": "Jelaskan metodologi"}] Terima kasih.';
    const result = extractJsonFromAi(raw);
    expect(result).toBe('[{"id": "q1", "question": "Jelaskan metodologi"}]');
  });
});

describe('Defense Service - evaluateAnswer & generateQuestions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns low score for empty or very brief answer without calling AI', async () => {
    const result = await defenseService.evaluateAnswer({
      question: {
        id: 'q1',
        chapterTag: 'Bab 3: Metodologi',
        question: 'Bagaimana saudara menentukan ukuran sampel?'
      },
      studentAnswer: 'pakai rumus',
      examiner: {
        id: 'examiner-1',
        name: 'Dr. Hendra Suhartono',
        title: 'Ketua Penguji',
        role: 'Ketua Penguji',
        focusArea: 'Metodologi'
      },
      thesisTitle: 'Analisis Algoritma Dijkstra'
    });

    expect(result.score).toBeLessThanOrEqual(50);
    expect(result.grade).toBe('Perlu Perbaikan');
    expect(result.weaknesses.length).toBeGreaterThan(0);
    expect(result.critique).toContain('terlalu singkat');
  });

  it('evaluates student answer via aiRequestService with Killer Examiner persona', async () => {
    const mockAiResponse = JSON.stringify({
      score: 82,
      grade: 'B+',
      confidenceScore: 85,
      theoryScore: 80,
      defenseLogicScore: 82,
      critique: 'Dr. Hendra Suhartono: Saudara cukup fasih menjelaskan rumus Slovin, namun saudara belum mengantisipasi non-response bias jika response rate di bawah 70%.',
      strengths: ['Menguasai formula Slovin', 'Retorika penyampaian tenang'],
      weaknesses: ['Belum ada langkah mitigasi non-response bias'],
      suggestedImprovement: 'Tambahkan oversampling 15% untuk mengantisipasi responden drop out.',
      followUpQuestion: 'Bagaimana jika tingkat respons hanya 50%, apakah saudara akan melakukan sampling ulang?'
    });

    vi.spyOn(aiRequestService, 'generateChatResponse').mockResolvedValueOnce({
      text: `\`\`\`json\n${mockAiResponse}\n\`\`\``,
      modelUsed: 'mock-model',
      isFallback: false
    });

    const result = await defenseService.evaluateAnswer({
      question: {
        id: 'q-sempro-2',
        chapterTag: 'Bab 3: Desain Metodologi',
        question: 'Mengapa saudara memilih teknik pengambilan sampel dan ukuran sampel tersebut?'
      },
      studentAnswer: 'Izin menjawab Dr. Hendra. Kami menggunakan probability sampling dengan rumus Slovin pada margin of error 5% yang menghasilkan minimal 384 responden untuk populasi 100.000.',
      examiner: {
        id: 'examiner-1',
        name: 'Dr. Hendra Suhartono',
        title: 'Ketua Penguji',
        role: 'Ketua Penguji',
        focusArea: 'Metodologi & Sampling'
      },
      thesisTitle: 'Implementasi Algoritma Enkripsi',
      rigorLevel: 'killer'
    });

    expect(result.score).toBe(82);
    expect(result.grade).toBe('B+');
    expect(result.followUpQuestion).toContain('tingkat respons');
    expect(result.strengths).toContain('Menguasai formula Slovin');
    expect(result.weaknesses).toContain('Belum ada langkah mitigasi non-response bias');
  });

  it('generates dynamic thesis defense questions tailored to title & context', async () => {
    const mockQuestions = JSON.stringify([
      {
        id: 'q-ai-1',
        examinerId: 'examiner-2',
        chapterTag: 'Bab 1: Novelty & Gap',
        question: 'Apa novelty algoritma yang saudara kembangkan dibandingkan model YOLOv8 standar?',
        contextHint: 'Fokuskan pada arsitektur backbone atau modifikasi attention layer.',
        expectedKeyPoints: ['Modifikasi layer attention', 'Efisiensi parameter'],
        suggestedCounterDefense: 'Kami memodifikasi neck network dengan CBAM.'
      },
      {
        id: 'q-ai-2',
        examinerId: 'examiner-1',
        chapterTag: 'Bab 3: Validitas Metrik',
        question: 'Mengapa saudara hanya menggunakan mAP50 dan bukan mAP50-95?',
        contextHint: 'Bandingkan sensitivitas IoU threshold.',
        expectedKeyPoints: ['Penjelasan IoU threshold', 'Kebutuhan inferensi real-time'],
        suggestedCounterDefense: 'Kami menyajikan mAP50-95 di lampiran Bab 4.'
      },
      {
        id: 'q-ai-3',
        examinerId: 'examiner-3',
        chapterTag: 'Bab 5: Implementasi Lapangan',
        question: 'Bagaimana latensi inferensi ketika dideploy pada perangkat edge Raspberry Pi?',
        contextHint: 'Sebutkan FPS dan konsumsi daya.',
        expectedKeyPoints: ['Frame per second', 'Optimasi quantized TFLite'],
        suggestedCounterDefense: 'Dengan int8 quantization latensi mencapai 32 FPS.'
      }
    ]);

    vi.spyOn(aiRequestService, 'generateChatResponse').mockResolvedValueOnce({
      text: mockQuestions,
      modelUsed: 'mock-model',
      isFallback: false
    });

    const questions = await defenseService.generateQuestions({
      thesisTitle: 'Deteksi Cacat Produksi Real-Time dengan Computer Vision',
      examType: 'SIDANG_SKRIPSI',
      contextText: 'Penelitian ini mengembangkan deteksi cacat kain tekstil menggunakan edge computing.',
      rigorLevel: 'killer'
    });

    expect(questions.length).toBe(3);
    expect(questions[0].chapterTag).toContain('Novelty');
    expect(questions[1].examinerId).toBe('examiner-1');
  });
});
