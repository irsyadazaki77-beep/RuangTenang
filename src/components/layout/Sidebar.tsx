import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Settings, Search, MessageSquare, MoreHorizontal, Edit2, Trash2, Pin, Archive, X, Heart, Stethoscope, Users, AlertCircle, LogOut } from 'lucide-react';
import { isToday, isYesterday } from 'date-fns';
import { Chat } from '../../features/chat/types';
import { motion, AnimatePresence } from 'motion/react';
import { AiQuotaBadge } from '../AiQuotaBadge';
import { apiClient } from '../../lib/apiClient';

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
  isLoading?: boolean;
}

export default function Sidebar({ isOpen, setIsOpen, onNewChat, chats, currentChatId, onSelectChat, onDeleteChat, onUpdateTitle, onTogglePin, onToggleArchive, onLogout, onOpenSettings, isLoading }: SidebarProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [searchResults, setSearchResults] = useState<Chat[]>([]);

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    
    const delay = setTimeout(() => {
      apiClient.get(`/api/v1/chat/search?q=${encodeURIComponent(search.trim())}`)
        .then(res => {
          if (res.success && Array.isArray(res.data)) {
            setSearchResults(res.data);
          } else {
            setSearchResults([]);
          }
        })
        .catch(err => {
          console.error('Failed to search chats:', err);
          setSearchResults([]);
        });
    }, 300);
    return () => clearTimeout(delay);
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

  const groups = {
    'Hari Ini': unpinnedChats.filter(c => isTodaySafe(c.updatedAt)),
    'Kemarin': unpinnedChats.filter(c => isYesterdaySafe(c.updatedAt)),
    'Sebelumnya': unpinnedChats.filter(c => !isTodaySafe(c.updatedAt) && !isYesterdaySafe(c.updatedAt))
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
        className={`group relative flex items-center gap-2.5 w-full px-2.5 py-2 min-h-[44px] rounded-xl text-xs transition-all text-left ${
          isActive 
            ? 'bg-teal-50/90 text-teal-950 font-semibold border-l-2 border-teal-600 shadow-3xs' 
            : 'hover:bg-slate-100/80 text-slate-700 font-medium'
        }`}
      >
        <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
        
        {editingId === c.id ? (
          <input 
            autoFocus
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onBlur={() => handleEditSubmit(c.id)}
            onKeyDown={e => e.key === 'Enter' && handleEditSubmit(c.id)}
            className="flex-1 bg-white border border-teal-500 rounded-lg px-2 py-1 text-base sm:text-xs outline-none ring-2 ring-teal-500/20"
          />
        ) : (
          <button 
            onClick={() => { onSelectChat(c.id); setIsOpen(false); }} 
            className="flex-1 truncate text-left min-h-[44px] flex items-center"
          >
            {c.title}
          </button>
        )}

        <div className="relative shrink-0">
          <button 
            aria-label="Menu Percakapan" 
            onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === c.id ? null : c.id); }} 
            className={`p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-slate-200/80 text-slate-500 transition-opacity ${
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
                className="absolute right-0 top-full mt-1 w-36 bg-white border border-slate-200 shadow-md rounded-xl py-1 z-50 text-xs"
              >
                <button onClick={(e) => { e.stopPropagation(); setEditingId(c.id); setEditTitle(c.title); setMenuOpenId(null); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2">
                  <Edit2 className="w-3.5 h-3.5 text-slate-400" /> Ubah Nama
                </button>
                <button onClick={(e) => { e.stopPropagation(); onTogglePin(c.id); setMenuOpenId(null); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2">
                  <Pin className="w-3.5 h-3.5 text-slate-400" /> {c.isPinned ? 'Lepas Pin' : 'Sematkan Pin'}
                </button>
                <button onClick={(e) => { e.stopPropagation(); onToggleArchive(c.id); setMenuOpenId(null); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2">
                  <Archive className="w-3.5 h-3.5 text-slate-400" /> {c.isArchived ? 'Buka Arsip' : 'Arsipkan'}
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDeleteChat(c.id); setMenuOpenId(null); }} className="w-full text-left px-3 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2">
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

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-slate-900/20 z-40 lg:hidden backdrop-blur-2xs" onClick={() => setIsOpen(false)} />}
      <div className={`fixed lg:sticky lg:top-0 lg:h-[100dvh] inset-y-0 left-0 z-50 w-[min(84vw,320px)] lg:w-[224px] shrink-0 bg-stone-50/90 border-r border-stone-200/80 flex flex-col transform transition-transform duration-200 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        
        {/* Top Header */}
        <div className="p-3 flex items-center justify-between border-b border-stone-200/60 h-13 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white border border-teal-200/80 shadow-3xs flex items-center justify-center shrink-0 p-1">
              <img src="/favicon.svg" alt="RuangTenang Logo" className="w-6 h-6 object-contain" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm tracking-tight text-slate-900 leading-none">RuangTenang</span>
              <span className="text-[9.5px] text-teal-700 font-medium tracking-tight mt-0.5 truncate">Kesehatan Mental</span>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="lg:hidden p-1 text-slate-400 hover:text-slate-700 hover:bg-stone-200/60 rounded-lg" aria-label="Close Sidebar">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat Primary CTA */}
        <div className="p-2.5 pb-1.5">
          <button 
            onClick={() => { onNewChat(); setIsOpen(false); }} 
            className="w-full flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-700 active:scale-[0.99] text-white rounded-xl py-2 px-3 text-xs font-semibold transition-all shadow-3xs" 
            title="Chat Baru (Ctrl+Shift+O)"
          >
            <Plus className="w-3.5 h-3.5" /> Chat Baru
          </button>
        </div>

        {/* Search */}
        <div className="px-2.5 pb-1.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              ref={searchInputRef}
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari percakapan (Ctrl+K)..." 
              className="w-full bg-white/80 border border-stone-200/80 rounded-xl pl-7 pr-2.5 py-1.5 text-base sm:text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500/60 transition-all"
            />
          </div>
        </div>

        {/* Toggle Archive */}
        <div className="px-3 py-1 flex items-center justify-between text-[11px] text-slate-500">
          <span>{showArchived ? 'Arsip Percakapan' : 'Riwayat Chat'}</span>
          <button onClick={() => setShowArchived(!showArchived)} className="hover:text-teal-600 font-medium">
            {showArchived ? 'Lihat Aktif' : 'Arsip'}
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-3 py-2 custom-scrollbar" onClick={() => setMenuOpenId(null)}>
          {isLoading ? (
            <div className="space-y-3 px-2 pt-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse space-y-1.5">
                  <div className="h-2.5 w-12 bg-slate-200 rounded"></div>
                  <div className="h-8 bg-slate-200/70 rounded-xl"></div>
                </div>
              ))}
            </div>
          ) : pinnedChats.length === 0 && Object.values(groups).every(g => g.length === 0) ? (
            <div className="text-center text-slate-400 mt-8 text-xs px-3">
              {search ? 'Tidak ada percakapan ditemukan.' : (showArchived ? 'Belum ada arsip.' : 'Belum ada percakapan.')}
            </div>
          ) : (
            <>
              {pinnedChats.length > 0 && (
                <div>
                  <div className="px-2.5 mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Pin className="w-2.5 h-2.5" /> Pinned</div>
                  <div className="space-y-0.5">{pinnedChats.map(renderChatItem)}</div>
                </div>
              )}

              {Object.entries(groups).map(([label, groupChats]) => groupChats.length > 0 && (
                <div key={label}>
                  <div className="px-2.5 mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</div>
                  <div className="space-y-0.5">{groupChats.map(renderChatItem)}</div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Secondary Tools */}
        <div className="p-2.5 border-t border-stone-200/60 space-y-1 text-xs">
          <div className="px-2 mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Layanan Utama</div>
          <button onClick={() => { navigate('/mood'); setIsOpen(false); }} className="w-full flex items-center gap-2.5 px-3 min-h-[44px] rounded-xl hover:bg-slate-100/80 text-slate-700 font-medium transition-colors">
            <Heart className="w-4 h-4 text-rose-500 shrink-0" /> Mood Tracker & Progress
          </button>
          <button onClick={() => { navigate('/screening'); setIsOpen(false); }} className="w-full flex items-center gap-2.5 px-3 min-h-[44px] rounded-xl hover:bg-slate-100/80 text-slate-700 font-medium transition-colors">
            <Stethoscope className="w-4 h-4 text-blue-500 shrink-0" /> Skrining Mandiri
          </button>
          <button onClick={() => { navigate('/counselors'); setIsOpen(false); }} className="w-full flex items-center gap-2.5 px-3 min-h-[44px] rounded-xl hover:bg-slate-100/80 text-slate-700 font-medium transition-colors">
            <Users className="w-4 h-4 text-teal-600 shrink-0" /> Konselor Kampus
          </button>
          <button onClick={() => { navigate('/emergency'); setIsOpen(false); }} className="w-full flex items-center gap-2.5 px-3 min-h-[44px] rounded-xl hover:bg-rose-50 text-rose-600 font-medium transition-colors">
            <AlertCircle className="w-4 h-4 shrink-0" /> Darurat SOS
          </button>
        </div>

        {/* Bottom Profile & Settings */}
        <div className="p-2.5 border-t border-stone-200/60 space-y-1 text-xs">
          <div className="px-0.5 pb-1">
            <AiQuotaBadge variant="compact" onOpenSettings={onOpenSettings} className="w-full justify-between" />
          </div>
          <button onClick={() => { onOpenSettings?.(); setIsOpen(false); }} className="w-full flex items-center gap-2.5 px-3 min-h-[44px] rounded-xl hover:bg-slate-100/80 text-slate-700 font-medium transition-colors">
            <Settings className="w-4 h-4 text-slate-500 shrink-0" /> Pengaturan & Profil
          </button>
          {onLogout && (
            <button onClick={onLogout} className="w-full flex items-center gap-2.5 px-3 min-h-[44px] rounded-xl hover:bg-rose-50 text-rose-600 font-medium transition-colors">
              <LogOut className="w-4 h-4 shrink-0" /> Keluar
            </button>
          )}
          <div className="pt-2 px-2 flex items-center justify-between text-[10px] text-slate-400 font-medium">
            <div className="flex items-center gap-1.5">
              <img src="/favicon.svg" alt="" className="w-3.5 h-3.5 object-contain" />
              <span>RuangTenang V2</span>
            </div>
            <span className="text-teal-600/80 font-mono">Protected</span>
          </div>
        </div>
      </div>
    </>
  );
}

