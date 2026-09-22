import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, Hand, Volume2, VolumeX, Wind, Heart, ChevronRight, ChevronLeft, CheckCircle2, Sparkles, RefreshCw, ShieldCheck } from 'lucide-react';
import { ModalShell } from '../../../components/ui/ModalShell';
import { playTibetanBowlSound } from '../../../lib/soundEffects';

interface GroundingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBreathing?: () => void;
}

interface StepInfo {
  number: number;
  count: number;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  examples: string[];
  placeholder: string;
}

const STEPS: StepInfo[] = [
  {
    number: 1,
    count: 5,
    title: '5 Benda yang Kamu Lihat',
    subtitle: 'Arahkan pandanganmu ke sekitar ruangan. Amati dan sebutkan 5 benda yang ada di dekatmu.',
    icon: Eye,
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-50 dark:bg-teal-950/50',
    borderColor: 'border-teal-200 dark:border-teal-800',
    examples: ['Layar laptop/HP', 'Jam dinding', 'Tanaman hias', 'Buku catatan', 'Lampu meja'],
    placeholder: 'Sebutkan benda 1, 2, 3, 4, 5...'
  },
  {
    number: 2,
    count: 4,
    title: '4 Tekstur yang Kamu Sentuh',
    subtitle: 'Rasakan sentuhan fisik di sekitarmu. Sadari 4 tekstur benda yang sedang menyentuh kulitmu.',
    icon: Hand,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/50',
    borderColor: 'border-blue-200 dark:border-blue-800',
    examples: ['Kain baju yang kamu pakai', 'Permukaan meja kayu', 'Lantai yang dingin', 'Gagang cangkir'],
    placeholder: 'Rasakan tekstur 1, 2, 3, 4...'
  },
  {
    number: 3,
    count: 3,
    title: '3 Suara yang Kamu Dengarkan',
    subtitle: 'Dengarkan suara di sekelilingmu dengan tenang. Kenali 3 suara terdekat maupun jauh.',
    icon: Volume2,
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/50',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    examples: ['Deru pendingin ruangan/kipas', 'Suara burung di luar', 'Detak jarum jam'],
    placeholder: 'Dengarkan suara 1, 2, 3...'
  },
  {
    number: 4,
    count: 2,
    title: '2 Aroma yang Kamu Hirup',
    subtitle: 'Hirup udara perlahan lewat hidung. Sadari 2 aroma atau bau yang tercium saat ini.',
    icon: Wind,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/50',
    borderColor: 'border-amber-200 dark:border-amber-800',
    examples: ['Wangi sabun/hand sanitizer', 'Aroma teh/kopi', 'Kertas buku', 'Udara pagi'],
    placeholder: 'Cium aroma 1, 2...'
  },
  {
    number: 5,
    count: 1,
    title: '1 Rasa atau 1 Napas Dalam',
    subtitle: 'Fokuskan pada 1 rasa di lidahmu atau tarik satu napas panjang yang sangat tenang.',
    icon: Heart,
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-50 dark:bg-rose-950/50',
    borderColor: 'border-rose-200 dark:border-rose-800',
    examples: ['Sisa rasa minuman/pasta gigi', 'Hembusan napas hangat', 'Sensasi mulut segar'],
    placeholder: 'Sadari rasa atau napas dalam...'
  }
];

