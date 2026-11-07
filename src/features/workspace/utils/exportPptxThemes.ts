export type PresentationTheme =
  | 'academic_minimal'
  | 'professional'
  | 'technology'
  | 'clean_corporate'
  | 'vibrant_creative'
  | 'kampus_ui'
  | 'kampus_itb'
  | 'kampus_ugm'
  | 'kampus_unair';

export type PresentationLayout =
  | 'title'
  | 'section'
  | 'content'
  | 'comparison'
  | 'cards'
  | 'highlight'
  | 'steps'
  | 'table'
  | 'chart'
  | 'references'
  | 'image_content';

export interface PresentationOutlineSlide {
  title: string;
  kicker?: string;
  layout: PresentationLayout;
  bullets?: string[];
  columns?: Array<{ title: string; bullets: string[] }>;
  cards?: Array<{ title: string; bullets: string[]; subtitle?: string }>;
  highlight?: { text: string; subtext?: string };
  table?: {
    headers: string[];
    rows: string[][];
  };
  chart?: {
    type?: 'bar' | 'line' | 'pie';
    categories: string[];
    values: number[];
    seriesName: string;
    source?: { documentId: string; filename: string; sheetName: string; version: string; aggregation: string };
    notes?: string;
  };
  image?: {
    url: string;
    caption?: string;
  };
  notes?: string;
}

export interface EditablePptxOptions {
  title: string;
  content: string;
  artifactType?: string;
  theme?: PresentationTheme;
  logoUrl?: string;
  campusName?: string;
}

export const THEMES: Record<PresentationTheme, {
  name: string;
  background: string;
  foreground: string;
  accent: string;
  accentLight: string;
  muted: string;
  title: string;
  cardBg: string;
  cardBorder: string;
  cardHeaderBg: string;
  tagBg: string;
  tagColor: string;
  isDark?: boolean;
}> = {
  academic_minimal: {
    name: 'Academic Minimal',
    background: 'FFFFFF',
    foreground: '1E293B',
    accent: '0D9488',
    accentLight: 'F0FDFA',
    muted: '64748B',
    title: '0F172A',
    cardBg: 'F8FAFC',
    cardBorder: 'E2E8F0',
    cardHeaderBg: 'F1F5F9',
    tagBg: 'CCFBF1',
    tagColor: '0F766E'
  },
  professional: {
    name: 'Professional Blue',
    background: 'FFFFFF',
    foreground: '1F2937',
    accent: '2563EB',
    accentLight: 'EFF6FF',
    muted: '64748B',
    title: '14213D',
    cardBg: 'F8FAFC',
    cardBorder: 'E2E8F0',
    cardHeaderBg: 'F1F5F9',
    tagBg: 'DBEAFE',
    tagColor: '1D4ED8'
  },
  technology: {
    name: 'Cyber Dark',
    background: '0B1020',
    foreground: 'E5E7EB',
    accent: '22D3EE',
    accentLight: '164E63',
    muted: '94A3B8',
    title: 'F8FAFC',
    cardBg: '111827',
    cardBorder: '1F2937',
    cardHeaderBg: '1F2937',
    tagBg: '083344',
    tagColor: '67E8F9',
    isDark: true
  },
  clean_corporate: {
    name: 'Clean Emerald',
    background: 'FFFFFF',
    foreground: '1F2937',
    accent: '16806A',
    accentLight: 'F0FDF4',
    muted: '64748B',
    title: '123B35',
    cardBg: 'F8FAFC',
    cardBorder: 'E2E8F0',
    cardHeaderBg: 'F1F5F9',
    tagBg: 'D1FAE5',
    tagColor: '065F46'
  },
  vibrant_creative: {
    name: 'Creative Purple',
    background: 'FAF5FF',
    foreground: '3B0764',
    accent: '9333EA',
    accentLight: 'FAF5FF',
    muted: '7E22CE',
    title: '2E1065',
    cardBg: 'FAF5FF',
    cardBorder: 'F3E8FF',
    cardHeaderBg: 'F5EEFF',
    tagBg: 'F3E8FF',
    tagColor: '7E22CE'
  },
  kampus_ui: {
    name: 'Makara Kuning (Univ. Indonesia)',
    background: 'FFFFFF',
    foreground: '1E293B',
    accent: 'EAB308',
    accentLight: 'FEFCE8',
    muted: '64748B',
    title: '1E293B',
    cardBg: 'FFFEF7',
    cardBorder: 'FEF08A',
    cardHeaderBg: 'FEF9C3',
    tagBg: 'FEF9C3',
    tagColor: '854D0E'
  },
  kampus_itb: {
    name: 'Ganesha Cyan (ITB)',
    background: 'FFFFFF',
    foreground: '1E293B',
    accent: '0284C7',
    accentLight: 'F0F9FF',
    muted: '64748B',
    title: '0C4A6E',
    cardBg: 'F8FAFC',
    cardBorder: 'BAE6FD',
    cardHeaderBg: 'E0F2FE',
    tagBg: 'E0F2FE',
    tagColor: '0369A1'
  },
  kampus_ugm: {
    name: 'Biru Tua & Emas (UGM)',
    background: 'FFFFFF',
    foreground: '1E293B',
    accent: '1E3A8A',
    accentLight: 'EFF6FF',
    muted: '64748B',
    title: '172554',
    cardBg: 'F8FAFC',
    cardBorder: 'BFDBFE',
    cardHeaderBg: 'DBEAFE',
    tagBg: 'FEF3C7',
    tagColor: '92400E'
  },
  kampus_unair: {
    name: 'Ksatria Airlangga (UNAIR)',
    background: 'FFFFFF',
    foreground: '1E293B',
    accent: 'D97706',
    accentLight: 'FFFBEB',
    muted: '64748B',
    title: '1E3A8A',
    cardBg: 'FFFDF5',
    cardBorder: 'FDE68A',
    cardHeaderBg: 'FEF3C7',
    tagBg: 'DBEAFE',
    tagColor: '1E40AF'
  }
};
