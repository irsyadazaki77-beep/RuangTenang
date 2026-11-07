import { describe, it, expect } from 'vitest';
import {
  extractFunctionsFromCode,
  generateEdgeTestCases,
  runAutograderSuite
} from '../../features/coder/services/codeEdgeCaseTester';

describe('codeEdgeCaseTester', () => {
  it('extracts JavaScript and Python function declarations accurately', () => {
    const jsCode = `
      function hitungRerata(nilaiList) {
        return nilaiList.reduce((a, b) => a + b, 0) / (nilaiList.length || 1);
      }
      const kaliDua = (x) => x * 2;
    `;
    const fns = extractFunctionsFromCode(jsCode);
    expect(fns.length).toBeGreaterThanOrEqual(2);
    expect(fns.some(f => f.name === 'hitungRerata')).toBe(true);
    expect(fns.some(f => f.name === 'kaliDua')).toBe(true);
  });

  it('generates edge test cases covering normal, boundary, empty, and null categories', () => {
    const tests = generateEdgeTestCases('prosesData', 1);
    expect(tests.length).toBe(6);
    const categories = tests.map(t => t.category);
    expect(categories).toContain('normal');
    expect(categories).toContain('empty');
    expect(categories).toContain('boundary');
    expect(categories).toContain('null_undefined');
    expect(categories).toContain('large_scale');
  });

  it('runs autograder suite and assigns score and feedback', async () => {
    const sampleCode = `
      function reverseArray(arr) {
        if (!arr || !Array.isArray(arr)) return [];
        return [...arr].reverse();
      }
    `;
    const report = await runAutograderSuite(sampleCode, 'reverseArray');
    expect(report.functionName).toBe('reverseArray');
    expect(report.totalTests).toBe(6);
    expect(report.score).toBeGreaterThanOrEqual(80);
    expect(report.labFeedback).toBeDefined();
    expect(report.results.length).toBe(6);
  });

  it('handles empty code safely without throwing', async () => {
    const report = await runAutograderSuite('// hanya komentar');
    expect(report.score).toBe(0);
    expect(report.totalTests).toBe(0);
  });
});
