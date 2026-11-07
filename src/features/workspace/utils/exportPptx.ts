export * from './exportPptxThemes';
import type PptxGenJS from 'pptxgenjs';
import {
  THEMES,
  type PresentationTheme,
  type PresentationOutlineSlide,
  type EditablePptxOptions,
} from './exportPptxThemes';

const SLIDE_HEIGHT = 7.5;
const CONTENT_BOTTOM = 6.85;
const CONTENT_TOP = 1.85;
const CONTENT_WIDTH = 11.75;

interface ParsedSection {
  title: string;
  level: number;
  bullets: string[];
  columns: Array<{ title: string; bullets: string[] }>;
  image?: { url: string; caption?: string };
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
    .replace(/^\s*[-*_]{3,}\s*$/, '')
    .trim();
}

function splitLongText(value: string, maxCharacters = 190): string[] {
  const text = cleanMarkdown(value);
  if (!text) return [];
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
      if (!text || /^[-*_]{3,}$/.test(text)) continue;
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

  const ensureSection = (defaultTitle = 'Ringkasan') => {
    if (!section) {
      section = { title: defaultTitle, level: 2, bullets: [], columns: [] };
      sections.push(section);
    }
  };
  const flushParagraph = () => {
    const value = paragraph.join(' ').trim();
    paragraph = [];
    if (!value || /^[-*_]{3,}$/.test(value)) return;
    ensureSection();
    if (subSection) subSection.bullets.push(value);
    else section!.bullets.push(value);
  };

  for (const rawLine of content.replace(/\r/g, '').split('\n')) {
    const trimmed = rawLine.trim();

    // 1. Explicit slide divider (--- or *** or ___)
    if (/^[-*_]{3,}$/.test(trimmed)) {
      flushParagraph();
      section = undefined;
      subSection = undefined;
      continue;
    }

    // 2. Markdown heading (# to ######)
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

    // 3. Bold-only heading on its own line: **Heading** or __Heading__
    const boldHeading = rawLine.match(/^\s*(?:\*\*(.+?)\*\*|__(.+?)__)\s*:?\s*$/);
    if (boldHeading) {
      flushParagraph();
      const boldText = cleanMarkdown(boldHeading[1] || boldHeading[2]);
      if (!section || section.bullets.length > 0 || section.columns.length > 0) {
        section = { title: boldText, level: 2, bullets: [], columns: [] };
        sections.push(section);
        subSection = undefined;
      } else if (section && section.title === 'Ringkasan' && section.bullets.length === 0) {
        section.title = boldText;
      } else {
        ensureSection();
        subSection = { title: boldText, bullets: [] };
        section!.columns.push(subSection);
      }
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    // 4. Image
    const imageMatch = rawLine.match(/^!\[(.*?)\]\((.*?)\)/);
    if (imageMatch) {
      flushParagraph();
      ensureSection();
      section!.image = { caption: cleanMarkdown(imageMatch[1]), url: imageMatch[2].trim() };
      continue;
    }

    // 5. Bullet item
    const bullet = rawLine.match(/^\s*(?:[-*+]\s+|\d+[.)]\s+)(.+)$/);
    if (bullet) {
      flushParagraph();
      const bulletText = bullet[1].trim();
      if (/^[-*_]{3,}$/.test(bulletText)) {
        section = undefined;
        subSection = undefined;
        continue;
      }
      ensureSection();
      if (subSection) subSection.bullets.push(bulletText);
      else section!.bullets.push(bulletText);
    } else {
      paragraph.push(trimmed);
    }
  }
  flushParagraph();

  let presentationTitle = requestedTitle.trim();
  if ((!presentationTitle || /^jawaban(\.{0,3}|_.*)?$/i.test(presentationTitle)) && documentTitle) {
    presentationTitle = documentTitle;
  }
  if (!presentationTitle) {
    presentationTitle = documentTitle || 'Presentasi Akademik';
  }
  return { title: presentationTitle, sections };
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
  try {
    const deck = JSON.parse(input.content) as {
      format?: string;
      slides?: Array<{
        title?: unknown;
        body?: unknown;
        notes?: unknown;
        layout?: unknown;
        columns?: unknown;
        cards?: unknown;
        highlight?: unknown;
        imageUrl?: unknown;
        imageCaption?: unknown;
      }>;
    };
    if (deck.format === 'ruangtenang-presentation-v1') {
      if (!Array.isArray(deck.slides) || deck.slides.length === 0 || deck.slides.length > 300) throw new Error('Presentasi memerlukan 1–300 slide.');
      return deck.slides.map((slide, index) => {
        if (typeof slide.title !== 'string' || typeof slide.body !== 'string' || typeof slide.notes !== 'string') throw new Error(`Konten slide ${index + 1} tidak valid.`);
        const baseSlide: PresentationOutlineSlide = {
          title: slide.title.trim() || `Slide ${index + 1}`,
          layout: index === 0 ? 'title' : ((slide as any).layout || ((slide as any).imageUrl ? 'image_content' : 'content')),
          bullets: slide.body
            .split(/\r?\n/)
            .map(line => line.replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/, '').trim())
            .filter(line => line && !/^[-*_]{3,}$/.test(line)),
          notes: slide.notes
        };
        if ((slide as any).imageUrl) {
          baseSlide.image = { url: (slide as any).imageUrl, caption: (slide as any).imageCaption };
        }
        if (Array.isArray((slide as any).columns)) {
          baseSlide.columns = (slide as any).columns;
        }
        if (Array.isArray((slide as any).cards)) {
          baseSlide.cards = (slide as any).cards;
        }
        if ((slide as any).highlight) {
          baseSlide.highlight = (slide as any).highlight;
        }
        if ((slide as any).table) {
          baseSlide.table = (slide as any).table;
        }
        if ((slide as any).chart) {
          baseSlide.chart = (slide as any).chart;
        }
        return baseSlide;
      });
    }
  } catch (error) {
    if (error instanceof SyntaxError) { /* Markdown is also a supported source format. */ }
    else throw error;
  }
  const title = input.title.trim() || 'Presentasi Akademik';
  const parsed = parseMarkdownSections(input.content, title);
  const slides: PresentationOutlineSlide[] = [{ title: parsed.title, layout: 'title' }];

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

    if (section.columns.length >= 3) {
      slides.push({
        title: section.title,
        layout: 'cards',
        cards: section.columns.map(col => ({
          title: col.title,
          bullets: col.bullets.map(cleanMarkdown).filter(b => b && !/^[-*_]{3,}$/.test(b))
        }))
      });
      continue;
    }

    const bullets = [
      ...section.bullets,
      ...section.columns.flatMap(column => [column.title, ...column.bullets])
    ].map(cleanMarkdown).filter(b => b && !/^[-*_]{3,}$/.test(b));

    const pages = paginateBullets(bullets, section.image ? 44 : 92, isReference ? 4.9 : CONTENT_BOTTOM - CONTENT_TOP);
    for (let index = 0; index < pages.length; index++) {
      const pageBullets = pages[index];
      const outlineSlide: PresentationOutlineSlide = {
        title: index === 0 ? section.title : `${section.title} (${index + 1})`,
        layout: isReference ? 'references' : (section.image && index === 0 ? 'image_content' : 'content'),
        bullets: pageBullets
      };
      if (section.image && index === 0) {
        outlineSlide.image = section.image;
      }
      slides.push(outlineSlide);
    }
  }
  return slides;
}

