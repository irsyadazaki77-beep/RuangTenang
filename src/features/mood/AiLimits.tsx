import React from 'react';
import { Clock, RotateCcw } from 'lucide-react';

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
    <div className="space-y-4">
      <div className="p-4 surface-muted rounded-xl space-y-3 border border-default">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Kuota Percakapan AI</span>
          </div>
          <span className="px-2.5 py-0.5 bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-[10px] font-semibold rounded-md">
            Tier: {usageStats?.userTier || 'Mahasiswa'}
          </span>
        </div>

        {loadingUsage ? (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
          </div>
        ) : usageStats ? (
          <div className="space-y-3 pt-1">
            <div className="p-3 surface-card rounded-xl border border-default space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-secondary font-medium block uppercase tracking-wider">Hari Ini</span>
                  <span className="text-lg font-bold text-primary">
                    {usageStats.dailyUsage} <span className="text-xs font-normal text-secondary">/ {usageStats.dailyLimit >= 999999 ? 'Unlimited' : `${usageStats.dailyLimit} Pesan`}</span>
                  </span>
                </div>
                <span className="px-2 py-0.5 surface-muted text-secondary text-[9px] font-medium rounded border border-default">
                  Reset Tengah Malam
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="w-full surface-muted rounded-full h-2 overflow-hidden border border-default">
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
                  />
                </div>
                <div className="flex justify-between text-[10px] text-secondary font-medium">
                  <span>{usageStats.dailyLimit >= 999999 ? 'Unlimited' : `${Math.round((usageStats.dailyUsage / usageStats.dailyLimit) * 100)}% Terpakai`}</span>
                  <span>Sisa: {usageStats.dailyLimit >= 999999 ? '∞' : Math.max(0, usageStats.dailyLimit - usageStats.dailyUsage)} pesan</span>
                </div>
              </div>
            </div>

            <button
              onClick={onRefreshUsage}
              className="w-full py-1.5 surface-card hover:surface-muted border border-default rounded-lg text-xs text-secondary hover:text-primary font-medium flex items-center justify-center gap-1 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Segarkan Data Kuota</span>
            </button>
          </div>
        ) : (
          <p className="text-xs text-secondary py-2 text-center">Gagal memuat status kuota.</p>
        )}
      </div>
    </div>
  );
};
