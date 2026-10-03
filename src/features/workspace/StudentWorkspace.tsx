import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Paperclip, Sparkles } from 'lucide-react';
import { WorkspaceMode, WorkspaceArtifact, WorkspaceTab, WorkspaceComposerConfig, WorkspaceComparisonCandidate, WorkspaceComparisonRun, WorkspaceRequestSnapshot, WorkspaceArtifactSelection, ArtifactPatch } from './types';
import { UserSession } from '../../types';
import { Chat, Message } from '../chat/types';
import { STARTER_TASKS, ACADEMIC_PROMPT_PILLS } from './constants/workspaceConstants';

// Custom Domain Hooks
import { useWorkspacePersistence } from './hooks/useWorkspacePersistence';
import { useWorkspaceArtifacts } from './hooks/useWorkspaceArtifacts';
import { useWorkspaceStreaming } from './hooks/useWorkspaceStreaming';
import { useWorkspaceFileIngestion } from './hooks/useWorkspaceFileIngestion';
import { useAcademicDistress } from './hooks/useAcademicDistress';
import { useWorkspaceTemplates } from './hooks/useWorkspaceTemplates';

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
import { useToast } from '../../components/Toast';
import { getModeChatPath } from './utils/workspaceRouting';
import { apiClient } from '../../lib/apiClient';
import { buildWorkspaceContextNote, buildWorkspaceRequestSnapshot } from './utils/workspaceContext';
import { getArtifactSelectionContext } from './utils/artifactPatch';

export interface StudentWorkspaceProps {
  user: UserSession | null;
  chats?: Chat[];
  setChats?: React.Dispatch<React.SetStateAction<Chat[]>>;
  onSwitchMode?: (mode: WorkspaceMode) => void;
  onOpenSidebar?: () => void;
  onOpenSettings?: () => void;
  onOpenChangelog?: () => void;
}