type PresentationSlide = ReturnType<PptxGenJS['addSlide']>;

function addSlideBackground(slide: PresentationSlide, theme: typeof THEMES[PresentationTheme], dark = false) {
  slide.background = { color: dark ? (theme.isDark ? theme.background : '0F172A') : theme.background };
}

function addHeader(slide: PresentationSlide, title: string, theme: typeof THEMES[PresentationTheme], kicker?: string) {
  const kickerText = (kicker || 'POIN UTAMA').toUpperCase();
  slide.addText(kickerText, {
    x: 0.78, y: 0.38, w: 8.0, h: 0.24, fontFace: 'Aptos', fontSize: 9.5,
    bold: true, color: theme.accent, margin: 0, valign: 'middle'
  });
  slide.addText(title, {
    x: 0.78, y: 0.62, w: 11.75, h: 0.72, fontFace: 'Aptos Display', fontSize: 24,
    bold: true, color: theme.title, breakLine: false, fit: 'shrink', margin: 0, valign: 'middle'
  });
  slide.addShape('rect', {
    x: 0.78, y: 1.38, w: 1.25, h: 0.05,
    line: { color: theme.accent, transparency: 100 },
    fill: { color: theme.accent }
  });
  slide.addShape('rect', {
    x: 2.08, y: 1.39, w: 0.22, h: 0.03,
    line: { color: theme.muted, transparency: 60 },
    fill: { color: theme.muted, transparency: 60 }
  });
}

