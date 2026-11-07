import { describe, expect, it } from 'vitest';
import { buildKnowledgeGraphFromChunks } from '../../services/file-intelligence/graphRagService.js';

describe('GraphRAG Knowledge Graph Service', () => {
  it('extracts academic entities and forms relation edges between co-occurring nodes', () => {
    const chunks = [
      {
        text: 'Penelitian ini meneliti pengaruh stres akademik terhadap self-efficacy menggunakan metodologi kuantitatif dengan regresi linier.',
        documentTitle: 'Bab 1 dan 3.pdf'
      },
      {
        text: 'Berdasarkan Sugiyono (2018), regresi linier digunakan untuk menguji hipotesis hubungan antar variabel independen.',
        documentTitle: 'Bab 3 Metodologi.pdf'
      }
    ];

    const graph = buildKnowledgeGraphFromChunks('ws_test_123', chunks);

    expect(graph.workspaceId).toBe('ws_test_123');
    expect(graph.nodes.length).toBeGreaterThan(0);

    const hasMethodology = graph.nodes.some(n => n.type === 'methodology');
    const hasVariable = graph.nodes.some(n => n.type === 'variable');
    expect(hasMethodology).toBe(true);
    expect(hasVariable).toBe(true);

    expect(graph.edges.length).toBeGreaterThan(0);
    expect(graph.edges[0]).toHaveProperty('source');
    expect(graph.edges[0]).toHaveProperty('target');
    expect(graph.edges[0]).toHaveProperty('relation');
  });

  it('detects research gaps when variables lack theoretical frameworks', () => {
    const chunks = [
      {
        text: 'Variabel stres akademik diuji hubungannya dengan variabel burnout pada mahasiswa tingkat akhir.',
        documentTitle: 'Draf Proposal.docx'
      }
    ];

    const graph = buildKnowledgeGraphFromChunks('ws_gap_test', chunks);
    expect(graph.researchGaps.length).toBeGreaterThanOrEqual(1);
    expect(graph.researchGaps[0].severity).toBe('high');
    expect(graph.researchGaps[0].suggestedResearchQuestion).toContain('landasan teoritis');
  });

  it('provides safe demo graph if input chunks are empty', () => {
    const graph = buildKnowledgeGraphFromChunks('ws_empty', []);
    expect(graph.nodes.length).toBeGreaterThanOrEqual(3);
    expect(graph.edges.length).toBeGreaterThanOrEqual(2);
  });
});
