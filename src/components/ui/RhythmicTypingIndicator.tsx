import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface RhythmicTypingIndicatorProps {
  label?: string;
  avatarSrc?: string;
  className?: string;
}

export const RhythmicTypingIndicator: React.FC<RhythmicTypingIndicatorProps> = ({
  label = 'RuangTenang sedang merespons...',
  avatarSrc = '/favicon.svg',
  className = ''
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div 
      className={`flex items-center gap-2.5 py-1.5 pl-1 sm:pl-2 select-none animate-fade-in ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      {/* Mini App Avatar Indicator */}
      {avatarSrc && (
        <div className="w-6 h-6 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200/80 dark:border-teal-900/60 flex items-center justify-center p-1 shrink-0 shadow-2xs">
          <img src={avatarSrc} alt="" className="w-full h-full object-contain pointer-events-none" />
        </div>
      )}

      {/* Rhythmic 3-Dot Wave */}
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl rounded-bl-xs bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700/60 shadow-3xs">
        <div className="flex items-center gap-1.5 h-3.5">
          {[0, 0.18, 0.36].map((delay, index) => (
            <motion.span
              key={index}
              className="w-2 h-2 rounded-full bg-teal-600 dark:bg-teal-400 shadow-3xs"
              animate={
                shouldReduceMotion
                  ? { opacity: [0.35, 1, 0.35] }
                  : {
                      y: [0, -4.5, 0],
                      opacity: [0.4, 1, 0.4],
                      scale: [0.88, 1.12, 0.88]
                    }
              }
              transition={{
                duration: 1.15,
                repeat: Infinity,
                ease: 'easeInOut',
                delay
              }}
            />
          ))}
        </div>

        <span className="text-[12px] text-slate-500 dark:text-slate-400 font-medium pl-1 tracking-tight">
          {label}
        </span>
      </div>
    </div>
  );
};
