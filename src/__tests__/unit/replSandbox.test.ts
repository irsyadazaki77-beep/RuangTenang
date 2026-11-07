import { describe, it, expect } from 'vitest';
import { evaluateJavaScript, evaluatePythonLite } from '../../features/coder/services/replSandbox';

describe('replSandbox', () => {
  it('evaluates basic JavaScript math and expressions', () => {
    const res = evaluateJavaScript('2 + 3 * 4');
    expect(res.isError).toBe(false);
    expect(res.output).toBe('14');
  });

  it('captures console.log in JavaScript', () => {
    const res = evaluateJavaScript('console.log("Hello", "RuangCoder"); 42;');
    expect(res.isError).toBe(false);
    expect(res.output).toContain('Hello RuangCoder');
    expect(res.output).toContain('42');
  });

  it('handles JavaScript syntax errors gracefully', () => {
    const res = evaluateJavaScript('const a = ;');
    expect(res.isError).toBe(true);
  });

  it('evaluates Python variables and print statements', () => {
    const py = `
x = 10
y = 25
print(x + y)
`;
    const res = evaluatePythonLite(py);
    expect(res.isError).toBe(false);
    expect(res.output).toBe('35');
  });

  it('handles Python string output', () => {
    const py = `print("Halo Dunia")`;
    const res = evaluatePythonLite(py);
    expect(res.isError).toBe(false);
    expect(res.output).toBe('Halo Dunia');
  });
});
