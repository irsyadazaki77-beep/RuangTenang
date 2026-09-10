import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ShieldCheck, HeartHandshake, ChevronRight, Check } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { clientDb } from '../../lib/clientDb';
import { safeLocalStorage } from '../../lib/storage';

interface OnboardingFlowProps {
  userId: string;
  onComplete: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ userId, onComplete }) => {
  const [step, setStep] = useState(1);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  const goals = [
    { id: 'academic', label: 'Mengatasi Tekanan Akademik & Skripsi', icon: '📚' },
    { id: 'anxiety', label: 'Mengurangi Kecemasan & Stress', icon: '😰' },
    { id: 'relations', label: 'Menjaga Relasi & Sosial Kampus', icon: '👥' },
    { id: 'mindfulness', label: 'Belajar Latihan Pernapasan & Fokus', icon: '🧘' },
  ];

  const handleToggleGoal = (id: string) => {
    if (selectedGoals.includes(id)) {
      setSelectedGoals(prev => prev.filter(g => g !== id));
    } else {
      setSelectedGoals(prev => [...prev, id]);
    }
  };

  const persistOnboarding = async () => {
    safeLocalStorage.setItem(`rt_onboarding_completed_${userId}`, 'true');
    if (selectedGoals.length > 0) {
      safeLocalStorage.setItem(`rt_user_goals_${userId}`, JSON.stringify(selectedGoals));
    }

    try {
      await clientDb.saveEncrypted(`onboarding_${userId}`, JSON.stringify({ completed: true, goals: selectedGoals }));
    } catch {
      // ignore
    }

    if (userId && userId !== 'guest') {
      try {
        await apiClient.post('/api/v1/user/onboarding', { completed: true, goals: selectedGoals });
      } catch (err) {
        console.warn('Failed to sync onboarding to server:', err);
      }
    }
  };

  const handleNext = async () => {
    if (step < 3) {
      setStep(prev => prev + 1);
    } else {
      await persistOnboarding();
      onComplete();
    }
  };

  const handleSkip = async () => {
    await persistOnboarding();
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="surface-card rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-md border-default flex flex-col justify-between max-h-[90dvh] overflow-y-auto text-primary relative">
        
        {/* Skip button top right */}
        <button
          onClick={handleSkip}
          className="absolute top-3.5 right-4 text-xs font-semibold text-secondary hover:text-primary transition-colors py-1.5 px-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer min-h-[44px] flex items-center"
        >
          Lewati
        </button>

        {/* Step Indicator */}
        <div className="flex justify-between items-center mb-3.5">
          <div className="flex gap-1.5 items-center">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  s === step ? 'w-6 bg-teal-600' : 'w-2 bg-slate-200 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>
          <span className="text-[11px] font-medium text-secondary">
            Langkah {step} dari 3
          </span>
        </div>

        {/* Body content with animations */}
        <div className="flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="space-y-3.5"
              >
                <div className="w-10 h-10 bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/50 rounded-xl flex items-center justify-center text-teal-600 dark:text-teal-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-primary tracking-tight">
                  Selamat Datang di RuangTenang
                </h3>
                <p className="text-xs sm:text-sm text-secondary leading-relaxed">
                  RuangTenang adalah platform kesehatan mental digital untuk mahasiswa kampus. Kami siap mendampingi Anda menavigasi stress akademik, kecemasan, dan tantangan sehari-hari dalam ruang yang tenang, privat, dan suportif.
                </p>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="space-y-3.5"
              >
                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-primary tracking-tight">
                    Apa fokus utama Anda hari ini?
                  </h3>
                  <p className="text-xs text-secondary mt-0.5">
                    Pilih topik utama agar saran percakapan dan check-in dapat disesuaikan.
                  </p>
                </div>
                <div className="space-y-2 pt-1">
                  {goals.map(goal => {
                    const isSelected = selectedGoals.includes(goal.id);
                    return (
                      <button
                        key={goal.id}
                        type="button"
                        onClick={() => handleToggleGoal(goal.id)}
                        className={`w-full flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl border text-left text-xs sm:text-sm transition-all cursor-pointer min-h-[44px] ${
                          isSelected
                            ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 text-teal-900 dark:text-teal-200 font-medium'
                            : 'border-default hover:bg-slate-50 dark:hover:bg-slate-800/60 text-secondary'
                        }`}
                      >
                        <span className="text-base shrink-0">{goal.icon}</span>
                        <span className="flex-1 truncate">{goal.label}</span>
                        {isSelected && (
                          <div className="w-4.5 h-4.5 rounded-full bg-teal-600 flex items-center justify-center text-white shrink-0">
                            <Check className="w-3 h-3" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="space-y-3.5"
              >
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-primary tracking-tight">
                  Privasi & Keamanan Data Anda
                </h3>
                <div className="space-y-2.5 text-xs sm:text-sm text-secondary leading-relaxed">
                  <p>
                    Data kesehatan mental Anda dilindungi dengan tata kelola privasi transparan:
                  </p>
                  <ul className="space-y-2 surface-muted p-3.5 rounded-xl border border-default">
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                      <span><strong>Proteksi Data:</strong> Catatan mood, jurnal, dan percakapan diproses dan disimpan secara terproteksi.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                      <span><strong>Persetujuan Eksplisit:</strong> Riwayat Anda tidak dibagikan ke konselor tanpa persetujuan eksplisit Anda.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                      <span><strong>Hak Akses & Penghapusan:</strong> Anda dapat mengekspor atau mengajukan penghapusan riwayat akun melalui Pusat Privasi sesuai kebijakan retensi.</span>
                    </li>
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer actions */}
        <div className="flex justify-between items-center mt-5 pt-3.5 border-t border-default shrink-0">
          {step > 1 ? (
            <button
              onClick={() => setStep(prev => prev - 1)}
              className="text-xs sm:text-sm font-semibold text-secondary hover:text-primary transition-colors py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer min-h-[44px] flex items-center"
            >
              Kembali
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={handleNext}
            className="px-4.5 py-2.5 bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-3xs transition-all flex items-center gap-1.5 cursor-pointer min-h-[44px]"
          >
            <span>{step === 3 ? 'Mulai Sekarang' : 'Lanjut'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