export function GroundingModal({ isOpen, onClose, onOpenBreathing }: GroundingModalProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerProgress, setTimerProgress] = useState(100);
  const [isCompleted, setIsCompleted] = useState(false);

  // Sound toggle (persisted in localStorage, default: true)
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('rt_grounding_sound');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggleSound = () => {
    setIsSoundEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('rt_grounding_sound', String(next));
      } catch {}
      if (next) {
        playTibetanBowlSound(432);
      }
      return next;
    });
  };

  // Play gentle bell on step transition
  useEffect(() => {
    if (isOpen && !isCompleted && isSoundEnabled) {
      const stepFrequencies = [432, 384, 345, 320, 288];
      const freq = stepFrequencies[currentStepIndex] || 432;
      playTibetanBowlSound(freq);
    }
  }, [currentStepIndex, isOpen, isCompleted, isSoundEnabled]);

  const step = STEPS[currentStepIndex];
  const progressPercent = ((currentStepIndex + 1) / STEPS.length) * 100;

  // 5-second breath pause timer
  useEffect(() => {
    let interval: any;
    if (isTimerRunning) {
      setTimerProgress(100);
      const startTime = Date.now();
      const duration = 5000;

      interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setTimerProgress(remaining);

        if (elapsed >= duration) {
          clearInterval(interval);
          setIsTimerRunning(false);
        }
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
      setIsTimerRunning(false);
    } else {
      setIsCompleted(true);
      if (isSoundEnabled) {
        playTibetanBowlSound(528); // Uplifting tone on completion
      }
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
      setIsTimerRunning(false);
    }
  };

  const handleReset = () => {
    setCurrentStepIndex(0);
    setNotes({});
    setIsCompleted(false);
    setIsTimerRunning(false);
    if (isSoundEnabled) {
      playTibetanBowlSound(432);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Latihan Grounding Sensorik 5-4-3-2-1"
      subtitle="Teknik psikologi terbukti untuk meredakan serangan panik, kecemasan akut, dan overthinking"
      maxWidth="xl"
      headerRight={
        <button
          type="button"
          onClick={toggleSound}
          className={`p-2 rounded-xl transition-colors cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center ${
            isSoundEnabled
              ? 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800'
          }`}
          title={isSoundEnabled ? 'Suara Panduan Aktif (Klik untuk mute)' : 'Suara Panduan Hening (Klik untuk bunyikan)'}
          aria-label={isSoundEnabled ? 'Bisukan suara panduan' : 'Nyalakan suara panduan'}
        >
          {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      }
    >
      <div className="space-y-5">
        {!isCompleted ? (
          <>
            {/* Progress Bar & Step Indicator */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span>Langkah {currentStepIndex + 1} dari 5</span>
                <span className="text-teal-600 dark:text-teal-400">{Math.round(progressPercent)}% Selesai</span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-teal-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Main Step Card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className={`p-5 rounded-2xl border ${step.borderColor} ${step.bgColor} space-y-4 shadow-xs`}
              >
                <div className="flex items-start gap-3.5">
                  <div className={`p-3 rounded-2xl bg-white dark:bg-slate-900 shadow-xs shrink-0 ${step.color}`}>
                    <step.icon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Sensorik #{step.number}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                      {step.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {step.subtitle}
                    </p>
                  </div>
                </div>

                {/* Examples Chips */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Contoh pengamatan:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {step.examples.map((ex, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300 font-medium"
                      >
                        {ex}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Notes Input for focus */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Tuliskan poin yang kamu sadari (opsional):
                  </label>
                  <textarea
                    rows={2}
                    value={notes[step.number] || ''}
                    onChange={e => setNotes({ ...notes, [step.number]: e.target.value })}
                    placeholder={step.placeholder}
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all resize-none"
                  />
                </div>

                {/* 5-Second Calming Breath Button */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>Butuh jeda bernapas sebelum lanjut?</span>
                  </div>
                  <button
                    onClick={() => setIsTimerRunning(true)}
                    disabled={isTimerRunning}
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 relative overflow-hidden"
                  >
                    {isTimerRunning && (
                      <div
                        className="absolute inset-0 bg-teal-500/20 transition-all duration-75"
                        style={{ width: `${timerProgress}%` }}
                      />
                    )}
                    <span className="relative z-10">
                      {isTimerRunning ? 'Hela Napas Tenang... (5d)' : 'Jeda Napas 5 Detik'}
                    </span>
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Footer Navigation Controls */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handlePrev}
                disabled={currentStepIndex === 0}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Sebelumnya
              </button>

              <button
                onClick={handleNext}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow flex items-center gap-1.5 cursor-pointer"
              >
                <span>{currentStepIndex === STEPS.length - 1 ? 'Selesaikan Grounding' : 'Langkah Berikutnya'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          /* Completion State */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 rounded-2xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 text-center space-y-4"
          >
            <div className="w-14 h-14 mx-auto rounded-full bg-teal-600 text-white flex items-center justify-center shadow-md">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Kamu Aman & Memegang Kendali
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                Latihan grounding 5-4-3-2-1 telah selesai. Tubuh dan pikiranmu perlahan terhubung kembali dengan momen saat ini. Selalu ingat bahwa kepanikan bersifat sementara dan akan berlalu.
              </p>
            </div>

            <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-teal-100 dark:border-teal-900/60 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2 justify-center">
              <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
              <span>Napasmu tenang, ruangan sekitarmu aman.</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <button
                onClick={handleReset}
                className="w-full sm:w-auto px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Ulangi Latihan
              </button>

              {onOpenBreathing && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenBreathing();
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Latihan Pernapasan (1 Menit)
                </button>
              )}

              <button
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Kembali ke Percakapan
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </ModalShell>
  );
}
