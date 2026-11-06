import React, { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Wind,
  ListChecks,
  Compass,
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { apiClient } from '../../../lib/apiClient';
import { useToast } from '../../../components/Toast';

interface AdaptiveSubTask {
  id: string;
  title: string;
  durationMinutes: number;
  cognitiveLoad: 'ringan' | 'sedang' | 'fokus_mendalam';
  actionableStep: string;
}

interface AdaptiveBreakdownData {
  title: string;
  empathyNote: string;
  recommendedPomodoroMinutes: number;
  recoveryTip: string;
  tasks: AdaptiveSubTask[];
}

export interface BurnoutRadarBarProps {
  activeTopicOrTitle?: string | null;
  activeTopicTitle?: string | null;
  isDistressed?: boolean;
  distressDetected?: boolean;
  userTurnCount?: number;
  currentInputText?: string;
  onTriggerBreathing?: () => void;
  onOpenBreathing?: () => void;
  onRunDeepResearch?: (topic: string) => void;
  isRunningDeepResearch?: boolean;
  onSendPrompt?: (prompt: string) => void;
  onSelectTaskPrompt?: (prompt: string) => void;
  accent?: 'indigo' | 'teal';
}

export const BurnoutRadarBar: React.FC<BurnoutRadarBarProps> = ({
  activeTopicOrTitle,
  activeTopicTitle,
  isDistressed = false,
  distressDetected = false,
  userTurnCount = 0,
  currentInputText = '',
  onTriggerBreathing,
  onOpenBreathing,
  onRunDeepResearch,
  isRunningDeepResearch: externalRunningDeepResearch = false,
  onSendPrompt,
  onSelectTaskPrompt,
  accent = 'indigo'
}) => {
  const resolvedTopicTitle = activeTopicOrTitle ?? activeTopicTitle ?? null;
  const resolvedDistressed = isDistressed || distressDetected;
  const resolvedBreathingHandler = onTriggerBreathing || onOpenBreathing;
  const resolvedPromptHandler = onSendPrompt || onSelectTaskPrompt;

  const { showToast } = useToast();
  const [sprintMode, setSprintMode] = useState<'focus25' | 'focus50' | 'break5'>('focus25');
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSprints, setCompletedSprints] = useState(0);
  const [activeWorkMinutes, setActiveWorkMinutes] = useState(0);

  // Adaptive Breakdown Drawer State
  const [showPlanner, setShowPlanner] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [energyLevel, setEnergyLevel] = useState<'low' | 'moderate' | 'high'>('moderate');
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [breakdownPlan, setBreakdownPlan] = useState<AdaptiveBreakdownData | null>(null);
  const [completedTaskIds, setCompletedTaskIds] = useState<Record<string, boolean>>({});

  // Inline Deep Research Quick Launcher
  const [localRunningDeepResearch, setLocalRunningDeepResearch] = useState(false);
  const isRunningDeepResearch = externalRunningDeepResearch || localRunningDeepResearch;

  useEffect(() => {
    if (!isRunning) return;
    const interval = window.setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          setIsRunning(false);
          if (sprintMode !== 'break5') {
            setCompletedSprints(c => c + 1);
            setSprintMode('break5');
            showToast('Sprint fokus selesai! Saatnya istirahat mata 5 menit.', 'success');
            return 5 * 60;
          } else {
            setSprintMode('focus25');
            showToast('Jeda pemulihan selesai. Siap melanjutkan penulisan dengan tenang.', 'info');
            return 25 * 60;
          }
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isRunning, sprintMode, showToast]);

  // Track cumulative active session minutes for Burnout Radar
  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveWorkMinutes(m => m + 1);
    }, 60000);
    return () => window.clearInterval(timer);
  }, []);

  const switchSprintMode = (mode: 'focus25' | 'focus50' | 'break5') => {
    setIsRunning(false);
    setSprintMode(mode);
    setSecondsLeft(mode === 'focus25' ? 25 * 60 : mode === 'focus50' ? 50 * 60 : 5 * 60);
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Compute Burnout Radar status
  const radarStatus = resolvedDistressed || activeWorkMinutes >= 55 || completedSprints >= 3 || userTurnCount >= 18
    ? {
        label: 'Beban Tinggi · Perlu Jeda',
        dotClass: 'bg-amber-500',
        textClass: 'text-amber-700 dark:text-amber-300',
        loadPct: 84
      }
    : activeWorkMinutes >= 25 || isRunning || userTurnCount >= 8 || currentInputText.length > 350
    ? {
        label: 'Fokus Terukur',
        dotClass: 'bg-teal-500',
        textClass: 'text-teal-700 dark:text-teal-300',
        loadPct: 48
      }
    : {
        label: 'Kognitif Segar',
        dotClass: 'bg-emerald-500',
        textClass: 'text-emerald-700 dark:text-emerald-300',
        loadPct: 24
      };

  const handleGenerateAdaptiveBreakdown = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetGoal = goalInput.trim() || resolvedTopicTitle || 'Penyusunan Bab Skripsi & Kajian Pustaka';
    setIsGeneratingPlan(true);
    try {
      const res = await apiClient.fetchJson<{
        success: boolean;
        data: AdaptiveBreakdownData;
      }>('/api/v1/ai/adaptive-breakdown', {
        method: 'POST',
        body: JSON.stringify({
          goal: targetGoal,
          energyLevel,
          availableMinutes: sprintMode === 'focus50' ? 50 : 35
        })
      });
      if (res?.success && res.data) {
        setBreakdownPlan(res.data);
        setCompletedTaskIds({});
      }
    } catch {
      showToast('Gagal menyusun rincian target adaptif.', 'error');
    } finally {
      setIsGeneratingPlan(false);
    }
  }, [goalInput, resolvedTopicTitle, energyLevel, sprintMode, showToast]);

  const handleQuickDeepResearch = async () => {
    if (!onRunDeepResearch) return;
    const topic = goalInput.trim() || resolvedTopicTitle || 'Transformasi Digital dan Regulasi Diri Mahasiswa dalam Penyusunan Skripsi';
    setLocalRunningDeepResearch(true);
    try {
      await onRunDeepResearch(topic);
    } finally {
      setLocalRunningDeepResearch(false);
    }
  };

  const isIndigo = accent === 'indigo';

  return (
    <div className="mb-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/90 bg-[#FAF8F5]/95 dark:bg-[#141720]/95 px-3 py-1.5 text-xs transition-all">
      {/* Main Co-Pilot Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Left: Burnout Radar Indicator */}
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${radarStatus.dotClass}`} />
          <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">
            Burnout Radar:
          </span>
          <span className={`font-mono text-[11px] tabular-nums font-medium ${radarStatus.textClass}`}>
            {radarStatus.label} ({radarStatus.loadPct}%)
          </span>
        </div>

        {/* Center/Right: Pomodoro Sprint Timer + Adaptive Co-Pilot Actions */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Timer Display & Controls */}
          <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 px-2 py-0.5">
            <button
              type="button"
              onClick={() => switchSprintMode(sprintMode === 'focus25' ? 'focus50' : sprintMode === 'focus50' ? 'break5' : 'focus25')}
              className="text-[10.5px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
              title="Ganti durasi sprint (25m Fokus / 50m Fokus / 5m Rehat)"
            >
              {sprintMode === 'break5' ? 'Rehat' : sprintMode === 'focus50' ? '50m' : '25m'}
            </button>
            <span className="font-mono text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-100 px-1">
              {formatTimer(secondsLeft)}
            </span>
            <button
              type="button"
              onClick={() => setIsRunning(r => !r)}
              className="p-0.5 text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 cursor-pointer"
              aria-label={isRunning ? 'Jeda timer fokus' : 'Mulai timer fokus'}
              title={isRunning ? 'Jeda timer' : 'Mulai Sprint Fokus'}
            >
              {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
            <button
              type="button"
              onClick={() => switchSprintMode(sprintMode)}
              className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              aria-label="Atur ulang timer"
              title="Reset timer"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* Deep Research Trigger Button */}
          {onRunDeepResearch && (
            <button
              type="button"
              disabled={isRunningDeepResearch}
              onClick={() => void handleQuickDeepResearch()}
              className={`inline-flex h-6.5 items-center gap-1 rounded-lg border px-2 text-[11px] font-medium transition-colors cursor-pointer ${
                isIndigo
                  ? 'border-indigo-200/80 bg-indigo-50/70 text-indigo-800 hover:bg-indigo-100 dark:border-indigo-900/70 dark:bg-indigo-950/50 dark:text-indigo-300'
                  : 'border-teal-200/80 bg-teal-50/70 text-teal-800 hover:bg-teal-100 dark:border-teal-900/70 dark:bg-teal-950/50 dark:text-teal-300'
              }`}
              title="Jalankan Agen Deep Research untuk menyusun laporan sintesis literatur + matriks + diagram ke Canvas"
            >
              {isRunningDeepResearch ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Compass className="w-3 h-3" />
              )}
              <span>Deep Research</span>
            </button>
          )}

          {/* Adaptive Rhythm Co-Pilot Toggle */}
          <button
            type="button"
            onClick={() => {
              setShowPlanner(v => !v);
              if (!breakdownPlan && !isGeneratingPlan) {
                void handleGenerateAdaptiveBreakdown();
              }
            }}
            className="inline-flex h-6.5 items-center gap-1 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Pecah target skripsi sesuai tingkat energi saat ini"
          >
            <ListChecks className="w-3 h-3 text-teal-600 dark:text-teal-400" />
            <span className="hidden sm:inline">Ritme Belajar</span>
            {showPlanner ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {/* 1-Click Micro Recovery Break */}
          {resolvedBreathingHandler && (
            <button
              type="button"
              onClick={resolvedBreathingHandler}
              className="inline-flex h-6.5 items-center gap-1 rounded-lg border border-emerald-200/80 dark:border-emerald-900/70 bg-emerald-50/70 dark:bg-emerald-950/50 px-2 text-[11px] font-medium text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 transition-colors cursor-pointer"
              title="Ambil jeda napas mikro 2 menit tanpa meninggalkan draf"
            >
              <Wind className="w-3 h-3" />
              <span className="hidden md:inline">Rehat 2m</span>
            </button>
          )}
        </div>
      </div>

      {/* Expandable Adaptive Study Rhythm Co-Pilot Panel */}
      {showPlanner && (
        <div className="mt-2 pt-2 border-t border-slate-200/70 dark:border-slate-800 space-y-2.5 text-left">
          <form onSubmit={handleGenerateAdaptiveBreakdown} className="flex flex-wrap items-center gap-1.5">
            <input
              type="text"
              value={goalInput}
              onChange={e => setGoalInput(e.target.value)}
              placeholder={resolvedTopicTitle || 'Target skripsi saat ini (mis. Menyusun Bab 2 Tinjauan Pustaka)...'}
              className="flex-1 min-w-[180px] h-7.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5">
              {([
                ['low', 'Lelah'],
                ['moderate', 'Stabil'],
                ['high', 'Optimal']
              ] as const).map(([lvl, label]) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setEnergyLevel(lvl)}
                  className={`px-2 py-0.5 rounded-md text-[10.5px] font-medium transition-colors cursor-pointer ${
                    energyLevel === lvl
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={isGeneratingPlan}
              className="h-7.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {isGeneratingPlan && <Loader2 className="w-3 h-3 animate-spin" />}
              <span>Susun Rencana</span>
            </button>
          </form>

          {breakdownPlan && (
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-xs text-slate-800 dark:text-slate-100">
                  {breakdownPlan.title}
                </span>
                <span className="font-mono text-[10.5px] text-teal-700 dark:text-teal-300 tabular-nums">
                  Rekomendasi: {breakdownPlan.recommendedPomodoroMinutes}m fokus
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                {breakdownPlan.empathyNote}
              </p>
              <div className="space-y-1">
                {breakdownPlan.tasks.map(task => {
                  const isDone = Boolean(completedTaskIds[task.id]);
                  return (
                    <div
                      key={task.id}
                      className="flex items-start justify-between gap-2 rounded-lg border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/50 p-2"
                    >
                      <button
                        type="button"
                        onClick={() => setCompletedTaskIds(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                        className="flex items-start gap-2 text-left flex-1 min-w-0 cursor-pointer"
                      >
                        <CheckCircle2
                          className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                            isDone ? 'text-emerald-600' : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className={`text-xs font-medium ${isDone ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
                            {task.title}{' '}
                            <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                              ({task.durationMinutes}m · {task.cognitiveLoad})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {task.actionableStep}
                          </p>
                        </div>
                      </button>
                      {resolvedPromptHandler && (
                        <button
                          type="button"
                          onClick={() => resolvedPromptHandler(`Bantu saya mengerjakan langkah ini secara langsung:\n"${task.title} — ${task.actionableStep}"`)}
                          className="shrink-0 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-[10.5px] font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 cursor-pointer"
                        >
                          Kerjakan AI
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
