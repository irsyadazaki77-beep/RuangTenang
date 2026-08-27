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

export const AVAILABLE_AI_MODELS: AiModelOption[] = [
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    category: 'Gemini 3.x Series',
    tag: 'Default • Ultra Cepat',
    description: 'Model generasi 3.1 paling ringan dan responsif, latensi sangat rendah.',
    isDefault: true,
    speed: 'Sangat Cepat',
    reasoning: 'Standar',
    recommendedFor: 'Percakapan sehari-hari',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    category: 'Gemini 3.x Series',
    tag: 'Terbaru • Cerdas & Empatik',
    description: 'Model multimodal generasi 3.7 terkini.',
    speed: 'Cepat',
    reasoning: 'Tinggi',
    recommendedFor: 'Refleksi emosional',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    category: 'Gemini 3.x Series',
    tag: 'Pro • Penalaran Lanjut',
    description: 'Model penalaran tingkat tinggi.',
    speed: 'Sedang',
    reasoning: 'Sangat Tinggi',
    recommendedFor: 'Analisis masalah kompleks',
    allowedTiers: ['Pro', 'Premium']
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    category: 'Gemini 2.5 Series',
    tag: 'Stabil & Seimbang',
    description: 'Model stabil dan cepat.',
    speed: 'Cepat',
    reasoning: 'Standar',
    recommendedFor: 'Pendampingan umum',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    category: 'Gemini 2.5 Series',
    tag: 'Refleksi Terstruktur',
    description: 'Model berorientasi penalaran mendalam.',
    speed: 'Sedang',
    reasoning: 'Tinggi',
    recommendedFor: 'Latihan CBT terstruktur',
    allowedTiers: ['Pro', 'Premium']
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    category: 'Gemini 2.5 Series',
    tag: 'Ringan & Efisien',
    description: 'Model ringkas hemat resource.',
    speed: 'Sangat Cepat',
    reasoning: 'Standar',
    recommendedFor: 'Obrolan ringan',
    allowedTiers: ['Free', 'Pro', 'Premium']
  }
];

export const DEFAULT_AI_MODEL_ID = 'gemini-3.1-flash-lite';

export function getActualGeminiModel(modelId: string): string {
  const map: Record<string, string> = {
    'gemini-3.1-flash-lite': 'gemini-2.5-flash',
    'gemini-3.7-flash': 'gemini-2.5-flash',
    'gemini-3.1-pro-preview': 'gemini-2.5-pro',
    'gemini-2.5-flash': 'gemini-2.5-flash',
    'gemini-2.5-pro': 'gemini-2.5-pro',
    'gemini-2.5-flash-lite': 'gemini-2.5-flash',
  };
  return map[modelId] || 'gemini-2.5-flash';
}

export function getModelInfo(modelId: string): AiModelOption {
  return AVAILABLE_AI_MODELS.find(m => m.id === modelId) || AVAILABLE_AI_MODELS[0];
}

export function isModelAllowedForTier(modelId: string, tier: string = 'Free'): boolean {
  const model = AVAILABLE_AI_MODELS.find(m => m.id === modelId);
  if (!model) return false;
  return model.allowedTiers.includes(tier);
}
