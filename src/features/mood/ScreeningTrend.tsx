import React, { useState } from 'react';
import { Activity, Compass, BookOpen, ArrowRight, FileSpreadsheet, RotateCcw, Moon, Heart } from 'lucide-react';
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

  const renderDelta = (delta: number, isLowerBetter: boolean = true) => {
    if (delta === 0) return (
      <span className="text-[11px] font-semibold text-teal-600 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
        ↓ Terpantau Stabil
      </span>
    );
    
    if (delta < 0) {
      return (
        <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
           ↓ Menurun {Math.abs(delta)} poin
        </span>
      );
    }
    
    return (
        <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1">
           ↑ Meningkat {Math.abs(delta)} poin
        </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1 shadow-2xs">
          <span className="text-xs text-slate-600 font-medium">Skor Depresi Saat Ini (PHQ-9)</span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-sans font-semibold tracking-tight text-slate-900">{currentPhq9} <span className="text-xs font-normal text-slate-600">/ 27</span></span>
            {renderDelta(phqDelta)}
          </div>
          <p className="text-[11px] text-slate-600">Kategori: {currentPhq9 <= 4 ? 'Minimal' : currentPhq9 <= 9 ? 'Ringan' : currentPhq9 <= 14 ? 'Sedang' : 'Berat'}</p>
        </div>

        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1 shadow-2xs">
          <span className="text-xs text-slate-600 font-medium">Skor Kecemasan Saat Ini (GAD-7)</span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-sans font-semibold tracking-tight text-slate-900">{currentGad7} <span className="text-xs font-normal text-slate-600">/ 21</span></span>
            {renderDelta(gadDelta)}
          </div>
          <p className="text-[11px] text-slate-600">Kategori: {currentGad7 <= 4 ? 'Minimal' : currentGad7 <= 9 ? 'Ringan' : currentGad7 <= 14 ? 'Sedang' : 'Berat'}</p>
        </div>

        <div className="bg-slate-100 p-3 rounded-lg border border-slate-300 space-y-1 shadow-2xs">
          <span className="text-xs text-slate-800 font-semibold">Rekomendasi Jalur Layanan</span>
          <div className="text-xs sm:text-sm font-semibold text-slate-900 pt-0.5 truncate">
            {currentTriage === 'Krisis'
              ? 'SOS & Layanan Krisis 24 Jam'
              : currentTriage === 'Prioritas'
              ? 'Sesi Konseling & Panduan CBT'
              : 'Program Mandiri Stres & Burnout'}
          </div>
          <p className="text-[11px] text-slate-600 line-clamp-1">{triageStyle.desc}</p>
        </div>
      </div>

      {/* Graphical Representation Area */}
      <div className="bg-slate-900 text-white p-5 sm:p-6 rounded-xl space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-slate-600" />
            <span className="font-semibold text-white">Trajektori Skor Berdasarkan Riwayat Tes</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-rose-500 rounded-full"></span> PHQ-9 (Depresi)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-amber-500 rounded-full"></span> GAD-7 (Kecemasan)</span>
            <div className="flex items-center border border-slate-700 rounded-md overflow-hidden bg-slate-950 ml-2">
              <button
                onClick={() => setChartType('line')}
                className={`px-2 py-0.5 text-[10px] ${chartType === 'line' ? 'bg-slate-800 font-bold' : ''}`}
              >
                Garis
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`px-2 py-0.5 text-[10px] ${chartType === 'bar' ? 'bg-slate-800 font-bold' : ''}`}
              >
                Batang
              </button>
            </div>
          </div>
        </div>

        {screenHistory.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">Belum Ada Riwayat Tes Skrining</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                Lakukan tes skrining PHQ-9 & GAD-7 untuk memetakan grafik tingkat depresi dan kecemasan Anda secara berkala.
              </p>
            </div>
            <button
              onClick={onNavigateToPrograms}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <span>Mulai Skrining Mandiri</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : chartType === 'line' ? (
          <div className="relative h-52 sm:h-64 w-full">
            {/* Horizontal reference lines */}
            <div className="absolute inset-0 flex flex-col justify-between text-[10px] text-slate-600 pointer-events-none pb-8 pt-4">
              <div className="border-b border-slate-800/80 pb-1 flex justify-between">
                <span>20 (Parah)</span>
                <span className="text-rose-500/85 font-medium">Garis Krisis</span>
              </div>
              <div className="border-b border-slate-800/80 pb-1 flex justify-between">
                <span>10 (Sedang)</span>
                <span className="text-amber-500/85 font-medium">Garis Prioritas</span>
              </div>
              <div className="border-b border-slate-800/80 pb-1 flex justify-between">
                <span>4 (Minimal)</span>
                <span className="text-teal-500/85 font-medium">Garis Sehat</span>
              </div>
              <div className="border-b border-slate-800/80 pb-1 flex justify-between">
                <span>0</span>
              </div>
            </div>

            {/* SVG Graph Drawing */}
            <svg className="w-full h-full absolute inset-0 z-10" viewBox="0 0 500 200" preserveAspectRatio="none">
              {chronologicalHistory.length > 1 && (() => {
                const pointsCount = chronologicalHistory.length;
                const getX = (i: number) => 40 + i * (420 / (pointsCount - 1));
                const getPhqY = (score: number) => 170 - (score / 27) * 130;
                const getGadY = (score: number) => 170 - (score / 21) * 130;

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
                    {/* Area glow under lines */}
                    <path d={`${phqPath} L ${getX(pointsCount - 1)} 170 L ${getX(0)} 170 Z`} fill="url(#phq-gradient)" opacity="0.1" />
                    <path d={`${gadPath} L ${getX(pointsCount - 1)} 170 L ${getX(0)} 170 Z`} fill="url(#gad-gradient)" opacity="0.1" />

                    {/* Defs for gradients */}
                    <defs>
                      <linearGradient id="phq-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="gad-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {/* Stroke paths */}
                    <path d={phqPath} fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    <path d={gadPath} fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Coordinate Circles */}
                    {chronologicalHistory.map((item, idx) => {
                      const x = getX(idx);
                      const py = getPhqY(item.phq9);
                      const gy = getGadY(item.gad7);
                      return (
                        <g key={item.id}>
                          {/* PHQ-9 point */}
                          <circle cx={x} cy={py} r="5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                          <text x={x} y={py - 10} fill="#ffffff" fontSize="8" textAnchor="middle" className="font-mono font-bold">
                            {item.phq9}
                          </text>

                          {/* GAD-7 point */}
                          <circle cx={x} cy={gy} r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
                          <text x={x} y={gy + 14} fill="#ffffff" fontSize="8" textAnchor="middle" className="font-mono font-bold">
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
            <div className="absolute bottom-0 left-0 right-0 flex justify-between px-6 sm:px-11 text-[9px] sm:text-xs text-slate-600 font-mono">
              {chronologicalHistory.map((item) => (
                <div key={item.id} className="text-center">
                  <span className="block text-white font-medium">{item.date.split(' ')[0]} {item.date.split(' ')[1]}</span>
                  <span className="text-[9px] text-slate-600 hidden sm:block truncate max-w-[70px] mt-0.5">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* BAR CHART VIEW */
          <div className="relative h-52 sm:h-64 w-full">
            <div className="absolute inset-0 flex flex-col justify-between text-[10px] text-slate-600 pointer-events-none pb-8 pt-4">
              <div className="border-b border-slate-800/80 pb-1 flex justify-between"><span>20 (Parah)</span></div>
              <div className="border-b border-slate-800/80 pb-1 flex justify-between"><span>10 (Sedang)</span></div>
              <div className="border-b border-slate-800/80 pb-1 flex justify-between"><span>0</span></div>
            </div>

            <div className="relative h-full flex items-end justify-between px-3 sm:px-14 z-10 pt-4 pb-8">
              {chronologicalHistory.map((item) => {
                const phqHeight = Math.min(100, (item.phq9 / 27) * 100);
                const gadHeight = Math.min(100, (item.gad7 / 21) * 100);

                return (
                  <div key={item.id} className="flex flex-col items-center gap-2 group cursor-pointer">
                    <div className="flex items-end gap-1.5 h-32">
                      {/* PHQ-9 */}
                      <div
                        style={{ height: `${phqHeight}%` }}
                        className="w-4 bg-rose-500 rounded-t-xs hover:opacity-85 transition-all relative flex justify-center"
                      >
                        <span className="opacity-0 group-hover:opacity-100 absolute -top-6 text-[10px] font-mono bg-rose-600 text-white px-1.5 py-0.5 rounded shadow z-50 whitespace-nowrap">
                          PHQ:{item.phq9}
                        </span>
                      </div>
                      {/* GAD-7 */}
                      <div
                        style={{ height: `${gadHeight}%` }}
                        className="w-4 bg-amber-500 rounded-t-xs hover:opacity-85 transition-all relative flex justify-center"
                      >
                        <span className="opacity-0 group-hover:opacity-100 absolute -top-6 text-[10px] font-mono bg-amber-600 text-white px-1.5 py-0.5 rounded shadow z-50 whitespace-nowrap">
                          GAD:{item.gad7}
                        </span>
                      </div>
                    </div>
                    <div className="text-center">
                      <span className="text-[9px] sm:text-xs font-mono text-slate-300 block">{item.date}</span>
                      <span className="text-[8px] text-slate-600 hidden sm:block truncate max-w-[80px]">{item.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Correlation Chart (Sleep vs Mood) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Moon className="w-5 h-5 text-indigo-500" />
          <h3 className="font-semibold text-slate-800 text-sm">Korelasi Kualitas Tidur & Fluktuasi Mood</h3>
        </div>
        
        {moodLogs.length < 3 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            Kumpulkan minimal 3 catatan harian (mood dan tidur) untuk melihat analisis korelasi ini.
          </div>
        ) : (
          <div className="relative h-40 sm:h-48 w-full flex items-end justify-between px-2 sm:px-6 pt-4 pb-6">
            {/* Simple correlation visual: overlaying bars for sleep, and line for mood */}
            <div className="absolute inset-0 flex flex-col justify-between text-[10px] text-slate-400 pointer-events-none pb-6 pt-4">
              <div className="border-b border-slate-100 pb-1 flex justify-between"><span>Tidur Optimal (8+ Jam) / Sangat Baik</span></div>
              <div className="border-b border-slate-100 pb-1 flex justify-between"><span>Kurang Tidur (&lt;5 Jam) / Sangat Buruk</span></div>
            </div>
            
            <div className="relative h-full w-full flex items-end justify-between z-10">
              {moodLogs.slice(0, 14).reverse().map((log, i) => {
                const sleepHeight = Math.min(100, (log.sleepHours / 12) * 100);
                const moodY = 100 - ((log.mood - 1) / 4) * 100; // 0 (top) to 100 (bottom) based on 1-5 scale
                
                return (
                  <div key={log.id} className="relative flex flex-col items-center flex-1 h-full group">
                    <div className="absolute bottom-0 w-4 sm:w-6 bg-indigo-100 rounded-t-sm" style={{ height: `${sleepHeight}%` }}></div>
                    <div 
                      className="absolute w-2 h-2 rounded-full bg-teal-500 z-20 shadow border border-white transition-all group-hover:scale-150" 
                      style={{ top: `${moodY}%` }}
                    ></div>
                    
                    <div className="absolute -bottom-5 text-[8px] sm:text-[10px] text-slate-400 font-mono">
                      {log.date.split('-')[2]}/{log.date.split('-')[1]}
                    </div>
                    
                    {/* Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-slate-800 text-white text-[10px] p-1.5 rounded whitespace-nowrap z-30 transition-opacity">
                      Tidur: {log.sleepHours} Jam | Mood: {log.mood}/5
                    </div>
                  </div>
                );
              })}
              
              {/* Connecting line for mood */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" preserveAspectRatio="none">
                 {(() => {
                   const logs = moodLogs.slice(0, 14).reverse();
                   if (logs.length < 2) return null;
                   
                   let path = '';
                   logs.forEach((log, i) => {
                     const x = (i + 0.5) * (100 / logs.length); // percentage
                     const y = 100 - ((log.mood - 1) / 4) * 100;
                     if (i === 0) path += `M ${x}% ${y}%`;
                     else path += ` L ${x}% ${y}%`;
                   });
                   
                   return <path d={path} fill="none" stroke="#14b8a6" strokeWidth="2" opacity="0.6" strokeDasharray="4 2" />;
                 })()}
              </svg>
            </div>
          </div>
        )}
      </div>
      
      {/* Recovery Milestones */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-teal-100 p-5 rounded-xl flex flex-col sm:flex-row items-center gap-4 shadow-sm">
        <div className="p-3 bg-white rounded-full shadow-sm text-emerald-500 shrink-0">
           <Heart className="w-6 h-6" />
        </div>
        <div>
           <h4 className="text-sm font-semibold text-teal-900 mb-1">Milestone Pemulihan Emosional</h4>
           <p className="text-xs text-teal-800/80 leading-relaxed">
             {hasImproved
               ? `Luar Biasa! Terdapat penurunan skor depresi sebesar ${scoreDiff} poin dibandingkan tes awal Anda. Tetap pertahankan rutinitas self-care dan konseling.`
               : moodLogs.length > 5 
               ? 'Konsistensi Anda dalam melacak mood sangat baik. Pemahaman diri adalah langkah pertama menuju ketahanan emosional.'
               : 'Perjalanan pemulihan Anda baru dimulai. Rutin melakukan check-in harian akan membantu mengidentifikasi pola pemicu stres.'
             }
           </p>
        </div>
      </div>

      {/* Action Recommendations Based on Triage */}
      <div className="bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-xs sm:text-sm font-semibold text-slate-900 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-slate-700" />
            <span>Rekomendasi Langkah Penanganan Selanjutnya:</span>
          </h4>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {currentTriage === 'Krisis'
              ? 'Kondisi emosional Anda memerlukan pendampingan segera. Silakan hubungi tim hotline krisis 24 jam atau jadwalkan janji darurat melalui direktori kami.'
              : currentTriage === 'Prioritas'
              ? 'Skor skrining menunjukkan perlunya intervensi sedang. Kami sarankan untuk memesan sesi konseling dengan salah satu psikolog kampus kami.'
              : 'Skor Anda stabil dan berada pada batas aman. Tetap latih teknik manajemen stres mandiri untuk menjaga ketahanan emosional Anda.'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
          <button
            onClick={onNavigateToPrograms}
            className="flex-1 md:flex-none justify-center px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-600" />
            <span>Baca Edukasi</span>
          </button>
          <button
            onClick={onNavigateToSchedule}
            className="flex-1 md:flex-none justify-center px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-2xs transition-all flex items-center gap-1.5"
          >
            <span>Jadwalkan Konseling</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* History log list Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-slate-600" />
            <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Log Riwayat Tes Skrining Lengkap</span>
          </div>
          <button
            onClick={onClearHistory}
            className="text-[10px] text-rose-600 hover:underline font-semibold flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Beri Ruang (Reset Riwayat)
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 font-medium border-b border-slate-200">
                <th className="p-3">Tanggal Tes</th>
                <th className="p-3">Deskripsi / Label</th>
                <th className="p-3 text-center">Skor PHQ-9</th>
                <th className="p-3 text-center">Skor GAD-7</th>
                <th className="p-3 text-center">Status Triase</th>
                <th className="p-3 text-right">Laporan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {screenHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">
                    Belum ada riwayat tes skrining tersimpan di akun Anda.
                  </td>
                </tr>
              ) : (
                screenHistory.map((item) => {
                  const triageB = getTriageBadge(item.triage);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/85 transition-colors">
                      <td className="p-3 font-mono">{item.date}</td>
                      <td className="p-3 text-slate-600">{item.label}</td>
                      <td className="p-3 text-center font-mono">
                        <span className={`px-2 py-0.5 rounded ${item.phq9 >= 15 ? 'bg-rose-50 text-rose-600' : item.phq9 >= 10 ? 'bg-amber-50 text-amber-600' : 'bg-teal-50 text-teal-600'}`}>
                          {item.phq9} / 27
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono">
                        <span className={`px-2 py-0.5 rounded ${item.gad7 >= 15 ? 'bg-rose-50 text-rose-600' : item.gad7 >= 10 ? 'bg-amber-50 text-amber-600' : 'bg-teal-50 text-teal-600'}`}>
                          {item.gad7} / 21
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border ${triageB.bg}`}>
                          <span className={`w-1.2 h-1.2 rounded-full ${triageB.dot}`}></span>
                          {item.triage}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-[10px] text-slate-600 font-normal">Tersimpan di database</span>
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
