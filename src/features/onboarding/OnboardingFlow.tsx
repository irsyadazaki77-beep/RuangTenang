import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, 
  Check, 
  ShieldCheck, 
  MessageCircleHeart,
  ArrowRight
} from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { clientDb } from '../../lib/clientDb';
import { safeLocalStorage } from '../../lib/storage';

interface OnboardingFlowProps {
  userId: string;
  onComplete: (starterPrompt?: string) => void;
}

interface MoodOption {
  id: string;
  emoji: string;
  label: string;
  sublabel: string;
  promptSuggestion: string;
}

interface NeedOption {
  id: string;
  icon: string;
  label: string;
  desc: string;
}

const MOODS: MoodOption[] = [
  {
    id: 'exhausted',
    emoji: '🌧️',
    label: 'Lagi Lelah & Berat',
    sublabel: 'Butuh ruang jeda tanpa tuntutan',
    promptSuggestion: 'Halo, aku lagi ngerasa capek banget dan butuh ruang untuk tenang sejenak...'
  },
  {
    id: 'anxious',
    emoji: '⛅',
    label: 'Cemas & Overwhelmed',
    sublabel: 'Banyak pikiran yang menumpuk',
    promptSuggestion: 'Pikiranku lagi penuh banget dan agak cemas sama perkuliahan...'
  },
  {
    id: 'neutral',
    emoji: '🍃',
    label: 'Biasa Saja',
    sublabel: 'Sedang menjalani rutinitas hari ini',
    promptSuggestion: 'Halo, aku ingin mengobrol santai dan merefleksikan hariku...'
  },
  {
    id: 'peaceful',
    emoji: '☀️',
    label: 'Cukup Baik & Lega',
    sublabel: 'Ada hal baik yang disyukuri',
    promptSuggestion: 'Hari ini terasa cukup baik, aku ingin berbagi cerita positif...'
  },
  {
    id: 'motivated',
    emoji: '✨',
    label: 'Bersemangat',
    sublabel: 'Siap fokus dan melangkah',
    promptSuggestion: 'Aku lagi semangat dan ingin menyusun rencana belajar hari ini...'
  }
];

