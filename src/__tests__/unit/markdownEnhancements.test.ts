import { describe, it, expect } from 'vitest';
import { tokenizeCode, resolveLanguage } from '../../lib/codeHighlight';
import { normalizeMathDelimiters } from '../../components/common/MarkdownRenderer';

describe('codeHighlight', () => {
  it('resolves aliases and unknown languages', () => {
    expect(resolveLanguage('TypeScript')).toBe('js');
    expect(resolveLanguage('html')).toBe('markup');
    expect(resolveLanguage('brainfuck')).toBeNull();
  });
  it('tokenizes keywords, strings, numbers and comments', () => {
    const types = tokenizeCode('const x = "a"; // hi\nlet n = 42', 'js').map(t => t.type);
    expect(types).toContain('keyword');
    expect(types).toContain('string');
    expect(types).toContain('comment');
    expect(types).toContain('number');
  });
  it('round-trips the original text', () => {
    const code = 'SELECT name FROM users WHERE id = 1; -- cek';
    expect(tokenizeCode(code, 'sql').map(t => t.text).join('')).toBe(code);
  });
  it('returns plain token for unknown language', () => {
    expect(tokenizeCode('abc', 'zzz')).toEqual([{ type: 'plain', text: 'abc' }]);
  });
});

describe('normalizeMathDelimiters', () => {
  it('converts \\( \\) and \\[ \\] delimiters', () => {
    expect(normalizeMathDelimiters('a \\(x^2\\) b')).toBe('a $x^2$ b');
    expect(normalizeMathDelimiters('\\[x+y\\]')).toContain('$$\nx+y\n$$');
  });
  it('leaves normal text untouched', () => {
    expect(normalizeMathDelimiters('harga Rp5')).toBe('harga Rp5');
  });
});
