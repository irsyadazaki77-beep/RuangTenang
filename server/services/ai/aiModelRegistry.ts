import { aiProviderConfig } from '../../config/aiProviderConfig.js';
import { getProviderHealth } from './aiReliabilityService.js';
import {
  AUTO_ROUTING_MODEL_ID,
  DEFAULT_AI_MODEL_ID,
  DEFAULT_TENANG_PROFILE_ID,
  DEFAULT_KERJA_PROFILE_ID,
  TENANG_PROFILES,
  KERJA_PROFILES,
  ALL_AI_PROFILES,
  isTenangProfile,
  isKerjaProfile,
  isAiProfile,
  ModelCapability,
  ProviderId,
  ModelTier,
  AiProfileId,
  TenangProfileId,
  KerjaProfileId,
  AiProfileOption
} from '../../../shared/aiModelContract.js';

export {
  DEFAULT_AI_MODEL_ID,
  DEFAULT_TENANG_PROFILE_ID,
  DEFAULT_KERJA_PROFILE_ID,
  TENANG_PROFILES,
  KERJA_PROFILES,
  ALL_AI_PROFILES,
  isTenangProfile,
  isKerjaProfile,
  isAiProfile
};
export type { ModelCapability, ModelTier, ProviderId, AiProfileId, TenangProfileId, KerjaProfileId, AiProfileOption };

export interface AiModelMetadata {
  id: string;
  name: string;
  category: string;
  tag: string;
  description: string;
  isDefault?: boolean;
  speed: 'Sangat Cepat' | 'Cepat' | 'Sedang';
  reasoning: 'Tinggi' | 'Sangat Tinggi' | 'Standar';
  recommendedFor: string;
  allowedTiers: ModelTier[];
}
export interface AiModelDefinition extends AiModelMetadata {
  provider: ProviderId;
  providerModelId: string;
  capabilities: readonly ModelCapability[];
}

