import { aiRequestService } from './ai/aiRequestService.js';
import { consentService } from './consentService.js';

export interface StructuredSessionSummary {
  masalahUtama: string;
  emosi: string[];
  polaPemicu: string[];
  poinPenting: string[];
  sudahDicoba: string[];
  langkahBerikutnya: string[];
  disclaimer: string;
  generatedAt: string;
  messageCountAtGeneration: number;
}

const MEDICAL_DISCLAIMER = 'Ringkasan ini dibuat secara otomatis oleh AI untuk membantu refleksi pribadi dan BUKAN merupakan diagnosis medis atau penanganan klinis psikiatri.';

/**
 * Extracts a token-budgeted representation of the chat history.
 * Prevents raw long chats from exhausting tokens or leaking unbounded history.
 */
export function budgetChatHistory(messages: Array<{ role: string; content: string }>): string {
  if (messages.length === 0) return '';
  if (messages.length <= 8) {
    return messages
      .map(m => `${m.role === 'assistant' ? 'AI' : 'User'}: ${m.content.substring(0, 350)}`)
      .join('\n');
  }

  // Token budget strategy for long conversations:
  // 1. Initial 2 messages (original context / problem)
  // 2. Sampled middle messages (key transitions)
  // 3. Last 6 messages (recent development)
  const initial = messages.slice(0, 2);
  const recent = messages.slice(-6);
  
  const middleSlice = messages.slice(2, -6);
  const sampledMiddle: typeof messages = [];
  if (middleSlice.length > 0) {
    const step = Math.max(1, Math.floor(middleSlice.length / 3));
    for (let i = 0; i < middleSlice.length; i += step) {
      if (sampledMiddle.length < 3) {
        sampledMiddle.push(middleSlice[i]);
      }
    }
  }

  const combined = [...initial, ...sampledMiddle, ...recent];
  return combined
    .map(m => `${m.role === 'assistant' ? 'AI' : 'User'}: ${m.content.substring(0, 300)}`)
    .join('\n');
}

/**
 * Fallback local structured summary generator when AI model is offline or unconsented.
 */
export function generateLocalStructuredSummary(
  messages: Array<{ role: string; content: string }>
): StructuredSessionSummary {
  const allText = messages.map(m => m.content).join(' ').toLowerCase();

  let masalahUtama = 'Mencari ruang aman untuk mencurahkan beban pikiran dan meregulasi perasaan.';
  const emosi: string[] = ['Lelah', 'Cemas'];
  const polaPemicu: string[] = ['Beban tugas atau aktivitas harian yang menumpuk'];
  const poinPenting: string[] = [
    'Pengguna menyadari perlunya tempat bercerita tanpa penghakiman.',
    'Menyadari bahwa perasaan yang dialami adalah respon wajar terhadap stres.'
  ];
  const sudahDicoba: string[] = ['Menuangkan perasaan melalui percakapan mandiri'];
  const langkahBerikutnya: string[] = [
    'Istirahat sejenak dengan teknik napas lambat (4 hitungan masuk, 4 tahan, 4 hembuskan).',
    'Menuliskan satu prioritas utama untuk hari ini agar tidak kewalahan.'
  ];

  if (allText.includes('skripsi') || allText.includes('kuliah') || allText.includes('dosen') || allText.includes('tugas')) {
    masalahUtama = 'Tekanan pengerjaan tugas akhir/kuliah dan kecemasan menghadapi target akademik.';
    emosi.push('Overthinking', 'Takut tertinggal');
    polaPemicu.push('Ekspektasi tinggi terhadap diri sendiri', 'Prokrastinasi akibat cemas');
    poinPenting.push('Pentingnya membagi tugas besar menjadi langkah-langkah mikro yang lebih mudah dikerjakan.');
    langkahBerikutnya[1] = 'Kerjakan 1 bagian kecil tugas selama 15 menit tanpa memikirkan hasil akhir.';
  }

  if (allText.includes('tidur') || allText.includes('insomnia') || allText.includes('begadang')) {
    polaPemicu.push('Pikiran aktif sebelum tidur');
    langkahBerikutnya.push('Kurangi paparan layar gawai 30 menit sebelum istirahat malam.');
  }

  return {
    masalahUtama,
    emosi: Array.from(new Set(emosi)),
    polaPemicu: Array.from(new Set(polaPemicu)),
    poinPenting,
    sudahDicoba,
    langkahBerikutnya,
    disclaimer: MEDICAL_DISCLAIMER,
    generatedAt: new Date().toISOString(),
    messageCountAtGeneration: messages.length
  };
}

