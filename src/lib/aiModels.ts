export interface AiModelOption {
  id: string;
  name: string;
  category: string;
  tag: string;
  description: string;
  isDefault?: boolean;
  speed: 'Sangat Cepat' | 'Cepat' | 'Sedang';
  reasoning: 'Tinggi' | 'Sangat Tinggi' | 'Standar';
  recommendedFor: string;
  allowedTiers: string[];
}

export const DEFAULT_AI_MODEL_ID = 'gemini-3.8-flash';

/**
 * Urutan Model AI dikelompokkan dan diurutkan berdasarkan tier kapabilitas:
 * 1. Deep Reasoning & Frontier Tier (Penalaran Sangat Tinggi)
 * 2. High-Performance Balanced & Empathetic Tier (Penalaran Tinggi & Cepat)
 * 3. Ultra-Fast LPU & Lightweight Tier (Respon Instan / Hemat Kuota)
 */
export const AVAILABLE_AI_MODELS: AiModelOption[] = [
  // --- 1. FRONTIER & DEEP REASONING TIER (Sangat Tinggi) ---
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
    id: 'openrouter-nemotron-550b',
    name: 'OpenRouter • Nemotron 550B',
    category: 'Penalaran Mendalam & Analisis',
    tag: 'OpenRouter • Ultra 550B',
    description: 'Model raksasa 550B parameter dari NVIDIA via OpenRouter dengan kapasitas pemahaman tingkat lanjut dan analisis multi-domain.',
    speed: 'Sedang',
    reasoning: 'Sangat Tinggi',
    recommendedFor: 'Analisis mendalam, penalaran bertahap, dan pemecahan masalah kompleks berbobot tinggi',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'openrouter-nemotron-super-120b',
    name: 'OpenRouter • Nemotron 120B',
    category: 'Penalaran Mendalam & Analisis',
    tag: 'OpenRouter • Super 120B',
    description: 'Model NVIDIA Nemotron 120B parameter via OpenRouter yang kuat dalam penalaran terstruktur dan artikulasi bahasa ilmiah.',
    speed: 'Cepat',
    reasoning: 'Sangat Tinggi',
    recommendedFor: 'Eksplorasi masalah akademis/skripsi dan restrukturisasi pola pikir kognitif',
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
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    category: 'Penalaran Mendalam & Analisis',
    tag: 'Refleksi Terstruktur',
    description: 'Model berorientasi penalaran terstruktur untuk eksplorasi psikologis dan latihan pemikiran bertahap.',
    speed: 'Sedang',
    reasoning: 'Tinggi',
    recommendedFor: 'Latihan CBT terstruktur dan pemetaan pikiran bertahap',
    allowedTiers: ['Pro', 'Premium']
  },

  // --- 2. HIGH PERFORMANCE & BALANCED TIER (Utama & Cerdas) ---
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
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    category: 'Model Utama & Seimbang',
    tag: 'Stabil & Teruji',
    description: 'Model generasi 2.5 dengan stabilitas tinggi dan konsistensi respon pendampingan terpercaya.',
    speed: 'Cepat',
    reasoning: 'Standar',
    recommendedFor: 'Pendampingan konseling umum yang stabil dan teruji',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },

  // --- 3. ULTRA-FAST & LIGHTWEIGHT TIER (Respons Kilat / Minim Latensi) ---
  {
    id: 'openrouter-nemotron-lightning',
    name: 'OpenRouter • Nemotron Lightning',
    category: 'Ultra-Cepat & Ringan',
    tag: 'OpenRouter • Lightning',
    description: 'Model ultra cepat NVIDIA Nemotron 3.5 Lightning via OpenRouter, dirancang khusus untuk kecepatan eksekusi tinggi dan respon dinamis.',
    speed: 'Sangat Cepat',
    reasoning: 'Tinggi',
    recommendedFor: 'Tanggapan instan, pendampingan responsif cepat, dan obrolan hemat waktu',
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
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    category: 'Ultra-Cepat & Ringan',
    tag: 'Ringan & Hemat Kuota',
    description: 'Model ringkas hemat resource untuk obrolan santai dan catatan harian cepat.',
    speed: 'Sangat Cepat',
    reasoning: 'Standar',
    recommendedFor: 'Obrolan ringan dan penghematan bandwidth data',
    allowedTiers: ['Free', 'Pro', 'Premium']
  }
];

export function getModelInfo(modelId: string): AiModelOption {
  const found = AVAILABLE_AI_MODELS.find(m => m.id === modelId);
  return found || AVAILABLE_AI_MODELS[0];
}
