import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Settings, 
  Search, 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  Pin, 
  Archive, 
  X, 
  Heart, 
  Stethoscope, 
  Users, 
  AlertCircle, 
  LogOut, 
  LogIn, 
  Sun, 
  Moon, 
  Bell, 
  GitBranch,
  Menu
} from 'lucide-react';
import { isToday, isYesterday } from 'date-fns';
import { Chat } from '../../features/chat/types';
import { motion, AnimatePresence } from 'motion/react';
import { apiClient } from '../../lib/apiClient';
import { useTheme } from '../../contexts/ThemeContext';
import { getNotifications } from '../../lib/notificationStore';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onNewChat: () => void;
  chats: Chat[];
  currentChatId?: string;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  onTogglePin: (id: string) => void;
  onToggleArchive: (id: string) => void;
  onLogout?: () => void;
  onOpenSettings?: () => void;
  onOpenAuth?: () => void;
  onOpenChangelog?: () => void;
  onOpenNotifications?: () => void;
  user?: any;
  isLoading?: boolean;
}

export default function Sidebar({
  isOpen,
  setIsOpen,
  onNewChat,
  chats,
  currentChatId,
  onSelectChat,
  onDeleteChat,
  onUpdateTitle,
  onTogglePin,
  onToggleArchive,
  onLogout,
  onOpenSettings,
  onOpenAuth,
  onOpenNotifications,
  user,
  isLoading
}: SidebarProps) {
  const navigate = useNavigate();
  const { actualTheme, toggleTheme } = useTheme();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [searchResults, setSearchResults] = useState<Chat[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  // Sync unread notifications count
  useEffect(() => {
    const updateUnread = () => {
      try {
        const list = getNotifications();
        setUnreadNotificationsCount(list.filter(n => !n.read).length);
      } catch (err) {
        console.warn(err);
      }
    };
    updateUnread();
    window.addEventListener('ruangtenang_notifications_updated', updateUnread);
    return () => window.removeEventListener('ruangtenang_notifications_updated', updateUnread);
  }, []);

  // Real-time server search with debouncing
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    
    let isCancelled = false;
    const delay = setTimeout(() => {
      apiClient.get(`/api/v1/chat/search?q=${encodeURIComponent(search.trim())}`)
        .then(res => {
          if (!isCancelled) {
            if (res.success && Array.isArray(res.data)) {
              setSearchResults(res.data);
            } else {
              setSearchResults([]);
            }
          }
        })
        .catch(err => {
          if (!isCancelled) {
            console.error('Failed to search chats:', err);
            setSearchResults([]);
          }
        });
    }, 300);
    return () => {
      isCancelled = true;
      clearTimeout(delay);
    };
  }, [search]);

  // Keyboard shortcut listener: Cmd+K / Ctrl+K, Cmd+N / Ctrl+N, and Escape
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(true);
        searchInputRef.current?.focus();
      } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'n') {
        const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (targetTag !== 'input' && targetTag !== 'textarea') {
          e.preventDefault();
          onNewChat();
          setIsOpen(false);
        }
      } else if (e.key === 'Escape') {
        if (menuOpenId) {
          setMenuOpenId(null);
        } else if (editingId) {
          setEditingId(null);
        } else if (isOpen) {
          setIsOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [isOpen, setIsOpen, onNewChat, menuOpenId, editingId]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuOpenId && menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpenId]);

  // Lock body scroll on mobile when sidebar drawer is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const displayChats = search.trim() ? searchResults : chats;
  const filteredChats = displayChats.filter(c => (showArchived ? c.isArchived : !c.isArchived) && !c.isTemporary);

  const pinnedChats = filteredChats.filter(c => c.isPinned);
  const unpinnedChats = filteredChats.filter(c => !c.isPinned);

  const safeParseDate = (d: any): Date | null => {
    if (!d) return null;
    const date = new Date(d);
    return isNaN(date.getTime()) ? null : date;
  };

  const isTodaySafe = (d: any) => {
    const parsed = safeParseDate(d);
    return parsed ? isToday(parsed) : false;
  };

  const isYesterdaySafe = (d: any) => {
    const parsed = safeParseDate(d);
    return parsed ? isYesterday(parsed) : false;
  };

  const isWithin7DaysSafe = (d: any) => {
    const parsed = safeParseDate(d);
    if (!parsed) return false;
    const now = new Date();
    const diffDays = (now.getTime() - parsed.getTime()) / (1000 * 3600 * 24);
    return diffDays <= 7 && !isToday(parsed) && !isYesterday(parsed);
  };

  const groups = {
    'Hari Ini': unpinnedChats.filter(c => isTodaySafe(c.updatedAt)),
    'Kemarin': unpinnedChats.filter(c => isYesterdaySafe(c.updatedAt)),
    '7 Hari Terakhir': unpinnedChats.filter(c => isWithin7DaysSafe(c.updatedAt)),
    'Lebih Lama': unpinnedChats.filter(c => !isTodaySafe(c.updatedAt) && !isYesterdaySafe(c.updatedAt) && !isWithin7DaysSafe(c.updatedAt))
  };

  const handleEditSubmit = (id: string) => {
    if (editTitle.trim()) onUpdateTitle(id, editTitle);
    setEditingId(null);
  };

  const renderChatItem = (c: Chat) => {
    const isActive = currentChatId === c.id;
    const isMenuOpen = menuOpenId === c.id;

    return (
      <div 
        key={c.id} 
        className={`group relative flex items-center justify-between w-full px-3 py-2 text-xs sm:text-sm rounded-full transition-colors duration-150 text-left min-h-[38px] ${
          isActive 
            ? 'bg-slate-200/80 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium' 
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/80'
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 pr-1">
          {c.isPinned && (
            <Pin className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
          )}
          {c.parentChatId && (
            <GitBranch className="w-3.5 h-3.5 shrink-0 text-teal-600 dark:text-teal-400" />
          )}
          
          {editingId === c.id ? (
            <input 
              autoFocus
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onBlur={() => handleEditSubmit(c.id)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleEditSubmit(c.id);
                if (e.key === 'Escape') setEditingId(null);
              }}
              className="flex-1 bg-white dark:bg-slate-900 border border-teal-500/70 rounded-full px-2.5 py-0.5 text-xs text-slate-900 dark:text-slate-100 outline-none ring-2 ring-teal-500/20"
            />
          ) : (
            <button 
              type="button"
              onClick={() => { onSelectChat(c.id); setIsOpen(false); }} 
              className="flex-1 truncate max-w-[170px] text-left cursor-pointer focus:outline-none"
              title={c.title}
            >
              {c.title}
            </button>
          )}
        </div>

        {/* Hover / Active Kebab Menu (Titik Tiga Gemini Style) */}
        <div className="relative shrink-0" ref={isMenuOpen ? menuContainerRef : undefined}>
          <button 
            type="button"
            aria-label="Menu Percakapan" 
            onClick={(e) => { 
              e.stopPropagation(); 
              setMenuOpenId(isMenuOpen ? null : c.id); 
            }} 
            className={`p-1 hover:bg-slate-300/60 dark:hover:bg-slate-700 rounded-full transition-all cursor-pointer ${
              isMenuOpen 
                ? 'opacity-100 text-slate-700 dark:text-slate-200 bg-slate-300/60 dark:bg-slate-700' 
                : 'opacity-0 group-hover:opacity-100 focus:opacity-100 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: -4 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95, y: -4 }} 
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xl rounded-2xl py-1.5 z-50 text-xs text-slate-700 dark:text-slate-200 backdrop-blur-md"
              >
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setEditingId(c.id); setEditTitle(c.title); setMenuOpenId(null); }} 
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-400" /> Ubah Nama
                </button>
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onTogglePin(c.id); setMenuOpenId(null); }} 
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <Pin className="w-3.5 h-3.5 text-slate-400" /> {c.isPinned ? 'Lepas Pin' : 'Sematkan Pin'}
                </button>
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onToggleArchive(c.id); setMenuOpenId(null); }} 
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <Archive className="w-3.5 h-3.5 text-slate-400" /> {c.isArchived ? 'Buka Arsip' : 'Arsipkan'}
                </button>
                <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDeleteChat(c.id); setMenuOpenId(null); }} 
                  className="w-full text-left px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hapus
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-200" 
          onClick={() => setIsOpen(false)} 
        />
      )}

      {/* Main Sidebar Container (Google Gemini Style) */}
      <aside 
        className={`fixed lg:sticky lg:top-0 lg:h-[100dvh] inset-y-0 left-0 z-50 w-[270px] shrink-0 bg-[#f8fafc] dark:bg-[#131314] border-r border-slate-200/70 dark:border-slate-800/60 flex flex-col pt-safe pb-safe transform transition-transform duration-200 ease-out will-change-transform select-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* ========================================================================= */}
        {/* 1. HEADER & TOMBOL "CHAT BARU" (TOP AREA) */}
        {/* ========================================================================= */}
        <div className="p-3 pb-2 space-y-2 shrink-0">
          {/* Top Panel Toggle / Header Brand */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                aria-label="Toggle Sidebar"
                title="Sembunyikan / Tampilkan Sidebar"
              >
                <Menu className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 shadow-2xs flex items-center justify-center shrink-0 p-0.5">
                  <img src="/favicon.svg" alt="RuangTenang" className="w-full h-full object-contain" />
                </div>
                <span className="font-semibold text-sm tracking-tight text-slate-900 dark:text-slate-100 truncate">
                  RuangTenang
                </span>
              </div>
            </div>

            {/* Mobile Close X Button */}
            <button 
              type="button"
              onClick={() => setIsOpen(false)} 
              className="lg:hidden p-2 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer" 
              aria-label="Tutup Sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 1. "+ Obrolan Baru" Slim Ultra-Modern Pill */}
          <button 
            type="button"
            onClick={() => { onNewChat(); setIsOpen(false); }} 
            className="h-10 px-3.5 w-full rounded-full flex items-center justify-between text-xs sm:text-sm font-medium transition-all bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/70 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/60 dark:border-slate-750 cursor-pointer group active:scale-[0.99]" 
            aria-label="Chat Baru (Obrolan Baru)"
          >
            <div className="flex items-center gap-2.5">
              <Plus className="w-4 h-4 text-slate-600 dark:text-slate-300 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors shrink-0" />
              <span>Obrolan baru</span>
            </div>
            <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded border border-slate-300/40 dark:border-slate-700 font-mono select-none">
              ⌘N
            </span>
          </button>

          {/* 2. Seamless Bilah Pencarian Capsule */}
          <div 
            className="h-8 px-3 rounded-full flex items-center gap-2 text-xs text-slate-400 bg-transparent hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors cursor-pointer my-1 border border-transparent focus-within:border-slate-200/80 dark:focus-within:border-slate-700/80 focus-within:bg-white dark:focus-within:bg-slate-850"
            onClick={() => searchInputRef.current?.focus()}
          >
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 pointer-events-none" />
            <input 
              ref={searchInputRef}
              value={search} 
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari..." 
              className="flex-1 w-full bg-transparent text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 outline-none leading-none min-w-0"
            />
            {search ? (
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); setSearch(''); }} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer shrink-0"
                aria-label="Bersihkan pencarian"
              >
                <X className="w-3 h-3" />
              </button>
            ) : (
              <span className="hidden lg:inline text-[9.5px] text-slate-400 select-none font-mono shrink-0">
                ⌘K
              </span>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. RIWAYAT PERCAKAPAN (RECENT CHATS - GEMINI STYLE) */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1 py-1 custom-scrollbar" onClick={() => setMenuOpenId(null)}>
          <div className="px-3 flex items-center justify-between my-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {showArchived ? 'Arsip Obrolan' : 'Terbaru'}
            </span>
            <button 
              type="button"
              onClick={() => setShowArchived(!showArchived)} 
              className="text-[10.5px] text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer"
            >
              {showArchived ? 'Aktif' : 'Arsip'}
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-2 px-3 pt-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse space-y-1">
                  <div className="h-2 w-12 bg-slate-200 dark:bg-slate-800 rounded"></div>
                  <div className="h-8 bg-slate-200/60 dark:bg-slate-800/60 rounded-full"></div>
                </div>
              ))}
            </div>
          ) : pinnedChats.length === 0 && Object.values(groups).every(g => g.length === 0) ? (
            <div className="text-center text-slate-400 dark:text-slate-500 py-8 text-xs font-normal">
              {search ? 'Tidak ada obrolan ditemukan' : 'Mulai obrolan pertamamu'}
            </div>
          ) : (
            <>
              {pinnedChats.length > 0 && (
                <div className="mb-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 my-2">
                    Disematkan
                  </div>
                  <div className="space-y-0.5">{pinnedChats.map(renderChatItem)}</div>
                </div>
              )}

              {Object.entries(groups).map(([label, groupChats]) => groupChats.length > 0 && (
                <div key={label} className="mb-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 my-2">
                    {label}
                  </div>
                  <div className="space-y-0.5">{groupChats.map(renderChatItem)}</div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 3. MENU LAYANAN KAMPUS & BANTUAN DARURAT (MONOKROM MINIMALIS) */}
        {/* ========================================================================= */}
        <div className="px-2 py-2 border-t border-slate-200/60 dark:border-slate-800/80 my-2 mx-2 space-y-0.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 mb-1.5">
            Layanan Kampus
          </div>
          
          <button 
            type="button"
            onClick={() => { navigate('/mood'); setIsOpen(false); }} 
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors group cursor-pointer"
          >
            <Heart className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors shrink-0" />
            <span>Mood & Jurnal</span>
          </button>

          <button 
            type="button"
            onClick={() => { navigate('/screening'); setIsOpen(false); }} 
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors group cursor-pointer"
          >
            <Stethoscope className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors shrink-0" />
            <span>Skrining Mandiri</span>
          </button>

          <button 
            type="button"
            onClick={() => { navigate('/counselors'); setIsOpen(false); }} 
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors group cursor-pointer"
          >
            <Users className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors shrink-0" />
            <span>Direktori Konselor</span>
          </button>

          <button 
            type="button"
            onClick={() => { onOpenNotifications?.(); setIsOpen(false); }} 
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors shrink-0" />
              <span>Notifikasi</span>
            </div>
            {unreadNotificationsCount > 0 && (
              <span className="bg-rose-500 text-white font-semibold text-[9.5px] h-4 min-w-4 px-1 rounded-full flex items-center justify-center">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Bantuan Darurat - Soft Red Accent with Tiny Red Dot */}
          <button 
            type="button"
            onClick={() => { navigate('/emergency'); setIsOpen(false); }} 
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>Bantuan Darurat</span>
            </div>
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 4. FOOTER / USER PROFILE (SATU BARIS PROFIL ELEGAN) */}
        {/* ========================================================================= */}
        <div className="mt-auto border-t border-slate-200/50 dark:border-slate-800/60 pt-2.5 pb-3 px-3 shrink-0 flex items-center justify-between gap-2">
          {/* Sisi Kiri: Avatar Inisial & Nama / Sesi Tamu */}
          {user?.role === 'guest' || !user ? (
            <button 
              type="button"
              onClick={() => { onOpenAuth?.(); setIsOpen(false); }} 
              className="flex items-center gap-2 p-1 -ml-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors cursor-pointer min-w-0 flex-1 text-left group"
              title="Masuk Akun"
            >
              <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[11px] font-semibold text-slate-600 dark:text-slate-300 shrink-0 group-hover:bg-slate-300 dark:group-hover:bg-slate-600 transition-colors">
                <LogIn className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                Masuk Akun
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { onOpenSettings?.(); setIsOpen(false); }}
              className="flex items-center gap-2 p-1 -ml-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors cursor-pointer min-w-0 flex-1 text-left group"
              title={user?.name || 'Profil Pengguna'}
            >
              <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[11px] font-semibold text-slate-600 dark:text-slate-300 shrink-0 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                {user?.name || 'User'}
              </span>
            </button>
          )}

          {/* Sisi Kanan: Pengaturan & Tema Toggle */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button 
              type="button"
              onClick={() => { onOpenSettings?.(); setIsOpen(false); }} 
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Pengaturan"
              title="Pengaturan"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button 
              type="button"
              onClick={toggleTheme} 
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Ganti Tema"
              title={actualTheme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
            >
              {actualTheme === 'dark' ? (
                <Moon className="w-4 h-4 text-amber-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-600" />
              )}
            </button>

            {user?.role !== 'guest' && user && onLogout && (
              <button 
                type="button"
                onClick={onLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                aria-label="Keluar"
                title="Keluar"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}