function addBulletList(
  slide: PresentationSlide,
  bullets: string[],
  x: number,
  y: number,
  width: number,
  theme: typeof THEMES[PresentationTheme],
  fontSize = 16,
  charsPerLine = 92
) {
  let currentY = y;
  for (const rawBullet of bullets) {
    const bullet = cleanMarkdown(rawBullet);
    if (!bullet || /^[-*_]{3,}$/.test(bullet)) continue;
    const height = estimateBulletHeight(bullet, charsPerLine);

    // Styled modern bullet dot
    slide.addShape('ellipse', {
      x,
      y: currentY + 0.08,
      w: 0.09,
      h: 0.09,
      line: { color: theme.accent, transparency: 100 },
      fill: { color: theme.accent }
    });

    // Lead-in bolding check: e.g. "Label: Description" or "Label - Description"
    const leadInMatch = bullet.match(/^([A-Za-z0-9\s/&()_-]{2,35}\s*[:–-])\s*(.+)$/);
    if (leadInMatch) {
      slide.addText([
        { text: leadInMatch[1] + ' ', options: { bold: true, color: theme.title, fontSize } },
        { text: leadInMatch[2], options: { bold: false, color: theme.foreground, fontSize } }
      ], {
        x: x + 0.26,
        y: currentY,
        w: width - 0.26,
        h: height,
        fontFace: 'Aptos',
        margin: 0,
        valign: 'middle',
        breakLine: false,
        fit: 'shrink'
      });
    } else {
      slide.addText(bullet, {
        x: x + 0.26,
        y: currentY,
        w: width - 0.26,
        h: height,
        fontFace: 'Aptos',
        fontSize,
        color: theme.foreground,
        margin: 0,
        valign: 'middle',
        breakLine: false,
        fit: 'shrink',
        paraSpaceAfter: 0
      });
    }
    currentY += height + 0.12;
  }
}

