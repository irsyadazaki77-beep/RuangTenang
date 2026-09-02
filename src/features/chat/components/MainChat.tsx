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
import { RefreshCw, ChevronDown, AlertTriangle } from 'lucide-react';
import { useToast } from '../../../components/Toast';
import { DEFAULT_AI_MODEL_ID } from '../../../lib/aiModels';
import { safeLocalStorage } from '../../../lib/storage';

import { useChatHistory } from '../hooks/useChatHistory';
import { useChatStreaming } from '../hooks/useChatStreaming';
import { ChatHeader } from './ChatHeader';
import { EmptyChatState } from './EmptyChatState';
import { apiClient } from '../../../lib/apiClient';
import { ModalShell } from '../../../components/ui/ModalShell';

interface MainChatProps {
  user: UserSession | null;
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  onOpenSidebar?: () => void;
  onOpenSettings?: () => void;
  onOpenChangelog?: () => void;
}

export default function MainChat({ user, setChats, onOpenSidebar, onOpenSettings, onOpenChangelog }: MainChatProps) {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

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
  }, [messages, isTyping]);

  useEffect(() => {
    const handleGlobalKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activePlugin) handleClosePlugin();
        else if (isTyping) abortStream();
      }
    };
    window.addEventListener('keydown', handleGlobalKeydown);
    return () => window.removeEventListener('keydown', handleGlobalKeydown);
  }, [activePlugin, isTyping, abortStream]);

  const handleSend = async (content: string, pluginResult?: string) => {
    if (!content.trim() && !pluginResult) return;
    
    const tempId = `msg_${Date.now()}`;
    if (!pluginResult) {
      setMessages(prev => [...prev, { id: tempId, role: 'user', content }]);
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
        aiModel
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
      setIsSummarizing(true);
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
        setIsSummarizing(false);
      }
      return;
    }

    // Default fallback
    handleSend(command);
  };
  const [isSummarizing, setIsSummarizing] = useState(false);

  const renderPluginWrapper = (title: string, component: React.ReactNode, subtitle?: string) => (
    <ModalShell
      isOpen={true}
      onClose={handleClosePlugin}
      title={title}
      subtitle={subtitle}
      maxWidth="3xl"
    >
      <React.Suspense fallback={
        <div className="flex flex-col items-center justify-center h-48 p-8 text-slate-500 dark:text-slate-400 text-xs animate-pulse gap-2">
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
          onComplete={(score) => { 
            handleClosePlugin(); 
            showToast('Skrining berhasil diselesaikan.', 'success');
            handleSend('', `Saya telah menyelesaikan skrining mandiri PHQ-9 (skor: ${score.phq9.score}, kategori: ${score.phq9.severity}) dan GAD-7 (skor: ${score.gad7.score}, kategori: ${score.gad7.severity}). Catatan: Skrining ini adalah alat evaluasi mandiri awal dan BUKAN diagnosis medis.`); 
          }} 
        />,
        'Instrumen PHQ-9 & GAD-7 untuk deteksi dini'
      )}
      {activePlugin === 'counselors' && renderPluginWrapper(
        'Direktori Konselor & Psikolog Kampus',
        <CounselorDirectory onSelectCounselorForBooking={(counselor) => {
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

    <div className="flex-1 flex flex-col h-full min-h-0 bg-white dark:bg-slate-950 relative min-w-0 overflow-hidden">
      <ChatHeader 
        user={user}
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
      />

      <div className="flex-1 overflow-y-auto w-full min-w-0 flex flex-col px-3 sm:px-4 py-3 sm:py-4" ref={scrollContainerRef}>
        {isLoadingMessages ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-6 h-6 text-teal-600 dark:text-teal-400 animate-spin" />
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium animate-pulse">Memuat percakapan...</p>
            </div>
          </div>
        ) : fetchMessagesError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">Gagal Memuat Pesan</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs mb-4">{fetchMessagesError}</p>
            <button
              onClick={() => fetchMessages()}
              className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Coba Lagi
            </button>
          </div>
        ) : messages.length === 0 ? (
          <EmptyChatState userName={user?.name?.split(' ')[0]} onSelectPrompt={(prompt) => handleSend(prompt)} />
        ) : (
          <div className="max-w-3xl mx-auto space-y-4 sm:space-y-5 pb-6 w-full">
            {nextCursor && (
              <div className="flex justify-center mb-4">
                <button 
                  onClick={handleLoadMore} 
                  disabled={isLoadingMore}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5 min-h-[32px] cursor-pointer"
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
              <div className="flex gap-2.5 sm:gap-3">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-teal-50 dark:bg-teal-950/80 border border-teal-200/80 dark:border-teal-900 flex items-center justify-center shrink-0 mt-0.5 shadow-3xs p-1">
                  <img src="/favicon.svg" alt="RuangTenang" className="w-full h-full object-contain" />
                </div>
                <div className="pt-1 flex items-center gap-1.5 text-teal-600 dark:text-teal-400">
                  <span className="text-xs font-medium animate-pulse">RuangTenang sedang merespons</span>
                  <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></div>
                </div>
              </div>
            )}
            
            {!isTyping && followUps.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3 justify-end">
                {followUps.map((q, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => handleSend(q)} 
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-full text-xs text-slate-700 dark:text-slate-300 hover:border-teal-500/60 dark:hover:border-teal-500/60 hover:text-teal-700 dark:hover:text-teal-400 transition-colors shadow-3xs animate-fade-in text-left cursor-pointer"
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
          className="absolute bottom-20 right-4 sm:right-6 px-3 py-1.5 bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800 shadow-md rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all z-20 border border-teal-500 animate-bounce cursor-pointer"
        >
          <span>Pesan Terbaru</span>
          <ChevronDown className="w-3.5 h-3.5" />
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
