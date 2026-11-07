import { describe, it, expect } from 'vitest';
import { parseArtifactsFromText } from '../../features/workspace/utils/artifactParser';

describe('Visual & HTML Canvas Artifact Parsing', () => {
  it('parses type="visual" as CODE artifact with language="html"', () => {
    const markdown = `
Berikut catatannya:
:::artifact{type="visual" title="Catatan Tulis Tangan Termodinamika"}
<!DOCTYPE html><html><body><h1>Hukum Termodinamika</h1></body></html>
:::
Semoga membantu!
    `.trim();

    const result = parseArtifactsFromText(markdown);
    expect(result.artifacts).toHaveLength(1);
    expect(result.artifacts[0].type).toBe('CODE');
    expect(result.artifacts[0].language).toBe('html');
    expect(result.artifacts[0].title).toBe('Catatan Tulis Tangan Termodinamika');
    expect(result.artifacts[0].content).toContain('<h1>Hukum Termodinamika</h1>');
  });

  it('parses type="html" as CODE artifact with language="html"', () => {
    const markdown = `
:::artifact{type="html" title="Cheatsheet Rumus Fisika"}
<div class="formula-box">F = m . a</div>
:::
    `.trim();

    const result = parseArtifactsFromText(markdown);
    expect(result.artifacts).toHaveLength(1);
    expect(result.artifacts[0].type).toBe('CODE');
    expect(result.artifacts[0].language).toBe('html');
    expect(result.artifacts[0].title).toBe('Cheatsheet Rumus Fisika');
  });
});