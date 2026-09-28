import React, { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Paperclip, Sparkles } from 'lucide-react';
import { WorkspaceMode, WorkspaceArtifact, WorkspaceTab } from './types';
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

  // 1. Domain Persistence Hook
  const {
    messages,
    setMessages,
    persistedArtifacts,
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
  const handleExecuteSendMessage = useCallback((promptText: string, customSystemNote?: string, attachments?: any[]) => {
    if (!promptText.trim() || isStreaming) return;

    const userMsgId = `user_${Date.now()}`;
    const newUserMessage: Message = {
      id: userMsgId,
      role: 'user',
      content: promptText.trim(),
      createdAt: new Date(),
      attachments: attachments && attachments.length > 0 ? attachments.map((a: any) => ({
        id: a.id,
        filename: a.filename || a.name,
        mimeType: a.mimeType,
        size: a.size,
        url: a.url
      })) : undefined
    };

    setMessages(prev => [...prev, newUserMessage]);
    sendMessageStream(promptText.trim(), customSystemNote, attachments);
  }, [isStreaming, setMessages, sendMessageStream]);

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
        <div className="lg:hidden absolute top-14 left-3 right-3 z-30 animate-slide-down">
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
      <main className="flex-1 flex overflow-hidden relative">
        {/* LEFT PANE: CONVERSATION & COMPOSER */}
        <section 
          className={`flex flex-col h-full bg-white dark:bg-[#0F172A] border-r border-slate-200/80 dark:border-slate-800 transition-all duration-200 ${
            isCanvasExpanded 
              ? 'hidden' 
              : isCanvasOpen 
                ? 'w-full lg:w-[40%] xl:w-[38%] shrink-0' 
                : 'w-full max-w-3xl mx-auto border-r-0'
          } ${mobileActiveTab === 'chat' ? 'flex' : 'hidden lg:flex'}`}
        >
          <WorkspaceConversation
            messages={messages}
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
          />

          <WorkspaceComposer
            inputText={inputText}
            setInputText={setInputText}
            attachedFile={attachedFile}
            isStreaming={isStreaming}
            distressResult={distressResult}
            isDistressDismissed={isDistressDismissed}
            promptPills={ACADEMIC_PROMPT_PILLS}
            fileInputRef={fileInputRef}
            onSendMessage={(prompt, atts) => handleExecuteSendMessage(prompt, undefined, atts)}
            onAbortStream={abortStream}
            onOpenTemplateGallery={() => openTemplateModal()}
            onRemoveAttachedFile={removeAttachedFile}
            onFileUploadChange={handleFileUploadChange}
            onOpenBreathing={openBreathingModal}
            onSwitchToRuangTenang={() => onSwitchMode?.('RUANG_TENANG')}
            onDismissDistress={dismissDistress}
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