const MODEL_METADATA: AiModelMetadata[] = [
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    category: 'Model Utama & Seimbang',
    tag: 'Terbaru • Cepat & Cerdas',
    description: 'Model teks dan multimodal generasi 3.8 terbaru dari Google AI. Keseimbangan terbaik antara pemahaman emosional mendalam, penalaran adaptif, dan respon instan.',
    isDefault: true,
    speed: 'Sangat Cepat',
    reasoning: 'Tinggi',
    recommendedFor: 'Percakapan konseling utama, active listening, refleksi emosi, dan panduan harian',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'openrouter-free-auto',
    name: 'OpenRouter • Free Auto Router (Gratis)',
    category: 'Model Utama & Seimbang',
    tag: '100% Gratis • Auto-Router',
    description: 'Router cerdas resmi OpenRouter (`openrouter/free`) yang otomatis memilih model gratis aktif terbaik & tercepat dengan biaya Rp 0 ($0.00).',
    speed: 'Sangat Cepat',
    reasoning: 'Tinggi',
    recommendedFor: 'Semua kebutuhan obrolan, akademik, dan refleksi 100% bebas biaya kredit',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'gemini-4-argon',
    name: 'Gemini 4 Argon',
    category: 'Penalaran Mendalam & Analisis',
    tag: 'Flagship • Penalaran Lanjut',
    description: 'Model Gemini unggulan untuk penalaran kompleks, analisis panjang, dan tugas multi-langkah.',
    speed: 'Sedang',
    reasoning: 'Sangat Tinggi',
    recommendedFor: 'Analisis kompleks, riset, coding, dan perencanaan bertahap',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },

  // --- 1. FRONTIER & DEEP REASONING TIER (Sangat Tinggi) ---
  {
    id: 'openrouter-nemotron-550b',
    name: 'OpenRouter • NVIDIA Nemotron 3 Ultra 550B (Gratis)',
    category: 'Penalaran Mendalam & Analisis',
    tag: '100% Gratis • Ultra 550B (1M Konteks)',
    description: 'Model raksasa 550B parameter dari NVIDIA via OpenRouter (`:free`) dengan konteks 1 juta token untuk analisis mendalam & riset.',
    speed: 'Sedang',
    reasoning: 'Sangat Tinggi',
    recommendedFor: 'Analisis mendalam, penalaran bertahap, skripsi, dan pemecahan masalah kompleks',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'openrouter-nemotron-super-120b',
    name: 'OpenRouter • NVIDIA Nemotron 3 Super 120B (Gratis)',
    category: 'Penalaran Mendalam & Analisis',
    tag: '100% Gratis • Super 120B',
    description: 'Model NVIDIA Nemotron 120B parameter via OpenRouter (`:free`) yang kuat dalam penalaran terstruktur dan bahasa ilmiah.',
    speed: 'Cepat',
    reasoning: 'Sangat Tinggi',
    recommendedFor: 'Eksplorasi masalah akademis/skripsi dan restrukturisasi pola pikir kognitif',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'openrouter-nemotron-super-vl',
    name: 'OpenRouter • NVIDIA Nemotron 3.5 Super VL (Gratis)',
    category: 'Penalaran Mendalam & Analisis',
    tag: '100% Gratis • Vision & 1M Konteks',
    description: 'Model multimodal vision-language NVIDIA Nemotron 3.5 Super VL (`:free`) dengan konteks 1 juta token untuk analisis gambar & dokumen.',
    speed: 'Cepat',
    reasoning: 'Sangat Tinggi',
    recommendedFor: 'Analisis gambar, diagram akademik, dan dokumen panjang bebas biaya',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'openrouter-nemotron-nano-omni',
    name: 'OpenRouter • NVIDIA Nemotron 3 Nano Omni Reasoning (Gratis)',
    category: 'Penalaran Mendalam & Analisis',
    tag: '100% Gratis • Omni Reasoning',
    description: 'Model reasoning multimodal NVIDIA Nemotron 3 Nano Omni 30B (`:free`) dengan penalaran Chain-of-Thought terstruktur.',
    speed: 'Cepat',
    reasoning: 'Sangat Tinggi',
    recommendedFor: 'Penalaran bertahap, pemecahan soal logika, dan refleksi terstruktur',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'openrouter-inkling',
    name: 'OpenRouter • Thinking Machines Inkling (Gratis)',
    category: 'Penalaran Mendalam & Analisis',
    tag: '100% Gratis • 1M Konteks Reasoning',
    description: 'Model flagship Thinking Machines Inkling (`:free`) dengan jendela konteks 1 juta token untuk sintesis literatur dan riset mendalam.',
    speed: 'Cepat',
    reasoning: 'Sangat Tinggi',
    recommendedFor: 'Riset akademik, penulisan ilmiah, dan diskusi konseptual mendalam',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'openrouter-flint',
    name: 'OpenRouter • Recursive Flint v1.0 (Gratis)',
    category: 'Penalaran Mendalam & Analisis',
    tag: '100% Gratis • Penalaran Rekursif',
    description: 'Model Recursive Flint v1.0 (`:free`) dengan konteks 262K token untuk analisis sistematis dan pemecahan masalah multi-langkah.',
    speed: 'Cepat',
    reasoning: 'Sangat Tinggi',
    recommendedFor: 'Pemecahan masalah struktural, logika algoritma, dan telaah kritis',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek R1 (Reasoner)',
    category: 'Penalaran Mendalam & Analisis',
    tag: 'R1 • Penalaran Mendalam',
    description: 'Model reasoning canggih DeepSeek-R1 dengan proses berpikir bertahap (Chain-of-Thought) untuk analisis kognitif, CBT mendalam, dan pemecahan masalah kompleks.',
    speed: 'Sedang',
    reasoning: 'Sangat Tinggi',
    recommendedFor: 'Restrukturisasi kognitif mendalam, analisis kasus skripsi/karya ilmiah, dan pemecahan masalah kompleks',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'groq-gpt-120b',
    name: 'Groq • GPT-OSS 120B',
    category: 'Penalaran Mendalam & Analisis',
    tag: 'Groq • Kapasitas Besar',
    description: 'Model open-weight 120B parameter berkemampuan tinggi dengan akselerasi Groq LPU, ideal untuk analisis komprehensif dan penalaran kompleks.',
    speed: 'Cepat',
    reasoning: 'Sangat Tinggi',
    recommendedFor: 'Analisis masalah mendalam, eksplorasi psikologis terstruktur, dan penalaran bertahap',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    category: 'Penalaran Mendalam & Analisis',
    tag: 'Pro • Penalaran Lanjut',
    description: 'Model penalaran tingkat tinggi untuk analisis kognitif mendalam, CBT lanjutan, dan pemecahan masalah emosional bertingkat.',
    speed: 'Sedang',
    reasoning: 'Sangat Tinggi',
    recommendedFor: 'Analisis masalah kompleks, restrukturisasi kognitif mendalam, dan sesi reflektif intensif',
    allowedTiers: ['Pro', 'Premium']
  },
  {
    id: 'gemini-3.5-pro',
    name: 'Gemini 3.1 Pro',
    category: 'Penalaran Mendalam & Analisis',
    tag: 'Pro • Analisis Mendalam',
    description: 'Model Gemini Pro untuk analisis komprehensif dan pemecahan masalah multi-langkah.',
    speed: 'Sedang',
    reasoning: 'Sangat Tinggi',
    recommendedFor: 'Restrukturisasi kognitif mendalam, analisis komprehensif, dan latihan refleksi terstruktur',
    allowedTiers: ['Pro', 'Premium']
  },

  // --- 2. HIGH PERFORMANCE & BALANCED TIER (Utama & Cerdas) ---
  {
    id: 'openrouter-gemma-4-31b',
    name: 'OpenRouter • Google Gemma 4 31B (Gratis)',
    category: 'Model Utama & Seimbang',
    tag: '100% Gratis • Google Gemma 4',
    description: 'Model generasi terbaru Google Gemma 4 31B Instruct (`:free`) via OpenRouter dengan pemahaman bahasa Indonesia yang sangat natural dan empatik.',
    speed: 'Sangat Cepat',
    reasoning: 'Tinggi',
    recommendedFor: 'Percakapan konseling hangat, penulisan esai, dan diskusi akademik harian',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'openrouter-gemma-4-26b',
    name: 'OpenRouter • Google Gemma 4 26B MoE (Gratis)',
    category: 'Model Utama & Seimbang',
    tag: '100% Gratis • Gemma 4 MoE Cepat',
    description: 'Arsitektur Mixture-of-Experts Google Gemma 4 26B A4B (`:free`) via OpenRouter yang menggabungkan penalaran cerdas dengan respons ekstra cepat.',
    speed: 'Sangat Cepat',
    reasoning: 'Tinggi',
    recommendedFor: 'Brainstorming cepat, pendampingan belajar, dan obrolan reflektif',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'openrouter-minimax-m3.1-flash',
    name: 'OpenRouter • MiniMax M3.1 Flash (Gratis)',
    category: 'Model Utama & Seimbang',
    tag: '100% Gratis • 1M Konteks Flash',
    description: 'Model MiniMax M3.1 Flash (`:free`) dengan jendela konteks 1 juta token, penalaran adaptif cepat, dan gaya bahasa yang luwes.',
    speed: 'Sangat Cepat',
    reasoning: 'Tinggi',
    recommendedFor: 'Rangkuman dokumen besar, obrolan interaktif cepat, dan penyusunan draf',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'openrouter-cohere-code',
    name: 'OpenRouter • Cohere North Mini Code (Gratis)',
    category: 'Model Utama & Seimbang',
    tag: '100% Gratis • Spesialis Kode & Logika',
    description: 'Model cerdas dari Cohere via OpenRouter (`:free`) yang dioptimalkan untuk sintaksis pemrograman, logika terstruktur, dan analisis teknis bebas kuota.',
    speed: 'Sangat Cepat',
    reasoning: 'Tinggi',
    recommendedFor: 'Tugas pemrograman, analisis kode teknis, dan penalaran logika terstruktur',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'openrouter-laguna-s',
    name: 'OpenRouter • Poolside Laguna S 2.1 (Gratis)',
    category: 'Model Utama & Seimbang',
    tag: '100% Gratis • Coding & Engineering',
    description: 'Model spesialis software engineering Poolside Laguna S 2.1 (`:free`) dengan konteks 262K untuk penulisan kode dan debugging.',
    speed: 'Cepat',
    reasoning: 'Tinggi',
    recommendedFor: 'Pemrograman, debugging kode, arsitektur perangkat lunak, dan tugas praktikum IT',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'openrouter-xing-29b',
    name: 'OpenRouter • XingChen Xing 4.0 29B (Gratis)',
    category: 'Model Utama & Seimbang',
    tag: '100% Gratis • MoE 29B Seimbang',
    description: 'Model XingChen 4.0 29B A4B (`:free`) dengan konteks 262K untuk percakapan multibahasa dan sintesis materi kuliah.',
    speed: 'Sangat Cepat',
    reasoning: 'Tinggi',
    recommendedFor: 'Diskusi akademik, terjemahan ilmiah, dan tanya jawab cepat',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'openrouter-dots-note',
    name: 'OpenRouter • Dots Studio Dots3-Note (Gratis)',
    category: 'Model Utama & Seimbang',
    tag: '100% Gratis • Spesialis Catatan 512K',
    description: 'Model Dots3-Note Preview (`:free`) dengan konteks 512K yang dirancang khusus untuk merangkum catatan kuliah, jurnal, dan poin-poin penting.',
    speed: 'Sangat Cepat',
    reasoning: 'Tinggi',
    recommendedFor: 'Merangkum materi kuliah, menyusun catatan Canvas, dan ekstraksi poin kunci',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'deepseek-chat',
    name: 'DeepSeek V3 (Chat)',
    category: 'Model Utama & Seimbang',
    tag: 'Populer • Cerdas & Cepat',
    description: 'Model percakapan unggulan DeepSeek-V3 dengan pemahaman bahasa alami yang sangat luwes, responsif, dan kaya empati.',
    speed: 'Sangat Cepat',
    reasoning: 'Tinggi',
    recommendedFor: 'Percakapan konseling interaktif, active listening, refleksi emosi hangat, dan diskusi harian',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    category: 'Model Utama & Seimbang',
    tag: 'Cerdas & Empatik',
    description: 'Model multimodal generasi 3.7 dengan penalaran adaptif, active listening terfokus, dan pemahaman nuansa psikologis yang mendalam.',
    speed: 'Cepat',
    reasoning: 'Tinggi',
    recommendedFor: 'Refleksi emosional mendalam, eksplorasi perasaan, dan bimbingan terarah',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash',
    category: 'Model Utama & Seimbang',
    tag: 'Multimodal • Seimbang',
    description: 'Model Flash multimodal untuk percakapan, pemahaman dokumen, dan tugas sehari-hari.',
    speed: 'Cepat',
    reasoning: 'Tinggi',
    recommendedFor: 'Percakapan, rangkuman, dan analisis dokumen',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash Preview',
    category: 'Model Utama & Seimbang',
    tag: 'Preview • Multimodal',
    description: 'Model Gemini Flash pratinjau untuk percakapan cepat dan tugas multimodal.',
    speed: 'Cepat',
    reasoning: 'Tinggi',
    recommendedFor: 'Eksperimen fitur Gemini terbaru dan percakapan multimodal',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    category: 'Model Utama & Seimbang',
    tag: 'Stabil & Cepat',
    description: 'Model generasi 3.5 berkecepatan tinggi dengan pemrosesan konsisten dan stabilitas respons pendampingan terpercaya.',
    speed: 'Sangat Cepat',
    reasoning: 'Tinggi',
    recommendedFor: 'Pendampingan konseling umum yang stabil, cepat, dan teruji',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'gemini-flash-latest',
    name: 'Gemini Flash Latest',
    category: 'Model Utama & Seimbang',
    tag: 'Auto-Updated • Rilis Terkini',
    description: 'Alias model dinamis yang otomatis menggunakan versi Flash paling mutakhir yang disediakan oleh Google AI.',
    speed: 'Sangat Cepat',
    reasoning: 'Tinggi',
    recommendedFor: 'Pengalaman AI yang selalu terbarukan dengan performa optimal',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },

  // --- 3. ULTRA-FAST & LIGHTWEIGHT TIER (Respons Kilat / Minim Latensi) ---
  {
    id: 'openrouter-nemotron-lightning',
    name: 'OpenRouter • NVIDIA Nemotron 3.5 Lightning (Gratis)',
    category: 'Ultra-Cepat & Ringan',
    tag: '100% Gratis • Lightning 1M Konteks',
    description: 'Model ultra cepat NVIDIA Nemotron 3.5 Lightning via OpenRouter (`:free`), dirancang khusus untuk kecepatan eksekusi tinggi dan respon dinamis.',
    speed: 'Sangat Cepat',
    reasoning: 'Tinggi',
    recommendedFor: 'Tanggapan instan, pendampingan responsif cepat, dan obrolan hemat waktu',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'openrouter-inkling-small',
    name: 'OpenRouter • Thinking Machines Inkling Small (Gratis)',
    category: 'Ultra-Cepat & Ringan',
    tag: '100% Gratis • Ringan 1M Konteks',
    description: 'Varian cepat Thinking Machines Inkling Small (`:free`) dengan konteks 1 juta token untuk respons kilat dan akurat.',
    speed: 'Sangat Cepat',
    reasoning: 'Tinggi',
    recommendedFor: 'Tanya jawab cepat, parafrase kalimat, dan diskusi ringan',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'openrouter-laguna-xs',
    name: 'OpenRouter • Poolside Laguna XS 2.1 (Gratis)',
    category: 'Ultra-Cepat & Ringan',
    tag: '100% Gratis • Kode & Teks Kilat',
    description: 'Model ultra-ringan Poolside Laguna XS 2.1 (`:free`) untuk bantuan koding instan dan jawaban ringkas tanpa jeda.',
    speed: 'Sangat Cepat',
    reasoning: 'Standar',
    recommendedFor: 'Potongan kode cepat, penjelasan singkat, dan obrolan santai',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'openrouter-lfm-2.6b',
    name: 'OpenRouter • LiquidAI LFM 2.5 2.6B (Gratis)',
    category: 'Ultra-Cepat & Ringan',
    tag: '100% Gratis • Liquid Foundation Model',
    description: 'Model arsitektur LiquidAI LFM 2.5 (`:free`) yang sangat ringan dan responsif untuk percakapan sehari-hari.',
    speed: 'Sangat Cepat',
    reasoning: 'Standar',
    recommendedFor: 'Curhat singkat, sapaan harian, dan ringkasan kilat',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'openrouter-nemotron-safety',
    name: 'OpenRouter • NVIDIA Nemotron 3.5 Safety (Gratis)',
    category: 'Ultra-Cepat & Ringan',
    tag: '100% Gratis • Evaluasi Aman',
    description: 'Model NVIDIA Nemotron 3.5 (`:free`) dengan fokus keamanan konten dan percakapan suportif yang terarah.',
    speed: 'Sangat Cepat',
    reasoning: 'Standar',
    recommendedFor: 'Refleksi aman, pengecekan nada tulisan, dan obrolan ringan',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'groq-qwen-27b',
    name: 'Groq • Qwen 3.8 27B',
    category: 'Ultra-Cepat & Ringan',
    tag: 'Groq • Super Cepat',
    description: 'Model Qwen 3.8 27B dengan akselerasi hardware Groq LPU untuk respon instan, penalaran natural, dan percakapan empati cepat.',
    speed: 'Sangat Cepat',
    reasoning: 'Tinggi',
    recommendedFor: 'Percakapan konseling interaktif instan, active listening cepat, refleksi ramah tanpa jeda tunggu',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'groq-gpt-20b',
    name: 'Groq • GPT-OSS 20B',
    category: 'Ultra-Cepat & Ringan',
    tag: 'Groq • Ringan & Responsif',
    description: 'Model open-weight 20B parameter yang dioptimalkan untuk kecepatan kilat dan pendampingan konseling interaktif.',
    speed: 'Sangat Cepat',
    reasoning: 'Tinggi',
    recommendedFor: 'Curhat santai, tanggapan kilat, dan pendampingan harian hemat waktu',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash Lite',
    category: 'Ultra-Cepat & Ringan',
    tag: 'Ringan & Efisien',
    description: 'Model ringkas generasi 3.5 dengan efisiensi tinggi dan latensi rendah untuk obrolan santai, catatan harian cepat, dan penghematan kuota.',
    speed: 'Sangat Cepat',
    reasoning: 'Standar',
    recommendedFor: 'Obrolan ringan, catatan harian cepat, dan penghematan bandwidth data',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    category: 'Ultra-Cepat & Ringan',
    tag: 'Ringan • Ultra Cepat',
    description: 'Model generasi 3.1 paling ringan dan responsif dengan latensi sangat rendah, ideal untuk percakapan pendampingan harian dan koneksi hemat kuota.',
    speed: 'Sangat Cepat',
    reasoning: 'Standar',
    recommendedFor: 'Percakapan sehari-hari, curhat santai, dan respon instan minim kuota',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'openai-gpt-5.1',
    name: 'OpenAI GPT-5.1',
    category: 'Penalaran Mendalam & Analisis',
    tag: 'OpenAI • Penalaran Lanjut',
    description: 'Model OpenAI untuk coding, analisis, dan workflow bertahap.',
    speed: 'Sedang',
    reasoning: 'Sangat Tinggi',
    recommendedFor: 'Analisis mendalam, coding, dan tugas multi-step',
    allowedTiers: ['Pro', 'Premium']
  },
  {
    id: 'openai-gpt-5-mini',
    name: 'OpenAI GPT-5 mini',
    category: 'Model Utama & Seimbang',
    tag: 'OpenAI • Seimbang',
    description: 'Model OpenAI yang cepat dan efisien untuk pekerjaan sehari-hari.',
    speed: 'Cepat',
    reasoning: 'Tinggi',
    recommendedFor: 'Tugas akademik sehari-hari dan rangkuman',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'openai-gpt-5-nano',
    name: 'OpenAI GPT-5 nano',
    category: 'Ultra-Cepat & Ringan',
    tag: 'OpenAI • Cepat & Hemat',
    description: 'Model OpenAI yang ringan untuk pertanyaan singkat dan rangkuman.',
    speed: 'Sangat Cepat',
    reasoning: 'Standar',
    recommendedFor: 'Pertanyaan singkat dan pekerjaan ringan',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'ollama-qwen3-1.7b',
    name: 'Qwen 3 1.7B via Ollama',
    category: 'Model Tambahan',
    tag: 'Ollama • Ringan',
    description: 'Qwen 3 1.7B melalui endpoint Ollama lokal.',
    isDefault: false,
    speed: 'Sangat Cepat',
    reasoning: 'Standar',
    recommendedFor: 'Model opsional Ollama lokal.',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'ollama-qwen3-8b',
    name: 'Qwen 3 8B via Ollama',
    category: 'Model Tambahan',
    tag: 'Ollama • 8B',
    description: 'Qwen 3 8B melalui endpoint Ollama lokal.',
    isDefault: false,
    speed: 'Sangat Cepat',
    reasoning: 'Tinggi',
    recommendedFor: 'Model opsional Ollama lokal.',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'ollama-bonsai-27b',
    name: 'Bonsai 27B via Ollama',
    category: 'Model Tambahan',
    tag: 'Ollama • 27B',
    description: 'Bonsai 27B melalui endpoint Ollama lokal.',
    isDefault: false,
    speed: 'Cepat',
    reasoning: 'Sangat Tinggi',
    recommendedFor: 'Model opsional Ollama lokal.',
    allowedTiers: ['Free', 'Pro', 'Premium']
  }
];

