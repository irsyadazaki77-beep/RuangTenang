import { WorkspaceActiveContext, WorkspaceChapterScope, WorkspaceComposerConfig, WorkspaceRequestSnapshot } from '../types';

export const CHAPTER_SCOPE_LABELS: Record<WorkspaceChapterScope, { shortLabel: string; fullLabel: string; boundaryInstruction: string }> = {
  ALL: {
    shortLabel: 'Semua Bab',
    fullLabel: 'Seluruh Dokumen / Lintas Bab',
    boundaryInstruction: ''
  },
  BAB_1: {
    shortLabel: 'Bab 1',
    fullLabel: 'Bab 1 — Pendahuluan (Latar Belakang, Rumusan Masalah, Tujuan, Manfaat)',
    boundaryInstruction: 'Fokuskan pembahasan khusus pada ruang lingkup Bab 1 (Pendahuluan: latar belakang, identifikasi/rumusan masalah, batasan masalah, tujuan, dan manfaat penelitian). Jangan mencampuradukkan pembahasan detail hasil eksperimen (Bab 4) atau metodologi teknis mendalam (Bab 3) ke dalam bagian ini.'
  },
  BAB_2: {
    shortLabel: 'Bab 2',
    fullLabel: 'Bab 2 — Tinjauan Pustaka & Landasan Teori',
    boundaryInstruction: 'Fokuskan pembahasan khusus pada ruang lingkup Bab 2 (Tinjauan Pustaka, Landasan Teori, Penelitian Terdahulu, dan Kerangka Pemikiran/Hipotesis). Jangan mencampuradukkan hasil temuan lapangan (Bab 4) ke dalam bagian ini.'
  },
  BAB_3: {
    shortLabel: 'Bab 3',
    fullLabel: 'Bab 3 — Metodologi Penelitian',
    boundaryInstruction: 'Fokuskan pembahasan khusus pada ruang lingkup Bab 3 (Metodologi Penelitian: desain penelitian, populasi/sampel, instrumen, prosedur pengumpulan data, dan teknik analisis data). Jangan mencampuradukkan hasil akhir atau kesimpulan (Bab 4/5) ke dalam bagian ini.'
  },
  BAB_4: {
    shortLabel: 'Bab 4',
    fullLabel: 'Bab 4 — Hasil dan Pembahasan',
    boundaryInstruction: 'Fokuskan pembahasan khusus pada ruang lingkup Bab 4 (Hasil Penelitian, Analisis Data, dan Pembahasan Temuan). Jangan mengulang latar belakang umum (Bab 1) secara berlebihan.'
  },
  BAB_5: {
    shortLabel: 'Bab 5',
    fullLabel: 'Bab 5 — Penutup (Kesimpulan & Saran)',
    boundaryInstruction: 'Fokuskan pembahasan khusus pada ruang lingkup Bab 5 (Kesimpulan yang menjawab rumusan masalah secara ringkas serta Saran praktis/akademis).'
  },
  LAMPIRAN: {
    shortLabel: 'Lampiran',
    fullLabel: 'Lampiran & Instrumen Pendukung',
    boundaryInstruction: 'Fokuskan pada penyusunan lampiran, instrumen kuesioner/wawancara, tabel data mentah, atau kode pendukung.'
  }
};

export function inferArtifactChapterScope(title: string, explicitScope?: WorkspaceChapterScope): WorkspaceChapterScope | undefined {
  if (explicitScope && explicitScope !== 'ALL') return explicitScope;
  const normalized = title.toLowerCase();
  if (/\bbab\s*(1|i)\b|pendahuluan/.test(normalized)) return 'BAB_1';
  if (/\bbab\s*(2|ii)\b|tinjauan\s+pustaka|landasan\s+teori|kajian\s+pustaka/.test(normalized)) return 'BAB_2';
  if (/\bbab\s*(3|iii)\b|metodologi|metode\s+penelitian/.test(normalized)) return 'BAB_3';
  if (/\bbab\s*(4|iv)\b|hasil\s+dan\s+pembahasan|pembahasan/.test(normalized)) return 'BAB_4';
  if (/\bbab\s*(5|v)\b|kesimpulan|penutup/.test(normalized)) return 'BAB_5';
  if (/\blampiran\b|appendix/.test(normalized)) return 'LAMPIRAN';
  return undefined;
}

export function buildWorkspaceRequestSnapshot(args: {
  prompt: string;
  workspaceId?: string;
  model: string;
  config: WorkspaceComposerConfig;
  files?: Array<{ id?: string; name: string }>;
  artifact?: WorkspaceActiveContext['activeArtifact'];
  selectedText?: string;
  workspaceInstructions?: string;
  chapterScope?: WorkspaceChapterScope;
  chapterMemories?: string[];
  requestId?: string;
  createdAt?: Date;
}): WorkspaceRequestSnapshot {
  const context: WorkspaceActiveContext = {
    workspaceId: args.workspaceId,
    workspaceInstructions: args.workspaceInstructions?.trim().slice(0, 4000) || undefined,
    activeFiles: (args.files || []).map(file => ({ id: file.id, name: file.name })),
    activeArtifact: args.artifact,
    selectedText: args.selectedText?.trim() || undefined,
    presetId: args.config.presetId,
    taskCategory: args.config.taskCategory,
    chapterScope: args.chapterScope && args.chapterScope !== 'ALL' ? args.chapterScope : undefined,
    chapterMemories: args.chapterMemories?.length ? args.chapterMemories : undefined
  };
  return {
    requestId: args.requestId || crypto.randomUUID(),
    workspaceId: args.workspaceId,
    userMessage: args.prompt.trim(),
    model: args.config.aiModel || args.model,
    presetId: args.config.presetId,
    taskCategory: args.config.taskCategory,
    context,
    config: { ...args.config },
    createdAt: (args.createdAt || new Date()).toISOString()
  };
}

/** Keep the request's supplemental Workspace data separate from its actual prompt. */
export function buildWorkspaceContextNote(snapshot: WorkspaceRequestSnapshot): string | undefined {
  const { context } = snapshot;
  const contextData: Record<string, unknown> = {};
  if (context.workspaceInstructions) contextData.workspaceInstructions = context.workspaceInstructions;
  if (context.chapterScope && context.chapterScope !== 'ALL') {
    const scopeMeta = CHAPTER_SCOPE_LABELS[context.chapterScope];
    contextData.chapterScope = {
      label: scopeMeta.fullLabel,
      instruction: scopeMeta.boundaryInstruction
    };
  }
  if (context.chapterMemories?.length) contextData.chapterMemories = context.chapterMemories.slice(0, 6).map(memory => memory.slice(0, 500));
  if (context.selectedText) contextData.selectedText = context.selectedText.slice(0, 5000);
  if (context.activeArtifact) {
    contextData.activeArtifact = {
      title: context.activeArtifact.title.slice(0, 300),
      type: context.activeArtifact.type,
      version: context.activeArtifact.version,
      content: context.activeArtifact.content.slice(0, 16000)
    };
  }
  if (context.activeFiles.length) contextData.activeFiles = context.activeFiles.slice(0, 20).map(file => ({ id: file.id?.slice(0, 100), name: file.name.slice(0, 120) }));
  if (!Object.keys(contextData).length) return undefined;
  return `Konteks tambahan RuangKerja untuk permintaan saat ini, dalam JSON. Prioritaskan Selected text untuk permintaan spesifik, gunakan Active Canvas document sebagai konteks pendukung, lalu gunakan berkas terlampir yang relevan; jangan menebak isi berkas dari namanya.\n${JSON.stringify(contextData)}`;
}
