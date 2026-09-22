import React, { useState, useEffect } from 'react';
import { Wind, X, CheckCircle2, RotateCcw, HeartHandshake } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { playCompletionChime } from '../../../lib/soundEffects';
import { modalBackdropVariants, modalPanelVariants } from '../../../lib/motionTokens';

interface MicroBreathingModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string;
}

type BreathingPhase = 'inhale' | 'hold1' | 'exhale' | 'hold2';

export const MicroBreathingModal: React.FC<MicroBreathingModalProps> = ({
  isOpen,
  onClose,
  reason
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [secondsRemaining, setSecondsRemaining] = useState<number>(60);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [phase, setPhase] = useState<BreathingPhase>('inhale');
  const [phaseSeconds, setPhaseSeconds] = useState<number>(4);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Box Breathing cycle (4s Inhale, 4s Hold, 4s Exhale, 4s Hold)
  useEffect(() => {
    if (!isOpen || !isActive || isCompleted) return;

    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          setIsCompleted(true);
          setIsActive(false);
          playCompletionChime();
          return 0;
        }
        return prev - 1;
      });

      setPhaseSeconds(prevPhaseSec => {
        if (prevPhaseSec <= 1) {
          setPhase(currentPhase => {
            if (currentPhase === 'inhale') return 'hold1';
            if (currentPhase === 'hold1') return 'exhale';
            if (currentPhase === 'exhale') return 'hold2';
            return 'inhale';
          });
          return 4;
        }
        return prevPhaseSec - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isActive, isCompleted]);

  const getPhaseInstruction = () => {
    switch (phase) {
      case 'inhale':
        return { text: 'Tarik Napas Perlahan...', sub: 'Rasakan udara mengisi paru-paru', color: 'text-teal-400' };
      case 'hold1':
        return { text: 'Tahan Sejenak...', sub: 'Bawa ketenangan ke seluruh tubuh', color: 'text-emerald-400' };
      case 'exhale':
        return { text: 'Hembuskan Beban...', sub: 'Lepaskan ketegangan di pundak & dahi', color: 'text-teal-300' };
      case 'hold2':
        return { text: 'Jeda Hening...', sub: 'Istirahatkan pikiranmu sejenak', color: 'text-emerald-300' };
    }
  };

  const currentInstruction = getPhaseInstruction();

  const handleRestart = () => {
    setSecondsRemaining(60);
    setPhase('inhale');
    setPhaseSeconds(4);
    setIsCompleted(false);
    setIsActive(true);
  };

  // Sinusoidal easing curve: [0.37, 0, 0.63, 1] is standard mathematical sinus easeInOut
  const sinusEase = [0.37, 0, 0.63, 1];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 select-none"
          variants={modalBackdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose}
        >
          <motion.div 
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative flex flex-col items-center text-center overflow-hidden"
            variants={modalPanelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={e => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors btn-press-compact cursor-pointer"
              title="Tutup jeda napas"
              aria-label="Tutup jeda napas"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold mb-4">
              <Wind className="w-3.5 h-3.5 animate-pulse" />
              <span>Jeda Regulasi Napas 1 Menit</span>
            </div>

            {reason && (
              <p className="text-xs text-slate-400 mb-6 max-w-xs">
                {reason}
              </p>
            )}

            {!isCompleted ? (
              <>
                {/* Visual Organic Breathing Chamber */}
                <div className="relative w-52 h-52 sm:w-60 sm:h-60 flex items-center justify-center my-4">
                  {/* Organic Ethereal Glow Aura */}
                  <motion.div 
                    className="absolute inset-2 rounded-full bg-teal-500/15 filter blur-xl pointer-events-none"
                    animate={
                      shouldReduceMotion
                        ? { opacity: 0.2 }
                        : {
                            scale: phase === 'inhale' ? [0.9, 1.3] : phase === 'hold1' ? [1.3, 1.35, 1.3] : phase === 'exhale' ? [1.3, 0.9] : [0.9, 0.88, 0.9],
                            opacity: phase === 'inhale' ? [0.15, 0.35] : phase === 'hold1' ? 0.35 : phase === 'exhale' ? [0.35, 0.15] : 0.15
                          }
                    }
                    transition={{
                      duration: 4,
                      ease: sinusEase
                    }}
                  />

                  {/* Outer Pulsing Guideline Ring */}
                  <motion.div 
                    className="absolute inset-0 rounded-full border border-teal-500/30"
                    animate={
                      shouldReduceMotion
                        ? { opacity: 0.5 }
                        : {
                            scale: phase === 'inhale' ? [0.92, 1.14] : phase === 'hold1' ? [1.14, 1.16, 1.14] : phase === 'exhale' ? [1.14, 0.92] : [0.92, 0.9, 0.92],
                            borderColor: phase === 'hold1' || phase === 'hold2' ? 'rgba(16, 185, 129, 0.45)' : 'rgba(20, 184, 166, 0.45)'
                          }
                    }
                    transition={{
                      duration: 4,
                      ease: sinusEase
                    }}
                  />
                  
                  {/* Inner Organic Breathing Orb with continuous sinusoidal scale */}
                  <motion.div 
                    className="w-32 h-32 sm:w-36 sm:h-36 rounded-full flex flex-col items-center justify-center shadow-2xl relative z-10"
                    animate={
                      shouldReduceMotion
                        ? { opacity: 1 }
                        : {
                            scale: phase === 'inhale' ? [0.86, 1.22] : phase === 'hold1' ? [1.22, 1.24, 1.22] : phase === 'exhale' ? [1.22, 0.86] : [0.86, 0.84, 0.86],
                            background: phase === 'inhale'
                              ? 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)'
                              : phase === 'hold1'
                              ? 'linear-gradient(135deg, #059669 0%, #14b8a6 100%)'
                              : phase === 'exhale'
                              ? 'linear-gradient(135deg, #0f766e 0%, #047857 100%)'
                              : 'linear-gradient(135deg, #047857 0%, #0d9488 100%)',
                            boxShadow: phase === 'inhale' || phase === 'hold1'
                              ? '0 0 32px rgba(20, 184, 166, 0.5)'
                              : '0 0 16px rgba(20, 184, 166, 0.2)'
                          }
                    }
                    transition={{
                      duration: 4,
                      ease: sinusEase
                    }}
                  >
                    <span className="text-3xl font-extrabold text-white font-mono drop-shadow-sm">{phaseSeconds}s</span>
                    <span className="text-[11px] text-white/90 uppercase tracking-widest font-semibold mt-0.5 drop-shadow-xs">{phase}</span>
                  </motion.div>
                </div>

                {/* Instruction Text with smooth fade */}
                <div className="space-y-1 my-3">
                  <h3 className={`text-base sm:text-lg font-bold ${currentInstruction.color} transition-colors duration-500`}>
                    {currentInstruction.text}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {currentInstruction.sub}
                  </p>
                </div>

                {/* Timer Counter */}
                <div className="text-xs text-slate-500 font-mono mt-2">
                  Sisa waktu jeda: {secondsRemaining} detik
                </div>
              </>
            ) : (
              /* Completion State */
              <motion.div 
                className="py-6 space-y-4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-white">Napasmu Sudah Lebih Rileks ✨</h3>
                  <p className="text-xs text-slate-300 max-w-sm leading-relaxed">
                    Kepanikan akademik adalah reaksi alami saat beban bertumpuk. Kerjakan satu kalimat atau satu baris kode dalam satu waktu.
                  </p>
                </div>
                <div className="flex gap-3 pt-3 justify-center">
                  <button
                    type="button"
                    onClick={handleRestart}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer btn-tactile"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Ulangi 1 Menit</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="min-h-[44px] px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-md btn-tactile"
                  >
                    Lanjutkan Tugas di RuangKerja
                  </button>
                </div>
              </motion.div>
            )}

            {/* Footer info */}
            {!isCompleted && (
              <div className="mt-4 pt-4 border-t border-slate-800/80 w-full flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <HeartHandshake className="w-3.5 h-3.5 text-teal-400" />
                  Metode Box Breathing 4-4-4-4
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-200 cursor-pointer min-h-[44px] flex items-center"
                >
                  Lewati & Tulis Prompt
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