function addCardsLayout(
  slide: PresentationSlide,
  cards: Array<{ title: string; bullets: string[] }>,
  theme: typeof THEMES[PresentationTheme]
) {
  const cardCount = Math.min(cards.length, 4);
  if (cardCount <= 0) return;

  if (cardCount === 3) {
    const cardWidth = 3.75;
    const gap = 0.25;
    const startX = 0.78;
    const topY = 1.75;
    const cardHeight = 4.95;

    cards.slice(0, 3).forEach((card, idx) => {
      const x = startX + idx * (cardWidth + gap);
      slide.addShape('roundRect', {
        x, y: topY, w: cardWidth, h: cardHeight,
        line: { color: theme.cardBorder, width: 1 },
        fill: { color: theme.cardBg }
      });
      slide.addShape('rect', {
        x: x + 0.05, y: topY, w: cardWidth - 0.1, h: 0.08,
        line: { color: theme.accent, transparency: 100 },
        fill: { color: theme.accent }
      });
      slide.addShape('roundRect', {
        x: x + 0.2, y: topY + 0.22, w: 0.48, h: 0.3,
        line: { color: theme.tagBg, transparency: 100 },
        fill: { color: theme.tagBg }
      });
      slide.addText(String(idx + 1).padStart(2, '0'), {
        x: x + 0.2, y: topY + 0.22, w: 0.48, h: 0.3,
        fontFace: 'Aptos', fontSize: 10.5, bold: true, color: theme.tagColor,
        align: 'center', valign: 'middle', margin: 0
      });
      slide.addText(card.title, {
        x: x + 0.78, y: topY + 0.18, w: cardWidth - 0.98, h: 0.38,
        fontFace: 'Aptos Display', fontSize: 15, bold: true, color: theme.title,
        margin: 0, valign: 'middle', fit: 'shrink'
      });
      slide.addShape('rect', {
        x: x + 0.2, y: topY + 0.65, w: cardWidth - 0.4, h: 0.015,
        line: { color: theme.cardBorder }, fill: { color: theme.cardBorder }
      });
      addBulletList(slide, card.bullets, x + 0.2, topY + 0.82, cardWidth - 0.4, theme, 13, 34);
    });
  } else if (cardCount === 4) {
    const cardWidth = 5.72;
    const cardHeight = 2.38;
    const colXs = [0.78, 6.82];
    const rowYs = [1.75, 4.32];

    cards.slice(0, 4).forEach((card, idx) => {
      const x = colXs[idx % 2];
      const y = rowYs[Math.floor(idx / 2)];
      slide.addShape('roundRect', {
        x, y, w: cardWidth, h: cardHeight,
        line: { color: theme.cardBorder, width: 1 },
        fill: { color: theme.cardBg }
      });
      slide.addShape('rect', {
        x: x + 0.05, y, w: cardWidth - 0.1, h: 0.06,
        line: { color: theme.accent, transparency: 100 },
        fill: { color: theme.accent }
      });
      slide.addShape('roundRect', {
        x: x + 0.2, y: y + 0.18, w: 0.46, h: 0.28,
        line: { color: theme.tagBg, transparency: 100 },
        fill: { color: theme.tagBg }
      });
      slide.addText(String(idx + 1).padStart(2, '0'), {
        x: x + 0.2, y: y + 0.18, w: 0.46, h: 0.28,
        fontFace: 'Aptos', fontSize: 10, bold: true, color: theme.tagColor,
        align: 'center', valign: 'middle', margin: 0
      });
      slide.addText(card.title, {
        x: x + 0.75, y: y + 0.15, w: cardWidth - 0.95, h: 0.34,
        fontFace: 'Aptos Display', fontSize: 15, bold: true, color: theme.title,
        margin: 0, valign: 'middle', fit: 'shrink'
      });
      addBulletList(slide, card.bullets, x + 0.2, y + 0.58, cardWidth - 0.4, theme, 12.5, 48);
    });
  } else {
    const cardWidth = 5.72;
    const cardHeight = 4.95;
    const colXs = [0.78, 6.82];
    cards.slice(0, 2).forEach((card, idx) => {
      const x = colXs[idx];
      slide.addShape('roundRect', {
        x, y: 1.75, w: cardWidth, h: cardHeight,
        line: { color: theme.cardBorder, width: 1 },
        fill: { color: theme.cardBg }
      });
      slide.addShape('rect', {
        x: x + 0.05, y: 1.75, w: cardWidth - 0.1, h: 0.08,
        line: { color: theme.accent, transparency: 100 },
        fill: { color: theme.accent }
      });
      slide.addText(card.title, {
        x: x + 0.25, y: 1.95, w: cardWidth - 0.5, h: 0.45,
        fontFace: 'Aptos Display', fontSize: 17, bold: true, color: theme.title,
        margin: 0, valign: 'middle', fit: 'shrink'
      });
      addBulletList(slide, card.bullets, x + 0.25, 2.65, cardWidth - 0.5, theme, 13.5, 44);
    });
  }
}

