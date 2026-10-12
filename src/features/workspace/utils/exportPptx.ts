import pptxgen from 'pptxgenjs';

export type PresentationTheme = 'academic_minimal' | 'professional' | 'technology' | 'clean_corporate';
export type PresentationLayout = 'title' | 'section' | 'content' | 'comparison' | 'chart' | 'references';

export interface PresentationOutlineSlide {
  title: string;
  layout: PresentationLayout;
  bullets?: string[];
  columns?: Array<{ title: string; bullets: string[] }>;
  chart?: {
    categories: string[];
    values: number[];
    seriesName: string;
    source: { documentId: string; filename: string; sheetName: string; version: string; aggregation: string };
    notes?: string;
  };
  notes?: string;
}

export interface EditablePptxOptions {
  title: string;
  content: string;
  artifactType?: string;
  theme?: PresentationTheme;
}

const SLIDE_HEIGHT = 7.5;
const CONTENT_BOTTOM = 6.85;
const CONTENT_TOP = 1.85;
const CONTENT_WIDTH = 11.75;

const THEMES: Record<PresentationTheme, { background: string; foreground: string; accent: string; muted: string; title: string }> = {
  academic_minimal: { background: 'FFFFFF', foreground: '172033', accent: '0D9488', muted: '64748B', title: '0F172A' },
  professional: { background: 'FFFFFF', foreground: '1F2937', accent: '2563EB', muted: '64748B', title: '14213D' },
  technology: { background: '0B1020', foreground: 'E5E7EB', accent: '22D3EE', muted: '94A3B8', title: 'F8FAFC' },
  clean_corporate: { background: 'FFFFFF', foreground: '1F2937', accent: '16806A', muted: '64748B', title: '123B35' }
};

interface ParsedSection {
  title: string;
  level: number;
  bullets: string[];
  columns: Array<{ title: string; bullets: string[] }>;
}

interface ChartArtifact {
  type: 'bar';
  title: string;
  xColumn: string;
  yColumn: string;
  aggregation: string;
  datasetVersion: string;
  provenance: { sourceFileId: string; filename: string; sheetName: string };
  rows: Array<Record<string, unknown>>;
}

function cleanMarkdown(value: string): string {
  return value
    .replace(/\[cite:([A-Za-z0-9_-]+)\]/g, '[cite:$1]')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[(.*?)\]\((https?:\/\/[^)]+)\)/g, '$1 ($2)')
    .trim();
}

function splitLongText(value: string, maxCharacters = 190): string[] {
  const text = cleanMarkdown(value);
  if (text.length <= maxCharacters) return [text];
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const segments: string[] = [];
  let current = '';
  const addSegment = (segment: string) => {
    const words = segment.split(/\s+/);
    let part = '';
    for (const word of words) {
      const next = part ? `${part} ${word}` : word;
      if (next.length > maxCharacters && part) { segments.push(part); part = word; }
      else part = next;
    }
    if (part) segments.push(part);
  };
  for (const sentence of sentences.length ? sentences : [text]) {
    const next = current ? `${current} ${sentence}` : sentence;
    if (next.length > maxCharacters && current) { addSegment(current); current = sentence; }
    else current = next;
  }
  if (current) addSegment(current);
  return segments;
}

function estimateBulletHeight(text: string, charsPerLine = 92): number {
  return Math.max(1, Math.ceil(text.length / charsPerLine)) * 0.29 + 0.13;
}

function paginateBullets(bullets: string[], charsPerLine = 92, maxHeight = CONTENT_BOTTOM - CONTENT_TOP): string[][] {
  const pages: string[][] = [];
  let current: string[] = [];
  let usedHeight = 0;
  for (const sourceText of bullets) {
    for (const text of splitLongText(sourceText)) {
      const height = estimateBulletHeight(text, charsPerLine);
      const gap = current.length ? 0.13 : 0;
      if (current.length && usedHeight + gap + height > maxHeight) {
        pages.push(current);
        current = [];
        usedHeight = 0;
      }
      current.push(text);
      usedHeight += (current.length > 1 ? 0.13 : 0) + height;
    }
  }
  if (current.length) pages.push(current);
  return pages;
}

