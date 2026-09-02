import React, { useState } from 'react';
import { NotebookPen, HeartPulse, Sparkles, Wind, Check, MessageSquare, ArrowRight, Save } from 'lucide-react';
import { apiClient } from '../../../lib/apiClient';
import { motion, AnimatePresence } from 'motion/react';

interface EmptyChatStateProps {
  userName?: string;
  onSelectPrompt: (prompt: string) => void;
}

const QUICK_ACTIONS = [
  {
    title: 'Menceritakan hari saya',
    desc: 'Bagi pengalaman atau hal yang membebani pikiran',
    icon: NotebookPen,
    iconColor: 'text-teal-600 dark:text-teal-400',
    iconBg: 'bg-teal-50 dark:bg-teal-950/60 border border-teal-200/60 dark:border-teal-900/60',
    query: 'Saya ingin menceritakan apa yang saya alami dan rasakan hari ini...'
  },
  {
    title: 'Saya merasa cemas',
    desc: 'Kurangi ketegangan dan temukan ketenangan',
    icon: HeartPulse,
    iconColor: 'text-rose-600 dark:text-rose-400',
    iconBg: 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-900/60',
    query: 'Saya sedang merasa cemas dan tegang, tolong bantu saya merasa lebih tenang...'
  },
  {
    title: 'Refleksi pikiran',
    desc: 'Urai benang kusut dalam pikiran',
    icon: Sparkles,
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    iconBg: 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-900/60',
    query: 'Bantu saya merefleksikan dan menyusun ulang sudut pandang pikiran saya...'
  },
  {
    title: 'Latihan pernapasan',
    desc: 'Teknik relaksasi napas terpandu',
    icon: Wind,
    iconColor: 'text-sky-600 dark:text-sky-400',
    iconBg: 'bg-sky-50 dark:bg-sky-950/60 border border-sky-200/60 dark:border-sky-900/60',
    query: 'Tolong pandu saya latihan pernapasan santai untuk meredakan ketegangan...'
  }
];

