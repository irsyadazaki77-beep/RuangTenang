import React, { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Paperclip, Sparkles } from 'lucide-react';
import { WorkspaceMode, WorkspaceArtifact, WorkspaceTab, WorkspaceComposerConfig, WorkspaceComparisonCandidate, WorkspaceComparisonRun } from './types';
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
  onSwitchMode, 
  onOpenSidebar 
}: StudentWorkspaceProps) {
  const { chatId } = useParams<{ chatId?: string }>();
  const { models, defaultModel } = useAiModelCatalog();

  // 1. Domain Persistence Hook
  const {
    messages,
    setMessages,
    persistedArtifacts,
    isLoadingMessages,
    clearMessages
  } = useWorkspacePersistence({
    chatId,
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
    chatId,
    persistedArtifacts
  });


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
    setComparisonRun(null);
  }, [chatId]);

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
    attachedFile,
    isDraggingOver,
    fileInputRef,
    handleFileUploadChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    removeAttachedFile
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
  const handleStreamArtifactExtracted = useCallback((artifact: WorkspaceArtifact) => {
    setIsCanvasOpen(true);
    setHasUnreadArtifact(true);
    syncParsedMessageArtifacts([artifact]);
    setActiveArtifactId(artifact.id);
  }, [setHasUnreadArtifact, syncParsedMessageArtifacts, setActiveArtifactId]);

  const handleStreamCompleted = useCallback((assistantMsg: Message, extractedArtifacts: WorkspaceArtifact[]) => {
    setMessages(prev => [...prev, assistantMsg]);
    if (extractedArtifacts.length > 0) {
      setHasUnreadArtifact(true);
      setIsCanvasOpen(true);
      syncParsedMessageArtifacts(extractedArtifacts);
      setActiveArtifactId(extractedArtifacts[0].id);
    }
  }, [setMessages, setHasUnreadArtifact, syncParsedMessageArtifacts, setActiveArtifactId]);

  const {
    isStreaming,
    activeStreamingMessage,
    sendMessageStream,
    abortStream
  } = useWorkspaceStreaming({
    chatId,
    onStreamArtifactExtracted: handleStreamArtifactExtracted,
    onStreamCompleted: handleStreamCompleted
  });

  // User Actions
  const handleExecuteSendMessage = useCallback((promptText: string, customSystemNote?: string, attachments?: StoredAttachment[], config?: WorkspaceComposerConfig) => {
    if (!promptText.trim() || isStreaming) return;

    if (config?.comparisonModelIds?.length) {
      if (config.comparisonModelIds.length < 2 || config.comparisonModelIds.length > 3 || attachments?.length) return;
      setComparisonRun({
        comparisonId: crypto.randomUUID(),
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
          : undefined
      });
      return;
    }

    setComparisonRun(null);

    const userMsgId = `user_${Date.now()}`;
    const newUserMessage: Message = {
      id: userMsgId,
      role: 'user',
      content: promptText.trim(),
      createdAt: new Date(),
      attachments: attachments && attachments.length > 0 ? attachments : undefined
    };

    setMessages(prev => [...prev, newUserMessage]);
    sendMessageStream(promptText.trim(), customSystemNote, attachments, config ?? { aiModel: selectedModel, responseMode: 'Seimbang', responseStyle: 'Default' });
  }, [activeArtifact, chatId, isStreaming, selectedModel, setMessages, sendMessageStream]);

  const handleUseComparisonResponse = useCallback((run: WorkspaceComparisonRun, candidate: WorkspaceComparisonCandidate) => {
    if (run.chatId !== chatId || candidate.status !== 'completed' || !candidate.output) return;
    const { cleanedText, artifacts: selectedArtifacts } = parseArtifactsFromText(candidate.output, false);
    const messageTime = new Date();
    setMessages(previous => [...previous,
      { id: `compare_user_${run.comparisonId}`, role: 'user', content: run.prompt, createdAt: messageTime },
      { id: `compare_answer_${run.comparisonId}_${candidate.modelId}`, role: 'assistant', content: cleanedText || candidate.output, modelUsed: candidate.modelId, createdAt: new Date() }
    ]);
    if (selectedArtifacts.length > 0) {
      setIsCanvasOpen(true);
      setHasUnreadArtifact(true);
      syncParsedMessageArtifacts(selectedArtifacts);
      setActiveArtifactId(selectedArtifacts[0].id);
    }
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
    setIsCanvasOpen(true);
    setMobileActiveTab('canvas');
    void createArtifactFromContent(candidate.output, `Comparison · ${candidate.modelName}`);
  }, [createArtifactFromContent]);

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
    handleExecuteSendMessage(lastUserPrompt);
  }, [setMessages, handleExecuteSendMessage]);

  const handleRequestRevision = useCallback((revisionPrompt: string, currentArt: WorkspaceArtifact) => {
    const revisionFullPrompt = `Saya ingin merevisi artefak "${currentArt.title}" (${currentArt.type}).
Instruksi revisi: ${revisionPrompt}

Konten Artefak Saat Ini:
\`\`\`${currentArt.language || ''}
${currentArt.content}
\`\`\`

Mohon berikan hasil revisi lengkapnya yang dibungkus dalam tag:
<artifact type="${currentArt.type.toLowerCase()}" title="${currentArt.title}" ${currentArt.language ? `language="${currentArt.language}"` : ''}>
...konten hasil revisi baru...
</artifact>`;

    handleExecuteSendMessage(revisionFullPrompt, `Revisi artefak ${currentArt.title}`);
  }, [handleExecuteSendMessage]);

  const handleExecuteToolFromComposer = useCallback(async (tool: WorkspaceToolDefinition) => {
    if (tool.requiresArtifact && !activeArtifact) {
      handleExecuteSendMessage(tool.description);
      return;
    }

    if (activeArtifact) {
      if (tool.executionMode === 'client_utility' || tool.executionMode === 'export') {
        const payload = {
          toolId: tool.id,
          input: {},
          context: {
            activeArtifact: {
              id: activeArtifact.id,
              title: activeArtifact.title,
              type: activeArtifact.type,
              language: activeArtifact.language,
              content: activeArtifact.content,
              version: activeArtifact.version
            }
          }
        };
        const result = await WorkspaceToolExecutor.executeClientUtility(tool, payload);
        if (result.success) {
          if (result.downloadData) {
            const blob = new Blob([result.downloadData.content], { type: `${result.downloadData.mimeType};charset=utf-8` });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = result.downloadData.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          } else if (result.proposedContent) {
            updateActiveArtifact({ content: result.proposedContent });
            saveArtifact(result.proposedContent, activeArtifact.title);
          }
        }
        return;
      }

      const promptInstruction = tool.promptTemplate 
        ? tool.promptTemplate({}, activeArtifact.content)
        : tool.description;
      handleRequestRevision(promptInstruction, activeArtifact);
    } else {
      handleExecuteSendMessage(tool.description);
    }
  }, [activeArtifact, handleExecuteSendMessage, handleRequestRevision, updateActiveArtifact, saveArtifact]);

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
        activeArtifact={activeArtifact}
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
        onConfirmClearWorkspace={clearMessages}
      />

      {/* Floating Notification for Mobile when Artifact Updates */}
      {mobileActiveTab === 'chat' && hasUnreadArtifact && activeArtifact && (
        <div className="xl:hidden absolute top-14 left-3 right-3 z-30 animate-slide-down">
          <div className="bg-slate-900/95 dark:bg-slate-900/95 text-white px-3 py-2 rounded-xl shadow-xl flex items-center justify-between border border-slate-700/80 backdrop-blur-md">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-pulse" />
              <div className="text-xs truncate">
                <span className="font-semibold">Artefak diperbarui:</span>{' '}
                <span className="text-slate-300">{activeArtifact.title}</span>
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
                ? 'w-full xl:w-[40%] 2xl:w-[38%] shrink-0'
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
            comparisonRun={comparisonRun?.chatId === chatId ? comparisonRun : null}
            onUseComparisonResponse={handleUseComparisonResponse}
            onComparisonSendToCanvas={handleComparisonSendToCanvas}
            onCompareAgain={handleCompareAgain}
          />

          <WorkspaceComposer
            activeArtifactType={activeArtifact?.type}
            onSelectTool={handleExecuteToolFromComposer}
            inputText={inputText}
            setInputText={setInputText}
            attachedFile={attachedFile}
            isStreaming={isStreaming}
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
            onAbortStream={abortStream}
            onOpenTemplateGallery={() => openTemplateModal()}
            onRemoveAttachedFile={removeAttachedFile}
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
          artifacts={artifacts}
          activeArtifact={activeArtifact}
          activeArtifactId={activeArtifactId}
          isCanvasOpen={isCanvasOpen}
          isCanvasExpanded={isCanvasExpanded}
          isStreaming={isStreaming}
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
          onCreateNewArtifact={createNewArtifact}
          onDuplicateArtifact={duplicateArtifact}
          onDeleteArtifact={deleteArtifact}
          onSetMobileActiveTab={(tab) => {
            setMobileActiveTab(tab);
            if (tab === 'canvas') setHasUnreadArtifact(false);
          }}
        />
      </main>

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
    </div>
  );
}

export default StudentWorkspace;