export const RESILIENT_FALLBACK_AI_MODEL_ID = 'gemini-3.5-flash-lite';

const providerModels: Record<string, { provider: ProviderId; providerModelId: string }> = {
  'ollama-qwen3-1.7b': { provider: 'ollama', providerModelId: 'qwen3:1.7b' },
  'ollama-qwen3-8b': { provider: 'ollama', providerModelId: 'qwen3:8b' },
  'ollama-bonsai-27b': { provider: 'ollama', providerModelId: 'bonsai-27b:latest' },
  'deepseek-reasoner': { provider: 'deepseek', providerModelId: 'deepseek-v4-pro' },
  'deepseek-chat': { provider: 'deepseek', providerModelId: 'deepseek-flash' },
  'gemini-3.5-pro': { provider: 'gemini', providerModelId: 'gemini-3.1-pro-preview' },

  // STRICT 100% FREE OPENROUTER MODELS (:free / openrouter/free ONLY)
  'openrouter-free-auto': { provider: 'openrouter', providerModelId: 'openrouter/free' },
  'openrouter-nemotron-550b': { provider: 'openrouter', providerModelId: 'nvidia/nemotron-3-ultra-550b-a55b:free' },
  'openrouter-nemotron-super-120b': { provider: 'openrouter', providerModelId: 'nvidia/nemotron-3-super-120b-a12b:free' },
  'openrouter-nemotron-super-vl': { provider: 'openrouter', providerModelId: 'nvidia/nemotron-3.5-super-vl:free' },
  'openrouter-nemotron-nano-omni': { provider: 'openrouter', providerModelId: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free' },
  'openrouter-inkling': { provider: 'openrouter', providerModelId: 'thinkingmachines/inkling:free' },
  'openrouter-flint': { provider: 'openrouter', providerModelId: 'recursive/flint-v1.0:free' },
  'openrouter-gemma-4-31b': { provider: 'openrouter', providerModelId: 'google/gemma-4-31b-it:free' },
  'openrouter-gemma-4-26b': { provider: 'openrouter', providerModelId: 'google/gemma-4-26b-a4b-it:free' },
  'openrouter-minimax-m3.1-flash': { provider: 'openrouter', providerModelId: 'minimax/minimax-m3.1-flash:free' },
  'openrouter-cohere-code': { provider: 'openrouter', providerModelId: 'cohere/north-mini-code:free' },
  'openrouter-laguna-s': { provider: 'openrouter', providerModelId: 'poolside/laguna-s-2.1:free' },
  'openrouter-xing-29b': { provider: 'openrouter', providerModelId: 'xingchen-agi/xing4.0-29b-a4b:free' },
  'openrouter-dots-note': { provider: 'openrouter', providerModelId: 'dots-studio/dots-3-note-preview:free' },
  'openrouter-nemotron-lightning': { provider: 'openrouter', providerModelId: 'nvidia/nemotron-3.5-lightning:free' },
  'openrouter-inkling-small': { provider: 'openrouter', providerModelId: 'thinkingmachines/inkling-small:free' },
  'openrouter-laguna-xs': { provider: 'openrouter', providerModelId: 'poolside/laguna-xs-2.1:free' },
  'openrouter-lfm-2.6b': { provider: 'openrouter', providerModelId: 'liquid/lfm-2.5-2.6b:free' },
  'openrouter-nemotron-safety': { provider: 'openrouter', providerModelId: 'nvidia/nemotron-3.5-content-safety:free' },

  'groq-gpt-120b': { provider: 'groq', providerModelId: 'openai/gpt-oss-120b' },
  'groq-gpt-20b': { provider: 'groq', providerModelId: 'openai/gpt-oss-20b' },
  'groq-qwen-27b': { provider: 'groq', providerModelId: 'qwen/qwen3.8-27b' },
  'openai-gpt-5.1': { provider: 'openai', providerModelId: 'gpt-5.1' },
  'openai-gpt-5-mini': { provider: 'openai', providerModelId: 'gpt-5-mini' },
  'openai-gpt-5-nano': { provider: 'openai', providerModelId: 'gpt-5-nano' },
  'gemini-flash-latest': { provider: 'gemini', providerModelId: 'gemini-3.8-flash' },
};

const OPENROUTER_VISION_MODEL_IDS = new Set([
  'openrouter-nemotron-super-vl',
  'openrouter-nemotron-nano-omni',
  'openrouter-free-auto'
]);

export const AI_MODEL_REGISTRY: readonly AiModelDefinition[] = MODEL_METADATA.map(model => {
  const providerInfo = providerModels[model.id] ?? { provider: 'gemini' as const, providerModelId: model.id };
  const baseCaps: ModelCapability[] = model.reasoning === 'Standar' ? ['chat', 'streaming'] : ['chat', 'streaming', 'reasoning'];

  if (providerInfo.provider === 'gemini') {
    baseCaps.push('vision', 'image_understanding', 'document_ocr', 'tool_calling');
  } else if (providerInfo.provider === 'openrouter') {
    if (OPENROUTER_VISION_MODEL_IDS.has(model.id)) {
      baseCaps.push('vision', 'image_understanding', 'document_ocr');
    }
    if (model.id !== 'openrouter-nemotron-safety') {
      baseCaps.push('tool_calling');
    }
  } else if (providerInfo.provider === 'openai') {
    if (model.id === 'openai-gpt-5.1' || model.id === 'openai-gpt-5-mini') {
      baseCaps.push('vision', 'image_understanding', 'document_ocr', 'tool_calling');
    } else {
      baseCaps.push('tool_calling');
    }
  } else if (providerInfo.provider === 'deepseek' || providerInfo.provider === 'groq') {
    baseCaps.push('tool_calling');
  }

  return {
    ...model,
    ...providerInfo,
    capabilities: baseCaps
  };
});
export const AVAILABLE_AI_MODELS = AI_MODEL_REGISTRY;

/** Only IDs observed in existing callers/preferences are accepted as aliases. */
export const LEGACY_AI_MODEL_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  'openai-gpt-6-luna': 'gemini-3.8-flash',
  'openai-gpt-4o': 'gemini-3.8-flash',
  'openai-gpt-4o-mini': 'gemini-3.5-flash-lite',
  'gpt-4o': 'gemini-3.8-flash',
  'gpt-4o-mini': 'gemini-3.5-flash-lite',
  'gpt-6-luna': 'gemini-3.8-flash',
  'deepseek-r1': 'deepseek-reasoner',
  'qwen/qwen3.8-27b': 'groq-qwen-27b',
  'openai/gpt-oss-120b': 'groq-gpt-120b',
  'openai/gpt-oss-20b': 'groq-gpt-20b',
  'openrouter/free': 'openrouter-free-auto',
  'nvidia/nemotron-3-ultra-550b-a55b:free': 'openrouter-nemotron-550b',
  'nvidia/nemotron-3-super-120b-a12b:free': 'openrouter-nemotron-super-120b',
  'nvidia/nemotron-3.5-super-vl:free': 'openrouter-nemotron-super-vl',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free': 'openrouter-nemotron-nano-omni',
  'thinkingmachines/inkling:free': 'openrouter-inkling',
  'recursive/flint-v1.0:free': 'openrouter-flint',
  'google/gemma-4-31b-it:free': 'openrouter-gemma-4-31b',
  'google/gemma-4-26b-a4b-it:free': 'openrouter-gemma-4-26b',
  'minimax/minimax-m3.1-flash:free': 'openrouter-minimax-m3.1-flash',
  'cohere/north-mini-code:free': 'openrouter-cohere-code',
  'poolside/laguna-s-2.1:free': 'openrouter-laguna-s',
  'xingchen-agi/xing4.0-29b-a4b:free': 'openrouter-xing-29b',
  'dots-studio/dots-3-note-preview:free': 'openrouter-dots-note',
  'nvidia/nemotron-3.5-lightning:free': 'openrouter-nemotron-lightning',
  'thinkingmachines/inkling-small:free': 'openrouter-inkling-small',
  'poolside/laguna-xs-2.1:free': 'openrouter-laguna-xs',
  'liquid/lfm-2.5-2.6b:free': 'openrouter-lfm-2.6b',
  'nvidia/nemotron-3.5-content-safety:free': 'openrouter-nemotron-safety',
  // Redirect legacy paid Ling model to 100% free MiniMax M3.1 Flash (:free)
  'openrouter-ling-flash': 'openrouter-minimax-m3.1-flash',
  'inclusionai/ling-3.0-flash-sante:free': 'openrouter-minimax-m3.1-flash',
  'inclusionai/ling-3.1-flash': 'openrouter-minimax-m3.1-flash',
  'gemini-1.5-flash': 'gemini-3.8-flash',
  'gemini-1.5-pro': 'gemini-3.5-pro',
  'gemini-1.5-flash-8b': 'gemini-3.5-flash-lite',
  'gemini-2.0-flash': 'gemini-3.8-flash',
  'gemini-2.0-flash-lite': 'gemini-3.5-flash-lite',
  'gemini-2.0-flash-thinking-exp': 'gemini-3.1-pro-preview',
  'gemini-2.0-pro-exp': 'gemini-3.5-pro',
  'gemini-2.5-flash': 'gemini-3.5-flash',
  'gemini-2.5-pro': 'gemini-3.5-pro',
  'gemini-2.5-flash-lite': 'gemini-3.5-flash-lite',
  'gemini-flash-latest': 'gemini-3.8-flash'
});

