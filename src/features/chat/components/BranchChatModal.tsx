import React, { useState } from 'react';
import { apiClient } from '../../../lib/apiClient';
import { useToast } from '../../../components/Toast';
import { GitBranch } from 'lucide-react';
import { ModalShell } from '../../../components/ui/ModalShell';
import { Chat } from '../types';

interface BranchChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentChatId?: string;
  parentChatTitle?: string;
  messageId?: string;
  messageSnippet?: string;
  onChatBranched: (newChat: Chat) => void;
}

export function BranchChatModal({
  isOpen,
  onClose,
  parentChatId,
  parentChatTitle,
  messageId,
  messageSnippet,
  onChatBranched
}: BranchChatModalProps) {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const defaultTitle = parentChatTitle ? `Cabang: ${parentChatTitle}` : 'Cabang Percakapan';

  const handleBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentChatId || !messageId) return;

    setLoading(true);
    try {
      const res = await apiClient.post<{ success: boolean; chat: Chat }>(
        `/api/chat/${parentChatId}/branch`,
        {
          messageId,
          title: title.trim() || defaultTitle
        }
      );

      if (res.success && res.data?.chat) {
        showToast('Cabang percakapan berhasil dibuat', 'success');
        onChatBranched(res.data.chat);
        onClose();
      } else {
        showToast(res.error || 'Gagal membuat cabang percakapan', 'error');
      }
    } catch {
      showToast('Terjadi kendala saat membuat cabang percakapan', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Buat Cabang Obrolan"
      subtitle="Eksplorasi arah pemikiran atau topik baru mulai dari titik pesan ini"
    >
      <form onSubmit={handleBranch} className="space-y-4">
        {/* Explanation Card */}
        <div className="p-3 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40 space-y-1.5 text-xs text-teal-800 dark:text-teal-300">
          <div className="flex items-center gap-1.5 font-semibold">
            <GitBranch className="w-3.5 h-3.5 text-teal-600" />
            <span>Riwayat Asli Tetap Utuh</span>
          </div>
          <p className="leading-relaxed text-[11.5px] text-teal-700 dark:text-teal-400">
            Sebuah obrolan baru akan diduplikasi dengan riwayat pesan hingga pesan yang kamu pilih. Obrolan lama tidak akan terpengaruh sama sekali.
          </p>
        </div>

        {/* Message preview */}
        {messageSnippet && (
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Titik Pesan Terpilih
            </label>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 italic line-clamp-3">
              "{messageSnippet}"
            </div>
          </div>
        )}

        {/* Custom title input */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Judul Obrolan Baru
          </label>
          <input
            type="text"
            className="w-full text-xs sm:text-[13px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 outline-none focus:border-teal-500 transition-colors"
            placeholder={defaultTitle}
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={80}
            autoFocus
          />
          
          {/* Quick preset chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[10.5px] text-slate-400 mr-0.5">Pilihan cepat:</span>
            {['Eksplorasi Solusi', 'Refleksi Emosi', 'Langkah Aksi', 'Sudut Pandang Baru'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setTitle(`${preset}: ${parentChatTitle || 'Percakapan'}`.slice(0, 80))}
                className="px-2 py-0.5 text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-700 dark:hover:text-teal-300 text-slate-600 dark:text-slate-300 rounded-md border border-slate-200/60 dark:border-slate-700/60 transition-colors cursor-pointer"
              >
                + {preset}
              </button>
            ))}
          </div>

          <p className="text-[10.5px] text-slate-400">
            Kosongkan jika ingin memakai judul otomatis: "{defaultTitle}"
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>{loading ? 'Membuat Cabang...' : 'Mulai Obrolan Cabang'}</span>
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
