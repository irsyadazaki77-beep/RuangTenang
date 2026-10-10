import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import type { StoredAttachment } from '../../chat/types';
import type { WorkspaceArtifact, WorkspaceComposerConfig, WorkspaceRequestSnapshot } from '../types';
import type { WorkspacePlan } from '../../../../shared/contracts/workspace';

interface TaskRunRequest {
  taskId: string;
  planId: string;
  executionId: string;
  workspaceId?: string;
}

interface UseWorkspaceAgentControllerOptions {
  plan?: WorkspacePlan | null;
  planRef: MutableRefObject<WorkspacePlan | null | undefined>;
  updatePlan: (plan: WorkspacePlan) => Promise<WorkspacePlan>;
  startTaskExecution: (planId: string, taskId: string, executionId: string, snapshot: NonNullable<WorkspacePlan['tasks'][number]['snapshot']>) => Promise<WorkspacePlan>;
  isStreaming: boolean;
  includeFilesInContext: boolean;
  selectedFileIds: string[];
  includeCanvasInContext: boolean;
  activeArtifact: WorkspaceArtifact | null;
  canvasDraft: { artifactId: string; content: string } | null;
  workspaceInstructions?: string;
  selectedModel: string;
  workspaceId: string;
  activeSendOperationRef: MutableRefObject<string | null>;
  taskGenerationRequestsRef: MutableRefObject<Map<string, string>>;
  taskRunRequestsRef: MutableRefObject<Map<string, TaskRunRequest>>;
  sendMessage: (prompt: string, customSystemNote?: string, attachments?: StoredAttachment[], config?: WorkspaceComposerConfig, snapshot?: WorkspaceRequestSnapshot) => boolean;
  abortStream: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export function useWorkspaceAgentController({
  plan,
  planRef,
  updatePlan,
  startTaskExecution,
  isStreaming,
  includeFilesInContext,
  selectedFileIds,
  includeCanvasInContext,
  activeArtifact,
  canvasDraft,
  workspaceInstructions,
  selectedModel,
  workspaceId,
  activeSendOperationRef,
  taskGenerationRequestsRef,
  taskRunRequestsRef,
  sendMessage,
  abortStream,
  showToast
}: UseWorkspaceAgentControllerOptions) {
  const runTask = useCallback(async (taskId: string, feedback?: string) => {
    const currentPlan = plan;
    const task = currentPlan?.tasks.find(item => item.id === taskId);
    if (!currentPlan || currentPlan.status !== 'approved' || !task || !['todo', 'failed', 'waiting_review'].includes(task.status) || !task.dependsOn.every(id => currentPlan.tasks.find(dependency => dependency.id === id)?.status === 'done') || currentPlan.tasks.some(item => item.status === 'running') || isStreaming) return;
    const researchInstructions = task.type === 'research' ? '\nGunakan evidence pack pada konteks request saja. Tautkan klaim faktual dengan marker [cite:SRC_N] yang tersedia. Jangan membuat author, tahun, DOI, nomor halaman, atau bibliography yang tidak diberikan sumber. Jika bukti tidak cukup, nyatakan belum terverifikasi.' : '';
    const basePrompt = task.snapshot?.inputPrompt || `Kerjakan hanya langkah yang disetujui ini untuk tujuan “${currentPlan.goal}”.\nTask: ${task.title}\n${task.description || ''}${researchInstructions}\n\nBerikan hasil yang bisa ditinjau. Jangan menandai task lain selesai dan jangan mengubah Canvas secara langsung.`;
    const prompt = feedback ? `${basePrompt}\n\nMasukan user untuk revisi hasil: ${feedback}` : basePrompt;
    const executionId = crypto.randomUUID();
    const snapshot = task.snapshot
      ? { ...task.snapshot, inputPrompt: prompt.slice(0, 8000), modelId: task.modelId || task.snapshot.modelId, createdAt: feedback ? new Date().toISOString() : task.snapshot.createdAt }
      : { inputPrompt: prompt.slice(0, 8000), contextSourceIds: (includeFilesInContext ? selectedFileIds : []).slice(0, 50), ...(includeCanvasInContext && activeArtifact ? { artifactContext: (canvasDraft?.artifactId === activeArtifact.id ? canvasDraft.content : activeArtifact.content).slice(0, 20000) } : {}), ...(workspaceInstructions ? { workspaceInstructions } : {}), modelId: task.modelId || selectedModel, createdAt: new Date().toISOString() };
    try {
      const runningPlan = await startTaskExecution(currentPlan.id, task.id, executionId, snapshot);
      const sent = sendMessage(prompt, undefined, undefined, { aiModel: snapshot.modelId, responseMode: 'Seimbang', responseStyle: 'Langkah demi langkah', taskCategory: task.type === 'coding' ? 'coding' : task.type === 'research' ? 'research' : 'structured_reasoning', isolatedTaskExecution: true, taskContextSourceIds: snapshot.contextSourceIds, taskArtifactContext: snapshot.artifactContext, taskWorkspaceInstructions: snapshot.workspaceInstructions });
      const requestId = activeSendOperationRef.current;
      if (!sent || !requestId) {
        const cancelledAt = new Date().toISOString();
        await updatePlan({ ...runningPlan, status: 'approved', tasks: runningPlan.tasks.map(item => item.id === task.id ? { ...item, status: task.status, executionHistory: (item.executionHistory || []).map(attempt => attempt.executionId === executionId ? { ...attempt, status: 'cancelled', completedAt: cancelledAt } : attempt) } : item), updatedAt: cancelledAt });
        showToast('Task tidak dapat dijalankan saat ini.', 'info');
        return;
      }
      taskRunRequestsRef.current.set(requestId, { taskId: task.id, planId: currentPlan.id, executionId, workspaceId });
    } catch (error) {
      const latest = planRef.current;
      if (latest?.id === currentPlan.id) void updatePlan({ ...latest, status: 'approved', tasks: latest.tasks.map(item => item.id === task.id && item.executionId === executionId ? { ...item, status: 'todo', updatedAt: new Date().toISOString() } : item) }).catch(() => undefined);
      showToast(error instanceof Error ? error.message : 'Task gagal dijalankan.', 'error');
    }
  }, [activeArtifact, activeSendOperationRef, canvasDraft, includeCanvasInContext, includeFilesInContext, isStreaming, plan, planRef, selectedFileIds, selectedModel, sendMessage, showToast, startTaskExecution, taskRunRequestsRef, updatePlan, workspaceId, workspaceInstructions]);

  const acceptTaskReview = useCallback((taskId: string) => {
    if (!plan) return;
    void updatePlan({ ...plan, tasks: plan.tasks.map(task => task.id === taskId && task.status === 'waiting_review' ? { ...task, status: 'done', updatedAt: new Date().toISOString() } : task), updatedAt: new Date().toISOString() }).catch(error => showToast(error instanceof Error ? error.message : 'Hasil belum dapat diterima.', 'error'));
  }, [plan, showToast, updatePlan]);

  const rejectTaskReview = useCallback((taskId: string) => {
    if (!plan) return;
    void updatePlan({ ...plan, tasks: plan.tasks.map(task => task.id === taskId && task.status === 'waiting_review' ? { ...task, status: 'todo', updatedAt: new Date().toISOString() } : task), updatedAt: new Date().toISOString() }).catch(error => showToast(error instanceof Error ? error.message : 'Hasil belum dapat ditolak.', 'error'));
  }, [plan, showToast, updatePlan]);

  const generateTasks = useCallback((goal: string) => {
    const sent = sendMessage(`Rencanakan workflow untuk tujuan berikut berdasarkan konteks Workspace yang relevan. Buat 3 sampai 8 task yang actionable (maksimal 12), dengan urutan dependency yang aman. Jangan menjalankan task. Balas hanya JSON valid dengan bentuk: {"title":"judul plan","tasks":[{"title":"...","description":"...","type":"analysis|writing|research|coding|review|transform","dependsOn":[]}]} . Nilai dependsOn adalah array nomor task 1-based yang harus selesai lebih dulu. Tujuan: ${goal}`, undefined, undefined, { aiModel: selectedModel, responseMode: 'Seimbang', responseStyle: 'Langkah demi langkah', taskCategory: 'structured_reasoning' });
    const requestId = activeSendOperationRef.current;
    if (sent && requestId) taskGenerationRequestsRef.current.set(requestId, goal);
  }, [activeSendOperationRef, selectedModel, sendMessage, taskGenerationRequestsRef]);

  const cancelWorkflow = useCallback(() => {
    if (!plan) return;
    if (plan.tasks.some(task => task.status === 'running') && isStreaming) {
      const requestId = activeSendOperationRef.current;
      if (requestId) { taskRunRequestsRef.current.delete(requestId); taskGenerationRequestsRef.current.delete(requestId); }
      abortStream();
    }
    const cancelledAt = new Date().toISOString();
    void updatePlan({ ...plan, status: 'cancelled', tasks: plan.tasks.map(task => task.status === 'running' ? { ...task, status: 'todo', executionHistory: (task.executionHistory || []).map(attempt => attempt.status === 'running' ? { ...attempt, status: 'cancelled', completedAt: cancelledAt } : attempt), updatedAt: cancelledAt } : task), updatedAt: cancelledAt }).catch(error => showToast(error instanceof Error ? error.message : 'Plan gagal dibatalkan.', 'error'));
  }, [abortStream, activeSendOperationRef, isStreaming, plan, showToast, taskGenerationRequestsRef, taskRunRequestsRef, updatePlan]);

  const completeWorkflow = useCallback(() => {
    if (plan && plan.tasks.length > 0 && plan.tasks.every(task => task.status === 'done')) void updatePlan({ ...plan, status: 'completed', updatedAt: new Date().toISOString() }).catch(error => showToast(error instanceof Error ? error.message : 'Plan gagal diselesaikan.', 'error'));
  }, [plan, showToast, updatePlan]);

  return { runTask, acceptTaskReview, rejectTaskReview, generateTasks, cancelWorkflow, completeWorkflow };
}
