import { describe, it, expect } from 'vitest';
import { extractFunctionsFromCode, generateSmartTestFile } from '../../features/coder/services/codeTestGenerator';

describe('codeTestGenerator - Unit Test Automation', () => {
  it('extracts JavaScript functions accurately', () => {
    const jsCode = `
      export function calculateStats(numbers) { return numbers.length; }
      const formatCurrency = (val) => val;
      function helper() {}
    `;
    const fns = extractFunctionsFromCode(jsCode, 'javascript');
    expect(fns).toContain('calculateStats');
    expect(fns).toContain('formatCurrency');
    expect(fns).toContain('helper');
  });

  it('extracts Python def functions accurately', () => {
    const pyCode = `
      def solve_tsp(graph):
          pass

      def __private_helper():
          pass

      def dijkstra(start, end):
          return 42
    `;
    const fns = extractFunctionsFromCode(pyCode, 'python');
    expect(fns).toContain('solve_tsp');
    expect(fns).toContain('dijkstra');
    expect(fns).not.toContain('__private_helper');
  });

  it('generates a complete runnable test suite for JavaScript', () => {
    const jsCode = `export function add(a, b) { return a + b; }`;
    const suite = generateSmartTestFile('math.js', jsCode);

    expect(suite.testFilename).toBe('test.js');
    expect(suite.testCode).toContain('import { add } from \'./math.js\'');
    expect(suite.testCode).toContain('assert(typeof add === \'function\'');
    expect(suite.testCode).toContain('SEMUA TEST LOLOS');
  });

  it('generates a valid unittest suite for Python', () => {
    const pyCode = `def fib(n): return n`;
    const suite = generateSmartTestFile('fibonacci.py', pyCode);

    expect(suite.testFilename).toBe('test_fibonacci.py');
    expect(suite.testCode).toContain('import unittest');
    expect(suite.testCode).toContain('class TestFibonacci(unittest.TestCase):');
    expect(suite.testCode).toContain('def test_fib_nominal');
  });
});
