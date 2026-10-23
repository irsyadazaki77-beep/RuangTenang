import { isLocalModelAvailable } from './ollamaRuntime.js';
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
  { id: 'ollama-phi4-mini', name: 'Phi 4 Mini via Ollama', category: 'Penalaran Mendalam & Analisis', tag: 'Ollama • Lokal', description: 'Coding, penulisan terstruktur, dan tugas harian.', speed: 'Cepat', reasoning: 'Tinggi', recommendedFor: 'Coding, penulisan terstruktur, dan tugas harian.', allowedTiers: ['Free', 'Pro', 'Premium'] },
  { id: 'ollama-deepseek-r1-1.5b', name: 'DeepSeek R1 1.5B via Ollama', category: 'Penalaran Mendalam & Analisis', tag: 'Ollama • Lokal', description: 'Logika, matematika, dan penalaran ringan.', speed: 'Cepat', reasoning: 'Tinggi', recommendedFor: 'Logika, matematika, dan penalaran ringan.', allowedTiers: ['Free', 'Pro', 'Premium'] },
  { id: 'ollama-gemma3-270m', name: 'Gemma 3 270M via Ollama', category: 'Ultra-Cepat & Ringan', tag: 'Ollama • Lokal', description: 'Percakapan sangat singkat dan fallback hemat memori.', speed: 'Sangat Cepat', reasoning: 'Standar', recommendedFor: 'Percakapan sangat singkat dan fallback hemat memori.', allowedTiers: ['Free', 'Pro', 'Premium'] },

  {
    id: 'ollama-gemma3-1b',
    name: 'Gemma 3 1B via Ollama',
    category: 'Model Utama & Seimbang',
    tag: 'Ollama • 1B Super Cepat',
    description: 'Google Gemma 3 1B melalui Ollama lokal. Sangat ringan, efisien, dan responsif untuk konsultasi cepat.',
    isDefault: false,
    speed: 'Sangat Cepat',
    reasoning: 'Standar',
    recommendedFor: 'Percakapan ringan, respons instan, dan konsultasi bebas kuota.',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'ollama-qwen3.5-0.8b',
    name: 'Qwen 3.5 0.8B via Ollama',
    category: 'Model Utama & Seimbang',
    tag: 'Ollama • 0.8B Ringan',
    description: 'Qwen 3.5 0.8B melalui Ollama lokal. Arsitektur terbaru dengan efisiensi memori luar biasa.',
    isDefault: false,
    speed: 'Sangat Cepat',
    reasoning: 'Standar',
    recommendedFor: 'Percakapan cepat, tanya-jawab ringkas, dan pendampingan santai.',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'ollama-qwen3-1.7b',
    name: 'Qwen 3 1.7B via Ollama',
    category: 'Model Utama & Seimbang',
    tag: 'Ollama • Ringan',
    description: 'Qwen 3 1.7B melalui endpoint Ollama yang dikonfigurasi. Lokasi pemrosesan mengikuti host endpoint; kebutuhan memori dan latensi bergantung pada perangkat serta konfigurasi model.',
    isDefault: true,
    speed: 'Sangat Cepat',
    reasoning: 'Standar',
    recommendedFor: 'Pertanyaan singkat dan percakapan ringan; kemampuan bergantung pada konfigurasi host.',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'ollama-qwen3-8b',
    name: 'Qwen 3 8B via Ollama',
    category: 'Model Utama & Seimbang',
    tag: 'Ollama • 8B Berbobot',
    description: 'Qwen 3 8B melalui endpoint Ollama. Membutuhkan alokasi memori RAM/VRAM yang cukup agar respon optimal.',
    isDefault: false,
    speed: 'Sedang',
    reasoning: 'Tinggi',
    recommendedFor: 'Percakapan dan asistensi tugas mendalam saat perangkat memiliki memori longgar.',
    allowedTiers: ['Free', 'Pro', 'Premium']
  },
  {
    id: 'ollama-bonsai-27b',
    name: 'Bonsai 27B via Ollama',
    category: 'Model Utama & Seimbang',
    tag: 'Ollama • 27B Analisis Berat',
    description: 'Bonsai 27B melalui endpoint Ollama. Model besar untuk analisis mendalam dengan proses inferensi bertahap.',
    isDefault: false,
    speed: 'Sedang',
    reasoning: 'Sangat Tinggi',
    recommendedFor: 'Analisis percakapan dan tugas kompleks (membutuhkan waktu komputasi lebih panjang).',
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
  {
    id: 'openrouter-cohere-code',
    name: 'OpenRouter • Cohere North Code',
    category: 'Model Utama & Seimbang',
    tag: 'OpenRouter • Spesialis Kode & Logika',
    description: 'Model cerdas dari Cohere via OpenRouter yang dioptimalkan untuk sintaksis pemrograman, logika terstruktur, dan analisis teknis bebas kuota.',
    speed: 'Sangat Cepat',
    reasoning: 'Tinggi',
    recommendedFor: 'Tugas pemrograman, analisis kode teknis, dan penalaran logika terstruktur',
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
    id: 'openrouter-ling-flash',
    name: 'OpenRouter • Ling 3.1 Flash',
    category: 'Ultra-Cepat & Ringan',
    tag: 'OpenRouter • Kilat & Efisien',
    description: 'Model ultra responsif Ling 3.1 Flash via OpenRouter dengan jendela konteks 256k untuk respons ringan dan cepat.',
    speed: 'Sangat Cepat',
    reasoning: 'Standar',
    recommendedFor: 'Tanggapan kilat, obrolan ringan, dan ringkasan cepat',
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
  }
];

