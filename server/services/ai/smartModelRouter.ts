import {
  DEFAULT_AI_MODEL_ID,
  AUTO_ROUTING_MODEL_ID,
  isAiProfile,
  AiProfileId,
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
  isRegisteredModelAvailable,
  AiModelDefinition,
  AiModelError,
  resolveAiModel,
  getProfileDefinition,
  validateProfileMode,
  getModelDefinition
} from './aiModelRegistry.js';
import { getProviderHealth } from './aiReliabilityService.js';
import { aiCostCalculator } from './aiCostCalculator.js';


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
      requiredCapabilities: (context.attachments || []).some(a => a.mimeType?.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(a.filename || ''))
        ? ['chat', 'vision', 'image_understanding'] : ['chat'],
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
      requiredCapabilities: ['chat', 'vision', 'image_understanding'],
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

  // 3. Structured reasoning & technical/coding signals (Applies universally)
  if (/\b(debug|refactor|error|bug|stack trace|syntax|typescript|javascript|python|sql|api|function|def |class |import |const |let |var |console\.log|print\(|return |public static|void main)\b/i.test(text)) {
    return {
      category: 'coding',
      latencyPreference: 'balanced',
      qualityPreference: 'high',
      requiredCapabilities: ['chat'],
      reasonHint: 'Tugas penulisan, perbaikan, atau analisis kode pemrograman'
    };
  }

  if (/\b(bukti|proof|logika|deduksi|probabilitas|persamaan|matematika|analisis mendalam|step by step proof|alasan logis)\b/i.test(text)) {
    return {
      category: 'structured_reasoning',
      latencyPreference: 'deep',
      qualityPreference: 'very_high',
      requiredCapabilities: ['chat'],
      reasonHint: 'Kebutuhan penalaran analitis, logika, atau pemecahan masalah bertahap'
    };
  }

  // 4. Workspace mode / Academic writing signals
  if (context.workspaceMode) {
    if (/\b(skripsi|tesis|jurnal|metodologi|latar belakang|rumusan masalah|bab 1|bab 2|kajian pustaka|sitasi|daftar pustaka)\b/i.test(text)) {
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

  // 5. Content heuristic without sensitive inference
  if (/\b(ringkas|rangkum|intisarikan|summarize|tldr)\b/i.test(text)) {
    return {
      category: 'summarization',
      latencyPreference: 'fast',
      qualityPreference: 'standard',
      requiredCapabilities: ['chat'],
      reasonHint: 'Perangkuman dan ekstraksi poin inti'
    };
  }

  if (/\b(terjemahkan|translate|artikan ke|bahasa inggris|bahasa indonesia)\b/i.test(text)) {
    return {
      category: 'translation',
      latencyPreference: 'fast',
      qualityPreference: 'standard',
      requiredCapabilities: ['chat'],
      reasonHint: 'Penerjemahan dan penyesuaian bahasa'
    };
  }

  if (/\b(ide|brainstorm|gagasan|opsi inovatif|topik)\b/i.test(text)) {
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
    if (!isRegisteredModelAvailable(model)) return false;
    if (getProviderHealth(model.provider) === 'unavailable') return false;

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
      if (model.capabilities.includes('document_ocr') || model.provider === 'gemini') score += 30; // Strong long-context/multimodal documents
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

  // 4. Cost Efficiency factor
  // Highly efficient models (Groq/OpenRouter free tier, or Flash-lite) gain cost-efficiency bonus
  // especially for fast/standard requests or summarization/translation
  if (model.id.includes('free') || model.id.includes('flash-lite') || model.id.includes('gpt-20b')) {
    if (targetLatency === 'fast' || targetCategory === 'summarization' || targetCategory === 'translation') {
      score += 15;
    } else {
      score += 5;
    }
  }

  // 5. Reliability / Health penalty
  // Check provider health; if degraded, down-weight score by 30 to favor healthier providers
  const health = getProviderHealth(model.provider);
  if (health === 'degraded') {
    score -= 30;
  }

  return score + localTaskScore(model, context, classification);
}

export class SmartModelRouter {
  /**
   * Routes an official RuangTenang AI Profile to the best configured model
   * using supported providers: Gemini, DeepSeek, Groq, OpenRouter, and OpenAI.
   */
  routeProfile(profileId: AiProfileId, context: AiRoutingContext, promptText?: string): RoutingDecision {
    const isWorkspace = Boolean(context.workspaceMode ?? (context as any).isWorkspace);
    validateProfileMode(profileId, isWorkspace);

    const profile = getProfileDefinition(profileId);
    if (!profile) throw new AiModelError('MODEL_NOT_FOUND');

    const userTier = context.userTier || 'Free';
    const normalizedTier = (userTier as string) === 'Developer' ? 'Pro' : userTier;
    if (!profile.allowedTiers.includes(normalizedTier as ModelTier)) {
      throw new AiModelError('MODEL_NOT_ALLOWED');
    }

    const classification = classifyRequest(context, promptText);
    const excluded = new Set(context.excludedModelIds || []);
    const hasImage = (context.attachments || []).some(a =>
      a.mimeType?.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(a.filename || '')
    );

    // 1. Filter candidate models specified for this profile
    const viableCandidates: AiModelDefinition[] = [];
    for (const candidateId of profile.candidateModelIds) {
      if (excluded.has(candidateId)) continue;
      const model = getModelDefinition(candidateId);
      if (!model) continue;
      if (!model.allowedTiers.includes(normalizedTier as ModelTier)) continue;
      if (!isRegisteredModelAvailable(model)) continue;
      if (getProviderHealth(model.provider) === 'unavailable') continue;
      if (context.streamingRequired && !model.capabilities.includes('streaming')) continue;
      if (hasImage && !model.capabilities.includes('vision')) continue;
      if (context.requestedCapabilities && context.requestedCapabilities.some(cap => !model.capabilities.includes(cap))) continue;

      viableCandidates.push(model);
    }

    if (viableCandidates.length === 0) {
      throw new AiModelError('MODEL_UNAVAILABLE');
    }

    // 2. Deterministic scoring of viable candidates based on profile intent
    const scored = viableCandidates.map(candidate => {
      let score = 100;
      // Index priority (earlier in candidate list has natural precedence)
      const listIndex = profile.candidateModelIds.indexOf(candidate.id);
      if (listIndex >= 0) {
        score -= listIndex * 5;
      }

      // Profile Reasoning affinity
      if (profile.reasoning === 'Sangat Tinggi') {
        if (candidate.reasoning === 'Sangat Tinggi') score += 40;
        else if (candidate.reasoning === 'Tinggi') score += 10;
      } else if (profile.reasoning === 'Tinggi') {
        if (candidate.reasoning === 'Tinggi') score += 30;
        else if (candidate.reasoning === 'Sangat Tinggi') score += 15;
      }

      // Profile Speed affinity
      if (profile.speed === 'Sangat Cepat') {
        if (candidate.speed === 'Sangat Cepat') score += 35;
        else if (candidate.speed === 'Cepat') score += 15;
      } else if (profile.speed === 'Cepat') {
        if (candidate.speed === 'Cepat' || candidate.speed === 'Sangat Cepat') score += 25;
      }

      // Only use explicit registered prices. Unknown prices are not assumed free.
      const pricing = aiCostCalculator.getPricing(candidate.id);
      if (pricing) {
        const averagePerMillion = (pricing.inputPerMillionUsd + pricing.outputPerMillionUsd) / 2;
        score += profile.goal === 'reasoning'
          ? Math.max(-12, 3 - averagePerMillion * 2)
          : Math.max(-20, 12 - averagePerMillion * 18);
      }

      // Task category affinity
      const targetCategory = context.taskCategory || classification.category;
      if (targetCategory === 'coding') {
        if (candidate.id.includes('code') || candidate.id.includes('reasoner') || candidate.id.includes('qwen')) score += 25;
      } else if (targetCategory === 'document_analysis') {
        if (candidate.provider === 'gemini' || candidate.capabilities.includes('document_ocr')) score += 40; // superior document context & multimodal OCR
      } else if (targetCategory === 'academic_writing' || targetCategory === 'research') {
        if (candidate.reasoning === 'Sangat Tinggi') score += 25;
      }

      // Reliability & health check
      if (getProviderHealth(candidate.provider) === 'degraded') {
        score -= 40;
      }

      if (candidate.provider === 'ollama') {
        // Local task suitability outranks arbitrary catalog insertion order.
        score = scoreCandidate(candidate, { ...context, latencyPreference: profile.goal === 'speed' ? 'fast' : profile.goal === 'reasoning' ? 'deep' : context.latencyPreference }, classification);
      }
      return { model: candidate, score };
    });

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.model.isDefault) return -1;
      if (b.model.isDefault) return 1;
      return a.model.id.localeCompare(b.model.id);
    });

    const chosen = scored[0].model;
    const rankedAlternatives = scored.slice(1);
    const fallbackList = preferLightLocalFallback(chosen, [
      ...rankedAlternatives.filter(item => item.model.provider !== chosen.provider),
      ...rankedAlternatives.filter(item => item.model.provider === chosen.provider)
    ].map(item => item.model));

    // Compare the actual candidate with the profile's promised quality level.
    const reasoningRank = (value: string) => value === 'Sangat Tinggi' ? 2 : value === 'Tinggi' ? 1 : 0;
    const isDegraded = reasoningRank(chosen.reasoning) < reasoningRank(profile.reasoning);

    return {
      selectedModelId: chosen.id,
      selectedModel: chosen,
      provider: chosen.provider,
      routingMode: 'manual',
      routingReason: `Profil ${profile.name}: model ${chosen.name} (${chosen.provider}) dipilih secara cerdas`,
      fallbackCandidates: fallbackList,
      profileId,
      isDegraded,
      degradationNotice: isDegraded ? `Profil ${profile.name}: model ${chosen.name} tersedia, tetapi tingkat penalarannya di bawah sasaran profil. Coba lagi nanti untuk alternatif yang lebih kuat.` : undefined
    };
  }

  /**
   * Main entry point for routing an AI request.
   * Priority:
   * 1. Official AI Profile routing (tenang-turbo, tenang-middle, tenang-low, kerja-fast, kerja-santai, kerja-hard).
   * 2. Manual model selection (explicit user choice, validated against tier & availability).
   * 3. Auto routing via classification, filtering, and deterministic scoring.
   */
  routeModel(context: AiRoutingContext, promptText?: string): RoutingDecision {
    const userTier = context.userTier || 'Free';
    const targetModelId = context.profileId || context.manualModelId;

    // 1. OFFICIAL AI PROFILE ROUTING
    if (targetModelId && isAiProfile(targetModelId)) {
      return this.routeProfile(targetModelId, context, promptText);
    }

    const isManual = targetModelId && targetModelId !== AUTO_ROUTING_MODEL_ID;

    // 2. MANUAL CANONICAL MODEL (developer/admin override or specific model test)
    if (isManual) {
      const requestedId = targetModelId!;
      // Resolve against canonical registry and user tier
      const model = resolveAiModel(requestedId, userTier);

      // Verify provider configuration
      if (!isRegisteredModelAvailable(model)) {
        throw new AiModelError('PROVIDER_NOT_CONFIGURED');
      }

      // Check required streaming capability if streaming
      if (context.streamingRequired && !model.capabilities.includes('streaming')) {
        throw new AiModelError('MODEL_UNAVAILABLE');
      }

      // Check vision capability if image attachments are present
      const hasImage = (context.attachments || []).some(a =>
        a.mimeType?.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(a.filename || '')
      );
      if (hasImage && !model.capabilities.includes('vision')) {
        throw new AiModelError('MODEL_UNAVAILABLE');
      }

      // Check requested capabilities explicitly requested by caller
      if (context.requestedCapabilities && context.requestedCapabilities.some(cap => !model.capabilities.includes(cap))) {
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
    const fallbackList = preferLightLocalFallback(chosen, scored.slice(1).map(s => s.model));

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
      'gemini-3.5-flash-lite',
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
      if (!isRegisteredModelAvailable(model)) continue;
      if (streamingRequired && !model.capabilities.includes('streaming')) continue;

      visited.add(id);
      fallbacks.push(id);
      if (fallbacks.length >= 2) break; // Bounded to max 2 fallbacks
    }

    return fallbacks;
  }
}

export const smartModelRouter = new SmartModelRouter();

function preferLightLocalFallback(chosen: AiModelDefinition, alternatives: AiModelDefinition[]): string[] {
  const ids = alternatives.slice(0, 2).map(model => model.id);
  if (chosen.provider !== 'ollama' || alternatives.length < 2) return ids;
  const light = ['ollama-qwen3-1.7b', 'ollama-gemma3-1b', 'ollama-qwen3.5-0.8b', 'ollama-gemma3-270m']
    .find(id => alternatives.some(model => model.id === id));
  if (light && !ids.includes(light)) ids[1] = light;
  return ids;
}

/** Conservative task policy for the installed local family; models remain manually selectable. */
function localTaskScore(model: AiModelDefinition, context: AiRoutingContext, classification: ClassificationSignal): number {
  if (model.provider !== 'ollama') return 0;
  const task = context.taskCategory || classification.category;
  const latency = context.latencyPreference || classification.latencyPreference;
  let order: string[];
  if (latency === 'fast') order = ['qwen3-1.7b', 'gemma3-1b', 'qwen3.5-0.8b', 'gemma3-270m', 'phi4-mini', 'deepseek-r1-1.5b', 'qwen3-8b', 'bonsai-27b'];
  else if (task === 'structured_reasoning') order = ['qwen3-8b', 'bonsai-27b', 'phi4-mini', 'deepseek-r1-1.5b', 'qwen3-1.7b', 'qwen3.5-0.8b', 'gemma3-1b', 'gemma3-270m'];
  else if (task === 'coding' || task === 'document_analysis' || latency === 'deep') order = ['qwen3-8b', 'phi4-mini', 'bonsai-27b', 'qwen3-1.7b', 'deepseek-r1-1.5b', 'qwen3.5-0.8b', 'gemma3-1b', 'gemma3-270m'];
  else order = ['qwen3-1.7b', 'phi4-mini', 'qwen3.5-0.8b', 'gemma3-1b', 'deepseek-r1-1.5b', 'qwen3-8b', 'bonsai-27b', 'gemma3-270m'];
  const index = order.indexOf(model.id.replace(/^ollama-/, ''));
  return index < 0 ? 0 : 500 - index * 100;
}
