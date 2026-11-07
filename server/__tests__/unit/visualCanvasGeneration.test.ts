import { describe, it, expect } from 'vitest';
import { extractHtmlFromAiOutput } from '../../routes/imageGeneration.js';

describe('Visual Canvas Generation - extractHtmlFromAiOutput', () => {
  it('extracts HTML from markdown code blocks', () => {
    const raw = `Berikut hasil catatan tulis tangan:\n\`\`\`html\n<div class="note">Catatan Fisika</div>\n\`\`\`\nSemoga bermanfaat!`;
    const result = extractHtmlFromAiOutput(raw);
    expect(result).toContain('<div class="note">Catatan Fisika</div>');
    expect(result).toContain('<!DOCTYPE html>');
    expect(result).toContain('Caveat');
    expect(result).toContain('Kalam');
  });

  it('preserves full HTML document and injects Google Fonts if missing', () => {
    const fullDoc = `<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Judul</h1></body></html>`;
    const result = extractHtmlFromAiOutput(fullDoc);
    expect(result).toContain('fonts.googleapis.com');
    expect(result).toContain('<h1>Judul</h1>');
  });

  it('wraps partial HTML snippets into complete, responsive HTML documents', () => {
    const snippet = `<section class="infographic"><h2>Siklus Krebs</h2></section>`;
    const result = extractHtmlFromAiOutput(snippet);
    expect(result).toContain('<!DOCTYPE html>');
    expect(result).toContain('<section class="infographic"><h2>Siklus Krebs</h2></section>');
    expect(result).toContain('Plus Jakarta Sans');
  });
});