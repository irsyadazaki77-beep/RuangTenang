import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageBubble } from './MessageBubble';
import { ChatComposer } from './ChatComposer';
import { Message, ChatMode, ResponseStyle, Chat } from '../types';
import { UserSession } from '../../../types';
const ScreeningModal = React.lazy(() => import('../../../features/screening/ScreeningModal').then(m => ({ default: m.ScreeningModal })));
const CounselorDirectory = React.lazy(() => import('../../../features/counselors/CounselorDirectory').then(m => ({ default: m.CounselorDirectory })));
const UserProgressTracker = React.lazy(() => import('../../../features/mood/UserProgressTracker').then(m => ({ default: m.UserProgressTracker })));
const EmergencyCenter = React.lazy(() => import('../../../components/EmergencyCenter').then(m => ({ default: m.EmergencyCenter })));
const MentalHealthArticles = React.lazy(() => import('../../../components/MentalHealthArticles').then(m => ({ default: m.MentalHealthArticles })));
import { FileText, Ghost, RefreshCw, ChevronDown, Check, Settings, Menu, Sparkles, AlertTriangle } from 'lucide-react';
import { useToast } from '../../../components/Toast';
import { DEFAULT_AI_MODEL_ID, AVAILABLE_AI_MODELS } from '../../../lib/aiModels';
import { safeLocalStorage } from '../../../lib/storage';

import { useChatHistory } from '../hooks/useChatHistory';
import { useChatStreaming } from '../hooks/useChatStreaming';
import { ChatHeader } from './ChatHeader';
import { EmptyChatState } from './EmptyChatState';
import { apiClient } from '../../../lib/apiClient';

interface MainChatProps {
  user: UserSession | null;
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  onOpenSidebar?: () => void;
  onOpenSettings?: () => void;
}