export const RESILIENT_FALLBACK_AI_MODEL_ID = 'ollama-qwen3-1.7b';

const providerModels: Record<string, { provider: ProviderId; providerModelId: string }> = {
  'ollama-phi4-mini': { provider: 'ollama', providerModelId: 'phi4-mini:latest' },
  'ollama-deepseek-r1-1.5b': { provider: 'ollama', providerModelId: 'deepseek-r1:1.5b' },
  'ollama-gemma3-270m': { provider: 'ollama', providerModelId: 'gemma3:270m' },
  'ollama-gemma3-1b': { provider: 'ollama', providerModelId: 'gemma3:1b' },
  'ollama-qwen3.5-0.8b': { provider: 'ollama', providerModelId: 'qwen3.5:0.8b' },
  'ollama-qwen3-1.7b': { provider: 'ollama', providerModelId: 'qwen3:1.7b' },
  'ollama-qwen3-8b': { provider: 'ollama', providerModelId: 'qwen3:8b' },
  'ollama-bonsai-27b': { provider: 'ollama', providerModelId: 'bonsai-27b:latest' },
  'deepseek-reasoner': { provider: 'deepseek', providerModelId: 'deepseek-v4-pro' },
  'deepseek-chat': { provider: 'deepseek', providerModelId: 'deepseek-flash' },
  'gemini-3.5-pro': { provider: 'gemini', providerModelId: 'gemini-3.1-pro-preview' },
  'openrouter-nemotron-550b': { provider: 'openrouter', providerModelId: 'nvidia/nemotron-3-ultra-550b-a55b:free' },
  'openrouter-nemotron-super-120b': { provider: 'openrouter', providerModelId: 'nvidia/nemotron-3-super-120b-a12b:free' },
  'openrouter-nemotron-lightning': { provider: 'openrouter', providerModelId: 'nvidia/nemotron-3.5-lightning:free' },
  'openrouter-cohere-code': { provider: 'openrouter', providerModelId: 'cohere/north-mini-code:free' },
  'openrouter-ling-flash': { provider: 'openrouter', providerModelId: 'inclusionai/ling-3.1-flash' },
  'groq-gpt-120b': { provider: 'groq', providerModelId: 'openai/gpt-oss-120b' },
  'groq-gpt-20b': { provider: 'groq', providerModelId: 'openai/gpt-oss-20b' },
  'groq-qwen-27b': { provider: 'groq', providerModelId: 'qwen/qwen3.8-27b' },
  'openai-gpt-5.1': { provider: 'openai', providerModelId: 'gpt-5.1' },
  'openai-gpt-5-mini': { provider: 'openai', providerModelId: 'gpt-5-mini' },
  'openai-gpt-5-nano': { provider: 'openai', providerModelId: 'gpt-5-nano' },
  'gemini-flash-latest': { provider: 'gemini', providerModelId: 'gemini-3.8-flash' },
};