export function getModelDefinition(modelId: string): AiModelDefinition | undefined {
  const canonicalId = LEGACY_AI_MODEL_ALIASES[modelId] || modelId;
  return AI_MODEL_REGISTRY.find(model => model.id === canonicalId);
}

const NON_MODEL_RESPONSE_NAMES: Readonly<Record<string, string>> = Object.freeze({
  'aborted-signal': 'Respons dibatalkan',
  'deterministic-crisis-policy': 'Respons krisis otomatis',
  'deterministic-security-override': 'Respons keamanan otomatis',
  'deterministic-safety-override': 'Respons keamanan otomatis',
  'safety-override': 'Respons keamanan otomatis',
  'local-empathetic-fallback': 'Fallback lokal RuangTenang',
  'local-fallback-no-consent': 'Fallback lokal RuangTenang',
  'local-fallback-error': 'Fallback lokal RuangTenang',
  'local-fallback-stream-error': 'Fallback lokal RuangTenang'
});

/** User-facing name for a catalog model or a deterministic/local response path. */
export function getModelDisplayName(modelId?: string): string | undefined {
  if (!modelId) return undefined;
  return getModelDefinition(modelId)?.name || NON_MODEL_RESPONSE_NAMES[modelId] || 'Model AI RuangTenang';
}

