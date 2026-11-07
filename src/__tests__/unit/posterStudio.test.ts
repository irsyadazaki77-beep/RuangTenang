import { describe, it, expect } from 'vitest';
import { isPosterContent, createPosterFromMarkdown, POSTER_THEMES } from '../../features/workspace/utils/posterModel';

describe('Poster Model & Utilities', () => {
  it('detects poster JSON format correctly', () => {
    const validJson = JSON.stringify({
      format: 'ruangtenang-poster-v1',
      sections: [{ id: '1', title: 'Test', content: 'Content' }]
    });
    expect(isPosterContent(validJson)).toBe(true);

    const invalidJson = JSON.stringify({
      format: 'other-format',
      sections: []
    });
    expect(isPosterContent(invalidJson)).toBe(false);

    expect(isPosterContent('not a json')).toBe(false);
  });

  it('converts markdown headings and images into structured poster sections', () => {
    const markdown = `# Penelitian Dampak AI
## Pendahuluan
AI memberikan efisiensi tinggi pada analisis data.

## Hasil Analisis
![Grafik Performa Analisis](/api/ai/images/grafik123.jpg)
Terdapat peningkatan efisiensi sebesar 45%.

## Kesimpulan
Penerapan AI mempercepat penulisan secara signifikan.`;

    const poster = createPosterFromMarkdown(markdown, 'Judul Default');

    expect(poster.title).toBe('Penelitian Dampak AI');
    expect(poster.sections.length).toBe(3);
    expect(poster.sections[0].title).toBe('Pendahuluan');
    expect(poster.sections[0].content).toContain('efisiensi tinggi');
    expect(poster.sections[1].title).toBe('Hasil Analisis');
    expect(poster.sections[1].imageUrl).toBe('/api/ai/images/grafik123.jpg');
    expect(poster.sections[1].imageCaption).toBe('Grafik Performa Analisis');
  });

  it('provides fallback sections if markdown is too brief', () => {
    const markdown = 'Hanya teks biasa tanpa heading.';
    const poster = createPosterFromMarkdown(markdown, 'Judul Alternatif');

    expect(poster.sections.length).toBeGreaterThanOrEqual(3);
    expect(poster.theme).toBe('academic_navy');
    expect(POSTER_THEMES[poster.theme]).toBeDefined();
  });
});