function addHighlightLayout(
  slide: PresentationSlide,
  item: PresentationOutlineSlide,
  theme: typeof THEMES[PresentationTheme]
) {
  const highlightText = item.highlight?.text || item.bullets?.[0] || item.title;
  const supportingBullets = item.highlight?.subtext
    ? [item.highlight.subtext, ...(item.bullets || [])]
    : (item.bullets?.slice(1) || []);

  slide.addShape('roundRect', {
    x: 0.78, y: 1.75, w: 11.75, h: 2.35,
    line: { color: theme.accent, width: 1.2 },
    fill: { color: theme.accentLight }
  });
  slide.addShape('rect', {
    x: 0.78, y: 1.75, w: 0.16, h: 2.35,
    line: { color: theme.accent, transparency: 100 },
    fill: { color: theme.accent }
  });
  slide.addShape('roundRect', {
    x: 1.15, y: 1.95, w: 2.0, h: 0.32,
    line: { color: theme.accent, transparency: 100 },
    fill: { color: theme.accent }
  });
  slide.addText('POIN UTAMA', {
    x: 1.15, y: 1.95, w: 2.0, h: 0.32,
    fontFace: 'Aptos', fontSize: 9.5, bold: true, color: 'FFFFFF',
    align: 'center', valign: 'middle', margin: 0
  });
  slide.addText(highlightText, {
    x: 1.15, y: 2.38, w: 11.1, h: 1.55,
    fontFace: 'Aptos Display', fontSize: 19, bold: true, color: theme.title,
    margin: 0, valign: 'middle', fit: 'shrink'
  });

  if (supportingBullets.length) {
    slide.addShape('roundRect', {
      x: 0.78, y: 4.35, w: 11.75, h: 2.35,
      line: { color: theme.cardBorder, width: 1 },
      fill: { color: theme.cardBg }
    });
    slide.addText('IMPLIKASI & TINDAK LANJUT', {
      x: 1.05, y: 4.48, w: 6.0, h: 0.28,
      fontFace: 'Aptos', fontSize: 9.5, bold: true, color: theme.muted,
      margin: 0, valign: 'middle'
    });
    addBulletList(slide, supportingBullets, 1.05, 4.85, 11.2, theme, 13.5, 88);
  }
}

function addTableLayout(
  slide: PresentationSlide,
  table: { headers: string[]; rows: string[][] },
  theme: typeof THEMES[PresentationTheme]
) {
  if (!table.headers.length && !table.rows.length) return;

  const headerRow = table.headers.map(header => ({
    text: header,
    options: {
      fill: { color: theme.accent },
      color: 'FFFFFF',
      fontFace: 'Aptos',
      fontSize: 12,
      bold: true,
      align: 'center',
      valign: 'middle'
    }
  }));

  const bodyRows = table.rows.slice(0, 8).map((row, rowIdx) => {
    const isEven = rowIdx % 2 === 0;
    return row.map(cell => ({
      text: cell,
      options: {
        fill: { color: isEven ? theme.cardBg : theme.cardHeaderBg },
        color: theme.foreground,
        fontFace: 'Aptos',
        fontSize: 11,
        align: 'left',
        valign: 'middle'
      }
    }));
  });

  const allRows = [headerRow, ...bodyRows];
  slide.addTable(allRows as any, {
    x: 0.78,
    y: 1.75,
    w: 11.75,
    border: { type: 'solid', pt: 1, color: theme.cardBorder },
    margin: [6, 8, 6, 8]
  });
}

