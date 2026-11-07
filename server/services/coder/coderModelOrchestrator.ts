/**
 * Coder Model Orchestrator
 * Dewan Ahli AI Lokal RuangCoder (Autonomous Multi-Agent Council Swarm)
 *
 * Meniadakan pemilihan model manual oleh pengguna; mengorkestrasi 8 model
 * lokal Ollama secara cerdas sesuai spesialisasi tugas masing-masing.
 */

export type IndonesianPersonaId =
  | 'habibie'
  | 'kihadjar'
  | 'bambang'
  | 'sutarjo'
  | 'kartini'
  | 'dewi'
  | 'gibran'
  | 'kancil';

export interface IndonesianPersonaConfig {
  id: IndonesianPersonaId;
  name: string;
  historicalFigure: string;
  role: string;
  avatar: string;
  badgeColor: 'amber' | 'emerald' | 'sky' | 'indigo' | 'rose' | 'teal' | 'purple' | 'orange';
  targetModel: string;
  fallbackModel: string;
  specialty: string;
  focusKeywords: string[];
}

export const INDONESIAN_COUNCIL_PERSONAS: Record<IndonesianPersonaId, IndonesianPersonaConfig> = {
  habibie: {
    id: 'habibie',
    name: 'Pak Habibie',
    historicalFigure: 'Prof. Dr. Ing. B.J. Habibie',
    role: 'Chief System Architect & Master Engineer',
    avatar: '📐',
    badgeColor: 'amber',
    targetModel: 'qwen3:1.7b',
    fallbackModel: 'phi4-mini:latest',
    specialty: 'Arsitektur sistem kompleks, algoritma tingkat tinggi, dan blueprint multi-file.',
    focusKeywords: ['arsitektur', 'sistem', 'blueprint', 'struktur', 'buatkan aplikasi', 'proyek', 'bangun', 'backend', 'database']
  },
  kihadjar: {
    id: 'kihadjar',
    name: 'Ki Hadjar',
    historicalFigure: 'Ki Hadjar Dewantara',
    role: 'Deep Reasoning & Root Cause Debugger',
    avatar: '🧠',
    badgeColor: 'purple',
    targetModel: 'deepseek-r1:1.5b',
    fallbackModel: 'phi4-mini:latest',
    specialty: 'Chain-of-Thought (CoT) mendalam, analisis akar masalah error/crash, dan deduksi logika terselubung.',
    focusKeywords: ['error', 'bug', 'fix', 'crash', 'gagal', 'rusak', 'salah', 'kenapa', 'debug', 'exception', 'undefined']
  },
  bambang: {
    id: 'bambang',
    name: 'Pak Bambang',
    historicalFigure: 'Bambang Soedirman',
    role: 'QA & Safety Terminal Inspector',
    avatar: '🛡️',
    badgeColor: 'emerald',
    targetModel: 'phi4-mini:latest',
    fallbackModel: 'qwen3:1.7b',
    specialty: 'Validasi unit test terminal, keamanan script eksekusi, mitigasi bug, dan kepastian build.',
    focusKeywords: ['test', 'uji', 'terminal', 'run', 'perintah', 'aman', 'keamanan', 'validasi', 'npm', 'build']
  },
  sutarjo: {
    id: 'sutarjo',
    name: 'Mas Sutarjo',
    historicalFigure: 'Sutarjo Kartohadikusumo',
    role: 'Senior Core Implementor',
    avatar: '⚡',
    badgeColor: 'sky',
    targetModel: 'qwen3:1.7b',
    fallbackModel: 'phi4-mini:latest',
    specialty: 'Penulisan fungsi presisi, pembuatan file baru, operasi diff terarah, dan manipulasi kode.',
    focusKeywords: ['buat', 'tambah', 'ubah', 'implementasi', 'tulis', 'fungsi', 'edit', 'koding', 'kode', 'modifikasi']
  },
  kartini: {
    id: 'kartini',
    name: 'Ibu Kartini',
    historicalFigure: 'R.A. Kartini',
    role: 'Code Governance & Documentation',
    avatar: '📚',
    badgeColor: 'rose',
    targetModel: 'phi4-mini:latest',
    fallbackModel: 'qwen3:1.7b',
    specialty: 'Review kualitas keterbacaan kode (clean code), standarisasi dokumentasi, dan panduan proyek.',
    focusKeywords: ['dokumentasi', 'readme', 'review', 'rapikan', 'clean code', 'panduan', 'penjelasan', 'standar']
  },
  dewi: {
    id: 'dewi',
    name: 'Mbak Dewi',
    historicalFigure: 'Dewi Sartika',
    role: 'Frontend & UI/UX Specialist',
    avatar: '🎨',
    badgeColor: 'teal',
    targetModel: 'gemma3:1b',
    fallbackModel: 'qwen3:1.7b',
    specialty: 'Desain antarmuka visual responsif, HTML/CSS, Tailwind styling, estetika dan interaksi pengguna.',
    focusKeywords: ['ui', 'ux', 'tampilan', 'css', 'style', 'warna', 'layout', 'tombol', 'responsif', 'cantik', 'desain', 'animasi', 'html']
  },
  gibran: {
    id: 'gibran',
    name: 'Mas Gibran',
    historicalFigure: 'Gibran Rakabuming Raka',
    role: 'Sat-Set Dispatcher & Tool Router',
    avatar: '🚀',
    badgeColor: 'indigo',
    targetModel: 'qwen3.5:0.8b',
    fallbackModel: 'gemma3:270m',
    specialty: 'Klasifikasi maksud instruksi super cepat (<150ms) dan routing tool call secara presisi.',
    focusKeywords: ['cepat', 'sat-set', 'ringkas', 'langsung', 'dispatch']
  },
  kancil: {
    id: 'kancil',
    name: 'Si Kancil',
    historicalFigure: 'Cerita Rakyat Indonesia',
    role: 'Ultra-Fast Linter & Formatter',
    avatar: '⚡',
    badgeColor: 'orange',
    targetModel: 'gemma3:270m',
    fallbackModel: 'qwen3.5:0.8b',
    specialty: 'Perapian indentasi kilat, pembersihan spasi berlebih, dan validasi sintaksis sebelum save.',
    focusKeywords: ['format', 'lint', 'indentasi', 'rapi']
  }
};

