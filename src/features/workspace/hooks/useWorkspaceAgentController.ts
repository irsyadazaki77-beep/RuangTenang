import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { StoredAttachment } from '../../chat/types';
import type { WorkspaceArtifact, WorkspaceComposerConfig, WorkspaceRequestSnapshot } from '../types';
import type { WorkspacePlan } from '../../../../shared/contracts/workspace';
import type { AgentExecutionResult } from '../../../../shared/contracts/agent';
import { AUTO_ROUTING_MODEL_ID, isKerjaProfile } from '../../../lib/aiModels';
import { migrateLegacyWorkspaceModelToProfile } from '../utils/workspaceModelPreference';

interface UseWorkspaceAgentControllerOptions {
  plan?: WorkspacePlan | null;
  startTaskExecution: (planId: string, taskId: string, executionId: string, snapshot: NonNullable<WorkspacePlan['tasks'][number]['snapshot']>) => Promise<{ plan: WorkspacePlan; claimed: boolean }>;
  executeAgentTask: (planId: string, taskId: string, executionId: string, signal?: AbortSignal) => Promise<{ execution: AgentExecutionResult; plan: WorkspacePlan }>;
  reviewTask: (planId: string, taskId: string, decision: 'accept' | 'reject') => Promise<WorkspacePlan>;
  transitionPlan: (planId: string, action: 'approve' | 'pause' | 'resume' | 'cancel' | 'complete') => Promise<WorkspacePlan>;
  cancelTaskExecution?: (planId: string, taskId: string, executionId: string) => Promise<WorkspacePlan>;
  recoverTaskExecution: (planId: string, taskId: string, executionId: string) => Promise<WorkspacePlan>;
  refreshWorkspace?: () => Promise<unknown>;
  isStreaming: boolean;
  includeFilesInContext: boolean;
  selectedFileIds: string[];
  includeCanvasInContext: boolean;
  activeArtifact: WorkspaceArtifact | null;
  workspaceInstructions?: string;
  selectedModel: string;
  allowExternalSearch?: boolean;
  workspaceId: string;
  activeSendOperationRef: MutableRefObject<string | null>;
  taskGenerationRequestsRef: MutableRefObject<Map<string, string>>;
  sendMessage: (prompt: string, customSystemNote?: string, attachments?: StoredAttachment[], config?: WorkspaceComposerConfig, snapshot?: WorkspaceRequestSnapshot) => boolean;
  abortStream: () => void;
  onAgentTaskCompleted: (result: AgentExecutionResult, identity: { workspaceId: string; planId: string; taskId: string }) => Promise<void>;
  onTaskAccepted?: (task: WorkspacePlan['tasks'][number]) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export function useWorkspaceAgentController(options: UseWorkspaceAgentControllerOptions) {
  const {
    plan, startTaskExecution, executeAgentTask, reviewTask, transitionPlan, cancelTaskExecution, recoverTaskExecution, refreshWorkspace,
    isStreaming, includeFilesInContext, selectedFileIds, includeCanvasInContext, activeArtifact,
    workspaceInstructions, selectedModel, allowExternalSearch = false, workspaceId, activeSendOperationRef, taskGenerationRequestsRef,
    sendMessage, abortStream, onAgentTaskCompleted, onTaskAccepted, showToast
  } = options;
  const [isAgentExecuting, setIsAgentExecuting] = useState(false);
  const [isStoppingTask, setIsStoppingTask] = useState(false);
  const stoppingExecutionRef = useRef<string | null>(null);
  const activeAgentExecutionRef = useRef<{ executionId: string; planId: string; taskId: string; workspaceId: string; controller: AbortController } | null>(null);
  useEffect(() => () => {
    activeAgentExecutionRef.current?.controller.abort();
  }, [workspaceId]);

  const reportWorkflowFailure = useCallback(async (error: unknown, fallback: string) => {
    try { await refreshWorkspace?.(); } catch { /* Keep the original action error visible. */ }
    showToast(error instanceof Error ? error.message : fallback, 'error');
  }, [refreshWorkspace, showToast]);

  const [isContinuousRunning, setIsContinuousRunning] = useState(false);
  const isContinuousRunningRef = useRef(false);
  isContinuousRunningRef.current = isContinuousRunning;

  const runTask = useCallback(async (taskId: string, feedback?: string): Promise<boolean> => {
    const currentPlan = plan;
    const task = currentPlan?.tasks.find(item => item.id === taskId);
    if (!currentPlan || currentPlan.status !== 'approved' || !task || !['todo', 'failed', 'waiting_review', 'cancelled'].includes(task.status) || !task.dependsOn.every(id => currentPlan.tasks.find(dependency => dependency.id === id)?.status === 'done') || currentPlan.tasks.some(item => item.status === 'running') || isStreaming) return false;
    if (activeAgentExecutionRef.current) return false;
    const researchInstructions = task.type === 'research'
      ? '\nGunakan bukti dari dokumen yang dipilih dan hanya tool yang tersedia dalam konteks task. Ikuti workflow riset bukti: Plan → Search → Read → Analyze → Cross-Check → Synthesize. Kutip hanya marker sumber [cite:...] yang benar-benar diberikan oleh tool. Sertakan URL atau nomor halaman/bagian sumber yang nyata. Jangan mengarang author, tahun, DOI, nomor halaman, atau bibliografi fiktif. Jika bukti tidak cukup, nyatakan bukti belum mencukupi. Buat artifact proposal terstruktur (misal DOCUMENT atau TABLE) untuk hasil riset komprehensif.'
      : '';
    const basePrompt = task.snapshot?.inputPrompt || `Kerjakan hanya langkah yang disetujui ini untuk tujuan “${currentPlan.goal}”.\nTask: ${task.title}\n${task.description || ''}${researchInstructions}\n\nBerikan hasil yang bisa ditinjau. Jangan menandai task lain selesai atau mengubah artifact yang ada. Jika membuat artifact, kembalikan sebagai proposal baru.`;
    const prompt = feedback ? `${basePrompt}\n\nMasukan user untuk revisi hasil: ${feedback}` : basePrompt;
    const executionId = crypto.randomUUID();
    let controller: AbortController | undefined;
    const chosenModel = task.modelId || task.snapshot?.modelId || selectedModel;
    const modelProfile = chosenModel === AUTO_ROUTING_MODEL_ID || chosenModel === 'auto'
      ? 'auto'
      : isKerjaProfile(chosenModel) ? chosenModel : migrateLegacyWorkspaceModelToProfile(chosenModel);
    const snapshot = task.snapshot
      ? { inputPrompt: prompt.slice(0, 8000), contextSourceIds: task.snapshot.contextSourceIds, ...(task.snapshot.artifactId ? { artifactId: task.snapshot.artifactId } : {}), ...(task.snapshot.workspaceInstructions ? { workspaceInstructions: task.snapshot.workspaceInstructions } : {}), allowExternalSearch: task.type === 'research' && allowExternalSearch, modelId: modelProfile, createdAt: new Date().toISOString() }
      : {
        inputPrompt: prompt.slice(0, 8000),
        contextSourceIds: (includeFilesInContext ? selectedFileIds : []).slice(0, 50),
        ...(includeCanvasInContext && activeArtifact ? { artifactId: activeArtifact.id } : {}),
        ...(workspaceInstructions ? { workspaceInstructions } : {}),
        allowExternalSearch: task.type === 'research' && allowExternalSearch,
        modelId: modelProfile,
        createdAt: new Date().toISOString()
      };
    try {
      const start = await startTaskExecution(currentPlan.id, task.id, executionId, snapshot);
      if (!start.claimed) {
        showToast('Eksekusi ini sudah diklaim. Hasilnya tetap mengikuti sesi yang sedang berjalan.', 'info');
        return false;
      }
      controller = new AbortController();
      activeAgentExecutionRef.current = { executionId, planId: currentPlan.id, taskId: task.id, workspaceId, controller };
      setIsAgentExecuting(true);
      const result = await executeAgentTask(currentPlan.id, task.id, executionId, controller.signal);
      if (activeAgentExecutionRef.current?.executionId !== executionId || currentPlan.id !== result.plan.id) return false;
      if (result.execution.status === 'completed') {
        await onAgentTaskCompleted(result.execution, { workspaceId, planId: currentPlan.id, taskId: task.id });
        return true;
      } else if (result.execution.status === 'failed') {
        showToast(result.execution.error?.message || 'Agent tidak dapat menyelesaikan task ini.', 'error');
        setIsContinuousRunning(false);
        return false;
      }
      return false;
    } catch (error) {
      if (!controller?.signal.aborted && !(error instanceof Error && error.name === 'AbortError')) {
        await reportWorkflowFailure(error, 'Task gagal dimulai. Muat ulang status sebelum mencoba lagi.');
      }
      setIsContinuousRunning(false);
      return false;
    } finally {
      if (activeAgentExecutionRef.current?.executionId === executionId) {
        activeAgentExecutionRef.current = null;
        setIsAgentExecuting(false);
      }
    }
  }, [activeArtifact, allowExternalSearch, executeAgentTask, includeCanvasInContext, includeFilesInContext, isStreaming, onAgentTaskCompleted, plan, refreshWorkspace, reportWorkflowFailure, selectedFileIds, selectedModel, showToast, startTaskExecution, workspaceId, workspaceInstructions]);

  // Check and run next ready task if in continuous auto mode and not waiting for review
  useEffect(() => {
    if (!isContinuousRunning || isAgentExecuting || !plan || plan.status !== 'approved') return;

    // Check if any task is waiting for user review (Human Approval Gate)
    const hasWaitingReview = plan.tasks.some(task => task.status === 'waiting_review');
    if (hasWaitingReview) {
      // Pause automated loop at human review gate to ensure safety
      setIsContinuousRunning(false);
      showToast('Tahap selesai. Silakan periksa hasil dan berikan persetujuan untuk melanjutkan.', 'info');
      return;
    }

    // Check if all tasks are completed
    if (plan.tasks.length > 0 && plan.tasks.every(task => task.status === 'done')) {
      setIsContinuousRunning(false);
      showToast('Seluruh tahapan rencana telah selesai dijalankan.', 'success');
      return;
    }

    // Find next runnable task whose dependencies are all satisfied
    const nextTask = plan.tasks.find(
      task => task.status === 'todo' && task.dependsOn.every(id => plan.tasks.find(d => d.id === id)?.status === 'done')
    );

    if (nextTask) {
      void runTask(nextTask.id);
    } else {
      // No runnable task found (either blocked by failed tasks or circular deps)
      const hasFailed = plan.tasks.some(task => task.status === 'failed');
      if (hasFailed) {
        setIsContinuousRunning(false);
        showToast('Alur kerja terhenti karena ada task yang gagal. Silakan tinjau atau coba lagi.', 'warning');
      }
    }
  }, [isContinuousRunning, isAgentExecuting, plan, runTask, showToast]);

  const startContinuousWorkflow = useCallback(() => {
    if (!plan || plan.status !== 'approved') return;
    const nextTask = plan.tasks.find(
      task => task.status === 'todo' && task.dependsOn.every(id => plan.tasks.find(d => d.id === id)?.status === 'done')
    );
    if (!nextTask) {
      showToast('Tidak ada task berikutnya yang siap dijalankan.', 'info');
      return;
    }
    setIsContinuousRunning(true);
    void runTask(nextTask.id);
  }, [plan, runTask, showToast]);

  const stopContinuousWorkflow = useCallback(() => {
    setIsContinuousRunning(false);
  }, []);

  const stopTaskExecution = useCallback(() => {
    setIsContinuousRunning(false);
    const activeExecution = activeAgentExecutionRef.current;
    const matchingActiveExecution = activeExecution && activeExecution.workspaceId === workspaceId && activeExecution.planId === plan?.id
      ? activeExecution
      : null;
    const task = matchingActiveExecution
      ? plan?.tasks.find(item => item.id === matchingActiveExecution.taskId)
      : plan?.tasks.find(item => item.status === 'running' && item.executionId);
    const executionId = matchingActiveExecution?.executionId || task?.executionId;
    const planId = matchingActiveExecution?.planId || plan?.id;
    const taskId = matchingActiveExecution?.taskId || task?.id;

    if (!planId || !taskId || !executionId) {
      if (isStreaming) abortStream();
      matchingActiveExecution?.controller.abort();
      showToast('Tidak ada task aktif yang bisa dihentikan.', 'info');
      return;
    }
    if (!cancelTaskExecution) {
      if (isStreaming) abortStream();
      matchingActiveExecution?.controller.abort();
      showToast('Permintaan berhenti dikirim ke sesi ini, tetapi status task server belum dapat diperbarui.', 'warning');
      return;
    }
    if (stoppingExecutionRef.current === executionId) return;
    stoppingExecutionRef.current = executionId;
    setIsStoppingTask(true);
    void cancelTaskExecution(planId, taskId, executionId)
      .then(() => {
        if (isStreaming) abortStream();
        matchingActiveExecution?.controller.abort();
        showToast('Task dihentikan. Kamu bisa menjalankannya lagi.', 'info');
      })
      .catch(error => { void reportWorkflowFailure(error, 'Task belum dapat dihentikan.'); })
      .finally(() => {
        stoppingExecutionRef.current = null;
        setIsStoppingTask(false);
      });
  }, [abortStream, cancelTaskExecution, isStreaming, plan, reportWorkflowFailure, showToast, workspaceId]);

  const acceptTaskReview = useCallback((taskId: string) => {
    if (!plan) return;
    void reviewTask(plan.id, taskId, 'accept')
      .then(updatedPlan => {
        const acceptedTask = updatedPlan.tasks.find(task => task.id === taskId);
        if (acceptedTask) onTaskAccepted?.(acceptedTask);
        showToast('Hasil task diterima.', 'success');
      })
      .catch(error => { void reportWorkflowFailure(error, 'Hasil belum dapat diterima.'); });
  }, [onTaskAccepted, plan, reportWorkflowFailure, reviewTask, showToast]);

  const rejectTaskReview = useCallback((taskId: string) => {
    if (!plan) return;
    setIsContinuousRunning(false);
    void reviewTask(plan.id, taskId, 'reject')
      .then(() => {
        showToast('Hasil task ditolak dan siap direvisi.', 'info');
      })
      .catch(error => { void reportWorkflowFailure(error, 'Hasil belum dapat ditolak.'); });
  }, [plan, reportWorkflowFailure, reviewTask, showToast]);

  const generateTasks = useCallback((goal: string) => {
    const sent = sendMessage(`Rencanakan workflow untuk tujuan berikut berdasarkan konteks Workspace yang relevan. Buat 3 sampai 8 task yang actionable (maksimal 12), dengan urutan dependency yang aman. Jangan menjalankan task. Balas hanya JSON valid dengan bentuk: {"title":"judul plan","tasks":[{"title":"...","description":"...","type":"analysis|writing|research|coding|review|transform","dependsOn":[]}]} . Nilai dependsOn adalah array nomor task 1-based yang harus selesai lebih dulu. Tujuan: ${goal}`, undefined, undefined, { aiModel: selectedModel, responseMode: 'Seimbang', responseStyle: 'Langkah demi langkah', taskCategory: 'structured_reasoning' });
    const requestId = activeSendOperationRef.current;
    if (sent && requestId) taskGenerationRequestsRef.current.set(requestId, goal);
  }, [activeSendOperationRef, selectedModel, sendMessage, taskGenerationRequestsRef]);

  const cancelWorkflow = useCallback(() => {
    setIsContinuousRunning(false);
    if (!plan) return;
    if (activeAgentExecutionRef.current) activeAgentExecutionRef.current.controller.abort();
    if (plan.tasks.some(task => task.status === 'running') && isStreaming) abortStream();
    void transitionPlan(plan.id, 'cancel').catch(error => { void reportWorkflowFailure(error, 'Plan gagal dibatalkan.'); });
  }, [abortStream, isStreaming, plan, reportWorkflowFailure, transitionPlan]);

  const completeWorkflow = useCallback(() => {
    setIsContinuousRunning(false);
    if (plan && plan.tasks.length > 0 && plan.tasks.every(task => task.status === 'done')) void transitionPlan(plan.id, 'complete').catch(error => { void reportWorkflowFailure(error, 'Plan gagal diselesaikan.'); });
  }, [plan, reportWorkflowFailure, transitionPlan]);

  const pauseWorkflow = useCallback(() => {
    setIsContinuousRunning(false);
    if (plan) void transitionPlan(plan.id, 'pause').catch(error => { void reportWorkflowFailure(error, 'Plan gagal dijeda.'); });
  }, [plan, reportWorkflowFailure, transitionPlan]);

  const resumeWorkflow = useCallback(() => {
    if (plan) void transitionPlan(plan.id, 'resume').catch(error => { void reportWorkflowFailure(error, 'Plan gagal dilanjutkan.'); });
  }, [plan, reportWorkflowFailure, transitionPlan]);

  const recoverTask = useCallback((taskId: string, executionId: string) => {
    setIsContinuousRunning(false);
    if (plan) void recoverTaskExecution(plan.id, taskId, executionId).then(() => showToast('Eksekusi ditandai terputus. Task dapat dicoba ulang.', 'info')).catch(error => { void reportWorkflowFailure(error, 'Eksekusi belum dapat dipulihkan.'); });
  }, [plan, recoverTaskExecution, reportWorkflowFailure, showToast]);

  return {
    runTask,
    startContinuousWorkflow,
    stopContinuousWorkflow,
    stopTaskExecution,
    isStoppingTask,
    isContinuousRunning,
    acceptTaskReview,
    rejectTaskReview,
    generateTasks,
    cancelWorkflow,
    completeWorkflow,
    pauseWorkflow,
    resumeWorkflow,
    recoverTask,
    isAgentExecuting
  };
}
