import { describe, expect, it } from 'vitest';
import { sanitizeMermaidSvg } from '../../features/workspace/components/MermaidRenderer';

describe('Mermaid SVG sanitization', () => {
  it('keeps diagram primitives and removes executable SVG content and unsafe links', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script><foreignObject><div>bad</div></foreignObject><a href="javascript:alert(1)"><text>bad link</text></a><path d="M0 0" onclick="alert(1)" /></svg>';
    const result = sanitizeMermaidSvg(svg);
    expect(result).toContain('<path');
    expect(result).not.toMatch(/script|foreignObject|onload|onclick|javascript:/i);
  });

  it('rejects XML entity expansion and DOCTYPE declarations (XXE defense)', () => {
    const xxe = '<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><svg><text>&xxe;</text></svg>';
    expect(sanitizeMermaidSvg(xxe)).toBe('');
  });

  it('removes obfuscated CSS style payloads with comments and vbscript', () => {
    const svgWithStyle = '<svg xmlns="http://www.w3.org/2000/svg"><rect style="background: url/*comment*/(\'javascript:alert(1)\'); behavior: url(test.htc);" /><circle style="position: fixed; top: 0; left: 0;" /></svg>';
    const result = sanitizeMermaidSvg(svgWithStyle);
    expect(result).not.toContain('javascript');
    expect(result).not.toContain('position: fixed');
  });
});