export const AI_MODEL_REGISTRY: readonly AiModelDefinition[] = MODEL_METADATA.map(model => {
  const providerInfo = providerModels[model.id] ?? { provider: 'gemini' as const, providerModelId: model.id };
  const baseCaps: ModelCapability[] = model.reasoning === 'Standar' ? ['chat', 'streaming'] : ['chat', 'streaming', 'reasoning'];

  // Multimodal Vision & OCR capabilities:
  // Gemini chat models support multimodal input and function calling. Audio transcription
  // is only advertised by dedicated transcription models, which are not chat models.
  // OpenAI gpt-5.1 & gpt-5-mini support vision, image_understanding, document_ocr, and tool_calling
  if (model.id === 'ollama-qwen3.5-0.8b') {
    baseCaps.push('vision', 'image_understanding', 'document_ocr');
  }
  if (providerInfo.provider === 'gemini') {
    baseCaps.push('vision', 'image_understanding', 'document_ocr', 'tool_calling');
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
  'nvidia/nemotron-3-ultra-550b-a55b:free': 'openrouter-nemotron-550b',
  'nvidia/nemotron-3-super-120b-a12b:free': 'openrouter-nemotron-super-120b',
  'nvidia/nemotron-3.5-lightning:free': 'openrouter-nemotron-lightning',
  'cohere/north-mini-code:free': 'openrouter-cohere-code',
  'inclusionai/ling-3.0-flash-sante:free': 'openrouter-ling-flash',
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
      'ollama-phi4-mini',
      'ollama-deepseek-r1-1.5b',
      'ollama-gemma3-270m',
      'ollama-gemma3-1b',
      'ollama-qwen3.5-0.8b',
      'ollama-qwen3-1.7b',
      'ollama-qwen3-8b',
      'ollama-bonsai-27b',
      'gemini-3.5-pro',
      'gemini-3.1-pro-preview',
      'deepseek-reasoner',
      'groq-gpt-120b',
      'openai-gpt-5.1',
      'openrouter-nemotron-550b',
      'openrouter-nemotron-super-120b',
      'gemini-3.8-flash'
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
      'ollama-phi4-mini',
      'ollama-deepseek-r1-1.5b',
      'ollama-gemma3-270m',
      'ollama-gemma3-1b',
      'ollama-qwen3.5-0.8b',
      'ollama-qwen3-1.7b',
      'ollama-qwen3-8b',
      'ollama-bonsai-27b',
      'gemini-3.8-flash',
      'deepseek-chat',
      'gemini-3.7-flash',
      'gemini-3.5-flash',
      'groq-qwen-27b',
      'openrouter-nemotron-lightning',
      'openai-gpt-5-mini',
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
      'ollama-phi4-mini',
      'ollama-deepseek-r1-1.5b',
      'ollama-gemma3-270m',
      'ollama-gemma3-1b',
      'ollama-qwen3.5-0.8b',
      'ollama-qwen3-1.7b',
      'ollama-qwen3-8b',
      'ollama-bonsai-27b',
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'groq-gpt-20b',
      'openrouter-ling-flash',
      'openai-gpt-5-nano',
      'groq-qwen-27b',
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
      'ollama-phi4-mini',
      'ollama-deepseek-r1-1.5b',
      'ollama-gemma3-270m',
      'ollama-gemma3-1b',
      'ollama-qwen3.5-0.8b',
      'ollama-qwen3-1.7b',
      'ollama-qwen3-8b',
      'ollama-bonsai-27b',
      'gemini-3.5-flash-lite',
      'groq-gpt-20b',
      'openrouter-ling-flash',
      'groq-qwen-27b',
      'openrouter-nemotron-lightning',
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
      'ollama-phi4-mini',
      'ollama-deepseek-r1-1.5b',
      'ollama-gemma3-270m',
      'ollama-gemma3-1b',
      'ollama-qwen3.5-0.8b',
      'ollama-qwen3-1.7b',
      'ollama-qwen3-8b',
      'ollama-bonsai-27b',
      'gemini-3.8-flash',
      'deepseek-chat',
      'openrouter-cohere-code',
      'groq-qwen-27b',
      'gemini-3.7-flash',
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'openai-gpt-5-mini'
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
      'ollama-phi4-mini',
      'ollama-deepseek-r1-1.5b',
      'ollama-gemma3-270m',
      'ollama-gemma3-1b',
      'ollama-qwen3.5-0.8b',
      'ollama-qwen3-1.7b',
      'ollama-qwen3-8b',
      'ollama-bonsai-27b',
      'gemini-3.5-pro',
      'gemini-3.1-pro-preview',
      'deepseek-reasoner',
      'groq-gpt-120b',
      'openrouter-nemotron-550b',
      'openrouter-nemotron-super-120b',
      'openrouter-cohere-code',
      'openai-gpt-5.1',
      'gemini-3.8-flash'
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
      return def && isTierAllowed(def, tier) && isRegisteredModelAvailable(def) && getProviderHealth(def.provider) !== 'unavailable';
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
    AI_MODEL_REGISTRY.find(model => model.id === RESILIENT_FALLBACK_AI_MODEL_ID),
    ...AI_MODEL_REGISTRY
  ].filter((model): model is AiModelDefinition => Boolean(model));
  return candidates.find(model => isTierAllowed(model, tier) && isRegisteredModelAvailable(model) && getProviderHealth(model.provider) !== 'unavailable')?.id
    || AUTO_ROUTING_MODEL_ID;
}

export function getPublicModelCatalog(tier = 'Free') {
  return AI_MODEL_REGISTRY.map(({ id, name, category, tag, description, recommendedFor, speed, reasoning, allowedTiers, provider, capabilities, isDefault }) => {
    const configured = isProviderConfigured(provider);
    const installed = provider !== 'ollama' || isLocalModelAvailable(getModelDefinition(id)!.providerModelId);
    const availability = !configured ? 'provider_not_configured' as const : !installed || getProviderHealth(provider) === 'unavailable' ? 'temporarily_unavailable' as const : 'configured' as const;
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

export function isRegisteredModelAvailable(model: AiModelDefinition): boolean {
  return aiProviderConfig.isConfigured(model.provider) && (model.provider !== 'ollama' || isLocalModelAvailable(model.providerModelId));
}