export interface AiProfileMetadata {
  id: AiProfileId;
  name: string;
  scope: 'tenang' | 'kerja';
  tag: string;
  description: string;
  speed: 'Sangat Cepat' | 'Cepat' | 'Sedang';
  reasoning: 'Tinggi' | 'Sangat Tinggi' | 'Standar';
  goal: 'reasoning' | 'speed' | 'balanced';
  isDefault: boolean;
  allowedTiers: ModelTier[];
  candidateModelIds: string[];
}

export const AI_PROFILE_DEFINITIONS: readonly AiProfileMetadata[] = [
  // --- 1. RUANG TENANG PROFILES ---
  {
    id: 'tenang-turbo',
    name: 'Tenang Turbo',
    scope: 'tenang',
    tag: 'Penalaran Mendalam & Refleksi',
    description: 'Prioritaskan kualitas reasoning, pemahaman konteks, dan respons mendalam untuk restrukturisasi kognitif.',
    speed: 'Sedang',
    reasoning: 'Sangat Tinggi',
    goal: 'reasoning',
    isDefault: false,
    allowedTiers: ['Free', 'Pro', 'Premium'],
    candidateModelIds: [
      'gemini-3.8-flash',
      'gemini-4-argon',
      'openrouter-nemotron-550b',
      'openrouter-nemotron-super-120b',
      'openrouter-inkling',
      'openrouter-nemotron-super-vl',
      'openrouter-gemma-4-31b',
      'openrouter-free-auto',
      'openrouter-cohere-code',
      'gemini-3.5-pro',
      'gemini-3.1-pro-preview',
      'gemini-3.7-flash'
    ]
  },
  {
    id: 'tenang-middle',
    name: 'Tenang Middle',
    scope: 'tenang',
    tag: 'Pilihan Utama & Seimbang',
    description: 'Seimbangkan kualitas, kecepatan, dan konsumsi token untuk pendampingan harian yang hangat dan responsif.',
    speed: 'Sangat Cepat',
    reasoning: 'Tinggi',
    goal: 'balanced',
    isDefault: true,
    allowedTiers: ['Free', 'Pro', 'Premium'],
    candidateModelIds: [
      'gemini-3.8-flash',
      'openrouter-gemma-4-31b',
      'openrouter-minimax-m3.1-flash',
      'openrouter-nemotron-lightning',
      'openrouter-gemma-4-26b',
      'openrouter-free-auto',
      'gemini-3.7-flash',
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite'
    ]
  },
  {
    id: 'tenang-low',
    name: 'Tenang Low',
    scope: 'tenang',
    tag: 'Ringan, Cepat & Hemat Kuota',
    description: 'Prioritaskan efisiensi biaya, respons ringan, dan latensi rendah tanpa mengabaikan keselamatan.',
    speed: 'Sangat Cepat',
    reasoning: 'Standar',
    goal: 'speed',
    isDefault: false,
    allowedTiers: ['Free', 'Pro', 'Premium'],
    candidateModelIds: [
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'openrouter-minimax-m3.1-flash',
      'openrouter-nemotron-lightning',
      'openrouter-inkling-small',
      'openrouter-laguna-xs',
      'openrouter-lfm-2.6b',
      'openrouter-free-auto',
      'gemini-3.8-flash'
    ]
  },

  // --- 2. RUANG KERJA PROFILES ---
  {
    id: 'kerja-fast',
    name: 'Kerja Fast',
    scope: 'kerja',
    tag: 'Kecepatan & Ringkas',
    description: 'Optimalkan kecepatan untuk pertanyaan singkat, rangkuman sederhana, dan pekerjaan ringan.',
    speed: 'Sangat Cepat',
    reasoning: 'Standar',
    goal: 'speed',
    isDefault: false,
    allowedTiers: ['Free', 'Pro', 'Premium'],
    candidateModelIds: [
      'gemini-3.5-flash-lite',
      'openrouter-minimax-m3.1-flash',
      'openrouter-nemotron-lightning',
      'openrouter-inkling-small',
      'openrouter-laguna-xs',
      'openrouter-free-auto',
      'gemini-3.8-flash'
    ]
  },
  {
    id: 'kerja-santai',
    name: 'Kerja Santai',
    scope: 'kerja',
    tag: 'Akademik Sehari-hari',
    description: 'Seimbangkan kecepatan, kualitas, dan penggunaan token untuk tugas akademik sehari-hari.',
    speed: 'Cepat',
    reasoning: 'Tinggi',
    goal: 'balanced',
    isDefault: true,
    allowedTiers: ['Free', 'Pro', 'Premium'],
    candidateModelIds: [
      'gemini-3.8-flash',
      'openrouter-gemma-4-31b',
      'openrouter-minimax-m3.1-flash',
      'openrouter-cohere-code',
      'openrouter-laguna-s',
      'openrouter-dots-note',
      'openrouter-free-auto',
      'gemini-3.7-flash',
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite'
    ]
  },
  {
    id: 'kerja-hard',
    name: 'Kerja Hard',
    scope: 'kerja',
    tag: 'Kompleks, Riset & Coding',
    description: 'Prioritaskan reasoning kompleks, analisis dokumen mendalam, coding, penelitian, dan workflow multi-step.',
    speed: 'Sedang',
    reasoning: 'Sangat Tinggi',
    goal: 'reasoning',
    isDefault: false,
    allowedTiers: ['Free', 'Pro', 'Premium'],
    candidateModelIds: [
      'gemini-3.8-flash',
      'gemini-4-argon',
      'openrouter-nemotron-550b',
      'openrouter-nemotron-super-120b',
      'openrouter-inkling',
      'openrouter-flint',
      'openrouter-nemotron-super-vl',
      'openrouter-cohere-code',
      'openrouter-laguna-s',
      'openrouter-free-auto',
      'gemini-3.5-pro',
      'gemini-3.1-pro-preview'
    ]
  }
];

