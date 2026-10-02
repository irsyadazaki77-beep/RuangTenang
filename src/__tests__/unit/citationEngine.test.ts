import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveDOI, searchAcademicPapers } from '../../features/workspace/utils/citationEngine';

const validItem = {
  DOI: '10.1000/example.1', title: ['Verified title'], author: [{ given: 'Ada', family: 'Lovelace' }],
  'published-print': { 'date-parts': [[2022, 1, 1]] }, 'container-title': ['Journal of Tests'], URL: 'https://doi.org/10.1000/example.1'
};

describe('Crossref citation lookup', () => {
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('normalizes and verifies a DOI against Crossref metadata', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: validItem }), { status: 200 })));
    const paper = await resolveDOI('https://doi.org/10.1000/example.1');
    expect(paper).toMatchObject({ doi: validItem.DOI, title: 'Verified title', year: 2022, verified: true, source: 'crossref' });
  });

  it('rejects invalid DOI and malformed or incomplete metadata', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: { ...validItem, author: [] } }), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    expect(await resolveDOI('not-a-doi')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    expect(await resolveDOI('10.1000/example.1')).toBeNull();
  });

  it('returns empty results on Crossref timeout and empty metadata', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url: string, init?: RequestInit) => new Promise((_, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    })));
    const pending = searchAcademicPapers('student stress');
    await vi.advanceTimersByTimeAsync(8_100);
    expect(await pending).toEqual([]);
    vi.useRealTimers();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: { items: [] } }), { status: 200 })));
    expect(await searchAcademicPapers('student stress')).toEqual([]);
  });

  it('deduplicates DOI results and skips malformed entries', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: { items: [validItem, validItem, { DOI: '10.2/no' }] } }), { status: 200 })));
    const papers = await searchAcademicPapers('verified');
    expect(papers).toHaveLength(1);
    expect(papers[0].verified).toBe(true);
  });
});
