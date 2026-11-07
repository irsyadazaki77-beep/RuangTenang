import React, { Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { ModalShell } from '../../../components/ui/ModalShell';
import { lazyWithRetry } from '../../../lib/lazyWithRetry';
import { SessionSummaryModal } from './SessionSummaryModal';
import { BookmarksModal } from './BookmarksModal';
import { BranchChatModal } from './BranchChatModal';
import { ChatMemoryModal } from './ChatMemoryModal';
import { BreathingModal } from './BreathingModal';
import { GroundingModal } from './GroundingModal';
import { WalkAndTalkModal } from './WalkAndTalkModal';
import { InstantFirstAidModal } from './InstantFirstAidModal';
import { SleepSanctuaryModal } from './SleepSanctuaryModal';

const ScreeningModal = lazyWithRetry(() => import('../../screening/ScreeningModal').then(m => ({ default: m.ScreeningModal })));
const CounselorDirectory = lazyWithRetry(() => import('../../counselors/CounselorDirectory').then(m => ({ default: m.CounselorDirectory })));
const UserProgressTracker = lazyWithRetry(() => import('../../mood/UserProgressTracker').then(m => ({ default: m.UserProgressTracker })));
const MentalHealthArticles = lazyWithRetry(() => import('../../../components/MentalHealthArticles').then(m => ({ default: m.MentalHealthArticles })));
const EmergencyCenter = lazyWithRetry(() => import('../../../components/EmergencyCenter').then(m => ({ default: m.EmergencyCenter })));

export interface ChatModalContainerProps {
  userId: string;
  userCampusId?: string;
  activePlugin: string | null;
  onClosePlugin: () => void;
  onScreeningComplete: (score: any) => void;
  onTriggerSOS?: () => void;
  onOpenPrivacyCenter?: () => void;
  // Summary modal
  isSummaryModalOpen: boolean;
  onCloseSummaryModal: () => void;
  // Bookmarks modal
  isBookmarksModalOpen: boolean;
  onCloseBookmarksModal: () => void;
  onBookmarkRemoved: (msgId: string) => void;
  // Branch chat modal
  isBranchModalOpen: boolean;
  onCloseBranchModal: () => void;
  branchTarget: { messageId: string; contentSnippet: string } | null;
  onChatBranched: (newChatId: string) => void;
  // Memory modal
  isMemoryModalOpen: boolean;
  onCloseMemoryModal: () => void;
  useMemoryForChat: boolean;
  onToggleChatMemory: (enabled: boolean) => void;
  // Breathing & Grounding
  isBreathingOpen: boolean;
  onCloseBreathing: () => void;
  isGroundingOpen: boolean;
  onCloseGrounding: () => void;
  onOpenBreathing: () => void;
  // Chat meta
  chatId: string | undefined;
  currentChatTitle?: string;
  // Sensory & Immersion modals
  isWalkAndTalkOpen?: boolean;
  onCloseWalkAndTalk?: () => void;
  onWalkAndTalkSendMessage?: (text: string) => void;
  lastAssistantMessage?: string;
  isAiStreaming?: boolean;
  isFirstAidOpen?: boolean;
  onCloseFirstAid?: () => void;
  onFirstAidPrompt?: (prompt: string) => void;
  isSleepSanctuaryOpen?: boolean;
  onCloseSleepSanctuary?: () => void;
  onSleepStoryPrompt?: () => void;
}

export const ChatModalContainer: React.FC<ChatModalContainerProps> = ({
  userId,
  userCampusId,
  activePlugin,
  onClosePlugin,
  onScreeningComplete,
  onTriggerSOS,
  onOpenPrivacyCenter,
  isSummaryModalOpen,
  onCloseSummaryModal,
  isBookmarksModalOpen,
  onCloseBookmarksModal,
  onBookmarkRemoved,
  isBranchModalOpen,
  onCloseBranchModal,
  branchTarget,
  onChatBranched,
  isMemoryModalOpen,
  onCloseMemoryModal,
  useMemoryForChat,
  onToggleChatMemory,
  isBreathingOpen,
  onCloseBreathing,
  isGroundingOpen,
  onCloseGrounding,
  onOpenBreathing,
  chatId,
  currentChatTitle,
  isWalkAndTalkOpen = false,
  onCloseWalkAndTalk = () => {},
  onWalkAndTalkSendMessage = () => {},
  lastAssistantMessage = '',
  isAiStreaming = false,
  isFirstAidOpen = false,
  onCloseFirstAid = () => {},
  onFirstAidPrompt = () => {},
  isSleepSanctuaryOpen = false,
  onCloseSleepSanctuary = () => {},
  onSleepStoryPrompt = () => {}
}) => {
  const navigate = useNavigate();
  const [renderedPlugin, setRenderedPlugin] = React.useState<string | null>(activePlugin);

  React.useEffect(() => {
    if (activePlugin) {
      setRenderedPlugin(activePlugin);
    }
  }, [activePlugin]);

  const getPluginConfig = () => {
    switch (renderedPlugin) {
      case 'screening':
        return {
          title: 'Skrining Mandiri',
          subtitle: 'PHQ-9 & GAD-7 untuk meninjau gejala; hasilnya bukan diagnosis',
          component: (
            <ScreeningModal
              isOpen={Boolean(activePlugin === 'screening')}
              onClose={onClosePlugin}
              onComplete={onScreeningComplete}
              isPageMode={true}
            />
          ),
        };
      case 'counselors':
        return {
          title: 'Direktori Konselor Kampus',
          subtitle: 'Lihat profil dan jadwal yang tersedia; kebijakan layanan dapat berbeda.',
          component: (
            <CounselorDirectory
              onSelectCounselorForBooking={(counselor: any) => {
                onClosePlugin();
                navigate('/counselors', { state: { selectedCounselor: counselor, selectedCounselorUserId: userId, selectedCounselorCampusId: userCampusId } });
              }}
            />
          ),
        };
      case 'mood':
        return {
          title: 'Progress & Mood Tracker',
          subtitle: 'Tinjau catatan suasana hati dan jurnal dari waktu ke waktu',
          component: <UserProgressTracker />,
        };
      case 'articles':
        return {
          title: 'Perpustakaan & Artikel Edukasi',
          subtitle: 'Materi edukasi umum dan latihan mandiri',
          component: <MentalHealthArticles />,
        };
      case 'emergency':
        return {
          title: 'Pusat Bantuan Darurat',
          subtitle: 'Healing119, bantuan medis darurat, dan kontak darurat pribadi',
          component: <EmergencyCenter onTriggerSOS={onTriggerSOS} onOpenPrivacyCenter={onOpenPrivacyCenter} />,
        };
      default:
        return null;
    }
  };

  const activePluginConfig = getPluginConfig();

  return (
    <>
      {activePluginConfig && (
        <ModalShell
          isOpen={Boolean(activePlugin)}
          onClose={onClosePlugin}
          title={activePluginConfig.title}
          subtitle={activePluginConfig.subtitle}
          maxWidth="3xl"
        >
          <Suspense
            fallback={
              <div className="flex flex-col items-center justify-center h-48 p-8 text-secondary text-xs animate-pulse gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-teal-600 dark:text-teal-400" />
                <span>Memuat modul {activePluginConfig.title}...</span>
              </div>
            }
          >
            {activePluginConfig.component}
          </Suspense>
        </ModalShell>
      )}

      {/* Feature 1: Smart Session Summary Modal */}
      <SessionSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={onCloseSummaryModal}
        chatId={chatId}
      />

      {/* Feature 2: Bookmarks Modal */}
      <BookmarksModal
        isOpen={isBookmarksModalOpen}
        onClose={onCloseBookmarksModal}
        currentChatId={chatId}
        onSelectChat={(targetChatId) => navigate(`/c/${targetChatId}`)}
        onBookmarkRemoved={onBookmarkRemoved}
      />

      {/* Feature 3: Branch Chat Modal */}
      <BranchChatModal
        isOpen={isBranchModalOpen}
        onClose={onCloseBranchModal}
        parentChatId={chatId}
        parentChatTitle={currentChatTitle || 'Percakapan Asli'}
        messageId={branchTarget?.messageId}
        messageSnippet={branchTarget?.contentSnippet}
        onChatBranched={(newChat: any) => onChatBranched(typeof newChat === 'string' ? newChat : newChat?.id || String(newChat))}
      />

      {/* Feature 4: AI Memory Control Modal */}
      <ChatMemoryModal
        isOpen={isMemoryModalOpen}
        onClose={onCloseMemoryModal}
        chatId={chatId}
        useMemoryForChat={useMemoryForChat}
        onToggleChatMemory={onToggleChatMemory}
      />

      {/* Feature 6: Guided Breathing Modal */}
      <BreathingModal
        isOpen={isBreathingOpen}
        onClose={onCloseBreathing}
      />

      {/* Feature 7: Sensory Grounding Modal */}
      <GroundingModal
        isOpen={isGroundingOpen}
        onClose={onCloseGrounding}
        onOpenBreathing={onOpenBreathing}
      />

      {/* Feature 8: Walk and Talk Voice Call Modal */}
      <WalkAndTalkModal
        isOpen={isWalkAndTalkOpen}
        onClose={onCloseWalkAndTalk}
        onSendMessage={onWalkAndTalkSendMessage}
        lastAssistantMessage={lastAssistantMessage}
        isAiStreaming={isAiStreaming}
      />

      {/* Feature 9: Instant Emotional First-Aid Modal */}
      <InstantFirstAidModal
        isOpen={isFirstAidOpen}
        onClose={onCloseFirstAid}
        onOpenChatWithPrompt={onFirstAidPrompt}
      />

      {/* Feature 10: Sleep Sanctuary Modal */}
      <SleepSanctuaryModal
        isOpen={isSleepSanctuaryOpen}
        onClose={onCloseSleepSanctuary}
        onRequestBedtimeStory={onSleepStoryPrompt}
      />
    </>
  );
};