function parseMarkdownSections(content: string, requestedTitle: string): { title: string; sections: ParsedSection[] } {
  const sections: ParsedSection[] = [];
  let documentTitle = '';
  let section: ParsedSection | undefined;
  let subSection: { title: string; bullets: string[] } | undefined;
  let paragraph: string[] = [];

  const ensureSection = () => {
    if (!section) {
      section = { title: 'Ringkasan', level: 2, bullets: [], columns: [] };
      sections.push(section);
    }
  };
  const flushParagraph = () => {
    const value = paragraph.join(' ').trim();
    paragraph = [];
    if (!value) return;
    ensureSection();
    if (subSection) subSection.bullets.push(value);
    else section!.bullets.push(value);
  };

  for (const rawLine of content.replace(/\r/g, '').split('\n')) {
    const heading = rawLine.match(/^\s*(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      flushParagraph();
      const level = heading[1].length;
      const headingText = cleanMarkdown(heading[2]);
      if (level === 1 && !documentTitle) {
        documentTitle = headingText;
        continue;
      }
      if (level <= 2 || !section) {
        section = { title: headingText, level, bullets: [], columns: [] };
        sections.push(section);
        subSection = undefined;
      } else {
        ensureSection();
        subSection = { title: headingText, bullets: [] };
        section!.columns.push(subSection);
      }
      continue;
    }
    if (!rawLine.trim()) { flushParagraph(); continue; }
    const bullet = rawLine.match(/^\s*(?:[-*+]\s+|\d+[.)]\s+)(.+)$/);
    if (bullet) {
      flushParagraph();
      ensureSection();
      if (subSection) subSection.bullets.push(bullet[1].trim());
      else section!.bullets.push(bullet[1].trim());
    } else {
      paragraph.push(rawLine.trim());
    }
  }
  flushParagraph();

  if (requestedTitle.trim() && documentTitle && requestedTitle.trim().toLowerCase() === documentTitle.toLowerCase()) {
    documentTitle = requestedTitle.trim();
  }
  return { title: requestedTitle.trim() || documentTitle || 'Presentasi Akademik', sections };
}

function parseChartArtifact(content: string): ChartArtifact {
  let raw: unknown;
  try { raw = JSON.parse(content); } catch { throw new Error('Data grafik tidak dapat dibaca sebagai JSON.'); }
  if (!raw || typeof raw !== 'object') throw new Error('Data grafik tidak memiliki struktur yang valid.');
  const spec = raw as Partial<ChartArtifact>;
  if (spec.type !== 'bar' || !spec.title || !spec.xColumn || !spec.yColumn || !Array.isArray(spec.rows) ||
      typeof spec.datasetVersion !== 'string' || !spec.provenance?.sourceFileId || !spec.provenance.filename || !spec.provenance.sheetName) {
    throw new Error('Grafik memerlukan judul, kolom, baris, versi data, dan identitas sumber yang tercatat.');
  }
  if (!spec.rows.length || spec.rows.some(row => !Number.isFinite(Number(row[spec.yColumn!])))) {
    throw new Error('Grafik harus mempunyai baris dengan nilai numerik yang dapat dihitung.');
  }
  return spec as ChartArtifact;
}

export function buildPresentationOutline(input: EditablePptxOptions): PresentationOutlineSlide[] {
  if (!input.content.trim()) throw new Error('Konten presentasi masih kosong.');
  const title = input.title.trim() || 'Presentasi Akademik';
  const slides: PresentationOutlineSlide[] = [{ title, layout: 'title' }];

  if (input.artifactType === 'CHART') {
    const chart = parseChartArtifact(input.content);
    const categories = chart.rows.map(row => String(row[chart.xColumn] ?? '(kosong)'));
    const values = chart.rows.map(row => Number(row[chart.yColumn]));
    for (let start = 0; start < categories.length; start += 12) {
      const page = Math.floor(start / 12) + 1;
      const pageCount = Math.ceil(categories.length / 12);
      slides.push({
        title: pageCount > 1 ? `${chart.title} (${page}/${pageCount})` : chart.title,
        layout: 'chart',
        chart: {
        categories: categories.slice(start, start + 12),
        values: values.slice(start, start + 12),
        seriesName: chart.yColumn,
        source: {
          documentId: chart.provenance.sourceFileId,
          filename: chart.provenance.filename,
          sheetName: chart.provenance.sheetName,
          version: chart.datasetVersion,
          aggregation: chart.aggregation || 'Agregasi tersimpan'
        },
        notes: `Nilai disalin dari agregasi deterministik pada ${chart.provenance.filename} (dokumen ${chart.provenance.sourceFileId}), sheet ${chart.provenance.sheetName}. Versi sumber: ${chart.datasetVersion}. Operasi: ${chart.aggregation || 'tidak dicatat'}.${pageCount > 1 ? ` Ini bagian ${page} dari ${pageCount} untuk membatasi kepadatan kategori per slide.` : ''}`
        }
      });
    }
    return slides;
  }

  const parsed = parseMarkdownSections(input.content, title);
  for (const section of parsed.sections) {
    const isReference = /daftar\s+(?:pustaka|referensi)|references|bibliography/i.test(section.title);
    const hasComparisonColumns = section.columns.length === 2;
    if (section.level === 1 && !hasComparisonColumns && !isReference) {
      slides.push({ title: section.title, layout: 'section' });
    }

    if (hasComparisonColumns) {
      const leftPages = paginateBullets(section.columns[0].bullets, 44, 4.0);
      const rightPages = paginateBullets(section.columns[1].bullets, 44, 4.0);
      const pageCount = Math.max(leftPages.length, rightPages.length, 1);
      for (let index = 0; index < pageCount; index += 1) {
        slides.push({
          title: section.title,
          layout: 'comparison',
          columns: [
            { title: section.columns[0].title, bullets: leftPages[index] || [] },
            { title: section.columns[1].title, bullets: rightPages[index] || [] }
          ]
        });
      }
      continue;
    }

    const bullets = [...section.bullets, ...section.columns.flatMap(column => [column.title, ...column.bullets])];
    const pages = paginateBullets(bullets, 92, isReference ? 4.9 : CONTENT_BOTTOM - CONTENT_TOP);
    for (const pageBullets of pages) {
      slides.push({ title: section.title, layout: isReference ? 'references' : 'content', bullets: pageBullets });
    }
  }
  return slides;
}

