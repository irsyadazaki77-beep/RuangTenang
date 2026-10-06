 import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateCodeStatically } from '../../features/workspace/services/codeValidationService';
import { runJavaScriptInSandbox } from '../../features/workspace/services/sandboxExecutionService';

describe('Secure Code Validation Service (Static Analysis)', () => {
  it('handles empty code safely without errors', () => {
    const res = validateCodeStatically('', 'javascript');
    expect(res.mode).toBe('static');
    expect(res.status).toBe('completed');
    expect(res.warnings[0]).toContain('Kode kosong');
  });

  it('detects unbalanced brackets correctly', () => {
    const unclosed = 'function test() { if (true) { console.log("hi"); }';
    const res = validateCodeStatically(unclosed, 'javascript');
    expect(res.mode).toBe('static');
    expect(res.status).toBe('error');
    expect(res.stderr.length).toBeGreaterThan(0);
    expect(res.stderr[0]).toContain('belum ditutup');
  });

  it('detects mismatched brackets', () => {
    const mismatched = 'const arr = [1, 2, 3};';
    const res = validateCodeStatically(mismatched, 'javascript');
    expect(res.status).toBe('error');
    expect(res.stderr[0]).toContain('Kurung tidak cocok');
  });

  it('validates balanced code without false error', () => {
    const valid = 'const sum = (a, b) => { return a + b; };';
    const res = validateCodeStatically(valid, 'javascript');
    expect(res.status).toBe('completed');
    expect(res.stderr).toHaveLength(0);
    expect(res.message).toBe('Tidak ditemukan kesalahan struktural dasar.');
  });

  it('provides honest Python static feedback without fake execution claims', () => {
    const pyCode = 'def add(a, b):\n    return a + b\n';
    const res = validateCodeStatically(pyCode, 'python');
    expect(res.mode).toBe('static');
    expect(res.status).toBe('completed');
    expect(res.warnings[0]).toContain('Eksekusi Python belum tersedia di browser');
    // Ensure no fake claims like "Optimal O(n)" or "Executed successfully"
    expect(JSON.stringify(res)).not.toContain('Optimal O(n)');
    expect(JSON.stringify(res)).not.toContain('Execution Plan');
  });

  it('catches Python missing colon syntax statically', () => {
    const pyBroken = 'def calculate(x)\n    return x * 2\n';
    const res = validateCodeStatically(pyBroken, 'python');
    expect(res.status).toBe('error');
    expect(res.stderr[0]).toContain('harus diakhiri dengan tanda titik dua');
  });

  it('flags destructive SQL statements and warns about unexecuted queries', () => {
    const sqlDestructive = 'DROP TABLE users;';
    const res = validateCodeStatically(sqlDestructive, 'sql');
    expect(res.mode).toBe('static');
    expect(res.warnings.some(w => w.includes('DROP TABLE'))).toBe(true);
    expect(res.warnings.some(w => w.includes('belum dijalankan ke database'))).toBe(true);
    expect(JSON.stringify(res)).not.toContain('Index Scan verified');
  });

  it('handles other unsupported runtimes gracefully', () => {
    const cppCode = 'int main() { return 0; }';
    const res = validateCodeStatically(cppCode, 'cpp');
    expect(res.mode).toBe('static');
    expect(res.warnings[0]).toContain("Runtime untuk bahasa 'cpp' tidak tersedia");
  });
});

describe('Sandbox Execution Service (Web Worker Isolation)', () => {
  it('falls back safely if Worker environment is missing', async () => {
    // In node/vitest default jsdom if Worker is undefined
    const handle = runJavaScriptInSandbox('console.log("test");');
    const result = await handle.promise;
    expect(result.mode).toBe('sandbox');
    // Either completed if mock/Worker exists or unsupported
    expect(['completed', 'unsupported', 'error']).toContain(result.status);
  });

  it('enforces maximum code size cap', async () => {
    const hugeCode = 'a'.repeat(101 * 1024);
    const handle = runJavaScriptInSandbox(hugeCode);
    const result = await handle.promise;
    expect(result.status).toBe('unsupported');
    expect(result.message).toContain('Kode terlalu besar');
  });
});
