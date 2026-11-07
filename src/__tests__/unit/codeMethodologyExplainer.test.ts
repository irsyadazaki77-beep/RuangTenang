import { describe, it, expect } from 'vitest';
import {
  detectCodeLanguage,
  extractLibraries,
  analyzeComplexity,
  generatePseudocode,
  generateMermaidFlowchart,
  generateCodeMethodologyExplanation,
  analyzeCodeForMethodology
} from '../../features/coder/services/codeMethodologyExplainer';

describe('AI Code-to-Methodology Explainer Service', () => {
  const pythonBinarySearch = `
import math
import numpy as np

def binary_search(arr, target):
    low = 0
    high = len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1
`;

  const pythonNestedLoops = `
def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr
`;

  const cCode = `
#include <stdio.h>
#include <stdlib.h>

int main() {
    printf("Pengujian Algoritma\\n");
    return 0;
}
`;

  const sqlCode = `
SELECT mahasiswa_id, nama, ipk
FROM sia_mahasiswa
WHERE status_aktif = 1
ORDER BY ipk DESC;
`;

  describe('detectCodeLanguage', () => {
    it('detects language from file extension accurately', () => {
      expect(detectCodeLanguage('model.py', '')).toBe('python');
      expect(detectCodeLanguage('main.c', '')).toBe('c');
      expect(detectCodeLanguage('query.sql', '')).toBe('sql');
      expect(detectCodeLanguage('script.ts', '')).toBe('typescript');
      expect(detectCodeLanguage('app.jsx', '')).toBe('javascript');
    });

    it('infers language from content if filename extension is generic', () => {
      expect(detectCodeLanguage('snippet.txt', pythonBinarySearch)).toBe('python');
      expect(detectCodeLanguage('snippet.txt', cCode)).toBe('c');
      expect(detectCodeLanguage('snippet.txt', sqlCode)).toBe('sql');
    });
  });

  describe('extractLibraries', () => {
    it('extracts Python imports and from-imports', () => {
      const libs = extractLibraries(pythonBinarySearch, 'python');
      expect(libs).toContain('math');
      expect(libs).toContain('numpy');
    });

    it('extracts C standard headers', () => {
      const libs = extractLibraries(cCode, 'c');
      expect(libs).toContain('stdio');
      expect(libs).toContain('stdlib');
    });
  });

  describe('analyzeComplexity', () => {
    it('detects logarithmic time complexity for binary search pattern', () => {
      const analysis = analyzeComplexity(pythonBinarySearch);
      expect(analysis.time).toBe('O(log n)');
      expect(analysis.justification).toContain('divide and conquer');
    });

    it('detects quadratic time complexity for nested loops', () => {
      const analysis = analyzeComplexity(pythonNestedLoops);
      expect(analysis.time).toBe('O(n²)');
      expect(analysis.maxLoopDepth).toBe(2);
      expect(analysis.justification).toContain('kuadratik');
    });

    it('detects constant time for code with no loops', () => {
      const simple = 'def add(a, b):\n    return a + b\n';
      const analysis = analyzeComplexity(simple);
      expect(analysis.time).toBe('O(1)');
      expect(analysis.space).toBe('O(1)');
    });
  });

  describe('generatePseudocode', () => {
    it('generates academic IEEE algorithmic pseudocode with input, output and loop', () => {
      const pseudocode = generatePseudocode('binary_search.py', pythonBinarySearch);
      expect(pseudocode).toContain('\\begin{algorithm}');
      expect(pseudocode).toContain('\\textbf{Input:}');
      expect(pseudocode).toContain('\\textbf{Output:}');
      expect(pseudocode).toContain('\\textbf{return}');
      expect(pseudocode).toContain('\\end{algorithm}');
    });
  });

  describe('generateMermaidFlowchart', () => {
    it('generates valid mermaid diagram flowchart with decision nodes', () => {
      const chart = generateMermaidFlowchart(pythonBinarySearch);
      expect(chart).toContain('graph TD');
      expect(chart).toContain('Start([Mulai Inisialisasi])');
      expect(chart).toContain('BranchCheck');
      expect(chart).toContain('Finish([Selesai])');
    });
  });

  describe('generateCodeMethodologyExplanation & analyzeCodeForMethodology', () => {
    it('produces complete Bab 3 and Bab 4 thesis narratives', () => {
      const result = generateCodeMethodologyExplanation(
        'clustering.py',
        pythonNestedLoops,
        'Output: [1, 2, 3, 4, 5]\nWaktu Eksekusi: 0.002s',
        'Sistem Pengelompokan Data Akademik Mahasiswa'
      );

      expect(result.language).toBe('python');
      expect(result.complexity.time).toBe('O(n²)');
      expect(result.bab3Draft).toContain('Bab III');
      expect(result.bab3Draft).toContain('Sistem Pengelompokan Data Akademik Mahasiswa');
      expect(result.bab3Draft).toContain('Prosedur Komputasi & Pseudocode');
      expect(result.bab3Draft).toContain('Diagram Alur Logika Algoritma');

      expect(result.bab4Draft).toContain('Bab IV');
      expect(result.bab4Draft).toContain('Output: [1, 2, 3, 4, 5]');
      expect(result.bab4Draft).toContain('Analisis Kompleksitas Waktu dan Ruang (Big-O)');

      expect(result.fullThesisArtifactMarkdown).toContain(':::artifact');
      expect(result.fullThesisArtifactMarkdown).toContain('Draf Metodologi & Pembahasan Teknis');
    });

    it('works seamlessly through analyzeCodeForMethodology option wrapper', () => {
      const result = analyzeCodeForMethodology({
        filename: 'main.c',
        code: cCode,
        thesisContext: 'Simulasi Sistem Operasi Real-Time'
      });

      expect(result.language).toBe('c');
      expect(result.libraries).toContain('stdio');
      expect(result.fullThesisArtifact).toContain('Simulasi Sistem Operasi Real-Time');
    });
  });
});
