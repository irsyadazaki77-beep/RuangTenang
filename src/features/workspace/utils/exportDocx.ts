/**
 * Academic Standard .docx Exporter for RuangKerja (RuangTenang Kampus)
 * Adheres strictly to Indonesian Thesis & Academic Paper Guidelines (Pedoman Penulisan Skripsi / Tesis):
 * - Paper: A4 (11906 x 16838 twips)
 * - Margins: Left 4 cm (2268 twips), Top 4 cm (2268 twips), Right 3 cm (1701 twips), Bottom 3 cm (1701 twips) (Format 4-4-3-3 Baku)
 * - Typography: Times New Roman
 *   - Judul BAB: 14 pt, Tebal (Bold), Rata Tengah (Centered), Huruf Kapital (Uppercase)
 *   - Sub-bab / Judul Bagian: 12 pt, Tebal (Bold), Rata Kiri
 *   - Isi Paragraf: 12 pt, Rata Kanan-Kiri (Justified), Spasi 1.5 Baris, Indentasi Baris Pertama 1 cm (567 twips)
 * - Penomoran Halaman Otomatis:
 *   - Bagian Awal (Abstrak, Kata Pengantar, Daftar Isi): Angka Romawi Kecil (i, ii, iii) di tengah bawah.
 *   - Bagian Utama (BAB I s.d. Selesai): Angka Arab (1, 2, 3) di kanan atas.
 */

export interface ExportDocxOptions {
  title: string;
  content: string;
  templateType?: 'skripsi' | 'makalah';
  authorName?: string;
  university?: string;
  faculty?: string;
}

export async function exportToAcademicDocx(options: ExportDocxOptions): Promise<void> {
  const {
    title,
    content,
    templateType = 'skripsi'
  } = options;

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
    PageNumberFormat,
    Header,
    Footer
  } = await import('docx');

  // Convert CM to Twips (1 cm = 567 twips)
  // Format Skripsi: Kiri 4cm (2268 twips), Atas 4cm (2268 twips), Kanan 3cm (1701 twips), Bawah 3cm (1701 twips)
  // Format Makalah: Kiri 3cm (1701 twips), Atas 3cm (1701 twips), Kanan 3cm (1701 twips), Bawah 3cm (1701 twips)
  const isSkripsi = templateType === 'skripsi';
  const MARGIN_LEFT_TWIPS = isSkripsi ? 2268 : 1701;
  const MARGIN_TOP_TWIPS = isSkripsi ? 2268 : 1701;
  const MARGIN_RIGHT_TWIPS = 1701;
  const MARGIN_BOTTOM_TWIPS = 1701;

  // A4 dimensions in twips: 210mm x 297mm -> 11906 x 16838 twips
  const A4_WIDTH_TWIPS = 11906;
  const A4_HEIGHT_TWIPS = 16838;

  const FONT_FAMILY = 'Times New Roman';
  const BODY_FONT_SIZE = 24; // 12 pt (docx uses half-points: 12 * 2 = 24)
  const HEADING1_FONT_SIZE = 28; // 14 pt
  const HEADING2_FONT_SIZE = 24; // 12 pt
  const LINE_SPACING_1_5 = 360; // 1.5 lines (240 * 1.5 = 360)
  const LINE_SPACING_SINGLE = 240; // 1.0 line
  const FIRST_LINE_INDENT_TWIPS = 567; // 1 cm indentasi paragraf pertama baku

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
            alignment: AlignmentType.CENTER,
            pageBreakBefore: isBabTitle,
            spacing: { before: 240, after: 180, line: LINE_SPACING_1_5 },
            children: [
              new TextRun({
                text: headingText.toUpperCase(),
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
                italics: true,
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

  if (hasFrontMatter && hasBab) {
    // Split into Section 1 (Front Matter) and Section 2 (Main Body)
    const babIndex = content.search(babRegex);
    const frontMatterText = content.substring(0, babIndex).trim();
    const mainBodyText = content.substring(babIndex).trim();

    // Section 1: Preliminary / Front Matter -> Roman page numbers (i, ii, iii) in footer center
    docSections.push({
      properties: {
        page: {
          size: { width: A4_WIDTH_TWIPS, height: A4_HEIGHT_TWIPS },
          margin: { top: MARGIN_TOP_TWIPS, bottom: MARGIN_BOTTOM_TWIPS, left: MARGIN_LEFT_TWIPS, right: MARGIN_RIGHT_TWIPS },
          pageNumbers: { start: 1, formatType: PageNumberFormat.LOWER_ROMAN }
        }
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  font: FONT_FAMILY,
                  size: BODY_FONT_SIZE - 4, // 10 pt
                  children: [PageNumber.CURRENT]
                })
              ]
            })
          ]
        })
      },
      children: parseContentToElements(frontMatterText)
    });

    // Section 2: Main Body -> Arabic numbers (1, 2, 3) in header top right
    docSections.push({
      properties: {
        page: {
          size: { width: A4_WIDTH_TWIPS, height: A4_HEIGHT_TWIPS },
          margin: { top: MARGIN_TOP_TWIPS, bottom: MARGIN_BOTTOM_TWIPS, left: MARGIN_LEFT_TWIPS, right: MARGIN_RIGHT_TWIPS },
          pageNumbers: { start: 1, formatType: PageNumberFormat.DECIMAL }
        }
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  font: FONT_FAMILY,
                  size: BODY_FONT_SIZE - 4, // 10 pt
                  children: [PageNumber.CURRENT]
                })
              ]
            })
          ]
        })
      },
      children: parseContentToElements(mainBodyText)
    });
  } else {
    // Standard Single Section with Top-Right Arabic page numbering
    docSections.push({
      properties: {
        page: {
          size: { width: A4_WIDTH_TWIPS, height: A4_HEIGHT_TWIPS },
          margin: { top: MARGIN_TOP_TWIPS, bottom: MARGIN_BOTTOM_TWIPS, left: MARGIN_LEFT_TWIPS, right: MARGIN_RIGHT_TWIPS },
          pageNumbers: { start: 1, formatType: PageNumberFormat.DECIMAL }
        }
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  font: FONT_FAMILY,
                  size: BODY_FONT_SIZE - 4,
                  children: [PageNumber.CURRENT]
                })
              ]
            })
          ]
        })
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  font: FONT_FAMILY,
                  size: BODY_FONT_SIZE - 6,
                  color: '888888',
                  text: 'Draf Akademik disusun via RuangKerja RuangTenang'
                })
              ]
            })
          ]
        })
      },
      children: parseContentToElements(content)
    });
  }

  // Create Document with configured sections
  const doc = new Document({
    sections: docSections
  });

  // Generate Blob and Trigger Browser Download
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeFilename = (title || 'naskah_ruangkerja')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .substring(0, 40);
  const suffix = isSkripsi ? 'standar_skripsi_id' : 'standar_makalah_id';
  link.download = `${safeFilename}_${suffix}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
