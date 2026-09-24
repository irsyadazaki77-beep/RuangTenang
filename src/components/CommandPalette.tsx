import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  BookOpen,
  GraduationCap,
  Wind,
  HeartHandshake,
  Smile,
  AlertOctagon,
  FileCheck2,
  ListTree,
  Quote,
  MessageSquare,
  CornerDownLeft,
  X,
  Compass,
  FileText
} from 'lucide-react';
import { Chat } from '../features/chat/types';
import { safeLocalStorage } from '../lib/storage';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  chats?: Chat[];
  onTriggerExportDocx?: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'Mode & Ruang' | 'Aksi Akademik' | 'Relaksasi & Tenang' | 'Riwayat Obrolan';
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  shortcut?: string;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  chats = [],
  onTriggerExportDocx
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Built-in Actions List
  const baseCommands: CommandItem[] = useMemo(() => {
    return [
      // Kategori 1: Mode & Ruang
      {
        id: 'nav-ruangtenang',
        title: 'RuangTenang — Teman Cerita & Konseling',
        subtitle: 'Pendampingan emosional, AI empati, dan pemulihan kesehatan mental',
        category: 'Mode & Ruang',
        icon: Compass,
        badge: 'Mental Health',
        action: () => {
          navigate('/');
          onClose();
        }
      },
      {
        id: 'nav-ruangkerja',
        title: 'RuangKerja — Academic Workspace & Canvas',
        subtitle: 'Bantuan skripsi, penulisan bab, sitasi ilmiah APA/IEEE, dan koding',
        category: 'Mode & Ruang',
        icon: GraduationCap,
        badge: 'Akademik',
        action: () => {
          navigate('/workspace');
          onClose();
        }
      },
      {
        id: 'nav-mindfulness',
        title: 'Workshop Mindfulness & Relaksasi',
        subtitle: 'Latihan napas terpandu, relaksasi otot, dan meditasi fokus',
        category: 'Mode & Ruang',
        icon: Wind,
        action: () => {
          navigate('/mindfulness');
          onClose();
        }
      },
      {
        id: 'nav-screening',
        title: 'Cek Kondisi Mental Mandiri (DASS-21 & PHQ-9)',
        subtitle: 'Skrining awal tingkat stres, kecemasan, dan kelelahan mental',
        category: 'Mode & Ruang',
        icon: FileCheck2,
        action: () => {
          navigate('/screening');
          onClose();
        }
      },
      {
        id: 'nav-counselors',
        title: 'Jadwal & Direktori Konselor Kampus',
        subtitle: 'Temui konselor dan psikolog berlisensi untuk bimbingan profesional',
        category: 'Mode & Ruang',
        icon: HeartHandshake,
        badge: 'Bebas Biaya',
        action: () => {
          navigate('/counselors');
          onClose();
        }
      },
      {
        id: 'nav-emergency',
        title: 'Pusat Bantuan Krisis & SOS 24 Jam',
        subtitle: 'Tele-konseling darurat dan hotline tanggap cepat kampus',
        category: 'Mode & Ruang',
        icon: AlertOctagon,
        badge: 'Krisis',
        action: () => {
          navigate('/emergency');
          onClose();
        }
      },

      // Kategori 2: Aksi Akademik
      {
        id: 'action-skripsi-draft',
        title: 'Buat Draf Naskah Skripsi Baru (BAB I - BAB V)',
        subtitle: 'Buka kanvas dengan template standar penulisan karya ilmiah Indonesia',
        category: 'Aksi Akademik',
        icon: BookOpen,
        action: () => {
          safeLocalStorage.setItem('academic_trigger', 'new_skripsi');
          navigate('/workspace');
          onClose();
        }
      },
      {
        id: 'action-export-skripsi',
        title: 'Unduh Format Skripsi (.docx) Standar 4-4-3-3',
        subtitle: 'Ekspor naskah aktif ke Microsoft Word dengan margin baku 4-4-3-3 cm',
        category: 'Aksi Akademik',
        icon: FileText,
        badge: 'Word A4',
        action: () => {
          if (onTriggerExportDocx) {
            onTriggerExportDocx();
          } else {
            navigate('/workspace');
          }
          onClose();
        }
      },
      {
        id: 'action-citation-helper',
        title: 'Pemeriksa Sitasi Ilmiah & Konversi BibTeX/RIS',
        subtitle: 'Kelola rujukan artikel, format APA 7th, IEEE, dan Mendeley/Zotero',
        category: 'Aksi Akademik',
        icon: Quote,
        action: () => {
          safeLocalStorage.setItem('academic_trigger', 'citation_helper');
          navigate('/workspace');
          onClose();
        }
      },
      {
        id: 'action-outline-generator',
        title: 'Penyusun Kerangka Konseptual & Outline Penelitian',
        subtitle: 'Strukturisasi rumusan masalah, hipotesis, dan metodologi riset',
        category: 'Aksi Akademik',
        icon: ListTree,
        action: () => {
          safeLocalStorage.setItem('academic_trigger', 'outline_generator');
          navigate('/workspace');
          onClose();
        }
      },

      // Kategori 3: Relaksasi & Tenang
      {
        id: 'action-box-breathing',
        title: 'Latihan Napas 1 Menit (Box Breathing 4-4-4-4)',
        subtitle: 'Pereda stres instan saat menghadapi deadline atau revisi berat',
        category: 'Relaksasi & Tenang',
        icon: Wind,
        action: () => {
          navigate('/mindfulness');
          onClose();
        }
      },
      {
        id: 'action-mood-journal',
        title: 'Catat Suasana Hati & Jurnal Syukur Hari Ini',
        subtitle: 'Refleksi emosi harian dan pantau tren kesejahteraan psikologis',
        category: 'Relaksasi & Tenang',
        icon: Smile,
        action: () => {
          navigate('/mood');
          onClose();
        }
      }
    ];
  }, [navigate, onClose, onTriggerExportDocx]);

  // Combine static commands and dynamic chat history items
  const allCommands = useMemo(() => {
    const list: CommandItem[] = [...baseCommands];

    if (chats && chats.length > 0) {
      chats.slice(0, 15).forEach((chat) => {
        list.push({
          id: `chat-${chat.id}`,
          title: chat.title || 'Percakapan Tanpa Judul',
          subtitle: `Riwayat obrolan • ${new Date(chat.updatedAt).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })}`,
          category: 'Riwayat Obrolan',
          icon: MessageSquare,
          badge: chat.isPinned ? 'Tersemat' : undefined,
          action: () => {
            navigate(`/c/${chat.id}`);
            onClose();
          }
        });
      });
    }

    return list;
  }, [baseCommands, chats, navigate, onClose]);

  // Filter commands by query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands;
    const q = query.toLowerCase().trim();
    return allCommands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.subtitle.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    );
  }, [allCommands, query]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  // Keep selected item in view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
        className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] sm:pt-[14vh] p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -12 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="w-full max-w-2xl bg-white dark:bg-[#0B121E] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Header */}
          <div className="relative flex items-center px-4 sm:px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0E1626]/60 shrink-0">
            <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 mr-3 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Ketik perintah, fitur, atau cari riwayat obrolan..."
              className="w-full bg-transparent text-sm sm:text-base text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none"
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-0.5 text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-800 rounded-md border border-slate-300/60 dark:border-slate-700">
                  ESC
                </kbd>
              </div>
            )}
          </div>

          {/* Results List */}
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto p-2 sm:p-2.5 space-y-1 custom-scrollbar min-h-0"
          >
            {filteredCommands.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Search className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Tidak ditemukan hasil untuk "{query}"
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Coba kata kunci lain seperti "skripsi", "napas", "konselor", atau "sitasi".
                </p>
              </div>
            ) : (
              filteredCommands.map((cmd, index) => {
                const isSelected = index === selectedIndex;
                const IconComponent = cmd.icon;

                return (
                  <div
                    key={cmd.id}
                    data-index={index}
                    onClick={() => cmd.action()}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`group flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 text-emerald-950 dark:text-emerald-100 shadow-2xs'
                        : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200'
                        }`}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-semibold truncate">
                            {cmd.title}
                          </span>
                          {cmd.badge && (
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${
                                isSelected
                                  ? 'bg-emerald-200/80 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {cmd.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {cmd.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium hidden sm:inline-block">
                        {cmd.category}
                      </span>
                      {isSelected && (
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <CornerDownLeft className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Shortcuts Navigation Bar */}
          <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#0E1626]/70 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 text-[9.5px] font-mono font-bold bg-slate-200/80 dark:bg-slate-800 rounded border border-slate-300/60 dark:border-slate-700">↑</kbd>
                <kbd className="px-1.5 py-0.5 text-[9.5px] font-mono font-bold bg-slate-200/80 dark:bg-slate-800 rounded border border-slate-300/60 dark:border-slate-700">↓</kbd>
                <span>Navigasi</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 text-[9.5px] font-mono font-bold bg-slate-200/80 dark:bg-slate-800 rounded border border-slate-300/60 dark:border-slate-700">↵</kbd>
                <span>Buka</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-[10.5px]">
              <span>RuangTenang & RuangKerja</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
