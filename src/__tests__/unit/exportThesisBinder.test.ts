import { describe, it, expect } from 'vitest';
import {
  autoMapArtifactsToChapters,
  compileThesisBinderMarkdown,
  THESIS_STANDARD_SLOTS,
  ThesisBinderMap
} from '../../features/workspace/utils/exportThesisBinder';
import { WorkspaceArtifact } from '../../features/workspace/types';

describe('Thesis Multi-Chapter Binder & Compiler', () => {
  const mockArtifacts: WorkspaceArtifact[] = [
    {
      id: 'art-bab1',
      type: 'DOCUMENT',
      title: 'Bab 1 Pendahuluan Skripsi',
      content: '### 1.1 Latar Belakang Masalah\nFenomena Das Sollen dan Das Sein.\n\n### Daftar Pustaka\nSantoso, B. (2021). Peran AI.',
      version: 1,
      updatedAt: '2026-10-30T00:00:00.000Z'
    },
    {
      id: 'art-bab2',
      type: 'DOCUMENT',
      title: 'Bab 2 Tinjauan Pustaka & Landasan Teori',
      content: '### 2.1 Landasan Teori Utama\nGrand theory behavioristik.\n\n### Daftar Pustaka\nRahmawati, S. (2023). Teori Pembelajaran.\nSantoso, B. (2021). Peran AI.',
      version: 1,
      updatedAt: '2026-10-30T00:00:00.000Z'
    },
    {
      id: 'art-bab3',
      type: 'DOCUMENT',
      title: 'Bab 3 Metodologi Penelitian Kuantitatif',
      content: '### 3.1 Pendekatan Penelitian\nMetode eksperimen semu N=100.',
      version: 1,
      updatedAt: '2026-10-30T00:00:00.000Z'
    }
  ];

  it('auto-maps chapter artifacts based on inferred title keywords', () => {
    const map = autoMapArtifactsToChapters(mockArtifacts);
    expect(map['BAB_1']).toBe('art-bab1');
    expect(map['BAB_2']).toBe('art-bab2');
    expect(map['BAB_3']).toBe('art-bab3');
  });

  it('compiles multi-chapter documents with page breaks and deduplicated bibliography', () => {
    const binderMap: ThesisBinderMap = {
      BAB_1: 'art-bab1',
      BAB_2: 'art-bab2',
      BAB_3: 'art-bab3'
    };

    const compiled = compileThesisBinderMarkdown(
      'Efektivitas AI Kampus',
      'Ahmad Zaki',
      mockArtifacts,
      binderMap
    );

    // Front matter
    expect(compiled).toContain('# EFEKTIVITAS AI KAMPUS');
    expect(compiled).toContain('Ahmad Zaki');

    // Chapters
    expect(compiled).toContain('BAB I\nPENDAHULUAN');
    expect(compiled).toContain('BAB II\nTINJAUAN PUSTAKA DAN LANDASAN TEORI');
    expect(compiled).toContain('BAB III\nMETODOLOGI PENELITIAN');
    expect(compiled).toContain('page-break-before: always;');

    // Deduplicated unified bibliography
    expect(compiled).toContain('## DAFTAR PUSTAKA');
    expect(compiled).toContain('Santoso, B. (2021). Peran AI.');
    expect(compiled).toContain('Rahmawati, S. (2023). Teori Pembelajaran.');

    // Count occurrences of Santoso - should appear once in unified bibliography section
    const bibSection = compiled.slice(compiled.indexOf('## DAFTAR PUSTAKA'));
    const santosoMatches = (bibSection.match(/Santoso, B\. \(2021\)\. Peran AI\./g) || []).length;
    expect(santosoMatches).toBe(1);
  });
});