type PresentationSlide = ReturnType<InstanceType<typeof pptxgen>['addSlide']>;

function addSlideBackground(slide: PresentationSlide, theme: typeof THEMES[PresentationTheme], dark = false) {
  slide.background = { color: dark ? '0F172A' : theme.background };
}

function addHeader(slide: PresentationSlide, title: string, theme: typeof THEMES[PresentationTheme]) {
  slide.addText(title, {
    x: 0.78, y: 0.48, w: 11.8, h: 0.72, fontFace: 'Aptos Display', fontSize: 25,
    bold: true, color: theme.title, breakLine: false, fit: 'shrink', margin: 0, valign: 'middle'
  });
  slide.addShape('rect', { x: 0.78, y: 1.35, w: 0.95, h: 0.07, line: { color: theme.accent, transparency: 100 }, fill: { color: theme.accent } });
}

function addBulletList(slide: PresentationSlide, bullets: string[], x: number, y: number, width: number, theme: typeof THEMES[PresentationTheme], fontSize = 17, charsPerLine = 92) {
  let currentY = y;
  for (const bullet of bullets) {
    const height = estimateBulletHeight(bullet, charsPerLine);
    slide.addShape('ellipse', { x, y: currentY + 0.11, w: 0.10, h: 0.10, line: { color: theme.accent, transparency: 100 }, fill: { color: theme.accent } });
    slide.addText(bullet, {
      x: x + 0.28, y: currentY, w: width - 0.28, h: height,
      fontFace: 'Aptos', fontSize, color: theme.foreground, margin: 0,
      valign: 'middle', breakLine: false, fit: 'shrink', paraSpaceAfter: 0
    });
    currentY += height + 0.13;
  }
  if (currentY > CONTENT_BOTTOM + 0.05) throw new Error(`Layout slide melampaui batas: ${currentY.toFixed(2)} inci.`);
}

