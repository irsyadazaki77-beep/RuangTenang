import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Settings, Search, MessageSquare, MoreHorizontal, Edit2, Trash2, Pin, Archive, X, Heart, Stethoscope, Users, AlertCircle, LogOut, LogIn, Sun, Moon, Bell } from 'lucide-react';
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

export default function Sidebar({ isOpen, setIsOpen, onNewChat, chats, currentChatId, onSelectChat, onDeleteChat, onUpdateTitle, onTogglePin, onToggleArchive, onLogout, onOpenSettings, onOpenAuth, onOpenNotifications, user, isLoading }: SidebarProps) {
  const navigate = useNavigate();
  const { actualTheme, toggleTheme } = useTheme();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [searchResults, setSearchResults] = useState<Chat[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

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
    return (
      <div 
        key={c.id} 
        className={`group relative flex items-center gap-2 w-full px-2 py-0.5 min-h-[34px] rounded-lg text-[12.5px] transition-colors text-left ${
          isActive 
            ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-medium' 
            : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300'
        }`}
      >
        <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}`} />
        
        {editingId === c.id ? (
          <input 
            autoFocus
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onBlur={() => handleEditSubmit(c.id)}
            onKeyDown={e => e.key === 'Enter' && handleEditSubmit(c.id)}
            className="flex-1 bg-white dark:bg-slate-800 border border-teal-500 rounded px-2 py-0.5 text-[12px] text-slate-900 dark:text-slate-100 outline-none ring-2 ring-teal-500/20"
          />
        ) : (
          <button 
            onClick={() => { onSelectChat(c.id); setIsOpen(false); }} 
            className="flex-1 truncate text-left min-h-[34px] flex items-center"
          >
            {c.title}
          </button>
        )}

        <div className="relative shrink-0">
          <button 
            aria-label="Menu Percakapan" 
            onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === c.id ? null : c.id); }} 
            className={`p-1 min-h-[28px] min-w-[28px] flex items-center justify-center rounded-md hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-500 transition-opacity ${
              menuOpenId === c.id ? 'opacity-100' : 'md:opacity-0 md:group-hover:opacity-100 opacity-100 focus-within:opacity-100'
            }`}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          
          <AnimatePresence>
            {menuOpenId === c.id && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 shadow-sm rounded-xl py-1 z-50 text-[13px] text-slate-700 dark:text-slate-200"
              >
                <button onClick={(e) => { e.stopPropagation(); setEditingId(c.id); setEditTitle(c.title); setMenuOpenId(null); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                  <Edit2 className="w-3.5 h-3.5 text-slate-400" /> Ubah Nama
                </button>
                <button onClick={(e) => { e.stopPropagation(); onTogglePin(c.id); setMenuOpenId(null); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                  <Pin className="w-3.5 h-3.5 text-slate-400" /> {c.isPinned ? 'Lepas Pin' : 'Sematkan Pin'}
                </button>
                <button onClick={(e) => { e.stopPropagation(); onToggleArchive(c.id); setMenuOpenId(null); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                  <Archive className="w-3.5 h-3.5 text-slate-400" /> {c.isArchived ? 'Buka Arsip' : 'Arsipkan'}
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDeleteChat(c.id); setMenuOpenId(null); }} className="w-full text-left px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <Trash2 className="w-3.5 h-3.5" /> Hapus
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  const searchInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [isOpen, setIsOpen]);

  // Lock body scroll on mobile when sidebar drawer is open
  useEffect(() => {
    if (isOpen && window.innerWidth < 1024) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-200" 
          onClick={() => setIsOpen(false)} 
        />
      )}
      <aside className={`fixed lg:sticky lg:top-0 lg:h-[100dvh] inset-y-0 left-0 z-50 w-[min(82vw,260px)] lg:w-60 shrink-0 bg-stone-50 dark:bg-slate-900 border-r border-slate-200/70 dark:border-slate-800 flex flex-col transform transition-transform duration-200 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        
        {/* Top Header */}
        <div className="px-3.5 flex items-center justify-between border-b border-slate-200/70 dark:border-slate-800 h-[48px] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-[26px] h-[26px] rounded-md bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 shadow-xs flex items-center justify-center shrink-0 p-0.5">
              <img src="/favicon.svg" alt="RuangTenang Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-[14px] tracking-tight text-slate-900 dark:text-slate-100 leading-none truncate">RuangTenang</span>
          </div>
          <button 
            onClick={() => setIsOpen(false)} 
            className="lg:hidden p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center" 
            aria-label="Tutup Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Primary CTA */}
        <div className="p-2.5 pb-1">
          <button 
            onClick={() => { onNewChat(); setIsOpen(false); }} 
            className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-1.5 px-3 text-[12.5px] font-semibold transition-colors cursor-pointer min-h-[38px] shadow-xs" 
            title="Chat Baru"
          >
            <Plus className="w-4 h-4" /> Chat Baru
          </button>
        </div>

        {/* Search */}
        <div className="px-2.5 pb-1.5">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400" />
            <input 
              ref={searchInputRef}
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari percakapan" 
              className="w-full bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 rounded-lg pl-7.5 pr-7 py-1 min-h-[36px] text-[12.5px] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-teal-500/80 transition-colors"
            />
            <div className="absolute right-2 flex items-center pointer-events-none">
              <span className="hidden lg:inline text-[9px] font-medium text-slate-400 border border-slate-200 dark:border-slate-700 rounded px-1 py-0.2">Ctrl K</span>
            </div>
          </div>
        </div>

        {/* Toggle Archive */}
        <div className="px-3 py-1 flex items-center justify-between text-[10.5px] text-slate-500 dark:text-slate-400">
          <span className="font-medium uppercase tracking-wider">{showArchived ? 'Arsip Percakapan' : 'Riwayat'}</span>
          <button 
            onClick={() => setShowArchived(!showArchived)} 
            className="hover:text-teal-600 dark:hover:text-teal-400 font-semibold cursor-pointer min-h-[24px]"
          >
            {showArchived ? 'Lihat Aktif' : 'Arsip'}
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto px-1.5 space-y-1 py-0.5 custom-scrollbar" onClick={() => setMenuOpenId(null)}>
          {isLoading ? (
            <div className="space-y-1.5 px-2 pt-1.5">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse space-y-1">
                  <div className="h-2 w-10 bg-slate-200 dark:bg-slate-800 rounded"></div>
                  <div className="h-8 bg-slate-200/70 dark:bg-slate-800/70 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : pinnedChats.length === 0 && Object.values(groups).every(g => g.length === 0) ? (
            <div className="text-center text-slate-400 dark:text-slate-500 mt-4 text-[11.5px] px-3">
              {search ? 'Tidak ada percakapan.' : (showArchived ? 'Belum ada arsip.' : 'Belum ada percakapan.')}
            </div>
          ) : (
            <>
              {pinnedChats.length > 0 && (
                <div>
                  <div className="px-2 mb-0.5 mt-0.5 text-[9.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">Pinned</div>
                  <div className="space-y-0.5">{pinnedChats.map(renderChatItem)}</div>
                </div>
              )}

              {Object.entries(groups).map(([label, groupChats]) => groupChats.length > 0 && (
                <div key={label}>
                  <div className="px-2 mb-0.5 mt-1.5 text-[9.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</div>
                  <div className="space-y-0.5">{groupChats.map(renderChatItem)}</div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Secondary Tools Navigation */}
        <div className="px-1.5 py-1.5 space-y-0.5 border-t border-slate-200/70 dark:border-slate-800">
          <div className="px-2 mb-0.5 text-[9.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Layanan</div>
          <button 
            onClick={() => { navigate('/mood'); setIsOpen(false); }} 
            className="w-full flex items-center gap-2.5 px-2.5 min-h-[36px] rounded-lg hover:bg-slate-100/80 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer text-[12.5px]"
          >
            <Heart className="w-4 h-4 text-slate-500 shrink-0" /> Mood & Progress
          </button>
          <button 
            onClick={() => { navigate('/screening'); setIsOpen(false); }} 
            className="w-full flex items-center gap-2.5 px-2.5 min-h-[36px] rounded-lg hover:bg-slate-100/80 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer text-[12.5px]"
          >
            <Stethoscope className="w-4 h-4 text-slate-500 shrink-0" /> Skrining
          </button>
          <button 
            onClick={() => { navigate('/counselors'); setIsOpen(false); }} 
            className="w-full flex items-center gap-2.5 px-2.5 min-h-[36px] rounded-lg hover:bg-slate-100/80 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer text-[12.5px]"
          >
            <Users className="w-4 h-4 text-slate-500 shrink-0" /> Konselor
          </button>
          <button 
            onClick={() => { onOpenNotifications?.(); setIsOpen(false); }} 
            className="w-full flex items-center justify-between px-2.5 min-h-[36px] rounded-lg hover:bg-slate-100/80 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer text-[12.5px]"
          >
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-slate-500 shrink-0" /> Notifikasi
            </div>
            {unreadNotificationsCount > 0 && (
              <span className="bg-rose-500 text-white font-bold text-[9px] h-4 px-1 rounded-full flex items-center justify-center animate-pulse">
                {unreadNotificationsCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => { navigate('/emergency'); setIsOpen(false); }} 
            className="w-full flex items-center gap-2.5 px-2.5 min-h-[36px] rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-medium transition-colors cursor-pointer text-[12.5px]"
          >
            <AlertCircle className="w-4 h-4 shrink-0" /> Darurat
          </button>
        </div>

        <div className="h-px bg-slate-200/70 dark:border-slate-800 mx-2.5 my-0.5" />

        {/* Bottom Profile & Settings & Theme */}
        <div className="px-1.5 pb-2 pt-0.5 space-y-0.5">
          <button 
            onClick={() => { onOpenSettings?.(); setIsOpen(false); }} 
            className="w-full flex items-center gap-2.5 px-2.5 min-h-[36px] rounded-lg hover:bg-slate-100/80 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer text-[12.5px]"
          >
            <Settings className="w-4 h-4 text-slate-500 shrink-0" /> Pengaturan
          </button>
          
          <button 
            onClick={toggleTheme} 
            className="w-full flex items-center justify-between px-2.5 min-h-[36px] rounded-lg hover:bg-slate-100/80 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer text-[12.5px]"
            title="Ganti Mode Tampilan"
          >
            <div className="flex items-center gap-2.5">
              {actualTheme === 'dark' ? (
                <Moon className="w-4 h-4 text-slate-500 shrink-0" />
              ) : (
                <Sun className="w-4 h-4 text-slate-500 shrink-0" />
              )}
              Tema
            </div>
            <div className={`w-[24px] h-[13px] rounded-full p-0.5 transition-colors flex items-center ${actualTheme === 'dark' ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
              <div className={`w-2 h-2 rounded-full bg-white shadow-xs transform transition-transform ${actualTheme === 'dark' ? 'translate-x-2.5' : 'translate-x-0'}`} />
            </div>
          </button>

          {user?.role === 'guest' ? (
            <button 
              onClick={() => { onOpenAuth?.(); setIsOpen(false); }} 
              className="w-full flex items-center gap-2.5 px-2.5 mt-0.5 min-h-[36px] rounded-lg hover:bg-slate-100/80 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer text-[12.5px]"
            >
              <LogIn className="w-4 h-4 text-slate-500 shrink-0" /> Masuk
            </button>
          ) : (
            <div className="flex items-center justify-between px-1 py-0.5 mt-0.5">
              <button
                onClick={() => { onOpenSettings?.(); setIsOpen(false); }}
                className="flex flex-1 items-center gap-2 min-w-0 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 p-1 min-h-[36px] rounded-lg transition-colors text-left cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0 font-bold text-[11px]">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[12px] font-bold text-slate-900 dark:text-slate-100 truncate leading-tight">{user?.name || 'User'}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate leading-tight">
                    {user?.email || (user?.role === 'counselor' ? 'Konselor' : 'Mahasiswa')}
                  </span>
                </div>
              </button>
              {onLogout && (
                <button 
                  onClick={onLogout}
                  title="Keluar"
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}



