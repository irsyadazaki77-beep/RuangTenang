import React, { useState, useEffect } from 'react';
import {
  HeartPulse,
  X,
  PhoneCall,
  RefreshCw,
  MessageSquare,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';

interface InstantFirstAidModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenChatWithPrompt?: (prompt: string) => void;
}

type StepType = 'breathe' | 'ground' | 'affirmation';

export function InstantFirstAidModal({
  isOpen,
  onClose,
  onOpenChatWithPrompt
}: InstantFirstAidModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [phase, setPhase] = useState<StepType>('breathe');
  const [breathPhase, setBreathPhase] = useState<'tarik' | 'tahan' | 'hembus'>('tarik');

  // 60-second countdown timer
  useEffect(() => {
    if (!isOpen) {
      setSecondsLeft(60);
      setPhase('breathe');
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        const next = prev - 1;
        if (next > 40) setPhase('breathe');
        else if (next > 15) setPhase('ground');
        else setPhase('affirmation');
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  // 4-7-8 Breathing Cycle (4s Inhale, 7s Hold, 8s Exhale = 19s total)
  useEffect(() => {
    if (!isOpen || phase !== 'breathe') return;

    let cycleTime = 0;
    const breathInterval = setInterval(() => {
      cycleTime = (cycleTime + 1) % 19;
      if (cycleTime < 4) setBreathPhase('tarik');
      else if (cycleTime < 11) setBreathPhase('tahan');
      else setBreathPhase('hembus');
    }, 1000);

    return () => clearInterval(breathInterval);
  }, [isOpen, phase]);

  const handleRestart = () => {
    setSecondsLeft(60);
    setPhase('breathe');
  };

  const handleStartChatting = () => {
    onClose();
    if (onOpenChatWithPrompt) {
      onOpenChatWithPrompt('Aku baru saja mengalami rasa cemas/panik mendadak. Bisa bantu temani aku mengurai apa yang sedang kurasakan?');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pertolongan Pertama Penenang Emosi Cepat (SOS)"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-teal-500/30 bg-slate-900/95 shadow-2xl p-6 flex flex-col items-center justify-between text-slate-100 min-h-[520px]">
        {/* Header */}
        <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-teal-500/20 text-teal-400">
              <HeartPulse className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Penenang Cepat 60 Detik (First-Aid)
              </h2>
              <p className="text-[11px] text-slate-400">
                Tarik napas perlahan. Kamu aman saat ini.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-teal-300 bg-teal-950/70 border border-teal-800/80 px-2 py-0.5 rounded-full">
              {secondsLeft}s
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Exercise Display */}
        <div className="my-auto flex flex-col items-center justify-center text-center space-y-6 w-full py-4">
          {phase === 'breathe' && (
            <div className="flex flex-col items-center space-y-5">
              <div className="relative flex items-center justify-center w-48 h-48">
                {/* Visualizer Circle */}
                <motion.div
                  animate={{
                    scale: breathPhase === 'tarik' ? 1.4 : breathPhase === 'tahan' ? 1.4 : 0.85,
                    opacity: breathPhase === 'tahan' ? 0.9 : 0.7
                  }}
                  transition={{
                    duration: breathPhase === 'tarik' ? 4 : breathPhase === 'tahan' ? 0.2 : 8,
                    ease: 'easeInOut'
                  }}
                  className="absolute w-36 h-36 rounded-full bg-gradient-to-tr from-teal-500/40 to-emerald-400/30 border-2 border-teal-400/60 shadow-lg shadow-teal-500/20"
                />
                <div className="relative z-10 text-center">
                  <p className="text-lg font-bold text-teal-200 capitalize tracking-wide">
                    {breathPhase === 'tarik'
                      ? 'Tarik Napas (4s)'
                      : breathPhase === 'tahan'
                      ? 'Tahan (7s)'
                      : 'Hembuskan (8s)'}
                  </p>
                  <p className="text-[11px] text-teal-300/80 mt-0.5">
                    {breathPhase === 'tarik'
                      ? 'Lewat hidung pelan-pelan'
                      : breathPhase === 'tahan'
                      ? 'Biarkan tubuh tenang'
                      : 'Lewat mulut perlahan'}
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
                Pernapasan 4-7-8 merangsang saraf parasimpatis untuk menurunkan detak jantung secara alami.
              </p>
            </div>
          )}

          {phase === 'ground' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 max-w-sm"
            >
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/30">
                <Sparkles className="w-7 h-7 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-indigo-200">
                  Kembali ke Tubuhmu (Somatic Check)
                </h3>
                <ul className="text-xs text-slate-300 space-y-2 text-left bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    <span>Rasakan kedua telapak kaki menapak kokoh di lantai.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    <span>Turunkan bahumu menjauhi telinga, lemaskan rahangmu.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    <span>Lihat 1 benda nyata di sekitarmu dan sebutkan warnanya.</span>
                  </li>
                </ul>
              </div>
            </motion.div>
          )}

          {phase === 'affirmation' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4 max-w-sm"
            >
              <div className="w-14 h-14 rounded-2xl bg-teal-500/20 text-teal-300 flex items-center justify-center mx-auto border border-teal-500/30">
                <HeartPulse className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-teal-100">
                  Gelombang Ini Akan Berlalu
                </h3>
                <p className="text-xs sm:text-[13px] text-teal-200/90 leading-relaxed italic bg-teal-950/40 p-3.5 rounded-2xl border border-teal-800/60">
                  "Kamu tidak perlu menyelesaikan semua hal malam ini. Perasaan cemas adalah reaksi tubuh sementara, bukan identitasmu. Kamu aman di sini."
                </p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="w-full space-y-2.5 border-t border-slate-800 pt-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRestart}
              className="flex-1 py-2 px-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Ulangi 60 Detik</span>
            </button>
            <button
              type="button"
              onClick={handleStartChatting}
              className="flex-1 py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Lanjut Cerita ke AI</span>
            </button>
          </div>

          {/* Quick Direct Hotline Dial */}
          <div className="flex items-center justify-between text-[11px] px-2 py-1 bg-rose-950/30 rounded-xl border border-rose-900/50 text-rose-300">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>Butuh pertolongan darurat manusia?</span>
            </div>
            <a
              href="tel:119"
              className="font-bold underline hover:text-rose-200 flex items-center gap-1"
            >
              <PhoneCall className="w-3 h-3" />
              <span>Telepon 119</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
