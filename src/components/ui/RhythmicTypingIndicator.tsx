import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Sparkles, Brain } from 'lucide-react';

interface RhythmicTypingIndicatorProps {
  label?: string;
  avatarSrc?: string;
  className?: string;
  mode?: 'RUANG_TENANG' | 'RUANG_KERJA';
  hideAvatar?: boolean;
}

const TENANG_PHASES = [
  'Mendengarkan dan memahami perasaanmu...',
  'Merenungkan respon yang hangat & tenang...',
  'Menyusun kata-kata terbaik untukmu...'
];

const KERJA_PHASES = [
  'Menganalisis konteks dan instruksi...',
  'Mempersiapkan sintesis materi yang tepat...',
  'Menyusun dokumen akademik di Canvas...'
];

export const RhythmicTypingIndicator: React.FC<RhythmicTypingIndicatorProps> = ({
  label,
  avatarSrc,
  className = '',
  mode = 'RUANG_TENANG',
  hideAvatar = false
}) => {
  const shouldReduceMotion = useReducedMotion();
  const isKerja = mode === 'RUANG_KERJA';

  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    // Stage 1 -> Stage 2 after 1.8s
    const t1 = setTimeout(() => setPhaseIndex(1), 1800);
    // Stage 2 -> Stage 3 after 4.2s
    const t2 = setTimeout(() => setPhaseIndex(2), 4200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const displayLabel = label || (isKerja ? KERJA_PHASES[phaseIndex] : TENANG_PHASES[phaseIndex]);

  return (
    <div
      className={`flex items-center gap-2.5 py-1 ${hideAvatar ? '' : 'pl-1 sm:pl-2'} select-none animate-fade-in ${className}`}
      role="status"
      aria-live="polite"
      aria-label={displayLabel}
    >
      {/* Dynamic Luminous Avatar Indicator */}
      {!hideAvatar && (
        avatarSrc ? (
          <div className={`relative w-8 h-8 rounded-xl flex items-center justify-center p-0.5 shrink-0 transition-all ${
            isKerja
              ? 'bg-indigo-50/90 dark:bg-indigo-950/50 border border-indigo-200/70 dark:border-indigo-800/50 shadow-[0_0_12px_rgba(99,102,241,0.25)]'
              : 'bg-white dark:bg-teal-950/50 border border-teal-200/60 dark:border-teal-900/50 shadow-[0_0_12px_rgba(20,184,166,0.25)]'
          }`}>
            <img src={avatarSrc} alt="" className="w-full h-full object-contain pointer-events-none" />
            <span className={`absolute -top-0.5 -right-0.5 flex h-2 w-2`}>
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isKerja ? 'bg-indigo-400' : 'bg-teal-400'}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isKerja ? 'bg-indigo-500' : 'bg-teal-500'}`} />
            </span>
          </div>
        ) : (
          <div className={`relative w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${
            isKerja
              ? 'bg-gradient-to-tr from-indigo-500/20 via-indigo-600/15 to-purple-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-300/60 dark:border-indigo-700/50 shadow-[0_0_14px_rgba(99,102,241,0.25)]'
              : 'bg-gradient-to-tr from-teal-500/20 via-emerald-600/15 to-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-300/60 dark:border-teal-700/50 shadow-[0_0_14px_rgba(20,184,166,0.25)]'
          }`}>
            {isKerja ? (
              <Brain className="w-4 h-4 animate-pulse" />
            ) : (
              <Sparkles className="w-4 h-4 animate-spin-slow" />
            )}
            <span className={`absolute -top-0.5 -right-0.5 flex h-2 w-2`}>
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isKerja ? 'bg-indigo-400' : 'bg-teal-400'}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isKerja ? 'bg-indigo-500' : 'bg-teal-500'}`} />
            </span>
          </div>
        )
      )}

      {/* Rhythmic Breathing Capsule with Aurora Shimmer */}
      <div className={`relative flex items-center gap-2.5 px-3.5 py-2 rounded-2xl rounded-bl-xs bg-white/95 dark:bg-[#1e1f20]/95 border shadow-sm overflow-hidden transition-all duration-300 ${
        isKerja
          ? 'border-indigo-200/80 dark:border-indigo-800/60 shadow-[0_2px_14px_rgba(99,102,241,0.12)]'
          : 'border-teal-200/80 dark:border-teal-800/60 shadow-[0_2px_14px_rgba(20,184,166,0.12)]'
      }`}>
        {/* Shimmering Aurora Wave */}
        <div
          className={`absolute inset-0 pointer-events-none opacity-40 ${
            isKerja ? 'gemini-shimmer' : 'tenang-shimmer'
          }`}
        />

        {/* Dynamic 4-Bar Soundwave / Neural Activity */}
        <div className="relative z-10 flex items-center gap-1 h-3.5" aria-hidden="true">
          {[0.3, 0.7, 0.45, 0.85].map((scale, i) => (
            <motion.span
              key={`bar-${i}`}
              className={`w-0.5 rounded-full ${
                isKerja
                  ? 'bg-indigo-500 dark:bg-indigo-400'
                  : 'bg-teal-500 dark:bg-teal-400'
              }`}
              animate={
                shouldReduceMotion
                  ? { opacity: [0.4, 1, 0.4] }
                  : {
                      height: ['4px', `${12 * scale + 4}px`, '4px'],
                      opacity: [0.4, 1, 0.4]
                    }
              }
              transition={{
                duration: 0.9,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.14
              }}
            />
          ))}
        </div>

        {/* 3 Rhythmic Orbiting Dots */}
        <div className="relative z-10 flex items-center gap-1.5 h-3.5">
          {[0, 0.18, 0.36].map((delay, index) => (
            <motion.span
              key={`dot-${index}`}
              className={`w-2 h-2 rounded-full ${
                isKerja
                  ? 'bg-indigo-600 dark:bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.55)]'
                  : 'bg-teal-600 dark:bg-teal-400 shadow-[0_0_8px_rgba(20,184,166,0.55)]'
              }`}
              animate={
                shouldReduceMotion
                  ? { opacity: [0.35, 1, 0.35] }
                  : {
                      y: [0, -4.5, 0],
                      opacity: [0.4, 1, 0.4],
                      scale: [0.85, 1.25, 0.85]
                    }
              }
              transition={{
                duration: 1.1,
                repeat: Infinity,
                ease: 'easeInOut',
                delay
              }}
            />
          ))}
        </div>

        {/* Live Status Label with Soft Fade Transition */}
        <motion.span
          key={displayLabel}
          initial={{ opacity: 0, y: 1 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 text-[12px] text-slate-600 dark:text-slate-300 font-medium pl-0.5 tracking-tight"
        >
          {displayLabel}
        </motion.span>
      </div>
    </div>
  );
};
