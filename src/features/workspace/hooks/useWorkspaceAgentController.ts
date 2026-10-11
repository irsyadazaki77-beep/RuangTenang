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
  startTaskExecution: (planId: string, taskId: string, executionId: string, snapshot: NonNullable<WorkspacePlan['tasks'][number]['snapshot']>) => Promise<{ plan: WorkspacePlan; claimed: boolean }>;
  finishTaskExecution: (planId: string, taskId: string, executionId: string, result: { output?: string; sources?: WorkspacePlan['tasks'][number]['sources']; errorCode?: string }) => Promise<WorkspacePlan>;
  reviewTask: (planId: string, taskId: string, decision: 'accept' | 'reject') => Promise<WorkspacePlan>;
  linkTaskArtifact: (planId: string, taskId: string, executionId: string, artifactId: string) => Promise<WorkspacePlan>;
  transitionPlan: (planId: string, action: 'approve' | 'pause' | 'resume' | 'cancel' | 'complete') => Promise<WorkspacePlan>;
  cancelTaskExecution: (planId: string, taskId: string, executionId: string) => Promise<WorkspacePlan>;
  recoverTaskExecution: (planId: string, taskId: string, executionId: string) => Promise<WorkspacePlan>;
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

export function useWorkspaceAgentController(options: UseWorkspaceAgentControllerOptions) {
  const {
    plan, startTaskExecution, finishTaskExecution, reviewTask, linkTaskArtifact, transitionPlan, cancelTaskExecution, recoverTaskExecution,
    isStreaming, includeFilesInContext, selectedFileIds, includeCanvasInContext, activeArtifact, canvasDraft,
    workspaceInstructions, selectedModel, workspaceId, activeSendOperationRef, taskGenerationRequestsRef,
    taskRunRequestsRef, sendMessage, abortStream, showToast
  } = options;

  const runTask = useCallback(async (taskId: string, feedback?: string) => {
    const currentPlan = plan;
    const task = currentPlan?.tasks.find(item => item.id === taskId);
    if (!currentPlan || currentPlan.status !== 'approved' || !task || !['todo', 'failed', 'waiting_review', 'cancelled'].includes(task.status) || !task.dependsOn.every(id => currentPlan.tasks.find(dependency => dependency.id === id)?.status === 'done') || currentPlan.tasks.some(item => item.status === 'running') || isStreaming) return;
    const researchInstructions = task.type === 'research' ? '\nGunakan evidence pack pada konteks request saja. Tautkan klaim faktual dengan marker [cite:SRC_N] yang tersedia. Jangan membuat author, tahun, DOI, nomor halaman, atau bibliography yang tidak diberikan sumber. Jika bukti tidak cukup, nyatakan belum terverifikasi.' : '';
    const basePrompt = task.snapshot?.inputPrompt || `Kerjakan hanya langkah yang disetujui ini untuk tujuan “${currentPlan.goal}”.\nTask: ${task.title}\n${task.description || ''}${researchInstructions}\n\nBerikan hasil yang bisa ditinjau. Jangan menandai task lain selesai dan jangan mengubah Canvas secara langsung.`;
    const prompt = feedback ? `${basePrompt}\n\nMasukan user untuk revisi hasil: ${feedback}` : basePrompt;
    const executionId = crypto.randomUUID();
    const snapshot = task.snapshot
      ? { ...task.snapshot, inputPrompt: prompt.slice(0, 8000), modelId: task.modelId || task.snapshot.modelId, createdAt: new Date().toISOString() }
      : {
        inputPrompt: prompt.slice(0, 8000),
        contextSourceIds: (includeFilesInContext ? selectedFileIds : []).slice(0, 50),
        ...(includeCanvasInContext && activeArtifact ? { artifactContext: (canvasDraft?.artifactId === activeArtifact.id ? canvasDraft.content : activeArtifact.content).slice(0, 20000), artifactId: activeArtifact.id } : {}),
        ...(workspaceInstructions ? { workspaceInstructions } : {}),
        modelId: task.modelId || selectedModel,
        createdAt: new Date().toISOString()
      };
    try {
      const start = await startTaskExecution(currentPlan.id, task.id, executionId, snapshot);
      if (!start.claimed) {
        showToast('Eksekusi ini sudah diklaim. Hasilnya tetap mengikuti sesi yang sedang berjalan.', 'info');
        return;
      }
      const sent = sendMessage(prompt, undefined, undefined, { aiModel: snapshot.modelId, responseMode: 'Seimbang', responseStyle: 'Langkah demi langkah', taskCategory: task.type === 'coding' ? 'coding' : task.type === 'research' ? 'research' : 'structured_reasoning', isolatedTaskExecution: true, taskContextSourceIds: snapshot.contextSourceIds, taskArtifactContext: snapshot.artifactContext, taskWorkspaceInstructions: snapshot.workspaceInstructions });
      const requestId = activeSendOperationRef.current;
      if (!sent || !requestId) {
        await cancelTaskExecution(currentPlan.id, task.id, executionId);
        showToast('Task tidak dapat dijalankan saat ini.', 'info');
        return;
      }
      taskRunRequestsRef.current.set(requestId, { taskId: task.id, planId: currentPlan.id, executionId, workspaceId });
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Task gagal dimulai. Muat ulang status sebelum mencoba lagi.', 'error');
    }
  }, [activeArtifact, activeSendOperationRef, cancelTaskExecution, canvasDraft, includeCanvasInContext, includeFilesInContext, isStreaming, plan, selectedFileIds, selectedModel, sendMessage, showToast, startTaskExecution, taskRunRequestsRef, workspaceId, workspaceInstructions]);

  const acceptTaskReview = useCallback((taskId: string) => {
    if (!plan) return;
    void reviewTask(plan.id, taskId, 'accept').catch(error => showToast(error instanceof Error ? error.message : 'Hasil belum dapat diterima.', 'error'));
  }, [plan, reviewTask, showToast]);

  const rejectTaskReview = useCallback((taskId: string) => {
    if (!plan) return;
    void reviewTask(plan.id, taskId, 'reject').catch(error => showToast(error instanceof Error ? error.message : 'Hasil belum dapat ditolak.', 'error'));
  }, [plan, reviewTask, showToast]);

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
    void transitionPlan(plan.id, 'cancel').catch(error => showToast(error instanceof Error ? error.message : 'Plan gagal dibatalkan.', 'error'));
  }, [abortStream, activeSendOperationRef, isStreaming, plan, showToast, taskGenerationRequestsRef, taskRunRequestsRef, transitionPlan]);

  const completeWorkflow = useCallback(() => {
    if (plan && plan.tasks.length > 0 && plan.tasks.every(task => task.status === 'done')) void transitionPlan(plan.id, 'complete').catch(error => showToast(error instanceof Error ? error.message : 'Plan gagal diselesaikan.', 'error'));
  }, [plan, showToast, transitionPlan]);

  const pauseWorkflow = useCallback(() => { if (plan) void transitionPlan(plan.id, 'pause').catch(error => showToast(error instanceof Error ? error.message : 'Plan gagal dijeda.', 'error')); }, [plan, showToast, transitionPlan]);
  const resumeWorkflow = useCallback(() => { if (plan) void transitionPlan(plan.id, 'resume').catch(error => showToast(error instanceof Error ? error.message : 'Plan gagal dilanjutkan.', 'error')); }, [plan, showToast, transitionPlan]);
  const recoverTask = useCallback((taskId: string, executionId: string) => {
    if (plan) void recoverTaskExecution(plan.id, taskId, executionId).then(() => showToast('Eksekusi ditandai terputus. Task dapat dicoba ulang.', 'info')).catch(error => showToast(error instanceof Error ? error.message : 'Eksekusi belum dapat dipulihkan.', 'error'));
  }, [plan, recoverTaskExecution, showToast]);

  return { runTask, acceptTaskReview, rejectTaskReview, generateTasks, cancelWorkflow, completeWorkflow, pauseWorkflow, resumeWorkflow, recoverTask, finishTaskExecution, linkTaskArtifact };
}
