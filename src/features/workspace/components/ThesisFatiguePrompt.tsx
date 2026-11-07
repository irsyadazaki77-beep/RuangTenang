import React, { useState } from 'react';
import {
  Moon,
  Coffee,
  Volume2,
  VolumeX,
  X,
  Wind
} from 'lucide-react';
import { soundscapeEngine } from '../../../lib/soundscapeEngine';

export interface ThesisFatiguePromptProps {
  isOpen: boolean;
  promptType: 'fatigue' | 'latenight' | 'writer_block';
  continuousMinutes: number;
  onDismiss: () => void;
  isDark?: boolean;
}

export const ThesisFatiguePrompt: React.FC<ThesisFatiguePromptProps> = ({
  isOpen,
  promptType,
  continuousMinutes,
  onDismiss,
  isDark = true
}) => {
  const [isPlayingRain, setIsPlayingRain] = useState(false);
  const [isBreathingMode, setIsBreathingMode] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'Tarik Napas (4d)' | 'Tahan (4d)' | 'Hembuskan (4d)'>('Tarik Napas (4d)');

  if (!isOpen) return null;

  const handleToggleSoundscape = () => {
    if (isPlayingRain) {
      soundscapeEngine.pauseAll();
      setIsPlayingRain(false);
    } else {
      soundscapeEngine.startTrack('rain');
      setIsPlayingRain(true);
    }
  };

  const handleStartBreathing = () => {
    setIsBreathingMode(true);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      const mod = step % 3;
      if (mod === 0) setBreathPhase('Tarik Napas (4d)');
      else if (mod === 1) setBreathPhase('Tahan (4d)');
      else setBreathPhase('Hembuskan (4d)');

      if (step >= 9) {
        clearInterval(interval);
        setTimeout(() => setIsBreathingMode(false), 2000);
      }
    }, 4000);
  };

  return (
    <div className="fixed bottom-12 right-6 z-40 max-w-sm w-full animate-in slide-in-from-bottom-5 duration-300">
      <div
        className={`p-4 rounded-2xl border shadow-2xl backdrop-blur-md relative overflow-hidden ${
          isDark
            ? 'bg-slate-900/95 border-teal-500/30 text-slate-100 shadow-teal-950/40'
            : 'bg-white/95 border-teal-200 text-slate-800 shadow-teal-100'
        }`}
      >
        {/* Glow accent */}
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400">
              {promptType === 'latenight' ? <Moon className="w-4 h-4" /> : <Coffee className="w-4 h-4" />}
            </div>
            <div>
              <h4 className="text-xs font-bold flex items-center gap-1.5">
                <span>
                  {promptType === 'latenight'
                    ? 'Sesi Menulis Larut Malam'
                    : `Sudah ${continuousMinutes} Menit Mengetik`}
                </span>
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              </h4>
              <p className="text-[10px] text-slate-400">RuangTenang Wellness Sentinel</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            className="p-1 rounded-md text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Tutup & Ingatkan Nanti"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <p className="text-[11px] leading-relaxed text-slate-300 mb-3">
          {promptType === 'latenight'
            ? 'Tubuh dan konsentrasi butuh jeda di jam istirahat. Tarik napas sejenak atau dengarkan gemercik hujan agar pikiran tetap jernih.'
            : 'Mengetik naskah skripsi secara intensif berpotensi memicu ketegangan leher dan writer\'s block. Rehat 2-3 menit yuk?'}
        </p>

        {isBreathingMode ? (
          <div className="p-3 mb-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-center animate-pulse">
            <span className="text-xs font-bold text-teal-400 block">{breathPhase}</span>
            <span className="text-[10px] text-slate-400">Latihan Pernapasan Ritmis 4-4-4</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSoundscape}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                isPlayingRain
                  ? 'bg-teal-600 border-teal-500 text-white'
                  : 'bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border-teal-500/30'
              }`}
            >
              {isPlayingRain ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              <span>{isPlayingRain ? 'Hentikan Hujan' : 'Ambient Hujan'}</span>
            </button>

            <button
              type="button"
              onClick={handleStartBreathing}
              className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-all cursor-pointer"
            >
              <Wind className="w-3 h-3 text-indigo-400" />
              <span>Napas 60 Detik</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
