/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizePublicUrl, searchWeb, WebSearchError, isWebSearchConfigured } from '../../services/webSearchService.js';
import { getAllowedAgentToolIds } from '../../services/agent/agentToolRegistry.js';

const okFetch = (results: unknown[]) => vi.fn(async () => new Response(JSON.stringify({ results }), { status: 200 })) as unknown as typeof fetch;

describe('web search (real provider contract, mocked transport)', () => {
  afterEach(() => { delete process.env.TAVILY_API_KEY; });

  it('is unavailable and not offered to the agent without an API key', async () => {
    expect(isWebSearchConfigured()).toBe(false);
    await expect(searchWeb('metode belajar', { maxResults: 3 })).rejects.toMatchObject({ code: 'WEB_SEARCH_NOT_CONFIGURED' });
    expect(getAllowedAgentToolIds('research', { attachmentIds: [] }).has('search_web')).toBe(false);
  });

  it('is offered only to research tasks once configured', () => {
    process.env.TAVILY_API_KEY = 'tvly-test';
    expect(getAllowedAgentToolIds('research', { attachmentIds: [] }).has('search_web')).toBe(true);
    expect(getAllowedAgentToolIds('writing', { attachmentIds: [] }).has('search_web')).toBe(false);
  });

  it('returns only provider data, drops unsafe/duplicate/empty results, and sanitises the outgoing query', async () => {
    process.env.TAVILY_API_KEY = 'tvly-test';
    const fetchImpl = okFetch([
      { title: 'Studi A', url: 'https://example.org/a#frag', content: 'Isi nyata A', published_date: '2024-03-01' },
      { title: 'Duplikat', url: 'https://example.org/a', content: 'Isi lain' },
      { title: 'Internal', url: 'http://192.168.1.5/admin', content: 'rahasia' },
      { title: 'Skema aneh', url: 'javascript:alert(1)', content: 'x' },
      { title: 'Kosong', url: 'https://example.org/kosong', content: '   ' },
      { title: 'Studi B', url: 'https://example.com/b', content: 'Isi nyata B', published_date: 'bukan tanggal' }
    ]);
    const results = await searchWeb('dampak metode belajar, hubungi budi@example.com', { maxResults: 5, fetchImpl });
    expect(results.map(item => item.url)).toEqual(['https://example.org/a', 'https://example.com/b']);
    expect(results[0]).toMatchObject({ title: 'Studi A', excerpt: 'Isi nyata A', publishedDate: '2024-03-01' });
    expect(results[1].publishedDate).toBeUndefined(); // invalid date is never invented or passed through
    const sent = JSON.parse(String((vi.mocked(fetchImpl).mock.calls[0][1] as RequestInit).body));
    expect(sent.query).not.toContain('budi@example.com');
  });

  it('maps provider failures to a safe error and never returns fabricated results', async () => {
    process.env.TAVILY_API_KEY = 'tvly-test';
    const failing = vi.fn(async () => new Response('boom', { status: 500 })) as unknown as typeof fetch;
    await expect(searchWeb('query valid', { maxResults: 3, fetchImpl: failing })).rejects.toBeInstanceOf(WebSearchError);
    const broken = vi.fn(async () => { throw new Error('network'); }) as unknown as typeof fetch;
    await expect(searchWeb('query valid', { maxResults: 3, fetchImpl: broken })).rejects.toMatchObject({ code: 'WEB_SEARCH_FAILED' });
  });

  it('only accepts public http(s) URLs without credentials', () => {
    expect(normalizePublicUrl('https://user:pw@example.org/')).toBeNull();
    expect(normalizePublicUrl('ftp://example.org/')).toBeNull();
    expect(normalizePublicUrl('http://localhost:3000/')).toBeNull();
    expect(normalizePublicUrl('https://example.org/path?q=1')).toBe('https://example.org/path?q=1');
  });
});
