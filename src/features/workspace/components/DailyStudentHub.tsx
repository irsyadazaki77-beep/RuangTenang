import React, { useState, useEffect, useCallback } from 'react';
import {
  Brain,
  CheckCircle2,
  Circle,
  Clock,
  Headphones,
  Loader2,
  Play,
  Sparkles,
  ArrowUpRight,
  RotateCcw,
} from 'lucide-react';
import { apiClient } from '../../../lib/apiClient';
import { soundscapeEngine, type SoundscapeState } from '../../../lib/soundscapeEngine';
import { safeLocalStorage } from '../../../lib/storage';

export type EnergyLevel = 'low' | 'moderate' | 'high';

export interface AdaptiveMicroTask {
  id: string;
  title: string;
  durationMinutes: number;
  cognitiveLoad: 'ringan' | 'sedang' | 'fokus_mendalam';
  actionableStep: string;
}

export interface AdaptiveBreakdownPlan {
  title: string;
  empathyNote: string;
  recommendedPomodoroMinutes: number;
  recoveryTip: string;
  tasks: AdaptiveMicroTask[];
}

interface DailyStudentHubProps {
  isGuest?: boolean;
  onStartWorkspaceWithPlan: (prompt: string) => void;
}

const ENERGY_OPTIONS: Array<{
  id: EnergyLevel;
  label: string;
  sublabel: string;
}> = [
  {
    id: 'low',
    label: 'Lelah / Perlu Pelan',
    sublabel: 'Langkah mikro 10-15m bebas beban',
  },
  {
    id: 'moderate',
    label: 'Stabil / Seimbang',
    sublabel: 'Ritme bertahap 25m terstruktur',
  },
  {
    id: 'high',
    label: 'Optimal / Siap Sprint',
    sublabel: 'Analisis mendalam 50m fokus',
  },
];

const QUICK_THESIS_GOALS = [
  'Menyusun Bab 2 Kajian Pustaka & Sintesis Jurnal',
  'Merapikan Bab 3 Metodologi & Definisi Operasional',
  'Menganalisis Temuan Bab 4 & Pembahasan',
];

const COGNITIVE_LOAD_LABELS: Record<AdaptiveMicroTask['cognitiveLoad'], string> = {
  ringan: 'Beban Ringan',
  sedang: 'Beban Sedang',
  fokus_mendalam: 'Fokus Mendalam',
};

