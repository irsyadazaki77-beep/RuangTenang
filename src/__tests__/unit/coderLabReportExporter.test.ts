import { describe, it, expect } from 'vitest';
import { generateMarkdownLabReport } from '../../features/coder/services/labReportExporter';

describe('coderLabReportExporter - Academic Lab Report Generator', () => {
  it('generates a valid structured markdown lab report with headers, code blocks, and test results', () => {
    const report = generateMarkdownLabReport({
      title: 'Praktikum Struktur Data Binary Search Tree',
      studentName: 'Ahmad Mahasiswa',
      studentId: '12345678',
      courseName: 'Algoritma & Struktur Data',
      summary: 'Mengimplementasikan operasi insert, search, dan traverse pada BST.',
      files: {
        'bst.py': 'class Node:\n    pass\n',
        'test_bst.py': 'def test_insert():\n    assert True\n'
      },
      testOutput: 'PASSED test_bst.py::test_insert [100%]'
    });

    expect(report).toContain('# LAPORAN PRAKTIKUM / TUGAS PEMROGRAMAN');
    expect(report).toContain('**Judul Tugas:** Praktikum Struktur Data Binary Search Tree');
    expect(report).toContain('**NIM:** 12345678');
    expect(report).toContain('├── bst.py');
    expect(report).toContain('```python\nclass Node:\n    pass\n```');
    expect(report).toContain('PASSED test_bst.py::test_insert');
    expect(report).toContain('## 5. Analisis Algoritma & Refleksi Pembelajaran');
  });
});
