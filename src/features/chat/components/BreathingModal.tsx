import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wind, RotateCcw, Check, Sparkles } from 'lucide-react';
import { ModalShell } from '../../../components/ui/ModalShell';

interface BreathingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type BreathingPhase = 'inhale' | 'hold' | 'exhale';

const TOTAL_DURATION_SECONDS = 60;
const INHALE_DURATION = 4;
const HOLD_DURATION = 4;
const EXHALE_DURATION = 6;
const CYCLE_DURATION = INHALE_DURATION + HOLD_DURATION + EXHALE_DURATION; // 14s

export function BreathingModal({ isOpen, onClose }: BreathingModalProps) {
  const [timeLeft, setTimeLeft] = useState(TOTAL_DURATION_SECONDS);
  const [isActive, setIsActive] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [cycleTime, setCycleTime] = useState(0); // 0 to 14 within current cycle
  const [completedCycles, setCompletedCycles] = useState(0);

  // Reset or initialize when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeLeft(TOTAL_DURATION_SECONDS);
      setCycleTime(0);
      setCompletedCycles(0);
      setIsCompleted(false);
      setIsActive(true);
    } else {
      setIsActive(false);
    }
  }, [isOpen]);

  // Main countdown timer
  useEffect(() => {
    if (!isOpen || !isActive || isCompleted) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsActive(false);
          setIsCompleted(true);
          return 0;
        }
        return prev - 1;
      });

      setCycleTime((prev) => {
        const next = (prev + 1) % CYCLE_DURATION;
        if (next === 0) {
          setCompletedCycles((c) => c + 1);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isActive, isCompleted]);

  // Determine current phase based on cycleTime
  let currentPhase: BreathingPhase;
  let phaseSecondsLeft: number;
  let phaseText: string;
  let phaseSubtext: string;

  if (cycleTime < INHALE_DURATION) {
    currentPhase = 'inhale';
    phaseSecondsLeft = INHALE_DURATION - cycleTime;
    phaseText = 'Tarik napas perlahan...';
    phaseSubtext = 'Tarik napas melalui hidung dengan tenang dan lembut.';
  } else if (cycleTime < INHALE_DURATION + HOLD_DURATION) {
    currentPhase = 'hold';
    phaseSecondsLeft = INHALE_DURATION + HOLD_DURATION - cycleTime;
    phaseText = 'Tahan sejenak...';
    phaseSubtext = 'Biarkan tubuhmu merasakan keheningan dan kenyamanan.';
  } else {
    currentPhase = 'exhale';
    phaseSecondsLeft = CYCLE_DURATION - cycleTime;
    phaseText = 'Hembuskan perlahan lewat mulut...';
    phaseSubtext = 'Lepaskan semua ketegangan, biarkan bahumu rileks.';
  }

  const handleRestart = () => {
    setTimeLeft(TOTAL_DURATION_SECONDS);
    setCycleTime(0);
    setCompletedCycles(0);
    setIsCompleted(false);
    setIsActive(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Jeda Hening 1-Menit"
      subtitle="Latihan pernapasan terarah untuk menstabilkan detak jantung & sistem saraf"
      maxWidth="md"
    >
      <div className="flex flex-col items-center text-center py-2 sm:py-4 px-2 select-none">
        
        {/* Top Status Bar: Countdown & Cycle */}
        <div className="flex items-center justify-between w-full px-2 sm:px-4 py-2 mb-4 sm:mb-6 rounded-2xl bg-stone-100/70 dark:bg-slate-800/60 border border-stone-200/60 dark:border-slate-700/60 text-xs text-stone-600 dark:text-stone-300">
          <div className="flex items-center gap-1.5 font-medium">
            <Wind className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>Pola Pernapasan 4-4-6</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-stone-400 dark:text-stone-500">
              Siklus: <strong className="text-stone-700 dark:text-stone-200">{completedCycles + 1}</strong>
            </span>
            <span className="font-mono font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-200/60 dark:border-teal-800/60">
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!isCompleted ? (
            <motion.div
              key="breathing-active"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center w-full"
            >
              {/* Dynamic Breathing Visual Spheres */}
              <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center my-4 sm:my-6">
                
                {/* Outer Glow Halo */}
                <motion.div
                  animate={{
                    scale: currentPhase === 'inhale' ? 1.3 : currentPhase === 'hold' ? 1.32 : 0.85,
                    opacity: currentPhase === 'hold' ? [0.4, 0.7, 0.4] : currentPhase === 'inhale' ? 0.5 : 0.2,
                  }}
                  transition={{
                    duration: currentPhase === 'hold' ? 2 : currentPhase === 'inhale' ? INHALE_DURATION : EXHALE_DURATION,
                    repeat: currentPhase === 'hold' ? Infinity : 0,
                    ease: 'easeInOut',
                  }}
                  className="absolute inset-0 rounded-full bg-gradient-to-tr from-teal-400/30 via-emerald-300/25 to-cyan-400/20 dark:from-teal-500/20 dark:via-emerald-500/15 dark:to-cyan-500/10 blur-xl pointer-events-none"
                />

                {/* Secondary Ripple Layer */}
                <motion.div
                  animate={{
                    scale: currentPhase === 'inhale' ? 1.18 : currentPhase === 'hold' ? 1.2 : 0.9,
                  }}
                  transition={{
                    duration: currentPhase === 'inhale' ? INHALE_DURATION : currentPhase === 'hold' ? 0.3 : EXHALE_DURATION,
                    ease: 'easeInOut',
                  }}
                  className="absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full border border-teal-300/60 dark:border-teal-700/50 bg-teal-50/40 dark:bg-teal-950/20"
                />

                {/* Core Breathing Orb */}
                <motion.div
                  animate={{
                    scale: currentPhase === 'inhale' ? 1.25 : currentPhase === 'hold' ? 1.25 : 0.75,
                    boxShadow:
                      currentPhase === 'hold'
                        ? '0 0 35px rgba(20, 184, 166, 0.55)'
                        : '0 0 20px rgba(20, 184, 166, 0.25)',
                  }}
                  transition={{
                    duration: currentPhase === 'inhale' ? INHALE_DURATION : currentPhase === 'hold' ? 0.4 : EXHALE_DURATION,
                    ease: 'easeInOut',
                  }}
                  className="relative w-36 h-36 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-600 text-white flex flex-col items-center justify-center shadow-lg cursor-pointer"
                >
                  <span className="text-3xl sm:text-4xl font-bold font-mono tracking-tight drop-shadow-xs">
                    {phaseSecondsLeft}s
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-100 mt-1">
                    {currentPhase === 'inhale' ? 'Tarik' : currentPhase === 'hold' ? 'Tahan' : 'Hembuskan'}
                  </span>
                </motion.div>
              </div>

              {/* Dynamic Guidance Typography */}
              <div className="space-y-1.5 max-w-sm mt-2">
                <motion.h3
                  key={phaseText}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-base sm:text-lg font-serif font-medium text-stone-800 dark:text-stone-100"
                >
                  {phaseText}
                </motion.h3>
                <motion.p
                  key={phaseSubtext}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs sm:text-[13px] text-stone-500 dark:text-stone-400 leading-relaxed"
                >
                  {phaseSubtext}
                </motion.p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleRestart}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-stone-600 dark:text-stone-300 bg-stone-100 hover:bg-stone-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 transition-colors cursor-pointer min-h-[44px]"
                  aria-label="Putar ulang latihan"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Ulangi dari Awal</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-teal-700 dark:text-teal-300 bg-teal-50 hover:bg-teal-100/80 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 border border-teal-200/60 dark:border-teal-800/60 transition-colors cursor-pointer min-h-[44px]"
                >
                  <span>Selesai Lebih Awal</span>
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="breathing-completed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-6 space-y-4 max-w-sm"
            >
              <div className="w-16 h-16 rounded-2xl bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 flex items-center justify-center shadow-inner">
                <Sparkles className="w-8 h-8 animate-bounce" />
              </div>

              <div className="space-y-1.5 text-center">
                <h3 className="text-lg sm:text-xl font-serif font-medium text-stone-800 dark:text-stone-100">
                  Latihan Selesai
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                  Bagus sekali! Kamu telah meluangkan 1 menit berharga untuk menenangkan pikiranmu. Bagaimana perasaanmu sekarang?
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full pt-2">
                <button
                  type="button"
                  onClick={handleRestart}
                  className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium text-stone-700 dark:text-stone-300 bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition cursor-pointer min-h-[44px]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Latihan Lagi</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 active:bg-teal-900 shadow-md shadow-teal-700/20 transition cursor-pointer min-h-[44px]"
                >
                  <Check className="w-4 h-4" />
                  <span>Kembali ke Ruang Tenang</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ModalShell>
  );
}
