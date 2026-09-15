import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Settings, Search, MoreHorizontal, Edit2, Trash2, Pin, Archive, X, Heart, Stethoscope, Users, AlertCircle, LogOut, LogIn, Sun, Moon, Bell, GitBranch } from 'lucide-react';
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
        className={`group relative flex items-center gap-1.5 w-full px-2.5 py-1.5 rounded-lg text-[13px] transition-colors duration-150 text-left min-h-[38px] ${
          isActive 
            ? 'bg-stone-200/80 dark:bg-slate-800 text-stone-900 dark:text-stone-100 font-medium shadow-2xs' 
            : 'hover:bg-stone-100/90 dark:hover:bg-slate-800/50 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
        }`}
      >
        {c.isPinned && (
          <Pin className="w-3.5 h-3.5 shrink-0 text-stone-400 dark:text-stone-500" />
        )}
        {c.parentChatId && (
          <GitBranch className="w-3.5 h-3.5 shrink-0 text-teal-600 dark:text-teal-400"  />
        )}
        
        {editingId === c.id ? (
          <input 
            autoFocus
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onBlur={() => handleEditSubmit(c.id)}
            onKeyDown={e => e.key === 'Enter' && handleEditSubmit(c.id)}
            className="flex-1 bg-white dark:bg-slate-800 border border-teal-500/70 rounded-md px-2 py-0.5 text-[12.5px] text-stone-900 dark:text-stone-100 outline-none ring-2 ring-teal-500/20"
          />
        ) : (
          <button 
            onClick={() => { onSelectChat(c.id); setIsOpen(false); }} 
            className="flex-1 truncate text-left min-h-[34px] flex items-center pr-1 cursor-pointer"
          >
            {c.title}
          </button>
        )}

        <div className="relative shrink-0">
          <button 
            aria-label="Menu Percakapan" 
            onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === c.id ? null : c.id); }} 
            className={`min-h-[32px] min-w-[32px] flex items-center justify-center rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/70 dark:hover:bg-slate-700 transition-all cursor-pointer ${
              menuOpenId === c.id ? 'opacity-100 bg-stone-200/70 dark:bg-slate-700' : 'opacity-80 sm:opacity-0 group-hover:opacity-100 focus:opacity-100'
            }`}
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          
          <AnimatePresence>
            {menuOpenId === c.id && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.96, y: -4 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.96, y: -4 }} 
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-1 w-38 bg-white dark:bg-slate-900 border border-stone-200/80 dark:border-slate-800 shadow-lg rounded-xl py-1 z-50 text-xs text-stone-700 dark:text-stone-200"
              >
                <button onClick={(e) => { e.stopPropagation(); setEditingId(c.id); setEditTitle(c.title); setMenuOpenId(null); }} className="w-full text-left px-3 py-1.5 hover:bg-stone-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-colors min-h-[34px]">
                  <Edit2 className="w-3.5 h-3.5 text-stone-400" /> Ubah Nama
                </button>
                <button onClick={(e) => { e.stopPropagation(); onTogglePin(c.id); setMenuOpenId(null); }} className="w-full text-left px-3 py-1.5 hover:bg-stone-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-colors min-h-[34px]">
                  <Pin className="w-3.5 h-3.5 text-stone-400" /> {c.isPinned ? 'Lepas Pin' : 'Sematkan Pin'}
                </button>
                <button onClick={(e) => { e.stopPropagation(); onToggleArchive(c.id); setMenuOpenId(null); }} className="w-full text-left px-3 py-1.5 hover:bg-stone-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-colors min-h-[34px]">
                  <Archive className="w-3.5 h-3.5 text-stone-400" /> {c.isArchived ? 'Buka Arsip' : 'Arsipkan'}
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDeleteChat(c.id); setMenuOpenId(null); }} className="w-full text-left px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2 cursor-pointer transition-colors min-h-[34px]">
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
          className="fixed inset-0 bg-slate-900/30 z-40 lg:hidden backdrop-blur-xs transition-opacity duration-200" 
          onClick={() => setIsOpen(false)} 
        />
      )}
      <aside className={`fixed lg:sticky lg:top-0 lg:h-[100dvh] inset-y-0 left-0 z-50 w-[260px] shrink-0 bg-stone-50/95 dark:bg-[#0f141c] border-r border-slate-200/60 dark:border-slate-800/70 flex flex-col pt-safe pb-safe transform transition-transform duration-200 ease-out will-change-transform ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        
        {/* Top Header */}
        <div className="px-3.5 flex items-center justify-between h-12 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 shadow-2xs flex items-center justify-center shrink-0 p-0.5">
              <img src="/favicon.svg" alt="RuangTenang" className="w-full h-full object-contain" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-slate-900 dark:text-slate-100 leading-none truncate">RuangTenang</span>
          </div>
          <button 
            onClick={() => setIsOpen(false)} 
            className="lg:hidden p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center" 
            aria-label="Tutup Sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat Action Button */}
        <div className="px-3 pt-1 pb-1.5">
          <button 
            onClick={() => { onNewChat(); setIsOpen(false); }} 
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/70 border border-slate-200/70 dark:border-slate-800/80 transition-all cursor-pointer group active:scale-[0.99]" 
            
            aria-label="Chat Baru (Obrolan Baru)"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-slate-500 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors" />
              <span>Obrolan baru</span>
            </div>
            <span className="hidden sm:inline text-[10px] text-slate-400 font-sans">⌘N</span>
          </button>
        </div>

        {/* Subtle Search */}
        <div className="px-3 pb-2">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
            <input 
              ref={searchInputRef}
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari riwayat percakapan..." 
              className="w-full bg-slate-100/70 dark:bg-slate-800/40 border border-transparent focus:border-slate-300 dark:focus:border-slate-700 focus:bg-white dark:focus:bg-slate-800 rounded-lg pl-8 pr-7 py-1.5 text-[12.5px] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none transition-all"
            />
            {search ? (
              <button onClick={() => setSearch('')} className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5">
                <X className="w-3 h-3" />
              </button>
            ) : (
              <span className="absolute right-2 hidden lg:inline text-[9px] text-slate-400 select-none">⌘K</span>
            )}
          </div>
        </div>

        {/* Archive Toggle Row */}
        <div className="px-3.5 py-1 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
          <span className="font-semibold uppercase tracking-wider text-[10px]">{showArchived ? 'Arsip' : 'Riwayat'}</span>
          <button 
            onClick={() => setShowArchived(!showArchived)} 
            className="hover:text-teal-600 dark:hover:text-teal-400 font-medium cursor-pointer py-0.5 transition-colors"
          >
            {showArchived ? 'Lihat Aktif' : 'Lihat Arsip'}
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5 py-0.5 custom-scrollbar" onClick={() => setMenuOpenId(null)}>
          {isLoading ? (
            <div className="space-y-2 px-2 pt-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse space-y-1">
                  <div className="h-2 w-12 bg-slate-200 dark:bg-slate-800 rounded"></div>
                  <div className="h-7 bg-slate-200/60 dark:bg-slate-800/60 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : pinnedChats.length === 0 && Object.values(groups).every(g => g.length === 0) ? (
            <div className="text-center text-slate-400 dark:text-slate-500 mt-6 text-[12px] px-3 font-normal">
              {search ? 'Tidak ada hasil pencarian.' : (showArchived ? 'Belum ada arsip.' : 'Belum ada obrolan.')}
            </div>
          ) : (
            <>
              {pinnedChats.length > 0 && (
                <div className="pb-1">
                  <div className="px-2 pt-2 pb-1 text-[10.5px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Disematkan</div>
                  <div className="space-y-0.5">{pinnedChats.map(renderChatItem)}</div>
                </div>
              )}

              {Object.entries(groups).map(([label, groupChats]) => groupChats.length > 0 && (
                <div key={label} className="pb-1">
                  <div className="px-2 pt-2.5 pb-1 text-[10.5px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</div>
                  <div className="space-y-0.5">{groupChats.map(renderChatItem)}</div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Secondary Tools Navigation */}
        <div className="px-2 py-1.5 space-y-0.5 border-t border-stone-200/60 dark:border-slate-800/70">
          <div className="px-2 pt-0.5 pb-0.5 text-[10.5px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Layanan Kampus</div>
          <button 
            onClick={() => { navigate('/mood'); setIsOpen(false); }} 
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-stone-100/90 dark:hover:bg-slate-800/60 text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 font-medium transition-colors cursor-pointer text-[13px] min-h-[38px]"
          >
            <Heart className="w-3.5 h-3.5 text-rose-500/80 shrink-0" /> Mood & Catatan
          </button>
          <button 
            onClick={() => { navigate('/screening'); setIsOpen(false); }} 
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-stone-100/90 dark:hover:bg-slate-800/60 text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 font-medium transition-colors cursor-pointer text-[13px] min-h-[38px]"
          >
            <Stethoscope className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" /> Skrining Mandiri
          </button>
          <button 
            onClick={() => { navigate('/counselors'); setIsOpen(false); }} 
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-stone-100/90 dark:hover:bg-slate-800/60 text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 font-medium transition-colors cursor-pointer text-[13px] min-h-[38px]"
          >
            <Users className="w-3.5 h-3.5 text-blue-500/80 shrink-0" /> Direktori Konselor
          </button>
          <button 
            onClick={() => { onOpenNotifications?.(); setIsOpen(false); }} 
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-stone-100/90 dark:hover:bg-slate-800/60 text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 font-medium transition-colors cursor-pointer text-[13px] min-h-[38px]"
          >
            <div className="flex items-center gap-2.5">
              <Bell className="w-3.5 h-3.5 text-amber-500/80 shrink-0" /> Notifikasi
            </div>
            {unreadNotificationsCount > 0 && (
              <span className="bg-rose-500 text-white font-bold text-[9.5px] h-3.5 px-1 rounded-full flex items-center justify-center">
                {unreadNotificationsCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => { navigate('/emergency'); setIsOpen(false); }} 
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-medium transition-colors cursor-pointer text-[13px] min-h-[38px]"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Bantuan Darurat
          </button>
        </div>

        {/* Bottom Profile & Settings & Theme */}
        <div className="px-2 pb-2.5 pt-1 border-t border-stone-200/60 dark:border-slate-800/70 space-y-0.5">
          <div className="flex items-center justify-between px-1.5 py-0.5 text-stone-600 dark:text-stone-400 text-[13px]">
            <button 
              onClick={() => { onOpenSettings?.(); setIsOpen(false); }} 
              className="flex items-center gap-2 hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer min-h-[36px]"
            >
              <Settings className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span>Pengaturan</span>
            </button>
            <button 
              onClick={toggleTheme} 
              className="min-h-[34px] min-w-[34px] flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              aria-label="Ganti Tema"
            >
              {actualTheme === 'dark' ? <Moon className="w-3.5 h-3.5 text-amber-400" /> : <Sun className="w-3.5 h-3.5 text-amber-600" />}
            </button>
          </div>

          {user?.role === 'guest' ? (
            <button 
              onClick={() => { onOpenAuth?.(); setIsOpen(false); }} 
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-stone-100/90 dark:hover:bg-slate-800/60 text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 font-medium transition-colors cursor-pointer text-[13px] min-h-[38px]"
            >
              <LogIn className="w-3.5 h-3.5 text-stone-400 shrink-0" /> Masuk Akun
            </button>
          ) : (
            <div className="flex items-center justify-between px-1 py-0.5">
              <button
                onClick={() => { onOpenSettings?.(); setIsOpen(false); }}
                className="flex flex-1 items-center gap-2 min-w-0 hover:bg-stone-100/90 dark:hover:bg-slate-800/60 p-1 rounded-lg transition-colors text-left cursor-pointer min-h-[38px]"
              >
                <div className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 flex items-center justify-center shrink-0 font-semibold text-[11px]">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium text-stone-900 dark:text-stone-100 truncate leading-tight">{user?.name || 'User'}</span>
                  <span className="text-[10.5px] text-stone-400 dark:text-stone-500 truncate leading-tight">
                    {user?.email || (user?.role === 'counselor' ? 'Konselor' : 'Mahasiswa')}
                  </span>
                </div>
              </button>
              {onLogout && (
                <button 
                  onClick={onLogout}
                  className="min-h-[34px] min-w-[34px] text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors shrink-0 flex items-center justify-center cursor-pointer"
                  title="Keluar"
                  aria-label="Keluar"
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



