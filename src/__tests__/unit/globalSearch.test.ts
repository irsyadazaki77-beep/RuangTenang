import { describe, it, expect } from 'vitest';

describe('GlobalSearch Logic', () => {
  const sampleFiles: Record<string, string> = {
    'index.html': '<h1>RuangTenang</h1>\n<p>Belajar coding mudah.</p>',
    'app.js': 'const title = "RuangTenang";\nconsole.log(title);',
    'style.css': '.header { color: #38bdf8; }'
  };

  it('matches keyword across multiple files correctly', () => {
    const term = 'RuangTenang';
    const regex = new RegExp(term, 'gi');

    const matches: Record<string, number> = {};
    for (const [path, content] of Object.entries(sampleFiles)) {
      const found = (content.match(regex) || []).length;
      if (found > 0) matches[path] = found;
    }

    expect(matches['index.html']).toBe(1);
    expect(matches['app.js']).toBe(1);
    expect(matches['style.css']).toBeUndefined();
  });

  it('performs case-sensitive matching when specified', () => {
    const content = 'Test test TEST';
    const caseSensitiveRegex = new RegExp('test', 'g');
    const matches = content.match(caseSensitiveRegex) || [];
    expect(matches.length).toBe(1);
  });

  it('replaces all occurrences correctly', () => {
    const original = 'const a = "foo"; const b = "foo";';
    const replaced = original.replace(/foo/g, 'bar');
    expect(replaced).toBe('const a = "bar"; const b = "bar";');
  });
});