export function getProfileDefinition(profileId: string): AiProfileMetadata | undefined {
  return AI_PROFILE_DEFINITIONS.find(p => p.id === profileId);
}

export function validateProfileMode(profileId: string, isWorkspace: boolean): void {
  if (isTenangProfile(profileId) && isWorkspace) {
    throw new AiModelError('INVALID_PROFILE_FOR_MODE');
  }
  if (isKerjaProfile(profileId) && !isWorkspace) {
    throw new AiModelError('INVALID_PROFILE_FOR_MODE');
  }
}

export function mapLegacyModelToProfile(modelId: string | undefined, isWorkspace: boolean): AiProfileId {
  if (modelId && isAiProfile(modelId)) {
    return modelId;
  }
  if (isWorkspace) {
    if (!modelId || modelId === AUTO_ROUTING_MODEL_ID || modelId === 'default') {
      return DEFAULT_KERJA_PROFILE_ID;
    }
    const def = getModelDefinition(modelId);
    if (def?.reasoning === 'Sangat Tinggi' || modelId.includes('reasoner') || modelId.includes('pro') || modelId.includes('120b') || modelId.includes('550b')) {
      return 'kerja-hard';
    }
    if ((def?.speed === 'Sangat Cepat' && def?.reasoning === 'Standar') || modelId.includes('lite') || modelId.includes('lightning') || modelId.includes('20b')) {
      return 'kerja-fast';
    }
    return DEFAULT_KERJA_PROFILE_ID;
  } else {
    if (!modelId || modelId === AUTO_ROUTING_MODEL_ID || modelId === 'default') {
      return DEFAULT_TENANG_PROFILE_ID;
    }
    const def = getModelDefinition(modelId);
    if (def?.reasoning === 'Sangat Tinggi' || modelId.includes('reasoner') || modelId.includes('pro') || modelId.includes('120b') || modelId.includes('550b')) {
      return 'tenang-turbo';
    }
    if ((def?.speed === 'Sangat Cepat' && def?.reasoning === 'Standar') || modelId.includes('lite') || modelId.includes('lightning') || modelId.includes('20b')) {
      return 'tenang-low';
    }
    return DEFAULT_TENANG_PROFILE_ID;
  }
}

