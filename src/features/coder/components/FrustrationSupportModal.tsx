import React, { useState, useEffect } from 'react';
import {
  X,
  Heart,
  Eye,
  Volume2,
  Brain
} from 'lucide-react';
import { soundscapeEngine } from '../../../lib/soundscapeEngine';

interface FrustrationSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  consecutiveErrors?: number;
  onAskKiHadjar?: () => void;
  onResetErgonomicsTimer?: () => void;
  isDark?: boolean;
}

export const FrustrationSupportModal: React.FC<FrustrationSupportModalProps> = ({
  isOpen,
  onClose,
  consecutiveErrors = 3,
  onAskKiHadjar,
  onResetErgonomicsTimer,
  isDark = true
}) => {
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [breathTimer, setBreathTimer] = useState<number>(4);
  const [isPlayingLofi, setIsPlayingLofi] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setBreathTimer(prev => {
        if (prev <= 1) {
          setBreathPhase(curr => {
            if (curr === 'inhale') return 'hold';
            if (curr === 'hold') return 'exhale';
            return 'inhale';
          });
          return 4;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleSoundscape = () => {
    if (isPlayingLofi) {
      soundscapeEngine.pauseAll();
      setIsPlayingLofi(false);
    } else {
      soundscapeEngine.startTrack('rain');
      soundscapeEngine.setTrackVolume('rain', 0.6);
      setIsPlayingLofi(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden text-center p-6 ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-teal-500/20 mb-3">
          <Heart className="w-6 h-6 animate-pulse" />
        </div>

        <h3 className="text-lg font-bold">RuangTenang Care: Bernapas Sejenak, Bro</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Terdeteksi {consecutiveErrors} kali hambatan error berturut-turut. Otak yang tenang menyelesaikan bug 3x lebih cepat dibanding otak yang tertekan.
        </p>

        {/* Breathing Animation Circle */}
        <div className="my-6 flex flex-col items-center justify-center">
          <div
            className={`w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-1000 ${
              breathPhase === 'inhale'
                ? 'scale-110 border-teal-400 bg-teal-500/15 shadow-xl shadow-teal-500/20'
                : breathPhase === 'hold'
                ? 'scale-105 border-amber-400 bg-amber-500/15'
                : 'scale-90 border-sky-400 bg-sky-500/10'
            }`}
          >
            <span className="text-xs uppercase font-bold tracking-wider text-slate-300">
              {breathPhase === 'inhale' ? 'Tarik Napas' : breathPhase === 'hold' ? 'Tahan' : 'Hembuskan'}
            </span>
            <span className="text-2xl font-bold font-mono mt-0.5 text-white">{breathTimer}</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-3 italic">
            "Ing ngarso sung tulodo — ketenangan pikiran melahirkan kejernihan logika."
          </span>
        </div>

        {/* Action Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {onAskKiHadjar && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onAskKiHadjar();
              }}
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md cursor-pointer transition-all"
            >
              <Brain className="w-4 h-4" />
              <span>Bantu Bedah via Ki Hadjar</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleSoundscape}
            className={`flex items-center justify-center gap-2 p-2.5 rounded-xl font-medium border cursor-pointer transition-colors ${
              isPlayingLofi
                ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                : isDark ? 'border-slate-800 bg-slate-800/60 hover:bg-slate-800 text-slate-300' : 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>{isPlayingLofi ? 'Matikan Suara Hujan' : 'Putar Audio Hujan Zen'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onResetErgonomicsTimer?.();
              onClose();
            }}
            className={`flex items-center justify-center gap-2 p-2.5 rounded-xl font-medium border cursor-pointer transition-colors ${
              isDark ? 'border-slate-800 bg-slate-800/60 hover:bg-slate-800 text-slate-300' : 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800'
            }`}
          >
            <Eye className="w-4 h-4 text-amber-400" />
            <span>Aturan Mata 20-20-20</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className={`flex items-center justify-center gap-2 p-2.5 rounded-xl font-semibold cursor-pointer ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
            }`}
          >
            <span>Sudah Siap Koding Lagi</span>
          </button>
        </div>
      </div>
    </div>
  );
};
