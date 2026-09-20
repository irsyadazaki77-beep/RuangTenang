import React, { useState } from 'react';
import { Activity, Compass, BookOpen, ArrowRight, FileSpreadsheet, RotateCcw, Moon, Heart, TrendingDown, TrendingUp, Minus, Download, FileText } from 'lucide-react';
import { HistoricalScore, TriageCategory } from '../../types';

interface MoodLog {
  id: string;
  date: string;
  mood: number;
  emotions: string[];
  notes: string;
  factors: string[];
  sleepHours: number | null;
  sleepQuality: 'very_poor' | 'poor' | 'fair' | 'good' | 'excellent' | null;
}

interface ScreeningTrendProps {
  screenHistory: HistoricalScore[];
  moodLogs?: MoodLog[];
  currentPhq9: number;
  currentGad7: number;
  currentTriage: TriageCategory;
  triageStyle: { bg: string; dot: string; desc: string };
  onNavigateToPrograms: () => void;
  onNavigateToSchedule: () => void;
  onClearHistory: () => void;
  getTriageBadge: (triage: TriageCategory) => { bg: string; dot: string; desc: string };
}

export const ScreeningTrend: React.FC<ScreeningTrendProps> = ({
  screenHistory,
  moodLogs = [],
  currentPhq9,
  currentGad7,
  currentTriage,
  triageStyle,
  onNavigateToPrograms,
  onNavigateToSchedule,
  onClearHistory,
  getTriageBadge
}) => {
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const response = await fetch('/api/user-data/export-pdf', { credentials: 'include' });
      if (!response.ok) throw new Error('Gagal mengunduh PDF');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Resume_Konseling_RuangTenang_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Gagal mengunduh laporan PDF. Silakan coba lagi.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Calculate Deltas (Recent [0] vs Previous [1])
  let phqDelta = 0;
  let gadDelta = 0;
  
  if (screenHistory.length >= 2) {
    const recent = screenHistory[0];
    const previous = screenHistory[1];
    phqDelta = recent.phq9 - previous.phq9;
    gadDelta = recent.gad7 - previous.gad7;
  }

  // Reverse history so time progresses chronologically from left to right on the graph
  const chronologicalHistory = React.useMemo(() => [...screenHistory].reverse(), [screenHistory]);

  const oldestScreening = screenHistory.length > 0 ? screenHistory[screenHistory.length - 1] : null;
  const newestScreening = screenHistory.length > 0 ? screenHistory[0] : null;
  const hasImproved = !!(oldestScreening && newestScreening && screenHistory.length > 1 && newestScreening.phq9 < oldestScreening.phq9);
  const scoreDiff = hasImproved && oldestScreening && newestScreening ? (oldestScreening.phq9 - newestScreening.phq9) : 0;

  const renderDelta = (delta: number) => {
    if (delta === 0) return (
      <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800 flex items-center gap-1">
        <Minus className="w-3 h-3" /> Stabil
      </span>
    );
    
    if (delta < 0) {
      return (
        <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
          <TrendingDown className="w-3 h-3" /> Turun {Math.abs(delta)} poin
        </span>
      );
    }
    
    return (
      <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800 flex items-center gap-1">
        <TrendingUp className="w-3 h-3" /> Naik {Math.abs(delta)} poin
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-default">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-primary flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <span>Tren Skrining Klinis (PHQ-9 & GAD-7)</span>
          </h2>
          <p className="text-xs sm:text-sm text-secondary mt-0.5">
            Pantau trajektori tingkat gejala depresi dan kecemasan dari riwayat skrining mandiri.
          </p>
        </div>
        <button
          onClick={onNavigateToPrograms}
          className="btn-primary flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-xs"
        >
          <span>Mulai Skrining Baru</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Summary Metric Cards (3 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* PHQ-9 Card */}
        <div className="surface-card p-4 sm:p-5 rounded-2xl border border-default space-y-2 flex flex-col justify-between shadow-3xs">
          <span className="text-xs text-secondary font-medium uppercase tracking-wider">
            Skor Depresi (PHQ-9)
          </span>
          <div className="space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-2xl sm:text-3xl font-bold text-primary">
                {currentPhq9} <span className="text-xs sm:text-sm font-normal text-secondary">/ 27</span>
              </div>
              {screenHistory.length >= 2 && renderDelta(phqDelta)}
            </div>
            <p className="text-xs text-secondary font-medium">
              Kategori: <span className="font-semibold text-primary">{currentPhq9 <= 4 ? 'Minimal' : currentPhq9 <= 9 ? 'Ringan' : currentPhq9 <= 14 ? 'Sedang' : 'Berat / Parah'}</span>
            </p>
          </div>
        </div>

        {/* GAD-7 Card */}
        <div className="surface-card p-4 sm:p-5 rounded-2xl border border-default space-y-2 flex flex-col justify-between shadow-3xs">
          <span className="text-xs text-secondary font-medium uppercase tracking-wider">
            Skor Kecemasan (GAD-7)
          </span>
          <div className="space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-2xl sm:text-3xl font-bold text-primary">
                {currentGad7} <span className="text-xs sm:text-sm font-normal text-secondary">/ 21</span>
              </div>
              {screenHistory.length >= 2 && renderDelta(gadDelta)}
            </div>
            <p className="text-xs text-secondary font-medium">
              Kategori: <span className="font-semibold text-primary">{currentGad7 <= 4 ? 'Minimal' : currentGad7 <= 9 ? 'Ringan' : currentGad7 <= 14 ? 'Sedang' : 'Berat / Parah'}</span>
            </p>
          </div>
        </div>

        {/* Triage Recommendation Card */}
        <div className="surface-card p-4 sm:p-5 rounded-2xl border border-default space-y-2 flex flex-col justify-between shadow-3xs">
          <span className="text-xs text-secondary font-medium uppercase tracking-wider">
            Rekomendasi Penanganan
          </span>
          <div className="space-y-1">
            <div className="text-sm sm:text-base font-bold text-primary">
              {currentTriage === 'Krisis'
                ? 'SOS & Layanan Krisis 24 Jam'
                : currentTriage === 'Prioritas'
                ? 'Sesi Konseling & Terapi CBT'
                : 'Program Mandiri & Relaksasi'}
            </div>
            <p className="text-xs text-secondary leading-relaxed line-clamp-2">
              {triageStyle.desc}
            </p>
          </div>
        </div>
      </div>

      {/* Graphical Representation Area */}
      <div className="surface-card rounded-2xl border border-default p-4 sm:p-6 space-y-4 shadow-3xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-default pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400">
              <Activity className="w-4 h-4" />
            </div>
            <span className="text-sm sm:text-base font-bold text-primary">
              Trajektori Skor Skrining Berkala
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-primary">
              <span className="w-2.5 h-2.5 bg-rose-500 rounded-full" /> PHQ-9 (Depresi)
            </span>
            <span className="flex items-center gap-1.5 text-primary">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-full" /> GAD-7 (Kecemasan)
            </span>
            
            <div className="flex surface-muted rounded-lg p-0.5 border border-default">
              <button
                onClick={() => setChartType('line')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  chartType === 'line' 
                    ? 'bg-teal-600 text-white shadow-xs' 
                    : 'text-secondary hover:text-primary'
                }`}
              >
                Garis
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  chartType === 'bar' 
                    ? 'bg-teal-600 text-white shadow-xs' 
                    : 'text-secondary hover:text-primary'
                }`}
              >
                Batang
              </button>
            </div>
          </div>
        </div>

        {screenHistory.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-3 surface-muted rounded-xl border border-default">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold text-primary">Belum Ada Riwayat Tes Skrining</p>
              <p className="text-xs sm:text-sm text-secondary max-w-md mx-auto mt-1">
                Lakukan tes skrining PHQ-9 & GAD-7 untuk memetakan grafik tingkat depresi dan kecemasan Anda secara berkala.
              </p>
            </div>
            <button
              onClick={onNavigateToPrograms}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 btn-primary text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-xs"
            >
              <span>Mulai Skrining Mandiri</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : chartType === 'line' ? (
          <div className="w-full overflow-x-auto custom-scrollbar">
            <div className="relative h-60 sm:h-72 min-w-[480px] w-full bg-slate-900 rounded-xl p-4 text-white overflow-hidden shadow-inner">
              {/* Horizontal reference lines */}
              <div className="absolute inset-0 flex flex-col justify-between text-[10px] text-slate-400 pointer-events-none pb-8 pt-4 px-4">
                <div className="border-b border-slate-800 pb-1 flex justify-between">
                  <span>20 (Parah / Krisis)</span>
                  <span className="text-rose-400 font-medium">Ambang Krisis</span>
                </div>
                <div className="border-b border-slate-800 pb-1 flex justify-between">
                  <span>10 (Sedang / Prioritas)</span>
                  <span className="text-amber-400 font-medium">Ambang Prioritas</span>
                </div>
                <div className="border-b border-slate-800 pb-1 flex justify-between">
                  <span>4 (Minimal / Stabil)</span>
                  <span className="text-teal-400 font-medium">Ambang Stabil</span>
                </div>
                <div className="border-b border-slate-800 pb-1 flex justify-between">
                  <span>0</span>
                </div>
              </div>

              {/* SVG Line Graph */}
              <svg className="w-full h-full absolute inset-0 z-10 p-4" viewBox="0 0 500 200" preserveAspectRatio="none">
                {chronologicalHistory.length > 0 && (() => {
                  const pointsCount = chronologicalHistory.length;
                  const getX = (i: number) => pointsCount === 1 ? 250 : 40 + i * (420 / (pointsCount - 1));
                  const getPhqY = (score: number) => 160 - (score / 27) * 120;
                  const getGadY = (score: number) => 160 - (score / 21) * 120;

                  let phqPath = '';
                  let gadPath = '';

                  chronologicalHistory.forEach((item, idx) => {
                    const x = getX(idx);
                    const py = getPhqY(item.phq9);
                    const gy = getGadY(item.gad7);

                    if (idx === 0) {
                      phqPath = `M ${x} ${py}`;
                      gadPath = `M ${x} ${gy}`;
                    } else {
                      phqPath += ` L ${x} ${py}`;
                      gadPath += ` L ${x} ${gy}`;
                    }
                  });

                  return (
                    <>
                      <defs>
                        <linearGradient id="phq-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="gad-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      {pointsCount > 1 && (
                        <>
                          <path d={`${phqPath} L ${getX(pointsCount - 1)} 160 L ${getX(0)} 160 Z`} fill="url(#phq-grad)" />
                          <path d={`${gadPath} L ${getX(pointsCount - 1)} 160 L ${getX(0)} 160 Z`} fill="url(#gad-grad)" />
                          <path d={phqPath} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d={gadPath} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </>
                      )}

                      {chronologicalHistory.map((item, idx) => {
                        const x = getX(idx);
                        const py = getPhqY(item.phq9);
                        const gy = getGadY(item.gad7);
                        return (
                          <g key={item.id}>
                            <circle cx={x} cy={py} r="4.5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                            <text x={x} y={py - 8} fill="#ffffff" fontSize="9" textAnchor="middle" fontWeight="bold">
                              {item.phq9}
                            </text>

                            <circle cx={x} cy={gy} r="4.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
                            <text x={x} y={gy + 14} fill="#ffffff" fontSize="9" textAnchor="middle" fontWeight="bold">
                              {item.gad7}
                            </text>
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>

              {/* X Axis Labels */}
              <div className="absolute bottom-1 left-0 right-0 flex justify-between px-6 sm:px-10 text-[10px] text-slate-400 font-mono">
                {chronologicalHistory.map((item) => (
                  <div key={item.id} className="text-center">
                    <span className="block text-white font-medium">{item.date.split(' ')[0]} {item.date.split(' ')[1]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* BAR CHART VIEW */
          <div className="w-full overflow-x-auto custom-scrollbar">
            <div className="relative h-60 sm:h-72 min-w-[480px] w-full bg-slate-900 rounded-xl p-4 text-white overflow-hidden shadow-inner">
              <div className="absolute inset-0 flex flex-col justify-between text-[10px] text-slate-400 pointer-events-none pb-8 pt-4 px-4">
                <div className="border-b border-slate-800 pb-1 flex justify-between"><span>20 (Parah)</span></div>
                <div className="border-b border-slate-800 pb-1 flex justify-between"><span>10 (Sedang)</span></div>
                <div className="border-b border-slate-800 pb-1 flex justify-between"><span>0</span></div>
              </div>

              <div className="relative h-full flex items-end justify-around px-4 sm:px-12 z-10 pt-4 pb-8">
                {chronologicalHistory.map((item) => {
                  const phqHeight = Math.min(100, (item.phq9 / 27) * 100);
                  const gadHeight = Math.min(100, (item.gad7 / 21) * 100);

                  return (
                    <div key={item.id} className="flex flex-col items-center gap-2 group cursor-pointer">
                      <div className="flex items-end gap-1.5 h-32">
                        {/* PHQ-9 */}
                        <div
                          style={{ height: `${phqHeight}%` }}
                          className="w-5 bg-rose-500 rounded-t-md hover:opacity-90 transition-all relative flex justify-center"
                        >
                          <span className="opacity-0 group-hover:opacity-100 absolute -top-6 text-[10px] font-mono bg-rose-600 text-white px-1.5 py-0.5 rounded shadow z-50 whitespace-nowrap">
                            PHQ: {item.phq9}
                          </span>
                        </div>
                        {/* GAD-7 */}
                        <div
                          style={{ height: `${gadHeight}%` }}
                          className="w-5 bg-amber-500 rounded-t-md hover:opacity-90 transition-all relative flex justify-center"
                        >
                          <span className="opacity-0 group-hover:opacity-100 absolute -top-6 text-[10px] font-mono bg-amber-600 text-white px-1.5 py-0.5 rounded shadow z-50 whitespace-nowrap">
                            GAD: {item.gad7}
                          </span>
                        </div>
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] font-mono text-slate-300 block">{item.date}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sleep vs Mood Correlation & Milestones in 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Correlation Chart (Sleep vs Mood) */}
        <div className="surface-card rounded-2xl p-4 sm:p-5 border border-default space-y-3 shadow-3xs flex flex-col justify-between">
          <div className="flex items-center gap-2 border-b border-default pb-3">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Moon className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-primary text-sm sm:text-base">
              Korelasi Durasi Tidur & Mood
            </h3>
          </div>
          
          {moodLogs.length < 3 ? (
            <div className="py-8 text-center text-xs sm:text-sm text-secondary surface-muted rounded-xl p-4">
              Kumpulkan minimal 3 catatan harian (mood dan tidur) untuk melihat analisis korelasi ini.
            </div>
          ) : (
            <div className="relative h-44 sm:h-48 w-full flex items-end justify-between px-2 sm:px-4 pt-4 pb-6 surface-muted rounded-xl border border-default">
              <div className="absolute inset-0 flex flex-col justify-between text-[10px] text-muted pointer-events-none pb-6 pt-3 px-3">
                <div className="border-b border-default pb-1 flex justify-between"><span>Tidur Cukup (8+ Jam) / Mood 5</span></div>
                <div className="border-b border-default pb-1 flex justify-between"><span>Kurang Tidur (&lt;5 Jam) / Mood 1</span></div>
              </div>
              
              <div className="relative h-full w-full flex items-end justify-between z-10">
                {moodLogs.slice(0, 10).reverse().map((log) => {
                  const hasSleep = log.sleepHours !== null && log.sleepHours !== undefined;
                  const sleepHeight = hasSleep ? Math.min(100, ((log.sleepHours as number) / 12) * 100) : 0;
                  const moodY = 100 - ((log.mood - 1) / 4) * 100;
                  
                  return (
                    <div key={log.id} className="relative flex flex-col items-center flex-1 h-full group">
                      {hasSleep && (
                        <div className="absolute bottom-0 w-3 sm:w-5 bg-indigo-200 dark:bg-indigo-900/60 rounded-t-xs" style={{ height: `${sleepHeight}%` }} />
                      )}
                      <div 
                        className="absolute w-2.5 h-2.5 rounded-full bg-teal-500 z-20 shadow border border-white dark:border-slate-800 transition-all group-hover:scale-150" 
                        style={{ top: `${moodY}%` }}
                      />
                      
                      <div className="absolute -bottom-5 text-[9px] text-secondary font-mono">
                        {log.date.split('-')[2]}/{log.date.split('-')[1]}
                      </div>
                      
                      {/* Tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-slate-900 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap z-30 transition-opacity pointer-events-none">
                        {hasSleep ? `Tidur: ${log.sleepHours} Jam | ` : ''}Mood: {log.mood}/5
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        
        {/* Recovery Milestones */}
        <div className="surface-card rounded-2xl p-4 sm:p-5 border border-default space-y-3 shadow-3xs flex flex-col justify-between">
          <div className="flex items-center gap-2 border-b border-default pb-3">
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <Heart className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-primary text-sm sm:text-base">
              Milestone Pemulihan Emosional
            </h3>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3.5 my-auto">
            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl shadow-xs text-emerald-600 dark:text-emerald-400 shrink-0">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                Perjalanan Kesejahteraan Mental
              </h4>
              <p className="text-xs sm:text-sm text-emerald-800/90 dark:text-emerald-400/90 leading-relaxed">
                {hasImproved
                  ? `Luar Biasa! Terdapat penurunan skor depresi sebesar ${scoreDiff} poin dibandingkan tes awal Anda. Tetap pertahankan rutinitas self-care dan konseling.`
                  : moodLogs.length > 5 
                  ? 'Konsistensi Anda dalam melacak mood sangat baik. Pemahaman diri adalah langkah pertama menuju ketahanan emosional.'
                  : 'Perjalanan pemulihan Anda baru dimulai. Rutin melakukan check-in harian akan membantu mengidentifikasi pola pemicu stres.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Recommendations Based on Triage */}
      <div className="surface-card rounded-2xl p-4 sm:p-5 border border-default flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-3xs">
        <div className="space-y-1 max-w-2xl">
          <h4 className="text-sm sm:text-base font-bold text-primary flex items-center gap-2">
            <Compass className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Rekomendasi Langkah Penanganan Selanjutnya:</span>
          </h4>
          <p className="text-xs sm:text-sm text-secondary leading-relaxed">
            {currentTriage === 'Krisis'
              ? 'Kondisi emosional Anda memerlukan pendampingan segera. Silakan hubungi tim hotline krisis 24 jam atau jadwalkan janji darurat melalui direktori kami.'
              : currentTriage === 'Prioritas'
              ? 'Skor skrining menunjukkan perlunya intervensi sedang. Kami sarankan untuk memesan sesi konseling dengan salah satu psikolog kampus kami.'
              : 'Skor Anda stabil dan berada pada batas aman. Tetap latih teknik manajemen stres mandiri untuk menjaga ketahanan emosional Anda.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
          <button
            onClick={onNavigateToPrograms}
            className="flex-1 md:flex-none justify-center px-4 py-2.5 btn-secondary text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5"
          >
            <BookOpen className="w-4 h-4" />
            <span>Baca Edukasi</span>
          </button>
          <button
            onClick={onNavigateToSchedule}
            className="flex-1 md:flex-none justify-center px-4 py-2.5 btn-primary text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5 shadow-xs"
          >
            <span>Jadwalkan Konseling</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* History Table */}
      <div className="surface-card rounded-2xl border border-default overflow-hidden shadow-3xs">
        <div className="p-4 sm:p-5 border-b border-default flex items-center justify-between bg-stone-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span className="text-xs sm:text-sm font-bold text-primary uppercase tracking-wider">
              Log Riwayat Tes Skrining Lengkap
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingPdf ? 'Mengunduh...' : 'Unduh Laporan PDF'}</span>
            </button>
            {screenHistory.length > 0 && (
              <button
                onClick={onClearHistory}
                className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Riwayat
              </button>
            )}
          </div>
        </div>
        
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[560px]">
            <thead>
              <tr className="surface-muted text-secondary font-semibold border-b border-default">
                <th className="p-3.5">Tanggal Tes</th>
                <th className="p-3.5">Deskripsi / Label</th>
                <th className="p-3.5 text-center">Skor PHQ-9</th>
                <th className="p-3.5 text-center">Skor GAD-7</th>
                <th className="p-3.5 text-center">Status Triase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-default font-normal text-primary">
              {screenHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-secondary text-xs sm:text-sm">
                    Belum ada riwayat tes skrining tersimpan di akun Anda.
                  </td>
                </tr>
              ) : (
                screenHistory.map((item) => {
                  const triageB = getTriageBadge(item.triage);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-mono text-xs">{item.date}</td>
                      <td className="p-3.5 text-secondary">{item.label}</td>
                      <td className="p-3.5 text-center font-mono">
                        <span className={`px-2 py-0.5 rounded-md font-semibold text-xs ${
                          item.phq9 >= 15 ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400' :
                          item.phq9 >= 10 ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400' :
                          'bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400'
                        }`}>
                          {item.phq9} / 27
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-mono">
                        <span className={`px-2 py-0.5 rounded-md font-semibold text-xs ${
                          item.gad7 >= 15 ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400' :
                          item.gad7 >= 10 ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400' :
                          'bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400'
                        }`}>
                          {item.gad7} / 21
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs border font-medium ${triageB.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${triageB.dot}`} />
                          {item.triage}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
