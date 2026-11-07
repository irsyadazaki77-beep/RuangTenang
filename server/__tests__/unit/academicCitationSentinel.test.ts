import { describe, it, expect } from 'vitest';
import { AcademicCitationSentinel } from '../../services/ai/academicCitationSentinel.js';

describe('AcademicCitationSentinel', () => {
  it('detects parenthetical and narrative citations correctly', () => {
    const text = `
    Metodologi penelitian ini mengacu pada pendekatan kuantitatif (Sugiyono, 2019).
    Menurut Jogiyanto (2017), sistem informasi adalah kumpulan komponen yang terorganisir.
    Selain itu, transformer model diperkenalkan oleh Vaswani et al. (2017).
    `;

    const result = AcademicCitationSentinel.auditText(text);
    expect(result.hasCitations).toBe(true);
    expect(result.totalCitations).toBe(3);
    expect(result.hasReferenceSection).toBe(false);
    expect(result.complianceScore).toBeLessThan(100);
  });

  it('verifies 100% compliance when all citations exist in Daftar Pustaka', () => {
    const text = `
    Kajian ini mengadaptasi model konseptual dari (Creswell, 2014) serta prinsip rekayasa (Pressman, 2015).

    Daftar Pustaka:
    Creswell, J. W. (2014). Research Design. SAGE Publications.
    Pressman, R. S. (2015). Software Engineering: A Practitioner's Approach. McGraw-Hill.
    `;

    const result = AcademicCitationSentinel.auditText(text);
    expect(result.hasCitations).toBe(true);
    expect(result.hasReferenceSection).toBe(true);
    expect(result.verifiedCount).toBe(2);
    expect(result.unmatchedCitations).toHaveLength(0);
    expect(result.complianceScore).toBe(100);
  });

  it('handles empty text and non-academic text gracefully', () => {
    const emptyResult = AcademicCitationSentinel.auditText('');
    expect(emptyResult.hasCitations).toBe(false);
    expect(emptyResult.complianceScore).toBe(100);

    const normalChat = AcademicCitationSentinel.auditText('Halo bro, apa kabar hari ini?');
    expect(normalChat.hasCitations).toBe(false);
    expect(normalChat.totalCitations).toBe(0);
  });
});
