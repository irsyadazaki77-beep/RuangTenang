import React, { useState, useEffect } from 'react';
import {
  Heart,
  Play,
  Pause,
  X,
  Smile
} from 'lucide-react';

export interface ZenCodingBreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: 'streak' | 'repeated_errors' | 'manual';
  isDark?: boolean;
}

export const ZenCodingBreakModal: React.FC<ZenCodingBreakModalProps> = ({
  isOpen,
  onClose,
  reason = 'manual',
  isDark = true
}) => {
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [secondsLeft, setSecondsLeft] = useState(4);
  const [isBreathingActive, setIsBreathingActive] = useState(true);

  // 4-7-8 breathing technique timer
  useEffect(() => {
    if (!isOpen || !isBreathingActive) return;

    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev > 1) return prev - 1;

        if (breathPhase === 'Inhale') {
          setBreathPhase('Hold');
          return 7;
        } else if (breathPhase === 'Hold') {
          setBreathPhase('Exhale');
          return 8;
        } else {
          setBreathPhase('Inhale');
          return 4;
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isBreathingActive, breathPhase]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl flex flex-col items-center text-center relative overflow-hidden ${
          isDark
            ? 'bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-teal-500/30 text-slate-100'
            : 'bg-white border-teal-200 text-slate-800'
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-semibold mb-3">
          <Heart className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
          <span>Ruang Coder Zen Sanctuary</span>
        </div>

        <h3 className="text-lg font-bold">
          {reason === 'repeated_errors'
            ? 'Tarik Napas Sejenak, Kamu Tidak Sendirian'
            : reason === 'streak'
            ? 'Kerja Keras yang Luar Biasa! Istirahat 1 Menit'
            : 'Jeda Sejenak untuk Menyegarkan Pikiran'}
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          {reason === 'repeated_errors'
            ? 'Error adalah proses belajar alami dalam coding. Kendurkan otot bahu dan bernapaslah perlahan sebelum mencoba lagi.'
            : 'Menatap layar terus-menerus menguras energi mental. Ikuti panduan pernapasan 4-7-8 untuk meredakan ketegangan.'}
        </p>

        {/* 4-7-8 Breathing Circle Indicator */}
        <div className="my-6 relative flex items-center justify-center">
          <div
            className={`w-36 h-36 rounded-full flex flex-col items-center justify-center border-4 transition-all duration-1000 shadow-xl ${
              breathPhase === 'Inhale'
                ? 'scale-110 border-teal-400 bg-teal-500/20 shadow-teal-500/30'
                : breathPhase === 'Hold'
                ? 'scale-105 border-purple-400 bg-purple-500/20 shadow-purple-500/30'
                : 'scale-90 border-sky-400 bg-sky-500/15 shadow-sky-500/20'
            }`}
          >
            <span className="text-xs font-medium uppercase tracking-wider text-teal-200">
              {breathPhase === 'Inhale'
                ? 'Tarik Napas'
                : breathPhase === 'Hold'
                ? 'Tahan'
                : 'Hembuskan'}
            </span>
            <span className="text-3xl font-bold font-mono my-0.5">{secondsLeft}</span>
            <span className="text-[10px] text-slate-400">detik</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 w-full">
          <button
            type="button"
            onClick={() => setIsBreathingActive(p => !p)}
            className="flex-1 py-2 px-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            {isBreathingActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isBreathingActive ? 'Jeda Latihan' : 'Mulai Latihan'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-teal-600/25"
          >
            <Smile className="w-3.5 h-3.5" />
            <span>Siap Lanjut Koding</span>
          </button>
        </div>
      </div>
    </div>
  );
};
