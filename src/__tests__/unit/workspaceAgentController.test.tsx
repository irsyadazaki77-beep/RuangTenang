import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useWorkspaceAgentController } from '../../features/workspace/hooks/useWorkspaceAgentController';
import type { WorkspacePlan } from '../../../shared/contracts/workspace';
import type { AgentExecutionResult } from '../../../shared/contracts/agent';

const plan = {
  id: 'plan-1', goal: 'Prepare a report', title: 'Report', status: 'approved',
  tasks: [{ id: 'task-1', title: 'Research', type: 'research', status: 'todo', dependsOn: [] }]
} as WorkspacePlan;

const completed: AgentExecutionResult = {
  executionId: 'execution-1', status: 'completed', output: 'Report based on retrieved evidence.', sources: [],
  modelId: 'gemini-3.8-flash', steps: 2, toolCalls: 1, events: [], estimatedInputTokens: 1200, estimatedOutputTokens: 180
};

describe('useWorkspaceAgentController', () => {
  it('notifies Canvas only after the server confirms proposal acceptance', async () => {
    const proposal = { title: 'Evidence report', type: 'DOCUMENT' as const, content: 'Verified draft' };
    const waitingPlan = { ...plan, tasks: [{ ...plan.tasks[0], status: 'waiting_review', artifactProposal: proposal }] } as WorkspacePlan;
    const acceptedTask = { ...waitingPlan.tasks[0], status: 'done', outputArtifactId: 'agent-artifact', artifactProposal: proposal };
    const acceptedPlan = { ...waitingPlan, tasks: [acceptedTask] } as WorkspacePlan;
    const reviewTask = vi.fn(async () => acceptedPlan);
    const onTaskAccepted = vi.fn();
    const { result } = renderHook(() => useWorkspaceAgentController({
      plan: waitingPlan,
      startTaskExecution: vi.fn(async () => ({ plan: waitingPlan, claimed: true })),
      executeAgentTask: vi.fn(async () => ({ execution: completed, plan: waitingPlan })),
      reviewTask,
      transitionPlan: vi.fn(async () => waitingPlan),
      recoverTaskExecution: vi.fn(async () => waitingPlan),
      isStreaming: false,
      includeFilesInContext: false,
      selectedFileIds: [],
      includeCanvasInContext: false,
      activeArtifact: null,
      selectedModel: 'kerja-santai',
      workspaceId: 'chat:workspace-a',
      activeSendOperationRef: { current: null },
      taskGenerationRequestsRef: { current: new Map() },
      sendMessage: vi.fn(() => true),
      abortStream: vi.fn(),
      onAgentTaskCompleted: vi.fn(async () => undefined),
      onTaskAccepted,
      showToast: vi.fn()
    }));

    await act(async () => { result.current.acceptTaskReview('task-1'); await Promise.resolve(); });

    expect(reviewTask).toHaveBeenCalledWith('plan-1', 'task-1', 'accept');
    expect(onTaskAccepted).toHaveBeenCalledWith(acceptedTask);
  });

  it('runs task execution through the server Agent endpoint and returns its actual result', async () => {
    const activeSendOperationRef = { current: null as string | null };
    const taskGenerationRequestsRef = { current: new Map() };
    const startTaskExecution = vi.fn(async () => ({ plan, claimed: true }));
    const executeAgentTask = vi.fn(async (_planId: string, _taskId: string, _executionId: string, _signal?: AbortSignal) => ({ execution: completed, plan }));
    const onAgentTaskCompleted = vi.fn(async () => undefined);
    const sendMessage = vi.fn(() => true);
    const { result } = renderHook(() => useWorkspaceAgentController({
      plan,
      startTaskExecution,
      executeAgentTask,
      reviewTask: vi.fn(async () => plan),
      transitionPlan: vi.fn(async () => plan),
      recoverTaskExecution: vi.fn(async () => plan),
      isStreaming: false,
      includeFilesInContext: true,
      selectedFileIds: ['file-1'],
      includeCanvasInContext: false,
      activeArtifact: null,
      selectedModel: 'gemini-3.8-flash',
      workspaceId: 'chat:workspace-a',
      activeSendOperationRef,
      taskGenerationRequestsRef,
      sendMessage,
      abortStream: vi.fn(),
      onAgentTaskCompleted,
      showToast: vi.fn()
    }));

    await act(async () => { await result.current.runTask('task-1'); });

    expect(startTaskExecution).toHaveBeenCalledOnce();
    expect(executeAgentTask).toHaveBeenCalledOnce();
    expect(executeAgentTask.mock.calls[0][0]).toBe('plan-1');
    expect(executeAgentTask.mock.calls[0][1]).toBe('task-1');
    expect(onAgentTaskCompleted).toHaveBeenCalledWith(completed, { workspaceId: 'chat:workspace-a', planId: 'plan-1', taskId: 'task-1' });
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('does not start model execution when an existing execution claim was reused', async () => {
    const activeSendOperationRef = { current: null as string | null };
    const executeAgentTask = vi.fn();
    const sendMessage = vi.fn(() => true);
    const { result } = renderHook(() => useWorkspaceAgentController({
      plan,
      startTaskExecution: vi.fn(async () => ({ plan, claimed: false })),
      executeAgentTask,
      reviewTask: vi.fn(async () => plan),
      transitionPlan: vi.fn(async () => plan),
      recoverTaskExecution: vi.fn(async () => plan),
      isStreaming: false,
      includeFilesInContext: false,
      selectedFileIds: [],
      includeCanvasInContext: false,
      activeArtifact: null,
      selectedModel: 'gemini-3.8-flash',
      workspaceId: 'chat:workspace-a',
      activeSendOperationRef,
      taskGenerationRequestsRef: { current: new Map() },
      sendMessage,
      abortStream: vi.fn(),
      onAgentTaskCompleted: vi.fn(async () => undefined),
      showToast: vi.fn()
    }));

    await act(async () => { await result.current.runTask('task-1'); });

    expect(executeAgentTask).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('pauses continuous workflow execution at human review gate', async () => {
    const planWithReview = {
      id: 'plan-review',
      goal: 'Write draft',
      title: 'Drafting Workflow',
      status: 'approved',
      tasks: [
        { id: 'task-1', title: 'Analysis', type: 'analysis', status: 'waiting_review', dependsOn: [] },
        { id: 'task-2', title: 'Draft', type: 'writing', status: 'todo', dependsOn: ['task-1'] }
      ]
    } as WorkspacePlan;
    const showToast = vi.fn();
    const executeAgentTask = vi.fn();
    const { result } = renderHook(() => useWorkspaceAgentController({
      plan: planWithReview,
      startTaskExecution: vi.fn(async () => ({ plan: planWithReview, claimed: true })),
      executeAgentTask,
      reviewTask: vi.fn(async () => planWithReview),
      transitionPlan: vi.fn(async () => planWithReview),
      recoverTaskExecution: vi.fn(async () => planWithReview),
      isStreaming: false,
      includeFilesInContext: false,
      selectedFileIds: [],
      includeCanvasInContext: false,
      activeArtifact: null,
      selectedModel: 'gemini-3.8-flash',
      workspaceId: 'chat:workspace-a',
      activeSendOperationRef: { current: null },
      taskGenerationRequestsRef: { current: new Map() },
      sendMessage: vi.fn(() => true),
      abortStream: vi.fn(),
      onAgentTaskCompleted: vi.fn(async () => undefined),
      showToast
    }));

    await act(async () => {
      result.current.startContinuousWorkflow();
    });

    // Since task-1 is waiting_review, continuous loop should stop and notify user to review
    expect(result.current.isContinuousRunning).toBe(false);
    expect(executeAgentTask).not.toHaveBeenCalled();
  });

  it('allows stopping continuous workflow execution', async () => {
    const showToast = vi.fn();
    const { result } = renderHook(() => useWorkspaceAgentController({
      plan,
      startTaskExecution: vi.fn(async () => ({ plan, claimed: true })),
      executeAgentTask: vi.fn(async () => ({ execution: completed, plan })),
      reviewTask: vi.fn(async () => plan),
      transitionPlan: vi.fn(async () => plan),
      recoverTaskExecution: vi.fn(async () => plan),
      isStreaming: false,
      includeFilesInContext: false,
      selectedFileIds: [],
      includeCanvasInContext: false,
      activeArtifact: null,
      selectedModel: 'gemini-3.8-flash',
      workspaceId: 'chat:workspace-a',
      activeSendOperationRef: { current: null },
      taskGenerationRequestsRef: { current: new Map() },
      sendMessage: vi.fn(() => true),
      abortStream: vi.fn(),
      onAgentTaskCompleted: vi.fn(async () => undefined),
      showToast
    }));

    await act(async () => {
      result.current.stopContinuousWorkflow();
    });

    expect(result.current.isContinuousRunning).toBe(false);
  });
});
