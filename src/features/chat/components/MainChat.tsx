import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { MessageBubble } from './MessageBubble';
import { ChatComposer } from './ChatComposer';
import { Message, ChatMode, ResponseStyle, Chat } from '../types';
import { UserSession } from '../../../types';
import { lazyWithRetry } from '../../../lib/lazyWithRetry';
const ScreeningModal = lazyWithRetry(() => import('../../../features/screening/ScreeningModal').then(m => ({ default: m.ScreeningModal })));
const CounselorDirectory = lazyWithRetry(() => import('../../../features/counselors/CounselorDirectory').then(m => ({ default: m.CounselorDirectory })));
const UserProgressTracker = lazyWithRetry(() => import('../../../features/mood/UserProgressTracker').then(m => ({ default: m.UserProgressTracker })));
const EmergencyCenter = lazyWithRetry(() => import('../../../components/EmergencyCenter').then(m => ({ default: m.EmergencyCenter })));
const MentalHealthArticles = lazyWithRetry(() => import('../../../components/MentalHealthArticles').then(m => ({ default: m.MentalHealthArticles })));
import { RefreshCw, ChevronDown,  } from 'lucide-react';
import { useToast } from '../../../components/Toast';
import { DEFAULT_AI_MODEL_ID } from '../../../lib/aiModels';
import { safeLocalStorage } from '../../../lib/storage';

import { useChatHistory } from '../hooks/useChatHistory';
import { useChatStreaming } from '../hooks/useChatStreaming';
import { ChatHeader } from './ChatHeader';
import { EmptyChatState } from './EmptyChatState';
import { ChatSkeleton } from '../../../components/common/Skeleton';
import { ErrorState } from '../../../components/common/ErrorState';
import { apiClient } from '../../../lib/apiClient';
import { ModalShell } from '../../../components/ui/ModalShell';
import { ChatSearchBar } from './ChatSearchBar';
import { SessionSummaryModal } from './SessionSummaryModal';
import { BookmarksModal } from './BookmarksModal';
import { BranchChatModal } from './BranchChatModal';
import { ChatMemoryModal } from './ChatMemoryModal';

interface MainChatProps {
  user: UserSession | null;
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  chats?: Chat[];
  onOpenSidebar?: () => void;
  onOpenSettings?: () => void;
  onOpenChangelog?: () => void;
}

