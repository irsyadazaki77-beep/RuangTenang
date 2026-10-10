import React, { useState, useCallback, useEffect, useLayoutEffect, useMemo, useReducer } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { FileText, Paperclip, Sparkles } from 'lucide-react';
import { WorkspaceMode, WorkspaceArtifact, WorkspaceTab, WorkspaceComposerConfig, WorkspaceComparisonCandidate, WorkspaceComparisonRun, WorkspaceRequestSnapshot, WorkspaceArtifactSelection, ArtifactPatch } from './types';
import { UserSession } from '../../types';
import { Chat, Message } from '../chat/types';
import { STARTER_TASKS, ACADEMIC_PROMPT_PILLS } from './constants/workspaceConstants';

// Custom Domain Hooks
import { useWorkspacePersistence } from './hooks/useWorkspacePersistence';
import { useWorkspaceArtifacts } from './hooks/useWorkspaceArtifacts';
import { useWorkspaceStreaming, WorkspaceRequestIdentity } from './hooks/useWorkspaceStreaming';
import { useWorkspaceFileIngestion } from './hooks/useWorkspaceFileIngestion';
import { useAcademicDistress } from './hooks/useAcademicDistress';
import { useWorkspaceTemplates } from './hooks/useWorkspaceTemplates';
import { useWorkspaceMetadata } from './hooks/useWorkspaceMetadata';
import { useWorkspaceAgentController } from './hooks/useWorkspaceAgentController';

// UI Orchestration Components
import { WorkspaceHeader } from './components/WorkspaceHeader';
import { WorkspaceConversation } from './components/WorkspaceConversation';
import { WorkspaceComposer } from './components/WorkspaceComposer';
import { WorkspaceCanvasPane } from './components/WorkspaceCanvasPane';
import { WorkspaceTemplateModal } from './components/WorkspaceTemplateModal';
import { MicroBreathingModal } from './components/MicroBreathingModal';
import { StoredAttachment } from '../chat/types';
import { getWorkspaceSessionStorage, loadWorkspaceModelPreference, readWorkspaceModelPreference, saveWorkspaceModelPreference } from './utils/workspaceModelPreference';
import { useWorkspacePresets } from './hooks/useWorkspacePresets';
import { WorkspaceToolDefinition } from './tools/toolTypes';
import { WorkspaceToolExecutor } from './tools/toolExecutor';
import { AUTO_ROUTING_MODEL_ID } from '../../lib/aiModels';
import { useAiModelCatalog } from '../../lib/aiModelCatalog';
import { DEFAULT_WELCOME_ARTIFACT_ID } from './constants/workspaceConstants';
import { parseArtifactsFromText } from './utils/artifactParser';
import { WorkspaceToolConfigModal } from './components/WorkspaceToolConfigModal';
import { WorkspaceTasksPanel } from './components/WorkspaceTasksPanel';
import { useToast } from '../../components/Toast';
import { getModeChatPath } from './utils/workspaceRouting';
import { apiClient } from '../../lib/apiClient';
import { buildWorkspaceContextNote, buildWorkspaceRequestSnapshot } from './utils/workspaceContext';
import { getArtifactSelectionContext } from './utils/artifactPatch';
import { WorkspacePlanSchema, type WorkspacePlan } from '../../../shared/contracts/workspace';
import { validateResearchCitations } from './utils/citationIntegrity';
import { WorkspaceSourceLibrary } from './components/WorkspaceSourceLibrary';
import { WorkspaceSourcePreview } from './components/WorkspaceSourcePreview';
import { initialWorkspaceViewState, workspaceTabForInspector, workspaceViewReducer, type WorkspaceInspector } from './hooks/workspaceViewState';
import { WORKSPACE_COMMAND_EVENT, type WorkspaceCommandId } from './utils/workspaceCommandEvents';
import { readWorkspacePromptDraft, writeWorkspacePromptDraft } from './utils/workspacePromptDraft';
import type { FileSourceReference } from '../../../shared/contracts/files';

const WorkspaceFilePreviewModal = React.lazy(() => import('./components/WorkspaceFilePreviewModal').then(module => ({ default: module.WorkspaceFilePreviewModal })));

export interface StudentWorkspaceProps {
  user: UserSession | null;
  chats?: Chat[];
  setChats?: React.Dispatch<React.SetStateAction<Chat[]>>;
  onSwitchMode?: (mode: WorkspaceMode) => void;
  onOpenSidebar?: () => void;
  onOpenSettings?: () => void;
  onOpenChangelog?: () => void;
}

function localWorkspaceStorageKey(userId?: string) {
  return `ruangkerja:active-local-workspace:${userId || 'guest'}`;
}

