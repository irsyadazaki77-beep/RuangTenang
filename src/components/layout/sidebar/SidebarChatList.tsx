import React, { useState, useRef, useEffect } from 'react';
import {
  Pin,
  Archive,
  Trash2,
  Edit2,
  Check,
  X,
  MessageSquare,
  FileCode,
  GitBranch,
  AlertTriangle,
  MoreHorizontal
} from 'lucide-react';
import { isToday, isYesterday } from 'date-fns';
import { Chat } from '../../../features/chat/types';
import { WorkspaceMode } from '../../../features/workspace/types';
import { SidebarTooltip } from './SidebarTooltip';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarChatListProps {
  isCollapsed: boolean;
  chats: Chat[];
  currentChatId?: string;
  currentMode: WorkspaceMode;
  search: string;
  searchResults: Chat[];
  isLoading?: boolean;
  showArchived?: boolean;
  onToggleArchiveView?: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  onTogglePin: (id: string) => void;
  onToggleArchive: (id: string) => void;
}

export const SidebarChatList: React.FC<SidebarChatListProps> = ({
  isCollapsed,
  chats,
  currentChatId,
  currentMode,
  search,
  searchResults,
  isLoading,
  showArchived = false,
  onToggleArchiveView,
  onSelectChat,
  onDeleteChat,
  onUpdateTitle,
  onTogglePin,
  onToggleArchive,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const editInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // Click outside to close action popover menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpenId(null);
      }
    };
    if (menuOpenId) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpenId]);

  // Determine active chats dataset
  const rawList = search.trim() ? searchResults : chats;

  // Filter archived & temporary
  let displayChats = rawList.filter(c => (showArchived ? c.isArchived : !c.isArchived) && !c.isTemporary);

  // Automatic filter by current active mode
  if (currentMode === 'RUANG_KERJA') {
    displayChats = displayChats.filter(c => c.workspaceMode === 'RUANG_KERJA');
  } else {
    displayChats = displayChats.filter(c => c.workspaceMode !== 'RUANG_KERJA');
  }

  // Split pinned vs unpinned
  const pinnedChats = displayChats.filter(c => c.isPinned);
  const unpinnedChats = displayChats.filter(c => !c.isPinned);

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

  const isWithin30DaysSafe = (d: any) => {
    const parsed = safeParseDate(d);
    if (!parsed) return false;
    const now = new Date();
    const diffDays = (now.getTime() - parsed.getTime()) / (1000 * 3600 * 24);
    return diffDays > 7 && diffDays <= 30;
  };

  const isOlderSafe = (d: any) => {
    const parsed = safeParseDate(d);
    if (!parsed) return true;
    const now = new Date();
    const diffDays = (now.getTime() - parsed.getTime()) / (1000 * 3600 * 24);
    return diffDays > 30;
  };

  const groups: Record<string, Chat[]> = {
    'Hari Ini': unpinnedChats.filter(c => isTodaySafe(c.updatedAt)),
    'Kemarin': unpinnedChats.filter(c => isYesterdaySafe(c.updatedAt)),
    '7 Hari Terakhir': unpinnedChats.filter(c => isWithin7DaysSafe(c.updatedAt)),
    '30 Hari Terakhir': unpinnedChats.filter(c => isWithin30DaysSafe(c.updatedAt)),
    'Terdahulu': unpinnedChats.filter(c => isOlderSafe(c.updatedAt))
  };

  const handleStartEdit = (c: Chat, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditTitle(c.title);
    setDeleteConfirmId(null);
    setMenuOpenId(null);
  };

  const handleSaveEdit = (id: string, e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    if (editTitle.trim()) {
      onUpdateTitle(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelEdit = (e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    setEditingId(null);
  };

  const handleRequestDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
    setEditingId(null);
    setMenuOpenId(null);
  };

  const handleConfirmDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteChat(id);
    setDeleteConfirmId(null);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(null);
  };

  if (isCollapsed) {
    return (
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 custom-scrollbar min-h-0">
        {displayChats.slice(0, 20).map(c => {
          const isActive = currentChatId === c.id;
          const isWorkspace = c.workspaceMode === 'RUANG_KERJA';
          return (
            <SidebarTooltip key={c.id} content={c.title} show={true} position="right">
              <button
                type="button"
                onClick={() => onSelectChat(c.id)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer relative ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/40 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {c.isPinned ? (
                  <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
                ) : isWorkspace ? (
                  <FileCode className="w-3.5 h-3.5" />
                ) : (
                  <MessageSquare className="w-3.5 h-3.5" />
                )}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full bg-emerald-500" />
                )}
              </button>
            </SidebarTooltip>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2.5 custom-scrollbar min-h-0">
      {/* Archived Indicator Banner */}
      {showArchived && (
        <div className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-850 flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-1.5 font-medium">
            <Archive className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Mode Arsip Aktif</span>
          </div>
          {onToggleArchiveView && (
            <button
              type="button"
              onClick={onToggleArchiveView}
              className="text-[10.5px] font-semibold text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100 cursor-pointer underline"
            >
              Tutup
            </button>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="space-y-2 px-1 pt-1">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="animate-pulse space-y-1">
              <div className="h-1.5 w-14 bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="h-7 bg-slate-200/70 dark:bg-slate-800/70 rounded-lg"></div>
            </div>
          ))}
        </div>
      ) : displayChats.length === 0 ? (
        /* Clean Empty State */
        <div className="text-center py-12 px-3 text-xs text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center">
          <MessageSquare className="w-6 h-6 mb-2 opacity-30 stroke-[1.5]" />
          <p className="font-medium text-slate-600 dark:text-slate-400">
            {search ? 'Tidak ada hasil pencarian' : showArchived ? 'Arsip obrolan kosong' : 'Belum ada obrolan'}
          </p>
          <p className="text-[11px] mt-0.5 text-slate-400 dark:text-slate-500">
            {search ? 'Coba kata kunci lain' : 'Klik ikon pensil di atas untuk memulai'}
          </p>
        </div>
      ) : (
        /* Grouped Chat Items */
        <div className="space-y-3">
          {/* Pinned Section */}
          {pinnedChats.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 px-2 mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400/90 select-none">
                <Pin className="w-2.5 h-2.5 text-amber-500 fill-amber-500/30" />
                <span>Disematkan</span>
                <span className="font-normal text-slate-400">({pinnedChats.length})</span>
              </div>
              <div className="space-y-0.5">
                {pinnedChats.map(renderChatItem)}
              </div>
            </div>
          )}

          {/* Time Groups: Hari Ini, Kemarin, 7 Hari Terakhir, 30 Hari Terakhir, Terdahulu */}
          {Object.entries(groups).map(([label, list]) => list.length > 0 && (
            <div key={label}>
              <div className="px-2 mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 select-none">
                {label}
              </div>
              <div className="space-y-0.5">
                {list.map(renderChatItem)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  function renderChatItem(c: Chat) {
    const isActive = currentChatId === c.id;
    const isEditing = editingId === c.id;
    const isDeleting = deleteConfirmId === c.id;
    const isWorkspace = c.workspaceMode === 'RUANG_KERJA';
    const isMenuOpen = menuOpenId === c.id;

    return (
      <div
        key={c.id}
        className={`group relative flex items-center justify-between w-full px-2 py-1 text-xs rounded-lg transition-all duration-150 text-left min-h-[34px] ${
          isActive
            ? 'bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-medium ring-1 ring-emerald-500/20'
            : isMenuOpen
            ? 'bg-slate-200/60 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100'
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100'
        }`}
      >
        {/* Left vertical active bar */}
        {isActive && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-emerald-500" />
        )}

        {/* Delete Confirmation Popover Inline */}
        <AnimatePresence>
          {isDeleting && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="absolute inset-0 z-30 bg-rose-50 dark:bg-rose-950/95 border border-rose-300 dark:border-rose-800 rounded-lg px-2 flex items-center justify-between gap-1 shadow-md"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-1 min-w-0 text-rose-700 dark:text-rose-300 font-medium text-[11px]">
                <AlertTriangle className="w-3 h-3 shrink-0 text-rose-500" />
                <span className="truncate">Hapus obrolan ini?</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleCancelDelete}
                  className="px-1.5 py-0.5 text-[10px] rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={(e) => handleConfirmDelete(c.id, e)}
                  className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-rose-600 text-white hover:bg-rose-700 shadow-2xs cursor-pointer"
                >
                  Hapus
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content & Inline Edit */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0 pr-1 pl-0.5">
          {/* Icon indicator */}
          {c.isPinned ? (
            <Pin className="w-3.5 h-3.5 shrink-0 text-amber-500 fill-amber-500/20" />
          ) : isWorkspace ? (
            <FileCode className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : c.parentChatId ? (
            <GitBranch className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <MessageSquare className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
          )}

          {isEditing ? (
            <div className="flex items-center gap-1 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
              <input
                ref={editInputRef}
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveEdit(c.id, e);
                  if (e.key === 'Escape') handleCancelEdit(e);
                }}
                className="flex-1 min-w-0 bg-white dark:bg-slate-900 border border-emerald-500/80 rounded px-1.5 py-0.5 text-xs text-slate-900 dark:text-slate-100 outline-none ring-1 ring-emerald-500/20"
              />
              <button
                type="button"
                onClick={(e) => handleSaveEdit(c.id, e)}
                className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer shrink-0"
                title="Simpan nama"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="p-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 cursor-pointer shrink-0"
                title="Batal"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onSelectChat(c.id)}
              className="flex-1 min-w-0 truncate text-left cursor-pointer focus:outline-none flex items-center justify-between gap-1 pr-7"
              title={c.title}
            >
              <span className="truncate">{c.title || 'Percakapan Tanpa Judul'}</span>
              {isWorkspace && (
                <span className="hidden group-hover:inline-flex text-[9px] px-1 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 shrink-0 font-medium">
                  Canvas
                </span>
              )}
            </button>
          )}
        </div>

        {/* ChatGPT / Gemini Style Context Action Trigger (•••) */}
        {!isEditing && !isDeleting && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center z-10">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpenId(isMenuOpen ? null : c.id);
              }}
              className={`p-1 rounded-md transition-colors cursor-pointer ${
                isMenuOpen
                  ? 'opacity-100 bg-slate-300/80 dark:bg-slate-700 text-slate-800 dark:text-white'
                  : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-300/60 dark:hover:bg-slate-700'
              }`}
              title="Opsi Obrolan"
              aria-label="Opsi Obrolan"
              aria-expanded={isMenuOpen}
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>

            {/* Contextual Popover Dropdown Menu */}
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  ref={menuRef}
                  initial={{ opacity: 0, scale: 0.95, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 4 }}
                  transition={{ duration: 0.1 }}
                  className="absolute right-0 top-full mt-1 z-50 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1 space-y-0.5"
                  onClick={e => e.stopPropagation()}
                >
                  {/* Rename Option */}
                  <button
                    type="button"
                    onClick={(e) => handleStartEdit(c, e)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
                    aria-label="Ubah Nama"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Ubah Nama</span>
                  </button>

                  {/* Pin Option */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId(null);
                      onTogglePin(c.id);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
                    aria-label={c.isPinned ? 'Lepas Pin' : 'Sematkan Pin'}
                  >
                    <Pin className={`w-3.5 h-3.5 ${c.isPinned ? 'text-amber-500 fill-amber-500/20' : 'text-slate-400'}`} />
                    <span>{c.isPinned ? 'Lepas Pin' : 'Sematkan Obrolan'}</span>
                  </button>

                  {/* Archive Option */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId(null);
                      onToggleArchive(c.id);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
                    aria-label={c.isArchived ? 'Buka dari Arsip' : 'Arsipkan'}
                  >
                    <Archive className={`w-3.5 h-3.5 ${c.isArchived ? 'text-emerald-500' : 'text-slate-400'}`} />
                    <span>{c.isArchived ? 'Buka dari Arsip' : 'Arsipkan Obrolan'}</span>
                  </button>

                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                  {/* Delete Option */}
                  <button
                    type="button"
                    onClick={(e) => handleRequestDelete(c.id, e)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer text-left font-medium"
                    aria-label="Hapus Percakapan"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>Hapus Obrolan</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    );
  }
};
