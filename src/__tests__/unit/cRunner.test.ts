import { describe, it, expect } from 'vitest';
import { executeStudentCCode } from '../../features/coder/services/cRunner';

describe('cRunner', () => {
  it('detects missing main function and returns gcc error', () => {
    const res = executeStudentCCode(`int tambah(int a, int b) { return a + b; }`);
    expect(res.isError).toBe(true);
    expect(res.exitCode).toBe(1);
    expect(res.compilationOutput).toContain("function 'main' is not defined");
  });

  it('detects syntax errors such as missing semicolon', () => {
    const code = `
      int main() {
        int x = 10
        return 0;
      }
    `;
    const res = executeStudentCCode(code);
    expect(res.isError).toBe(true);
    expect(res.compilationOutput).toContain("error: expected ';'");
  });

  it('executes valid C program with printf and tracks variables in virtual memory layout', () => {
    const code = `
      #include <stdio.h>
      int main() {
        int umur = 20;
        float ipk = 3.75;
        printf("Umur: %d, IPK: %f\\n", umur, ipk);
        return 0;
      }
    `;
    const res = executeStudentCCode(code);
    expect(res.isError).toBe(false);
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain('Umur: 20');
    expect(res.memoryLayout.length).toBeGreaterThanOrEqual(2);
    expect(res.memoryLayout.some(c => c.variableName === 'umur' && c.value === 20)).toBe(true);
  });

  it('simulates pointer references and dereferencing', () => {
    const code = `
      int main() {
        int x = 42;
        int *ptr = &x;
        printf("Nilai x: %d\\n", *ptr);
        return 0;
      }
    `;
    const res = executeStudentCCode(code);
    expect(res.isError).toBe(false);
    expect(res.stdout).toContain('Nilai x: 42');
    const ptrCell = res.memoryLayout.find(c => c.variableName === 'ptr');
    expect(ptrCell?.isPointer).toBe(true);
  });
});
