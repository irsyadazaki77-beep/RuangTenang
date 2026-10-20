import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkspaceTools } from '../../features/workspace/hooks/useWorkspaceTools';
import { WorkspaceToolExecutor } from '../../features/workspace/tools/toolExecutor';
import { WorkspaceToolRegistry } from '../../features/workspace/tools/toolRegistry';
import type { WorkspaceArtifact } from '../../features/workspace/types';

const { showToastMock } = vi.hoisted(() => ({ showToastMock: vi.fn() }));

vi.mock('../../components/Toast', () => ({
  useToast: () => ({ showToast: showToastMock })
}));

const artifact: WorkspaceArtifact = {
  id: 'artifact-a',
  title: 'Draft',
  type: 'DOCUMENT',
  content: 'Original document text.',
  version: 2,
  updatedAt: '2026-10-17T00:00:00.000Z',
  persistenceStatus: 'persistent'
};

function makeOptions(overrides: Partial<Parameters<typeof useWorkspaceTools>[0]> = {}) {
  return {
    activeArtifact: artifact,
    selectedModel: 'kerja-santai',
    presetId: 'academic-writing',
    chatId: 'chat-a',
    onRequestAiExecution: vi.fn(() => true),
    onRequestRevision: vi.fn(),
    onUpdateArtifactContent: vi.fn(async (content, target) => ({ ...target, content, persistenceStatus: 'persistent' as const })),
    ...overrides
  };
}

describe('useWorkspaceTools', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('routes artifact update tools through the revision review flow', async () => {
    const options = makeOptions({ selection: { artifactId: artifact.id, text: 'Selected passage.' } });
    const { result } = renderHook(() => useWorkspaceTools(options));
    const tool = WorkspaceToolRegistry.getTool('document_grammar_spok')!;

    act(() => result.current.selectWorkspaceTool(tool, artifact));
    expect(result.current.pendingTool?.tool.id).toBe(tool.id);
    await act(async () => {
      result.current.executePendingTool({ focus: 'formalitas' });
      await Promise.resolve();
    });

    expect(options.onRequestRevision).toHaveBeenCalledWith(expect.stringContaining('Selected passage.'), artifact);
    expect(options.onRequestAiExecution).not.toHaveBeenCalled();
    expect(result.current.pendingTool).toBeNull();
  });

  it('routes text tools through the existing Workspace chat stream', () => {
    const options = makeOptions();
    const { result } = renderHook(() => useWorkspaceTools(options));
    const tool = WorkspaceToolRegistry.getTool('research_summarize_keypoints')!;

    act(() => result.current.selectWorkspaceTool(tool, artifact));

    expect(options.onRequestAiExecution).toHaveBeenCalledWith(expect.stringContaining(artifact.content), tool);
    expect(options.onRequestRevision).not.toHaveBeenCalled();
  });

  it('saves client utility output through the artifact persistence callback', async () => {
    const executeClientUtility = vi.spyOn(WorkspaceToolExecutor, 'executeClientUtility').mockResolvedValue({
      success: true,
      toolId: 'academic_paraphrase',
      outputType: 'ARTIFACT_UPDATE',
      proposedContent: 'Revised academic text.'
    });
    const options = makeOptions();
    const { result } = renderHook(() => useWorkspaceTools(options));
    const tool = WorkspaceToolRegistry.getTool('academic_paraphrase')!;

    act(() => result.current.selectWorkspaceTool(tool, artifact));
    await act(async () => {
      result.current.executePendingTool({ style: 'KONSERVATIF' });
      await Promise.resolve();
    });

    expect(executeClientUtility).toHaveBeenCalledWith(tool, expect.objectContaining({
      context: expect.objectContaining({ chatId: 'chat-a', selectedModel: 'kerja-santai', presetId: 'academic-writing' })
    }));
    expect(options.onUpdateArtifactContent).toHaveBeenCalledWith('Revised academic text.', artifact);
    expect(showToastMock).toHaveBeenCalledWith(expect.stringContaining('berhasil diterapkan'), 'success');
  });
});
