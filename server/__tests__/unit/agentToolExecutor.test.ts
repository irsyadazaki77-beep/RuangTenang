import { describe, expect, it, vi } from 'vitest';

vi.mock('../../services/file-intelligence/contextRetrievalService.js', () => ({
  contextRetrievalService: { retrieveContext: vi.fn() }
}));
vi.mock('../../services/attachmentStorageService.js', () => ({
  attachmentStorageService: { getAttachmentForUser: vi.fn() }
}));
vi.mock('../../services/webSearchService.js', () => ({
  isWebSearchConfigured: () => true,
  searchWeb: vi.fn(),
  webCitationDocumentId: () => 'web-doc-1'
}));

import { contextRetrievalService } from '../../services/file-intelligence/contextRetrievalService.js';
import { attachmentStorageService } from '../../services/attachmentStorageService.js';
import { searchWeb } from '../../services/webSearchService.js';
import { executeAuthorizedAgentTool } from '../../services/agent/agentToolExecutor.js';
import { getAllowedAgentToolIds } from '../../services/agent/agentToolRegistry.js';
import type { WorkspacePlan } from '../../../shared/contracts/workspace.js';

const task = {
  id: 'task-1', title: 'Research', type: 'research', status: 'running', executionId: 'execution-1', dependsOn: [],
  snapshot: { inputPrompt: 'Compare selected evidence.', contextSourceIds: ['file-a'], modelId: 'gemini-3.8-flash', createdAt: '2026-10-11T00:00:00Z' }
} as WorkspacePlan['tasks'][number];

const context = {
  executionId: 'execution-1', workspaceId: 'chat-1', userId: 'user-1', task,
  allowedToolIds: new Set(['search_workspace_documents']), abortSignal: new AbortController().signal,
  sourceNamespace: 'AGENT_execution-1', nextSourceIndex: () => 1
};

