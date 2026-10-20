/**
 * Academic Standard .docx Exporter for RuangKerja (RuangTenang Kampus)
 * Editable academic DOCX generation with selectable campus-style presets.
 */

import { formatAsAPA7, formatAsIEEE, parseCitations } from './citationExport';

export type AcademicCitationStyle = 'APA7' | 'IEEE';
export type AcademicPageNumbering = 'arabic_top_right' | 'roman_bottom_center' | 'roman_front_arabic_main' | 'none';

export interface AcademicStyleProfile {
  paperSize: 'A4' | 'LETTER';
  marginTopCm: number;
  marginBottomCm: number;
  marginLeftCm: number;
  marginRightCm: number;
  fontFamily: string;
  fontSizePt: number;
  lineSpacing: 1 | 1.15 | 1.5 | 2;
  citationStyle: AcademicCitationStyle;
  pageNumbering: AcademicPageNumbering;
}

export interface ExportDocxOptions {
  title: string;
  content: string;
  templateType?: 'skripsi' | 'makalah' | 'ieee_apa';
  authorName?: string;
  university?: string;
  faculty?: string;
  style?: AcademicStyleProfile;
}

export function createAcademicStylePreset(templateType: ExportDocxOptions['templateType'] = 'skripsi'): AcademicStyleProfile {
  if (templateType === 'skripsi') {
    return { paperSize: 'A4', marginTopCm: 4, marginBottomCm: 3, marginLeftCm: 4, marginRightCm: 3, fontFamily: 'Times New Roman', fontSizePt: 12, lineSpacing: 1.5, citationStyle: 'APA7', pageNumbering: 'roman_front_arabic_main' };
  }
  if (templateType === 'ieee_apa') {
    return { paperSize: 'A4', marginTopCm: 2.54, marginBottomCm: 2.54, marginLeftCm: 2.54, marginRightCm: 2.54, fontFamily: 'Times New Roman', fontSizePt: 12, lineSpacing: 2, citationStyle: 'APA7', pageNumbering: 'arabic_top_right' };
  }
  return { paperSize: 'A4', marginTopCm: 3, marginBottomCm: 3, marginLeftCm: 3, marginRightCm: 3, fontFamily: 'Times New Roman', fontSizePt: 12, lineSpacing: 1.5, citationStyle: 'APA7', pageNumbering: 'arabic_top_right' };
}

function normalizeAcademicStyle(style: AcademicStyleProfile): AcademicStyleProfile {
  const boundMargin = (value: number) => Math.min(7, Math.max(1, Number.isFinite(value) ? value : 2.54));
  const fontSizePt = Math.min(16, Math.max(9, Number.isFinite(style.fontSizePt) ? style.fontSizePt : 12));
  const allowedLineSpacing: AcademicStyleProfile['lineSpacing'][] = [1, 1.15, 1.5, 2];
  return {
    ...style,
    paperSize: style.paperSize === 'LETTER' ? 'LETTER' : 'A4',
    marginTopCm: boundMargin(style.marginTopCm),
    marginBottomCm: boundMargin(style.marginBottomCm),
    marginLeftCm: boundMargin(style.marginLeftCm),
    marginRightCm: boundMargin(style.marginRightCm),
    fontFamily: style.fontFamily.trim().slice(0, 80) || 'Times New Roman',
    fontSizePt,
    lineSpacing: allowedLineSpacing.includes(style.lineSpacing) ? style.lineSpacing : 1.5,
    citationStyle: style.citationStyle === 'IEEE' ? 'IEEE' : 'APA7'
  };
}