export type CouncilPersonaMode = 'creative' | 'professional';
export type CoderAiProvider = 'auto' | 'ollama' | 'gemini';

export const GEMINI_CODING_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.1-pro-preview',
  'gemini-2.5-flash'
];

export const PROFESSIONAL_COUNCIL_PERSONAS: Record<IndonesianPersonaId, IndonesianPersonaConfig> = {
  habibie: {
    id: 'habibie',
    name: 'Lead Architect',
    historicalFigure: 'Principal System Architect',
    role: 'Principal System Architect & Tech Lead',
    avatar: '🏛️',
    badgeColor: 'amber',
    targetModel: 'qwen3:1.7b',
    fallbackModel: 'phi4-mini:latest',
    specialty: 'Arsitektur sistem enterprise, blueprint multi-file modular, dan rancangan skalabilitas.',
    focusKeywords: ['arsitektur', 'sistem', 'blueprint', 'struktur', 'buatkan aplikasi', 'proyek', 'bangun', 'backend', 'database']
  },
  kihadjar: {
    id: 'kihadjar',
    name: 'Root Cause Debugger',
    historicalFigure: 'Deep Reasoning Specialist',
    role: 'Root Cause & Crash Investigator',
    avatar: '🔬',
    badgeColor: 'purple',
    targetModel: 'deepseek-r1:1.5b',
    fallbackModel: 'phi4-mini:latest',
    specialty: 'Analisis anomali runtime, deduksi chain-of-thought mendalam, dan mitigasi exception.',
    focusKeywords: ['error', 'bug', 'fix', 'crash', 'gagal', 'rusak', 'salah', 'kenapa', 'debug', 'exception', 'undefined']
  },
  bambang: {
    id: 'bambang',
    name: 'QA & SecOps',
    historicalFigure: 'Security & QA Inspector',
    role: 'Terminal Safety & Testing Lead',
    avatar: '🛡️',
    badgeColor: 'emerald',
    targetModel: 'phi4-mini:latest',
    fallbackModel: 'qwen3:1.7b',
    specialty: 'Validasi testing terminal, kepastian build, mitigasi regresi, dan pengujian script.',
    focusKeywords: ['test', 'uji', 'terminal', 'run', 'perintah', 'aman', 'keamanan', 'validasi', 'npm', 'build']
  },
  sutarjo: {
    id: 'sutarjo',
    name: 'Core Engineer',
    historicalFigure: 'Senior Implementor',
    role: 'Senior Implementor & Surgical Diff Specialist',
    avatar: '💻',
    badgeColor: 'sky',
    targetModel: 'qwen3:1.7b',
    fallbackModel: 'phi4-mini:latest',
    specialty: 'Penulisan fungsi presisi, modularitas kode, manipulasi diff terarah, dan pembuatan modul.',
    focusKeywords: ['buat', 'tambah', 'ubah', 'implementasi', 'tulis', 'fungsi', 'edit', 'koding', 'kode', 'modifikasi']
  },
  kartini: {
    id: 'kartini',
    name: 'Code Governance',
    historicalFigure: 'Standards & Documentation Lead',
    role: 'Documentation & Clean Code Auditor',
    avatar: '📋',
    badgeColor: 'rose',
    targetModel: 'phi4-mini:latest',
    fallbackModel: 'qwen3:1.7b',
    specialty: 'Standarisasi konvensi clean code, pemeliharaan README, dan keterbacaan kode tingkat lanjut.',
    focusKeywords: ['dokumentasi', 'readme', 'review', 'rapikan', 'clean code', 'panduan', 'penjelasan', 'standar']
  },
  dewi: {
    id: 'dewi',
    name: 'Frontend Lead',
    historicalFigure: 'UI/UX Specialist',
    role: 'UI/UX & Responsive Design Specialist',
    avatar: '🎨',
    badgeColor: 'teal',
    targetModel: 'gemma3:1b',
    fallbackModel: 'qwen3:1.7b',
    specialty: 'Tata letak visual modern, HTML5/CSS3 responsif, Tailwind utility, dan estetika antarmuka.',
    focusKeywords: ['ui', 'ux', 'tampilan', 'css', 'style', 'warna', 'layout', 'tombol', 'responsif', 'cantik', 'desain', 'animasi', 'html']
  },
  gibran: {
    id: 'gibran',
    name: 'Fast Dispatcher',
    historicalFigure: 'Rapid Prototype Dispatcher',
    role: 'Rapid Triage & Tool Dispatcher',
    avatar: '⚡',
    badgeColor: 'indigo',
    targetModel: 'qwen3.5:0.8b',
    fallbackModel: 'gemma3:270m',
    specialty: 'Routing maksud perintah instan (<150ms) dan eksekusi solusi cepat.',
    focusKeywords: ['cepat', 'sat-set', 'ringkas', 'langsung', 'dispatch']
  },
  kancil: {
    id: 'kancil',
    name: 'Syntax Linter',
    historicalFigure: 'Formatter Specialist',
    role: 'Instant Linter & Style Formatter',
    avatar: '🧹',
    badgeColor: 'orange',
    targetModel: 'gemma3:270m',
    fallbackModel: 'qwen3.5:0.8b',
    specialty: 'Perapian sintaksis kilat dan verifikasi konsistensi baris kode.',
    focusKeywords: ['format', 'lint', 'indentasi', 'rapi']
  }
};

