import { 
  DEFAULT_AI_MODEL_ID, 
  AUTO_ROUTING_MODEL_ID,

  ModelTier, 
  ModelCapability,

  TaskCategory, 
  LatencyPreference, 
  QualityPreference, 
  AiRoutingContext, 
  RoutingDecision 
} from '../../../shared/aiModelContract.js';
import { 
  AI_MODEL_REGISTRY, 
  AiModelDefinition, 
  AiModelError, 
  resolveAiModel, 
  getConfiguredDefaultAiModelId 
} from './aiModelRegistry.js';
import { aiProviderConfig } from '../../config/aiProviderConfig.js';

export interface ClassificationSignal {
  category: TaskCategory;
  latencyPreference: LatencyPreference;
  qualityPreference: QualityPreference;
  requiredCapabilities: ModelCapability[];
  reasonHint: string;
}

/**
 * Deterministic, rule-based request classification using explicit context and metadata.
 * Strictly adheres to ethics & safety guidelines:
 * - NO mental health, diagnostic, psychological or severity inference is performed.
 * - Purely based on explicit workspace mode, attachments, response styles, and explicit keywords.
 */
export function classifyRequest(context: AiRoutingContext, promptText?: string): ClassificationSignal {
  const text = (promptText || '').toLowerCase();
  const attachments = context.attachments || [];

  // 0. Explicit context signals (e.g. from Presets or Explicit API context)
  if (context.taskCategory) {
    const latPref = context.latencyPreference || (context.taskCategory === 'academic_writing' || context.taskCategory === 'structured_reasoning' || context.taskCategory === 'research' ? 'deep' : 'balanced');
    const qualPref = context.qualityPreference || (latPref === 'deep' ? 'very_high' : 'high');
    return {
      category: context.taskCategory,
      latencyPreference: latPref,
      qualityPreference: qualPref,
      requiredCapabilities: ['chat'],
      reasonHint: `Kategori tugas ${context.taskCategory} ditentukan oleh preferensi aktif`
    };
  }

  // 1. Attachment-based signals
  const hasImage = attachments.some(a => 
    a.mimeType?.startsWith('image/') || 
    /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(a.filename || '')
  );

  const hasCodeAttachment = attachments.some(a => 
    /\.(py|js|ts|tsx|jsx|java|cpp|c|cs|go|rs|php|rb|sql|json|ya?ml|html|css|sh|bash)$/i.test(a.filename || '') ||
    a.mimeType?.includes('javascript') ||
    a.mimeType?.includes('python') ||
    a.mimeType?.includes('json') ||
    a.mimeType?.includes('code')
  );

  const hasDocAttachment = attachments.some(a => 
    /\.(pdf|docx?|pptx?|xlsx?|csv|txt|md)$/i.test(a.filename || '') ||
    a.mimeType?.includes('pdf') ||
    a.mimeType?.includes('word') ||
    a.mimeType?.includes('presentation') ||
    a.mimeType?.includes('spreadsheet') ||
    a.mimeType?.includes('document')
  );

  if (hasImage) {
    return {
      category: 'general_chat',
      latencyPreference: 'balanced',
      qualityPreference: 'high',
      requiredCapabilities: ['chat'],
      reasonHint: 'Request membutuhkan kemampuan pemrosesan multimodal/visual'
    };
  }

  if (hasDocAttachment) {
    return {
      category: 'document_analysis',
      latencyPreference: 'balanced',
      qualityPreference: 'high',
      requiredCapabilities: ['chat'],
      reasonHint: 'Request membutuhkan analisis dokumen/berkas'
    };
  }

  if (hasCodeAttachment) {
    return {
      category: 'coding',
      latencyPreference: 'balanced',
      qualityPreference: 'high',
      requiredCapabilities: ['chat'],
      reasonHint: 'Request memproses kode pemrograman atau berkas teknis'
    };
  }

  // 2. Explicit ResponseStyle & TaskCategory signals
  const style = (context.responseStyle || '').toLowerCase();
  if (style.includes('singkat') || style.includes('ringkas') || context.latencyPreference === 'fast') {
    return {
      category: 'general_chat',
      latencyPreference: 'fast',
      qualityPreference: 'standard',
      requiredCapabilities: ['chat'],
      reasonHint: 'Prioritas respons cepat dan efisien'
    };
  }

  if (style.includes('mendalam') || style.includes('akademik') || context.latencyPreference === 'deep') {
    return {
      category: 'structured_reasoning',
      latencyPreference: 'deep',
      qualityPreference: 'very_high',
      requiredCapabilities: ['chat'],
      reasonHint: 'Kebutuhan penalaran terstruktur dan eksplorasi mendalam'
    };
  }

  // 3. Workspace mode / Academic writing signals
  if (context.workspaceMode) {
    // Check coding keywords in workspace
    if (/\b(function|def |class |import |const |let |var |console\.log|print\(|return |public static|void main)\b/.test(text)) {
      return {
        category: 'coding',
        latencyPreference: 'balanced',
        qualityPreference: 'high',
        requiredCapabilities: ['chat'],
        reasonHint: 'Tugas penulisan atau analisis kode pemrograman'
      };
    }

    if (/\b(skripsi|tesis|jurnal|metodologi|latar belakang|rumusan masalah|bab 1|bab 2|kajian pustaka|sitasi|daftar pustaka)\b/.test(text)) {
      return {
        category: 'academic_writing',
        latencyPreference: 'deep',
        qualityPreference: 'very_high',
        requiredCapabilities: ['chat'],
        reasonHint: 'Kebutuhan penulisan dan tinjauan akademik'
      };
    }

    return {
      category: 'academic_writing',
      latencyPreference: 'balanced',
      qualityPreference: 'high',
      requiredCapabilities: ['chat'],
      reasonHint: 'Asistensi kerja akademis di RuangKerja'
    };
  }

  // 4. Content heuristic without sensitive inference
  if (/\b(ringkas|rangkum|intisarikan|summarize|tldr)\b/.test(text)) {
    return {
      category: 'summarization',
      latencyPreference: 'fast',
      qualityPreference: 'standard',
      requiredCapabilities: ['chat'],
      reasonHint: 'Perangkuman dan ekstraksi poin inti'
    };
  }

  if (/\b(terjemahkan|translate|artikan ke|bahasa inggris|bahasa indonesia)\b/.test(text)) {
    return {
      category: 'translation',
      latencyPreference: 'fast',
      qualityPreference: 'standard',
      requiredCapabilities: ['chat'],
      reasonHint: 'Penerjemahan dan penyesuaian bahasa'
    };
  }

  if (/\b(ide|brainstorm|gagasan|opsi inovatif|topik)\b/.test(text)) {
    return {
      category: 'brainstorming',
      latencyPreference: 'balanced',
      qualityPreference: 'high',
      requiredCapabilities: ['chat'],
      reasonHint: 'Eksplorasi ide dan curah pendapat'
    };
  }

  // Default balanced general conversation
  return {
    category: 'general_chat',
    latencyPreference: 'balanced',
    qualityPreference: 'standard',
    requiredCapabilities: ['chat'],
    reasonHint: 'Model utama yang seimbang untuk percakapan'
  };
}

/**
 * Filter all registered models down to viable candidates.
 */
export function filterCandidates(
  context: AiRoutingContext, 
  classification: ClassificationSignal,
  availableModels: readonly AiModelDefinition[] = AI_MODEL_REGISTRY
): AiModelDefinition[] {
  const userTier = context.userTier || 'Free';
  const excluded = new Set(context.excludedModelIds || []);

  return availableModels.filter(model => {
    // 1. Must not be excluded (e.g. previously visited in fallback chain)
    if (excluded.has(model.id)) return false;

    // 2. Must be allowed for the user's tier
    const normalizedTier = (userTier as string) === 'Developer' ? 'Pro' : userTier;
    const tierAllowed = model.allowedTiers.includes(normalizedTier as ModelTier);
    if (!tierAllowed) return false;

    // 3. Provider must be configured
    if (!aiProviderConfig.isConfigured(model.provider)) return false;

    // 4. Must support required capabilities
    if (context.streamingRequired && !model.capabilities.includes('streaming')) {
      return false;
    }
    for (const cap of (context.requestedCapabilities || [])) {
      if (!model.capabilities.includes(cap)) return false;
    }
    for (const cap of classification.requiredCapabilities) {
      if (!model.capabilities.includes(cap)) return false;
    }

    return true;
  });
}

/**
 * Deterministic scoring function for candidates based on policy.
 * Highest score wins. In case of ties, deterministic tie-breakers are applied:
 * 1. Default model preference
 * 2. Stable alphabetical model ID order
 */
export function scoreCandidate(
  model: AiModelDefinition, 
  context: AiRoutingContext, 
  classification: ClassificationSignal
): number {
  let score = 0;

  // 1. Latency preference matching
  const targetLatency = context.latencyPreference || classification.latencyPreference;
  if (targetLatency === 'fast') {
    if (model.speed === 'Sangat Cepat') score += 40;
    else if (model.speed === 'Cepat') score += 20;
    else score += 5;
  } else if (targetLatency === 'deep') {
    if (model.reasoning === 'Sangat Tinggi') score += 50;
    else if (model.reasoning === 'Tinggi') score += 25;
    else score += 5;
  } else {
    // balanced: appreciate high speed + high reasoning
    if (model.speed === 'Sangat Cepat' && model.reasoning === 'Tinggi') score += 35;
    else if (model.speed === 'Cepat') score += 25;
    else score += 15;
  }

  // 2. Task category affinity matching
  const targetCategory = context.taskCategory || classification.category;
  switch (targetCategory) {
    case 'academic_writing':
    case 'structured_reasoning':
    case 'research':
      if (model.reasoning === 'Sangat Tinggi') score += 35;
      else if (model.reasoning === 'Tinggi') score += 20;
      if (model.category.includes('Penalaran Mendalam')) score += 15;
      break;

    case 'coding':
      if (model.reasoning === 'Sangat Tinggi' || model.reasoning === 'Tinggi') score += 25;
      if (model.id.includes('reasoner') || model.id.includes('qwen') || model.id.includes('pro') || model.id.includes('code')) score += 15;
      break;

    case 'document_analysis':
      if (model.reasoning === 'Sangat Tinggi' || model.reasoning === 'Tinggi') score += 25;
      if (model.provider === 'gemini') score += 10; // Strong long-context/multimodal documents
      break;

    case 'summarization':
    case 'translation':
      if (model.speed === 'Sangat Cepat') score += 25;
      break;

    case 'general_chat':
    case 'brainstorming':
    default:
      if (model.category.includes('Model Utama & Seimbang')) score += 20;
      break;
  }

  // 3. Provider priority / stability (Gemini & DeepSeek & Groq first-party)
  if (model.isDefault) score += 10;

  return score;
}

export class SmartModelRouter {
  /**
   * Main entry point for routing an AI request.
   * Priority:
   * 1. Manual model selection (explicit user choice always wins, validated against tier & availability).
   * 2. Auto routing via classification, filtering, and deterministic scoring.
   */
  routeModel(context: AiRoutingContext, promptText?: string): RoutingDecision {
    const userTier = context.userTier || 'Free';
    const isManual = context.manualModelId && context.manualModelId !== AUTO_ROUTING_MODEL_ID;

    // 1. MANUAL MODE: Explicit user choice ALWAYS wins
    if (isManual) {
      const requestedId = context.manualModelId!;
      // Resolve against canonical registry and user tier
      const model = resolveAiModel(requestedId, userTier);

      // Verify provider configuration
      if (!aiProviderConfig.isConfigured(model.provider)) {
        throw new AiModelError('PROVIDER_NOT_CONFIGURED');
      }

      // Check required streaming capability if streaming
      if (context.streamingRequired && !model.capabilities.includes('streaming')) {
        throw new AiModelError('MODEL_UNAVAILABLE');
      }

      return {
        selectedModelId: model.id,
        provider: model.provider,
        routingMode: 'manual',
        routingReason: `Model ${model.name} dipilih secara manual oleh pengguna`,
        fallbackCandidates: this.getDeterministicFallbackCandidates(model.id, userTier, context.streamingRequired)
      };
    }

    // 2. AUTO MODE: Deterministic routing pipeline
    const classification = classifyRequest(context, promptText);
    const candidates = filterCandidates(context, classification);

    if (candidates.length === 0) {
      // Check if fallback to safe default is possible
      const defaultId = getConfiguredDefaultAiModelId(userTier);
      const defaultModel = AI_MODEL_REGISTRY.find(m => m.id === defaultId);
      if (defaultModel && aiProviderConfig.isConfigured(defaultModel.provider)) {
        return {
          selectedModelId: defaultModel.id,
          provider: defaultModel.provider,
          routingMode: 'auto',
          routingReason: 'Model standar digunakan karena tidak ada kandidat spesifik yang memenuhi kriteria',
          fallbackCandidates: []
        };
      }
      throw new AiModelError('MODEL_UNAVAILABLE');
    }

    // Rank candidates deterministically
    const scored = candidates.map(candidate => ({
      model: candidate,
      score: scoreCandidate(candidate, context, classification)
    }));

    // Stable sort: descending score, then default model tie-breaker, then alphabetical id
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.model.isDefault) return -1;
      if (b.model.isDefault) return 1;
      return a.model.id.localeCompare(b.model.id);
    });

    const chosen = scored[0].model;
    const fallbackList = scored.slice(1, 3).map(s => s.model.id);

    return {
      selectedModelId: chosen.id,
      provider: chosen.provider,
      routingMode: 'auto',
      routingReason: `Model dipilih otomatis: ${classification.reasonHint}`,
      fallbackCandidates: fallbackList
    };
  }

  /**
   * Build bounded fallback candidate list without duplicates or infinite loops.
   */
  private getDeterministicFallbackCandidates(
    primaryModelId: string, 
    userTier: string, 
    streamingRequired?: boolean
  ): string[] {
    const visited = new Set<string>([primaryModelId]);
    const fallbacks: string[] = [];

    // Prioritize configured resilient fallbacks
    const fallbackCandidates = [
      'gemini-3.1-flash-lite',
      DEFAULT_AI_MODEL_ID,
      'groq-qwen-27b',
      'deepseek-chat',
      'openrouter-nemotron-lightning',
      'groq-gpt-20b'
    ];

    for (const id of fallbackCandidates) {
      if (visited.has(id)) continue;
      const model = AI_MODEL_REGISTRY.find(m => m.id === id);
      if (!model) continue;
      
      const normalizedTier = userTier === 'Developer' ? 'Pro' : userTier;
      if (!model.allowedTiers.includes(normalizedTier as ModelTier)) continue;
      if (!aiProviderConfig.isConfigured(model.provider)) continue;
      if (streamingRequired && !model.capabilities.includes('streaming')) continue;

      visited.add(id);
      fallbacks.push(id);
      if (fallbacks.length >= 2) break; // Bounded to max 2 fallbacks
    }

    return fallbacks;
  }
}

export const smartModelRouter = new SmartModelRouter();