export function getPublicProfileCatalog(tier = 'Free', scope?: 'tenang' | 'kerja'): AiProfileOption[] {
  const filtered = scope ? AI_PROFILE_DEFINITIONS.filter(p => p.scope === scope) : AI_PROFILE_DEFINITIONS;
  return filtered.map(profile => {
    const tierAllowed = isTierAllowed(profile, tier);
    const hasConfiguredCandidate = profile.candidateModelIds.some(modelId => {
      const def = getModelDefinition(modelId);
      return def && isTierAllowed(def, tier) && isProviderConfigured(def.provider) && getProviderHealth(def.provider) !== 'unavailable';
    });
    return {
      id: profile.id,
      name: profile.name,
      scope: profile.scope,
      tag: profile.tag,
      description: profile.description,
      speed: profile.speed,
      reasoning: profile.reasoning,
      goal: profile.goal,
      isDefault: profile.isDefault,
      allowedTiers: profile.allowedTiers,
      available: hasConfiguredCandidate,
      selectable: tierAllowed && hasConfiguredCandidate
    };
  });
}

export type AiModelErrorCode = 'MODEL_NOT_FOUND' | 'MODEL_NOT_ALLOWED' | 'MODEL_UNAVAILABLE' | 'PROVIDER_NOT_CONFIGURED' | 'INVALID_PROFILE_FOR_MODE';
export class AiModelError extends Error {
  constructor(public readonly code: AiModelErrorCode) { super(code); this.name = 'AiModelError'; }
}

