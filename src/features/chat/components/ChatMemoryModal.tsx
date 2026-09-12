import React, { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/apiClient';
import { useToast } from '../../../components/Toast';
import { Brain, Trash2, Plus, ShieldCheck, RefreshCw } from 'lucide-react';
import { ModalShell } from '../../../components/ui/ModalShell';

interface ChatMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId?: string;
  useMemoryForChat: boolean;
  onToggleChatMemory: (enabled: boolean) => void;
}

interface MemoryItem {
  id: string;
  content: string;
  createdAt: string;
}

export function ChatMemoryModal({
  isOpen,
  onClose,
  chatId,
  useMemoryForChat,
  onToggleChatMemory
}: ChatMemoryModalProps) {
  const { showToast } = useToast();
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchMemories();
    }
  }, [isOpen]);

  const fetchMemories = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ success: boolean; memories: MemoryItem[] }>('/api/chat/user-memories');
      if (res.success && res.data?.memories) {
        setMemories(res.data.memories);
      }
    } catch {
      showToast('Gagal memuat daftar memori', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    if (!chatId) return;
    const nextVal = !useMemoryForChat;
    setToggling(true);
    try {
      const res = await apiClient.put<{ success: boolean; useMemory: boolean }>(
        `/api/chat/${chatId}/memory`,
        { useMemory: nextVal }
      );
      if (res.success) {
        onToggleChatMemory(nextVal);
        showToast(nextVal ? 'Memori diaktifkan untuk obrolan ini' : 'Memori dinonaktifkan untuk obrolan ini', 'info');
      } else {
        showToast('Gagal memperbarui preferensi memori', 'error');
      }
    } catch {
      showToast('Terjadi kendala saat memperbarui preferensi memori', 'error');
    } finally {
      setToggling(false);
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    setIsAdding(true);
    try {
      const res = await apiClient.post<{ success: boolean; memory: MemoryItem }>(
        '/api/chat/user-memories',
        { content: newContent.trim() }
      );
      if (res.success && res.data?.memory) {
        setMemories(prev => [res.data!.memory, ...prev]);
        setNewContent('');
        showToast('Memori konteks berhasil ditambahkan', 'success');
      } else {
        showToast(res.error || 'Gagal menambahkan memori', 'error');
      }
    } catch {
      showToast('Terjadi kendala saat menyimpan memori', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      const res = await apiClient.delete<{ success: boolean }>(`/api/chat/user-memories/${id}`);
      if (res.success) {
        setMemories(prev => prev.filter(m => m.id !== id));
        showToast('Memori dihapus', 'info');
      } else {
        showToast('Gagal menghapus memori', 'error');
      }
    } catch {
      showToast('Terjadi kendala saat menghapus memori', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Kontrol Memori AI"
      subtitle="Kelola informasi refleksi jangka panjang yang diingat asisten untuk mempersonalisasi respon"
    >
      <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
        {/* Toggle Memory for Current Chat */}
        {chatId && (
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Gunakan Memori pada Sesi Ini</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {useMemoryForChat
                  ? 'Aktif: AI menghubungkan konteks umum dan tujuan refleksi yang kamu simpan.'
                  : 'Nonaktif: AI hanya mengacu pada obrolan saat ini tanpa menyentuh memori luar.'}
              </p>
            </div>
            <button
              onClick={handleToggle}
              disabled={toggling}
              className={`w-10 h-6 rounded-full p-0.5 transition-colors shrink-0 cursor-pointer disabled:opacity-50 ${useMemoryForChat ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'}`}
              title="Alihkan status memori"
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow-xs transform transition-transform ${useMemoryForChat ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>
        )}

        {/* Add Memory Form */}
        <form onSubmit={handleAddMemory} className="space-y-2">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Tambah Catatan Konteks Pribadi
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Contoh: Saya sedang skripsi akhir, menyukai pendekatan terstruktur..."
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              maxLength={200}
              className="flex-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500 transition-colors"
            />
            <button
              type="submit"
              disabled={isAdding || !newContent.trim()}
              className="flex items-center gap-1 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAdding ? 'Menyimpan...' : 'Tambah'}</span>
            </button>
          </div>

          {/* Suggested memory chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[10.5px] text-slate-400 mr-0.5">Saran cepat:</span>
            {[
              'Gaya santai & suportif',
              'Fokus langkah aksi konkret',
              'Bantu saya refleksi bernafas sejenak',
              'Hindari istilah teknis yang rumit'
            ].map(suggestion => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setNewContent(suggestion)}
                className="px-2 py-0.5 text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-700 dark:hover:text-teal-300 text-slate-600 dark:text-slate-300 rounded-md border border-slate-200/60 dark:border-slate-700/60 transition-colors cursor-pointer"
              >
                + {suggestion}
              </button>
            ))}
          </div>

          <p className="text-[10.5px] text-slate-400">Maksimal 200 karakter per poin konteks.</p>
        </form>

        {/* Stored Memories List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
            <span>Memori yang Tersimpan ({memories.length})</span>
            <button
              onClick={fetchMemories}
              disabled={loading}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`} />
            </button>
          </div>

          {loading && memories.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400">
              <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1.5 text-teal-600" />
              Memuat data memori...
            </div>
          ) : memories.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 text-center text-xs text-slate-400">
              Belum ada catatan memori tersimpan. Tambahkan di atas jika ingin AI mengingat hal penting tentang situasimu.
            </div>
          ) : (
            <div className="space-y-1.5">
              {memories.map(m => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs"
                >
                  <span className="text-slate-700 dark:text-slate-200 leading-relaxed break-words flex-1 min-w-0">
                    {m.content}
                  </span>
                  <button
                    onClick={() => handleDeleteMemory(m.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                    title="Hapus memori"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Privacy Note */}
        <div className="p-3 rounded-xl bg-teal-50/40 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40 flex items-start gap-2 text-[11px] text-teal-800 dark:text-teal-300">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-teal-600 dark:text-teal-400" />
          <span>
            Data memori tersimpan aman, dibersihkan dari informasi sensitif (PII) secara otomatis, dan dapat kamu hapus kapan pun.
          </span>
        </div>
      </div>
    </ModalShell>
  );
}