const NEEDS: NeedOption[] = [
  {
    id: 'listen',
    icon: '🛋️',
    label: 'Sekadar didengarkan',
    desc: 'Bercerita bebas tanpa dinasihati atau dihakimi'
  },
  {
    id: 'unclutter',
    icon: '🧭',
    label: 'Mengurai benang kusut pikiran',
    desc: 'Melihat masalah dari sudut pandang yang lebih jernih'
  },
  {
    id: 'calm',
    icon: '🌬️',
    label: 'Meredakan panik & cemas',
    desc: 'Latihan pernapasan dan grounding singkat'
  },
  {
    id: 'academic',
    icon: '📚',
    label: 'Menghadapi beban tugas/skripsi',
    desc: 'Langkah kecil mengatasi prokrastinasi & burnout'
  }
];

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ userId, onComplete }) => {
  const [step, setStep] = useState(1);
  const [selectedMood, setSelectedMood] = useState<string>('anxious');
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>(['listen']);

  const handleToggleNeed = (id: string) => {
    if (selectedNeeds.includes(id)) {
      if (selectedNeeds.length > 1) {
        setSelectedNeeds(prev => prev.filter(n => n !== id));
      }
    } else {
      setSelectedNeeds(prev => [...prev, id]);
    }
  };

  const getStarterPrompt = () => {
    const currentMoodObj = MOODS.find(m => m.id === selectedMood);
    return currentMoodObj?.promptSuggestion || 'Halo, aku butuh teman cerita hari ini...';
  };

  const persistOnboarding = async () => {
    safeLocalStorage.setItem(`rt_onboarding_completed_${userId}`, 'true');
    safeLocalStorage.setItem(`rt_user_mood_${userId}`, selectedMood);
    safeLocalStorage.setItem(`rt_user_goals_${userId}`, JSON.stringify(selectedNeeds));

    try {
      await clientDb.saveEncrypted(
        `onboarding_${userId}`, 
        JSON.stringify({ completed: true, mood: selectedMood, goals: selectedNeeds })
      );
    } catch {
      // ignore clientDb error
    }

    if (userId && userId !== 'guest') {
      try {
        await apiClient.post('/api/v1/user/onboarding', { 
          completed: true, 
          mood: selectedMood, 
          goals: selectedNeeds 
        });
        await apiClient.post('/api/v1/privacy/consent', {
          consentForAI: true,
          consentForAIMood: true,
          consentForAIScreening: true,
          consentForAIMemory: true,
          consentForAIJournal: true,
        }).catch(() => {});
      } catch (err) {
        console.warn('Failed to sync onboarding to server:', err);
      }
    }
  };

  const handleNext = async () => {
    if (step < 4) {
      setStep(prev => prev + 1);
    } else {
      await persistOnboarding();
      onComplete(getStarterPrompt());
    }
  };

  const handleFinishWithPrompt = async (prompt?: string) => {
    await persistOnboarding();
    onComplete(prompt || getStarterPrompt());
  };

  const handleSkip = async () => {
    await persistOnboarding();
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="surface-card rounded-2xl max-w-md w-full p-4 sm:p-5 shadow-xl border border-stone-200/80 dark:border-slate-800 flex flex-col justify-between max-h-[90dvh] overflow-y-auto text-stone-800 dark:text-stone-100 relative">
        
        {/* Header Bar: Step dots & Skip */}
        <div className="flex justify-between items-center mb-4 shrink-0">
          <div className="flex gap-1.5 items-center">
            {[1, 2, 3, 4].map(s => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step 
                    ? 'w-6 bg-teal-600 dark:bg-teal-500' 
                    : s < step
                      ? 'w-2 bg-teal-300 dark:bg-teal-800'
                      : 'w-1.5 bg-stone-200 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleSkip}
            className="text-xs font-medium text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors py-1 px-2.5 rounded-full hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer min-h-[32px] flex items-center"
          >
            Lewati
          </button>
        </div>

        {/* Content Area with Soft Fluid Transitions */}
        <div className="flex-1 flex flex-col justify-center min-h-[280px]">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: Grounding & Safe Space Welcome */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="space-y-3"
              >
                {/* Official RuangTenang Brand Presence Badge */}
                <div className="relative w-12 h-12 rounded-xl bg-white dark:bg-slate-800 border border-teal-200/80 dark:border-teal-800 shadow-2xs flex items-center justify-center p-2 shrink-0">
                  <img src="/favicon.svg" alt="RuangTenang" className="w-full h-full object-contain pointer-events-none select-none" />
                </div>

                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight leading-snug">
                    Tarik napas sejenak... <br />
                    Kamu ada di ruang yang aman.
                  </h3>
                  <p className="text-stone-600 dark:text-stone-300 text-[13.5px] mt-1.5 leading-relaxed">
                    Perkuliahan dan kehidupan kadang terasa berat. RuangTenang hadir sebagai teman bercerita dan refleksi yang siap mendengarkan tanpa menghakimi.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-100/80 dark:border-teal-900/40 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-normal">
                    <strong>100% Privat & Terlindungi:</strong> Setiap refleksi, perasaan, dan ceritamu tersimpan secara rahasia dan aman.
                  </p>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Emotional Check-in (Mood Selection) */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="space-y-3"
              >
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
                    Bagaimana perasaanmu saat ini?
                  </h3>
                  <p className="text-stone-500 dark:text-stone-400 text-xs mt-0.5">
                    Tidak ada jawaban yang salah. Apa pun yang kamu rasakan valid di sini.
                  </p>
                </div>

                <div className="space-y-1.5 pt-0.5">
                  {MOODS.map(m => {
                    const isSelected = selectedMood === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMood(m.id)}
                        className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer min-h-[44px] ${
                          isSelected
                            ? 'border-teal-500 bg-teal-50/70 dark:bg-teal-950/40 shadow-2xs'
                            : 'border-stone-200 dark:border-slate-800 hover:bg-stone-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <span className="text-xl shrink-0">{m.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className={`text-[13px] font-semibold ${isSelected ? 'text-teal-900 dark:text-teal-200' : 'text-stone-800 dark:text-stone-200'}`}>
                            {m.label}
                          </div>
                          <div className="text-[11.5px] text-stone-500 dark:text-slate-400 truncate">
                            {m.sublabel}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-teal-600 flex items-center justify-center text-white shrink-0">
                            <Check className="w-3 h-3" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* STEP 3: Needs & Intentions (Non-Clinical, Supportive) */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="space-y-3"
              >
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
                    Apa yang paling kamu butuhkan?
                  </h3>
                  <p className="text-stone-500 dark:text-stone-400 text-xs mt-0.5">
                    Pilih satu atau lebih agar pendekatan percakapan terasa paling pas untukmu.
                  </p>
                </div>

                <div className="space-y-1.5 pt-0.5">
                  {NEEDS.map(need => {
                    const isSelected = selectedNeeds.includes(need.id);
                    return (
                      <button
                        key={need.id}
                        type="button"
                        onClick={() => handleToggleNeed(need.id)}
                        className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer min-h-[44px] ${
                          isSelected
                            ? 'border-teal-500 bg-teal-50/70 dark:bg-teal-950/40 shadow-2xs'
                            : 'border-stone-200 dark:border-slate-800 hover:bg-stone-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <span className="text-lg shrink-0">{need.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className={`text-[13px] font-semibold ${isSelected ? 'text-teal-900 dark:text-teal-200' : 'text-stone-800 dark:text-stone-200'}`}>
                            {need.label}
                          </div>
                          <div className="text-[11.5px] text-stone-500 dark:text-slate-400 truncate">
                            {need.desc}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-teal-600 flex items-center justify-center text-white shrink-0">
                            <Check className="w-3 h-3" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* STEP 4: Soft Launchpad (No Empty Slate Panic) */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="space-y-3"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-100 dark:border-teal-900/60 flex items-center justify-center text-teal-600 dark:text-teal-400">
                  <MessageCircleHeart className="w-5 h-5" />
                </div>

                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
                    Ruang ceritamu sudah siap.
                  </h3>
                  <p className="text-stone-600 dark:text-stone-300 text-[13px] mt-1 leading-relaxed">
                    Tidak perlu bingung mau mulai dari mana. Kamu bisa langsung mengirim kalimat pembuka ini atau mengetik sesuai kenyamananmu:
                  </p>
                </div>

                {/* Suggested Starter Card */}
                <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-slate-800/80 border border-stone-200 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 font-medium">
                    <span>Saran Kalimat Pertama</span>
                    <span>{MOODS.find(m => m.id === selectedMood)?.emoji}</span>
                  </div>
                  <p className="text-[13.5px] text-stone-800 dark:text-stone-200 font-medium italic leading-relaxed">
                    "{getStarterPrompt()}"
                  </p>
                  <button
                    type="button"
                    onClick={() => handleFinishWithPrompt(getStarterPrompt())}
                    className="w-full mt-1.5 py-2 px-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs sm:text-[13px] font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.98] min-h-[40px]"
                  >
                    <span>Kirim Pesan Ini Sekarang</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-[11px] text-center text-stone-400 dark:text-slate-500">
                  Atau klik tombol <strong>"Buka Ruang Obrolan"</strong> di bawah untuk mulai dengan kata-katamu sendiri.
                </p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer Navigation Actions */}
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-stone-200/80 dark:border-slate-800 shrink-0">
          {step > 1 ? (
            <button
              onClick={() => setStep(prev => prev - 1)}
              className="text-xs sm:text-[13px] font-semibold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors py-1.5 px-3 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer min-h-[38px] flex items-center"
            >
              Kembali
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={handleNext}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white text-xs sm:text-[13px] font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer min-h-[38px]"
          >
            <span>{step === 4 ? 'Buka Ruang Obrolan' : 'Lanjut'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
