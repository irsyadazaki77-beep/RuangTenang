
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
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    category: 'Gemini 3.x Series',
    tag: 'Default • Ultra Cepat',
    description: 'Model generasi 3.1 paling ringan dan responsif, latensi sangat rendah, ideal untuk percakapan pendampingan harian.',
    isDefault: true,
    speed: 'Sangat Cepat',
    reasoning: 'Standar',
    recommendedFor: 'Percakapan sehari-hari, curhat santai, dan respon instan',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    category: 'Gemini 3.x Series',
    tag: 'Terbaru • Cerdas & Empatik',
    description: 'Model multimodal generasi 3.7 terkini dengan penalaran adaptif, active listening, dan pemahaman emosi mendalam.',
    speed: 'Cepat',
    reasoning: 'Tinggi',
    recommendedFor: 'Refleksi emosional mendalam, active listening, dan eksplorasi perasaan',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    category: 'Gemini 3.x Series',
    tag: 'Pro • Penalaran Lanjut',
    description: 'Model penalaran tingkat tinggi untuk pemecahan masalah emosional kompleks dan analisis kognitif mendalam.',
    speed: 'Sedang',
    reasoning: 'Sangat Tinggi',
    recommendedFor: 'Analisis masalah kompleks, restrukturisasi kognitif, dan kasus berat',
    allowedTiers: ['Pro', 'Premium']
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    category: 'Gemini 2.5 Series',
    tag: 'Stabil & Seimbang',
    description: 'Model stabil dan cepat dengan keseimbangan prima antara kecepatan respon dan kualitas refleksi emosional.',
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
    description: 'Model berorientasi penalaran mendalam untuk eksplorasi psikologis dan restrukturisasi kognitif bertahap.',
    speed: 'Sedang',
    reasoning: 'Tinggi',
    recommendedFor: 'Latihan CBT terstruktur dan pemetaan pikiran bertahap',
    allowedTiers: ['Pro', 'Premium']
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    category: 'Gemini 2.5 Series',
    tag: 'Ringan & Efisien',
    description: 'Model ringkas hemat resource untuk obrolan santai dan catatan harian cepat.',
    speed: 'Sangat Cepat',
    reasoning: 'Standar',
    recommendedFor: 'Obrolan ringan dan hemat kuota data',
    allowedTiers: ['Free', 'Pro', 'Premium']
  }
];

export function getModelInfo(modelId: string): AiModelOption {
  const found = AVAILABLE_AI_MODELS.find(m => m.id === modelId);
  return found || AVAILABLE_AI_MODELS[0];
}
