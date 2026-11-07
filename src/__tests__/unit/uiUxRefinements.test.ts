import { describe, expect, it } from 'vitest';
import { extractDocumentOutline } from '../../features/workspace/utils/documentOutline';
import { DAILY_GROUNDING_LINES, getDailyGroundingLine } from '../../features/chat/utils/dailyGrounding';

describe('extractDocumentOutline', () => {
  it('extracts h1-h3 headings with levels and sequential indexes', () => {
    const outline = extractDocumentOutline('# Bab 1\nteks\n## Latar **Belakang**\n### Rumusan\n#### Terlalu dalam');
    expect(outline).toEqual([
      { index: 0, level: 1, text: 'Bab 1' },
      { index: 1, level: 2, text: 'Latar Belakang' },
      { index: 2, level: 3, text: 'Rumusan' },
    ]);
  });

  it('ignores headings inside fenced code blocks', () => {
    const outline = extractDocumentOutline('# Nyata\n```md\n# Palsu\n```\n## Juga nyata');
    expect(outline.map(item => item.text)).toEqual(['Nyata', 'Juga nyata']);
  });

  it('strips link syntax and handles empty input', () => {
    expect(extractDocumentOutline('## Lihat [APA 7](https://x.y)')[0].text).toBe('Lihat APA 7');
    expect(extractDocumentOutline('')).toEqual([]);
  });
});

describe('getDailyGroundingLine', () => {
  it('is stable within a day and comes from the list', () => {
    const morning = getDailyGroundingLine(new Date(2026, 10, 1, 7));
    const night = getDailyGroundingLine(new Date(2026, 10, 1, 23));
    expect(morning).toBe(night);
    expect(DAILY_GROUNDING_LINES).toContain(morning);
  });

  it('changes between consecutive days', () => {
    expect(getDailyGroundingLine(new Date(2026, 10, 1))).not.toBe(getDailyGroundingLine(new Date(2026, 10, 2)));
  });
});
