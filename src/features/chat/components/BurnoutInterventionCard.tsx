import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Wind,
  HeartHandshake,
  Sparkles,
  Calendar,
  ChevronRight,
  CheckCircle2,
  Eye,
  Hand,
  Ear,
  Flower2,
  Coffee,
  X,
  Play,
  Pause
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BurnoutInterventionCardProps {
  distressType?: 'panic' | 'overwhelm' | 'exhaustion' | 'burnout';
  triggerReason?: string;
  onOpenBreathingModal?: () => void;
  onOpenCounselorBooking?: () => void;
}

type TabType = 'breathing' | 'grounding' | 'counselor';

export const BurnoutInterventionCard: React.FC<BurnoutInterventionCardProps> = ({
  distressType = 'overwhelm',
  triggerReason,
  onOpenBreathingModal,
  onOpenCounselorBooking
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('breathing');
  const [isDismissed, setIsDismissed] = useState(false);

  // Box Breathing Micro Timer State
  const [isBreathingRunning, setIsBreathingRunning] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold1' | 'Exhale' | 'Hold2'>('Inhale');
  const [phaseSeconds, setPhaseSeconds] = useState(4);
  const [completedCycles, setCompletedCycles] = useState(0);

  // Grounding 5-4-3-2-1 Active Step
  const [groundingStep, setGroundingStep] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isBreathingRunning) {
      timer = setInterval(() => {
        setPhaseSeconds((prev) => {
          if (prev <= 1) {
            setBreathPhase((currentPhase) => {
              if (currentPhase === 'Inhale') return 'Hold1';
              if (currentPhase === 'Hold1') return 'Exhale';
              if (currentPhase === 'Exhale') return 'Hold2';
              setCompletedCycles((c) => c + 1);
              return 'Inhale';
            });
            return 4;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isBreathingRunning]);

  if (isDismissed) return null;

  const groundingSteps = [
    {
      step: 5,
      title: '5 Hal yang Anda Lihat',
      desc: 'Perhatikan 5 objek di sekitar Anda (warna dinding, pantulan cahaya, bentuk pena, tanaman, jam).',
      icon: Eye,
      color: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-50 dark:bg-teal-950/60'
    },
    {
      step: 4,
      title: '4 Hal yang Dapat Anda Sentuh',
      desc: 'Rasakan tekstur permukaan meja, kain pakaian Anda, berat ponsel, atau telapak kaki di lantai.',
      icon: Hand,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/60'
    },
    {
      step: 3,
      title: '3 Suara yang Anda Dengar',
      desc: 'Dengarkan suara detik jam, hembusan AC/kipas, ketikan keyboard, atau kicauan burung di luar.',
      icon: Ear,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-950/60'
    },
    {
      step: 2,
      title: '2 Aroma yang Anda Hirup',
      desc: 'Hirup aroma udara saat ini, wangi kopi/teh, aroma sabun pada tangan, atau kesegaran angin.',
      icon: Flower2,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/60'
    },
    {
      step: 1,
      title: '1 Rasa yang Anda Cecap',
      desc: 'Rasakan sisa rasa air minum di lidah, atau sadari sensasi hembusan udara di bibir.',
      icon: Coffee,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/60'
    }
  ];

  const getPhaseText = () => {
    switch (breathPhase) {
      case 'Inhale': return 'Tarik Napas Perlahan (4 detik)';
      case 'Hold1': return 'Tahan Napas Nyaman (4 detik)';
      case 'Exhale': return 'Hembuskan Perlahan (4 detik)';
      case 'Hold2': return 'Jeda Sejenak Tenang (4 detik)';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      className="my-3 rounded-2xl sm:rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/50 dark:from-slate-900/90 dark:via-[#09121E] dark:to-emerald-950/30 p-4 sm:p-5 shadow-lg backdrop-blur-md overflow-hidden relative"
    >
      {/* Background Calm Orb */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-400/10 dark:bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header Intervensi */}
      <div className="flex items-start justify-between gap-3 mb-3.5 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300/50 dark:border-emerald-700/50 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shadow-2xs shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>Jeda Pemulihan Diri (Micro-Intervention)</span>
              <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                {distressType === 'panic' ? 'Atasi Panik' : distressType === 'exhaustion' ? 'Pulihkan Energi' : 'Redakan Beban'}
              </span>
            </h4>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400">
              Pikiran Anda berhak mendapatkan jeda tenang sejenak sebelum melanjutkan.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Tutup Kartu"
          aria-label="Tutup Kartu Intervensi"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-800/70 rounded-xl mb-4 relative z-10">
        <button
          type="button"
          onClick={() => setActiveTab('breathing')}
          className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'breathing'
              ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Wind className="w-3.5 h-3.5" />
          <span>Napas 1 Menit</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('grounding')}
          className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'grounding'
              ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Grounding 5-4-3-2-1</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('counselor')}
          className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'counselor'
              ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <HeartHandshake className="w-3.5 h-3.5" />
          <span>Konselor Kampus</span>
        </button>
      </div>

      {/* Tab Content 1: Box Breathing Micro-Timer */}
      {activeTab === 'breathing' && (
        <div className="bg-white/80 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Visual Animated Breathing Circle */}
            <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
              <motion.div
                animate={
                  isBreathingRunning
                    ? {
                        scale: breathPhase === 'Inhale' ? 1.25 : breathPhase === 'Exhale' ? 0.85 : 1.1,
                        opacity: breathPhase === 'Hold1' || breathPhase === 'Hold2' ? 0.9 : 0.6
                      }
                    : { scale: 1, opacity: 0.4 }
                }
                transition={{ duration: 3.8, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-full bg-emerald-500/20 dark:bg-emerald-400/25 border-2 border-emerald-500/40"
              />
              <div className="relative z-10 flex flex-col items-center">
                <span className="text-lg font-mono font-bold text-emerald-700 dark:text-emerald-300">
                  {phaseSeconds}s
                </span>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-0.5">
                {isBreathingRunning ? getPhaseText() : 'Latihan Napas Kotak (Box Breathing 4-4-4-4)'}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                {isBreathingRunning
                  ? `Siklus terselesaikan: ${completedCycles} putaran`
                  : 'Menurunkan detak jantung dan meredakan ketegangan sistem saraf otonom.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                setIsBreathingRunning(!isBreathingRunning);
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-all cursor-pointer shadow-xs active:scale-95"
            >
              {isBreathingRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Jeda</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Mulai 1 Menit</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                if (onOpenBreathingModal) {
                  onOpenBreathingModal();
                } else {
                  navigate('/mindfulness');
                }
              }}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors cursor-pointer"
            >
              Sesi Lengkap
            </button>
          </div>
        </div>
      )}

      {/* Tab Content 2: Grounding 5-4-3-2-1 */}
      {activeTab === 'grounding' && (
        <div className="bg-white/80 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Langkah {groundingStep + 1} dari 5: {groundingSteps[groundingStep].title}
            </span>
            <div className="flex gap-1">
              {groundingSteps.map((_, idx) => (
                <div
                  key={idx}
                  onClick={() => setGroundingStep(idx)}
                  className={`w-5 h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === groundingStep
                      ? 'bg-teal-600 dark:bg-teal-400 w-7'
                      : idx < groundingStep
                      ? 'bg-teal-300 dark:bg-teal-700'
                      : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-100/60 dark:border-teal-900/40">
            {React.createElement(groundingSteps[groundingStep].icon, {
              className: `w-5 h-5 ${groundingSteps[groundingStep].color} shrink-0 mt-0.5`
            })}
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                {groundingSteps[groundingStep].desc}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              disabled={groundingStep === 0}
              onClick={() => setGroundingStep(Math.max(0, groundingStep - 1))}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-30 cursor-pointer font-medium"
            >
              ← Langkah Sebelumnya
            </button>

            {groundingStep < groundingSteps.length - 1 ? (
              <button
                type="button"
                onClick={() => setGroundingStep(groundingStep + 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold cursor-pointer transition-colors"
              >
                <span>Sudah Saya Sadari</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setGroundingStep(0);
                  setIsDismissed(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Selesai & Merasa Lebih Tenang</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tab Content 3: Hubungi Konselor Kampus */}
      {activeTab === 'counselor' && (
        <div className="bg-white/80 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>Konsultasi Bebas Biaya Mahasiswa</span>
              <span className="text-[10px] bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium">
                Rahasia & Aman
              </span>
            </h5>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              Anda tidak perlu menanggung beban akademik ini sendirian. Buat janji temu dengan psikolog/konselor kampus berlisensi.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => {
                if (onOpenCounselorBooking) {
                  onOpenCounselorBooking();
                } else {
                  navigate('/counselors');
                }
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Jadwalkan Konseling</span>
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};
