/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';
import { createXlsxBuffer } from '../../features/workspace/utils/exportXlsx';

describe('editable XLSX export', () => {
  it('creates an openable workbook with source table values and safe formula-like text', async () => {
    const bytes = await createXlsxBuffer({
      title: 'Ringkasan Data',
      content: '# Hasil Penelitian\n\n| Kategori | Jumlah |\n| --- | ---: |\n| Kontrol | 24 |\n| =1+1 | 26 |\n'
    });
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes as Buffer);

    expect(workbook.worksheets).toHaveLength(1);
    expect(workbook.getWorksheet('Hasil Penelitian')?.getRow(1).values).toEqual([undefined, 'Kategori', 'Jumlah']);
    expect(workbook.getWorksheet('Hasil Penelitian')?.getCell('A2').value).toBe('Kontrol');
    expect(workbook.getWorksheet('Hasil Penelitian')?.getCell('B2').value).toBe(24);
    expect(workbook.getWorksheet('Hasil Penelitian')?.getCell('A3').value).toBe("'=1+1");
  });
});
