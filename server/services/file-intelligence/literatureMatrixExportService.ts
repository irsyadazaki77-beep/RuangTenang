import ExcelJS from 'exceljs';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, WidthType, AlignmentType } from 'docx';

export interface ExportMatrixData {
  title?: string;
  topic?: string;
  rows: Array<{
    no?: number | string;
    citation: string;
    variables: string;
    methodology: string;
    findings: string;
    gap: string;
    relevance: string;
  }>;
  narrativeText?: string;
}

export const literatureMatrixExportService = {
  /**
   * Generates a styled Excel (.xlsx) buffer for academic Literature Review Matrix.
   */
  async generateExcel(data: ExportMatrixData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'RuangTenang Kampus - Academic Literature Engine';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Matriks Penelitian Terdahulu', {
      views: [{ state: 'frozen', ySplit: 3 }]
    });

    // 1. Title Rows
    sheet.mergeCells('A1:G1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = data.title || 'MATRIKS PENELITIAN TERDAHULU (BAB 2 SKRIPSI)';
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF0F172A' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 28;

    sheet.mergeCells('A2:G2');
    const topicCell = sheet.getCell('A2');
    topicCell.value = data.topic ? `Fokus / Topik Riset: ${data.topic}` : `Dihasilkan secara otomatis oleh RuangTenang Workspace`;
    topicCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };
    topicCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 20;

    // 2. Table Headers
    const headers = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Peneliti & Tahun [Sitasi]', key: 'citation', width: 28 },
      { header: 'Variabel / Fokus Penelitian', key: 'variables', width: 28 },
      { header: 'Metodologi & Sampel', key: 'methodology', width: 26 },
      { header: 'Temuan Kunci Empiris', key: 'findings', width: 34 },
      { header: 'Keterbatasan & Research Gap', key: 'gap', width: 30 },
      { header: 'Relevansi / Kontribusi ke Skripsi', key: 'relevance', width: 30 }
    ];

    const headerRow = sheet.getRow(3);
    headers.forEach((h, idx) => {
      sheet.getColumn(idx + 1).width = h.width;
      const cell = headerRow.getCell(idx + 1);
      cell.value = h.header;
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0D9488' } // Teal-600
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });
    headerRow.height = 28;

    // 3. Table Rows
    data.rows.forEach((row, i) => {
      const dataRow = sheet.getRow(i + 4);
      dataRow.getCell(1).value = row.no || i + 1;
      dataRow.getCell(1).alignment = { horizontal: 'center', vertical: 'top' };

      dataRow.getCell(2).value = row.citation;
      dataRow.getCell(3).value = row.variables;
      dataRow.getCell(4).value = row.methodology;
      dataRow.getCell(5).value = row.findings;
      dataRow.getCell(6).value = row.gap;
      dataRow.getCell(7).value = row.relevance;

      for (let col = 1; col <= 7; col++) {
        const cell = dataRow.getCell(col);
        cell.font = { name: 'Arial', size: 9.5 };
        cell.alignment = { ...cell.alignment, vertical: 'top', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  },

  /**
   * Generates a standard thesis-formatted Word (.docx) buffer with academic margins and table styling.
   */
  async generateDocx(data: ExportMatrixData): Promise<Buffer> {
    const tableHeaderCells = [
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'No', bold: true, size: 20 })], alignment: AlignmentType.CENTER })], width: { size: 600, type: WidthType.DXA } }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Peneliti & Tahun', bold: true, size: 20 })], alignment: AlignmentType.CENTER })], width: { size: 2200, type: WidthType.DXA } }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Variabel / Fokus', bold: true, size: 20 })], alignment: AlignmentType.CENTER })], width: { size: 2000, type: WidthType.DXA } }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Metodologi', bold: true, size: 20 })], alignment: AlignmentType.CENTER })], width: { size: 2000, type: WidthType.DXA } }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Temuan Kunci', bold: true, size: 20 })], alignment: AlignmentType.CENTER })], width: { size: 2600, type: WidthType.DXA } }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Research Gap & Relevansi', bold: true, size: 20 })], alignment: AlignmentType.CENTER })], width: { size: 2600, type: WidthType.DXA } })
    ];

    const tableRows = [
      new TableRow({ children: tableHeaderCells, tableHeader: true }),
      ...data.rows.map((row, idx) => new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(row.no || idx + 1), size: 19 })], alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: row.citation, size: 19 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: row.variables, size: 19 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: row.methodology, size: 19 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: row.findings, size: 19 })] })] }),
          new TableCell({ children: [
            new Paragraph({ children: [new TextRun({ text: `Gap: ${row.gap}`, size: 19, italics: true })] }),
            new Paragraph({ children: [new TextRun({ text: `Relevansi: ${row.relevance}`, size: 19 })] })
          ] })
        ]
      }))
    ];

    const matrixTable = new Table({
      rows: tableRows,
      width: { size: 100, type: WidthType.PERCENTAGE }
    });

    const narrativeParagraphs = (data.narrativeText || '')
      .split('\n\n')
      .filter(p => p.trim())
      .map(p => new Paragraph({
        children: [new TextRun({ text: p.replace(/^#+\s*/, ''), size: 24, font: 'Times New Roman' })],
        spacing: { line: 360, before: 120, after: 120 } // 1.5 line spacing
      }));

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 2268,    // 4 cm (top margin skripsi standar)
              left: 2268,   // 4 cm (left margin skripsi standar)
              bottom: 1701, // 3 cm
              right: 1701   // 3 cm
            }
          }
        },
        children: [
          new Paragraph({
            text: 'BAB II: TINJAUAN PUSTAKA DAN KAJIAN PENELITIAN TERDAHULU',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 280 }
          }),
          new Paragraph({
            text: '2.1 Matriks Sintesis Penelitian Terdahulu',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 140 }
          }),
          matrixTable,
          new Paragraph({ text: '', spacing: { after: 200 } }),
          new Paragraph({
            text: '2.2 Narasi Sintesis dan Posisi Penelitian',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 140 }
          }),
          ...narrativeParagraphs
        ]
      }]
    });

    return await Packer.toBuffer(doc);
  }
};