export const DailyStudentHub: React.FC<DailyStudentHubProps> = ({
  isGuest = false,
  onStartWorkspaceWithPlan,
}) => {
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>('moderate');
  const [latestMoodLabel, setLatestMoodLabel] = useState<string | null>(null);
  const [goalInput, setGoalInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [plan, setPlan] = useState<AdaptiveBreakdownPlan | null>(() => {
    try {
      const saved = safeLocalStorage.getItem('ruangkerja:daily-adaptive-plan');
      return saved ? (JSON.parse(saved) as AdaptiveBreakdownPlan) : null;
    } catch {
      return null;
    }
  });
  const [completedTaskIds, setCompletedTaskIds] = useState<Record<string, boolean>>(() => {
    try {
      const saved = safeLocalStorage.getItem('ruangkerja:daily-adaptive-checked');
      return saved ? (JSON.parse(saved) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });
  const [soundscapeState, setSoundscapeState] = useState<SoundscapeState>(soundscapeEngine.state);

  useEffect(() => {
    return soundscapeEngine.subscribe(setSoundscapeState);
  }, []);

  useEffect(() => {
    if (isGuest) return;
    let active = true;
    const controller = new AbortController();
    void apiClient
      .fetchJson<{ success: boolean; data?: Array<{ mood?: number; note?: string; date?: string }> }>(
        '/api/v1/mood',
        { method: 'GET', signal: controller.signal }
      )
      .then(res => {
        if (!active || !Array.isArray(res.data) || res.data.length === 0) return;
        const latest = res.data[0];
        const score = Number(latest?.mood);
        if (Number.isFinite(score)) {
          if (score <= 2) {
            setEnergyLevel('low');
            setLatestMoodLabel('Mood terakhir menunjukkan kelelahan · Ritme disetel ramah energi');
          } else if (score >= 4) {
            setEnergyLevel('high');
            setLatestMoodLabel('Mood terakhir positif & bugar · Siap untuk fokus mendalam');
          } else {
            setEnergyLevel('moderate');
            setLatestMoodLabel('Mood terakhir cukup stabil · Ritme kerja seimbang');
          }
        }
      })
      .catch(() => {
        // Non-blocking mood sync
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [isGuest]);

  const handleGenerateBreakdown = useCallback(
    async (customGoal?: string) => {
      const targetGoal = (customGoal ?? goalInput).trim();
      if (targetGoal.length < 3) {
        setErrorMsg('Tuliskan minimal 3 karakter target skripsi atau tugas kuliah Anda.');
        return;
      }

      setIsGenerating(true);
      setErrorMsg(null);
      try {
        const res = await apiClient.fetchJson<{
          success: boolean;
          data: AdaptiveBreakdownPlan;
        }>('/api/v1/ai/adaptive-breakdown', {
          method: 'POST',
          body: JSON.stringify({
            goal: targetGoal,
            energyLevel,
            moodLabel: latestMoodLabel || undefined,
            availableMinutes: energyLevel === 'high' ? 75 : energyLevel === 'low' ? 25 : 45,
          }),
        });

        if (res.success && res.data) {
          setPlan(res.data);
          setCompletedTaskIds({});
          safeLocalStorage.setItem('ruangkerja:daily-adaptive-plan', JSON.stringify(res.data));
          safeLocalStorage.setItem('ruangkerja:daily-adaptive-checked', JSON.stringify({}));
        }
      } catch {
        setErrorMsg('Belum berhasil menyusun rincian tugas. Silakan coba lagi.');
      } finally {
        setIsGenerating(false);
      }
    },
    [energyLevel, goalInput, latestMoodLabel]
  );

  const toggleTaskDone = (taskId: string) => {
    setCompletedTaskIds(prev => {
      const next = { ...prev, [taskId]: !prev[taskId] };
      safeLocalStorage.setItem('ruangkerja:daily-adaptive-checked', JSON.stringify(next));
      return next;
    });
  };

  const handleStartFocusSession = () => {
    const preset = plan?.recommendedPomodoroMinutes === 50 || energyLevel === 'high' ? '50_10' : '25_5';
    soundscapeEngine.applyPreset('RUANG_KERJA');
    soundscapeEngine.startPomodoroTimer(preset);
  };

  const handleOpenInWorkspace = () => {
    if (!plan) return;
    const stepsText = plan.tasks
      .map((t, idx) => `${idx + 1}. ${t.title} (${t.durationMinutes} menit): ${t.actionableStep}`)
      .join('\n');
    const fullPrompt = `Saya ingin mengerjakan "${plan.title}" dengan ritme ramah energi (${energyLevel}).\n\nBerikut rincian langkah mikro yang ingin kita kerjakan secara bertahap di Artifact Canvas:\n${stepsText}\n\nMari mulai dari langkah pertama dan buatkan draf awalnya di Canvas.`;
    onStartWorkspaceWithPlan(fullPrompt);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const completedCount = plan ? plan.tasks.filter(t => completedTaskIds[t.id]).length : 0;

  return (
    <section
      aria-label="Daily Student Hub & Sinergi Anti-Burnout"
      className="mt-5 rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      {/* Header Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3.5 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-teal-700 dark:text-teal-400 font-medium">
            <Brain className="h-3.5 w-3.5 shrink-0" />
            <span>Sinergi RuangTenang · Pemecah Tugas Skripsi Adaptif Mood</span>
          </div>
          <h2 className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
            Sesuaikan Beban Skripsi dengan Kapasitas Energimu Hari Ini
          </h2>
          {latestMoodLabel && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{latestMoodLabel}</p>
          )}
        </div>

        {/* Live Pomodoro & Soundscape Quick Status */}
        <div className="flex items-center gap-2 shrink-0">
          {soundscapeState.timerMode === 'pomodoro' ? (
            <div className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50/70 px-3 py-1.5 text-xs dark:border-teal-900/60 dark:bg-teal-950/40">
              <Clock className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" />
              <span className="font-semibold text-teal-900 dark:text-teal-200 whitespace-nowrap">
                {soundscapeState.pomodoroPhase === 'work' ? 'Fokus' : 'Rehat'}
              </span>
              <span className="font-mono tabular-nums font-bold text-teal-700 dark:text-teal-300">
                {formatTimer(soundscapeState.timerRemainingSeconds)}
              </span>
              <button
                type="button"
                onClick={() => soundscapeEngine.stopTimer()}
                className="ml-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
              >
                Selesai
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleStartFocusSession}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 transition hover:border-teal-300 hover:bg-teal-50/60 hover:text-teal-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-teal-800 cursor-pointer whitespace-nowrap"
            >
              <Headphones className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
              <span>Mulai Fokus + 40Hz Audio</span>
              {soundscapeState.completedPomodoros > 0 && (
                <span className="ml-1 font-mono tabular-nums text-[11px] text-teal-700 dark:text-teal-400">
                  · {soundscapeState.completedPomodoros} sesi
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Energy Level Selector */}
      <div className="mt-3.5">
        <div className="mb-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
          1. Pilih kondisi energi & pikiranmu saat ini:
        </div>
        <div
          role="group"
          aria-label="Pilih level energi harian"
          className="grid grid-cols-1 gap-2 sm:grid-cols-3"
        >
          {ENERGY_OPTIONS.map(opt => {
            const active = energyLevel === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setEnergyLevel(opt.id)}
                aria-pressed={active}
                className={`rounded-xl border px-3 py-2.5 text-left transition cursor-pointer ${
                  active
                    ? 'border-teal-600 bg-teal-50/70 text-slate-900 dark:border-teal-500 dark:bg-teal-950/40 dark:text-white'
                    : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100/70 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <div className="text-xs font-semibold">{opt.label}</div>
                <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{opt.sublabel}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Goal Input & Submit */}
      <div className="mt-3.5">
        <label htmlFor="adaptive-thesis-goal" className="block mb-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
          2. Apa bagian skripsi atau tugas kuliah yang ingin kamu cicil?
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="adaptive-thesis-goal"
            type="text"
            value={goalInput}
            onChange={e => setGoalInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleGenerateBreakdown();
              }
            }}
            placeholder="Contoh: Menyusun latar belakang masalah Bab 1 atau sintesis 3 jurnal..."
            className="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          <button
            type="button"
            disabled={isGenerating}
            onClick={() => void handleGenerateBreakdown()}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 text-xs sm:text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60 cursor-pointer whitespace-nowrap"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Menyusun Langkah…</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Pecah Jadi Langkah Mikro</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Topic Starters */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <span>Contoh cepat:</span>
          {QUICK_THESIS_GOALS.map(sample => (
            <button
              key={sample}
              type="button"
              onClick={() => {
                setGoalInput(sample);
                void handleGenerateBreakdown(sample);
              }}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 hover:border-teal-400 hover:text-teal-700 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-300 cursor-pointer"
            >
              {sample}
            </button>
          ))}
        </div>

        {errorMsg && (
          <p role="alert" className="mt-2 text-xs text-rose-600 dark:text-rose-400">
            {errorMsg}
          </p>
        )}
      </div>

      {/* Generated Adaptive Plan Output */}
      {plan && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {plan.title}
              </h3>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {plan.empathyNote}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              <span>
                Progres: {completedCount}/{plan.tasks.length} selesai
              </span>
              <button
                type="button"
                onClick={() => {
                  setPlan(null);
                  safeLocalStorage.removeItem('ruangkerja:daily-adaptive-plan');
                }}
                title="Reset rencana harian"
                className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/80 bg-slate-50/40 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950/40">
            {plan.tasks.map((task, index) => {
              const isDone = Boolean(completedTaskIds[task.id]);
              return (
                <div
                  key={task.id}
                  onClick={() => toggleTaskDone(task.id)}
                  role="checkbox"
                  aria-checked={isDone}
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleTaskDone(task.id);
                    }
                  }}
                  className="flex items-start gap-3 p-3 transition hover:bg-white dark:hover:bg-slate-900/70 cursor-pointer"
                >
                  <span className="mt-0.5 text-teal-600 dark:text-teal-400 shrink-0">
                    {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4 text-slate-400" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`text-xs sm:text-sm font-medium ${
                          isDone
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-800 dark:text-slate-100'
                        }`}
                      >
                        0{index + 1}. {task.title}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums whitespace-nowrap">
                        {task.durationMinutes} mnt · {COGNITIVE_LOAD_LABELS[task.cognitiveLoad]}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {task.actionableStep}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-1">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Tips regulasi diri: {plan.recoveryTip}
            </p>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleStartFocusSession}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50/70 px-3 text-xs font-semibold text-teal-800 hover:bg-teal-100 dark:border-teal-900/60 dark:bg-teal-950/50 dark:text-teal-200 cursor-pointer whitespace-nowrap"
              >
                <Play className="h-3.5 w-3.5" />
                <span>Mulai Pomodoro ({plan.recommendedPomodoroMinutes}m)</span>
              </button>
              <button
                type="button"
                onClick={handleOpenInWorkspace}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 text-xs font-semibold text-white hover:bg-indigo-700 cursor-pointer whitespace-nowrap"
              >
                <span>Kerjakan di Artifact Canvas</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