function getLocalWorkspaceIdentity(userId?: string) {
  const key = localWorkspaceStorageKey(userId);
  try {
    const existing = globalThis.sessionStorage?.getItem(key);
    if (existing) return existing;
    const identity = `local:${userId || 'guest'}:${Date.now()}-${Math.random().toString(36).slice(2)}`;
    globalThis.sessionStorage?.setItem(key, identity);
    return identity;
  } catch {
    return `local:${userId || 'guest'}:${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function clearLocalWorkspaceIdentity(userId?: string) {
  try { globalThis.sessionStorage?.removeItem(localWorkspaceStorageKey(userId)); } catch { /* session storage is optional */ }
}

function parseGeneratedPlan(content: string, goal: string): WorkspacePlan | null {
  try {
    const json = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const value = JSON.parse(json) as { title?: unknown; tasks?: Array<{ title?: unknown; description?: unknown; type?: unknown; dependsOn?: unknown }> };
    if (typeof value.title !== 'string' || !Array.isArray(value.tasks) || value.tasks.length < 1 || value.tasks.length > 12) return null;
    const ids = value.tasks.map(() => crypto.randomUUID());
    const tasks = value.tasks.map((task, index) => ({
      id: ids[index], title: task.title,
      ...(typeof task.description === 'string' ? { description: task.description } : {}),
      type: task.type, dependsOn: Array.isArray(task.dependsOn) ? task.dependsOn.map(Number).filter(dep => Number.isInteger(dep) && dep >= 1 && dep <= value.tasks!.length && dep !== index + 1).map(dep => ids[dep - 1]) : [], status: 'todo' as const
    }));
    const now = new Date().toISOString();
    return WorkspacePlanSchema.parse({ id: crypto.randomUUID(), goal, title: value.title, status: 'draft', tasks, createdAt: now, updatedAt: now });
  } catch { return null; }
}

export function StudentWorkspace({ 
  user, 
  chats,
  setChats,
  onSwitchMode, 
  onOpenSidebar 
}: StudentWorkspaceProps) {
  const { chatId } = useParams<{ chatId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { models, defaultModel } = useAiModelCatalog();
  const { showToast } = useToast();
  const [streamCreatedChatId, setStreamCreatedChatId] = useState<string>();
  const [workspaceIdentity, setWorkspaceIdentity] = useState(() => chatId ? `chat:${chatId}` : getLocalWorkspaceIdentity(user?.id));
  const effectiveChatId = chatId || streamCreatedChatId;
  const workspaceMetadata = useWorkspaceMetadata(user?.role === 'guest' ? undefined : effectiveChatId);
  const workspacePlan = workspaceMetadata.plan;
  const workspaceData = workspaceMetadata.workspace;
  const updateWorkspacePlan = workspaceMetadata.updatePlan;
  const createWorkspacePlan = workspaceMetadata.createPlan;
  const startWorkspaceTaskExecution = workspaceMetadata.startTaskExecution;
  const saveWorkspaceMetadata = workspaceMetadata.save;
  const workspacePlanRef = React.useRef(workspacePlan);
  workspacePlanRef.current = workspacePlan;
  const logicalWorkspaceIdentity = streamCreatedChatId && (!chatId || chatId === streamCreatedChatId)
    ? workspaceIdentity
    : chatId ? `chat:${chatId}` : workspaceIdentity;
  const logicalWorkspaceIdentityRef = React.useRef(logicalWorkspaceIdentity);
  logicalWorkspaceIdentityRef.current = logicalWorkspaceIdentity;
  const workspaceTitle = chats?.find(chat => chat.id === effectiveChatId)?.title || 'Workspace baru';
  const effectiveChatIdRef = React.useRef(effectiveChatId);
  const lastRouteChatIdRef = React.useRef(chatId);
  const clearInProgressRef = React.useRef(false);
  const activeSendOperationRef = React.useRef<string | null>(null);
  const taskGenerationRequestsRef = React.useRef(new Map<string, string>());
  const taskRunRequestsRef = React.useRef(new Map<string, { taskId: string; planId: string; executionId: string; workspaceId?: string }>());
  effectiveChatIdRef.current = effectiveChatId;

  // 1. Domain Persistence Hook
  const {
    messages,
    setMessages,
    persistedArtifacts,
    isLoadingMessages,
    isLoadingArtifacts,
    clearWorkspaceConversation,
    isClearingConversation
  } = useWorkspacePersistence({
    chatId: effectiveChatId,
    workspaceIdentity: logicalWorkspaceIdentity,
    userName: user?.name
  });

  // 2. Domain Artifacts Hook
  const {
    artifacts,
    setArtifacts,
    activeArtifact,
    activeArtifactId,
    setActiveArtifactId,
    hasUnreadArtifact,
    setHasUnreadArtifact,
    updateActiveArtifact,
    saveArtifact,
    migrateLocalArtifacts,
    rollbackArtifact,
    createNewArtifact,
    createArtifactFromContent,
    duplicateArtifact,
    deleteArtifact,
    syncParsedMessageArtifacts
  } = useWorkspaceArtifacts({
    chatId: effectiveChatId,
    userId: user?.id,
    workspaceIdentity: logicalWorkspaceIdentity,
    persistedArtifacts
  });
  const canvasArtifacts = useMemo(() => artifacts.filter(artifact => artifact.id !== DEFAULT_WELCOME_ARTIFACT_ID), [artifacts]);
  const visibleActiveArtifact = activeArtifact?.id === DEFAULT_WELCOME_ARTIFACT_ID ? null : activeArtifact;
  const canvasScrollStorageKey = `ruangkerja:canvas-scroll:${encodeURIComponent(user?.id || 'guest')}:${encodeURIComponent(logicalWorkspaceIdentity)}:${encodeURIComponent(activeArtifactId)}`;


  // 3. UI Layout & View States
  const [workspaceView, dispatchWorkspaceView] = useReducer(workspaceViewReducer, initialWorkspaceViewState);
  const isCanvasOpen = workspaceView.inspector === 'canvas';
  const isContextPanelOpen = workspaceView.inspector === 'context' || workspaceView.inspector === 'files' || workspaceView.inspector === 'sources' || workspaceView.inspector === 'plan';
  const workspaceRightTab = workspaceView.inspector === 'files' || workspaceView.inspector === 'sources' || workspaceView.inspector === 'plan' ? workspaceView.inspector : 'context';
  const mobileActiveTab = workspaceTabForInspector(workspaceView.inspector);
  const previewAttachmentId = workspaceView.previewAttachmentId;
  const focusedTaskId = workspaceView.focusedTaskId;
  const workspaceViewRef = React.useRef(workspaceView);
  workspaceViewRef.current = workspaceView;
  const inspectorReturnFocusRef = React.useRef<HTMLElement | null>(null);
  const [isCanvasExpanded, setIsCanvasExpanded] = useState<boolean>(false);
  const [includeFilesInContext, setIncludeFilesInContext] = useState(true);
  const [selectedWorkspaceFileIds, setSelectedWorkspaceFileIds] = useState<string[]>([]);
  const [includeCanvasInContext, setIncludeCanvasInContext] = useState(true);
  const [focusedMessageId, setFocusedMessageId] = useState<string | null>(null);
  const promptDraftIdentity = `${user?.id || 'guest'}:${logicalWorkspaceIdentity}`;
  const [inputText, setInputText] = useState<string>(() => readWorkspacePromptDraft(getWorkspaceSessionStorage(), promptDraftIdentity));
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return loadWorkspaceModelPreference(getWorkspaceSessionStorage()).modelId;
  });
  const [modelPreferenceNotice, setModelPreferenceNotice] = useState<string | null>(() =>
    loadWorkspaceModelPreference(getWorkspaceSessionStorage()).wasReset
      ? 'Pilihan model sebelumnya tidak tersedia; model default RuangKerja telah dipilih.'
      : null
  );
  const [compareMode, setCompareMode] = useState(false);
  const [selectedCompareModels, setSelectedCompareModels] = useState<string[]>([]);
  const [instructionsDraft, setInstructionsDraft] = useState('');
  const [isInstructionsEditing, setIsInstructionsEditing] = useState(false);
  const [isInstructionsSaving, setIsInstructionsSaving] = useState(false);
  const [comparisonRun, setComparisonRun] = useState<WorkspaceComparisonRun | null>(null);
  const [pendingTool, setPendingTool] = useState<{ tool: WorkspaceToolDefinition; artifact: WorkspaceArtifact | null } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [canvasSelection, setCanvasSelection] = useState<WorkspaceArtifactSelection | null>(null);
  const [canvasDraft, setCanvasDraft] = useState<{ artifactId: string; content: string } | null>(null);
  const [pendingRevision, setPendingRevision] = useState<{ artifactId: string; title: string; baseContent: string; baseVersion: number; proposedContent: string } | null>(null);
  const [inlineEditPatch, setInlineEditPatch] = useState<ArtifactPatch | null>(null);
  const [revisionCommit, setRevisionCommit] = useState<{ artifactId: string; content: string; version: number } | null>(null);
  const [isCreatingArtifact, setIsCreatingArtifact] = useState(false);
  const [pendingCanvasTransfer, setPendingCanvasTransfer] = useState<{ id: string; content: string; title: string } | null>(null);
  const revisionRequestRef = React.useRef<{ scope: 'document' | 'selection'; artifactId: string; title: string; baseContent: string; baseVersion: number; workspaceId?: string; selection?: WorkspaceArtifactSelection } | null>(null);
  const requestSnapshotsRef = React.useRef(new Map<string, { snapshot: WorkspaceRequestSnapshot; attachments?: StoredAttachment[]; customSystemNote?: string; revisionRequest?: NonNullable<typeof revisionRequestRef.current> }>());
  const isStreamRequestCurrentRef = React.useRef<(identity: WorkspaceRequestIdentity) => boolean>(() => false);

  const rememberInspectorFocus = useCallback(() => {
    if (workspaceViewRef.current.inspector === 'closed') {
      inspectorReturnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
  }, []);
  const openWorkspaceInspector = useCallback((inspector: Exclude<WorkspaceInspector, 'closed'>) => {
    rememberInspectorFocus();
    dispatchWorkspaceView({ type: 'open-inspector', inspector });
  }, [rememberInspectorFocus]);
  const closeWorkspaceInspector = useCallback(() => {
    dispatchWorkspaceView({ type: 'close-inspector' });
    requestAnimationFrame(() => inspectorReturnFocusRef.current?.focus());
  }, []);
  const openWorkspaceSource = useCallback((source: FileSourceReference) => {
    rememberInspectorFocus();
    dispatchWorkspaceView({ type: 'select-source', source });
  }, [rememberInspectorFocus]);
  const openWorkspaceFilePreview = useCallback((attachmentId: string) => {
    rememberInspectorFocus();
    dispatchWorkspaceView({ type: 'preview-attachment', attachmentId });
  }, [rememberInspectorFocus]);

  const handleCompareModeChange = useCallback((enabled: boolean) => {
    setCompareMode(enabled);
    if (!enabled || selectedCompareModels.length >= 2) return;
    const selectable = models.filter(model => model.selectable && model.capabilities.includes('chat') && model.capabilities.includes('streaming'));
    const preferred = selectedModel !== AUTO_ROUTING_MODEL_ID ? selectedModel : defaultModel;
    const first = selectable.find(model => model.id === preferred)?.id || selectable.find(model => model.id === defaultModel)?.id || selectable[0]?.id || preferred;
    const second = selectable.find(model => model.id !== first)?.id;
    setSelectedCompareModels([first, ...(second ? [second] : [])]);
  }, [defaultModel, models, selectedCompareModels.length, selectedModel]);

  useEffect(() => {
    const state = location.state as { initialPrompt?: unknown; initialCompareMode?: unknown } | null;
    if (typeof state?.initialPrompt === 'string' && state.initialPrompt.trim()) setInputText(state.initialPrompt.trim());
    if (state?.initialCompareMode === true) handleCompareModeChange(true);
    if (state?.initialPrompt || state?.initialCompareMode) navigate(location.pathname, { replace: true, state: null });
  }, [handleCompareModeChange, location.pathname, location.state, navigate]);

  useEffect(() => {
    const target = (location.state as { workspaceSearchTarget?: { kind?: string; itemId?: string } } | null)?.workspaceSearchTarget;
    if (!target?.kind) return;
    const clearTarget = () => navigate(location.pathname, { replace: true, state: null });
    if (target.kind === 'artifact' && target.itemId) {
      const artifact = artifacts.find(item => item.id === target.itemId);
      if (!artifact) {
        if (isLoadingArtifacts) return;
        showToast('Dokumen ini tidak tersedia di Workspace tersebut.', 'info');
        clearTarget();
        return;
      }
      setActiveArtifactId(artifact.id);
      openWorkspaceInspector('canvas');
      setHasUnreadArtifact(false);
      clearTarget();
      return;
    }
    if (target.kind === 'file') return;
    if (target.kind === 'task' && target.itemId) {
      if (workspaceMetadata.isLoading) return;
      if (!workspacePlan?.tasks.some(task => task.id === target.itemId)) {
        showToast('Rencana atau task ini sudah tidak tersedia.', 'info');
        clearTarget();
        return;
      }
      dispatchWorkspaceView({ type: 'focus-task', taskId: target.itemId });
      openWorkspaceInspector('plan');
      clearTarget();
      return;
    }
    if (target.kind === 'message' && target.itemId) {
      if (isLoadingMessages) return;
      if (!messages.some(message => message.id === target.itemId)) { showToast('Pesan ini tidak tersedia di Workspace tersebut.', 'info'); clearTarget(); return; }
      setFocusedMessageId(target.itemId);
      clearTarget();
      return;
    }
    clearTarget();
  }, [artifacts, isLoadingArtifacts, isLoadingMessages, location.pathname, location.state, messages, navigate, openWorkspaceFilePreview, openWorkspaceInspector, setActiveArtifactId, setHasUnreadArtifact, showToast, workspaceMetadata.isLoading, workspacePlan]);
  useEffect(() => setInstructionsDraft(workspaceData?.instructions || ''), [workspaceData?.instructions]);

  useLayoutEffect(() => {
    const previousRouteChatId = lastRouteChatIdRef.current;
    const createdFromCurrentStream = !previousRouteChatId && Boolean(chatId && effectiveChatIdRef.current === chatId);
    lastRouteChatIdRef.current = chatId;
    setComparisonRun(null);
    if (createdFromCurrentStream) return;
    if (previousRouteChatId !== chatId) {
      dispatchWorkspaceView({ type: 'reset-workspace-view' });
      setIsCanvasExpanded(false);
      setInputText(readWorkspacePromptDraft(getWorkspaceSessionStorage(), promptDraftIdentity));
      setIncludeFilesInContext(true);
      setSelectedWorkspaceFileIds([]);
      setIncludeCanvasInContext(true);
      setCompareMode(false);
      setSelectedCompareModels([]);
      setFocusedMessageId(null);
      setInstructionsDraft('');
      setIsInstructionsEditing(false);
      setIsInstructionsSaving(false);
    }
    if (chatId) {
      setWorkspaceIdentity(`chat:${chatId}`);
      clearLocalWorkspaceIdentity(user?.id);
    } else {
      setWorkspaceIdentity(getLocalWorkspaceIdentity(user?.id));
    }
    setStreamCreatedChatId(undefined);
    setSelectedText('');
    setCanvasSelection(null);
    setCanvasDraft(null);
    setPendingRevision(null);
    setInlineEditPatch(null);
    setRevisionCommit(null);
    revisionRequestRef.current = null;
    setIsCreatingArtifact(false);
    setPendingCanvasTransfer(null);
    requestSnapshotsRef.current.clear();
    activeSendOperationRef.current = null;
  }, [chatId, promptDraftIdentity, user?.id]);

  useEffect(() => {
    if (chatId && streamCreatedChatId === chatId) setStreamCreatedChatId(undefined);
  }, [chatId, streamCreatedChatId]);

  const handleModelChange = useCallback((modelId: string) => {
    const validModel = readWorkspaceModelPreference({ getItem: () => modelId });
    setSelectedModel(validModel);
    saveWorkspaceModelPreference(getWorkspaceSessionStorage(), validModel);
    setModelPreferenceNotice(null);
  }, []);

  // F21 Preset Management Hook
  const {
    allPresets,
    activePreset,
    activePresetId,
    activePresetSummary,
    isManualModelOverride,
    selectPreset,
    createCustomPreset,
    updateCustomPreset,
    duplicatePreset,
    deleteCustomPreset,
    resetPersonalization
  } = useWorkspacePresets({
    userId: user?.id,
    selectedModel,
    onModelChange: handleModelChange
  });

  // 4. File Ingestion Hook
  const {
    attachments: workspaceAttachments,
    isLoadingAttachments,
    isDraggingOver,
    fileInputRef,
    handleFileUploadChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    removeAttachment,
    retryAttachment
  } = useWorkspaceFileIngestion(effectiveChatId);
  const selectedReadyWorkspaceFileCount = includeFilesInContext
    ? selectedWorkspaceFileIds.filter(id => workspaceAttachments.some(file => file.id === id && file.status === 'ready')).length
    : 0;
  const workspaceContextSummary = [
    selectedReadyWorkspaceFileCount ? `${selectedReadyWorkspaceFileCount} dokumen aktif` : '',
    includeCanvasInContext && visibleActiveArtifact ? visibleActiveArtifact.title : '',
    selectedText.trim() ? 'teks dipilih' : ''
  ].filter(Boolean).join(' · ') || 'Konteks kosong';
  useEffect(() => {
    const target = (location.state as { workspaceSearchTarget?: { kind?: string; itemId?: string } } | null)?.workspaceSearchTarget;
    if (target?.kind !== 'file' || !target.itemId || isLoadingAttachments) return;
    const attachment = workspaceAttachments.find(file => file.id === target.itemId);
    if (!attachment) showToast('File ini tidak tersedia di Workspace tersebut.', 'info');
    else {
      openWorkspaceInspector('files');
      openWorkspaceFilePreview(attachment.id!);
    }
    navigate(location.pathname, { replace: true, state: null });
  }, [isLoadingAttachments, location.pathname, location.state, navigate, openWorkspaceFilePreview, openWorkspaceInspector, showToast, workspaceAttachments]);
  useEffect(() => {
    setSelectedWorkspaceFileIds(current => {
      const readyIds = workspaceAttachments.filter(file => file.status === 'ready' && file.id).map(file => file.id!);
      const existing = new Set(current);
      return [...current.filter(id => readyIds.includes(id)), ...readyIds.filter(id => !existing.has(id))];
    });
  }, [workspaceAttachments]);

  // 5. Academic Distress Safety Hook
  const {
    distressResult,
    isDistressDismissed,
    isBreathingModalOpen,
    dismissDistress,
    openBreathingModal,
    closeBreathingModal
  } = useAcademicDistress(inputText);

  // 6. Academic Templates Hook
  const {
    selectedTemplateForModal,
    templateInputSnippet,
    setTemplateInputSnippet,
    openTemplateModal,
    closeTemplateModal
  } = useWorkspaceTemplates();

  // 7. Domain Streaming Hook
  const handleChatIdReceived = useCallback((createdChatId: string, identity: WorkspaceRequestIdentity) => {
    if (identity.workspaceId !== logicalWorkspaceIdentityRef.current || !isStreamRequestCurrentRef.current(identity)) return;
    if (chatId) return;
    effectiveChatIdRef.current = createdChatId;
    setStreamCreatedChatId(createdChatId);
  }, [chatId]);

  const handleChatCreated = useCallback((createdChatId: string, identity: WorkspaceRequestIdentity) => {
    if (chatId || !createdChatId || identity.workspaceId !== logicalWorkspaceIdentityRef.current || !isStreamRequestCurrentRef.current(identity)) return;
    clearLocalWorkspaceIdentity(user?.id);
    void migrateLocalArtifacts(createdChatId);
    navigate(getModeChatPath('RUANG_KERJA', createdChatId), { replace: true });
    void apiClient.get<Chat[]>('/api/v1/chat/history').then(response => {
      if (response.success && Array.isArray(response.data)) setChats?.(response.data);
    }).catch(error => console.warn('[Workspace] Chat list refresh failed:', error));
  }, [chatId, migrateLocalArtifacts, navigate, setChats, user?.id]);

  const handleStreamArtifactExtracted = useCallback((_artifact: WorkspaceArtifact, _streaming: boolean, identity: WorkspaceRequestIdentity) => {
    if (identity.workspaceId !== logicalWorkspaceIdentityRef.current || !isStreamRequestCurrentRef.current(identity)) return;
    if (revisionRequestRef.current) return;
    openWorkspaceInspector('canvas');
    setIsCreatingArtifact(true);
  }, [openWorkspaceInspector]);

  const handleStreamCompleted = useCallback(async (assistantMsg: Message, extractedArtifacts: WorkspaceArtifact[], identity: WorkspaceRequestIdentity) => {
    const isCurrent = () => identity.workspaceId === logicalWorkspaceIdentityRef.current && isStreamRequestCurrentRef.current(identity);
    if (!isCurrent()) return;
    setIsCreatingArtifact(false);
    const generatedTaskGoal = taskGenerationRequestsRef.current.get(identity.requestId);
    taskGenerationRequestsRef.current.delete(identity.requestId);
    const taskRun = taskRunRequestsRef.current.get(identity.requestId);
    taskRunRequestsRef.current.delete(identity.requestId);
    let taskCompletionPlan: WorkspacePlan | undefined;
    if (taskRun && taskRun.workspaceId === identity.workspaceId) {
      const latest = workspacePlanRef.current;
      if (latest?.id === taskRun.planId && latest.tasks.find(task => task.id === taskRun.taskId)?.executionId === taskRun.executionId) {
        const taskType = latest.tasks.find(task => task.id === taskRun.taskId)?.type;
        const resultStatus = assistantMsg.error ? 'failed' as const : taskType === 'writing' ? 'waiting_review' as const : 'done' as const;
        const completedAt = new Date().toISOString();
        const tasks = latest.tasks.map(task => task.id === taskRun.taskId ? { ...task, status: resultStatus, output: assistantMsg.error ? undefined : assistantMsg.content.slice(0, 20000), sources: assistantMsg.error ? undefined : assistantMsg.sources || [], executionHistory: (task.executionHistory || []).map(attempt => attempt.executionId === taskRun.executionId ? { ...attempt, status: assistantMsg.error ? 'failed' as const : 'completed' as const, completedAt } : attempt), updatedAt: completedAt } : task);
        try { taskCompletionPlan = await updateWorkspacePlan({ ...latest, tasks, status: 'approved', updatedAt: new Date().toISOString() }); }
        catch (error) { console.warn('[WorkspaceTasks] Task result persistence failed:', error); }
      }
    }
    if (generatedTaskGoal && !assistantMsg.error) {
      const plan = parseGeneratedPlan(assistantMsg.content, generatedTaskGoal);
      try {
        if (plan) { await createWorkspacePlan(plan); showToast('Draft plan siap ditinjau. Belum ada task yang dijalankan.', 'success'); }
        else showToast('Respons plan tidak sesuai format terstruktur. Coba buat ulang.', 'error');
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Plan gagal disimpan.', 'error');
      }
    }
    const revisionRequest = revisionRequestRef.current;
    if (revisionRequest && revisionRequest.workspaceId === (identity.chatId || effectiveChatIdRef.current) && !assistantMsg.error) {
      revisionRequestRef.current = null;
      const proposal = extractedArtifacts.find(item => item.content.trim());
      if (proposal && !assistantMsg.error && revisionRequest.scope === 'selection' && revisionRequest.selection) {
        setInlineEditPatch({
          artifactId: revisionRequest.artifactId,
          baseVersion: revisionRequest.baseVersion,
          baseContent: revisionRequest.baseContent,
          start: revisionRequest.selection.start,
          end: revisionRequest.selection.end,
          originalText: revisionRequest.selection.text,
          replacementText: proposal.content
        });
        setMessages(previous => previous.some(message => message.id === assistantMsg.id) ? previous : [...previous, { ...assistantMsg, content: `Usulan untuk teks terpilih di “${revisionRequest.title}” siap ditinjau di Canvas.` }]);
        return;
      }
      if (proposal && !assistantMsg.error) {
        setPendingRevision({ ...revisionRequest, proposedContent: proposal.content });
        setMessages(previous => previous.some(message => message.id === assistantMsg.id) ? previous : [...previous, { ...assistantMsg, content: `Usulan revisi untuk “${revisionRequest.title}” sudah siap. Tinjau perbedaan di Canvas sebelum menerapkan.` }]);
        return;
      }
    }
    let artifactsPersisted = true;
    if (extractedArtifacts.length > 0) {
      setHasUnreadArtifact(true);
      openWorkspaceInspector('canvas');
      artifactsPersisted = await syncParsedMessageArtifacts(extractedArtifacts, identity.chatId || effectiveChatIdRef.current);
      if (!isCurrent()) return;
      setActiveArtifactId(extractedArtifacts[0].id);
      if (taskCompletionPlan && taskRun && artifactsPersisted) {
        taskCompletionPlan = { ...taskCompletionPlan, tasks: taskCompletionPlan.tasks.map(task => task.id === taskRun.taskId ? { ...task, outputArtifactId: extractedArtifacts[0].id } : task) };
        try { taskCompletionPlan = await updateWorkspacePlan(taskCompletionPlan); }
        catch (error) { console.warn('[WorkspaceTasks] Output artifact link did not persist:', error); }
      }
    }
    const citationAudit = taskRun && workspacePlanRef.current?.tasks.find(task => task.id === taskRun.taskId)?.type === 'research'
      ? validateResearchCitations(assistantMsg.content, assistantMsg.sources || []) : null;
    const finalMessage = !artifactsPersisted && extractedArtifacts.length
      ? { ...assistantMsg, content: `${assistantMsg.content.replace(/Artefak Aktif[^\n]*/g, 'Draf dokumen dibuat secara lokal')}\n\nDokumen belum tersimpan ke server. Draf tetap tersedia di Canvas; coba simpan lagi.` }
      : citationAudit ? { ...assistantMsg, content: `${citationAudit.content}${citationAudit.removedUnknownCitationCount ? `\n\n${citationAudit.removedUnknownCitationCount} marker citation yang tidak cocok dengan evidence request ini dihapus.` : ''}${citationAudit.unreferencedSentenceCount ? `\n\n**Audit evidence:** ${citationAudit.unreferencedSentenceCount} kalimat panjang tidak memiliki marker sumber. Keterkaitan citation sudah divalidasi, tetapi dukungan makna belum diverifikasi otomatis.` : '\n\n**Audit evidence:** marker menunjuk ke sumber pada request ini. Dukungan makna tetap perlu ditinjau.'}` } : assistantMsg;
    if (!isCurrent()) return;
    setMessages(prev => prev.some(message => message.id === finalMessage.id) ? prev : [...prev, finalMessage]);
  }, [openWorkspaceInspector, setMessages, setHasUnreadArtifact, syncParsedMessageArtifacts, setActiveArtifactId, updateWorkspacePlan, createWorkspacePlan, showToast]);

  const {
    isStreaming,
    activeStreamingMessage,
    sendMessageStream,
    abortStream,
    isRequestCurrent
  } = useWorkspaceStreaming({
    chatId,
    workspaceIdentity: logicalWorkspaceIdentity,
    onChatIdReceived: handleChatIdReceived,
    onChatCreated: handleChatCreated,
    onStreamArtifactExtracted: handleStreamArtifactExtracted,
    onStreamCompleted: handleStreamCompleted
  });
  isStreamRequestCurrentRef.current = isRequestCurrent;

  useEffect(() => {
    if (!isStreaming) setIsCreatingArtifact(false);
  }, [isStreaming]);

  // User Actions
  const handleExecuteSendMessage = useCallback((promptText: string, customSystemNote?: string, attachments?: StoredAttachment[], config?: WorkspaceComposerConfig, existingSnapshot?: WorkspaceRequestSnapshot, isRetry = false, scopedSelection?: WorkspaceArtifactSelection): boolean => {
    if (!promptText.trim() || isStreaming || clearInProgressRef.current || activeSendOperationRef.current) return false;
    if (!isRetry && !customSystemNote?.startsWith('Instruksi revisi dokumen') && !customSystemNote?.startsWith('Instruksi revisi inline')) revisionRequestRef.current = null;

    if (config?.comparisonModelIds?.length) {
      if (config.comparisonModelIds.length < 2 || config.comparisonModelIds.length > 3) return false;
      const compId = crypto.randomUUID();
      const snapId = crypto.randomUUID();
      setComparisonRun({
        comparisonId: compId,
        snapshotId: snapId,
        workspaceIdentity: logicalWorkspaceIdentity,
        chatId: effectiveChatId,
        prompt: promptText.trim(),
        selectedModelIds: [...new Set(config.comparisonModelIds)],
        responseStyle: `${config.responseMode}${config.responseStyle !== 'Default' ? `; ${config.responseStyle}` : ''}`,
        presetId: config.presetId,
        taskCategory: config.taskCategory,
        latencyPreference: config.latencyPreference,
        qualityPreference: config.qualityPreference,
        activeContext: includeCanvasInContext && activeArtifact && activeArtifact.id !== DEFAULT_WELCOME_ARTIFACT_ID
          ? { artifactId: activeArtifact.id, title: activeArtifact.title, version: activeArtifact.version, content: (canvasDraft?.artifactId === activeArtifact.id ? canvasDraft.content : activeArtifact.content).slice(0, 50000) }
          : undefined,
        selectedText: includeCanvasInContext ? scopedSelection?.text || selectedText || undefined : undefined,
        attachments: includeFilesInContext ? workspaceAttachments.filter(file => file.status === 'ready' && file.id && selectedWorkspaceFileIds.includes(file.id)).map(file => ({ id: file.id!, filename: file.name, mimeType: file.mimeType, size: file.size })) : undefined,
        workspaceInstructions: workspaceData?.instructions || undefined,
        includeWorkspaceFiles: includeFilesInContext && selectedWorkspaceFileIds.length > 0,
        createdAt: new Date().toISOString()
      });
      return true;
    }

    setComparisonRun(null);

    const resolvedConfig = config ?? { aiModel: selectedModel, responseMode: 'Seimbang' as const, responseStyle: 'Default' as const };
    const taskContextMode = Boolean(config?.isolatedTaskExecution);
    const taskFileIds = taskContextMode ? (config?.taskContextSourceIds || []) : selectedWorkspaceFileIds;
    const activeContent = taskContextMode ? config?.taskArtifactContext : includeCanvasInContext && activeArtifact && activeArtifact.id !== DEFAULT_WELCOME_ARTIFACT_ID
      ? canvasDraft?.artifactId === activeArtifact.id ? canvasDraft.content : activeArtifact.content
      : undefined;
    const baseSnapshot = existingSnapshot ?? buildWorkspaceRequestSnapshot({
      prompt: promptText,
      workspaceId: effectiveChatIdRef.current,
        model: resolvedConfig.aiModel,
      config: resolvedConfig,
      files: taskContextMode ? workspaceAttachments.filter(file => file.status === 'ready' && file.id && taskFileIds.includes(file.id)).map(file => ({ id: file.id, name: file.name })) : !includeFilesInContext ? [] : workspaceAttachments.filter(file => file.status === 'ready' && file.id && taskFileIds.includes(file.id)).map(file => ({ id: file.id, name: file.name })),
      workspaceInstructions: taskContextMode ? config?.taskWorkspaceInstructions : workspaceData?.instructions || undefined,
      artifact: taskContextMode && activeContent ? { id: 'task-canvas-snapshot', title: 'Canvas snapshot', type: 'DOCUMENT', version: 1, content: activeContent } : includeCanvasInContext && activeArtifact && activeArtifact.id !== DEFAULT_WELCOME_ARTIFACT_ID ? {
        id: activeArtifact.id, title: activeArtifact.title, type: activeArtifact.type,
        version: activeArtifact.version, content: scopedSelection && activeContent
          ? getArtifactSelectionContext(activeContent, scopedSelection.start, scopedSelection.end)
          : activeContent || activeArtifact.content
      } : undefined,
      selectedText: taskContextMode ? undefined : includeCanvasInContext ? scopedSelection?.text || (selectedText && activeArtifact?.id !== DEFAULT_WELCOME_ARTIFACT_ID ? selectedText : undefined) : undefined
    });
    const snapshot = isRetry
      ? { ...baseSnapshot, requestId: crypto.randomUUID(), createdAt: new Date().toISOString() }
      : baseSnapshot;
    const requestWorkspaceFileIds = config?.isolatedTaskExecution
      ? config.taskContextSourceIds || []
      : existingSnapshot
      ? existingSnapshot.context.activeFiles.map(file => file.id).filter((id): id is string => Boolean(id))
      : includeFilesInContext ? taskFileIds : [];
    const includeWorkspaceFilesForRequest = requestWorkspaceFileIds.length > 0;
    activeSendOperationRef.current = snapshot.requestId;
    const sendAttachments = existingSnapshot ? attachments : includeFilesInContext ? attachments : undefined;
    requestSnapshotsRef.current.set(snapshot.requestId, { snapshot, attachments: sendAttachments, customSystemNote, revisionRequest: revisionRequestRef.current ? { ...revisionRequestRef.current } : undefined });
    if (requestSnapshotsRef.current.size > 100) {
      const oldestRequestId = requestSnapshotsRef.current.keys().next().value;
      if (oldestRequestId) requestSnapshotsRef.current.delete(oldestRequestId);
    }
    const contextualNote = [customSystemNote, buildWorkspaceContextNote(snapshot)].filter(Boolean).join('\n\n');
    if (!isRetry) {
      setMessages(prev => [...prev, {
        id: `user_${snapshot.requestId}`, role: 'user', content: promptText.trim(), createdAt: new Date(snapshot.createdAt),
        attachments: attachments && attachments.length > 0 ? attachments : undefined
      }]);
    }
    setSelectedText('');
    void sendMessageStream(promptText.trim(), contextualNote || undefined, sendAttachments, resolvedConfig, snapshot.requestId, includeWorkspaceFilesForRequest, requestWorkspaceFileIds)
      .finally(() => {
        if (activeSendOperationRef.current === snapshot.requestId) activeSendOperationRef.current = null;
      });
    return true;
  }, [activeArtifact, canvasDraft, effectiveChatId, includeCanvasInContext, includeFilesInContext, selectedWorkspaceFileIds, isStreaming, selectedModel, selectedText, setMessages, sendMessageStream, workspaceAttachments, logicalWorkspaceIdentity, workspaceData?.instructions]);

  const handleUseComparisonResponse = useCallback(async (run: WorkspaceComparisonRun, candidate: WorkspaceComparisonCandidate) => {
    if (run.workspaceIdentity !== logicalWorkspaceIdentity || run.chatId !== effectiveChatIdRef.current || candidate.comparisonId !== run.comparisonId || candidate.snapshotId !== run.snapshotId || candidate.status !== 'completed' || !candidate.output || !candidate.attemptId) return false;
    const selectionKey = `compare:${run.comparisonId}:${run.snapshotId}:${candidate.candidateId}:${candidate.attemptId}`;
    if (messages.some(message => message.id === selectionKey)) return true;
    let persistedPromptId: string;
    let persistedResponseId: string;
    let persistedChatId: string;
    try {
      const response = await fetch('/api/v1/chat/compare/select', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', ...(document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/)?.[1] ? { 'X-CSRF-Token': decodeURIComponent(document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/)![1]) } : {}) },
        body: JSON.stringify({ chatId: run.chatId, workspaceIdentity: run.workspaceIdentity, prompt: run.prompt, response: candidate.output, modelId: candidate.modelId, comparisonId: run.comparisonId, snapshotId: run.snapshotId, candidateId: candidate.candidateId, attemptId: candidate.attemptId })
      });
      if (!response.ok) throw new Error('selection persistence failed');
      const persistedSelection = await response.json();
      if (!persistedSelection?.promptId || !persistedSelection?.responseId) throw new Error('selection response invalid');
      persistedPromptId = persistedSelection.promptId as string;
      persistedResponseId = persistedSelection.responseId as string;
      if (typeof persistedSelection.chatId !== 'string') throw new Error('selection workspace unavailable');
      persistedChatId = persistedSelection.chatId;
    } catch {
      showToast('Jawaban belum berhasil disimpan ke percakapan.', 'error');
      return false;
    }
    if (run.workspaceIdentity !== logicalWorkspaceIdentity || run.chatId !== effectiveChatIdRef.current) return false;
    const { cleanedText, artifacts: selectedArtifacts } = parseArtifactsFromText(candidate.output, false);
    const messageTime = new Date();
    let artifactsPersisted = true;
    if (selectedArtifacts.length > 0) {
      artifactsPersisted = await syncParsedMessageArtifacts(selectedArtifacts, run.chatId || persistedChatId);
      if (run.workspaceIdentity !== logicalWorkspaceIdentity || run.chatId !== effectiveChatIdRef.current) return false;
      openWorkspaceInspector('canvas');
      setHasUnreadArtifact(true);
      setActiveArtifactId(selectedArtifacts[0].id);
    }
    const responseText = cleanedText || candidate.output;
    setMessages(previous => [...previous,
      ...(previous.some(message => message.id === persistedPromptId || message.id === persistedResponseId || message.id === selectionKey) ? [] : [
        { id: persistedPromptId, role: 'user' as const, content: run.prompt, createdAt: messageTime },
        { id: persistedResponseId, role: 'assistant' as const, content: !artifactsPersisted && selectedArtifacts.length ? `${responseText}\n\nDokumen belum tersimpan ke server. Draf tetap tersedia di Canvas; coba simpan lagi.` : responseText, modelUsed: candidate.modelId, createdAt: new Date() }
      ])
    ]);
    if (selectedArtifacts.length && !artifactsPersisted) showToast('Jawaban tersimpan, tetapi dokumen Canvas belum tersimpan. Draf tetap tersedia; coba simpan lagi.', 'error');
    if (!run.chatId) {
      setStreamCreatedChatId(persistedChatId);
      navigate(getModeChatPath('RUANG_KERJA', persistedChatId), { replace: true });
    }
    return true;
  }, [logicalWorkspaceIdentity, messages, navigate, openWorkspaceInspector, setActiveArtifactId, setHasUnreadArtifact, setMessages, showToast, syncParsedMessageArtifacts]);

  const handleTransferToCanvas = useCallback(async (content: string, title: string) => {
    const trimmedContent = content.trim();
    if (!trimmedContent) return;
    const id = `art_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    if (!visibleActiveArtifact) {
      const saved = await createArtifactFromContent(trimmedContent, title, id);
      if (saved) openWorkspaceInspector('canvas');
      return;
    }
    setPendingCanvasTransfer({ id, content: trimmedContent, title });
  }, [createArtifactFromContent, openWorkspaceInspector, visibleActiveArtifact]);

  const handleComparisonSendToCanvas = useCallback((candidate: WorkspaceComparisonCandidate) => {
    void handleTransferToCanvas(candidate.output, `Comparison · ${candidate.modelName}`);
  }, [handleTransferToCanvas]);

  const handleConversationSendToCanvas = useCallback((content: string) => {
    void handleTransferToCanvas(content, 'Jawaban AI');
  }, [handleTransferToCanvas]);

  const handleCompareAgain = useCallback((run: WorkspaceComparisonRun) => {
    setComparisonRun({
      ...run,
      comparisonId: crypto.randomUUID(),
      snapshotId: crypto.randomUUID(),
      workspaceIdentity: logicalWorkspaceIdentity,
      chatId: effectiveChatId,
      activeContext: activeArtifact && activeArtifact.id !== DEFAULT_WELCOME_ARTIFACT_ID
        ? { artifactId: activeArtifact.id, title: activeArtifact.title, version: activeArtifact.version, content: (canvasDraft?.artifactId === activeArtifact.id ? canvasDraft.content : activeArtifact.content).slice(0, 50000) }
        : undefined,
      selectedText: selectedText || undefined,
      attachments: workspaceAttachments.filter(file => file.status === 'ready' && file.id).map(file => ({ id: file.id!, filename: file.name, mimeType: file.mimeType, size: file.size }))
    });
  }, [activeArtifact, canvasDraft, effectiveChatId, selectedText, workspaceAttachments, logicalWorkspaceIdentity]);

  const handleRetryMessage = useCallback((lastUserPrompt: string, errorMsgId: string) => {
    const errorMessage = messages.find(message => message.id === errorMsgId);
    const saved = errorMessage?.retryRequestId ? requestSnapshotsRef.current.get(errorMessage.retryRequestId) : undefined;
    if (!saved || saved.snapshot.userMessage !== lastUserPrompt.trim()) {
      showToast('Konteks permintaan ini sudah tidak tersedia. Kirim ulang pesan untuk mencoba lagi.', 'error');
      return;
    }
    revisionRequestRef.current = saved?.revisionRequest ? { ...saved.revisionRequest } : null;
    const accepted = handleExecuteSendMessage(lastUserPrompt, saved.customSystemNote, saved.attachments, saved.snapshot.config, saved.snapshot, true);
    if (accepted) setMessages(prev => prev.filter(m => m.id !== errorMsgId));
  }, [messages, setMessages, handleExecuteSendMessage, showToast]);

  const handleApplyCanvasTransfer = useCallback(async (mode: 'create' | 'replace' | 'append') => {
    if (!pendingCanvasTransfer) return;
    try {
      if (mode === 'create' || !visibleActiveArtifact) {
        const success = await createArtifactFromContent(pendingCanvasTransfer.content, pendingCanvasTransfer.title, pendingCanvasTransfer.id);
        if (!success) return;
      } else {
        const activeContent = canvasDraft?.artifactId === visibleActiveArtifact.id ? canvasDraft.content : visibleActiveArtifact.content;
        const content = mode === 'append'
          ? `${activeContent.trim()}\n\n${pendingCanvasTransfer.content}`
          : pendingCanvasTransfer.content;
        const saved = await saveArtifact(content, visibleActiveArtifact.title, true);
        if (!saved) throw new Error('Dokumen Canvas tidak berhasil disimpan');
        showToast(saved.persistenceStatus === 'local'
          ? 'Perubahan tersedia sebagai draf lokal Canvas.'
          : (mode === 'append' ? 'Jawaban ditambahkan ke Canvas' : 'Dokumen Canvas diperbarui'), saved.persistenceStatus === 'local' ? 'info' : 'success');
      }
      openWorkspaceInspector('canvas');
      setPendingCanvasTransfer(null);
    } catch {
      showToast('Gagal menyimpan perubahan ke Canvas. Coba lagi.', 'error');
    }
  }, [canvasDraft, createArtifactFromContent, openWorkspaceInspector, pendingCanvasTransfer, saveArtifact, showToast, visibleActiveArtifact]);

  const handleApplyRevision = useCallback(async () => {
    if (!pendingRevision || !visibleActiveArtifact || visibleActiveArtifact.id !== pendingRevision.artifactId) {
      showToast('Dokumen berubah sejak revisi dimulai. Coba ulang revisi.', 'error');
      return;
    }
    const currentDraft = canvasDraft?.artifactId === pendingRevision.artifactId ? canvasDraft.content : visibleActiveArtifact.content;
    if (visibleActiveArtifact.version !== pendingRevision.baseVersion || currentDraft !== pendingRevision.baseContent) {
      showToast('Dokumen berubah sejak revisi dimulai. Coba ulang revisi.', 'error');
      return;
    }
    try {
      let expectedUpdatedAt = visibleActiveArtifact.updatedAt;
      // Preserve an unsaved local draft as its own rollback point before accepting the AI revision.
      if (pendingRevision.baseContent !== visibleActiveArtifact.content) {
        const baseVersion = await saveArtifact(pendingRevision.baseContent, pendingRevision.title, true);
        if (!baseVersion) throw new Error('Dokumen dasar gagal disimpan');
        expectedUpdatedAt = baseVersion.updatedAt;
      }
      const saved = await saveArtifact(pendingRevision.proposedContent, pendingRevision.title, true, expectedUpdatedAt);
      if (!saved) throw new Error('Revisi gagal disimpan');
      setRevisionCommit({ artifactId: saved.id, content: saved.content, version: saved.version });
      setCanvasDraft({ artifactId: saved.id, content: saved.content });
      setPendingRevision(null);
      showToast(saved.persistenceStatus === 'local' ? 'Revisi diterapkan ke draf lokal.' : 'Revisi diterapkan dan versi baru tersimpan.', saved.persistenceStatus === 'local' ? 'info' : 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Revisi gagal disimpan';
      if (message.includes('berubah')) {
        showToast('Dokumen berubah di sesi lain. Revisi tetap tersedia; periksa versi terbaru sebelum menerapkan ulang.', 'error');
      } else {
        showToast('Revisi gagal disimpan. Draf tetap tersedia; coba lagi.', 'error');
      }
    }
  }, [canvasDraft, pendingRevision, saveArtifact, showToast, visibleActiveArtifact]);

  const handleClearWorkspaceConversation = useCallback(async (): Promise<boolean> => {
    if (clearInProgressRef.current) return false;
    clearInProgressRef.current = true;
    const targetChatId = effectiveChatIdRef.current;
    revisionRequestRef.current = null;
    abortStream(true);
    setComparisonRun(null);
    setIsCreatingArtifact(false);
    setPendingRevision(null);
    setInlineEditPatch(null);
    try {
      const cleared = await clearWorkspaceConversation(targetChatId);
      if (!cleared) return false;
      if (!chatId && targetChatId) navigate(getModeChatPath('RUANG_KERJA', targetChatId), { replace: true });
      showToast('Percakapan dibersihkan. Dokumen dan artefak Canvas tetap tersimpan.', 'success');
      return true;
    } finally {
      clearInProgressRef.current = false;
    }
  }, [abortStream, chatId, clearWorkspaceConversation, navigate, showToast]);

  const handleRequestRevision = useCallback((revisionPrompt: string, currentArt: WorkspaceArtifact) => {
    const baseContent = canvasDraft?.artifactId === currentArt.id ? canvasDraft.content : currentArt.content;
    const workspaceId = effectiveChatIdRef.current;
    revisionRequestRef.current = { scope: 'document', artifactId: currentArt.id, title: currentArt.title, baseContent, baseVersion: currentArt.version, workspaceId };
    const safeTitle = currentArt.title.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const outputContract = `Instruksi revisi dokumen "${currentArt.title}": ${revisionPrompt}. Gunakan dokumen Canvas aktif sebagai sumber. Kembalikan versi lengkap hasil revisi hanya dalam satu blok <artifact type="${currentArt.type.toLowerCase()}" title="${safeTitle}"${currentArt.language ? ` language="${currentArt.language}"` : ''}>...isi...</artifact>. Jangan mengubah dokumen secara langsung.`;
    handleExecuteSendMessage(`Tolong revisi dokumen aktif: ${revisionPrompt}`, outputContract);
  }, [canvasDraft, handleExecuteSendMessage]);

  const handleRequestInlineEdit = useCallback((selection: WorkspaceArtifactSelection, instruction: string, currentArt: WorkspaceArtifact) => {
    const baseContent = canvasDraft?.artifactId === currentArt.id ? canvasDraft.content : currentArt.content;
    if (!canvasSelection || canvasSelection.artifactId !== selection.artifactId || canvasSelection.start !== selection.start || canvasSelection.end !== selection.end || selection.artifactId !== currentArt.id || baseContent.slice(selection.start, selection.end) !== selection.text) {
      showToast('Teks yang dipilih sudah berubah. Pilih kembali lalu coba revisi.', 'error');
      return;
    }
    const workspaceId = effectiveChatIdRef.current;
    revisionRequestRef.current = { scope: 'selection', artifactId: currentArt.id, title: currentArt.title, baseContent, baseVersion: currentArt.version, workspaceId, selection };
    setInlineEditPatch(null);
    const safeTitle = currentArt.title.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const outputContract = `Instruksi revisi inline untuk dokumen Canvas "${safeTitle}": ${instruction}. Ubah hanya teks di dalam <selected_text>, gunakan konteks sekitar hanya untuk memahami makna. Kembalikan hanya teks pengganti (tanpa penjelasan dan tanpa mengulang konteks) di dalam satu blok <artifact type="${currentArt.type.toLowerCase()}" title="Inline suggestion">...teks pengganti...</artifact>. Jangan mengubah dokumen secara langsung.`;
    handleExecuteSendMessage(`Perbaiki teks terpilih: ${instruction}`, outputContract, undefined, undefined, undefined, false, selection);
  }, [canvasDraft, canvasSelection, handleExecuteSendMessage, showToast]);

  const handleDismissInlineEdit = useCallback(() => setInlineEditPatch(null), []);

  const handleAbortWorkspaceRequest = useCallback(() => {
    const requestId = activeSendOperationRef.current;
    const taskRun = requestId ? taskRunRequestsRef.current.get(requestId) : undefined;
    if (requestId) {
      taskRunRequestsRef.current.delete(requestId);
      taskGenerationRequestsRef.current.delete(requestId);
    }
    revisionRequestRef.current = null;
    abortStream();
    if (taskRun && workspacePlanRef.current?.id === taskRun.planId) {
      const plan = workspacePlanRef.current;
      const cancelledAt = new Date().toISOString();
      void updateWorkspacePlan({ ...plan, status: 'approved', tasks: plan.tasks.map(task => task.id === taskRun.taskId && task.executionId === taskRun.executionId ? { ...task, status: 'todo', output: undefined, executionHistory: (task.executionHistory || []).map(attempt => attempt.executionId === taskRun.executionId ? { ...attempt, status: 'cancelled', completedAt: cancelledAt } : attempt), updatedAt: cancelledAt } : task) }).catch(error => showToast(error instanceof Error ? error.message : 'Task belum dapat diperbarui.', 'error'));
    }
  }, [abortStream, showToast, updateWorkspacePlan]);

  const executeWorkspaceTool = useCallback(async (tool: WorkspaceToolDefinition, input: Record<string, unknown>, artifact: WorkspaceArtifact | null) => {
    const usableArtifact = artifact && artifact.id !== DEFAULT_WELCOME_ARTIFACT_ID ? artifact : null;
    const payload = {
      toolId: tool.id,
      input,
      context: {
        activeArtifact: usableArtifact ? {
          id: usableArtifact.id,
          title: usableArtifact.title,
          type: usableArtifact.type,
          language: usableArtifact.language,
          content: usableArtifact.content,
          version: usableArtifact.version
        } : null,
        chatId,
        selectedModel,
        presetId: activePresetId
      }
    };
    const validation = WorkspaceToolExecutor.validate(payload);
    if (!validation.valid) {
      showToast(validation.error || 'Konfigurasi tool tidak valid.', 'error');
      return;
    }

    try {
      if (tool.executionMode === 'client_utility' || tool.executionMode === 'export') {
        const result = await WorkspaceToolExecutor.executeClientUtility(tool, payload);
        if (!result.success) throw new Error(result.error?.message || 'Tool gagal dijalankan.');
        if (result.downloadData) {
          const blob = new Blob([result.downloadData.content], { type: `${result.downloadData.mimeType};charset=utf-8` });
          const url = URL.createObjectURL(blob);
          try {
            const link = document.createElement('a');
            link.href = url;
            link.download = result.downloadData.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          } finally {
            URL.revokeObjectURL(url);
          }
          showToast(`Berkas ${result.downloadData.filename} berhasil diunduh.`, 'success');
        } else if (result.proposedContent !== undefined && usableArtifact) {
          const saved = await saveArtifact(result.proposedContent, usableArtifact.title, true);
          if (!saved) throw new Error('Perubahan belum berhasil disimpan ke Canvas.');
          showToast(saved.persistenceStatus === 'local'
            ? `Aksi "${tool.name}" diterapkan ke draf lokal.`
            : `Aksi "${tool.name}" berhasil diterapkan. Versi sebelumnya tersimpan.`, saved.persistenceStatus === 'local' ? 'info' : 'success');
        }
        return;
      }

      const prompt = WorkspaceToolExecutor.prepareAiPrompt(tool, payload);
      if (tool.outputType === 'TEXT') {
        handleExecuteSendMessage(prompt);
      } else if (usableArtifact) {
        handleRequestRevision(prompt, usableArtifact);
      } else {
        handleExecuteSendMessage(prompt);
      }
    } catch (error) {
      console.warn(`[WorkspaceTool:${tool.id}] Execution failed:`, error);
      showToast(error instanceof Error ? error.message : 'Tool gagal dijalankan.', 'error');
    }
  }, [activePresetId, chatId, handleExecuteSendMessage, handleRequestRevision, saveArtifact, selectedModel, showToast]);

  const selectWorkspaceTool = useCallback((tool: WorkspaceToolDefinition, artifact?: WorkspaceArtifact | null) => {
    const contextArtifact = artifact ?? (activeArtifact?.id === DEFAULT_WELCOME_ARTIFACT_ID ? null : activeArtifact);
    if (tool.inputSchema?.length) {
      setPendingTool({ tool, artifact: contextArtifact });
      return;
    }
    void executeWorkspaceTool(tool, {}, contextArtifact);
  }, [activeArtifact, executeWorkspaceTool]);

  const pendingRevisionConflict = Boolean(pendingRevision && (
    !visibleActiveArtifact ||
    visibleActiveArtifact.id !== pendingRevision.artifactId ||
    visibleActiveArtifact.version !== pendingRevision.baseVersion ||
    (canvasDraft?.artifactId === pendingRevision.artifactId ? canvasDraft.content : visibleActiveArtifact.content) !== pendingRevision.baseContent
  ));
  const handleCanvasDraftChange = useCallback((artifactId: string, content: string) => {
    setCanvasDraft(current => current?.artifactId === artifactId && current.content === content ? current : { artifactId, content });
  }, []);
  const handleOpenCanvas = useCallback(() => {
    openWorkspaceInspector('canvas');
    setHasUnreadArtifact(false);
  }, [openWorkspaceInspector, setHasUnreadArtifact]);
  const handleSelectStarterTask = useCallback((prompt: string) => { handleExecuteSendMessage(prompt); }, [handleExecuteSendMessage]);
  const handleComposerSend = useCallback((prompt: string, attachments?: StoredAttachment[], config?: WorkspaceComposerConfig) => {
    return handleExecuteSendMessage(prompt, undefined, attachments, config);
  }, [handleExecuteSendMessage]);
  const {
    runTask: handleRunWorkspaceTask,
    acceptTaskReview: handleAcceptTaskReview,
    rejectTaskReview: handleRejectTaskReview,
    generateTasks: handleGenerateWorkspaceTasks,
    cancelWorkflow: handleCancelWorkflow,
    completeWorkflow: handleCompleteWorkflow
  } = useWorkspaceAgentController({
    plan: workspacePlan,
    planRef: workspacePlanRef,
    updatePlan: updateWorkspacePlan,
    startTaskExecution: startWorkspaceTaskExecution,
    isStreaming,
    includeFilesInContext,
    selectedFileIds: selectedWorkspaceFileIds,
    includeCanvasInContext,
    activeArtifact: visibleActiveArtifact,
    canvasDraft,
    workspaceInstructions: workspaceData?.instructions,
    selectedModel,
    workspaceId: logicalWorkspaceIdentity,
    activeSendOperationRef,
    taskGenerationRequestsRef,
    taskRunRequestsRef,
    sendMessage: handleExecuteSendMessage,
    abortStream,
    showToast
  });
  const handleSaveWorkspaceInstructions = useCallback(async () => {
    setIsInstructionsSaving(true);
    try {
      await saveWorkspaceMetadata({ instructions: instructionsDraft.trim() || null });
      setIsInstructionsEditing(false);
      showToast('Instruksi Workspace tersimpan.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Instruksi gagal disimpan.', 'error');
    } finally {
      setIsInstructionsSaving(false);
    }
  }, [instructionsDraft, showToast, saveWorkspaceMetadata]);
  const handleSelectWorkspaceTool = useCallback((tool: WorkspaceToolDefinition) => { selectWorkspaceTool(tool); }, [selectWorkspaceTool]);
  const handleRemoveFirstAttachment = useCallback(() => {
    const first = workspaceAttachments[0];
    if (first) void removeAttachment(first);
  }, [removeAttachment, workspaceAttachments]);
  const handleRemoveOneAttachment = useCallback((attachment: typeof workspaceAttachments[number]) => { void removeAttachment(attachment); }, [removeAttachment]);
  const handleSwitchToQuietMode = useCallback(() => onSwitchMode?.('RUANG_TENANG'), [onSwitchMode]);
  const handleSelectCanvasArtifact = useCallback((id: string) => {
    setActiveArtifactId(id);
    setHasUnreadArtifact(false);
  }, [setActiveArtifactId, setHasUnreadArtifact]);
  const handleCloseCanvas = closeWorkspaceInspector;
  const handleToggleCanvas = useCallback(() => setIsCanvasExpanded(previous => !previous), []);
  const handleSetMobileTab = useCallback((tab: WorkspaceTab) => {
    if (tab === 'chat') {
      closeWorkspaceInspector();
    } else if (tab === 'canvas') {
      openWorkspaceInspector('canvas');
      setHasUnreadArtifact(false);
    } else {
      openWorkspaceInspector(tab === 'sources' ? 'sources' : 'context');
    }
  }, [closeWorkspaceInspector, openWorkspaceInspector, setHasUnreadArtifact]);

  useEffect(() => {
    if (workspaceView.inspector !== 'sources' || !workspaceView.selectedSource) return;
    document.querySelector<HTMLElement>('[data-workspace-source-preview]')?.focus();
  }, [workspaceView.inspector, workspaceView.selectedSource]);

  useEffect(() => {
    const onWorkspaceCommand = (event: Event) => {
      const command = (event as CustomEvent<WorkspaceCommandId>).detail;
      if (command === 'open-canvas') handleOpenCanvas();
      else if (command === 'open-files') openWorkspaceInspector('files');
      else if (command === 'open-sources') openWorkspaceInspector('sources');
      else if (command === 'open-plan') openWorkspaceInspector('plan');
      else if (command === 'new-document') {
        createNewArtifact('DOCUMENT');
        handleOpenCanvas();
      } else if (command === 'compare-models') handleCompareModeChange(true);
    };
    window.addEventListener(WORKSPACE_COMMAND_EVENT, onWorkspaceCommand);
    return () => window.removeEventListener(WORKSPACE_COMMAND_EVENT, onWorkspaceCommand);
  }, [createNewArtifact, handleCompareModeChange, handleOpenCanvas, openWorkspaceInspector]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || !isContextPanelOpen && !isCanvasOpen || workspaceView.previewAttachmentId) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      closeWorkspaceInspector();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closeWorkspaceInspector, isCanvasOpen, isContextPanelOpen, workspaceView.previewAttachmentId]);

  useEffect(() => {
    writeWorkspacePromptDraft(getWorkspaceSessionStorage(), promptDraftIdentity, inputText);
  }, [inputText, promptDraftIdentity]);

  return (
    <div 
      className="flex flex-col h-dvh w-full bg-transparent text-slate-800 dark:text-slate-100 overflow-hidden relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Overlay Indicator */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-emerald-900/40 backdrop-blur-xs flex items-center justify-center p-6 animate-fade-in pointer-events-none">
          <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-emerald-500 rounded-2xl p-6 text-center max-w-sm shadow-2xl space-y-2">
            <Paperclip className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto animate-bounce" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Lepaskan Berkas di Sini</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Lampirkan dokumen atau kode langsung ke composer RuangKerja</p>
          </div>
        </div>
      )}

      {/* 1. Header Toolbar */}
      <WorkspaceHeader
        workspaceTitle={workspaceTitle}
        activeArtifact={visibleActiveArtifact}
        isCanvasOpen={isCanvasOpen}
        mobileActiveTab={mobileActiveTab}
        hasUnreadArtifact={hasUnreadArtifact}
        onOpenSidebar={onOpenSidebar}
        onSwitchMode={onSwitchMode}
        onSetMobileActiveTab={handleSetMobileTab}
        onToggleCanvas={() => { if (isCanvasOpen) closeWorkspaceInspector(); else handleOpenCanvas(); }}
        onToggleContext={() => { if (isContextPanelOpen) closeWorkspaceInspector(); else openWorkspaceInspector('context'); }}
        onCreateNewArtifact={(type) => {
          createNewArtifact(type);
          handleOpenCanvas();
        }}
        onOpenTemplateGallery={() => openTemplateModal()}
        onConfirmClearWorkspace={handleClearWorkspaceConversation}
        isClearingConversation={isClearingConversation}
        isPreparingConversation={isStreaming && !effectiveChatId && Boolean(user && user.role !== 'guest')}
      />

      {/* Floating Notification for Mobile when Artifact Updates */}
      {mobileActiveTab === 'chat' && hasUnreadArtifact && visibleActiveArtifact && (
        <div className="xl:hidden absolute top-14 left-3 right-3 z-30 animate-slide-down">
          <div className="bg-slate-900/95 dark:bg-slate-900/95 text-white px-3 py-2 rounded-xl shadow-xl flex items-center justify-between border border-slate-700/80 backdrop-blur-md">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-pulse" />
              <div className="text-xs truncate">
                <span className="font-semibold">Artefak diperbarui:</span>{' '}
                <span className="text-slate-300">{visibleActiveArtifact.title}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                handleSetMobileTab('canvas');
                setHasUnreadArtifact(false);
              }}
              className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shrink-0 ml-2 cursor-pointer"
            >
              Lihat Canvas
            </button>
          </div>
        </div>
      )}

      {/* 2. Main Dual-Pane Workspace */}
      <main className="flex-1 min-h-0 min-w-0 flex overflow-hidden relative">
        {/* LEFT PANE: CONVERSATION & COMPOSER */}
        <section 
          className={`flex flex-col min-h-0 min-w-0 h-full border-r border-slate-200/80 dark:border-slate-800 transition-all duration-200 ${
            isCanvasExpanded 
              ? 'hidden' 
              : isCanvasOpen 
                ? 'w-full xl:flex-[0_0_48%] 2xl:flex-[0_0_45%] shrink-0 bg-white/60 dark:bg-secondary-900/60 backdrop-blur-xs'
                : 'w-full max-w-3xl mx-auto border-r-0 bg-white/45 dark:bg-secondary-900/45 backdrop-blur-xs'
          } ${mobileActiveTab === 'chat' || workspaceView.inspector === 'sources' ? 'flex' : 'hidden xl:flex'}`}
        >
          <WorkspaceConversation
            key={chatId || 'workspace-new'}
            messages={messages}
            isLoading={isLoadingMessages}
            activeStreamingMessage={activeStreamingMessage}
            isStreaming={isStreaming}
            artifacts={artifacts}
            starterTasks={STARTER_TASKS}
            onSelectStarterTask={handleSelectStarterTask}
            onRetryMessage={handleRetryMessage}
            onOpenCanvas={handleOpenCanvas}
            scrollToMessageId={focusedMessageId || undefined}
            onSendToCanvas={handleConversationSendToCanvas}
            comparisonRun={comparisonRun?.workspaceIdentity === logicalWorkspaceIdentity && comparisonRun?.chatId === effectiveChatId ? comparisonRun : null}
            onUseComparisonResponse={handleUseComparisonResponse}
            onComparisonSendToCanvas={handleComparisonSendToCanvas}
            onCompareAgain={handleCompareAgain}
            onOpenSource={openWorkspaceSource}
          />

          <WorkspaceComposer
            activeArtifactType={activeArtifact?.id !== DEFAULT_WELCOME_ARTIFACT_ID ? activeArtifact?.type : null}
            activeArtifactTitle={visibleActiveArtifact?.title || null}
            selectedText={selectedText}
            inputText={inputText}
            setInputText={setInputText}
            onSelectTool={handleSelectWorkspaceTool}
            onInputTextChange={setInputText}
            attachments={workspaceAttachments}
            isStreaming={isStreaming}
            isDisabled={isClearingConversation}
            distressResult={distressResult}
            isDistressDismissed={isDistressDismissed}
            promptPills={ACADEMIC_PROMPT_PILLS}
            selectedModel={selectedModel}
            compareMode={compareMode}
            onCompareModeChange={handleCompareModeChange}
            selectedCompareModels={selectedCompareModels}
            onCompareModelsChange={setSelectedCompareModels}
            maxInputLength={!user || user.role === 'guest' ? 500 : 2000}
            onModelChange={handleModelChange}
            onOpenContext={() => openWorkspaceInspector('context')}
            workspaceContextSummary={workspaceContextSummary}
            modelPreferenceNotice={modelPreferenceNotice}
            fileInputRef={fileInputRef}
            onSendMessage={handleComposerSend}
            onAbortStream={handleAbortWorkspaceRequest}
            onOpenTemplateGallery={openTemplateModal}
            onRemoveAttachedFile={handleRemoveFirstAttachment}
            onRemoveAttachment={handleRemoveOneAttachment}
            onRetryAttachment={retryAttachment}
            onFileUploadChange={handleFileUploadChange}
            onOpenBreathing={openBreathingModal}
            onSwitchToRuangTenang={handleSwitchToQuietMode}
            onDismissDistress={dismissDistress}
            allPresets={allPresets}
            activePreset={activePreset}
            activePresetId={activePresetId}
            presetSummary={activePresetSummary}
            isManualModelOverride={isManualModelOverride}
            onSelectPreset={selectPreset}
            onCreatePreset={createCustomPreset}
            onUpdatePreset={updateCustomPreset}
            onDuplicatePreset={duplicatePreset}
            onDeletePreset={deleteCustomPreset}
            onResetPersonalization={resetPersonalization}
          />
        </section>

        <aside aria-label="Panel RuangKerja" className={`${mobileActiveTab === 'context' || mobileActiveTab === 'sources' ? 'flex' : 'hidden'} ${isContextPanelOpen ? 'xl:flex' : ''} ${workspaceView.inspector === 'sources' ? 'absolute inset-x-0 bottom-0 z-40 h-[min(65dvh,36rem)] rounded-t-2xl shadow-2xl xl:relative xl:inset-auto xl:z-auto xl:h-auto xl:rounded-none xl:shadow-none' : ''} min-h-0 min-w-0 flex-1 flex-col overflow-hidden border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 ${isCanvasExpanded ? 'xl:flex-1' : 'xl:flex-[0_0_48%]'}`}>
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-slate-200 px-3 dark:border-slate-800">
            <div className="flex h-full items-center gap-1 overflow-x-auto" role="tablist" aria-label="Panel Workspace">
              <button type="button" role="tab" aria-selected={workspaceRightTab === 'context'} onClick={() => openWorkspaceInspector('context')} className={`inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-xs font-semibold ${workspaceRightTab === 'context' ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}><Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />Konteks</button>
              <button type="button" role="tab" aria-selected={workspaceRightTab === 'files'} onClick={() => openWorkspaceInspector('files')} className={`min-h-8 rounded-md px-2 text-xs font-semibold ${workspaceRightTab === 'files' ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>File{workspaceAttachments.length > 0 && <span className="ml-1 text-[10px] text-slate-500">{workspaceAttachments.length}</span>}</button>
              <button type="button" role="tab" aria-selected={workspaceRightTab === 'sources'} onClick={() => openWorkspaceInspector('sources')} className={`min-h-8 rounded-md px-2 text-xs font-semibold ${workspaceRightTab === 'sources' ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>Sumber</button>
              <button type="button" role="tab" aria-selected={workspaceRightTab === 'plan'} onClick={() => openWorkspaceInspector('plan')} className={`min-h-8 rounded-md px-2 text-xs font-semibold ${workspaceRightTab === 'plan' ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>Rencana{workspacePlan?.tasks.some(task => task.status === 'running' || task.status === 'waiting_review') && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />}</button>
            </div>
            <button type="button" aria-label="Tutup panel" onClick={closeWorkspaceInspector} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:bg-slate-800"><span aria-hidden="true">×</span></button>
          </div>
          {workspaceRightTab === 'context' ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              <p className="mb-3 text-[11px] text-slate-500">Konteks untuk respons berikutnya. File dan Canvas hanya dikirim jika siap dan diaktifkan.</p>
              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"><p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Konteks aktif</p><p className="mt-1 text-[11px] text-slate-500">{selectedReadyWorkspaceFileCount} dokumen siap · {includeCanvasInContext && visibleActiveArtifact ? visibleActiveArtifact.title : 'Canvas tidak disertakan'} · {selectedText.trim() ? 'teks dipilih disertakan' : 'tanpa teks terpilih'}</p><button type="button" onClick={() => openWorkspaceInspector('files')} className="mt-2 min-h-8 rounded-md px-2 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-200 dark:hover:bg-emerald-950/40">Kelola file konteks</button></div>
              <label className="flex items-center gap-2 border-b border-slate-100 py-3 text-xs font-medium text-slate-700 dark:border-slate-800 dark:text-slate-200"><input type="checkbox" checked={includeCanvasInContext} onChange={event => setIncludeCanvasInContext(event.target.checked)} className="accent-emerald-600" />Gunakan Canvas aktif <span className="ml-auto max-w-[55%] truncate text-[10px] font-normal text-slate-500">{visibleActiveArtifact?.title || 'Belum ada Canvas'}</span></label>
              <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Instruksi Workspace</p><p className="mt-1 text-[11px] text-slate-500">{workspaceData?.instructions || 'Belum ada instruksi khusus.'}</p></div><button type="button" disabled={!workspaceData || workspaceMetadata.pendingIds.includes('workspace')} onClick={() => setIsInstructionsEditing(open => !open)} className="shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-300 dark:hover:bg-emerald-950">{isInstructionsEditing ? 'Batal' : 'Ubah'}</button></div>
                {isInstructionsEditing && <div className="mt-2 grid gap-2"><textarea value={instructionsDraft} onChange={event => setInstructionsDraft(event.target.value.slice(0, 4000))} maxLength={4000} rows={4} aria-label="Instruksi Workspace" placeholder="Contoh: Gunakan IEEE dan bahasa Indonesia formal." className="w-full resize-y rounded-md border border-slate-200 bg-white p-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950" /><div className="flex items-center justify-between"><span className="text-[10px] text-slate-500">{instructionsDraft.length}/4000</span><button type="button" disabled={isInstructionsSaving} onClick={() => void handleSaveWorkspaceInstructions()} className="rounded-md bg-emerald-700 px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50">{isInstructionsSaving ? 'Menyimpan…' : 'Simpan'}</button></div></div>}
              </div>
              {workspaceMetadata.error && <p role="status" className="mt-3 text-[11px] text-amber-700 dark:text-amber-300">{workspaceMetadata.error}</p>}
            </div>
          ) : workspaceRightTab === 'files' ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3" role="tabpanel" aria-label="File Workspace">
              <div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="text-xs font-semibold text-slate-800 dark:text-slate-100">Dokumen konteks</h2><p className="mt-1 text-[11px] text-slate-500">File hanya digunakan setelah statusnya Siap dan disertakan.</p></div><button type="button" onClick={() => fileInputRef.current?.click()} className="min-h-9 shrink-0 rounded-lg bg-emerald-700 px-3 text-[11px] font-semibold text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">Tambah file</button></div>
              {isLoadingAttachments ? <p role="status" className="rounded-lg border border-slate-200 px-3 py-5 text-center text-xs text-slate-500 dark:border-slate-700">Memuat dokumen Workspace…</p> : workspaceAttachments.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center dark:border-slate-700"><p className="text-xs font-medium text-slate-700 dark:text-slate-200">Belum ada dokumen</p><p className="mt-1 text-[11px] text-slate-500">Tambahkan file untuk dianalisis bersama AI.</p></div> : <ul className="divide-y divide-slate-100 dark:divide-slate-800">{workspaceAttachments.map(file => {
                const ready = file.status === 'ready' && Boolean(file.id);
                const status = file.status === 'ready' ? 'Siap' : file.status === 'uploading' ? 'Mengunggah…' : file.status === 'processing' ? 'Memproses…' : file.status === 'unsupported' ? 'Tidak didukung' : 'Gagal';
                return <li key={file.id || file.clientId || file.name} className="flex min-w-0 items-center gap-2 py-2.5"><input type="checkbox" aria-label={`Gunakan ${file.name} sebagai konteks`} disabled={!ready} checked={ready && selectedWorkspaceFileIds.includes(file.id!)} onChange={event => { if (event.target.checked) setIncludeFilesInContext(true); setSelectedWorkspaceFileIds(current => event.target.checked ? [...new Set([...current, file.id!])] : current.filter(id => id !== file.id)); }} className="accent-emerald-600 disabled:opacity-40" /><FileText className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block truncate text-xs text-slate-700 dark:text-slate-200">{file.name}</span><span className={`text-[10px] ${ready ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500'}`}>{status}{file.status === 'ready' && includeFilesInContext ? selectedWorkspaceFileIds.includes(file.id!) ? ' · Disertakan' : ' · Tidak disertakan' : ''}{file.status === 'ready' && !includeFilesInContext ? ' · Konteks dinonaktifkan' : ''}{file.errorMessage ? ` · ${file.errorMessage}` : ''}</span></span>{ready && <button type="button" aria-label={`Pratinjau ${file.name}`} onClick={() => openWorkspaceFilePreview(file.id!)} className="min-h-8 rounded px-2 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-300 dark:hover:bg-emerald-950/40">Preview</button>}</li>;
              })}</ul>}
              <label className="mt-3 flex min-h-10 items-center gap-2 border-t border-slate-100 pt-2 text-xs font-medium text-slate-700 dark:border-slate-800 dark:text-slate-200"><input type="checkbox" checked={includeFilesInContext} onChange={event => setIncludeFilesInContext(event.target.checked)} className="accent-emerald-600" />Sertakan file terpilih pada respons berikutnya <span className="ml-auto text-[10px] text-slate-500">{selectedReadyWorkspaceFileCount} aktif</span></label>
            </div>
          ) : workspaceRightTab === 'sources' ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2" role="tabpanel" aria-label="Sumber">{workspaceView.selectedSource && <WorkspaceSourcePreview source={workspaceView.selectedSource} onOpenDocument={openWorkspaceFilePreview} onClose={() => dispatchWorkspaceView({ type: 'clear-source-preview' })} />}<WorkspaceSourceLibrary chatId={effectiveChatId} onPreview={openWorkspaceFilePreview} /></div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto" role="tabpanel" aria-label="Rencana"><WorkspaceTasksPanel
              plan={workspacePlan}
              workspaceKey={logicalWorkspaceIdentity}
              isLoading={workspaceMetadata.isLoading}
              canPersist={Boolean(workspaceData)}
              isGenerating={taskGenerationRequestsRef.current.size > 0 && isStreaming}
              isExecuting={Boolean(workspacePlan?.tasks.some(task => task.status === 'running')) && isStreaming}
              modelOptions={models.map(model => ({ id: model.id, name: model.name }))}
              onOpenArtifact={id => { handleSelectCanvasArtifact(id); handleOpenCanvas(); }}
              onOpenSource={openWorkspaceSource}
              onAcceptReview={handleAcceptTaskReview}
              onRejectReview={handleRejectTaskReview}
              onUpdate={updateWorkspacePlan}
              onRun={(taskId, feedback) => void handleRunWorkspaceTask(taskId, feedback)}
              onGenerate={handleGenerateWorkspaceTasks}
              onCancel={handleCancelWorkflow}
              onComplete={handleCompleteWorkflow}
              focusedTaskId={focusedTaskId || undefined}
              hideHeader
            /></div>
          )}
        </aside>

        {/* RIGHT PANE: LIVE ARTIFACT CANVAS */}
        <WorkspaceCanvasPane
          artifacts={canvasArtifacts}
          activeArtifact={visibleActiveArtifact}
          draftContent={visibleActiveArtifact && canvasDraft?.artifactId === visibleActiveArtifact.id ? canvasDraft?.content : undefined}
          scrollStorageKey={canvasScrollStorageKey}
          activeArtifactId={activeArtifactId}
          isCanvasOpen={isCanvasOpen && !isContextPanelOpen}
          isCanvasExpanded={isCanvasExpanded}
          isStreaming={isStreaming}
          isCreatingArtifact={isCreatingArtifact}
          hasWorkspaceChat={Boolean(effectiveChatId)}
          mobileActiveTab={mobileActiveTab}
          onSelectArtifact={handleSelectCanvasArtifact}
          onCloseCanvas={handleCloseCanvas}
          onToggleExpand={handleToggleCanvas}
          onUpdateActiveArtifact={updateActiveArtifact}
          onSaveArtifact={saveArtifact}
          onRollbackVersion={rollbackArtifact}
          onRequestRevision={handleRequestRevision}
          onSelectTool={selectWorkspaceTool}
          onCreateNewArtifact={createNewArtifact}
          onDuplicateArtifact={duplicateArtifact}
          onDeleteArtifact={deleteArtifact}
          onSelectedTextChange={setSelectedText}
          onSelectionChange={setCanvasSelection}
          onRequestInlineEdit={handleRequestInlineEdit}
          inlineEditPatch={inlineEditPatch}
          onDismissInlineEdit={handleDismissInlineEdit}
          onDraftContentChange={handleCanvasDraftChange}
          revisionCommit={revisionCommit}
          onSetMobileActiveTab={handleSetMobileTab}
        />
      </main>

      {pendingCanvasTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setPendingCanvasTransfer(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="canvas-transfer-title" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); setPendingCanvasTransfer(null); } }} className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <h2 id="canvas-transfer-title" className="text-sm font-semibold text-slate-900 dark:text-slate-100">Kirim jawaban ke Canvas</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{visibleActiveArtifact ? `Pilih cara menggunakan jawaban pada “${visibleActiveArtifact.title}”.` : 'Jawaban ini akan disimpan sebagai dokumen baru.'}</p>
            <div className="mt-4 grid gap-2">
              <button autoFocus type="button" onClick={() => void handleApplyCanvasTransfer('create')} className="rounded-lg bg-emerald-600 px-3 py-2 text-left text-xs font-semibold text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">Buat dokumen baru</button>
              {visibleActiveArtifact && <>
                <button type="button" onClick={() => void handleApplyCanvasTransfer('replace')} className="rounded-lg border border-slate-200 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Ganti isi dokumen aktif</button>
                <button type="button" onClick={() => void handleApplyCanvasTransfer('append')} className="rounded-lg border border-slate-200 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Tambahkan di akhir dokumen</button>
              </>}
              <button type="button" onClick={() => setPendingCanvasTransfer(null)} className="rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Batal</button>
            </div>
          </section>
        </div>
      )}

      {pendingRevision && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/45 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="revision-preview-title" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); setPendingRevision(null); } }} className="flex max-h-[85dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <header className="border-b border-slate-200 p-4 dark:border-slate-700">
              <h2 id="revision-preview-title" className="text-sm font-semibold text-slate-900 dark:text-slate-100">Tinjau revisi: {pendingRevision.title}</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Periksa bagian yang dihapus dan ditambahkan sebelum menerapkan versi baru.</p>
            </header>
            {pendingRevisionConflict && <p role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">Dokumen berubah sejak revisi dimulai. Coba ulang revisi.</p>}
            <div className="grid min-h-0 flex-1 gap-3 overflow-auto p-4 md:grid-cols-2">
              <div className="min-h-40 rounded-xl border border-rose-200 bg-rose-50/60 p-3 dark:border-rose-900/60 dark:bg-rose-950/20">
                <h3 className="mb-2 text-xs font-semibold text-rose-700 dark:text-rose-300">− Dihapus</h3>
                <pre className="whitespace-pre-wrap wrap-break-word text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">{pendingRevision.baseContent || '(kosong)'}</pre>
              </div>
              <div className="min-h-40 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                <h3 className="mb-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">+ Ditambahkan</h3>
                <pre className="whitespace-pre-wrap wrap-break-word text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">{pendingRevision.proposedContent || '(kosong)'}</pre>
              </div>
            </div>
            <footer className="flex justify-end gap-2 border-t border-slate-200 p-3 dark:border-slate-700">
              <button type="button" onClick={() => setPendingRevision(null)} className="rounded-lg px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Batal</button>
              <button type="button" disabled={pendingRevisionConflict} onClick={() => void handleApplyRevision()} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">Terapkan revisi</button>
            </footer>
          </section>
        </div>
      )}

      {/* Template Gallery Modal */}
      <WorkspaceTemplateModal
        template={selectedTemplateForModal}
        snippet={templateInputSnippet}
        onSnippetChange={setTemplateInputSnippet}
        onClose={closeTemplateModal}
        onSubmit={(template, snippet) => {
          let finalPrompt = template.prompt;
          if (snippet) finalPrompt += `\n${snippet}`;
          handleExecuteSendMessage(finalPrompt);
          closeTemplateModal();
        }}
      />

      {/* 1-Minute Micro-Regulation Modal */}
      <MicroBreathingModal
        isOpen={isBreathingModalOpen}
        onClose={closeBreathingModal}
        reason={distressResult.suggestedAction || 'Jeda relaksasi untuk memulihkan kejernihan berpikir sebelum melanjutkan tugas.'}
      />
      <WorkspaceToolConfigModal
        tool={pendingTool?.tool ?? null}
        onCancel={() => setPendingTool(null)}
        onExecute={(input) => {
          const selected = pendingTool;
          setPendingTool(null);
          if (selected) void executeWorkspaceTool(selected.tool, input, selected.artifact);
        }}
      />
      {previewAttachmentId && <React.Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><div role="status" className="rounded-xl bg-white px-4 py-3 text-sm text-slate-600 shadow-xl dark:bg-slate-900 dark:text-slate-300">Memuat pratinjau file…</div></div>}>
        <WorkspaceFilePreviewModal attachmentId={previewAttachmentId} onClose={() => dispatchWorkspaceView({ type: 'close-file-preview' })} onArtifactCreated={artifact => { dispatchWorkspaceView({ type: 'close-file-preview' }); setArtifacts(current => [artifact, ...current.filter(item => item.id !== artifact.id)]); setActiveArtifactId(artifact.id); setHasUnreadArtifact(false); openWorkspaceInspector('canvas'); }} />
      </React.Suspense>}
    </div>
  );
}

export default StudentWorkspace;
