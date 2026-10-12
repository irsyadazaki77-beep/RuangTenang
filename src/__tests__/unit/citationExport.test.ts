import { describe, expect, it, vi } from 'vitest';
import { cleanDOI, formatAsAPA7, formatAsIEEE, generateBibTeX, generateRIS, parseCitations } from '../../features/workspace/utils/citationExport';

describe('citation export metadata integrity', () => {
  it('keeps a missing year, title, and author missing instead of inventing values', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-11T00:00:00Z'));
    const raw = 'A source record whose publication metadata is unavailable';
    const [reference] = parseCitations(raw);

    expect(reference).toMatchObject({ title: '', authors: [], year: '', metadataProvenance: { title: 'missing', authors: 'missing', year: 'missing' } });
    expect(formatAsAPA7([reference])).toBe(raw);

    const bibtex = generateBibTeX(raw);
    expect(bibtex).toContain('Original source text:');
    expect(bibtex).not.toMatch(/year\s*=|author\s*=/i);
    expect(bibtex).not.toContain('2026');

    const ris = generateRIS(raw);
    expect(ris).toContain('Original source text:');
    expect(ris).not.toMatch(/PY\s+-|AU\s+-/);
    expect(ris).not.toContain('2026');
    vi.useRealTimers();
  });

  it('marks plain-text fields as parsed and uses n.d. when no year is present', () => {
    const [reference] = parseCitations('Ada Lovelace (n.d.). Evidence review. Journal of Tests.');
    expect(reference.year).toBe('');
    expect(reference.title).toBe('Evidence review');
    expect(reference.authors).toEqual(['Ada Lovelace']);
    expect(reference.metadataProvenance.year).toBe('missing');
    expect(formatAsAPA7([reference])).toContain('(n.d.). Evidence review.');
    expect(generateBibTeX('Ada Lovelace (2021). Evidence review. Journal of Tests.')).toContain('year = {2021}');
  });

  it('does not generate a fictional bibliography for empty input', () => {
    expect(generateBibTeX('')).toBe('');
    expect(generateRIS('')).toBe('');
  });

  it('normalizes only DOI-shaped values and preserves parsed volume, issue, and pages', () => {
    expect(cleanDOI('https://doi.org/10.1234/abc.7.')).toBe('10.1234/abc.7');
    expect(cleanDOI('javascript:alert(1)')).toBeUndefined();
    const [reference] = parseCitations('@article{lovelace2022,\n author={Lovelace, Ada},\n title={Evidence review},\n journal={Journal of Tests},\n year={2022},\n volume={12},\n number={3},\n pages={44--51},\n doi={10.1234/abc.7}\n}');
    expect(formatAsAPA7([reference])).toContain('*Journal of Tests*, *12*(3), 44–51. https://doi.org/10.1234/abc.7');
    expect(formatAsIEEE([reference])).toContain('*Journal of Tests*, vol. 12, no. 3, pp. 44–51, 2022. doi: 10.1234/abc.7.');
  });
});