describe('server Agent tool authorization', () => {
  it('denies arbitrary tool names even when the model requests them', async () => {
    const result = await executeAuthorizedAgentTool('delete_workspace', {}, context);
    expect(result).toMatchObject({ status: 'failed', error: { code: 'TOOL_NOT_ALLOWED' } });
    expect(contextRetrievalService.retrieveContext).not.toHaveBeenCalled();
  });

  it('rejects a document outside the task file allowlist before retrieval', async () => {
    const result = await executeAuthorizedAgentTool('search_workspace_documents', {
      query: 'annual review', attachmentIds: ['file-b'], maxResults: 2
    }, context);
    expect(result).toMatchObject({ status: 'failed', error: { code: 'SOURCE_NOT_ALLOWED' } });
    expect(contextRetrievalService.retrieveContext).not.toHaveBeenCalled();
  });

  it('rejects unrecognized tool arguments with the registered Zod input schema', async () => {
    const result = await executeAuthorizedAgentTool('search_workspace_documents', {
      query: 'annual review', arbitraryUrl: 'https://example.invalid'
    }, context);
    expect(result).toMatchObject({ status: 'failed', error: { code: 'INVALID_TOOL_INPUT' } });
    expect(contextRetrievalService.retrieveContext).not.toHaveBeenCalled();
  });

  it('returns separately attributed evidence for a multi-document comparison', async () => {
    const multiTask = { ...task, snapshot: { ...task.snapshot!, contextSourceIds: ['file-a', 'file-b'] } };
    const multiContext = {
      ...context, task: multiTask,
      allowedToolIds: getAllowedAgentToolIds('research', { attachmentIds: ['file-a', 'file-b'] }),
      nextSourceIndex: (() => { let index = 0; return () => ++index; })()
    };
    vi.mocked(contextRetrievalService.retrieveContext).mockResolvedValueOnce({
      contextBlock: '', totalTokensUsed: 20,
      snapshot: { id: 'snapshot-compare' } as never,
      chunksSelected: [
        { id: 'a1', documentId: 'file-a', index: 0, text: 'The intervention reduced the score by four points.', tokenEstimate: 10, sourceRef: 'p. 2', checksum: 'chunk-a' },
        { id: 'b1', documentId: 'file-b', index: 0, text: 'The intervention increased the score by four points.', tokenEstimate: 10, sourceRef: 'p. 5', checksum: 'chunk-b' }
      ],
      sourceReferences: [
        { citationId: 'SRC_1', documentId: 'file-a', workspaceId: 'chat-1', checksum: 'sha-a', sourceVersion: 'sha-a', filename: 'A.pdf', sourceRef: 'p. 2' },
        { citationId: 'SRC_2', documentId: 'file-b', workspaceId: 'chat-1', checksum: 'sha-b', sourceVersion: 'sha-b', filename: 'B.pdf', sourceRef: 'p. 5' }
      ]
    });
    const result = await executeAuthorizedAgentTool('compare_workspace_documents', {
      query: 'intervention score', attachmentIds: ['file-a', 'file-b'], perDocumentLimit: 1
    }, multiContext);
    expect(result).toMatchObject({ status: 'completed', data: {
      comparisonStatus: 'requires_synthesis',
      documents: [
        { documentId: 'file-a', filename: 'A.pdf', sourceVersion: 'sha-a' },
        { documentId: 'file-b', filename: 'B.pdf', sourceVersion: 'sha-b' }
      ],
      results: [
        { excerpt: 'The intervention reduced the score by four points.', sourceRef: 'p. 2', checksum: 'sha-a' },
        { excerpt: 'The intervention increased the score by four points.', sourceRef: 'p. 5', checksum: 'sha-b' }
      ]
    } });
  });

  it('labels a source excerpt as supported only for a literal claim match', async () => {
    const multiContext = { ...context, allowedToolIds: getAllowedAgentToolIds('research', { attachmentIds: ['file-a'] }) };
    vi.mocked(contextRetrievalService.retrieveContext).mockResolvedValueOnce({
      contextBlock: '', totalTokensUsed: 10, snapshot: { id: 'snapshot-claim' } as never,
      chunksSelected: [{ id: 'a1', documentId: 'file-a', index: 0, text: 'The program reduced anxiety scores by four points.', tokenEstimate: 10, sourceRef: 'p. 2', checksum: 'chunk-a' }],
      sourceReferences: [{ citationId: 'SRC_1', documentId: 'file-a', filename: 'A.pdf', sourceRef: 'p. 2' }]
    });
    const result = await executeAuthorizedAgentTool('verify_claim_support', {
      claim: 'The program reduced anxiety scores by four points.'
    }, multiContext);
    expect(result).toMatchObject({ status: 'completed', data: {
      status: 'supported', assessmentMethod: 'exact_text_match', results: [{ sourceRef: 'p. 2' }]
    } });
  });

  it('extracts guideline candidates through approved document retrieval and requires user confirmation', async () => {
    vi.mocked(contextRetrievalService.retrieveContext).mockResolvedValueOnce({
      contextBlock: '', totalTokensUsed: 10, snapshot: { id: 'snapshot-guide' } as never,
      chunksSelected: [{ id: 'g1', documentId: 'file-a', index: 0, text: 'Naskah maksimal 6 halaman. Gunakan Arial 11 pt.', tokenEstimate: 10, pageStart: 3, sourceRef: 'p. 3', checksum: 'chunk-guide' }],
      sourceReferences: [{ citationId: 'SRC_1', documentId: 'file-a', workspaceId: 'chat-1', checksum: 'guide-sha', sourceVersion: 'guide-sha', filename: 'guide.pdf', sourceRef: 'p. 3', page: 3 }]
    });
    const allowedToolIds = getAllowedAgentToolIds('research', { attachmentIds: ['file-a'] });
    const result = await executeAuthorizedAgentTool('extract_assignment_guidelines', { attachmentIds: ['file-a'] }, { ...context, allowedToolIds });
    expect(result).toMatchObject({ status: 'completed', data: {
      requiresUserConfirmation: true,
      rules: expect.arrayContaining([expect.objectContaining({ type: 'maximum_pages', value: '6 halaman', documentId: 'file-a', sourceRef: 'p. 3' })]),
      results: [expect.objectContaining({ checksum: 'guide-sha', page: 3 })]
    } });
  });

  it('fails closed when attachment ownership lookup rejects the selected file', async () => {
    vi.mocked(attachmentStorageService.getAttachmentForUser).mockRejectedValueOnce(new Error('UNAUTHORIZED_ACCESS'));
    const analysisTask = { ...task, type: 'analysis' as const };
    const analysisContext = {
      ...context, task: analysisTask,
      allowedToolIds: getAllowedAgentToolIds('analysis', { attachmentIds: ['file-a'] })
    };

    const result = await executeAuthorizedAgentTool('inspect_workspace_dataset', { attachmentId: 'file-a' }, analysisContext);

    expect(result).toMatchObject({ status: 'failed', error: { code: 'SOURCE_NOT_FOUND' } });
    expect(attachmentStorageService.getAttachmentForUser).toHaveBeenCalledWith('file-a', 'user-1', false);
  });

  it('retries a transient web research failure with the bounded idempotent retry policy', async () => {
    const researchContext = { ...context, allowedToolIds: new Set(['search_web']) };
    vi.mocked(searchWeb)
      .mockRejectedValueOnce(new Error('WEB_SEARCH_FAILED'))
      .mockResolvedValueOnce([{ title: 'Value chain overview', url: 'https://example.org/value-chain', excerpt: 'A source snippet.', publishedDate: '2025-01-01' }]);

    const result = await executeAuthorizedAgentTool('search_web', { query: 'Porter value chain evidence', maxResults: 1 }, researchContext);

    expect(result.status).toBe('completed');
    expect(result).toMatchObject({ data: { provider: 'tavily', verificationStatus: 'external_unverified', results: [{ url: 'https://example.org/value-chain' }] } });
    expect(searchWeb).toHaveBeenCalledTimes(2);
  });

  it('proposes a structured document draft with sections and references', async () => {
    const writingContext = {
      ...context,
      allowedToolIds: new Set(['propose_document_draft'])
    };
    const result = await executeAuthorizedAgentTool('propose_document_draft', {
      title: 'Laporan Analisis Efektivitas Intervensi',
      summary: 'Ringkasan komparasi intervensi konseling berbasis bukti.',
      sections: [
        { heading: 'Pendahuluan', level: 1, body: 'Latar belakang penelitian intervensi.' },
        { heading: 'Metodologi', level: 2, body: 'Metode kuasi eksperimen dengan pre-post test.' }
      ],
      references: ['Santrock, J. W. (2020). Educational Psychology. McGraw-Hill.']
    }, writingContext);

    expect(result.status).toBe('completed');
    expect(result).toMatchObject({
      data: {
        proposalStatus: 'ready_for_review',
        artifactType: 'DOCUMENT',
        title: 'Laporan Analisis Efektivitas Intervensi',
        sectionCount: 2,
        formattedMarkdown: expect.stringContaining('# Laporan Analisis Efektivitas Intervensi')
      }
    });
  });

  it('proposes a structured slide deck for presentations', async () => {
    const presentationContext = {
      ...context,
      allowedToolIds: new Set(['propose_presentation_deck'])
    };
    const result = await executeAuthorizedAgentTool('propose_presentation_deck', {
      title: 'Presentasi Eksekutif Hasil Riset',
      theme: 'professional',
      slides: [
        { title: 'Judul Riset', body: 'Paparan hasil analisis data empiris.', notes: 'Buka presentasi dengan salam.' },
        { title: 'Temuan Utama', body: '- Peningkatan efikasi diri 28%\n- Penurunan tingkat stres 34%', notes: 'Sorot data persentase.' }
      ]
    }, presentationContext);

    expect(result.status).toBe('completed');
    expect(result).toMatchObject({
      data: {
        proposalStatus: 'ready_for_review',
        artifactType: 'DOCUMENT',
        language: 'presentation',
        title: 'Presentasi Eksekutif Hasil Riset',
        slideCount: 2,
        deckJson: expect.stringContaining('ruangtenang-presentation-v1')
      }
    });
  });

  it('proposes a structured tabular dataset for spreadsheet studio', async () => {
    const tableContext = {
      ...context,
      allowedToolIds: new Set(['propose_tabular_dataset'])
    };
    const result = await executeAuthorizedAgentTool('propose_tabular_dataset', {
      title: 'Tabel Rekapitulasi Skor Intervensi',
      columns: ['Kelompok', 'Skor Pre-Test', 'Skor Post-Test', 'Delta'],
      columnTypes: { 'Kelompok': 'text', 'Skor Pre-Test': 'number', 'Skor Post-Test': 'number', 'Delta': 'number' },
      rows: [
        { 'Kelompok': 'Kontrol', 'Skor Pre-Test': 65, 'Skor Post-Test': 68, 'Delta': 3 },
        { 'Kelompok': 'Eksperimen', 'Skor Pre-Test': 62, 'Skor Post-Test': 88, 'Delta': 26 }
      ]
    }, tableContext);

    expect(result.status).toBe('completed');
    expect(result).toMatchObject({
      data: {
        proposalStatus: 'ready_for_review',
        artifactType: 'TABLE',
        title: 'Tabel Rekapitulasi Skor Intervensi',
        columnCount: 4,
        rowCount: 2,
        tableJson: expect.stringContaining('"type": "table"')
      }
    });
  });

  it('verifies artifact structural integrity and exporter readiness', async () => {
    const verifyContext = {
      ...context,
      allowedToolIds: new Set(['verify_artifact_structure'])
    };
    const validDocContent = '# Laporan\n\n' + 'Kata '.repeat(60) + '\n\n## Referensi\n- Ref 1';
    const result = await executeAuthorizedAgentTool('verify_artifact_structure', {
      targetType: 'document',
      content: validDocContent
    }, verifyContext);

    expect(result.status).toBe('completed');
    expect(result).toMatchObject({
      data: {
        isValid: true,
        targetType: 'document',
        checks: expect.arrayContaining([
          expect.objectContaining({ name: 'heading_structure', passed: true }),
          expect.objectContaining({ name: 'content_length', passed: true }),
          expect.objectContaining({ name: 'academic_references', passed: true })
        ])
      }
    });
  });
});
