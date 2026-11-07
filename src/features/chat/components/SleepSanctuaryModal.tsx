import React, { useState, useEffect } from 'react';
import {
  Moon,
  Lock,
  X,
  CloudRain,
  BookOpen
} from 'lucide-react';
import { motion } from 'motion/react';

interface SleepSanctuaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestBedtimeStory?: () => void;
}

const STORAGE_KEY = 'ruangtenang_sleep_vault';

export function SleepSanctuaryModal({
  isOpen,
  onClose,
  onRequestBedtimeStory
}: SleepSanctuaryModalProps) {
  const [worryText, setWorryText] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [_lockedTimestamp, setLockedTimestamp] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.isLocked) {
            setIsLocked(true);
            setLockedTimestamp(parsed.timestamp);
          }
        } catch {}
      }
    }
  }, [isOpen]);

  const handleLockWorry = () => {
    if (!worryText.trim()) return;
    const now = new Date().toISOString();
    const vaultData = {
      isLocked: true,
      timestamp: now,
      note: worryText.trim()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vaultData));
    setIsLocked(true);
    setLockedTimestamp(now);
    setWorryText('');
  };

  const handleClearVault = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsLocked(false);
    setLockedTimestamp(null);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mode Pengantar Tidur (Sleep Sanctuary)"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0a07]/90 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-300"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-amber-500/20 bg-[#16100a] text-amber-100/90 shadow-2xl p-6 flex flex-col justify-between min-h-[500px]">
        {/* Subtle Candlelight Warm Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="w-full flex items-center justify-between border-b border-amber-950/80 pb-3 z-10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-amber-100">
                Mode Pengantar Tidur (Sleep Sanctuary)
              </h2>
              <p className="text-[11px] text-amber-300/70">
                Lepaskan semua beban hari ini, istirahatkan pikiranmu.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-amber-400/60 hover:text-amber-200 hover:bg-amber-950/50 transition-colors"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Vault Center Body */}
        <div className="my-auto py-4 space-y-4 z-10 w-full">
          {!isLocked ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-200">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Brankas Titipan Beban Pikiran (Brain Dump)</span>
              </div>
              <p className="text-xs text-amber-300/70 leading-relaxed">
                Tuliskan apa pun yang membuatmu overthinking atau cemas malam ini. Begitu dikunci, kamu menitipkannya ke brankas digital hingga esok pagi.
              </p>
              <textarea
                rows={4}
                value={worryText}
                onChange={e => setWorryText(e.target.value)}
                placeholder="Contoh: Takut revisi skripsi ditolak dospem, cemas masa depan karier, merasa tertinggal dibanding teman..."
                className="w-full rounded-2xl border border-amber-900/60 bg-[#0d0905]/80 p-3.5 text-xs sm:text-[13px] text-amber-100 placeholder:text-amber-700/60 focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500 transition-all resize-none"
              />
              <button
                type="button"
                onClick={handleLockWorry}
                disabled={!worryText.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-semibold shadow-md disabled:opacity-40 transition-all flex items-center justify-center gap-2"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Kunci & Titipkan Beban Malam Ini</span>
              </button>
            </div>
          ) : (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center space-y-4 py-3"
            >
              <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center mx-auto border border-amber-500/40 shadow-inner">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-1.5 max-w-sm mx-auto">
                <h3 className="text-base font-bold text-amber-100">
                  Beban Pikiranmu Sudah Terkunci Aman
                </h3>
                <p className="text-xs text-amber-300/80 leading-relaxed">
                  Tersimpan di brankas digital. Malam ini tubuh dan pikiranmu berhak beristirahat. Besok pagi kita hadapi lagi dengan energi baru.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearVault}
                className="text-[11px] text-amber-400/60 hover:text-amber-300 underline transition-colors"
              >
                Buka kembali catatan brankas
              </button>
            </motion.div>
          )}

          {/* Quick Sleep Ritual Suggestions */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-950/80">
            {onRequestBedtimeStory && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequestBedtimeStory();
                }}
                className="p-3 rounded-2xl border border-amber-900/50 bg-[#0d0905]/60 hover:bg-amber-950/40 text-left transition-all group"
              >
                <BookOpen className="w-4 h-4 text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-semibold text-amber-200">Cerita Pengantar Tidur</p>
                <p className="text-[10px] text-amber-400/60 mt-0.5">Dongeng reflektif penenang pikiran</p>
              </button>
            )}
            <div className="p-3 rounded-2xl border border-amber-900/50 bg-[#0d0905]/60 text-left">
              <CloudRain className="w-4 h-4 text-amber-400 mb-1" />
              <p className="text-xs font-semibold text-amber-200">Kamar Redup & Tenang</p>
              <p className="text-[10px] text-amber-400/60 mt-0.5">Letakkan ponsel, atur napas santai</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="w-full flex items-center justify-between border-t border-amber-950/80 pt-3 z-10 text-xs">
          <span className="text-[11px] text-amber-400/60">Selamat beristirahat, kamu berharga.</span>
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-4 rounded-xl bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800/60 text-amber-200 text-xs font-medium transition-colors"
          >
            Selesai & Istirahat
          </button>
        </div>
      </div>
    </div>
  );
}
