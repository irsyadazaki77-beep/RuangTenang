import type {
  WorkspaceAiPreset,
  PresetId
} from '../../../lib/aiPresets';

/**
 * Built-in presets for Indonesian university students and academic productivity.
 * Presets store preferences (routingMode, taskCategory, latencyPreference, responseMode, responseStyle, capabilities)
 * rather than hardcoding specific commercial models unless a specific preferred capability/model is requested.
 */
export const BUILT_IN_PRESETS: readonly WorkspaceAiPreset[] = [
  {
    id: 'cepat',
    name: 'Cepat',
    description: 'Respons kilat dan ringkas untuk tanya-jawab cepat atau klarifikasi langsung.',
    icon: 'Zap',
    scope: 'builtin',
    group: 'Recommended',
    routingMode: 'auto',
    taskCategory: 'general_chat',
    latencyPreference: 'fast',
    qualityPreference: 'standard',
    responseMode: 'Ringkas',
    responseStyle: 'Default',
    capabilities: ['chat', 'streaming']
  },
  {
    id: 'seimbang',
    name: 'Seimbang',
    description: 'Keseimbangan optimal antara kecepatan dan kedalaman penjelasan untuk diskusi sehari-hari.',
    icon: 'Scale',
    scope: 'builtin',
    group: 'Recommended',
    routingMode: 'auto',
    taskCategory: 'general_chat',
    latencyPreference: 'balanced',
    qualityPreference: 'high',
    responseMode: 'Seimbang',
    responseStyle: 'Default',
    capabilities: ['chat', 'streaming']
  },
  {
    id: 'mendalam',
    name: 'Mendalam',
    description: 'Prioritas penalaran komprehensif, multi-perspektif, dan elaborasi detail untuk topik rumit.',
    icon: 'Brain',
    scope: 'builtin',
    group: 'Recommended',
    routingMode: 'auto',
    taskCategory: 'structured_reasoning',
    latencyPreference: 'deep',
    qualityPreference: 'very_high',
    responseMode: 'Mendalam',
    responseStyle: 'Formal',
    capabilities: ['chat', 'streaming', 'reasoning']
  },
  {
    id: 'akademik',
    name: 'Akademik',
    description: 'Standar penulisan ilmiah, struktur makalah/skripsi, dan gaya bahasa formal tersitasi.',
    icon: 'BookOpen',
    scope: 'builtin',
    group: 'Academic',
    routingMode: 'auto',
    taskCategory: 'academic_writing',
    latencyPreference: 'deep',
    qualityPreference: 'very_high',
    responseMode: 'Mendalam',
    responseStyle: 'Akademik',
    capabilities: ['chat', 'streaming']
  },
  {
    id: 'coding',
    name: 'Coding',
    description: 'Analisis logika kode, debugging, arsitektur perangkat lunak, dan langkah berurutan.',
    icon: 'Code2',
    scope: 'builtin',
    group: 'Development',
    routingMode: 'auto',
    taskCategory: 'coding',
    latencyPreference: 'balanced',
    qualityPreference: 'high',
    responseMode: 'Mendalam',
    responseStyle: 'Langkah demi langkah',
    capabilities: ['chat', 'streaming']
  },
  {
    id: 'research',
    name: 'Research',
    description: 'Tinjauan literatur, telaah dokumen/makalah, dan perbandingan metodologi penelitian.',
    icon: 'Search',
    scope: 'builtin',
    group: 'Academic',
    routingMode: 'auto',
    taskCategory: 'research',
    latencyPreference: 'deep',
    qualityPreference: 'very_high',
    responseMode: 'Mendalam',
    responseStyle: 'Akademik',
    capabilities: ['chat', 'streaming']
  }
];

export const DEFAULT_PRESET_ID: PresetId = 'seimbang';

export function getBuiltInPresetById(id: string): WorkspaceAiPreset | undefined {
  return BUILT_IN_PRESETS.find(p => p.id === id);
}
