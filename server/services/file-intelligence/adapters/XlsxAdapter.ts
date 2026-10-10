import ExcelJS from 'exceljs';
import { SupportedFileKind, ExtractedDocument, DocumentBlock } from '../../../../shared/contracts/files.js';
import { DocumentExtractorAdapter, ExtractionInput } from './types.js';
import { DEFAULT_FILE_LIMITS, DocumentProcessingException } from '../fileTypes.js';

export class XlsxAdapter implements DocumentExtractorAdapter {
  supports(kind: SupportedFileKind): boolean {
    return kind === 'xlsx';
  }

  async extract(input: ExtractionInput): Promise<ExtractedDocument> {
    if (input.abortSignal?.aborted) {
      throw new DocumentProcessingException('PROCESSING_ABORTED', 'Proses ekstraksi dibatalkan.');
    }

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(input.buffer as any);

      const worksheets = workbook.worksheets;
      if (worksheets.length === 0) {
        throw new DocumentProcessingException('PARSER_ERROR', 'Dokumen Excel tidak memiliki lembar kerja (worksheet).');
      }

      if (worksheets.length > DEFAULT_FILE_LIMITS.maxXlsxSheets) {
        throw new DocumentProcessingException(
          'EXTRACTION_LIMIT',
          `Jumlah lembar kerja (${worksheets.length}) melebihi batas maksimal ${DEFAULT_FILE_LIMITS.maxXlsxSheets} sheet.`
        );
      }

      const blocks: DocumentBlock[] = [];
      let totalChars = 0;

      for (let sIdx = 0; sIdx < worksheets.length; sIdx++) {
        if (input.abortSignal?.aborted) {
          throw new DocumentProcessingException('PROCESSING_ABORTED', 'Proses ekstraksi dibatalkan.');
        }

        const ws = worksheets[sIdx];
        const sheetName = ws.name || `Sheet${sIdx + 1}`;
        const rowCount = ws.actualRowCount || ws.rowCount;

        if (rowCount === 0) continue;

        if (rowCount > DEFAULT_FILE_LIMITS.maxRowsPerSheet) {
          throw new DocumentProcessingException(
            'EXTRACTION_LIMIT',
            `Sheet "${sheetName}" memuat ${rowCount} baris, melebihi batas maksimal ${DEFAULT_FILE_LIMITS.maxRowsPerSheet} baris.`
          );
        }

        // Format worksheet into tabular markdown-like text
        const rowsText: string[] = [];


        ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          const cells: string[] = [];
          row.eachCell({ includeEmpty: true }, (cell) => {
            const val = cell.value;
            if (val === null || val === undefined) {
              cells.push('');
            } else if (typeof val === 'object' && 'result' in val) {
              // formula result
              cells.push(String(val.result ?? ''));
            } else if (typeof val === 'object' && 'text' in val) {
              // rich text
              cells.push(String(val.text ?? ''));
            } else {
              cells.push(String(val).replace(/[\r\n]+/g, ' '));
            }
          });

          if (rowNumber === 1) {
            rowsText.push(`| ${cells.join(' | ')} |`);
            rowsText.push(`| ${cells.map(() => '---').join(' | ')} |`);
          } else {
            rowsText.push(`| ${cells.join(' | ')} |`);
          }
        });

        if (rowsText.length === 0) continue;

        // Group rows into chunks of ~50 rows per block
        const batchSize = 50;
        const headerBlock = rowsText.slice(0, 2).join('\n');
        const dataRows = rowsText.slice(2);

        if (dataRows.length <= batchSize) {
          const content = rowsText.join('\n');
          totalChars += content.length;
          blocks.push({
            blockId: `${input.documentId}_sh${sIdx}_b0`,
            text: content,
            sheetName,
            section: `Sheet: ${sheetName}`
          });
        } else {
          for (let r = 0; r < dataRows.length; r += batchSize) {
            const batch = dataRows.slice(r, r + batchSize);
            const content = `${headerBlock}\n${batch.join('\n')}`;
            totalChars += content.length;
            if (totalChars > DEFAULT_FILE_LIMITS.maxExtractedChars) {
              throw new DocumentProcessingException(
                'EXTRACTION_LIMIT',
                `Ekstraksi spreadsheet melebihi batas ${DEFAULT_FILE_LIMITS.maxExtractedChars} karakter.`
              );
            }
            blocks.push({
              blockId: `${input.documentId}_sh${sIdx}_b${Math.floor(r / batchSize)}`,
              text: content,
              sheetName,
              section: `Sheet: ${sheetName} (Baris ${r + 1}-${Math.min(r + batchSize, dataRows.length)})`
            });
          }
        }
      }

      if (blocks.length === 0) {
        throw new DocumentProcessingException('PARSER_ERROR', 'Tidak ditemukan data tabel pada berkas lembar sebar Excel.');
      }

      return {
        documentId: input.documentId,
        filename: input.filename,
        mimeType: input.mimeType,
        kind: 'xlsx',
        size: input.buffer.length,
        checksum: input.checksum,
        sheetCount: worksheets.length,
        blocks,
        normalizedText: blocks.map(b => `[Sheet: ${b.sheetName}]\n\n${b.text}`).join('\n\n')
      };
    } catch (err: any) {
      if (err instanceof DocumentProcessingException) throw err;
      throw new DocumentProcessingException('PARSER_ERROR', `Gagal memproses berkas Excel XLSX: ${err.message || 'Format tidak valid'}`);
    }
  }
}
