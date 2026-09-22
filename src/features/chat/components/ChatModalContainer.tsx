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

const ScreeningModal = lazyWithRetry(() => import('../../screening/ScreeningModal').then(m => ({ default: m.ScreeningModal })));
const CounselorDirectory = lazyWithRetry(() => import('../../counselors/CounselorDirectory').then(m => ({ default: m.CounselorDirectory })));
const UserProgressTracker = lazyWithRetry(() => import('../../mood/UserProgressTracker').then(m => ({ default: m.UserProgressTracker })));
const MentalHealthArticles = lazyWithRetry(() => import('../../../components/MentalHealthArticles').then(m => ({ default: m.MentalHealthArticles })));
const EmergencyCenter = lazyWithRetry(() => import('../../../components/EmergencyCenter').then(m => ({ default: m.EmergencyCenter })));

export interface ChatModalContainerProps {
  activePlugin: string | null;
  onClosePlugin: () => void;
  onScreeningComplete: (score: any) => void;
  onTriggerSOS: () => void;
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
}

export const ChatModalContainer: React.FC<ChatModalContainerProps> = ({
  activePlugin,
  onClosePlugin,
  onScreeningComplete,
  onTriggerSOS,
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
  currentChatTitle
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
          title: 'Skrining Mandiri Psikometri',
          subtitle: 'Instrumen PHQ-9 & GAD-7 untuk deteksi dini',
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
          title: 'Direktori Konselor & Psikolog Kampus',
          subtitle: 'Jadwalkan sesi pendampingan psikologis terpercaya',
          component: (
            <CounselorDirectory
              onSelectCounselorForBooking={(counselor: any) => {
                onClosePlugin();
                navigate('/counselors', { state: { selectedCounselor: counselor } });
              }}
            />
          ),
        };
      case 'mood':
        return {
          title: 'Progress & Mood Tracker',
          subtitle: 'Pantau grafik emosi dan capaian harian Anda',
          component: <UserProgressTracker />,
        };
      case 'articles':
        return {
          title: 'Perpustakaan & Artikel Edukasi',
          subtitle: 'Panduan psikologi praktis & manajemen stres',
          component: <MentalHealthArticles />,
        };
      case 'emergency':
        return {
          title: 'Pusat Bantuan Darurat SOS',
          subtitle: 'Layanan krisis 24 jam & nomor darurat langsung',
          component: <EmergencyCenter onTriggerSOS={onTriggerSOS} />,
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
        onChatBranched={onChatBranched}
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
    </>
  );
};