export const sessionSummaryService = {
  async generateSummary(
    userId: string,
    messages: Array<{ role: string; content: string }>
  ): Promise<StructuredSessionSummary> {
    if (!messages || messages.length === 0) {
      return {
        masalahUtama: 'Belum ada percakapan untuk diringkas.',
        emosi: [],
        polaPemicu: [],
        poinPenting: [],
        sudahDicoba: [],
        langkahBerikutnya: ['Mulai obrolan baru dengan menceritakan apa yang sedang kamu rasakan.'],
        disclaimer: MEDICAL_DISCLAIMER,
        generatedAt: new Date().toISOString(),
        messageCountAtGeneration: 0
      };
    }

    const hasAiConsent = await consentService.canUseAI(userId);
    if (!hasAiConsent) {
      return generateLocalStructuredSummary(messages);
    }

    const budgetedChat = budgetChatHistory(messages);

    const systemPrompt = `Anda adalah asisten refleksi kesehatan mental RuangTenang. Tugas Anda merangkum percakapan sesi konseling/curhat ke dalam format JSON yang terstruktur, ringkas, dan empatik.
ATURAN KETAT:
1. DILARANG KERAS membuat diagnosis medis, psikiatris, atau klinis (misalnya jangan menulis "depresi klinis", "gangguan bipolar", "skizofrenia").
2. Fokus pada masalah nyata pengguna, emosi yang dirasakan, pola pemicu, poin diskusi, hal yang sudah dicoba, dan rekomendasi langkah mikro yang realistis.
3. Berikan output HANYA berupa JSON valid tanpa blok markdown atau teks tambahan dengan format:
{
  "masalahUtama": "penjelasan 1-2 kalimat masalah pokok",
  "emosi": ["emosi 1", "emosi 2", ...],
  "polaPemicu": ["pemicu 1", "pemicu 2", ...],
  "poinPenting": ["poin 1", "poin 2", ...],
  "sudahDicoba": ["hal yang sudah diupayakan", ...],
  "langkahBerikutnya": ["langkah kecil 1", "langkah kecil 2", ...]
}`;

    const prompt = `Berikut adalah percakapan yang telah disaring dan dibudget:\n${budgetedChat}\n\nBuat ringkasan sesi terstruktur sesuai format JSON di atas:`;

    try {
      const response = await aiRequestService.generateChatResponse({
        userId,
        prompt,
        systemInstruction: systemPrompt,
        requestedModelId: 'gemini-3.1-flash-lite',
        userTier: 'Free'
      });

      if (response.text && !response.isFallback) {
        const cleaned = response.text.replace(/```json\n?|```/g, '').trim();
        const parsed = JSON.parse(cleaned);

        return {
          masalahUtama: parsed.masalahUtama || 'Refleksi percakapan mandiri.',
          emosi: Array.isArray(parsed.emosi) ? parsed.emosi.slice(0, 6) : [],
          polaPemicu: Array.isArray(parsed.polaPemicu) ? parsed.polaPemicu.slice(0, 5) : [],
          poinPenting: Array.isArray(parsed.poinPenting) ? parsed.poinPenting.slice(0, 6) : [],
          sudahDicoba: Array.isArray(parsed.sudahDicoba) ? parsed.sudahDicoba.slice(0, 5) : [],
          langkahBerikutnya: Array.isArray(parsed.langkahBerikutnya) ? parsed.langkahBerikutnya.slice(0, 5) : [],
          disclaimer: MEDICAL_DISCLAIMER,
          generatedAt: new Date().toISOString(),
          messageCountAtGeneration: messages.length
        };
      }
    } catch (err) {
      console.warn('[SESSION_SUMMARY] AI generation error, using fallback:', err);
    }

    return generateLocalStructuredSummary(messages);
  }
};
