import { describe, expect, it } from 'vitest';
import { sanitizeMermaidSvg } from '../../features/workspace/components/MermaidRenderer';

describe('Mermaid SVG sanitization', () => {
  it('keeps diagram primitives and removes executable SVG content and unsafe links', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script><foreignObject><div>bad</div></foreignObject><a href="javascript:alert(1)"><text>bad link</text></a><path d="M0 0" onclick="alert(1)" /></svg>';
    const result = sanitizeMermaidSvg(svg);
    expect(result).toContain('<path');
    expect(result).not.toMatch(/script|foreignObject|onload|onclick|javascript:/i);
  });
});