export function resolveAiModel(modelId: string, tier = 'Free'): AiModelDefinition {
  if (isAiProfile(modelId)) {
    const profile = getProfileDefinition(modelId);
    if (!profile) throw new AiModelError('MODEL_NOT_FOUND');
    if (!isTierAllowed(profile, tier)) throw new AiModelError('MODEL_NOT_ALLOWED');
    // Prefer candidates whose provider is currently configured and healthy
    for (const candidateId of profile.candidateModelIds) {
      const candidate = getModelDefinition(candidateId);
      if (
        candidate &&
        isTierAllowed(candidate, tier) &&
        candidate.providerModelId &&
        isProviderConfigured(candidate.provider) &&
        getProviderHealth(candidate.provider) !== 'unavailable'
      ) {
        return candidate;
      }
    }
    // Fallback to any tier-allowed candidate in the profile
    for (const candidateId of profile.candidateModelIds) {
      const candidate = getModelDefinition(candidateId);
      if (candidate && isTierAllowed(candidate, tier) && candidate.providerModelId) {
        return candidate;
      }
    }
    const fallback = getModelDefinition(RESILIENT_FALLBACK_AI_MODEL_ID);
    if (fallback) return fallback;
  }
  const model = getModelDefinition(modelId);
  if (!model) throw new AiModelError('MODEL_NOT_FOUND');
  if (!isTierAllowed(model, tier)) throw new AiModelError('MODEL_NOT_ALLOWED');
  if (!model.providerModelId) throw new AiModelError('MODEL_UNAVAILABLE');
  return model;
}

export function getConfiguredDefaultAiModelId(tier = 'Free'): string {
  const candidates = [
    ...AI_MODEL_REGISTRY.filter(model => model.id === DEFAULT_AI_MODEL_ID),
    AI_MODEL_REGISTRY.find(model => model.id === 'openrouter-free-auto'),
    AI_MODEL_REGISTRY.find(model => model.id === 'openrouter-gemma-4-31b'),
    AI_MODEL_REGISTRY.find(model => model.id === 'openrouter-minimax-m3.1-flash'),
    AI_MODEL_REGISTRY.find(model => model.id === RESILIENT_FALLBACK_AI_MODEL_ID),
    ...AI_MODEL_REGISTRY
  ].filter((model): model is AiModelDefinition => Boolean(model));
  return candidates.find(model => isTierAllowed(model, tier) && aiProviderConfig.isConfigured(model.provider) && getProviderHealth(model.provider) !== 'unavailable')?.id
    || AUTO_ROUTING_MODEL_ID;
}

export function getPublicModelCatalog(tier = 'Free') {
  return AI_MODEL_REGISTRY.map(({ id, name, category, tag, description, recommendedFor, speed, reasoning, allowedTiers, provider, capabilities, isDefault }) => {
    const configured = isProviderConfigured(provider);
    const availability = !configured ? 'provider_not_configured' as const : getProviderHealth(provider) === 'unavailable' ? 'temporarily_unavailable' as const : 'configured' as const;
    return {
      id, name, category, tag, description, recommendedFor, speed, reasoning, allowedTiers, provider, capabilities: [...capabilities], isDefault: Boolean(isDefault),
      availability,
      available: configured && availability !== 'temporarily_unavailable',
      providerAvailable: configured && availability !== 'temporarily_unavailable',
      selectable: configured && availability !== 'temporarily_unavailable' && isTierAllowed({ allowedTiers }, tier)
    };
  });
}

export function isOllamaModel(modelId: string): boolean {
  return getModelDefinition(modelId)?.provider === 'ollama';
}

function isProviderConfigured(provider: ProviderId): boolean {
  return aiProviderConfig.isConfigured(provider);
}

export function isOpenAiModel(modelId: string): boolean {
  return getModelDefinition(modelId)?.provider === 'openai';
}

export function isDeepSeekModel(modelId: string): boolean {
  return getModelDefinition(modelId)?.provider === 'deepseek';
}

export function isGroqModel(modelId: string): boolean {
  return getModelDefinition(modelId)?.provider === 'groq';
}

export function isOpenRouterModel(modelId: string): boolean {
  return getModelDefinition(modelId)?.provider === 'openrouter';
}

export function getActualGeminiModel(modelId: string): string {
  const model = getModelDefinition(modelId);
  return model?.provider === 'gemini' ? model.providerModelId : DEFAULT_AI_MODEL_ID;
}

export function getModelInfo(modelId: string): AiModelDefinition {
  return (getModelDefinition(modelId) || AI_MODEL_REGISTRY[0]);
}

export function isModelAllowedForTier(modelId: string, tier: string = 'Free'): boolean {
  const model = getModelDefinition(modelId);
  if (!model) return false;
  return isTierAllowed(model, tier);
}

function isTierAllowed(model: Pick<AiModelDefinition, 'allowedTiers'>, tier: string): boolean {
  const normalizedTier = tier === 'Developer' ? 'Pro' : tier;
  return model.allowedTiers.some(allowedTier => allowedTier === normalizedTier);
}