function buildPptx(input: EditablePptxOptions) {
  const theme = THEMES[input.theme || 'academic_minimal'];
  const outline = buildPresentationOutline(input);
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'RuangTenang Workspace';
  pptx.subject = 'Presentasi akademik yang dapat diedit';
  pptx.title = input.title || outline[0].title;
  pptx.theme = { headFontFace: 'Aptos Display', bodyFontFace: 'Aptos' };

  outline.forEach((item, index) => {
    const slide = pptx.addSlide();
    const isDark = item.layout === 'title' || item.layout === 'section';
    addSlideBackground(slide, theme, isDark);
    if (item.layout === 'title') {
      slide.addShape('rect', { x: 0, y: 0, w: 0.18, h: SLIDE_HEIGHT, line: { color: theme.accent, transparency: 100 }, fill: { color: theme.accent } });
      slide.addShape('ellipse', { x: 10.25, y: 0.42, w: 2.25, h: 2.25, line: { color: theme.accent, transparency: 100 }, fill: { color: theme.accent, transparency: 73 } });
      slide.addText(item.title, {
        x: 0.95, y: 2.45, w: 10.8, h: 1.55, fontFace: 'Aptos Display', fontSize: 34,
        bold: true, color: 'F8FAFC', margin: 0, valign: 'middle', breakLine: false, fit: 'shrink'
      });
      slide.addText('Disusun dari konten Workspace', {
        x: 0.98, y: 4.25, w: 10.0, h: 0.42, fontFace: 'Aptos', fontSize: 15,
        color: 'CBD5E1', margin: 0, fit: 'shrink'
      });
    } else if (item.layout === 'section') {
      slide.addText(item.title, {
        x: 0.95, y: 2.45, w: 11.3, h: 1.3, fontFace: 'Aptos Display', fontSize: 31,
        bold: true, color: 'F8FAFC', margin: 0, valign: 'middle', fit: 'shrink'
      });
      slide.addShape('rect', { x: 0.98, y: 4.08, w: 0.95, h: 0.08, line: { color: theme.accent, transparency: 100 }, fill: { color: theme.accent } });
    } else {
      addHeader(slide, item.title, theme);
      if (item.layout === 'comparison' && item.columns) {
        const left = item.columns[0];
        const right = item.columns[1];
        slide.addShape('roundRect', { x: 0.78, y: 1.75, w: 5.72, h: 4.98, line: { color: 'E2E8F0', width: 1 }, fill: { color: 'F8FAFC' } });
        slide.addShape('roundRect', { x: 6.82, y: 1.75, w: 5.72, h: 4.98, line: { color: 'E2E8F0', width: 1 }, fill: { color: 'F8FAFC' } });
        slide.addText(left.title, { x: 1.05, y: 1.98, w: 5.18, h: 0.48, fontFace: 'Aptos Display', fontSize: 18, bold: true, color: theme.title, margin: 0, fit: 'shrink' });
        slide.addText(right.title, { x: 7.1, y: 1.98, w: 5.18, h: 0.48, fontFace: 'Aptos Display', fontSize: 18, bold: true, color: theme.title, margin: 0, fit: 'shrink' });
        addBulletList(slide, left.bullets, 1.08, 2.68, 5.1, theme, 14, 44);
        addBulletList(slide, right.bullets, 7.12, 2.68, 5.1, theme, 14, 44);
      } else if (item.layout === 'chart' && item.chart) {
        slide.addChart(pptx.ChartType.bar, [{ name: item.chart.seriesName, labels: item.chart.categories, values: item.chart.values }], {
          x: 0.92, y: 1.75, w: 11.35, h: 4.95,
          catAxisLabelFontFace: 'Aptos', catAxisLabelFontSize: 13,
          valAxisLabelFontFace: 'Aptos', valAxisLabelFontSize: 11,
          chartColors: [theme.accent], showTitle: false, showLegend: false, barDir: 'col',
          dataLabelPosition: 'outEnd',
          valGridLine: { color: 'E2E8F0', size: 1 },
          catAxisLabelColor: theme.foreground, valAxisLabelColor: theme.muted,
          showValAxisTitle: false,
          showCatAxisTitle: false, showLeaderLines: false,
          showPercent: false, showLabel: false,
          showSerName: false,
          layout: { x: 0.12, y: 0.05, w: 0.82, h: 0.86 },
          dataLabelColor: theme.foreground,
          dataLabelFormatCode: '#,##0.##'
        });
        slide.addText(`${item.chart.source.filename} · ${item.chart.source.sheetName} · dokumen ${item.chart.source.documentId.slice(0, 12)} · versi ${item.chart.source.version.slice(0, 12)} · ${item.chart.source.aggregation}`, {
          x: 0.82, y: 6.92, w: 11.7, h: 0.25, fontFace: 'Aptos', fontSize: 9,
          color: theme.muted, margin: 0, fit: 'shrink'
        });
        if (item.chart.notes) slide.addNotes(item.chart.notes);
      } else {
        addBulletList(slide, item.bullets || [], 0.98, CONTENT_TOP, CONTENT_WIDTH, theme, item.layout === 'references' ? 13.5 : 17);
      }
    }
    if (item.layout !== 'title' && item.layout !== 'section' && item.layout !== 'chart') {
      slide.addText(`${index + 1} / ${outline.length}`, {
        x: 11.95, y: 7.08, w: 0.55, h: 0.18, fontFace: 'Aptos', fontSize: 9,
        align: 'right', color: theme.muted, margin: 0
      });
    }
    if (item.layout !== 'chart' && item.layout !== 'title' && item.layout !== 'section') {
      slide.addNotes(item.bullets?.join('\n') || item.columns?.map(column => `${column.title}: ${column.bullets.join('; ')}`).join('\n') || item.title);
    }
  });
  return pptx;
}

export async function createEditablePptxBuffer(input: EditablePptxOptions): Promise<Buffer> {
  const pptx = buildPptx(input);
  const output = await pptx.write({ outputType: 'nodebuffer' });
  if (!(output instanceof Uint8Array)) throw new Error('PowerPoint tidak berhasil diserialisasi.');
  return Buffer.from(output);
}

export async function exportEditablePptx(input: EditablePptxOptions): Promise<void> {
  const pptx = buildPptx(input);
  const fileName = `${(input.title || 'presentasi_akademik').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 48) || 'presentasi_akademik'}.pptx`;
  await pptx.writeFile({ fileName, compression: true });
}