export default function MainChat({ user, setChats, chats = [], onOpenSidebar, onOpenSettings, onOpenChangelog }: MainChatProps) {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const currentChat = chats.find(c => c.id === chatId);
  const isBranch = Boolean(currentChat?.parentChatId);
  const parentChat = isBranch ? chats.find(c => c.id === currentChat?.parentChatId) : undefined;

  const [chatMode, setChatMode] = useState<ChatMode>(() => safeLocalStorage.getItem('chatMode') as ChatMode || 'Teman Cerita');
  const [responseStyle, setResponseStyle] = useState<ResponseStyle>(() => safeLocalStorage.getItem('responseStyle') as ResponseStyle || 'Seimbang');
  const [aiModel, setAiModel] = useState(() => safeLocalStorage.getItem('aiModel') || DEFAULT_AI_MODEL_ID);
  const [isTemporary, setIsTemporary] = useState(() => !user || user?.role === 'guest');

  useEffect(() => { safeLocalStorage.setItem('chatMode', chatMode); }, [chatMode]);
  useEffect(() => { safeLocalStorage.setItem('responseStyle', responseStyle); }, [responseStyle]);
  useEffect(() => { safeLocalStorage.setItem('aiModel', aiModel); }, [aiModel]);

  const [followUps, setFollowUps] = useState<string[]>([]);
  const [activePlugin, setActivePlugin] = useState<string | null>(null);
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);

  // --- Feature 1: Smart Session Summary State ---
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  // --- Feature 2: Bookmarks State ---
  const [isBookmarksModalOpen, setIsBookmarksModalOpen] = useState(false);
  const [bookmarkedMessageIds, setBookmarkedMessageIds] = useState<Set<string>>(new Set());

  // --- Feature 3: Branch Conversation State ---
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [branchTarget, setBranchTarget] = useState<{ messageId: string; contentSnippet: string } | null>(null);

  // --- Feature 4: Memory / Context Control State ---
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [useMemoryForChat, setUseMemoryForChat] = useState(true);

  // --- Feature 5: In-Chat Search State ---
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);

  const handleOpenPlugin = (plugin: string) => setActivePlugin(plugin);
  const handleClosePlugin = () => setActivePlugin(null);

  useEffect(() => {
    if (location.state && (location.state as any).discussMood) {
      const moodLog = (location.state as any).discussMood;
      // Clear navigation state instantly to respect privacy and prevent double triggers
      window.history.replaceState({}, document.title);

      const moodLabels: Record<number, string> = {
        1: 'Sangat Buruk 😢',
        2: 'Buruk 🙁',
        3: 'Biasa Saja 😐',
        4: 'Baik 🙂',
        5: 'Sangat Baik 😊'
      };

      const moodLabel = moodLabels[moodLog.mood] || 'N/A';
      const emotionsList = moodLog.emotions && moodLog.emotions.length > 0 
        ? moodLog.emotions.join(', ') 
        : 'Tidak ada emosi spesifik';
      const factorsList = moodLog.factors && moodLog.factors.length > 0 
        ? moodLog.factors.join(', ') 
        : 'Tidak ada faktor spesifik';

      const initialPrompt = `Halo! Saya baru saja mencatat mood saya hari ini:\n- Mood utama: ${moodLabel}\n- Emosi: ${emotionsList}\n- Faktor pemicu: ${factorsList}${moodLog.notes ? `\n- Catatan tambahan: "${moodLog.notes}"` : ''}\n\nSaya ingin berkonsultasi mengenai perasaan saya hari ini.`;

      // Trigger automatic discussion safely after history clean
      const delay = setTimeout(() => {
        handleSend(initialPrompt);
      }, 600);

      return () => clearTimeout(delay);
    }
  }, [location.state]);

  useEffect(() => {
    const handleOpenPluginEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      handleOpenPlugin(customEvent.detail);
    };
    window.addEventListener('openPlugin', handleOpenPluginEvent);
    return () => window.removeEventListener('openPlugin', handleOpenPluginEvent);
  }, []);

  const {
    messages, setMessages, isLoadingMessages, fetchMessagesError,
    nextCursor, isLoadingMore, fetchMessages, loadedChatIdRef
  } = useChatHistory(chatId);

  const { isTyping, streamMessage, abortStream } = useChatStreaming();

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  useEffect(() => {
    abortStream();
    if (chatId && chatId !== loadedChatIdRef.current) {
      fetchMessages();
    } else if (!chatId) {
      setMessages([]);
    }
  }, [chatId, fetchMessages, setMessages, abortStream]);

  const handleLoadMore = () => {
    if (nextCursor && !isLoadingMore) {
      fetchMessages(nextCursor);
    }
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 100);
    } else {
      setShowScrollBottom(document.documentElement.scrollHeight - window.scrollY - window.innerHeight > 100);
    }
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) el.addEventListener('scroll', handleScroll);
    return () => {
      if (el) el.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToBottom = (force = false) => {
    if (force || !showScrollBottom) {
      if (scrollContainerRef.current) {
        if (typeof scrollContainerRef.current.scrollTo === 'function') {
          scrollContainerRef.current.scrollTo({
            top: scrollContainerRef.current.scrollHeight,
            behavior: 'smooth'
          });
        } else {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, isTyping]);

  useEffect(() => {
    const handleGlobalKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isSearchOpen) setIsSearchOpen(false);
        else if (activePlugin) handleClosePlugin();
        else if (isTyping) abortStream();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        if (messages.length > 0) {
          e.preventDefault();
          setIsSearchOpen(prev => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeydown);
    return () => window.removeEventListener('keydown', handleGlobalKeydown);
  }, [activePlugin, isTyping, abortStream, isSearchOpen, messages.length]);

  // Fetch bookmarks on mount / user change / chatId change
  useEffect(() => {
    if (!user || user.role === 'guest') return;
    apiClient.get<{ success: boolean; bookmarks: Array<{ messageId: string }> }>('/api/chat/bookmarks')
      .then(res => {
        if (res.success && Array.isArray(res.data?.bookmarks)) {
          setBookmarkedMessageIds(new Set(res.data.bookmarks.map(b => b.messageId)));
        }
      })
      .catch(() => {});
  }, [user, chatId]);

  // Bookmark toggle handler
  const handleToggleBookmark = async (messageId: string, currentStatus: boolean) => {
    if (!user || user.role === 'guest') {
      showToast('Silakan masuk untuk menyimpan pesan.', 'info');
      return;
    }
    if (currentStatus) {
      try {
        const res = await apiClient.delete<{ success: boolean }>(`/api/chat/bookmarks/${messageId}`);
        if (res.success) {
          setBookmarkedMessageIds(prev => {
            const next = new Set(prev);
            next.delete(messageId);
            return next;
          });
          showToast('Pesan dihapus dari simpanan', 'info');
        }
      } catch {
        showToast('Gagal menghapus simpanan', 'error');
      }
    } else {
      try {
        const targetChatId = chatId || 'temp';
        const res = await apiClient.post<{ success: boolean }>(`/api/chat/${targetChatId}/bookmarks`, { messageId });
        if (res.success) {
          setBookmarkedMessageIds(prev => new Set(prev).add(messageId));
          showToast('Pesan berhasil disimpan', 'success');
        }
      } catch {
        showToast('Gagal menyimpan pesan', 'error');
      }
    }
  };

  // Search matches memo
  const searchMatches = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return messages.filter(m => m.content && m.content.toLowerCase().includes(q)).map(m => m.id);
  }, [messages, searchQuery]);

  useEffect(() => {
    setCurrentSearchIndex(0);
    if (searchMatches.length > 0) {
      const targetId = searchMatches[0];
      document.getElementById(`msg-${targetId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [searchMatches]);

  const handleSearchNext = () => {
    if (searchMatches.length === 0) return;
    const nextIdx = (currentSearchIndex + 1) % searchMatches.length;
    setCurrentSearchIndex(nextIdx);
    const targetId = searchMatches[nextIdx];
    document.getElementById(`msg-${targetId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleSearchPrev = () => {
    if (searchMatches.length === 0) return;
    const prevIdx = (currentSearchIndex - 1 + searchMatches.length) % searchMatches.length;
    setCurrentSearchIndex(prevIdx);
    const targetId = searchMatches[prevIdx];
    document.getElementById(`msg-${targetId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  useEffect(() => {
    if (currentChat) {
      setUseMemoryForChat(currentChat.useMemory !== false);
    }
  }, [currentChat]);

  // Branch conversation trigger
  const handleOpenBranch = (messageId: string, contentSnippet: string) => {
    setBranchTarget({ messageId, contentSnippet });
    setIsBranchModalOpen(true);
  };

  const handleChatBranched = (newChat: Chat) => {
    setChats(prev => [newChat, ...prev]);
    navigate(`/c/${newChat.id}`);
  };

  const handleSend = async (content: string, pluginResult?: string, attachments?: any[]) => {
    if (!content.trim() && !pluginResult && (!attachments || attachments.length === 0)) return;
    
    const tempId = `msg_${Date.now()}`;
    if (!pluginResult) {
      setMessages(prev => [...prev, {
        id: tempId,
        role: 'user',
        content,
        attachments: attachments ? attachments.map(a => ({
          id: a.serverAttachmentId || a.id,
          filename: a.filename || a.file?.name || 'attachment.bin',
          mimeType: a.mimeType || a.file?.type || 'application/octet-stream',
          size: a.size || a.file?.size || 0,
          url: a.url || `/api/v1/chat/attachments/${a.serverAttachmentId || a.id}`
        })) : undefined
      }]);
    }
    
    setFollowUps([]);
    let assistantMsgId = `assistant_${Date.now()}`;
    setStreamingMessage({ id: assistantMsgId, role: 'assistant', content: '' });

    await streamMessage(
      {
        message: content,
        chatId,
        isTemporary,
        pluginResult,
        chatMode,
        responseStyle,
        aiModel,
        attachments: attachments ? attachments.map(a => ({
          id: a.serverAttachmentId || a.id,
          filename: a.filename || a.file?.name || 'attachment.bin',
          mimeType: a.mimeType || a.file?.type || 'application/octet-stream',
          size: a.size || a.file?.size || 0,
          url: a.url || `/api/v1/chat/attachments/${a.serverAttachmentId || a.id}`
        })) : undefined
      },
      {
        onMessageStart: (msgId) => {
          assistantMsgId = msgId;
          setStreamingMessage(prev => ({ id: msgId, role: 'assistant', content: prev?.content || '' }));
        },
        onChunk: (text) => {
          setStreamingMessage(prev => prev ? { ...prev, content: prev.content + text } : { id: assistantMsgId, role: 'assistant', content: text });
        },
        onPluginSwitch: (pluginName) => {
          setStreamingMessage(prev => prev ? { ...prev, content: `Memuat fitur ${pluginName}...`, plugin: pluginName } : null);
        },
        onMessageComplete: (text) => {
          if (text) {
            setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: text }]);
          }
          setStreamingMessage(null);
        },
        onError: (err) => {
          setStreamingMessage(null);
          setMessages(prev => {
            if (prev.some(m => m.id === assistantMsgId)) {
               return prev.map(m => m.id === assistantMsgId ? { ...m, content: err || 'Koneksi terputus.', error: true } : m);
            }
            showToast(err || 'Gagal mengirim pesan', 'error');
            return [...prev, { id: assistantMsgId, role: 'assistant', content: err || 'Koneksi terputus.', error: true }];
          });
        },
        onFollowUps: (qs) => setFollowUps(qs),
        onChatCreated: (newChatId) => {
          if (newChatId !== chatId) {
            loadedChatIdRef.current = newChatId;
            navigate(`/c/${newChatId}`, { replace: true });
            apiClient.get('/api/v1/chat/history').then(res => {
              if (res.success && Array.isArray(res.data) && setChats) {
                setChats(res.data);
              }
            });
          }
        }
      }
    );
  };

  
  const handleEditMessage = async (msgId: string, newContent: string) => {
    if (!newContent.trim()) return;

    const previousMessages = [...messages];
    const idx = messages.findIndex(m => m.id === msgId);
    if (idx !== -1) {
      setMessages(messages.slice(0, idx));
    }

    try {
      if (chatId) {
        const res = await apiClient.post<{summary?: string}>(`/api/v1/chat/${chatId}/truncate`, { messageId: msgId });
        if (!res.success) {
          throw new Error(res.error || res.message || 'Gagal memotong riwayat pesan');
        }
      }
      await handleSend(newContent);
    } catch (err: any) {
      showToast(err?.message || 'Gagal mengedit pesan', 'error');
      setMessages(previousMessages);
      fetchMessages();
    }
  };

  const exportChatHistory = () => {
    if (messages.length === 0) {
      showToast('Tidak ada riwayat percakapan untuk diekspor', 'info');
      return;
    }
    const dateStr = new Date().toISOString().split('T')[0];
    const header = `# RuangTenang - Catatan Percakapan Konsultasi\nTanggal: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}\n\n---\n\n`;
    const body = messages.map(m => `### ${m.role === 'user' ? 'Anda' : 'RuangTenang AI'}\n${m.content}\n`).join('\n---\n\n');
    const blob = new Blob([header + body], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ruangtenang-chat-${chatId || 'sesi'}-${dateStr}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Riwayat chat berhasil diekspor (.md)', 'success');
  };

  const handleCommand = async (command: string) => {
    const cleanCmd = command.toLowerCase().trim();
    if (cleanCmd === '/new') {
      abortStream();
      setMessages([]);
      setFollowUps([]);
      setStreamingMessage(null);
      navigate('/');
      showToast('Percakapan baru dimulai', 'info');
      return;
    }

    if (cleanCmd === '/mood') {
      handleOpenPlugin('mood');
      return;
    }

    if (cleanCmd === '/articles') {
      handleOpenPlugin('articles');
      return;
    }

    if (cleanCmd === '/screening') {
      handleOpenPlugin('screening');
      return;
    }

    if (cleanCmd === '/counselor' || cleanCmd === '/counselors') {
      handleOpenPlugin('counselors');
      return;
    }

    if (cleanCmd === '/emergency' || cleanCmd === '/sos') {
      handleOpenPlugin('emergency');
      return;
    }

    if (cleanCmd === '/export') {
      exportChatHistory();
      return;
    }

    if (cleanCmd === '/clear') {
      if (chatId) {
        if (confirm('Bersihkan riwayat percakapan ini?')) {
          try {
            const res = await apiClient.delete(`/api/v1/chat/${chatId}/messages`);
            if (!res.success) {
              throw new Error(res.error || 'Gagal membersihkan percakapan di server.');
            }
            setMessages([]);
            showToast('Pesan berhasil dibersihkan', 'success');
          } catch (err: any) {
            showToast(err?.message || 'Gagal membersihkan percakapan', 'error');
          }
        }
      } else {
        setMessages([]);
        showToast('Pesan berhasil dibersihkan', 'info');
      }
      return;
    }

    if (cleanCmd === '/summary') {
      if (!chatId && messages.length === 0) {
        showToast('Tidak ada percakapan untuk diringkas', 'info');
        return;
      }
      
      try {
        if (chatId) {
          const res = await apiClient.post<{summary?: string}>(`/api/v1/chat/summary`, { chatId });
          if (res.success && res.data?.summary) {
            showToast(`Ringkasan: ${res.data.summary}`, 'success');
          } else {
            handleSend('Tolong buatkan ringkasan singkat dari poin-poin utama percakapan kita sejauh ini.');
          }
        } else {
          handleSend('Tolong buatkan ringkasan singkat dari poin-poin utama percakapan kita sejauh ini.');
        }
      } catch {
        handleSend('Tolong buatkan ringkasan singkat dari poin-poin utama percakapan kita sejauh ini.');
      } finally {
        
      }
      return;
    }

    // Default fallback
    handleSend(command);
  };
  

  const renderPluginWrapper = (title: string, component: React.ReactNode, subtitle?: string) => (
    <ModalShell
      isOpen={true}
      onClose={handleClosePlugin}
      title={title}
      subtitle={subtitle}
      maxWidth="3xl"
    >
      <React.Suspense fallback={
        <div className="flex flex-col items-center justify-center h-48 p-8 text-secondary text-xs animate-pulse gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-teal-600 dark:text-teal-400" />
          <span>Memuat modul {title}...</span>
        </div>
      }>
        {component}
      </React.Suspense>
    </ModalShell>
  );

  return (
    <>
      {activePlugin === 'screening' && renderPluginWrapper(
        'Skrining Mandiri Psikometri',
        <ScreeningModal 
          isOpen={true} 
          onClose={handleClosePlugin} 
          onComplete={(score: any) => { 
            handleClosePlugin(); 
            showToast('Skrining berhasil diselesaikan.', 'success');
            handleSend('', `Saya telah menyelesaikan skrining mandiri PHQ-9 (skor: ${score.phq9.score}, kategori: ${score.phq9.severity}) dan GAD-7 (skor: ${score.gad7.score}, kategori: ${score.gad7.severity}). Catatan: Skrining ini adalah alat evaluasi mandiri awal dan BUKAN diagnosis medis.`); 
          }} 
        />,
        'Instrumen PHQ-9 & GAD-7 untuk deteksi dini'
      )}
      {activePlugin === 'counselors' && renderPluginWrapper(
        'Direktori Konselor & Psikolog Kampus',
        <CounselorDirectory onSelectCounselorForBooking={(counselor: any) => {
          handleClosePlugin();
          navigate('/counselors', { state: { selectedCounselor: counselor } });
        }} />,
        'Jadwalkan sesi pendampingan psikologis terpercaya'
      )}
      {activePlugin === 'mood' && renderPluginWrapper(
        'Progress & Mood Tracker',
        <UserProgressTracker />,
        'Pantau grafik emosi dan capaian harian Anda'
      )}
      {activePlugin === 'articles' && renderPluginWrapper(
        'Perpustakaan & Artikel Edukasi',
        <MentalHealthArticles />,
        'Panduan psikologi praktis & manajemen stres'
      )}
      {activePlugin === 'emergency' && renderPluginWrapper(
        'Pusat Bantuan Darurat SOS',
        <EmergencyCenter onTriggerSOS={() => showToast('Sinyal SOS darurat diaktifkan.', 'info')} />,
        'Layanan krisis 24 jam & nomor darurat langsung'
      )}

      {/* Feature 1: Smart Session Summary Modal */}
      <SessionSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        chatId={chatId}
      />

      {/* Feature 2: Bookmarks Modal */}
      <BookmarksModal
        isOpen={isBookmarksModalOpen}
        onClose={() => setIsBookmarksModalOpen(false)}
        currentChatId={chatId}
        onSelectChat={(targetChatId) => navigate(`/c/${targetChatId}`)}
        onBookmarkRemoved={(msgId) => {
          setBookmarkedMessageIds(prev => {
            const next = new Set(prev);
            next.delete(msgId);
            return next;
          });
        }}
      />

      {/* Feature 3: Branch Chat Modal */}
      <BranchChatModal
        isOpen={isBranchModalOpen}
        onClose={() => {
          setIsBranchModalOpen(false);
          setBranchTarget(null);
        }}
        parentChatId={chatId}
        parentChatTitle={currentChat?.title || 'Percakapan Asli'}
        messageId={branchTarget?.messageId}
        messageSnippet={branchTarget?.contentSnippet}
        onChatBranched={handleChatBranched}
      />

      {/* Feature 4: AI Memory Control Modal */}
      <ChatMemoryModal
        isOpen={isMemoryModalOpen}
        onClose={() => setIsMemoryModalOpen(false)}
        chatId={chatId}
        useMemoryForChat={useMemoryForChat}
        onToggleChatMemory={(val) => {
          setUseMemoryForChat(val);
          if (chatId) {
            setChats(prev => prev.map(c => c.id === chatId ? { ...c, useMemory: val } : c));
          }
        }}
      />

    <div className="flex-1 flex flex-col h-full min-h-0 surface-page relative min-w-0 overflow-hidden">
      <ChatHeader 
        user={user}
        chatId={chatId}
        isBranch={isBranch}
        parentChatTitle={parentChat?.title}
        onOpenSidebar={onOpenSidebar}
        onOpenSettings={onOpenSettings}
        onOpenChangelog={onOpenChangelog}
        chatMode={chatMode}
        setChatMode={setChatMode}
        responseStyle={responseStyle}
        setResponseStyle={setResponseStyle}
        aiModel={aiModel}
        setAiModel={setAiModel}
        isTemporary={isTemporary}
        setIsTemporary={setIsTemporary}
        activePlugin={activePlugin}
        setActivePlugin={setActivePlugin}
        onToggleSearch={() => setIsSearchOpen(prev => !prev)}
        isSearchOpen={isSearchOpen}
        onOpenSummary={() => setIsSummaryModalOpen(true)}
        onOpenBookmarks={() => setIsBookmarksModalOpen(true)}
        onOpenMemory={() => setIsMemoryModalOpen(true)}
        hasMessages={messages.length > 0}
      />

      {/* Feature 5: In-Chat Search Bar */}
      <ChatSearchBar
        isOpen={isSearchOpen}
        onClose={() => {
          setIsSearchOpen(false);
          setSearchQuery('');
        }}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        totalMatches={searchMatches.length}
        currentIndex={currentSearchIndex}
        onNext={handleSearchNext}
        onPrev={handleSearchPrev}
      />

      <div className="flex-1 overflow-y-auto w-full min-w-0 flex flex-col px-3 sm:px-4 py-3 sm:py-4" ref={scrollContainerRef}>
        {isLoadingMessages ? (
          <div className="flex-1 flex items-start justify-center pt-4">
            <ChatSkeleton />
          </div>
        ) : fetchMessagesError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center h-full">
            <ErrorState
              type="network"
              title="Gagal Memuat Pesan"
              description={fetchMessagesError}
              onRetry={() => fetchMessages()}
            />
          </div>
        ) : messages.length === 0 ? (
          <EmptyChatState userName={user?.name?.split(' ')[0]} onSelectPrompt={(prompt) => handleSend(prompt)} />
        ) : (
          <div key={chatId || 'empty'} className="max-w-3xl mx-auto space-y-4 sm:space-y-5 pb-6 w-full animate-fade-in">
            {nextCursor && (
              <div className="flex justify-center mb-4">
                <button 
                  onClick={handleLoadMore} 
                  disabled={isLoadingMore}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-secondary rounded-full text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5 min-h-[32px] cursor-pointer"
                >
                  {isLoadingMore ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ChevronDown className="w-3.5 h-3.5 rotate-180" />}
                  Muat pesan sebelumnya
                </button>
              </div>
            )}
            
            {messages.map((msg, idx) => (
              <MessageBubble 
                key={msg.id} 
                msg={msg} 
                isTyping={false} 
                onRegenerate={() => {
                  const lastUser = messages.slice(0, idx).reverse().find((m: Message) => m.role === 'user');
                  if (lastUser) { if (chatId) handleEditMessage(lastUser.id, lastUser.content); else handleSend(lastUser.content); }
                }}
                onSendPluginResult={(res) => handleSend('', res)}
                onOpenPlugin={handleOpenPlugin}
                onEditMessage={handleEditMessage}
                isBookmarked={bookmarkedMessageIds.has(msg.id)}
                onBookmarkToggle={(msgId, status) => handleToggleBookmark(msgId, status)}
                onBranch={(msgId, snippet) => handleOpenBranch(msgId, snippet)}
                searchHighlightQuery={isSearchOpen ? searchQuery : undefined}
                isSearchTarget={isSearchOpen && searchMatches[currentSearchIndex] === msg.id}
              />
            ))}
            
            {streamingMessage && (
              <MessageBubble 
                key={streamingMessage.id} 
                msg={streamingMessage} 
                isTyping={true} 
                onRegenerate={() => {}}
                onSendPluginResult={() => {}}
                onOpenPlugin={() => {}}
                onEditMessage={() => {}}
              />
            )}
            
            {isTyping && !streamingMessage && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex items-center gap-2 text-slate-400 py-1 pl-9 animate-fade-in">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse [animation-delay:0ms]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse [animation-delay:200ms]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse [animation-delay:400ms]"></span>
                </div>
                <span className="text-xs text-slate-400">RuangTenang sedang merespons...</span>
              </div>
            )}
            
            {!isTyping && followUps.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3 justify-end">
                {followUps.map((q, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => handleSend(q)} 
                    className="px-3 py-1.5 bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 rounded-full text-xs text-slate-600 dark:text-slate-300 transition-colors text-left cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            <div ref={bottomRef} className="h-2" />
          </div>
        )}
      </div>
      
      {showScrollBottom && (
        <button 
          onClick={() => scrollToBottom(true)} 
          className="absolute bottom-24 right-4 sm:right-6 w-9 h-9 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 border border-slate-200/80 dark:border-slate-700 shadow-md rounded-full flex items-center justify-center transition-all z-20 cursor-pointer"
          title="Pesan Terbaru"
          aria-label="Gulir ke Pesan Terbaru"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      )}
      
      <ChatComposer 
        onSend={handleSend} 
        isTyping={isTyping} 
        onStop={abortStream} 
        chatId={chatId} 
        onCommand={handleCommand}
        onOpenPlugin={handleOpenPlugin}
      />
    </div>
    </>
  );
}
