/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { createAcademicStylePreset, createAcademicDocxBlob, type AcademicStyleProfile } from '../../features/workspace/utils/exportDocx';

describe('editable academic DOCX export', () => {
  it('applies selected paper size, margins, line spacing, headings, and editable table text', async () => {
    const style: AcademicStyleProfile = {
      ...createAcademicStylePreset('makalah'), paperSize: 'LETTER', marginTopCm: 2, marginBottomCm: 2.5,
      marginLeftCm: 3, marginRightCm: 2, fontFamily: 'Arial', fontSizePt: 11, lineSpacing: 2,
      citationStyle: 'IEEE', pageNumbering: 'arabic_top_right'
    };
    const blob = await createAcademicDocxBlob({
      title: 'Metode Penelitian', templateType: 'makalah', style,
      content: '# Ringkasan\nParagraf yang tetap menjadi teks Word yang dapat diedit.\n\n# BAB I Metode\nIsi bagian metode.\n\n| Ukuran | Nilai |\n| --- | --- |\n| Sampel | 24 |\n'
    });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(zip.file('[Content_Types].xml')).not.toBeNull();
    expect(zip.file('word/document.xml')).not.toBeNull();
    expect(zip.file('word/styles.xml')).not.toBeNull();
    expect(zip.file('word/numbering.xml')).not.toBeNull();
    const documentXml = await zip.file('word/document.xml')!.async('text');
    expect(documentXml).toContain('<w:pgSz w:w="12240" w:h="15840"');
    expect(documentXml).toContain('<w:pgMar w:top="1134" w:right="1134" w:bottom="1418" w:left="1701"');
    expect(documentXml).toContain('<w:tbl>');
    expect(documentXml).toContain('<w:t xml:space="preserve">Paragraf yang tetap menjadi teks Word yang dapat diedit.</w:t>');
    expect(documentXml).toContain('<w:pageBreakBefore');
    expect(documentXml).toContain('w:line="480"');
  });

  it('provides a conservative preset and does not imply institution-specific compliance', () => {
    expect(createAcademicStylePreset('skripsi')).toMatchObject({
      paperSize: 'A4', marginTopCm: 4, marginBottomCm: 3, marginLeftCm: 4, marginRightCm: 3,
      citationStyle: 'APA7', pageNumbering: 'roman_front_arabic_main'
    });
  });
});