export interface PlannedAgentTurn {
  step: number;
  persona: IndonesianPersonaConfig;
  modelToUse: string;
  phaseTitle: string;
  intent: 'triage' | 'reasoning' | 'architect' | 'implement' | 'style' | 'verify' | 'review';
}

export class CoderModelOrchestrator {
  /**
   * Evaluates available Ollama models and resolves which physical model
   * should back a requested persona.
   */
  static resolveModelForPersona(
    persona: IndonesianPersonaConfig,
    availableModels: string[]
  ): string {
    if (!availableModels || availableModels.length === 0) {
      return GEMINI_CODING_MODELS[0];
    }
    // High-end SLM champion priority: if persona is architect/reasoner and Si Gacor is available, prioritize it
    if ((persona.id === 'habibie' || persona.id === 'kihadjar') && availableModels.includes('si-gacor:latest')) {
      return 'si-gacor:latest';
    }
    if (persona.id === 'sutarjo' && availableModels.includes('si-pinter:latest')) {
      return 'si-pinter:latest';
    }
    if (availableModels.includes(persona.targetModel)) {
      return persona.targetModel;
    }
    // Check fallback
    if (availableModels.includes(persona.fallbackModel)) {
      return persona.fallbackModel;
    }
    // General fallback preference order: prioritize proprietary local SLMs first, then lightweight champions
    const globalOrder = [
      'si-gacor:latest',
      'si-pinter:latest',
      'qwen3:1.7b',
      'phi4-mini:latest',
      'deepseek-r1:1.5b',
      'gemma3:1b',
      'qwen3.5:0.8b',
      'qwen3:8b',
      'gemma3:270m',
      ...GEMINI_CODING_MODELS
    ];
    for (const m of globalOrder) {
      if (availableModels.includes(m)) return m;
    }
    return availableModels[0] || GEMINI_CODING_MODELS[0];
  }

