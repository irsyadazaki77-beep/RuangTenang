
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

export const DEFAULT_AI_MODEL_ID = 'gemini-3.1-flash-lite';

export const AVAILABLE_AI_MODELS: AiModelOption[] = [
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    category: 'Gemini 3.x Series',
    tag: 'Terbaru • Cepat & Cerdas',
    description: 'Model teks dan multimodal generasi 3.8 terbaru dari Google AI. Keseimbangan terbaik antara pemahaman emosional mendalam, penalaran adaptif, dan respon instan.',
    speed: 'Sangat Cepat',
    reasoning: 'Tinggi',
    recommendedFor: 'Percakapan konseling utama, active listening, refleksi emosi, dan panduan harian',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    category: 'Gemini 3.x Series',
    tag: 'Default • Ultra Cepat & Ringan',
    description: 'Model generasi 3.1 paling ringan dan responsif dengan latensi sangat rendah, ideal untuk percakapan pendampingan harian dan koneksi hemat kuota.',
    isDefault: true,
    speed: 'Sangat Cepat',
    reasoning: 'Standar',
    recommendedFor: 'Percakapan sehari-hari, curhat santai, dan respon instan minim kuota',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    category: 'Gemini 3.x Series',
    tag: 'Cerdas & Empatik',
    description: 'Model multimodal generasi 3.7 dengan penalaran adaptif, active listening terfokus, dan pemahaman nuansa psikologis yang mendalam.',
    speed: 'Cepat',
    reasoning: 'Tinggi',
    recommendedFor: 'Refleksi emosional mendalam, eksplorasi perasaan, dan bimbingan terarah',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    category: 'Gemini 3.x Series',
    tag: 'Pro • Penalaran Lanjut',
    description: 'Model penalaran tingkat tinggi untuk analisis kognitif mendalam, CBT lanjutan, dan pemecahan masalah emosional bertingkat.',
    speed: 'Sedang',
    reasoning: 'Sangat Tinggi',
    recommendedFor: 'Analisis masalah kompleks, restrukturisasi kognitif mendalam, dan sesi reflektif intensif',
    allowedTiers: ['Pro', 'Premium']
  },
  {
    id: 'gemini-flash-latest',
    name: 'Gemini Flash Latest',
    category: 'Gemini Dynamic',
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
    category: 'Gemini 2.5 Series',
    tag: 'Stabil & Teruji',
    description: 'Model generasi 2.5 dengan stabilitas tinggi dan konsistensi respon pendampingan terpercaya.',
    speed: 'Cepat',
    reasoning: 'Standar',
    recommendedFor: 'Pendampingan konseling umum yang stabil dan teruji',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    category: 'Gemini 2.5 Series',
    tag: 'Refleksi Terstruktur',
    description: 'Model berorientasi penalaran terstruktur untuk eksplorasi psikologis dan latihan pemikiran bertahap.',
    speed: 'Sedang',
    reasoning: 'Tinggi',
    recommendedFor: 'Latihan CBT terstruktur dan pemetaan pikiran bertahap',
    allowedTiers: ['Pro', 'Premium']
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    category: 'Gemini 2.5 Series',
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