async function buildPptx(input: EditablePptxOptions) {
  let selectedTheme = input.theme || 'academic_minimal';
  try {
    const deck = JSON.parse(input.content) as { format?: string; theme?: PresentationTheme };
    if (deck.format === 'ruangtenang-presentation-v1' && deck.theme && deck.theme in THEMES) selectedTheme = deck.theme;
  } catch { /* Markdown presentation */ }
  const theme = THEMES[selectedTheme];
  const outline = buildPresentationOutline(input);
  const pptxgenMod = await import('pptxgenjs');
  const PptxGen = (pptxgenMod.default || pptxgenMod) as unknown as new () => PptxGenJS;
  const pptx = new PptxGen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'RuangTenang Workspace';
  pptx.subject = 'Presentasi akademik yang dapat diedit';
  const docTitle = input.title || outline[0].title;
  pptx.title = docTitle;
  pptx.theme = { headFontFace: 'Aptos Display', bodyFontFace: 'Aptos' };

  outline.forEach((item, index) => {
    const slide = pptx.addSlide();
    const isDark = item.layout === 'title' || item.layout === 'section';
    addSlideBackground(slide, theme, isDark);

    if (item.layout === 'title') {
      slide.addShape('rect', { x: 0, y: 0, w: 0.18, h: SLIDE_HEIGHT, line: { color: theme.accent, transparency: 100 }, fill: { color: theme.accent } });
      slide.addShape('ellipse', { x: 10.25, y: 0.42, w: 2.25, h: 2.25, line: { color: theme.accent, transparency: 100 }, fill: { color: theme.accent, transparency: 73 } });
      slide.addShape('roundRect', { x: 10.8, y: 0.6, w: 1.8, h: 1.8, line: { color: theme.accent, transparency: 85 }, fill: { color: theme.accent, transparency: 88 } });

      // Optional Campus Logo on Cover
      if (input.logoUrl) {
        try {
          const rawUrl = input.logoUrl;
          const imageTarget = typeof window !== 'undefined' && rawUrl.startsWith('/') ? `${window.location.origin}${rawUrl}` : rawUrl;
          slide.addImage({
            path: imageTarget,
            x: 0.95, y: 0.82, w: 2.4, h: 0.7,
            sizing: { type: 'contain', w: 2.4, h: 0.7 }
          });
        } catch { /* Continue gracefully */ }
      }

      // Badge on top
      const badgeText = input.campusName ? input.campusName.toUpperCase() : 'RUANGTENANG WORKSPACE';
      slide.addShape('roundRect', { x: 0.95, y: 1.65, w: 2.6, h: 0.35, line: { color: theme.accent, transparency: 100 }, fill: { color: theme.accent } });
      slide.addText(badgeText, {
        x: 0.95, y: 1.65, w: 2.6, h: 0.35, fontFace: 'Aptos', fontSize: 9.5,
        bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', margin: 0
      });

      // Title
      slide.addText(item.title, {
        x: 0.95, y: 2.25, w: 10.8, h: 1.8, fontFace: 'Aptos Display', fontSize: 34,
        bold: true, color: 'F8FAFC', margin: 0, valign: 'middle', breakLine: false, fit: 'shrink'
      });

      // Subtitle
      slide.addText(item.bullets?.join('\n') || (input.campusName ? `Materi Presentasi Akademik · ${input.campusName}` : 'Disusun dari konten Workspace'), {
        x: 0.98, y: 4.25, w: 10.0, h: 0.8, fontFace: 'Aptos', fontSize: 15,
        color: 'CBD5E1', margin: 0, fit: 'shrink'
      });

      // Metadata footer
      slide.addShape('rect', { x: 0.98, y: 5.85, w: 10.5, h: 0.015, line: { color: '334155' }, fill: { color: '334155' } });
      slide.addText(`Format Presentasi Akademik & Profesional · ${input.campusName || 'RuangTenang'}`, {
        x: 0.98, y: 5.95, w: 10.0, h: 0.3, fontFace: 'Aptos', fontSize: 10,
        color: '94A3B8', margin: 0
      });
    } else if (item.layout === 'section') {
      slide.addShape('rect', { x: 0, y: 0, w: 0.18, h: SLIDE_HEIGHT, line: { color: theme.accent, transparency: 100 }, fill: { color: theme.accent } });
      slide.addText('SEKSI / BAGIAN', {
        x: 0.95, y: 2.05, w: 4.0, h: 0.28, fontFace: 'Aptos', fontSize: 10,
        bold: true, color: theme.accent, margin: 0
      });
      slide.addText(item.title, {
        x: 0.95, y: 2.45, w: 11.3, h: 1.3, fontFace: 'Aptos Display', fontSize: 31,
        bold: true, color: 'F8FAFC', margin: 0, valign: 'middle', fit: 'shrink'
      });
      slide.addShape('rect', { x: 0.98, y: 4.08, w: 0.95, h: 0.08, line: { color: theme.accent, transparency: 100 }, fill: { color: theme.accent } });
    } else {
      addHeader(slide, item.title, theme, item.kicker);

      // Optional Campus Logo on Header
      if (input.logoUrl) {
        try {
          const rawUrl = input.logoUrl;
          const imageTarget = typeof window !== 'undefined' && rawUrl.startsWith('/') ? `${window.location.origin}${rawUrl}` : rawUrl;
          slide.addImage({
            path: imageTarget,
            x: 11.1, y: 0.35, w: 1.4, h: 0.45,
            sizing: { type: 'contain', w: 1.4, h: 0.45 }
          });
        } catch { /* Continue gracefully */ }
      }

      if (item.layout === 'comparison' && item.columns) {
        const left = item.columns[0];
        const right = item.columns[1];
        slide.addShape('roundRect', { x: 0.78, y: 1.75, w: 5.72, h: 4.95, line: { color: theme.cardBorder, width: 1 }, fill: { color: theme.cardBg } });
        slide.addShape('roundRect', { x: 6.82, y: 1.75, w: 5.72, h: 4.95, line: { color: theme.cardBorder, width: 1 }, fill: { color: theme.cardBg } });
        // Top accent strips
        slide.addShape('rect', { x: 0.83, y: 1.75, w: 5.62, h: 0.08, line: { color: theme.accent, transparency: 100 }, fill: { color: theme.accent } });
        slide.addShape('rect', { x: 6.87, y: 1.75, w: 5.62, h: 0.08, line: { color: theme.accent, transparency: 100 }, fill: { color: theme.accent } });
        // Titles
        slide.addText(left.title, { x: 1.05, y: 1.98, w: 5.18, h: 0.48, fontFace: 'Aptos Display', fontSize: 18, bold: true, color: theme.title, margin: 0, fit: 'shrink' });
        slide.addText(right.title, { x: 7.1, y: 1.98, w: 5.18, h: 0.48, fontFace: 'Aptos Display', fontSize: 18, bold: true, color: theme.title, margin: 0, fit: 'shrink' });
        addBulletList(slide, left.bullets, 1.08, 2.68, 5.1, theme, 14, 44);
        addBulletList(slide, right.bullets, 7.12, 2.68, 5.1, theme, 14, 44);
      } else if (item.layout === 'cards' && item.cards) {
        addCardsLayout(slide, item.cards, theme);
      } else if (item.layout === 'highlight') {
        addHighlightLayout(slide, item, theme);
      } else if (item.layout === 'table' && item.table) {
        addTableLayout(slide, item.table, theme);
      } else if (item.layout === 'chart' && item.chart) {
        const chartType = item.chart.type === 'pie' ? pptx.ChartType.pie : (item.chart.type === 'line' ? pptx.ChartType.line : pptx.ChartType.bar);
        slide.addChart(chartType, [{ name: item.chart.seriesName, labels: item.chart.categories, values: item.chart.values }], {
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
        if (item.chart.source) {
          slide.addText(`${item.chart.source.filename} · ${item.chart.source.sheetName} · dokumen ${item.chart.source.documentId.slice(0, 12)} · versi ${item.chart.source.version.slice(0, 12)} · ${item.chart.source.aggregation}`, {
            x: 0.82, y: 6.92, w: 11.7, h: 0.25, fontFace: 'Aptos', fontSize: 9,
            color: theme.muted, margin: 0, fit: 'shrink'
          });
        }
        if (item.chart.notes) slide.addNotes(item.chart.notes);
      } else if (item.layout === 'image_content' && item.image?.url) {
        addBulletList(slide, item.bullets || [], 0.98, CONTENT_TOP, 5.2, theme, 15, 42);
        try {
          const rawUrl = item.image.url;
          let imageTarget = rawUrl;
          if (typeof window !== 'undefined' && rawUrl.startsWith('/')) {
            imageTarget = `${window.location.origin}${rawUrl}`;
          }
          slide.addImage({
            path: imageTarget,
            x: 6.65,
            y: 1.85,
            w: 5.75,
            h: 4.6,
            sizing: { type: 'contain', w: 5.75, h: 4.6 }
          });
          if (item.image.caption) {
            slide.addText(item.image.caption, {
              x: 6.65, y: 6.52, w: 5.75, h: 0.3,
              fontFace: 'Aptos', fontSize: 10, italic: true,
              color: theme.muted, align: 'center', margin: 0
            });
          }
        } catch {
          // Gracefully continue if image cannot be loaded
        }
      } else {
        addBulletList(slide, item.bullets || [], 0.98, CONTENT_TOP, CONTENT_WIDTH, theme, item.layout === 'references' ? 13.5 : 16.5);
      }
    }

    // Modern Slide Footer
    if (item.layout !== 'title' && item.layout !== 'section' && item.layout !== 'chart') {
      slide.addShape('rect', {
        x: 0.78, y: 6.98, w: 11.75, h: 0.015,
        line: { color: theme.cardBorder }, fill: { color: theme.cardBorder }
      });
      slide.addText(`${docTitle.slice(0, 48)} · RuangTenang Workspace`, {
        x: 0.78, y: 7.06, w: 8.5, h: 0.20,
        fontFace: 'Aptos', fontSize: 9, color: theme.muted, margin: 0
      });
      slide.addText(`${index + 1} / ${outline.length}`, {
        x: 11.35, y: 7.06, w: 1.15, h: 0.20,
        fontFace: 'Aptos', fontSize: 9, bold: true, align: 'right', color: theme.muted, margin: 0
      });
    }

    if (item.notes) slide.addNotes(item.notes);
    else if (item.layout !== 'chart' && item.layout !== 'title' && item.layout !== 'section') {
      slide.addNotes(item.bullets?.join('\n') || item.columns?.map(column => `${column.title}: ${column.bullets.join('; ')}`).join('\n') || item.cards?.map(c => `${c.title}: ${c.bullets.join('; ')}`).join('\n') || item.title);
    }
  });
  return pptx;
}

export async function createEditablePptxBuffer(input: EditablePptxOptions): Promise<Buffer> {
  const pptx = await buildPptx(input);
  const output = await pptx.write({ outputType: 'nodebuffer' });
  if (!(output instanceof Uint8Array)) throw new Error('PowerPoint tidak berhasil diserialisasi.');
  return Buffer.from(output);
}

export async function exportEditablePptx(input: EditablePptxOptions): Promise<void> {
  const pptx = await buildPptx(input);
  const fileName = `${(input.title || 'presentasi_akademik').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 48) || 'presentasi_akademik'}.pptx`;
  await pptx.writeFile({ fileName, compression: true });
}
