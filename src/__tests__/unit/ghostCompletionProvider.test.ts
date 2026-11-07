import { describe, it, expect } from 'vitest';
import { generateGhostCompletion } from '../../features/coder/services/ghostCompletionProvider';

describe('ghostCompletionProvider', () => {
  it('generates JavaScript/TypeScript ghost completions', () => {
    const res = generateGhostCompletion('App.tsx', 'console.log(', 13);
    expect(res).toContain('[DEBUG]');

    const hookRes = generateGhostCompletion('Component.jsx', 'const [', 8);
    expect(hookRes).toContain('useState(null)');
  });

  it('generates HTML ghost completions', () => {
    const btnRes = generateGhostCompletion('index.html', '<button', 8);
    expect(btnRes).toContain('type="button"');

    const docRes = generateGhostCompletion('index.html', '<!DOCTYPE', 10);
    expect(docRes).toContain('<html lang="id">');
  });

  it('generates Python ghost completions', () => {
    const pyRes = generateGhostCompletion('main.py', 'def ', 5);
    expect(pyRes).toContain('main():');
  });

  it('generates CSS ghost completions', () => {
    const cssRes = generateGhostCompletion('style.css', 'display:', 9);
    expect(cssRes).toContain('flex');
  });

  it('returns null for very short prefix', () => {
    const res = generateGhostCompletion('app.js', 'a', 2);
    expect(res).toBeNull();
  });
});