export default function MainChat({ user, setChats, onOpenSidebar, onOpenSettings }: MainChatProps) {
  const { chatId } = useParams();
  const navigate = useNavigate();
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

  const handleOpenPlugin = (plugin: string) => setActivePlugin(plugin);
  const handleClosePlugin = () => setActivePlugin(null);

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
    if (chatId && chatId !== loadedChatIdRef.current) {
      fetchMessages();
    } else if (!chatId) {
      setMessages([]);
    }
  }, [chatId, fetchMessages, setMessages]);

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
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
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
    let assistantMsgId = '';

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
          setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '' }]);
        },
        onChunk: (text) => {
          setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: m.content + text } : m));
        },
        onPluginSwitch: (pluginName) => {
          setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: `Memuat fitur ${pluginName}...`, plugin: pluginName } : m));
        },
        onMessageComplete: (text) => {
          if (text) {
            setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: text } : m));
          }
        },
        onError: (err) => {
          setMessages(prev => {
            if (prev.some(m => m.id === assistantMsgId)) {
               return prev.map(m => m.id === assistantMsgId ? { ...m, content: err || 'Koneksi terputus.', error: true } : m);
            }
            showToast(err || 'Gagal mengirim pesan', 'error');
            return prev;
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
    
    // Optimistic update
    setMessages(prev => {
      const idx = prev.findIndex(m => m.id === msgId);
      if (idx === -1) return prev;
      
      const updated = [...prev];
      updated[idx] = { ...updated[idx], content: newContent, isEdited: true };
      
      // Remove all messages after this one if it's the last user message before assistant
      // In a real app, this would fork the conversation, but here we just truncate.
      return updated.slice(0, idx + 1);
    });

    try {
      if (chatId) {
        await apiClient.post(`/api/v1/chat/truncate-history`, { chatId, messageId: msgId });
      }
      handleSend(newContent);
    } catch (err) {
      showToast('Gagal mengedit pesan', 'error');
      fetchMessages(); // Revert
    }
  };

  const handleCommand = async (command: string) => {
    if (command === '/clear') {
      if (chatId) {
        if (confirm('Bersihkan riwayat percakapan ini?')) {
          await apiClient.delete(`/api/v1/chat/${chatId}/messages`);
          setMessages([]);
        }
      } else {
        setMessages([]);
      }
    } else if (command === '/summary') {
      if (!chatId) {
        showToast('Tidak ada percakapan untuk diringkas', 'info');
        return;
      }
      setIsSummarizing(true);
      try {
        const res = await apiClient.post(`/api/v1/chat/summary`, { chatId });
        if (res.success && res.data?.summary) {
          showToast(`Ringkasan: ${res.data.summary}`, 'success');
        } else {
          showToast('Gagal membuat ringkasan', 'error');
        }
      } finally {
        setIsSummarizing(false);
      }
    } else if (command === '/export') {
      showToast('Fitur ekspor akan segera tersedia', 'info');
    }
  };
  const [isSummarizing, setIsSummarizing] = useState(false);

  const renderPluginWrapper = (title: string, component: React.ReactNode) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl flex flex-col h-[85vh] max-h-[800px] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white">
          <h3 className="font-semibold text-slate-800 text-lg">{title}</h3>
          <button onClick={handleClosePlugin} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-2 sm:p-0">
          <React.Suspense fallback={<div className="flex items-center justify-center h-full p-8 text-slate-500 animate-pulse">Memuat modul {title}...</div>}>
            {component}
          </React.Suspense>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {activePlugin === 'screening' && renderPluginWrapper('Screening', <ScreeningModal isOpen={true} onClose={handleClosePlugin} onComplete={(score) => { handleClosePlugin(); handleSend('', `Saya telah menyelesaikan screening dengan skor PHQ-9: ${score.phq9.score}, GAD-7: ${score.gad7.score}`); }} />)}
      {activePlugin === 'counselors' && renderPluginWrapper('Direktori Konselor', <CounselorDirectory onSelectCounselorForBooking={() => {}} />)}
      {activePlugin === 'mood' && renderPluginWrapper('Progress Tracker', <UserProgressTracker />)}
      {activePlugin === 'articles' && renderPluginWrapper('Perpustakaan Edukasi', <MentalHealthArticles />)}
      {activePlugin === 'emergency' && renderPluginWrapper('Pusat Bantuan Darurat', <EmergencyCenter onTriggerSOS={() => {}} />)}

    <div className="flex-1 flex flex-col min-h-0 bg-white relative min-w-0">
      <ChatHeader 
        user={user}
        onOpenSidebar={onOpenSidebar}
        onOpenSettings={onOpenSettings}
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

      <div className="flex-1 overflow-y-auto w-full min-w-0 flex flex-col" ref={scrollContainerRef}>
        {isLoadingMessages ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-6 h-6 text-teal-600 animate-spin" />
              <p className="text-sm text-slate-500 font-medium animate-pulse">Memuat percakapan...</p>
            </div>
          </div>
        ) : fetchMessagesError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">Gagal Memuat Pesan</h3>
            <p className="text-slate-500 text-xs mb-4">{fetchMessagesError}</p>
            <button
              onClick={() => fetchMessages()}
              className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-medium transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        ) : messages.length === 0 ? (
          <EmptyChatState userName={user?.name?.split(' ')[0]} onSelectPrompt={(prompt) => handleSend(prompt)} />
        ) : (
          <div className="max-w-3xl mx-auto space-y-5 pb-12 w-full">
            {nextCursor && (
              <div className="flex justify-center mb-4">
                <button 
                  onClick={handleLoadMore} 
                  disabled={isLoadingMore}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5 min-h-[36px]"
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
                isTyping={isTyping && idx === messages.length - 1} 
                onRegenerate={() => {
                  const lastUser = messages.slice(0, idx).reverse().find((m: Message) => m.role === 'user');
                  if (lastUser) { if (chatId) handleEditMessage(lastUser.id, lastUser.content); else handleSend(lastUser.content); }
                }}
                onSendPluginResult={(res) => handleSend('', res)}
                onOpenPlugin={handleOpenPlugin}
                onEditMessage={handleEditMessage}
              />
            ))}
            
            {isTyping && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0 mt-0.5">
                  <img src="/favicon.svg" alt="RuangTenang" className="w-4 h-4 object-contain" />
                </div>
                <div className="pt-1 flex items-center gap-1.5 text-teal-600">
                  <span className="text-xs text-teal-700 font-medium animate-pulse">RuangTenang sedang merespons</span>
                  <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></div>
                </div>
              </div>
            )}
            
            {!isTyping && followUps.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 justify-end">
                {followUps.map((q, idx) => (
                  <button key={idx} onClick={() => handleSend(q)} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-700 hover:border-teal-400 hover:text-teal-700 transition-colors shadow-3xs animate-fade-in text-left">
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
      
      <ChatComposer onSend={handleSend} isTyping={isTyping} onStop={abortStream} chatId={chatId} onCommand={handleCommand} />
    </div>
    </>
  );
}