function formatBibliographyForStyle(content: string, style: AcademicCitationStyle): string {
  const heading = /^((?:#{1,6}\s*)?(?:DAFTAR\s+(?:PUSTAKA|REFERENSI)|REFERENCES|BIBLIOGRAPHY)\b[^\n]*)/im.exec(content);
  if (!heading || heading.index === undefined) return content;
  const bodyStart = heading.index + heading[0].length;
  const tail = content.slice(bodyStart);
  const nextHeading = /\n(?=\s*#{1,6}\s+)/.exec(tail);
  const bodyEnd = nextHeading?.index ?? tail.length;
  const rawReferences = tail.slice(0, bodyEnd).trim();
  const references = parseCitations(rawReferences);
  if (!references.length) return content;
  const formatted = style === 'IEEE' ? formatAsIEEE(references) : formatAsAPA7(references);
  if (!formatted) return content;
  return `${content.slice(0, bodyStart)}\n\n${formatted}${tail.slice(bodyEnd)}`;
}

export interface AcademicCompletenessCheck {
  structuralStatus: 'passed' | 'needs_review';
  formattingStatus: 'not_checked';
  referenceStatus: 'passed' | 'needs_review';
  evidenceStatus: 'not_checked';
  outputIntegrityStatus: 'not_checked';
  wordCount: number;
  estimatedPages: number;
  hasTitle: boolean;
  hasAbstract: boolean;
  hasCitations: boolean;
  hasReferences: boolean;
  hasBabStructure: boolean;
  citationCount: number;
  checks: {
    id: string;
    label: string;
    description: string;
    passed: boolean;
    required: boolean;
  }[];
}

/**
 * Validates the academic completeness of an artifact/document before export
 */
export function validateAcademicCompleteness(content: string, title?: string): AcademicCompletenessCheck {
  if (!content || !content.trim()) {
    return {
      structuralStatus: 'needs_review', formattingStatus: 'not_checked', referenceStatus: 'needs_review',
      evidenceStatus: 'not_checked', outputIntegrityStatus: 'not_checked',
      wordCount: 0,
      estimatedPages: 0,
      hasTitle: false,
      hasAbstract: false,
      hasCitations: false,
      hasReferences: false,
      hasBabStructure: false,
      citationCount: 0,
      checks: [
        { id: 'title', label: 'Judul Naskah', description: 'Judul karya ilmiah yang jelas', passed: false, required: true },
        { id: 'abstract', label: 'Abstrak / Ringkasan', description: 'Ringkasan esensial karya ilmiah', passed: false, required: true },
        { id: 'structure', label: 'Struktur BAB / Bagian', description: 'Struktur bab (BAB I, BAB II, dst.)', passed: false, required: false },
        { id: 'citations', label: 'Sitasi Dalam Teks', description: 'Kutipan rujukan format (Nama, Tahun) atau [1]', passed: false, required: true },
        { id: 'references', label: 'Daftar Pustaka / Referensi', description: 'Daftar pustaka atau bibliografi di akhir', passed: false, required: true }
      ]
    };
  }

  const words = content.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const estimatedPages = Math.max(1, Math.ceil(wordCount / 300)); // ~300 words per page in 1.5 line spacing

  const hasTitle = Boolean(title && title.trim().length > 3 && !title.toLowerCase().includes('tanpa judul')) || /^#\s+[^\n]+/m.test(content);
  const hasAbstract = /^(?:#+\s*)?(ABSTRAK|ABSTRACT|RINGKASAN EKSEKUTIF)\b/im.test(content);
  const hasBabStructure = /^(?:#+\s*)?(BAB\s+[IVXLCDM\d]+|BAB\s+1\b|1\.\s+PENDAHULUAN)/im.test(content);
  
  // Deteksi sitasi format (Author, Year), (Author et al., Year), atau [1], [2]
  const citationMatches = content.match(/\((?:[A-Z][a-zA-Z\s]+,\s*(?:19|20)\d{2}|[A-Z][a-zA-Z\s]+(?:\s+et\s+al\.?|\s+dkk\.?),\s*(?:19|20)\d{2})\)|\[\d+\]|\[cite:[A-Za-z0-9_-]+\]/g) || [];
  const citationCount = citationMatches.length;
  const hasCitations = citationCount > 0;

  // Deteksi daftar pustaka
  const hasReferences = /^(?:#+\s*)?(DAFTAR\s+PUSTAKA|REFERENCES|BIBLIOGRAPHY|DAFTAR\s+REFERENSI)\b/im.test(content);

  const checks = [
    {
      id: 'title',
      label: 'Judul Karya Ilmiah',
      description: hasTitle ? 'Judul naskah telah terdefinisi' : 'Belum memiliki judul formal yang spesifik',
      passed: hasTitle,
      required: true
    },
    {
      id: 'abstract',
      label: 'Abstrak / Ringkasan',
      description: hasAbstract ? 'Bagian Abstrak/Abstract terdeteksi' : 'Disarankan menambahkan Abstrak bahasa Indonesia & Inggris',
      passed: hasAbstract,
      required: true
    },
    {
      id: 'structure',
      label: 'Struktur BAB & Sub-bab',
      description: hasBabStructure ? 'Struktur BAB baku terdeteksi (BAB I, 1.1, dst.)' : 'Format bab belum menggunakan penomoran BAB formal',
      passed: hasBabStructure,
      required: false
    },
    {
      id: 'citations',
      label: 'Sitasi Dalam Teks',
      description: hasCitations ? `${citationCount} sitasi terdeteksi (APA/IEEE)` : 'Belum ditemukan rujukan sitasi (Nama, Tahun) atau [1]',
      passed: hasCitations,
      required: true
    },
    {
      id: 'references',
      label: 'Daftar Pustaka / Referensi',
      description: hasReferences ? 'Bagian Daftar Pustaka terdeteksi' : 'Tambahkan bagian DAFTAR PUSTAKA di akhir naskah',
      passed: hasReferences,
      required: true
    }
  ];

  return {
    structuralStatus: hasTitle && hasAbstract ? 'passed' : 'needs_review',
    formattingStatus: 'not_checked',
    referenceStatus: hasReferences && hasCitations ? 'passed' : 'needs_review',
    evidenceStatus: 'not_checked',
    outputIntegrityStatus: 'not_checked',
    wordCount,
    estimatedPages,
    hasTitle,
    hasAbstract,
    hasCitations,
    hasReferences,
    hasBabStructure,
    citationCount,
    checks
  };
}

async function buildAcademicDocxDocument(options: ExportDocxOptions) {
  const { templateType = 'skripsi' } = options;
  const style = normalizeAcademicStyle(options.style || createAcademicStylePreset(templateType));
  const content = formatBibliographyForStyle(options.content, style.citationStyle);

  // Dynamic import of docx library to keep initial bundle size lean
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    BorderStyle,
    Table,
    TableRow,
    TableCell,
    WidthType,
    PageNumber,
    NumberFormat,
    Header,
    Footer
  } = await import('docx');

  const isSkripsi = templateType === 'skripsi';
  const cmToTwips = (cm: number) => Math.round(cm * 567);
  const MARGIN_LEFT_TWIPS = cmToTwips(style.marginLeftCm);
  const MARGIN_TOP_TWIPS = cmToTwips(style.marginTopCm);
  const MARGIN_RIGHT_TWIPS = cmToTwips(style.marginRightCm);
  const MARGIN_BOTTOM_TWIPS = cmToTwips(style.marginBottomCm);
  const A4_WIDTH_TWIPS = style.paperSize === 'A4' ? 11906 : 12240;
  const A4_HEIGHT_TWIPS = style.paperSize === 'A4' ? 16838 : 15840;

  const FONT_FAMILY = style.fontFamily;
  const BODY_FONT_SIZE = Math.round(style.fontSizePt * 2);
  const HEADING1_FONT_SIZE = Math.round((style.fontSizePt + 2) * 2);
  const HEADING2_FONT_SIZE = BODY_FONT_SIZE;
  const LINE_SPACING_1_5 = Math.round(240 * style.lineSpacing);
  const LINE_SPACING_SINGLE = Math.round(240 * style.lineSpacing);
  const FIRST_LINE_INDENT_TWIPS = style.citationStyle === 'APA7' ? 720 : 567;

  /**
   * Helper function: parse inline Markdown (**bold**, *italic*, `code`) into safe TextRun array
   */
  const parseInlineMarkdown = (
    text: string, 
    defaultBold = false, 
    defaultItalic = false, 
    fontSize = BODY_FONT_SIZE
  ): InstanceType<typeof TextRun>[] => {
    if (!text) return [];

    const runs: InstanceType<typeof TextRun>[] = [];
    const regex = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|[^*`]+)/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const part = match[0];
      if (part.startsWith('***') && part.endsWith('***')) {
        runs.push(
          new TextRun({
            text: part.slice(3, -3),
            bold: true,
            italics: true,
            font: FONT_FAMILY,
            size: fontSize
          })
        );
      } else if (part.startsWith('**') && part.endsWith('**')) {
        runs.push(
          new TextRun({
            text: part.slice(2, -2),
            bold: true,
            italics: defaultItalic,
            font: FONT_FAMILY,
            size: fontSize
          })
        );
      } else if (part.startsWith('*') && part.endsWith('*')) {
        runs.push(
          new TextRun({
            text: part.slice(1, -1),
            bold: defaultBold,
            italics: true,
            font: FONT_FAMILY,
            size: fontSize
          })
        );
      } else if (part.startsWith('`') && part.endsWith('`')) {
        runs.push(
          new TextRun({
            text: part.slice(1, -1),
            font: 'Courier New',
            size: fontSize - 2
          })
        );
      } else {
        runs.push(
          new TextRun({
            text: part,
            bold: defaultBold,
            italics: defaultItalic,
            font: FONT_FAMILY,
            size: fontSize
          })
        );
      }
    }

    if (runs.length === 0) {
      runs.push(
        new TextRun({
          text,
          bold: defaultBold,
          italics: defaultItalic,
          font: FONT_FAMILY,
          size: fontSize
        })
      );
    }

    return runs;
  };

  /**
   * Helper to parse markdown content lines into docx Paragraphs and Tables
   */
  const parseContentToElements = (markdownText: string): any[] => {
    const children: any[] = [];
    const lines = markdownText.split('\n');

    let isInTable = false;
    let tableRowsData: string[][] = [];
    let inCodeBlock = false;
    let codeBlockLines: string[] = [];

    const flushTable = () => {
      if (tableRowsData.length === 0) return;

      const numCols = Math.max(...tableRowsData.map(r => r.length), 1);
      const availableWidth = A4_WIDTH_TWIPS - MARGIN_LEFT_TWIPS - MARGIN_RIGHT_TWIPS;
      const colWidth = Math.floor(availableWidth / numCols);

      const tableRows = tableRowsData.map((rowCells, rIdx) => {
        const isHeader = rIdx === 0;
        return new TableRow({
          tableHeader: isHeader,
          children: rowCells.map(cellText => {
            return new TableCell({
              width: { size: colWidth, type: WidthType.DXA },
              margins: { top: 120, bottom: 120, left: 140, right: 140 },
              borders: {
                top: { style: isHeader ? BorderStyle.SINGLE : BorderStyle.NONE, size: 4, color: '000000' },
                bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                right: { style: BorderStyle.NONE, size: 0, color: 'auto' }
              },
              children: [
                new Paragraph({
                  alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
                  spacing: { before: 0, after: 0, line: LINE_SPACING_SINGLE },
                  children: parseInlineMarkdown(cellText.trim(), isHeader, false, BODY_FONT_SIZE - 2)
                })
              ]
            });
          })
        });
      });

      children.push(
        new Table({
          width: { size: availableWidth, type: WidthType.DXA },
          rows: tableRows,
          margins: { top: 180, bottom: 240 }
        })
      );

      // Spacer after table
      children.push(new Paragraph({ spacing: { before: 120, after: 120 } }));
      tableRowsData = [];
      isInTable = false;
    };

    const flushCodeBlock = () => {
      if (codeBlockLines.length === 0) return;
      const codeParagraphs = codeBlockLines.map(line => {
        return new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 0, after: 0, line: LINE_SPACING_SINGLE },
          children: [
            new TextRun({
              text: line || ' ',
              font: 'Courier New',
              size: BODY_FONT_SIZE - 4
            })
          ]
        });
      });

      const availableWidth = A4_WIDTH_TWIPS - MARGIN_LEFT_TWIPS - MARGIN_RIGHT_TWIPS;
      children.push(
        new Table({
          width: { size: availableWidth, type: WidthType.DXA },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: availableWidth, type: WidthType.DXA },
                  shading: { fill: 'F3F4F6' },
                  margins: { top: 140, bottom: 140, left: 180, right: 180 },
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 2, color: 'D1D5DB' },
                    bottom: { style: BorderStyle.SINGLE, size: 2, color: 'D1D5DB' },
                    left: { style: BorderStyle.SINGLE, size: 2, color: 'D1D5DB' },
                    right: { style: BorderStyle.SINGLE, size: 2, color: 'D1D5DB' }
                  },
                  children: codeParagraphs
                })
              ]
            })
          ]
        })
      );

      children.push(new Paragraph({ spacing: { before: 120, after: 120 } }));
      codeBlockLines = [];
      inCodeBlock = false;
    };

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const trimmed = rawLine.trim();

      // Handle Code Blocks
      if (trimmed.startsWith('```')) {
        if (inCodeBlock) {
          flushCodeBlock();
        } else {
          if (isInTable) flushTable();
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockLines.push(rawLine);
        continue;
      }

      // Handle Markdown Tables
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        if (trimmed.includes('---')) {
          continue; // Separator row
        }
        const cells = trimmed
          .slice(1, -1)
          .split('|')
          .map(c => c.trim());
        tableRowsData.push(cells);
        isInTable = true;
        continue;
      } else if (isInTable) {
        flushTable();
      }

      // Blank Line
      if (!trimmed) {
        children.push(
          new Paragraph({
            spacing: { before: 0, after: 120 }
          })
        );
        continue;
      }

      // Heading 1: BAB Titles or Main Titles
      if (trimmed.startsWith('# ') || /^BAB\s+[IVXLCDM\d]+/i.test(trimmed)) {
        const headingText = trimmed.replace(/^#\s*/, '').trim();
        const isBabTitle = /^BAB\s+[IVXLCDM\d]+/i.test(headingText);

        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            alignment: isSkripsi ? AlignmentType.CENTER : AlignmentType.LEFT,
            pageBreakBefore: isBabTitle,
            spacing: { before: 240, after: 180, line: LINE_SPACING_1_5 },
            children: [
              new TextRun({
                text: isSkripsi ? headingText.toUpperCase() : headingText,
                bold: true,
                font: FONT_FAMILY,
                size: HEADING1_FONT_SIZE
              })
            ]
          })
        );
        continue;
      }

      // Heading 2: Sub-bab (e.g. 1.1 Latar Belakang)
      if (trimmed.startsWith('## ')) {
        const headingText = trimmed.replace(/^##\s*/, '').trim();
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.LEFT,
            spacing: { before: 200, after: 120, line: LINE_SPACING_1_5 },
            children: [
              new TextRun({
                text: headingText,
                bold: true,
                font: FONT_FAMILY,
                size: HEADING2_FONT_SIZE
              })
            ]
          })
        );
        continue;
      }

      // Heading 3: Sub-sub-bab (e.g. 1.1.1 Identifikasi Masalah)
      if (trimmed.startsWith('### ')) {
        const headingText = trimmed.replace(/^###\s*/, '').trim();
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            alignment: AlignmentType.LEFT,
            spacing: { before: 160, after: 100, line: LINE_SPACING_1_5 },
            children: [
              new TextRun({
                text: headingText,
                bold: true,
                italics: isSkripsi,
                font: FONT_FAMILY,
                size: BODY_FONT_SIZE
              })
            ]
          })
        );
        continue;
      }

      // Blockquotes (e.g. Kutipan Langsung > 4 baris)
      // Standar Skripsi: Spasi tunggal, indentasi kiri 1 cm
      if (trimmed.startsWith('>')) {
        const quoteText = trimmed.replace(/^>\s*/, '').trim();
        children.push(
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            indent: { left: FIRST_LINE_INDENT_TWIPS, right: FIRST_LINE_INDENT_TWIPS },
            spacing: { before: 100, after: 100, line: LINE_SPACING_SINGLE },
            children: parseInlineMarkdown(quoteText, false, true, BODY_FONT_SIZE - 2)
          })
        );
        continue;
      }

      // Bullet Lists (- or *)
      if (/^[-*•]\s+/.test(trimmed)) {
        const itemText = trimmed.replace(/^[-*•]\s+/, '').trim();
        children.push(
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            bullet: { level: 0 },
            spacing: { before: 40, after: 40, line: LINE_SPACING_1_5 },
            children: parseInlineMarkdown(itemText, false, false, BODY_FONT_SIZE)
          })
        );
        continue;
      }

      // Numbered Lists (1. or a.)
      const numMatch = trimmed.match(/^(\d+|[a-zA-Z])\.\s+(.*)/);
      if (numMatch) {
        const numPrefix = numMatch[1];
        const itemText = numMatch[2];
        children.push(
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            indent: { left: 360, hanging: 360 },
            spacing: { before: 40, after: 40, line: LINE_SPACING_1_5 },
            children: [
              new TextRun({
                text: `${numPrefix}. `,
                bold: true,
                font: FONT_FAMILY,
                size: BODY_FONT_SIZE
              }),
              ...parseInlineMarkdown(itemText, false, false, BODY_FONT_SIZE)
            ]
          })
        );
        continue;
      }

      // Regular Academic Paragraph:
      // Standar Skripsi Indonesia: Times New Roman 12pt, Justified, 1.5 line spacing, Indentasi Baris Pertama 1 cm (567 twips)
      children.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: FIRST_LINE_INDENT_TWIPS },
          spacing: { before: 0, after: 120, line: LINE_SPACING_1_5 },
          children: parseInlineMarkdown(trimmed, false, false, BODY_FONT_SIZE)
        })
      );
    }

    if (inCodeBlock) flushCodeBlock();
    if (isInTable) flushTable();

    return children;
  };

  // Check if content has both Preliminary / Front-Matter (Abstrak, Kata Pengantar, Daftar Isi) and Main Body (BAB I, BAB II, etc.)
  const frontMatterRegex = /^(?:#\s*)?(ABSTRAK|KATA PENGANTAR|DAFTAR ISI|PRAKATA|HALAMAN PENGESAHAN)/im;
  const babRegex = /^(?:#\s*)?(BAB\s+[IVXLCDM\d]+|BAB\s+1\b)/im;

  const hasFrontMatter = frontMatterRegex.test(content);
  const hasBab = babRegex.test(content);

  const docSections: any[] = [];
  const commonPageProperties = {
    size: { width: A4_WIDTH_TWIPS, height: A4_HEIGHT_TWIPS },
    margin: { top: MARGIN_TOP_TWIPS, bottom: MARGIN_BOTTOM_TWIPS, left: MARGIN_LEFT_TWIPS, right: MARGIN_RIGHT_TWIPS }
  };
  const createPageNumberHeader = () => new Header({
    children: [new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ font: FONT_FAMILY, size: BODY_FONT_SIZE - 4, children: [PageNumber.CURRENT] })]
    })]
  });
  const createPageNumberFooter = () => new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ font: FONT_FAMILY, size: BODY_FONT_SIZE - 4, children: [PageNumber.CURRENT] })]
    })]
  });

  if (hasFrontMatter && hasBab && isSkripsi && style.pageNumbering === 'roman_front_arabic_main') {
    // Split into Section 1 (Front Matter) and Section 2 (Main Body)
    const babIndex = content.search(babRegex);
    const frontMatterText = content.substring(0, babIndex).trim();
    const mainBodyText = content.substring(babIndex).trim();

    // Section 1: Preliminary / Front Matter -> Roman page numbers (i, ii, iii) in footer center
    docSections.push({
      properties: {
        page: {
          ...commonPageProperties,
          pageNumbers: { start: 1, formatType: NumberFormat.LOWER_ROMAN }
        }
      },
      footers: {
        default: createPageNumberFooter()
      },
      children: parseContentToElements(frontMatterText)
    });

    // Section 2: Main Body -> Arabic numbers (1, 2, 3) in header top right
    docSections.push({
      properties: {
        page: {
          ...commonPageProperties,
          pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL }
        }
      },
      headers: {
        default: createPageNumberHeader()
      },
      children: parseContentToElements(mainBodyText)
    });
  } else {
    const page = {
      ...commonPageProperties,
      ...(style.pageNumbering === 'none' ? {} : {
        pageNumbers: {
          start: 1,
          formatType: style.pageNumbering === 'roman_bottom_center' ? NumberFormat.LOWER_ROMAN : NumberFormat.DECIMAL
        }
      })
    };
    docSections.push({
      properties: {
        page
      },
      ...(style.pageNumbering === 'arabic_top_right' || style.pageNumbering === 'roman_front_arabic_main'
        ? { headers: { default: createPageNumberHeader() } }
        : {}),
      ...(style.pageNumbering === 'roman_bottom_center'
        ? { footers: { default: createPageNumberFooter() } }
        : {}),
      children: parseContentToElements(content)
    });
  }

  // Create Document with configured sections
  const doc = new Document({
    sections: docSections
  });

  return { doc, Packer };
}

export async function createAcademicDocxBlob(options: ExportDocxOptions): Promise<Blob> {
  const { doc, Packer } = await buildAcademicDocxDocument(options);
  return Packer.toBlob(doc);
}

export async function exportToAcademicDocx(options: ExportDocxOptions): Promise<void> {
  const blob = await createAcademicDocxBlob(options);
  const { title, templateType = 'skripsi' } = options;
  const style = normalizeAcademicStyle(options.style || createAcademicStylePreset(templateType));
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeFilename = (title || 'naskah_ruangkerja')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .substring(0, 40);
  const suffix = `${style.paperSize.toLowerCase()}_${style.fontSizePt}pt_${style.citationStyle.toLowerCase()}`;
  link.download = `${safeFilename}_${suffix}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

