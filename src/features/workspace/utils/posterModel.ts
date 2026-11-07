export type PosterOrientation = 'portrait' | 'landscape';
export type PosterSize = 'A0' | 'A1' | 'A2' | 'A3';
export type PosterTheme = 'academic_navy' | 'modern_emerald' | 'minimal_slate' | 'vibrant_indigo';

export interface PosterSection {
  id: string;
  title: string;
  content: string;
  columnSpan?: 1 | 2; // For landscape or 2-3 column grids
  accentColor?: string;
  imageUrl?: string;
  imageCaption?: string;
}

export interface EditablePoster {
  format: 'ruangtenang-poster-v1';
  title: string;
  authors: string;
  institution: string;
  theme: PosterTheme;
  orientation: PosterOrientation;
  size: PosterSize;
  sections: PosterSection[];
}

export const POSTER_THEMES: Record<PosterTheme, {
  name: string;
  headerBg: string;
  headerText: string;
  pageBg: string;
  cardBg: string;
  cardBorder: string;
  accent: string;
  sectionHeaderBg: string;
  sectionHeaderText: string;
}> = {
  academic_navy: {
    name: 'Academic Navy',
    headerBg: 'bg-slate-900',
    headerText: 'text-white',
    pageBg: 'bg-slate-100 dark:bg-slate-950',
    cardBg: 'bg-white dark:bg-slate-900',
    cardBorder: 'border-slate-200 dark:border-slate-800',
    accent: '#1e3a8a',
    sectionHeaderBg: 'bg-blue-900 text-white',
    sectionHeaderText: 'text-blue-900 dark:text-blue-300'
  },
  modern_emerald: {
    name: 'Modern Emerald',
    headerBg: 'bg-emerald-950',
    headerText: 'text-white',
    pageBg: 'bg-emerald-50/50 dark:bg-slate-950',
    cardBg: 'bg-white dark:bg-slate-900',
    cardBorder: 'border-emerald-100 dark:border-emerald-950',
    accent: '#059669',
    sectionHeaderBg: 'bg-emerald-800 text-white',
    sectionHeaderText: 'text-emerald-800 dark:text-emerald-300'
  },
  minimal_slate: {
    name: 'Minimal Slate',
    headerBg: 'bg-slate-800',
    headerText: 'text-white',
    pageBg: 'bg-slate-50 dark:bg-slate-950',
    cardBg: 'bg-white dark:bg-slate-900',
    cardBorder: 'border-slate-200 dark:border-slate-800',
    accent: '#475569',
    sectionHeaderBg: 'bg-slate-700 text-white',
    sectionHeaderText: 'text-slate-800 dark:text-slate-200'
  },
  vibrant_indigo: {
    name: 'Vibrant Indigo',
    headerBg: 'bg-indigo-950',
    headerText: 'text-white',
    pageBg: 'bg-indigo-50/30 dark:bg-slate-950',
    cardBg: 'bg-white dark:bg-slate-900',
    cardBorder: 'border-indigo-100 dark:border-indigo-950',
    accent: '#4f46e5',
    sectionHeaderBg: 'bg-indigo-800 text-white',
    sectionHeaderText: 'text-indigo-800 dark:text-indigo-300'
  }
};

export function isPosterContent(content: string): boolean {
  try {
    const value = JSON.parse(content) as Partial<EditablePoster>;
    return value.format === 'ruangtenang-poster-v1' && Array.isArray(value.sections);
  } catch {
    return false;
  }
}

export function createPosterFromMarkdown(content: string, defaultTitle: string): EditablePoster {
  try {
    const parsed = JSON.parse(content) as EditablePoster;
    if (parsed.format === 'ruangtenang-poster-v1' && Array.isArray(parsed.sections)) {
      return parsed;
    }
  } catch {
    /* Parsing markdown fallback */
  }

  // Parse markdown headers and images
  const sections: PosterSection[] = [];
  const lines = content.split(/\r?\n/);
  let currentTitle = 'Pendahuluan & Latar Belakang';
  let currentLines: string[] = [];
  let currentImageUrl: string | undefined = undefined;
  let currentImageCaption: string | undefined = undefined;
  let foundMainTitle = '';

  const flushCurrentSection = () => {
    if (currentLines.length > 0 || currentImageUrl || sections.length > 0) {
      sections.push({
        id: `sec-${sections.length + 1}`,
        title: currentTitle,
        content: currentLines.join('\n').trim(),
        imageUrl: currentImageUrl,
        imageCaption: currentImageCaption
      });
      currentLines = [];
      currentImageUrl = undefined;
      currentImageCaption = undefined;
    }
  };

  for (const line of lines) {
    const h1Match = line.match(/^#\s+(.+)$/);
    const h2Match = line.match(/^##\s+(.+)$/);
    const imgMatch = line.match(/^!\[(.*?)\]\((.*?)\)/);

    if (h1Match && !foundMainTitle) {
      foundMainTitle = h1Match[1].trim();
      continue;
    }

    if (imgMatch) {
      currentImageCaption = imgMatch[1].trim();
      currentImageUrl = imgMatch[2].trim();
      continue;
    }

    if (h2Match) {
      flushCurrentSection();
      currentTitle = h2Match[1].trim();
    } else {
      currentLines.push(line);
    }
  }

  flushCurrentSection();

  // If too few sections, supplement with standard academic poster sections
  if (sections.length < 3) {
    const defaultSections: PosterSection[] = [
      { id: 'sec-1', title: '1. Latar Belakang & Masalah', content: 'Uraian ringkas mengenai konteks penelitian dan permasalahan penting yang diangkat.' },
      { id: 'sec-2', title: '2. Tujuan & Hipotesis', content: 'Sasaran utama penelitian dan kontribusi ilmiah yang diharapkan.' },
      { id: 'sec-3', title: '3. Metodologi Penelitian', content: 'Desain penelitian, data/sampel, instrumen, dan prosedur pengujian analitis.' },
      { id: 'sec-4', title: '4. Hasil & Temuan Kunci', content: 'Poin-poin temuan utama, perbandingan data, dan visualisasi capaian analisis.' },
      { id: 'sec-5', title: '5. Kesimpulan & Implikasi', content: 'Ringkasan jawaban atas rumusan masalah serta rekomendasi untuk penerapan atau riset lanjutan.' },
      { id: 'sec-6', title: '6. Referensi Penting', content: 'Daftar rujukan utama berformat standar sitasi akademik.' }
    ];
    return {
      format: 'ruangtenang-poster-v1',
      title: foundMainTitle || defaultTitle || 'Poster Ilmiah Akademik',
      authors: 'Peneliti / Mahasiswa',
      institution: 'Fakultas / Universitas',
      theme: 'academic_navy',
      orientation: 'portrait',
      size: 'A1',
      sections: defaultSections
    };
  }

  return {
    format: 'ruangtenang-poster-v1',
    title: foundMainTitle || defaultTitle || 'Poster Ilmiah Akademik',
    authors: 'Peneliti / Mahasiswa',
    institution: 'Fakultas / Universitas',
    theme: 'academic_navy',
    orientation: 'portrait',
    size: 'A1',
    sections
  };
}
