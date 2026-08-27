import { apiClient } from "../lib/apiClient";
import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Zap, ShieldAlert, RefreshCw, ChevronRight, Info, Clock, AlertTriangle } from 'lucide-react';

export interface UsageStatsData {
  dailyLimit: number;
  dailyUsage: number;
  weeklyLimit: number;
  weeklyUsage: number;
  userTier: string;
  isPro: boolean;
  isDeveloper: boolean;
}

interface AiQuotaBadgeProps {
  userId?: string;
  userTier?: string;
  variant?: 'compact' | 'banner' | 'card' | 'composer';
  onOpenSettings?: () => void;
  className?: string;
}

// In-flight request deduplication and memory cache
let cachedUsageStats: UsageStatsData | null = null;
let lastUsageFetchTime = 0;
let inflightUsagePromise: Promise<UsageStatsData | null> | null = null;

async function getCachedUsageStats(force = false): Promise<UsageStatsData | null> {
  const now = Date.now();
  if (!force && cachedUsageStats && now - lastUsageFetchTime < 10000) {
    return cachedUsageStats;
  }
  if (inflightUsagePromise) {
    return inflightUsagePromise;
  }

  inflightUsagePromise = apiClient.get<UsageStatsData>('/api/v1/user/usage-stats')
    .then(res => {
      if (res.success && res.data) {
        const data = res.data;
        const normalized: UsageStatsData = {
          dailyLimit: data.dailyLimit,
          dailyUsage: data.dailyUsage || 0,
          weeklyLimit: data.weeklyLimit,
          weeklyUsage: data.weeklyUsage || 0,
          userTier: data.userTier || 'Free',
          isPro: data.isPro || false,
          isDeveloper: data.isDeveloper || false
        };
        cachedUsageStats = normalized;
        lastUsageFetchTime = Date.now();
        return normalized;
      }
      return cachedUsageStats;
    })
    .catch(err => {
      console.warn('Failed to fetch AI quota stats:', err);
      return cachedUsageStats;
    })
    .finally(() => {
      inflightUsagePromise = null;
    });

  return inflightUsagePromise;
}

