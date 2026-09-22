import React, { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/apiClient';
import { useToast } from '../../../components/Toast';
import { BookmarkItem } from '../types';
import { Bookmark, Trash2, Copy, Check, ExternalLink, RefreshCw, MessageSquare } from 'lucide-react';
import { ModalShell } from '../../../components/ui/ModalShell';

interface BookmarksModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentChatId?: string;
  onSelectChat?: (chatId: string) => void;
  onBookmarkRemoved?: (messageId: string) => void;
}

export function BookmarksModal({
  isOpen,
  onClose,
  currentChatId,
  onSelectChat,
  onBookmarkRemoved
}: BookmarksModalProps) {
  const { showToast } = useToast();
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filterCurrentOnly, setFilterCurrentOnly] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchBookmarks();
    }
  }, [isOpen]);

  const fetchBookmarks = async (cursor?: string) => {
    if (!cursor) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      let url = '/api/chat/bookmarks?limit=20';
      if (cursor) url += `&cursor=${cursor}`;
      const res = await apiClient.get<{ success: boolean; bookmarks: BookmarkItem[]; nextCursor?: string }>(url);
      if (res.success && res.data?.bookmarks) {
        if (cursor) {
          setBookmarks(prev => {
             const combined = [...prev, ...(res.data?.bookmarks || [])];
             const seen = new Set();
             return combined.filter(b => {
                if (seen.has(b.messageId)) return false;
                seen.add(b.messageId);
                return true;
             });
          });
        } else {
          setBookmarks(res.data.bookmarks);
        }
        setNextCursor(res.data.nextCursor || null);
      }
    } catch {
      showToast('Gagal memuat pesan tersimpan', 'error');
    } finally {
      if (!cursor) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  };

  const handleRemove = async (messageId: string) => {
    try {
      const res = await apiClient.delete<{ success: boolean }>(`/api/chat/bookmarks/${messageId}`);
      if (res.success) {
        setBookmarks(prev => prev.filter(b => b.messageId !== messageId));
        onBookmarkRemoved?.(messageId);
        showToast('Pesan dihapus dari simpanan', 'info');
      } else {
        showToast(res.error || 'Gagal menghapus simpanan', 'error');
      }
    } catch {
      showToast('Terjadi kendala saat menghapus simpanan', 'error');
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Pesan disalin ke papan klip', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleJumpToMessage = (messageId: string) => {
    onClose();
    setTimeout(() => {
      const el = document.getElementById(`msg-${messageId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-teal-500');
        setTimeout(() => el.classList.remove('ring-2', 'ring-teal-500'), 2500);
      }
    }, 150);
  };

  const displayedBookmarks = filterCurrentOnly && currentChatId
    ? bookmarks.filter(b => b.chatId === currentChatId)
    : bookmarks;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Pesan Tersimpan"
      subtitle="Koleksi kutipan dan pesan penting yang kamu simpan untuk refleksi mandiri"
    >
      <div className="space-y-3.5 max-h-[70vh] flex flex-col">
        {/* Controls bar */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilterCurrentOnly(false)}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${!filterCurrentOnly ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-medium' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              Semua ({bookmarks.length})
            </button>
            {currentChatId && (
              <button
                onClick={() => setFilterCurrentOnly(true)}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${filterCurrentOnly ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-medium' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                Sesi Ini ({bookmarks.filter(b => b.chatId === currentChatId).length})
              </button>
            )}
          </div>
          <button
            onClick={() => fetchBookmarks()}
            disabled={loading}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title="Segarkan daftar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`} />
          </button>
        </div>

        {/* List content */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {loading && bookmarks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mb-2 text-teal-600" />
              <p className="text-xs">Memuat pesan tersimpan...</p>
            </div>
          ) : displayedBookmarks.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Bookmark className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {filterCurrentOnly ? 'Belum ada pesan tersimpan di sesi ini.' : 'Belum ada pesan tersimpan.'}
              </p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Gunakan ikon simpan (bookmark) pada setiap pesan untuk menyimpannya ke daftar ini.
              </p>
            </div>
          ) : (
            displayedBookmarks.map(item => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2 group transition-colors hover:border-slate-300 dark:hover:border-slate-600"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${item.message.role === 'assistant' ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300' : 'bg-slate-200/60 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300'}`}>
                      {item.message.role === 'assistant' ? 'Teman AI' : 'Kamu'}
                    </span>
                    <span className="truncate max-w-[140px] sm:max-w-[200px]" title={item.chatTitle}>
                      · {item.chatTitle}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleCopy(item.id, item.message.content)}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors cursor-pointer"
                      title="Salin Pesan"
                    >
                      {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    {item.chatId === currentChatId ? (
                      <button
                        onClick={() => handleJumpToMessage(item.messageId)}
                        className="flex items-center gap-1 px-1.5 py-0.5 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 rounded transition-colors cursor-pointer text-[10.5px]"
                        title="Lihat pesan ini di obrolan saat ini"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span className="hidden sm:inline">Lihat di Chat</span>
                      </button>
                    ) : onSelectChat ? (
                      <button
                        onClick={() => {
                          onSelectChat(item.chatId);
                          onClose();
                        }}
                        className="flex items-center gap-1 px-1.5 py-0.5 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 rounded transition-colors cursor-pointer text-[10.5px]"
                        title="Buka Obrolan Asal"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span className="hidden sm:inline">Buka Obrolan</span>
                      </button>
                    ) : null}
                    <button
                      onClick={() => handleRemove(item.messageId)}
                      className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors cursor-pointer"
                      title="Hapus dari Simpanan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs sm:text-[13px] text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
                  {item.message.content}
                </p>

                <div className="text-[10px] text-slate-400">
                  Disimpan: {new Date(item.createdAt).toLocaleDateString('id-ID')}
                </div>
              </div>
            ))
          )}
          {nextCursor && (
            <div className="pt-4 flex justify-center pb-2">
              <button
                onClick={() => fetchBookmarks(nextCursor)}
                disabled={loadingMore}
                className="text-xs text-teal-600 hover:text-teal-700 disabled:opacity-50 cursor-pointer font-medium"
              >
                {loadingMore ? "Memuat..." : "Tampilkan Lebih Banyak"}
              </button>
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
