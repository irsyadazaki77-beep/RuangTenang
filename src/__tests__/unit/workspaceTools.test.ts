import { describe, it, expect } from 'vitest';
import { WorkspaceToolRegistry } from '../../features/workspace/tools/toolRegistry';
import { WorkspaceToolExecutor } from '../../features/workspace/tools/toolExecutor';
import { WorkspaceToolExecutionPayload } from '../../features/workspace/tools/toolTypes';
import { paraphraseAcademicText } from '../../features/workspace/utils/paraphraseEngine';

describe('FASE 23 — Workspace Tool System', () => {
  describe('1. WorkspaceToolRegistry', () => {
    it('should have unique tool IDs across all definitions', () => {
      const allTools = WorkspaceToolRegistry.getAllTools();
      const ids = allTools.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should retrieve a registered tool by canonical ID', () => {
      const tool = WorkspaceToolRegistry.getTool('document_grammar_spok');
      expect(tool).toBeDefined();
      expect(tool?.name).toBe('Perbaiki Tata Bahasa & SPOK');
      expect(tool?.category).toBe('Writing');
    });

    it('should return undefined for non-existent tool', () => {
      const tool = WorkspaceToolRegistry.getTool('non_existent_tool_xyz');
      expect(tool).toBeUndefined();
    });

    it('should filter tools by category', () => {
      const codingTools = WorkspaceToolRegistry.getToolsByCategory('Coding');
      expect(codingTools.length).toBeGreaterThan(0);
      codingTools.forEach(t => expect(t.category).toBe('Coding'));

      const citationTools = WorkspaceToolRegistry.getToolsByCategory('Citation');
      expect(citationTools.length).toBeGreaterThan(0);
      citationTools.forEach(t => expect(t.category).toBe('Citation'));
    });

    it('should filter tools contextually based on artifact type', () => {
      // CODE context
      const codeTools = WorkspaceToolRegistry.getToolsForArtifact('CODE');
      expect(codeTools.some(t => t.id === 'code_optimize_big_o')).toBe(true);
      expect(codeTools.some(t => t.id === 'code_handle_edge_cases')).toBe(true);
      expect(codeTools.every(t => !t.supportedArtifactTypes || t.supportedArtifactTypes.includes('CODE'))).toBe(true);

      // CITATION context
      const citationTools = WorkspaceToolRegistry.getToolsForArtifact('CITATION');
      expect(citationTools.some(t => t.id === 'citation_format_apa')).toBe(true);
      expect(citationTools.some(t => t.id === 'citation_sort_alphabetical')).toBe(true);
      expect(citationTools.some(t => t.id === 'code_optimize_big_o')).toBe(false);

      // Generic context (null artifact)
      const genericTools = WorkspaceToolRegistry.getToolsForArtifact(null);
      genericTools.forEach(t => expect(t.requiresArtifact).not.toBe(true));
    });
  });

  describe('2. WorkspaceToolExecutor — Validation', () => {
    it('should reject execution of unknown tool ID', () => {
      const payload: WorkspaceToolExecutionPayload = {
        toolId: 'unknown_fake_tool',
        input: {},
        context: {}
      };
      const validation = WorkspaceToolExecutor.validate(payload);
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('tidak ditemukan');
    });

    it('should reject execution if tool requires artifact but none is active', () => {
      const payload: WorkspaceToolExecutionPayload = {
        toolId: 'document_grammar_spok',
        input: {},
        context: {
          activeArtifact: null
        }
      };
      const validation = WorkspaceToolExecutor.validate(payload);
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('memerlukan artefak');
    });

    it('should reject execution if artifact type is incompatible with tool', () => {
      const payload: WorkspaceToolExecutionPayload = {
        toolId: 'code_optimize_big_o',
        input: {},
        context: {
          activeArtifact: {
            id: 'art-1',
            title: 'Daftar Pustaka Skripsi',
            type: 'CITATION',
            content: '1. Smith (2020)...',
            version: 1
          }
        }
      };
      const validation = WorkspaceToolExecutor.validate(payload);
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('tidak mendukung tipe artefak CITATION');
    });

    it('should pass validation when payload is correct', () => {
      const payload: WorkspaceToolExecutionPayload = {
        toolId: 'code_optimize_big_o',
        input: {},
        context: {
          activeArtifact: {
            id: 'art-2',
            title: 'Algoritma Sorting',
            type: 'CODE',
            language: 'python',
            content: 'def bubble_sort(arr): pass',
            version: 1
          }
        }
      };
      const validation = WorkspaceToolExecutor.validate(payload);
      expect(validation.valid).toBe(true);
      expect(validation.tool).toBeDefined();
    });

    it('should reject an invalid value for a schema parameter', () => {
      const validation = WorkspaceToolExecutor.validate({
        toolId: 'academic_paraphrase',
        input: { style: 'UNSUPPORTED' },
        context: { activeArtifact: { id: 'doc', title: 'Draft', type: 'DOCUMENT', content: 'Text' } }
      });
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('tidak valid');
    });
  });

  describe('3. WorkspaceToolExecutor — Client Utility Execution', () => {
    it('should sort citations alphabetically using client utility', async () => {
      const tool = WorkspaceToolRegistry.getTool('citation_sort_alphabetical')!;
      const payload: WorkspaceToolExecutionPayload = {
        toolId: tool.id,
        input: {},
        context: {
          activeArtifact: {
            id: 'cit-1',
            title: 'Daftar Pustaka',
            type: 'CITATION',
            content: '## Daftar Pustaka\n- Zaki, A. (2023).\n- Budi, S. (2021).\n- Andi, M. (2022).',
            version: 1
          }
        }
      };

      const result = await WorkspaceToolExecutor.executeClientUtility(tool, payload);
      expect(result.success).toBe(true);
      expect(result.outputType).toBe('ARTIFACT_UPDATE');
      expect(result.proposedContent).toContain('## Daftar Pustaka');
      
      const lines = result.proposedContent!.split('\n').filter(l => l.startsWith('- '));
      expect(lines[0]).toContain('Andi');
      expect(lines[1]).toContain('Budi');
      expect(lines[2]).toContain('Zaki');
    });

    it('should export BibTeX file with valid payload', async () => {
      const tool = WorkspaceToolRegistry.getTool('citation_export_bibtex')!;
      const payload: WorkspaceToolExecutionPayload = {
        toolId: tool.id,
        input: {},
        context: {
          activeArtifact: {
            id: 'cit-2',
            title: 'Rujukan Skripsi',
            type: 'CITATION',
            content: '1. Pratama, B. (2022). Machine Learning untuk Analisis Sentimen. Jurnal Ilmiah Komputer.',
            version: 1
          }
        }
      };

      const result = await WorkspaceToolExecutor.executeClientUtility(tool, payload);
      expect(result.success).toBe(true);
      expect(result.outputType).toBe('DOWNLOAD');
      expect(result.downloadData).toBeDefined();
      expect(result.downloadData?.filename).toBe('rujukan_skripsi.bib');
      expect(result.downloadData?.mimeType).toBe('application/x-bibtex');
    });

    it('should execute academic paraphrase utility safely', async () => {
      const tool = WorkspaceToolRegistry.getTool('academic_paraphrase')!;
      const payload: WorkspaceToolExecutionPayload = {
        toolId: tool.id,
        input: { style: 'KONSERVATIF' },
        context: {
          activeArtifact: {
            id: 'doc-1',
            title: 'Pendahuluan',
            type: 'DOCUMENT',
            content: 'Oleh karena itu kita harus menggunakan metode ini untuk meningkatkan hasil.',
            version: 1
          }
        }
      };

      const result = await WorkspaceToolExecutor.executeClientUtility(tool, payload);
      expect(result.success).toBe(true);
      expect(result.outputType).toBe('ARTIFACT_UPDATE');
      expect(result.proposedContent).toBeDefined();
      expect(result.metadata?.changesCount).toBeDefined();
    });

    it('should pass the selected synthesis style to the academic paraphrase utility', async () => {
      const tool = WorkspaceToolRegistry.getTool('academic_paraphrase')!;
      const payload: WorkspaceToolExecutionPayload = {
        toolId: tool.id,
        input: { style: 'SINTESIS' },
        context: { activeArtifact: { id: 'doc-style', title: 'Draft', type: 'DOCUMENT', content: 'Klaim utama ditunjukkan dalam penelitian. Hasilnya meningkat sebesar 12,5%. Kalimat tambahan menjelaskan konteks.' } }
      };
      const result = await WorkspaceToolExecutor.executeClientUtility(tool, payload);
      expect(result.success).toBe(true);
      expect(result.proposedContent).toBe('Klaim utama ditunjukkan dalam penelitian. Hasilnya meningkat sebesar 12,5%.');
    });
  });

  describe('4. WorkspaceToolExecutor — AI Prompt Preparation', () => {
    it('should format structured prompt template with artifact context without altering safety bounds', () => {
      const tool = WorkspaceToolRegistry.getTool('document_grammar_spok')!;
      const payload: WorkspaceToolExecutionPayload = {
        toolId: tool.id,
        input: {},
        context: {
          activeArtifact: {
            id: 'doc-2',
            title: 'Bab 1',
            type: 'DOCUMENT',
            content: 'saya makan nasi kemarin sore di kantin kampus',
            version: 1
          }
        }
      };

      const prompt = WorkspaceToolExecutor.prepareAiPrompt(tool, payload);
      expect(prompt).toContain('Fokus pada struktur SPOK');
      expect(prompt).toContain('SPOK');
      expect(prompt).toContain('saya makan nasi kemarin sore di kantin kampus');
    });

    it('should prioritize selected text over full artifact content for token efficiency', () => {
      const tool = WorkspaceToolRegistry.getTool('code_explain_logic')!;
      const payload: WorkspaceToolExecutionPayload = {
        toolId: tool.id,
        input: {},
        context: {
          selectedText: 'const res = await fetch("/api/data");',
          activeArtifact: {
            id: 'code-3',
            title: 'index.ts',
            type: 'CODE',
            language: 'typescript',
            content: '// Full 1000 lines code...',
            version: 1
          }
        }
      };

      const prompt = WorkspaceToolExecutor.prepareAiPrompt(tool, payload);
      expect(prompt).toContain('const res = await fetch("/api/data");');
      expect(prompt).not.toContain('// Full 1000 lines code...');
    });
  });
});