const MOOD_CHOICES = [
  { value: 1, label: 'Sangat Buruk', emoji: '😢', bg: 'hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500', prompt: 'Saya sedang merasa sangat buruk hari ini 😢, bolehkah kita berdiskusi?' },
  { value: 2, label: 'Buruk', emoji: '🙁', bg: 'hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-500', prompt: 'Saya sedang merasa kurang baik hari ini 🙁, butuh teman mengobrol.' },
  { value: 3, label: 'Biasa', emoji: '😐', bg: 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500', prompt: 'Perasaan saya biasa saja hari ini 😐, bantu saya merefleksikan hari ini.' },
  { value: 4, label: 'Baik', emoji: '🙂', bg: 'hover:bg-teal-50 dark:hover:bg-teal-950/30 text-teal-500', prompt: 'Perasaan saya cukup baik hari ini 🙂, ingin bercerita sedikit.' },
  { value: 5, label: 'Sangat Baik', emoji: '😊', bg: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-500', prompt: 'Hari ini menyenangkan! Saya merasa sangat baik 😊, mari berdiskusi.' },
];

export function EmptyChatState({ userName, onSelectPrompt }: EmptyChatStateProps) {
  const [selectedMood, setSelectedMood] = useState<typeof MOOD_CHOICES[0] | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const handleSaveToProgress = async () => {
    if (!selectedMood) return;
    setSaveStatus('saving');
    try {
      const res = await apiClient.post('/api/v1/mood', {
        mood: selectedMood.value,
        notes: `Log mood harian via pintasan check-in cepat. Mood: ${selectedMood.label}.`,
        sleepHours: 7,
        sleepQuality: 'good',
        factors: [],
        emotions: [selectedMood.label]
      });

      if (res.success) {
        setSaveStatus('saved');
        setTimeout(() => {
          setSaveStatus('idle');
          setSelectedMood(null);
        }, 2000);
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      setSaveStatus('error');
    }
  };

  const handleDiscussInChat = () => {
    if (!selectedMood) return;
    onSelectPrompt(selectedMood.prompt);
    setSelectedMood(null);
  };

  return (
    <div className="w-full max-w-[660px] mx-auto flex flex-col items-center text-center px-4 pt-4 sm:pt-8 pb-4 my-auto space-y-6">
      {/* Compact Logo */}
      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl surface-card flex items-center justify-center p-2 shrink-0 border border-default shadow-3xs">
        <img src="/favicon.svg" alt="RuangTenang" className="w-full h-full object-contain" />
      </div>
      
      {/* Greeting */}
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
          Halo, {userName || "Tamu"}.
        </h2>
        <p className="text-xs sm:text-sm text-secondary max-w-sm sm:max-w-md leading-relaxed mx-auto">
          Percakapan dikelola sesuai pengaturan privasi Anda. Ceritakan apa yang sedang dirasakan atau pilih panduan di bawah.
        </p>
      </div>

      {/* Daily Check-in Widget */}
      <div className="w-full bg-slate-50/70 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 sm:p-5 text-left space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Cek Mood Hari Ini
          </span>
          <span className="text-[10px] text-slate-400">Pilih perasaan Anda</span>
        </div>

        <div className="flex justify-between items-center gap-1 sm:gap-2">
          {MOOD_CHOICES.map(choice => (
            <button
              key={choice.value}
              onClick={() => {
                setSelectedMood(choice);
                setSaveStatus('idle');
              }}
              aria-label={`Mood: ${choice.label}`}
              className={`flex-1 flex flex-col items-center p-2.5 rounded-xl border transition-all cursor-pointer ${
                selectedMood?.value === choice.value
                  ? 'bg-white dark:bg-slate-800 border-teal-500 shadow-sm scale-105'
                  : 'bg-transparent border-transparent ' + choice.bg
              }`}
            >
              <span className="text-2xl sm:text-3xl filter drop-shadow-3xs">{choice.emoji}</span>
              <span className="text-[10px] text-slate-400 mt-1 hidden sm:inline truncate w-full text-center">
                {choice.label}
              </span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {selectedMood && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-hidden"
            >
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Anda memilih <span className="font-bold text-teal-600">{selectedMood.label} {selectedMood.emoji}</span>. Apa langkah berikutnya?
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveToProgress}
                  disabled={saveStatus === 'saving' || saveStatus === 'saved'}
                  className="px-3 py-1.5 rounded-xl border border-default text-[11px] font-semibold text-slate-600 hover:text-slate-800 bg-white dark:bg-slate-800 flex items-center gap-1.5 transition-all cursor-pointer min-h-[32px] disabled:opacity-50"
                >
                  {saveStatus === 'saving' ? (
                    'Menyimpan...'
                  ) : saveStatus === 'saved' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" /> Simpan Berhasil!
                    </>
                  ) : saveStatus === 'error' ? (
                    'Gagal menyimpan'
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 text-slate-400" /> Simpan ke Progress
                    </>
                  )}
                </button>
                <button
                  onClick={handleDiscussInChat}
                  className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer min-h-[32px]"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Diskusikan di Chat
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Quick Action Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
        {QUICK_ACTIONS.map(action => {
          const Icon = action.icon;
          return (
            <button
              key={action.title}
              onClick={() => onSelectPrompt(action.query)}
              aria-label={`${action.title}: ${action.desc}`}
              className="group relative flex items-center gap-3 p-3 sm:py-3.5 sm:px-4 rounded-xl sm:rounded-2xl surface-card hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-teal-500/40 dark:hover:border-teal-500/40 hover:shadow-xs active:scale-[0.99] transition-all cursor-pointer min-h-[56px] sm:min-h-[64px]"
            >
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${action.iconBg}`}>
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${action.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-primary group-hover:text-teal-700 dark:group-hover:text-teal-400 truncate transition-colors">
                  {action.title}
                </div>
                <div className="text-xs text-secondary line-clamp-2 mt-0.5 leading-snug">
                  {action.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
