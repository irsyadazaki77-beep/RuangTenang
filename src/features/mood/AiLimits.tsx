import React from 'react';
import { Clock, RotateCcw, TrendingUp, Info } from 'lucide-react';

interface UsageStats {
  userTier: string;
  dailyUsage: number;
  dailyLimit: number;
  weeklyUsage: number;
  weeklyLimit: number;
  weeklyHistory: Array<{ date: string; count: number }>;
}

interface AiLimitsProps {
  usageStats: UsageStats | null;
  loadingUsage: boolean;
  onRefreshUsage: () => void;
}

export const AiLimits: React.FC<AiLimitsProps> = ({
  usageStats,
  loadingUsage,
  onRefreshUsage
}) => {
  return (
    <div className="space-y-6">
      {/* Card 1: Overview and Info */}
      <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-4 shadow-3xs">
        <div className="flex flex-col md:flex-row items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Clock className="w-5.5 h-5.5 text-teal-600" />
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Kuotasi & Batas Obrolan Pendamping AI</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
              RuangTenang menyediakan asisten AI pendamping reflektif untuk mendukung kesejahteraan emosional harian Anda. Guna menjaga alokasi sumber daya API yang adil, mencegah ketergantungan gawai berlebih, serta mendorong konsultasi virtual langsung bila diperlukan, kami menerapkan kuota pesan harian dan mingguan yang dipantau secara berkala.
            </p>
          </div>
          <div className="px-3 py-1.5 bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold rounded-lg shrink-0">
            Tier Akun: <span className="uppercase font-bold">{usageStats?.userTier || 'Free / Student'}</span>
          </div>
        </div>

        {loadingUsage ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          </div>
        ) : usageStats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Daily usage card */}
            <div className="p-4 bg-slate-50 rounded-xl space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs text-slate-600 font-medium block">PENGGUNAAN HARI INI</span>
                  <span className="text-2xl font-bold text-slate-800">
                    {usageStats.dailyUsage} <span className="text-xs font-normal text-slate-600">/ {usageStats.dailyLimit >= 999999 ? 'Tanpa Limit' : `${usageStats.dailyLimit} Pesan`}</span>
                  </span>
                </div>
                <span className="px-2.5 py-1 bg-white text-slate-600 text-[10px] font-semibold rounded-md border border-slate-200 shadow-3xs">
                  {usageStats.dailyLimit >= 999999 ? 'Akses Developer Unlimited' : 'Reset Otomatis Tengah Malam'}
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      usageStats.dailyLimit >= 999999
                        ? 'bg-teal-500'
                        : usageStats.dailyUsage >= usageStats.dailyLimit * 0.9
                        ? 'bg-rose-500'
                        : usageStats.dailyUsage >= usageStats.dailyLimit * 0.7
                        ? 'bg-amber-500'
                        : 'bg-teal-500'
                    }`}
                    style={{ width: `${usageStats.dailyLimit >= 999999 ? 100 : Math.min(100, (usageStats.dailyUsage / usageStats.dailyLimit) * 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600 font-medium">
                  <span>{usageStats.dailyLimit >= 999999 ? 'Unlimited' : `${Math.round((usageStats.dailyUsage / usageStats.dailyLimit) * 100)}% Terpakai`}</span>
                  <span>{usageStats.dailyLimit >= 999999 ? 'Sisa: Tak Terbatas' : `Sisa: ${Math.max(0, usageStats.dailyLimit - usageStats.dailyUsage)} Pesan`}</span>
                </div>
              </div>
            </div>

            {/* Weekly usage card */}
            <div className="p-4 bg-slate-50 rounded-xl space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs text-slate-600 font-medium block">PANTUAN 7 HARI TERAKHIR</span>
                  <span className="text-2xl font-bold text-slate-800">
                    {usageStats.weeklyUsage} <span className="text-xs font-normal text-slate-600">/ {usageStats.weeklyLimit} Pesan</span>
                  </span>
                </div>
                <span className="px-2.5 py-1 bg-white text-slate-600 text-[10px] font-semibold rounded-md border border-slate-200 shadow-3xs">
                  Batas Keamanan Kumulatif
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full bg-slate-800 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (usageStats.weeklyUsage / usageStats.weeklyLimit) * 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600 font-medium">
                  <span>{Math.round((usageStats.weeklyUsage / usageStats.weeklyLimit) * 100)}% Terpakai</span>
                  <span>Sisa: {Math.max(0, usageStats.weeklyLimit - usageStats.weeklyUsage)} Pesan</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-600 italic text-center py-6">Gagal memuat statistik batasan penggunaan.</p>
        )}
      </div>

      {/* Card 2: Visual Chart/Histogram for past 7 days */}
      {!loadingUsage && usageStats && (
        <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-5 shadow-3xs">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
            <span className="text-xs sm:text-sm font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-600" />
              Visualisasi Tren Pesan Mingguan (7 Hari Terakhir)
            </span>
            <button
              onClick={onRefreshUsage}
              className="text-xs font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1 active:scale-95 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Segarkan</span>
            </button>
          </div>

          {/* Bar Chart representing Daily Usage */}
          <div className="pt-2">
            <div className="h-44 flex items-end gap-2 md:gap-4 border-b border-slate-200 pb-2 relative">
              {/* Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[9px] text-slate-300 font-mono">
                <div className="border-t border-dashed border-slate-100 w-full pt-1">Maks ({usageStats.dailyLimit})</div>
                <div className="border-t border-dashed border-slate-100 w-full pt-1">Tengah ({Math.round(usageStats.dailyLimit / 2)})</div>
                <div className="w-full">0</div>
              </div>

              {usageStats.weeklyHistory.map((day, idx) => {
                const pct = Math.min(100, (day.count / usageStats.dailyLimit) * 100);
                const isToday = idx === 6;
                const dateObj = new Date(day.date);
                const dayLabel = dateObj.toLocaleDateString('id-ID', { weekday: 'short' });
                const dateLabel = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center h-full justify-end group relative z-10">
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full mb-1 bg-slate-800 text-white text-[9px] font-semibold py-1 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-sm">
                      {day.count} pesan ({dateLabel})
                    </div>

                    {/* Bar */}
                    <div
                      style={{ height: `${Math.max(4, pct)}%` }}
                      className={`w-full max-w-[28px] rounded-t-sm transition-all duration-500 hover:brightness-95 ${
                        isToday 
                          ? 'bg-teal-600 shadow-sm border border-teal-500' 
                          : day.count > 0 
                          ? 'bg-slate-400' 
                          : 'bg-slate-200/60'
                      }`}
                    ></div>

                    {/* Labels */}
                    <div className="text-[10px] text-slate-600 font-semibold mt-2 select-none text-center">
                      <span className="block md:hidden">{dayLabel}</span>
                      <span className="hidden md:block">{dayLabel}, {dateObj.getDate()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Informative alerts */}
          <div className="bg-amber-50/50 border border-amber-200/70 rounded-xl p-4 flex gap-3 text-xs text-amber-800 leading-relaxed">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-900">Perlu Lebih Banyak Sesi Cerita?</p>
              <p className="text-amber-700/95">
                Asisten AI ini dirancang khusus untuk pendampingan kognitif reflektif tingkat awal. Apabila Anda mendapati limit harian Anda sering habis, hal tersebut bisa menjadi indikator bahwa Anda membutuhkan dukungan komprehensif atau konseling nyata yang lebih terarah. Silakan tinjau tab <strong className="font-semibold text-slate-900">Jadwal & Janji Konseling</strong> untuk berkonsultasi langsung dengan psikolog/konselor bersertifikasi kami di kampus secara gratis.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
