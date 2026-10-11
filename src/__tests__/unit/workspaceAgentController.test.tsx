import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useWorkspaceAgentController } from '../../features/workspace/hooks/useWorkspaceAgentController';
import type { WorkspacePlan } from '../../../shared/contracts/workspace';

const plan = {
  id: 'plan-1', goal: 'Prepare a report', title: 'Report', status: 'approved',
  tasks: [{ id: 'task-1', title: 'Research', type: 'research', status: 'todo', dependsOn: [] }]
} as WorkspacePlan;

describe('useWorkspaceAgentController', () => {
  it('keeps a task run tied to the generated stream request identity', async () => {
    const activeSendOperationRef = { current: null as string | null };
    const taskRunRequestsRef = { current: new Map() };
    const taskGenerationRequestsRef = { current: new Map() };
    const sendMessage = vi.fn(() => {
      activeSendOperationRef.current = 'request-task-1';
      return true;
    });
    const startTaskExecution = vi.fn(async () => ({ plan, claimed: true }));
    const { result } = renderHook(() => useWorkspaceAgentController({
      plan,
      startTaskExecution,
      finishTaskExecution: vi.fn(async () => plan),
      reviewTask: vi.fn(async () => plan),
      linkTaskArtifact: vi.fn(async () => plan),
      transitionPlan: vi.fn(async () => plan),
      cancelTaskExecution: vi.fn(async () => plan),
      recoverTaskExecution: vi.fn(async () => plan),
      isStreaming: false,
      includeFilesInContext: true,
      selectedFileIds: ['file-1'],
      includeCanvasInContext: false,
      activeArtifact: null,
      canvasDraft: null,
      selectedModel: 'model-a',
      workspaceId: 'chat:workspace-a',
      activeSendOperationRef,
      taskGenerationRequestsRef,
      taskRunRequestsRef,
      sendMessage,
      abortStream: vi.fn(),
      showToast: vi.fn()
    }));

    await act(async () => { await result.current.runTask('task-1'); });

    expect(startTaskExecution).toHaveBeenCalledOnce();
    expect(sendMessage).toHaveBeenCalledOnce();
    expect(taskRunRequestsRef.current.get('request-task-1')).toMatchObject({ taskId: 'task-1', planId: 'plan-1', workspaceId: 'chat:workspace-a' });
  });

  it('does not resubmit provider work when the server reuses an execution claim', async () => {
    const activeSendOperationRef = { current: null as string | null };
    const sendMessage = vi.fn(() => true);
    const { result } = renderHook(() => useWorkspaceAgentController({
      plan,
      startTaskExecution: vi.fn(async () => ({ plan, claimed: false })),
      finishTaskExecution: vi.fn(async () => plan),
      reviewTask: vi.fn(async () => plan),
      linkTaskArtifact: vi.fn(async () => plan),
      transitionPlan: vi.fn(async () => plan),
      cancelTaskExecution: vi.fn(async () => plan),
      recoverTaskExecution: vi.fn(async () => plan),
      isStreaming: false,
      includeFilesInContext: false,
      selectedFileIds: [],
      includeCanvasInContext: false,
      activeArtifact: null,
      canvasDraft: null,
      selectedModel: 'model-a',
      workspaceId: 'chat:workspace-a',
      activeSendOperationRef,
      taskGenerationRequestsRef: { current: new Map() },
      taskRunRequestsRef: { current: new Map() },
      sendMessage,
      abortStream: vi.fn(),
      showToast: vi.fn()
    }));

    await act(async () => { await result.current.runTask('task-1'); });

    expect(sendMessage).not.toHaveBeenCalled();
  });
});