export const AiQuotaBadge: React.FC<AiQuotaBadgeProps> = ({
  userId = 'guest',
  userTier = 'Free',
  variant = 'compact',
  onOpenSettings,
  className = ''
}) => {
  const [stats, setStats] = useState<UsageStatsData | null>(() => cachedUsageStats);
  const [loading, setLoading] = useState(!cachedUsageStats);
  const [showPopover, setShowPopover] = useState(false);

  const fetchUsageStats = useCallback(async (force = false) => {
    try {
      const data = await getCachedUsageStats(force);
      if (data) {
        setStats(data);
      }
    } catch (err) {
      console.warn('Failed to update stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsageStats(false);

    const handleQuotaUpdate = () => {
      fetchUsageStats(true);
    };

    window.addEventListener('aiQuotaUpdated', handleQuotaUpdate);
    return () => {
      window.removeEventListener('aiQuotaUpdated', handleQuotaUpdate);
    };
  }, [fetchUsageStats]);

  if (loading && !stats) {
    if (variant === 'compact') {
      return (
        <div className={`h-7 w-24 bg-slate-100 rounded-lg animate-pulse ${className}`} />
      );
    }
    return null;
  }

  if (!stats) return null;

  const isUnlimited = stats.dailyLimit >= 999999 || stats.isDeveloper;
  const remaining = isUnlimited ? Infinity : Math.max(0, stats.dailyLimit - stats.dailyUsage);
  const usagePercentage = isUnlimited ? 0 : Math.min(100, Math.round((stats.dailyUsage / stats.dailyLimit) * 100));

  // Determine status color theme
  let statusTheme = {
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    text: 'text-teal-700',
    progressBg: 'bg-teal-500',
    badgeBg: 'bg-teal-100 text-teal-800',
    iconColor: 'text-teal-600',
    label: 'Normal'
  };

  if (isUnlimited) {
    statusTheme = {
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      text: 'text-indigo-700',
      progressBg: 'bg-indigo-500',
      badgeBg: 'bg-indigo-100 text-indigo-800',
      iconColor: 'text-indigo-600',
      label: 'Developer Unlimited'
    };
  } else if (usagePercentage >= 90) {
    statusTheme = {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-rose-700',
      progressBg: 'bg-rose-500',
      badgeBg: 'bg-rose-100 text-rose-800',
      iconColor: 'text-rose-600',
      label: 'Hampir Habis'
    };
  } else if (usagePercentage >= 70) {
    statusTheme = {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-800',
      progressBg: 'bg-amber-500',
      badgeBg: 'bg-amber-100 text-amber-900',
      iconColor: 'text-amber-600',
      label: 'Sisa Sedikit'
    };
  }

  // VARIANT 1: COMPACT HEADER BADGE (Used in Chat Header)
  if (variant === 'compact') {
    return (
      <div className={`relative inline-block ${className}`}>
        <button
          onClick={() => setShowPopover(!showPopover)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] sm:text-xs font-semibold transition-all cursor-pointer shadow-3xs active:scale-95 ${statusTheme.bg} ${statusTheme.border} ${statusTheme.text}`}
          title="Klik untuk melihat detail kuota AI harian Anda"
        >
          <Sparkles className={`w-3.5 h-3.5 ${statusTheme.iconColor} shrink-0 animate-pulse`} />
          <span className="truncate max-w-[65px] sm:max-w-none">
            {isUnlimited ? (
              <span className="font-bold">Unlimited</span>
            ) : (
              <span>
                ✦ <strong className="font-bold">{remaining}</strong><span className="hidden sm:inline"> Pesan</span>
              </span>
            )}
          </span>
          {!isUnlimited && (
            <div className="w-10 bg-slate-200/80 rounded-full h-1.5 overflow-hidden hidden sm:block shrink-0 ml-0.5">
              <div
                className={`h-full ${statusTheme.progressBg} rounded-full transition-all duration-500`}
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
          )}
        </button>

        {/* Popover Breakdown Modal */}
        {showPopover && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowPopover(false)}
            />
            <div className="absolute top-full right-0 mt-2 w-72 sm:w-80 bg-white border border-slate-200 shadow-xl rounded-2xl p-4 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${statusTheme.bg} ${statusTheme.border} border`}>
                    <Sparkles className={`w-4 h-4 ${statusTheme.iconColor}`} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Kuota Pesan AI Harian</h4>
                    <p className="text-[10px] text-slate-500">
                      Tier: <span className="font-semibold text-teal-700 uppercase">{stats.userTier}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={fetchUsageStats}
                  className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
                  title="Segarkan Kuota"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="py-3 space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-600 font-medium">Status Penggunaan</span>
                  <span className="text-sm font-bold text-slate-900">
                    {isUnlimited ? 'Tanpa Batas' : `${stats.dailyUsage} / ${stats.dailyLimit} Pesan`}
                  </span>
                </div>

                {!isUnlimited && (
                  <div className="space-y-1">
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-200/60">
                      <div
                        className={`h-full ${statusTheme.progressBg} rounded-full transition-all duration-500`}
                        style={{ width: `${usagePercentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10.5px] text-slate-500 font-medium pt-0.5">
                      <span>{usagePercentage}% Terpakai</span>
                      <span>Sisa: {remaining} Pesan</span>
                    </div>
                  </div>
                )}

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150/70 text-[11px] text-slate-600 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>Reset Otomatis</span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 leading-tight">
                    Kuota harian diperbarui secara otomatis setiap pukul 00:00 WIB.
                  </p>
                </div>

                {usagePercentage >= 70 && !isUnlimited && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Sisa kuota pesan Anda terbatas.</p>
                      <p className="text-[10.5px] text-amber-800 leading-tight">
                        Tingkatkan paket ke <strong className="font-semibold">Pendamping Pro</strong> (100 pesan/hari) di Pengaturan.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {onOpenSettings && (
                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setShowPopover(false);
                      onOpenSettings();
                    }}
                    className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <span>Atur Paket & Kuota</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // VARIANT 2: COMPOSER SUBTLE INDICATOR (Used above chat composer)
  if (variant === 'composer') {
    if (isUnlimited) return null;
    return (
      <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-all ${statusTheme.bg} ${statusTheme.border} ${statusTheme.text} ${className}`}>
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className={`w-3.5 h-3.5 ${statusTheme.iconColor} shrink-0`} />
          <span className="truncate">
            Sisa Kuota Hari Ini: <strong className="font-bold">{remaining}</strong> dari {stats.dailyLimit} Pesan AI
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full ${statusTheme.progressBg} rounded-full transition-all duration-300`}
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
          {usagePercentage >= 80 && onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="text-[10px] font-bold text-teal-700 underline hover:text-teal-800 cursor-pointer"
            >
              Upgrade
            </button>
          )}
        </div>
      </div>
    );
  }

  // VARIANT 3: CARD VIEW (Used in Settings / Sidebar / Mood Page)
  return (
    <div className={`p-4 bg-white border border-slate-200 rounded-xl shadow-3xs space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${statusTheme.bg} ${statusTheme.border} border`}>
            <Sparkles className={`w-4.5 h-4.5 ${statusTheme.iconColor}`} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Pemantau Kuota AI Harian</h4>
            <span className="text-[10.5px] text-slate-500 font-medium">
              Tier: <span className="font-bold text-teal-700 uppercase">{stats.userTier}</span>
            </span>
          </div>
        </div>
        <button
          onClick={fetchUsageStats}
          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors text-xs flex items-center gap-1 font-medium"
          title="Segarkan data kuota"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-baseline">
          <span className="text-xs font-semibold text-slate-700">Pesan Terpakai Hari Ini</span>
          <span className="text-base font-bold text-slate-900">
            {isUnlimited ? 'Tak Terbatas' : `${stats.dailyUsage} / ${stats.dailyLimit} Pesan`}
          </span>
        </div>

        {!isUnlimited && (
          <div className="space-y-1">
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200">
              <div
                className={`h-full ${statusTheme.progressBg} rounded-full transition-all duration-500`}
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 font-medium">
              <span>{usagePercentage}% Terpakai</span>
              <span className="font-semibold text-slate-700">Sisa {remaining} Pesan</span>
            </div>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-slate-400" /> Reset otomatis 00:00 WIB
        </span>
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="text-teal-600 font-semibold hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>Atur Paket</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
