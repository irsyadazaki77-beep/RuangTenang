import React, { useState, useMemo } from 'react';
import { MoodLog } from '../../../types';
import { 
  TrendingUp, 
  GraduationCap
} from 'lucide-react';

interface AcademicMoodCorrelationChartProps {
  logs: MoodLog[];
}

export const AcademicMoodCorrelationChart: React.FC<AcademicMoodCorrelationChartProps> = ({ logs }) => {
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);

  // Take the last 14 to 30 logs sorted chronologically
  const chartData = useMemo(() => {
    const sorted = [...logs]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14);

    return sorted.map((log, idx) => {
      const parsedDate = new Date(log.date);
      const dayLabel = parsedDate.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
      const sleepHours = typeof log.sleepHours === 'number' && !isNaN(log.sleepHours) ? log.sleepHours : 7;
      
      // Academic factors
      const academicFactors = (log.factors || []).filter(f => 
        ['Tugas Kuliah', 'Dosen Pembimbing', 'Ujian/Kuis', 'Organisasi', 'Keuangan', 'Skripsi'].includes(f)
      );

      return {
        index: idx,
        date: log.date,
        dayLabel,
        mood: log.mood, // 1 to 5
        sleepHours, // 0 to 12
        emotions: log.emotions || [],
        academicFactors,
        notes: log.notes
      };
    });
  }, [logs]);

  // Correlation Analytics Calculations
  const analytics = useMemo(() => {
    if (chartData.length === 0) return null;

    const totalMood = chartData.reduce((acc, d) => acc + d.mood, 0);
    const avgMood = (totalMood / chartData.length).toFixed(1);

    const totalSleep = chartData.reduce((acc, d) => acc + d.sleepHours, 0);
    const avgSleep = (totalSleep / chartData.length).toFixed(1);

    // Sleep vs Mood correlation
    const lowSleepHours = chartData.filter(d => d.sleepHours < 6);
    const avgMoodLowSleep = lowSleepHours.length > 0
      ? (lowSleepHours.reduce((acc, d) => acc + d.mood, 0) / lowSleepHours.length).toFixed(1)
      : null;

    const goodSleepHours = chartData.filter(d => d.sleepHours >= 7);
    const avgMoodGoodSleep = goodSleepHours.length > 0
      ? (goodSleepHours.reduce((acc, d) => acc + d.mood, 0) / goodSleepHours.length).toFixed(1)
      : null;

    // Academic factor counts
    const factorCounts: Record<string, { count: number; totalMood: number }> = {};
    chartData.forEach(d => {
      d.academicFactors.forEach(f => {
        if (!factorCounts[f]) {
          factorCounts[f] = { count: 0, totalMood: 0 };
        }
        factorCounts[f].count += 1;
        factorCounts[f].totalMood += d.mood;
      });
    });

    const topAcademicTriggers = Object.entries(factorCounts)
      .map(([factor, data]) => ({
        factor,
        count: data.count,
        avgMood: (data.totalMood / data.count).toFixed(1)
      }))
      .sort((a, b) => b.count - a.count);

    return {
      avgMood,
      avgSleep,
      avgMoodLowSleep,
      avgMoodGoodSleep,
      topAcademicTriggers,
      totalEntries: chartData.length
    };
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2">
        <GraduationCap className="w-8 h-8 text-slate-400 mx-auto" />
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Belum Ada Data Log Harian Cukup</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          Catat mood dan durasi tidur harianmu minimal 2 hari untuk melihat visualisasi korelasi stres akademik dan kestabilan emosi.
        </p>
      </div>
    );
  }

  // SVG dimensions
  const svgWidth = 600;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 30;
  const graphWidth = svgWidth - paddingX * 2;
  const graphHeight = svgHeight - paddingY * 2;

  // Scales
  const getX = (i: number) => paddingX + (i / Math.max(chartData.length - 1, 1)) * graphWidth;
  // Mood scale 1-5 -> Y
  const getMoodY = (m: number) => paddingY + graphHeight - ((m - 1) / 4) * graphHeight;
  // Sleep scale 0-12 -> Y
  const getSleepY = (s: number) => paddingY + graphHeight - (s / 12) * graphHeight;

  // Build SVG Path for Mood
  const moodPath = chartData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getMoodY(d.mood)}`).join(' ');
  // Build SVG Path for Sleep
  const sleepPath = chartData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getSleepY(d.sleepHours)}`).join(' ');

  const selectedData = selectedPointIndex !== null ? chartData[selectedPointIndex] : chartData[chartData.length - 1];

  return (
    <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Korelasi Durasi Tidur, Mood & Pemicu Akademik</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Analisis 14 hari terakhir untuk memahami hubungan istirahat dan beban studi terhadap emosi.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-semibold">
          <span className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400">
            <span className="w-3 h-1 bg-teal-500 rounded-full" />
            Skor Mood (1-5)
          </span>
          <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
            <span className="w-3 h-1 bg-indigo-500 rounded-full border-b border-dashed" />
            Jam Tidur (0-12h)
          </span>
        </div>
      </div>

      {/* SVG Multi-Axis Chart */}
      <div className="relative w-full overflow-x-auto pb-2">
        <svg 
          viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
          className="w-full h-48 sm:h-56 overflow-visible text-slate-400 select-none"
        >
          {/* Horizontal Grid lines */}
          {[1, 2, 3, 4, 5].map(level => {
            const y = getMoodY(level);
            return (
              <g key={`grid-${level}`}>
                <line 
                  x1={paddingX} 
                  y1={y} 
                  x2={svgWidth - paddingX} 
                  y2={y} 
                  stroke="currentColor" 
                  strokeOpacity="0.12" 
                  strokeDasharray="4 4" 
                />
                <text 
                  x={paddingX - 8} 
                  y={y + 3} 
                  fontSize="9" 
                  fill="currentColor" 
                  textAnchor="end"
                  className="font-mono text-slate-400"
                >
                  {level}★
                </text>
              </g>
            );
          })}

          {/* Sleep Area Shading */}
          <path 
            d={`${sleepPath} L ${getX(chartData.length - 1)} ${paddingY + graphHeight} L ${getX(0)} ${paddingY + graphHeight} Z`}
            fill="url(#sleepGradient)"
            opacity="0.25"
          />

          <defs>
            <linearGradient id="sleepGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d9488" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0d9488" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Sleep Line (Indigo Dashed) */}
          <path 
            d={sleepPath} 
            fill="none" 
            stroke="#6366f1" 
            strokeWidth="2" 
            strokeDasharray="3 3"
          />

          {/* Mood Line (Teal Solid) */}
          <path 
            d={moodPath} 
            fill="none" 
            stroke="#0d9488" 
            strokeWidth="3" 
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {chartData.map((d, i) => {
            const mx = getX(i);
            const my = getMoodY(d.mood);
            const isSelected = selectedData?.index === i;
            const hasAcademicTrigger = d.academicFactors.length > 0;

            return (
              <g 
                key={`point-${i}`}
                className="cursor-pointer transition-transform"
                onClick={() => setSelectedPointIndex(i)}
              >
                {/* Academic Trigger Marker */}
                {hasAcademicTrigger && (
                  <circle 
                    cx={mx} 
                    cy={paddingY + 8} 
                    r="4" 
                    fill="#f59e0b" 
                    className="animate-pulse"
                  />
                )}

                {/* Mood Point Circle */}
                <circle 
                  cx={mx} 
                  cy={my} 
                  r={isSelected ? 6 : 4} 
                  fill="#0d9488" 
                  stroke="#ffffff" 
                  strokeWidth={isSelected ? 3 : 1.5} 
                />

                {/* X Axis Label */}
                <text 
                  x={mx} 
                  y={svgHeight - 8} 
                  fontSize="9.5" 
                  fill="currentColor" 
                  textAnchor="middle"
                  className={isSelected ? 'font-bold text-teal-600 dark:text-teal-400' : 'text-slate-400'}
                >
                  {d.dayLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Point Insight Card */}
      {selectedData && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-500 flex items-center justify-center font-bold text-sm shrink-0">
              {selectedData.mood}/5
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>{new Date(selectedData.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 font-mono text-[11px]">
                  {selectedData.sleepHours} Jam Tidur
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                {selectedData.notes ? `"${selectedData.notes}"` : 'Tidak ada catatan refleksi harian.'}
              </p>
            </div>
          </div>

          {/* Factors */}
          <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
            {selectedData.academicFactors.map(f => (
              <span key={f} className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[11px] font-medium flex items-center gap-1">
                <GraduationCap className="w-3 h-3" />
                {f}
              </span>
            ))}
            {selectedData.emotions.slice(0, 2).map(e => (
              <span key={e} className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-750 text-slate-700 dark:text-slate-300 text-[11px]">
                {e}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Clinical Correlation Summary Stats */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-2xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200/50 dark:border-teal-900/40">
            <span className="text-[11px] text-teal-700 dark:text-teal-400 font-semibold block">Rata-rata Mood</span>
            <div className="text-lg font-bold text-teal-900 dark:text-teal-200 mt-0.5">{analytics.avgMood} / 5.0</div>
            <p className="text-[11px] text-teal-600/80 dark:text-teal-400/70 mt-0.5">
              {parseFloat(analytics.avgMood) >= 3.5 ? 'Kondisi emosional stabil' : 'Perlu perhatian dukungan coping'}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-900/40">
            <span className="text-[11px] text-indigo-700 dark:text-indigo-400 font-semibold block">Durasi Tidur & Mood</span>
            <div className="text-lg font-bold text-indigo-900 dark:text-indigo-200 mt-0.5">{analytics.avgSleep} Jam / Malam</div>
            <p className="text-[11px] text-indigo-600/80 dark:text-indigo-400/70 mt-0.5">
              {analytics.avgMoodGoodSleep ? `Mood saat tidur cukup: ${analytics.avgMoodGoodSleep}/5` : 'Pertahankan ritme tidur'}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40">
            <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold block">Pemicu Akademik Terbanyak</span>
            <div className="text-sm font-bold text-amber-900 dark:text-amber-200 mt-1 truncate">
              {analytics.topAcademicTriggers[0]?.factor || 'Tugas Kuliah / Deadline'}
            </div>
            <p className="text-[11px] text-amber-600/80 dark:text-amber-400/70 mt-0.5">
              {analytics.topAcademicTriggers[0] ? `Tercatat ${analytics.topAcademicTriggers[0].count} kali dalam 14 hari` : 'Pola seimbang'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