describe('Academic paraphrase safety', () => {
  it('preserves claim wording and does not add scientific claims', () => {
    const result = paraphraseAcademicText('Variabel X berpengaruh terhadap variabel Y.');
    expect(result.paraphrasedText).not.toMatch(/positif|signifikan|terbukti|empiris/i);
    expect(result.paraphrasedText).toBe('Variabel X berpengaruh terhadap variabel Y.');
  });

  it('does not convert an unspecified quantity into a majority', () => {
    const result = paraphraseAcademicText('Banyak responden menggunakan aplikasi tersebut.');
    expect(result.paraphrasedText).not.toMatch(/mayoritas/i);
    expect(result.paraphrasedText).toBe('Banyak responden menggunakan aplikasi tersebut.');
  });

  it('preserves percentages and author citations', () => {
    expect(paraphraseAcademicText('Hasil penelitian menunjukkan peningkatan sebesar 12,5%.').paraphrasedText).toContain('12,5%');
    expect(paraphraseAcademicText('Menurut Putra (2025), hasil penelitian perlu dikaji.').paraphrasedText).toContain('Menurut Putra (2025)');
  });

  it('keeps source sentences containing protected numbers, citations, URLs, and DOI in synthesis', () => {
    const result = paraphraseAcademicText('Klaim utama penelitian ini dijelaskan. Menurut Putra (2025), sampel berjumlah 45 orang. Data tersedia di https://example.org/data. DOI: 10.1234/abc. Detail tambahan tidak memuat angka.', 'SINTESIS');
    expect(result.paraphrasedText).toContain('Menurut Putra (2025), sampel berjumlah 45 orang.');
    expect(result.paraphrasedText).toContain('https://example.org/data.');
    expect(result.paraphrasedText).toContain('10.1234/abc.');
  });

  it('is deterministic for every style', () => {
    const input = 'Penelitian ini menemukan hasil tertentu. Temuan tersebut mendukung tujuan yang dinyatakan. Bagian lain menjelaskan konteks.';
    for (const style of ['KONSERVATIF', 'RESTRUKTURISASI', 'SINTESIS'] as const) {
      const outputs = Array.from({ length: 5 }, () => paraphraseAcademicText(input, style).paraphrasedText);
      expect(new Set(outputs).size).toBe(1);
    }
  });
});