export function StudentWorkspace({ 
  user, 
  chats,
  setChats,
  onSwitchMode, 
  onOpenSidebar 
}: StudentWorkspaceProps) {
  const { chatId } = useParams<{ chatId?: string }>();
  const navigate = useNavigate();
  const { models, defaultModel } = useAiModelCatalog();
  const { showToast } = useToast();
  const [streamCreatedChatId, setStreamCreatedChatId] = useState<string>();
  const effectiveChatId = chatId || streamCreatedChatId;
  const workspaceTitle = chats?.find(chat => chat.id === effectiveChatId)?.title || 'Workspace baru';
  const effectiveChatIdRef = React.useRef(effectiveChatId);
  const lastRouteChatIdRef = React.useRef(chatId);
  const clearInProgressRef = React.useRef(false);
  effectiveChatIdRef.current = effectiveChatId;

  // 1. Domain Persistence Hook
  const {
    messages,
    setMessages,
    persistedArtifacts,
    isLoadingMessages,
    clearWorkspaceConversation,
    isClearingConversation
  } = useWorkspacePersistence({
    chatId: effectiveChatId,
    userName: user?.name
  });

  // 2. Domain Artifacts Hook
  const {
    artifacts,
    activeArtifact,
    activeArtifactId,
    setActiveArtifactId,
    hasUnreadArtifact,
    setHasUnreadArtifact,
    updateActiveArtifact,
    saveArtifact,
    rollbackArtifact,
    createNewArtifact,
    createArtifactFromContent,
    duplicateArtifact,
    deleteArtifact,
    syncParsedMessageArtifacts
  } = useWorkspaceArtifacts({
    chatId: effectiveChatId,
    persistedArtifacts
  });
  const canvasArtifacts = artifacts.filter(artifact => artifact.id !== DEFAULT_WELCOME_ARTIFACT_ID);
  const visibleActiveArtifact = activeArtifact?.id === DEFAULT_WELCOME_ARTIFACT_ID ? null : activeArtifact;


  // 3. UI Layout & View States
  const [isCanvasOpen, setIsCanvasOpen] = useState<boolean>(true);
  const [isCanvasExpanded, setIsCanvasExpanded] = useState<boolean>(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<WorkspaceTab>('chat');
  const [inputText, setInputText] = useState<string>('');
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
  const [comparisonRun, setComparisonRun] = useState<WorkspaceComparisonRun | null>(null);
  const [pendingTool, setPendingTool] = useState<{ tool: WorkspaceToolDefinition; artifact: WorkspaceArtifact | null } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [canvasSelection, setCanvasSelection] = useState<WorkspaceArtifactSelection | null>(null);
  const [canvasDraft, setCanvasDraft] = useState<{ artifactId: string; content: string } | null>(null);
  const [pendingRevision, setPendingRevision] = useState<{ artifactId: string; title: string; baseContent: string; baseVersion: number; proposedContent: string } | null>(null);
  const [inlineEditPatch, setInlineEditPatch] = useState<ArtifactPatch | null>(null);
  const [revisionCommit, setRevisionCommit] = useState<{ artifactId: string; content: string; version: number } | null>(null);
  const [isCreatingArtifact, setIsCreatingArtifact] = useState(false);
  const [pendingCanvasTransfer, setPendingCanvasTransfer] = useState<{ content: string; title: string } | null>(null);
  const revisionRequestRef = React.useRef<{ scope: 'document' | 'selection'; artifactId: string; title: string; baseContent: string; baseVersion: number; workspaceId?: string; selection?: WorkspaceArtifactSelection } | null>(null);
  const requestSnapshotsRef = React.useRef(new Map<string, { snapshot: WorkspaceRequestSnapshot; attachments?: StoredAttachment[]; customSystemNote?: string; revisionRequest?: NonNullable<typeof revisionRequestRef.current> }>());

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
    const createdFromCurrentStream = !lastRouteChatIdRef.current && Boolean(chatId && effectiveChatIdRef.current === chatId);
    lastRouteChatIdRef.current = chatId;
    setComparisonRun(null);
    if (createdFromCurrentStream) return;
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
  }, [chatId]);

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
    isDraggingOver,
    fileInputRef,
    handleFileUploadChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    removeAttachment,
    retryAttachment
  } = useWorkspaceFileIngestion(chatId);

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
  const handleChatIdReceived = useCallback((createdChatId: string) => {
    if (chatId) return;
    effectiveChatIdRef.current = createdChatId;
    setStreamCreatedChatId(createdChatId);
  }, [chatId]);

  const handleChatCreated = useCallback((createdChatId: string) => {
    if (chatId || !createdChatId) return;
    navigate(getModeChatPath('RUANG_KERJA', createdChatId), { replace: true });
    void apiClient.get<Chat[]>('/api/v1/chat/history').then(response => {
      if (response.success && Array.isArray(response.data)) setChats?.(response.data);
    }).catch(error => console.warn('[Workspace] Chat list refresh failed:', error));
  }, [chatId, navigate, setChats]);

  const handleStreamArtifactExtracted = useCallback((_artifact: WorkspaceArtifact) => {
    if (revisionRequestRef.current) return;
    setIsCanvasOpen(true);
    setIsCreatingArtifact(true);
  }, []);

  const handleStreamCompleted = useCallback(async (assistantMsg: Message, extractedArtifacts: WorkspaceArtifact[]) => {
    setIsCreatingArtifact(false);
    const revisionRequest = revisionRequestRef.current;
    if (revisionRequest && revisionRequest.workspaceId === effectiveChatIdRef.current && !assistantMsg.error) {
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
        setMessages(previous => [...previous, { ...assistantMsg, content: `Usulan untuk teks terpilih di “${revisionRequest.title}” siap ditinjau di Canvas.` }]);
        return;
      }
      if (proposal && !assistantMsg.error) {
        setPendingRevision({ ...revisionRequest, proposedContent: proposal.content });
        setMessages(previous => [...previous, { ...assistantMsg, content: `Usulan revisi untuk “${revisionRequest.title}” sudah siap. Tinjau perbedaan di Canvas sebelum menerapkan.` }]);
        return;
      }
    }
    let artifactsPersisted = true;
    if (extractedArtifacts.length > 0) {
      setHasUnreadArtifact(true);
      setIsCanvasOpen(true);
      artifactsPersisted = await syncParsedMessageArtifacts(extractedArtifacts, effectiveChatIdRef.current);
      setActiveArtifactId(extractedArtifacts[0].id);
    }
    const finalMessage = !artifactsPersisted && extractedArtifacts.length
      ? { ...assistantMsg, content: `${assistantMsg.content.replace(/Artefak Aktif[^\n]*/g, 'Draf dokumen dibuat secara lokal')}\n\nDokumen belum tersimpan ke server. Draf tetap tersedia di Canvas; coba simpan lagi.` }
      : assistantMsg;
    setMessages(prev => [...prev, finalMessage]);
  }, [setMessages, setHasUnreadArtifact, syncParsedMessageArtifacts, setActiveArtifactId]);

  const {
    isStreaming,
    activeStreamingMessage,
    sendMessageStream,
    abortStream
  } = useWorkspaceStreaming({
    chatId,
    onChatIdReceived: handleChatIdReceived,
    onChatCreated: handleChatCreated,
    onStreamArtifactExtracted: handleStreamArtifactExtracted,
    onStreamCompleted: handleStreamCompleted
  });

  useEffect(() => {
    if (!isStreaming) setIsCreatingArtifact(false);
  }, [isStreaming]);

  // User Actions
  const handleExecuteSendMessage = useCallback((promptText: string, customSystemNote?: string, attachments?: StoredAttachment[], config?: WorkspaceComposerConfig, existingSnapshot?: WorkspaceRequestSnapshot, isRetry = false, scopedSelection?: WorkspaceArtifactSelection) => {
    if (!promptText.trim() || isStreaming || clearInProgressRef.current) return;
    if (!isRetry && !customSystemNote?.startsWith('Instruksi revisi dokumen') && !customSystemNote?.startsWith('Instruksi revisi inline')) revisionRequestRef.current = null;

    if (config?.comparisonModelIds?.length) {
      if (config.comparisonModelIds.length < 2 || config.comparisonModelIds.length > 3) return;
      const compId = crypto.randomUUID();
      const snapId = crypto.randomUUID();
      setComparisonRun({
        comparisonId: compId,
        snapshotId: snapId,
        chatId,
        prompt: promptText.trim(),
        selectedModelIds: [...new Set(config.comparisonModelIds)],
        responseStyle: `${config.responseMode}${config.responseStyle !== 'Default' ? `; ${config.responseStyle}` : ''}`,
        presetId: config.presetId,
        taskCategory: config.taskCategory,
        latencyPreference: config.latencyPreference,
        qualityPreference: config.qualityPreference,
        activeContext: activeArtifact && activeArtifact.id !== DEFAULT_WELCOME_ARTIFACT_ID
          ? { title: activeArtifact.title, content: activeArtifact.content.slice(0, 50000) }
          : undefined,
        attachments: attachments && attachments.length > 0 ? attachments : undefined,
        createdAt: new Date().toISOString()
      });
      return;
    }

    setComparisonRun(null);

    const resolvedConfig = config ?? { aiModel: selectedModel, responseMode: 'Seimbang' as const, responseStyle: 'Default' as const };
    const activeContent = activeArtifact && activeArtifact.id !== DEFAULT_WELCOME_ARTIFACT_ID
      ? canvasDraft?.artifactId === activeArtifact.id ? canvasDraft.content : activeArtifact.content
      : undefined;
    const snapshot = existingSnapshot ?? buildWorkspaceRequestSnapshot({
      prompt: promptText,
      workspaceId: effectiveChatIdRef.current,
      model: selectedModel,
      config: resolvedConfig,
      files: scopedSelection ? [] : workspaceAttachments.filter(file => file.status === 'ready').map(file => ({ id: file.id, name: file.name })),
      artifact: activeArtifact && activeArtifact.id !== DEFAULT_WELCOME_ARTIFACT_ID ? {
        id: activeArtifact.id, title: activeArtifact.title, type: activeArtifact.type,
        version: activeArtifact.version, content: scopedSelection && activeContent
          ? getArtifactSelectionContext(activeContent, scopedSelection.start, scopedSelection.end)
          : activeContent || activeArtifact.content
      } : undefined,
      selectedText: scopedSelection?.text || (selectedText && activeArtifact?.id !== DEFAULT_WELCOME_ARTIFACT_ID ? selectedText : undefined)
    });
    requestSnapshotsRef.current.set(promptText.trim(), { snapshot, attachments, customSystemNote, revisionRequest: revisionRequestRef.current ? { ...revisionRequestRef.current } : undefined });
    const contextualNote = [customSystemNote, buildWorkspaceContextNote(snapshot)].filter(Boolean).join('\n\n');
    if (!isRetry) {
      setMessages(prev => [...prev, {
        id: `user_${snapshot.requestId}`, role: 'user', content: promptText.trim(), createdAt: new Date(snapshot.createdAt),
        attachments: attachments && attachments.length > 0 ? attachments : undefined
      }]);
    }
    setSelectedText('');
    sendMessageStream(promptText.trim(), contextualNote || undefined, attachments, resolvedConfig);
  }, [activeArtifact, canvasDraft, chatId, isStreaming, selectedModel, selectedText, setMessages, sendMessageStream, workspaceAttachments]);

  const handleUseComparisonResponse = useCallback(async (run: WorkspaceComparisonRun, candidate: WorkspaceComparisonCandidate) => {
    if (run.chatId !== chatId || candidate.status !== 'completed' || !candidate.output) return;
    const { cleanedText, artifacts: selectedArtifacts } = parseArtifactsFromText(candidate.output, false);
    const messageTime = new Date();
    let artifactsPersisted = true;
    if (selectedArtifacts.length > 0) {
      setIsCanvasOpen(true);
      setHasUnreadArtifact(true);
      artifactsPersisted = await syncParsedMessageArtifacts(selectedArtifacts, chatId);
      setActiveArtifactId(selectedArtifacts[0].id);
    }
    const responseText = cleanedText || candidate.output;
    setMessages(previous => [...previous,
      { id: `compare_user_${run.comparisonId}`, role: 'user', content: run.prompt, createdAt: messageTime },
      { id: `compare_answer_${run.comparisonId}_${candidate.modelId}`, role: 'assistant', content: !artifactsPersisted && selectedArtifacts.length ? `${responseText}\n\nDokumen belum tersimpan ke server. Draf tetap tersedia di Canvas; coba simpan lagi.` : responseText, modelUsed: candidate.modelId, createdAt: new Date() }
    ]);
    if (chatId && user) {
      void fetch('/api/v1/chat/compare/select', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', ...(document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/)?.[1] ? { 'X-CSRF-Token': decodeURIComponent(document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/)![1]) } : {}) },
        body: JSON.stringify({ chatId, prompt: run.prompt, response: candidate.output, modelId: candidate.modelId })
      }).catch(error => console.warn('[WorkspaceComparison] Could not persist selected response:', error));
    }
  }, [chatId, setActiveArtifactId, setHasUnreadArtifact, setMessages, syncParsedMessageArtifacts, user]);

  const handleComparisonSendToCanvas = useCallback((candidate: WorkspaceComparisonCandidate) => {
    if (!candidate.output) return;
    setPendingCanvasTransfer({ content: candidate.output, title: `Comparison · ${candidate.modelName}` });
  }, []);

  const handleConversationSendToCanvas = useCallback((content: string) => {
    if (!content.trim()) return;
    setPendingCanvasTransfer({ content: content.trim(), title: 'Jawaban AI' });
  }, []);

  const handleCompareAgain = useCallback((run: WorkspaceComparisonRun) => {
    setComparisonRun({
      ...run,
      comparisonId: crypto.randomUUID(),
      chatId,
      activeContext: activeArtifact && activeArtifact.id !== DEFAULT_WELCOME_ARTIFACT_ID
        ? { title: activeArtifact.title, content: activeArtifact.content.slice(0, 50000) }
        : undefined
    });
  }, [activeArtifact, chatId]);

  const handleRetryMessage = useCallback((lastUserPrompt: string, errorMsgId: string) => {
    setMessages(prev => prev.filter(m => m.id !== errorMsgId));
    const saved = requestSnapshotsRef.current.get(lastUserPrompt.trim());
    revisionRequestRef.current = saved?.revisionRequest ? { ...saved.revisionRequest } : null;
    handleExecuteSendMessage(lastUserPrompt, saved?.customSystemNote, saved?.attachments, saved?.snapshot.config, saved?.snapshot, true);
  }, [setMessages, handleExecuteSendMessage]);

  const handleApplyCanvasTransfer = useCallback(async (mode: 'create' | 'replace' | 'append') => {
    if (!pendingCanvasTransfer) return;
    try {
      if (mode === 'create' || !visibleActiveArtifact) {
        const success = await createArtifactFromContent(pendingCanvasTransfer.content, pendingCanvasTransfer.title);
        if (!success) return;
      } else {
        const content = mode === 'append'
          ? `${visibleActiveArtifact.content.trim()}\n\n${pendingCanvasTransfer.content}`
          : pendingCanvasTransfer.content;
        await saveArtifact(content, visibleActiveArtifact.title, true);
        showToast(mode === 'append' ? 'Jawaban ditambahkan ke Canvas' : 'Dokumen Canvas diperbarui', 'success');
      }
      setIsCanvasOpen(true);
      setMobileActiveTab('canvas');
      setPendingCanvasTransfer(null);
    } catch {
      showToast('Gagal menyimpan perubahan ke Canvas. Coba lagi.', 'error');
    }
  }, [createArtifactFromContent, pendingCanvasTransfer, saveArtifact, showToast, visibleActiveArtifact]);

  const handleApplyRevision = useCallback(async () => {
    if (!pendingRevision || !visibleActiveArtifact || visibleActiveArtifact.id !== pendingRevision.artifactId) {
      showToast('Dokumen berubah sejak revisi dimulai. Coba ulang revisi.', 'error');
      return;
    }
    const currentDraft = canvasDraft?.artifactId === pendingRevision.artifactId ? canvasDraft.content : visibleActiveArtifact.content;
    if (visibleActiveArtifact.version !== pendingRevision.baseVersion || currentDraft !== pendingRevision.baseContent) {
      showToast('Dokumen berubah sejak revisi dimulai. Coba ulang revisi.', 'error');
      setPendingRevision(null);
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
      showToast('Revisi diterapkan dan versi baru tersimpan.', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Revisi gagal disimpan';
      if (message.includes('berubah')) {
        setPendingRevision(null);
        showToast('Dokumen berubah sejak revisi dimulai. Coba ulang revisi.', 'error');
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
    try {
      const cleared = await clearWorkspaceConversation(targetChatId);
      if (!chatId && targetChatId) navigate(getModeChatPath('RUANG_KERJA', targetChatId), { replace: true });
      if (!cleared) return false;
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
    revisionRequestRef.current = null;
    abortStream();
  }, [abortStream]);

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
          await saveArtifact(result.proposedContent, usableArtifact.title, true);
          showToast(`Aksi "${tool.name}" berhasil diterapkan. Versi sebelumnya tersimpan.`, 'success');
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

  return (
    <div 
      className="flex flex-col h-dvh w-full bg-slate-50/60 dark:bg-[#0B101B] text-slate-800 dark:text-slate-100 overflow-hidden relative"
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
        onSetMobileActiveTab={(tab) => {
          setMobileActiveTab(tab);
          if (tab === 'canvas') setHasUnreadArtifact(false);
        }}
        onToggleCanvas={() => setIsCanvasOpen(prev => !prev)}
        onCreateNewArtifact={(type) => {
          createNewArtifact(type);
          setIsCanvasOpen(true);
          setMobileActiveTab('canvas');
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
                setMobileActiveTab('canvas');
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
          className={`flex flex-col min-h-0 min-w-0 h-full bg-white dark:bg-[#0F172A] border-r border-slate-200/80 dark:border-slate-800 transition-all duration-200 ${
            isCanvasExpanded 
              ? 'hidden' 
              : isCanvasOpen 
                ? 'w-full xl:flex-[0_0_48%] 2xl:flex-[0_0_45%] shrink-0'
                : 'w-full max-w-3xl mx-auto border-r-0'
          } ${mobileActiveTab === 'chat' ? 'flex' : 'hidden xl:flex'}`}
        >
          <WorkspaceConversation
            key={chatId || 'workspace-new'}
            messages={messages}
            isLoading={isLoadingMessages}
            activeStreamingMessage={activeStreamingMessage}
            isStreaming={isStreaming}
            artifacts={artifacts}
            starterTasks={STARTER_TASKS}
            onSelectStarterTask={(prompt) => handleExecuteSendMessage(prompt)}
            onRetryMessage={handleRetryMessage}
            onOpenCanvas={() => {
              setIsCanvasOpen(true);
              setMobileActiveTab('canvas');
              setHasUnreadArtifact(false);
            }}
            onSendToCanvas={handleConversationSendToCanvas}
            comparisonRun={comparisonRun?.chatId === chatId ? comparisonRun : null}
            onUseComparisonResponse={handleUseComparisonResponse}
            onComparisonSendToCanvas={handleComparisonSendToCanvas}
            onCompareAgain={handleCompareAgain}
          />

          <WorkspaceComposer
            activeArtifactType={activeArtifact?.id !== DEFAULT_WELCOME_ARTIFACT_ID ? activeArtifact?.type : null}
            activeArtifactTitle={visibleActiveArtifact?.title || null}
            selectedText={selectedText}
            onSelectTool={(tool) => selectWorkspaceTool(tool)}
            inputText={inputText}
            setInputText={setInputText}
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
            modelPreferenceNotice={modelPreferenceNotice}
            fileInputRef={fileInputRef}
            onSendMessage={(prompt, atts, config) => handleExecuteSendMessage(prompt, undefined, atts, config)}
            onAbortStream={handleAbortWorkspaceRequest}
            onOpenTemplateGallery={() => openTemplateModal()}
            onRemoveAttachedFile={() => {
              const first = workspaceAttachments[0];
              if (first) void removeAttachment(first);
            }}
            onRemoveAttachment={attachment => { void removeAttachment(attachment); }}
            onRetryAttachment={retryAttachment}
            onFileUploadChange={handleFileUploadChange}
            onOpenBreathing={openBreathingModal}
            onSwitchToRuangTenang={() => onSwitchMode?.('RUANG_TENANG')}
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

        {/* RIGHT PANE: LIVE ARTIFACT CANVAS */}
        <WorkspaceCanvasPane
          artifacts={canvasArtifacts}
          activeArtifact={visibleActiveArtifact}
          activeArtifactId={activeArtifactId}
          isCanvasOpen={isCanvasOpen}
          isCanvasExpanded={isCanvasExpanded}
          isStreaming={isStreaming}
          isCreatingArtifact={isCreatingArtifact}
          mobileActiveTab={mobileActiveTab}
          onSelectArtifact={(id) => {
            setActiveArtifactId(id);
            setHasUnreadArtifact(false);
          }}
          onCloseCanvas={() => setIsCanvasOpen(false)}
          onToggleExpand={() => setIsCanvasExpanded(prev => !prev)}
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
          onSetMobileActiveTab={(tab) => {
            setMobileActiveTab(tab);
            if (tab === 'canvas') setHasUnreadArtifact(false);
          }}
        />
      </main>

      {pendingCanvasTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setPendingCanvasTransfer(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="canvas-transfer-title" className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="revision-preview-title" className="flex max-h-[85dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <header className="border-b border-slate-200 p-4 dark:border-slate-700">
              <h2 id="revision-preview-title" className="text-sm font-semibold text-slate-900 dark:text-slate-100">Tinjau revisi: {pendingRevision.title}</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Periksa bagian yang dihapus dan ditambahkan sebelum menerapkan versi baru.</p>
            </header>
            {pendingRevisionConflict && <p role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">Dokumen berubah sejak revisi dimulai. Coba ulang revisi.</p>}
            <div className="grid min-h-0 flex-1 gap-3 overflow-auto p-4 md:grid-cols-2">
              <div className="min-h-40 rounded-xl border border-rose-200 bg-rose-50/60 p-3 dark:border-rose-900/60 dark:bg-rose-950/20">
                <h3 className="mb-2 text-xs font-semibold text-rose-700 dark:text-rose-300">− Dihapus</h3>
                <pre className="whitespace-pre-wrap break-words text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">{pendingRevision.baseContent || '(kosong)'}</pre>
              </div>
              <div className="min-h-40 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                <h3 className="mb-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">+ Ditambahkan</h3>
                <pre className="whitespace-pre-wrap break-words text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">{pendingRevision.proposedContent || '(kosong)'}</pre>
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
    </div>
  );
}

export default StudentWorkspace;
