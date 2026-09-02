import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ShieldCheck, HeartHandshake, ArrowRight, ChevronRight, Check } from 'lucide-react';

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

  const handleNext = () => {
    if (step < 3) {
      setStep(prev => prev + 1);
    } else {
      // Complete onboarding
      localStorage.setItem(`rt_onboarding_completed_${userId}`, 'true');
      onComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem(`rt_onboarding_completed_${userId}`, 'true');
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between min-h-[460px] max-h-[90dvh] overflow-y-auto text-slate-800 dark:text-slate-100 relative">
        
        {/* Skip button top right */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-5 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer min-h-[36px]"
        >
          Lewati
        </button>

        {/* Step Indicator */}
        <div className="flex gap-1.5 justify-start items-center mb-6">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step ? 'w-8 bg-teal-600' : 'w-2 bg-slate-200 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Body content with animations */}
        <div className="flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <div className="w-12 h-12 bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/50 rounded-2xl flex items-center justify-center text-teal-600 dark:text-teal-400">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Selamat Datang di RuangTenang
                </h3>
                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed">
                  RuangTenang adalah suaka kesehatan mental digital yang dirancang khusus untuk mahasiswa. Kami membantu Anda menavigasi stress akademik, kecemasan, dan tantangan kampus dalam lingkungan yang tenang, privat, dan aman.
                </p>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <HeartHandshake className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    Apa fokus utama Anda hari ini?
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 mt-1">
                    Pilih satu atau beberapa tujuan (opsional) untuk menyesuaikan pengalaman Anda.
                  </p>
                </div>
                <div className="space-y-2 pt-2">
                  {goals.map(goal => {
                    const isSelected = selectedGoals.includes(goal.id);
                    return (
                      <button
                        key={goal.id}
                        type="button"
                        onClick={() => handleToggleGoal(goal.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left text-xs sm:text-sm transition-all cursor-pointer min-h-[44px] ${
                          isSelected
                            ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 text-teal-900 dark:text-teal-200 font-medium'
                            : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <span className="text-base sm:text-lg shrink-0">{goal.icon}</span>
                        <span className="flex-1 truncate">{goal.label}</span>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center text-white shrink-0">
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
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Privasi & Keamanan Data Anda
                </h3>
                <div className="space-y-3.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  <p>
                    Data kesehatan mental Anda dilindungi dengan standar keamanan medis yang ketat:
                  </p>
                  <ul className="space-y-2 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                      <span><strong>Enkripsi End-to-End:</strong> Catatan mood, jurnal pribadi, dan pesan chat Anda dienkripsi secara aman.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                      <span><strong>Persetujuan Eksplisit:</strong> Riwayat Anda tidak akan pernah dibagikan dengan konselor kecuali Anda mengizinkannya secara sadar.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                      <span><strong>Koreksi & Penghapusan:</strong> Anda memegang kendali penuh. Anda dapat mengekspor atau menghapus seluruh riwayat Anda kapan saja via Pusat Privasi.</span>
                    </li>
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer actions */}
        <div className="flex justify-between items-center mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
          {step > 1 ? (
            <button
              onClick={() => setStep(prev => prev - 1)}
              className="text-xs sm:text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors py-2 px-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer min-h-[44px]"
            >
              Kembali
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={handleNext}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer min-h-[44px]"
          >
            <span>{step === 3 ? 'Mulai Perjalanan' : 'Lanjut'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
