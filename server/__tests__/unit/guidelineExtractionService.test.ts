import { describe, expect, it } from 'vitest';
import { extractAssignmentGuidelineRules } from '../../services/file-intelligence/guidelineExtractionService.js';

describe('assignment guideline extraction', () => {
  it('returns literal requirement candidates with original location and excerpt', () => {
    const excerpt = 'Panduan: naskah maksimal 6 halaman. Gunakan font Times New Roman ukuran font 12 pt. Margin kiri 4 cm. Gunakan APA 7. Wajib mencakup abstrak.';
    const rules = extractAssignmentGuidelineRules([{
      citationId: 'AGENT_SRC_1', documentId: 'guide-1', filename: 'Panduan.pdf', sourceRef: 'p. 3', excerpt
    }]);
    expect(rules).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'maximum_pages', value: '6 halaman', status: 'literal_match', sourceRef: 'p. 3', excerpt }),
      expect.objectContaining({ type: 'font_family', value: 'Times New Roman', status: 'literal_match' }),
      expect.objectContaining({ type: 'font_size', value: '12 pt', status: 'literal_match' }),
      expect.objectContaining({ type: 'margin', value: 'kiri 4 cm', status: 'literal_match' }),
      expect.objectContaining({ type: 'citation_style', value: 'APA 7', status: 'literal_match' }),
      expect.objectContaining({ type: 'required_section', value: 'abstrak', status: 'literal_match' })
    ]));
  });

  it('marks a format mention without instruction language as ambiguous', () => {
    const [rule] = extractAssignmentGuidelineRules([{
      citationId: 'SRC_2', documentId: 'guide-2', filename: 'Notes.txt', sourceRef: 'Notes.txt', excerpt: 'Sampel lama memakai Arial dan margin kiri 3 cm.'
    }]);
    expect(rule).toMatchObject({ type: 'font_family', value: 'Arial', status: 'ambiguous', citationId: 'SRC_2' });
  });
});