  /**
   * Plans the autonomous council sequence for a user prompt across multiple steps.
   * Supports `lockSingleModel` and `primaryModelOverride` to prevent GPU VRAM thrashing
   * when executing multi-turn workflows in local Ollama environments.
   */
  static planExecutionCouncil(
    prompt: string,
    activeFilePath: string | undefined,
    availableModels: string[],
    maxSteps: number = 6,
    personaMode: CouncilPersonaMode = 'creative',
    options?: {
      primaryModelOverride?: string;
      lockSingleModel?: boolean;
      provider?: CoderAiProvider;
    }
  ): PlannedAgentTurn[] {
    const isGeminiMode = options?.provider === 'gemini' || (availableModels.length === 0);
    const effectiveModels = isGeminiMode
      ? (availableModels.length > 0 ? availableModels : GEMINI_CODING_MODELS)
      : availableModels;

    const personaPool = personaMode === 'professional' ? PROFESSIONAL_COUNCIL_PERSONAS : INDONESIAN_COUNCIL_PERSONAS;
    const lowerPrompt = prompt.toLowerCase();
    const isErrorOrFix = /error|bug|crash|gagal|rusak|undefined|broken|cannot|kendala|(?:kenapa|mengapa).*(?:error|bug|rusak|gagal|crash|salah|macet|tidak bisa|ngeloop)/i.test(lowerPrompt);
    const isUiHeavy = /ui|ux|tampilan|css|style|warna|layout|tombol|button|desain|tema|responsif|antarmuka|interface|komponen|halaman|form|task|tugas/i.test(lowerPrompt);
    const _isDocOrReview = /review|dokumentasi|readme|jelaskan|evaluasi/i.test(lowerPrompt);
    const isFullApp = /buatkan aplikasi|bikin aplikasi|create app|sistem baru|website baru|project baru/i.test(lowerPrompt);

    // Resolve champion model: if user explicitly selected a model
    const requestedOverride = options?.primaryModelOverride && options.primaryModelOverride !== 'auto'
      ? options.primaryModelOverride
      : undefined;

    let pinnedModel: string | undefined;
    if (requestedOverride) {
      pinnedModel = effectiveModels.includes(requestedOverride)
        ? requestedOverride
        : this.resolveModelForPersona(personaPool.habibie, effectiveModels);
    } else if (isGeminiMode) {
      pinnedModel = GEMINI_CODING_MODELS[0];
    }

    const turns: PlannedAgentTurn[] = [];

    // Helper to determine model for a turn: respects pinnedModel / lockSingleModel if enabled
    const getTurnModel = (persona: IndonesianPersonaConfig, isStep1 = false): string => {
      if (pinnedModel) return pinnedModel;
      const resolved = this.resolveModelForPersona(persona, effectiveModels);
      if (options?.lockSingleModel) {
        if (isStep1) pinnedModel = resolved;
        return pinnedModel || resolved;
      }
      return resolved;
    };

    // Step 1: Planning / Initial Direction
    if (isErrorOrFix) {
      // Step 1 for bug fixing: Ki Hadjar / Debug Specialist (deep reasoning / root cause)
      const p = personaPool.kihadjar;
      turns.push({
        step: 1,
        persona: p,
        modelToUse: getTurnModel(p, true),
        phaseTitle: personaMode === 'professional' ? 'Root Cause & Anomaly Analysis' : 'Analisis Akar Masalah (Deep Reasoning CoT)',
        intent: 'reasoning'
      });
    } else if (isUiHeavy) {
      // Step 1 for UI: Mbak Dewi / UI Lead
      const p = personaPool.dewi;
      turns.push({
        step: 1,
        persona: p,
        modelToUse: getTurnModel(p, true),
        phaseTitle: personaMode === 'professional' ? 'UI/UX & Responsive Blueprint' : 'Perancangan Antarmuka & Tata Visual UI',
        intent: 'style'
      });
    } else {
      // Step 1 for general/app: Pak Habibie / Lead Architect
      const p = personaPool.habibie;
      turns.push({
        step: 1,
        persona: p,
        modelToUse: getTurnModel(p, true),
        phaseTitle: personaMode === 'professional' ? 'System Architecture & Modular Blueprint' : 'Perumusan Blueprint & Arsitektur Sistem',
        intent: 'architect'
      });
    }

    // Step 2: Implementation & Code Surgery
    // Primary implementor: Mas Sutarjo / Core Engineer
    const pSutarjo = personaPool.sutarjo;
    turns.push({
      step: 2,
      persona: pSutarjo,
      modelToUse: getTurnModel(pSutarjo),
      phaseTitle: personaMode === 'professional' ? 'Core Code Implementation & File Patching' : 'Implementasi Kode Presisi & Bedah File (Diff)',
      intent: 'implement'
    });

    // Step 3: Secondary Refinement / Frontend Integration
    if (isUiHeavy) {
      const pDewi = personaPool.dewi;
      turns.push({
        step: 3,
        persona: pDewi,
        modelToUse: getTurnModel(pDewi),
        phaseTitle: personaMode === 'professional' ? 'Interface Styling & Preview Polish' : 'Styling Komponen & Optimasi Live Preview',
        intent: 'style'
      });
    } else if (isFullApp) {
      const pHabibie = personaPool.habibie;
      turns.push({
        step: 3,
        persona: pHabibie,
        modelToUse: getTurnModel(pHabibie),
        phaseTitle: personaMode === 'professional' ? 'Cross-Module Logic Integration' : 'Integrasi Antar-Modul & Logika Aplikasi',
        intent: 'implement'
      });
    } else {
      const pSutarjo2 = personaPool.sutarjo;
      turns.push({
        step: 3,
        persona: pSutarjo2,
        modelToUse: getTurnModel(pSutarjo2),
        phaseTitle: personaMode === 'professional' ? 'Logic Finalization & Code Writing' : 'Penyelesaian Logika Kode & Penulisan Modul',
        intent: 'implement'
      });
    }

    // Step 4: Quality Assurance & Terminal Safety
    const pBambang = personaPool.bambang;
    turns.push({
      step: 4,
      persona: pBambang,
      modelToUse: getTurnModel(pBambang),
      phaseTitle: personaMode === 'professional' ? 'Terminal Testing & Sandbox Safety Inspection' : 'Inspeksi Kualitas, Terminal Sandbox & Anti-Regresi',
      intent: 'verify'
    });

    // Step 5: Code Governance / Documentation / Clean code
    const pKartini = personaPool.kartini;
    turns.push({
      step: 5,
      persona: pKartini,
      modelToUse: getTurnModel(pKartini),
      phaseTitle: personaMode === 'professional' ? 'Code Governance & Documentation Audit' : 'Tata Kelola Struktur & Dokumentasi Proyek',
      intent: 'review'
    });

    // Step 6: Final Polish & Dispatch
    const pGibran = personaPool.gibran;
    turns.push({
      step: 6,
      persona: pGibran,
      modelToUse: getTurnModel(pGibran),
      phaseTitle: personaMode === 'professional' ? 'Rapid Triage & Final Verification' : 'Finalisasi Cepat & Verifikasi Siap Pakai',
      intent: 'triage'
    });

    return turns.slice(0, maxSteps);
  }
}
