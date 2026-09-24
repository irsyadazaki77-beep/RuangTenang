import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { MessageBubble } from './MessageBubble';
import { StreamingBubble } from './StreamingBubble';
import { ChatComposer } from './ChatComposer';
import { Message, ChatMode, ResponseStyle, Chat } from '../types';
import { UserSession } from '../../../types';
import { ChatModalContainer } from './ChatModalContainer';
import { RefreshCw, ChevronDown, Sparkles, Clock, Wind, Calendar, ArrowDown, Shield, Eye, X, Video } from 'lucide-react';
import { useToast } from '../../../components/Toast';
import { Appointment } from '../../../types';
import { parseAppointmentDateTime } from '../../../lib/calendarAndReminders';
import { DEFAULT_AI_MODEL_ID } from '../../../lib/aiModels';
import { safeLocalStorage } from '../../../lib/storage';

import { useChatHistory } from '../hooks/useChatHistory';
import { useChatStreaming } from '../hooks/useChatStreaming';
import { ChatHeader } from './ChatHeader';
import { EmptyChatState } from './EmptyChatState';
import { ChatSkeleton } from '../../../components/common/Skeleton';
import { ErrorState } from '../../../components/common/ErrorState';
import { apiClient } from '../../../lib/apiClient';
import { ChatSearchBar } from './ChatSearchBar';
import { RhythmicTypingIndicator } from '../../../components/ui/RhythmicTypingIndicator';
import { detectAcademicDistress } from '../../workspace/utils/distressDetector';
import { usePrivacyVault } from '../../../contexts/PrivacyVaultContext';

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
  const { isIncognitoMode } = usePrivacyVault();

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

  // --- Feature 6: Guided Breathing Modal State ---
  const [isBreathingOpen, setIsBreathingOpen] = useState(false);

  // --- Feature 7: Grounding 5-4-3-2-1 Sensory Modal State ---
  const [isGroundingOpen, setIsGroundingOpen] = useState(false);

  // --- Feature 8: Privacy Shield State (Instant Blur untuk Privasi Kampus) ---
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);

  // --- Feature 9: Upcoming Appointment Reminder Capsule (48 Jam ke Depan) ---
  const [upcomingAppointment, setUpcomingAppointment] = useState<{
    appointment: Appointment;
    countdownText: string;
  } | null>(null);
  const [isReminderDismissed, setIsReminderDismissed] = useState(false);

  useEffect(() => {
    if (!user || user.role === 'guest') return;

    apiClient.get<any[]>('/api/v1/appointments?limit=upcoming')
      .then(res => {
        if (!res.success || !Array.isArray(res.data) || res.data.length === 0) {
          setUpcomingAppointment(null);
          return;
        }

        const now = Date.now();
        const maxThresholdMs = 48 * 60 * 60 * 1000; // 48 jam

        // Cari appointment terdekat yang CONFIRMED / APPROVED atau SCHEDULED
        for (const item of res.data) {
          if (item.status === 'CANCELLED' || item.status === 'REJECTED') continue;

          const dateStr = item.date;
          const timeSlot = `${item.time} ${item.timezone || 'WIB'}`;
          const timeData = parseAppointmentDateTime(dateStr, timeSlot, item.timezone);
          const aptTime = timeData.startDate.getTime();
          const diffMs = aptTime - now;

          if (diffMs > 0 && diffMs <= maxThresholdMs) {
            // Hitung teks human-friendly countdown
            const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));
            const minsLeft = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

            let countdownText: string;
            const isToday = new Date().toDateString() === timeData.startDate.toDateString();
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const isTomorrow = tomorrow.toDateString() === timeData.startDate.toDateString();

            if (isToday) {
              countdownText = `Hari ini pukul ${item.time} (${hoursLeft > 0 ? `${hoursLeft} jam lagi` : `${minsLeft} menit lagi`})`;
            } else if (isTomorrow) {
              countdownText = `Besok pukul ${item.time}`;
            } else {
              countdownText = `Dalam ${hoursLeft} jam (pukul ${item.time})`;
            }

            const formatted: Appointment = {
              id: item.id,
              counselorId: item.counselorId,
              counselorName: item.counselor?.name || item.counselorName || 'Konselor Kampus',
              counselorTitle: item.counselor?.title || 'Psikolog Klinis Kampus',
              counselorAvatar: item.counselor?.avatar || '',
              studentName: item.studentName || user.name,
              studentNIM: item.studentNIM || '',
              studentEmail: item.studentEmail || user.email,
              studentPhone: '0812xxxxxx',
              date: item.date,
              timeSlot: `${item.time} ${item.timezone || 'WIB'}`,
              timezone: item.timezone || 'WIB',
              mode: item.mode || 'video_call',
              primaryConcern: item.notes || 'Konseling Mental',
              status: item.status,
              approvalStatus: item.approvalStatus || 'APPROVED',
              attendanceStatus: item.attendanceStatus || 'SCHEDULED',
              meetingLink: item.meetingLink || `https://meet.jit.si/ruangtenang-session-${item.id}`,
              reminderEnabled: true,
              reminderMinutesBefore: 30,
              createdAt: item.createdAt
            };

            setUpcomingAppointment({
              appointment: formatted,
              countdownText
            });
            break;
          }
        }
      })
      .catch(() => {
        // Abaikan jika network offline
      });
  }, [user]);

  const handleTogglePrivacy = useCallback(() => {
    setIsPrivacyMode(prev => {
      const next = !prev;
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(next ? [30, 40] : 25);
        } catch {
          // Graceful fallback
        }
      }
      return next;
    });
  }, []);

  // Quick unlock with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPrivacyMode) {
        setIsPrivacyMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPrivacyMode]);

  const handleOpenPlugin = useCallback((plugin: string) => {
    if (plugin === 'breathing') {
      setIsBreathingOpen(true);
      return;
    }
    if (plugin === 'grounding' || plugin === '54321' || plugin === 'panik') {
      setIsGroundingOpen(true);
      return;
    }
    setActivePlugin(plugin);
  }, []);
  const handleClosePlugin = useCallback(() => setActivePlugin(null), []);

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
    if (location.state && (location.state as any).discussScreening) {
      const res = (location.state as any).discussScreening;
      // Clear navigation state instantly to respect privacy and prevent double triggers
      window.history.replaceState({}, document.title);

      const phqScore = res.phq9?.score ?? 0;
      const phqSeverity = res.phq9?.severity ?? 'Minimal';
      const gadScore = res.gad7?.score ?? 0;
      const gadSeverity = res.gad7?.severity ?? 'Minimal';

      const initialPrompt = `Halo RuangTenang, aku baru saja menyelesaikan evaluasi kesehatan mental dengan hasil PHQ-9: ${phqScore}/27 (${phqSeverity}) dan GAD-7: ${gadScore}/21 (${gadSeverity}). Boleh bantu aku memahami apa yang sedang terjadi pada diriku dan langkah kecil apa yang bisa aku ambil hari ini?`;

      // Trigger automatic discussion safely after short delay
      const delay = setTimeout(() => {
        handleSend(initialPrompt);
      }, 500);

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

  // Sinkronisasi status AI streaming ke root ambient Aurora mesh
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('rt-aurora-streaming', { detail: { isStreaming: isTyping } })
    );
  }, [isTyping]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [quotaExceededInfo, setQuotaExceededInfo] = useState<{
    isExceeded: boolean;
    message?: string;
    resetAt?: string;
  } | null>(null);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  // Dynamic visualViewport management for mobile virtual keyboards (iOS / Android)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const updateViewportHeight = () => {
      if (window.visualViewport) {
        if (window.innerWidth < 768) {
          setViewportHeight(window.visualViewport.height);
        } else {
          setViewportHeight(null);
        }
      }
    };

    updateViewportHeight();
    const vv = window.visualViewport;
    vv.addEventListener('resize', updateViewportHeight);
    vv.addEventListener('scroll', updateViewportHeight, { passive: true });

    return () => {
      vv.removeEventListener('resize', updateViewportHeight);
      vv.removeEventListener('scroll', updateViewportHeight);
    };
  }, []);

  useEffect(() => {
    if (chatId !== loadedChatIdRef.current) {
      abortStream();
      if (chatId) {
        fetchMessages();
      } else {
        setMessages([]);
      }
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
      const nearBottom = scrollHeight - scrollTop - clientHeight <= 120;
      setIsAtBottom(nearBottom);
      setShowScrollBottom(!nearBottom);
    } else {
      const nearBottom = document.documentElement.scrollHeight - window.scrollY - window.innerHeight <= 120;
      setIsAtBottom(nearBottom);
      setShowScrollBottom(!nearBottom);
    }
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      if (el) el.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    if (scrollContainerRef.current) {
      if (smooth && typeof scrollContainerRef.current.scrollTo === 'function') {
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      } else {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }
    setIsAtBottom(true);
    setShowScrollBottom(false);
  }, []);

  // Smart Auto-Scroll: Smoothly auto-scroll during stream with RAF dampener
  const scrollRafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isAtBottom || !scrollContainerRef.current) return;
    
    if (scrollRafRef.current) {
      cancelAnimationFrame(scrollRafRef.current);
    }

    scrollRafRef.current = requestAnimationFrame(() => {
      const el = scrollContainerRef.current;
      if (!el) return;
      const target = el.scrollHeight;
      const distance = target - (el.scrollTop + el.clientHeight);
      if (distance > 2) {
        // If small token progression, follow immediately without heavy layout jumps
        // If large gap, smooth scroll gently
        el.scrollTo({
          top: target,
          behavior: distance > 240 ? 'smooth' : 'auto'
        });
      }
    });

    return () => {
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    };
  }, [messages, isTyping, streamingMessage?.content, isAtBottom]);

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
  const handleToggleBookmark = useCallback(async (messageId: string, currentStatus: boolean) => {
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
  }, [user, chatId, showToast]);

  // Backend search integration across all messages in conversation
  const [backendMatchedIds, setBackendMatchedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!searchQuery.trim() || !chatId) {
      setBackendMatchedIds([]);
      return;
    }

    let isSubscribed = true;
    const q = searchQuery.trim();

    const timer = setTimeout(() => {
      apiClient.get<any>(`/api/chat/${chatId}/search?q=${encodeURIComponent(q)}`)
      .then(res => {
        if (!isSubscribed) return;
        const results = res.data?.results || (res as any).results || res.data;
        if (Array.isArray(results)) {
          setBackendMatchedIds(results.map((r: any) => r.id));
        } else {
          setBackendMatchedIds([]);
        }
      })
      .catch(() => {
        if (isSubscribed) setBackendMatchedIds([]);
      });
    }, 400);

    return () => {
      clearTimeout(timer);
      isSubscribed = false;
    };
  }, [chatId, searchQuery]);

  // Combined search matches (backend + local)
  const searchMatches = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const localMatches = messages.filter(m => m.content && m.content.toLowerCase().includes(q)).map(m => m.id);
    if (!chatId) return localMatches;

    const combinedSet = new Set([...backendMatchedIds, ...localMatches]);
    return Array.from(combinedSet);
  }, [messages, searchQuery, chatId, backendMatchedIds]);

  const scrollToMatchedMessage = useCallback((targetId: string) => {
    const el = document.getElementById(`msg-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (nextCursor && !isLoadingMore) {
      // If message is in older un-rendered page, load more messages
      fetchMessages(nextCursor);
    }
  }, [nextCursor, isLoadingMore, fetchMessages]);

  useEffect(() => {
    setCurrentSearchIndex(0);
    if (searchMatches.length > 0) {
      const targetId = searchMatches[0];
      scrollToMatchedMessage(targetId);
    }
  }, [searchMatches, scrollToMatchedMessage]);

  const handleSearchNext = () => {
    if (searchMatches.length === 0) return;
    const nextIdx = (currentSearchIndex + 1) % searchMatches.length;
    setCurrentSearchIndex(nextIdx);
    const targetId = searchMatches[nextIdx];
    scrollToMatchedMessage(targetId);
  };

  const handleSearchPrev = () => {
    if (searchMatches.length === 0) return;
    const prevIdx = (currentSearchIndex - 1 + searchMatches.length) % searchMatches.length;
    setCurrentSearchIndex(prevIdx);
    const targetId = searchMatches[prevIdx];
    scrollToMatchedMessage(targetId);
  };

  useEffect(() => {
    if (currentChat) {
      setUseMemoryForChat(currentChat.useMemory !== false);
    }
  }, [currentChat]);

  // Branch conversation trigger
  const handleOpenBranch = useCallback((messageId: string, contentSnippet: string) => {
    setBranchTarget({ messageId, contentSnippet });
    setIsBranchModalOpen(true);
  }, []);

  const handleChatBranched = (newChat: Chat) => {
    setChats(prev => [newChat, ...prev]);
    navigate(`/c/${newChat.id}`);
  };

  const handleSend = useCallback(async (content: string, pluginResult?: string, attachments?: any[]) => {
    if (!content.trim() && !pluginResult && (!attachments || attachments.length === 0)) return;
    
    const tempId = `msg_${Date.now()}`;
    const distressCheck = content ? detectAcademicDistress(content) : null;

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
            setMessages(prev => [
              ...prev,
              {
                id: assistantMsgId,
                role: 'assistant',
                content: text,
                plugin: distressCheck?.isDistressed ? 'burnout' : undefined,
                pluginResult: distressCheck?.isDistressed
                  ? {
                      distressType: distressCheck.distressType,
                      triggerReason: distressCheck.suggestedAction,
                      triggerKeywords: distressCheck.triggerKeywords
                    }
                  : undefined
              }
            ]);
          }
          setStreamingMessage(null);
        },
        onQuotaExceeded: (data) => {
          setStreamingMessage(null);
          setQuotaExceededInfo({
            isExceeded: true,
            message: data.message,
            resetAt: data.resetAt
          });
        },
        onError: (err) => {
          setStreamingMessage(null);
          if (err.includes('DAILY_LIMIT_EXCEEDED') || err.toLowerCase().includes('kuota') || err.toLowerCase().includes('limit')) {
            const tomorrow = new Date();
            tomorrow.setUTCHours(24, 0, 0, 0);
            setQuotaExceededInfo({
              isExceeded: true,
              message: err,
              resetAt: tomorrow.toISOString()
            });
            return;
          }
          showToast(err || 'Gagal mengirim pesan', 'error');
          setMessages(prev => {
            if (prev.some(m => m.id === assistantMsgId)) {
               return prev.map(m => m.id === assistantMsgId ? { ...m, content: err || 'Koneksi terputus.', error: true } : m);
            }
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
  }, [chatId, isTemporary, chatMode, responseStyle, aiModel, streamMessage, navigate, setChats, showToast, setMessages]);

  const handleEditMessage = useCallback(async (msgId: string, newContent: string) => {
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
  }, [messages, chatId, handleSend, setMessages, fetchMessages, showToast]);

  const handleRegenerate = useCallback((messageId?: string) => {
    // Cari pesan user terakhir sebelum messageId ini (atau pesan user terakhir jika tidak ada messageId)
    let lastUser: Message | undefined;
    if (messageId) {
      const idx = messages.findIndex(m => m.id === messageId);
      if (idx !== -1) {
        lastUser = messages.slice(0, idx).reverse().find((m: Message) => m.role === 'user');
      }
    }
    if (!lastUser) {
      lastUser = [...messages].reverse().find((m: Message) => m.role === 'user');
    }

    if (lastUser) {
      if (chatId) {
        handleEditMessage(lastUser.id, lastUser.content);
      } else {
        handleSend(lastUser.content);
      }
    }
  }, [messages, chatId, handleEditMessage, handleSend]);

  const handleSendPluginResult = useCallback((res: string) => {
    handleSend('', res);
  }, [handleSend]);

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

    if (cleanCmd === '/jeda' || cleanCmd === '/breath' || cleanCmd === '/breathing') {
      setIsBreathingOpen(true);
      return;
    }

    if (cleanCmd === '/grounding' || cleanCmd === '/54321' || cleanCmd === '/panik') {
      setIsGroundingOpen(true);
      return;
    }

    if (cleanCmd === '/articles') {
      handleOpenPlugin('articles');
      return;
    }

    if (cleanCmd === '/screening' || cleanCmd === '/skrining') {
      handleOpenPlugin('screening');
      return;
    }

    if (cleanCmd === '/counselor' || cleanCmd === '/counselors' || cleanCmd === '/konselor') {
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
  

  return (
    <>
      <ChatModalContainer
        activePlugin={activePlugin}
        onClosePlugin={handleClosePlugin}
        onScreeningComplete={(score: any) => {
          handleClosePlugin();
          showToast('Skrining berhasil diselesaikan.', 'success');
          handleSend('', `Saya telah menyelesaikan skrining mandiri PHQ-9 (skor: ${score.phq9.score}, kategori: ${score.phq9.severity}) dan GAD-7 (skor: ${score.gad7.score}, kategori: ${score.gad7.severity}). Catatan: Skrining ini adalah alat evaluasi mandiri awal dan BUKAN diagnosis medis.`);
        }}
        onTriggerSOS={() => showToast('Sinyal SOS darurat diaktifkan.', 'info')}
        isSummaryModalOpen={isSummaryModalOpen}
        onCloseSummaryModal={() => setIsSummaryModalOpen(false)}
        isBookmarksModalOpen={isBookmarksModalOpen}
        onCloseBookmarksModal={() => setIsBookmarksModalOpen(false)}
        onBookmarkRemoved={(msgId) => {
          setBookmarkedMessageIds(prev => {
            const next = new Set(prev);
            next.delete(msgId);
            return next;
          });
        }}
        isBranchModalOpen={isBranchModalOpen}
        onCloseBranchModal={() => {
          setIsBranchModalOpen(false);
          setBranchTarget(null);
        }}
        branchTarget={branchTarget}
        onChatBranched={handleChatBranched}
        isMemoryModalOpen={isMemoryModalOpen}
        onCloseMemoryModal={() => setIsMemoryModalOpen(false)}
        useMemoryForChat={useMemoryForChat}
        onToggleChatMemory={(val) => {
          setUseMemoryForChat(val);
          if (chatId) {
            setChats(prev => prev.map(c => c.id === chatId ? { ...c, useMemory: val } : c));
          }
        }}
        isBreathingOpen={isBreathingOpen}
        onCloseBreathing={() => setIsBreathingOpen(false)}
        isGroundingOpen={isGroundingOpen}
        onCloseGrounding={() => setIsGroundingOpen(false)}
        onOpenBreathing={() => setIsBreathingOpen(true)}
        chatId={chatId}
        currentChatTitle={currentChat?.title}
      />

    <div 
      className="flex-1 flex flex-col h-full h-[100dvh] min-h-0 bg-transparent relative min-w-0 overflow-hidden"
      style={viewportHeight ? { height: `${viewportHeight}px`, maxHeight: `${viewportHeight}px` } : undefined}
    >
      {/* Konten Chat Utama (z-10 relative di atas ambient aurora root) */}
      <div className="relative z-10 flex flex-col flex-1 h-full min-h-0 overflow-hidden bg-transparent">
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
        onOpenGrounding={() => setIsGroundingOpen(true)}
        hasMessages={messages.length > 0}
        isPrivacyMode={isPrivacyMode}
        onTogglePrivacy={handleTogglePrivacy}
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

      {/* Chat Messages Area Container with Privacy Shield */}
      <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden bg-transparent">
        {/* Feature 9: Glassmorphic Reminder Capsule for Upcoming Appointment (< 48 hours) */}
        {upcomingAppointment && !isReminderDismissed && (
          <div className="px-3 sm:px-4 pt-2.5 pb-1 shrink-0 z-20 animate-fade-in">
            <div className="max-w-3xl mx-auto surface-card/85 backdrop-blur-md rounded-2xl border border-teal-200/60 dark:border-teal-800/60 p-2.5 sm:p-3 shadow-md hover:shadow-lg transition-all flex items-center justify-between gap-3 bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-cyan-500/10">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Video className="w-4 h-4 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-primary truncate">
                      Sesi Konseling Mendatang
                    </span>
                    <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200">
                      Terkonfirmasi
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-secondary truncate">
                    Bersama <strong className="text-teal-700 dark:text-teal-300 font-semibold">{upcomingAppointment.appointment.counselorName}</strong> • {upcomingAppointment.countdownText}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => navigate('/counselors', { state: { selectedAppointment: upcomingAppointment.appointment } })}
                  className="px-3 py-1.5 min-h-[34px] rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-3xs hover:shadow-xs transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <span>Masuk Ruang Sesi / Detail</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsReminderDismissed(true)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Tutup Pengingat"
                  aria-label="Tutup Pengingat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div 
          className={`flex-1 overflow-y-auto chat-scroll-container w-full min-w-0 flex flex-col px-3 sm:px-4 pt-3 sm:pt-4 pb-40 sm:pb-36 transition-all duration-300 bg-transparent ${
            isPrivacyMode ? 'backdrop-blur-md filter blur-md select-none pointer-events-none' : ''
          }`} 
          ref={scrollContainerRef}
        >
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
          <div className="min-h-full flex flex-col justify-between my-auto w-full">
            <EmptyChatState 
              userName={user?.name?.split(' ')[0]} 
              onSelectPrompt={(prompt) => handleSend(prompt)} 
              onOpenBreathing={() => setIsBreathingOpen(true)}
            />
          </div>
        ) : (
          <div key={chatId || 'empty'} className="max-w-3xl mx-auto space-y-4 sm:space-y-5 pb-6 w-full animate-fade-in">
            {/* Mode Anonim (Zero-Log) Banner */}
            {isIncognitoMode && (
              <div className="p-3 rounded-2xl bg-purple-50/90 dark:bg-purple-950/50 border border-purple-200/80 dark:border-purple-800 text-purple-900 dark:text-purple-200 text-xs flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 animate-pulse" />
                  <div>
                    <span className="font-bold">Mode Anonim Aktif (Zero-Log)</span>
                    <span className="text-purple-700/80 dark:text-purple-300/80 ml-1.5 hidden sm:inline">
                      • Pesan percakapan ini tidak disimpan di riwayat atau server.
                    </span>
                  </div>
                </div>
              </div>
            )}

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
            
            {messages.map((msg) => (
              <MessageBubble 
                key={msg.id} 
                msg={msg} 
                isTyping={false} 
                onRegenerate={handleRegenerate}
                onSendPluginResult={handleSendPluginResult}
                onOpenPlugin={handleOpenPlugin}
                onEditMessage={handleEditMessage}
                isBookmarked={bookmarkedMessageIds.has(msg.id)}
                onBookmarkToggle={handleToggleBookmark}
                onBranch={handleOpenBranch}
                searchHighlightQuery={isSearchOpen ? searchQuery : undefined}
                isSearchTarget={isSearchOpen && searchMatches[currentSearchIndex] === msg.id}
              />
            ))}
            
            {streamingMessage && (
              <StreamingBubble 
                key={streamingMessage.id} 
                msg={streamingMessage} 
              />
            )}
            
            {isTyping && !streamingMessage && messages[messages.length - 1]?.role !== 'assistant' && (
              <RhythmicTypingIndicator label="RuangTenang sedang merespons..." />
            )}
            
            {!isTyping && followUps.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3 justify-end">
                {followUps.map((q, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => handleSend(q)} 
                    className="px-3 py-1.5 bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 rounded-full text-xs text-slate-600 dark:text-slate-300 transition-colors text-left cursor-pointer chip-tactile active:scale-[0.96]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Empathetic Quota Closure Card */}
            {quotaExceededInfo?.isExceeded && (
              <div className="mx-auto max-w-2xl my-4 animate-in fade-in zoom-in-95 duration-200 w-full">
                <div className="p-4 sm:p-5 rounded-2xl bg-teal-50/90 dark:bg-slate-850 border border-teal-200/90 dark:border-teal-900/80 shadow-md text-slate-800 dark:text-slate-100 space-y-3.5">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 shrink-0 mt-0.5">
                      <Sparkles className="w-5 h-5 animate-pulse" />
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <h4 className="font-bold text-sm sm:text-base text-teal-950 dark:text-teal-100">
                        Terima kasih telah berbagi hari ini
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {quotaExceededInfo.message || "Kamu sudah meluangkan waktu untuk berbagi banyak hal hari ini. Istirahat sejenak ya. Sambil menunggu kuota harianmu di-reset, kamu bisa mencoba relaksasi pernapasan atau menjadwalkan konsultasi dengan konselor kami."}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-teal-200/60 dark:border-teal-900/60 text-xs">
                    <div className="flex items-center gap-1.5 text-teal-800 dark:text-teal-300 font-medium">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>Reset kuota otomatis besok pukul 00:00 WIB</span>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setIsBreathingOpen(true)}
                        className="flex-1 sm:flex-initial px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                      >
                        <Wind className="w-3.5 h-3.5" />
                        <span>Mulai Latihan Napas</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/appointments')}
                        className="flex-1 sm:flex-initial px-3.5 py-2 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-600 flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                      >
                        <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        <span>Jadwalkan Konselor</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} className="h-2" />
          </div>
        )}
        </div>

        {/* Privacy Shield Instant Blur Overlay */}
        {isPrivacyMode && (
          <div 
            onClick={handleTogglePrivacy}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') handleTogglePrivacy();
            }}
            aria-label="Layar disamarkan untuk privasi Anda. Klik untuk membuka kembali"
            className="absolute inset-0 z-30 flex flex-col items-center justify-center p-4 sm:p-6 bg-stone-900/35 dark:bg-black/55 backdrop-blur-xs cursor-pointer select-none transition-all duration-200 animate-fade-in"
          >
            <div 
              className="max-w-md w-full mx-auto p-6 sm:p-7 rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-stone-200/80 dark:border-slate-800 shadow-2xl flex flex-col items-center text-center space-y-4 transform transition-transform hover:scale-[1.01] active:scale-[0.99]"
            >
              <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200/70 dark:border-teal-800/70 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-inner">
                <Shield className="w-8 h-8 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base sm:text-lg font-serif font-semibold text-stone-900 dark:text-stone-100">
                  Mode Privasi Aktif
                </h3>
                <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-200 leading-relaxed font-medium">
                  Layar disamarkan untuk privasi Anda. Klik untuk membuka kembali
                </p>
                <p className="text-[11px] text-stone-400 dark:text-stone-500">
                  Isi obrolan Anda aman dan terlindungi dari pandangan orang di sekitar kampus.
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTogglePrivacy();
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white text-xs font-semibold shadow-md shadow-teal-700/20 transition cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Buka Tampilan Obrolan</span>
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Smart Floating "Pesan Baru ↓" Button */}
      {showScrollBottom && !isPrivacyMode && (
        <button 
          onClick={() => scrollToBottom(true)} 
          className="absolute bottom-24 sm:bottom-22 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-full shadow-lg text-xs font-semibold flex items-center gap-1.5 transition-all animate-bounce cursor-pointer active:scale-95 border border-teal-400/50"
          title="Pesan Baru ↓"
          aria-label="Gulir ke Pesan Baru"
        >
          <span>Pesan Baru ↓</span>
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
      )}
      
        <ChatComposer 
          onSend={handleSend} 
          isTyping={isTyping} 
          onStop={abortStream} 
          chatId={chatId} 
          onCommand={handleCommand}
          onOpenPlugin={handleOpenPlugin}
          quotaExceeded={quotaExceededInfo?.isExceeded}
        />
      </div>
    </div>
    </>
  );
}
