import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  CartesianGrid,
  Cell
} from 'recharts';
import { 
  Activity, 
  TrendingUp, 
  Users, 
  ShieldAlert, 
  Clock,
  Inbox
} from 'lucide-react';
import { CounselorStats } from '../types';

interface CounselorAnalyticsProps {
  stats: CounselorStats;
}

const DEFAULT_SEVERITY_COLORS = ['#10B981', '#06B6D4', '#F59E0B', '#EF4444', '#881337'];

export const CounselorAnalytics: React.FC<CounselorAnalyticsProps> = ({ stats }) => {
  const severityData = stats.severityDistribution && stats.severityDistribution.length > 0
    ? stats.severityDistribution.map((item, idx) => ({
        ...item,
        color: item.color || DEFAULT_SEVERITY_COLORS[idx % DEFAULT_SEVERITY_COLORS.length]
      }))
    : [];

  const monthlyTrendData = stats.monthlyTrend || [];
  const hasSeverityData = severityData.some(d => d.count > 0);
  const hasTrendData = monthlyTrendData.some(d => d.screening > 0 || d.counseling > 0 || d.emergency > 0);

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="surface-card p-4 rounded-2xl border border-default shadow-xs space-y-1">
          <div className="flex items-center justify-between text-secondary">
            <span className="text-xs font-semibold">Total Triage Kasus</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-primary">
            {stats.totalTriaged ?? 0}
          </div>
          <p className="text-[11px] text-secondary">
            Berdasarkan skrining &amp; pengajuan mahasiswa
          </p>
        </div>

        <div className="surface-card p-4 rounded-2xl border border-default shadow-xs space-y-1">
          <div className="flex items-center justify-between text-secondary">
            <span className="text-xs font-semibold">Kasus Aktif Ditangani</span>
            <Activity className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-primary">
            {stats.activeCases ?? 0}
          </div>
          <p className="text-[11px] text-secondary">
            Jadwal konseling aktif &amp; dalam penanganan
          </p>
        </div>

        <div className="surface-card p-4 rounded-2xl border border-default shadow-xs space-y-1">
          <div className="flex items-center justify-between text-secondary">
            <span className="text-xs font-semibold">Intervensi Krisis &amp; Darurat</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400">
            {stats.emergencyInterventions ?? 0}
          </div>
          <p className="text-[11px] text-secondary">
            Kasus risiko melukai diri / skor krisis
          </p>
        </div>

        <div className="surface-card p-4 rounded-2xl border border-default shadow-xs space-y-1">
          <div className="flex items-center justify-between text-secondary">
            <span className="text-xs font-semibold">Catatan SOAP Selesai</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-primary">
            {stats.completedNotes ?? 0}
          </div>
          <p className="text-[11px] text-secondary">
            Rekam medis klinis terenkripsi tersimpan
          </p>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Trend Skrining & Konseling Bulanan */}
        <div className="surface-card p-5 rounded-2xl border border-default shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-primary flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              <span>Tren Skrining &amp; Konseling Kampus</span>
            </h3>
            <span className="text-[11px] text-secondary">Berdasarkan data riil</span>
          </div>

          <div className="h-64 w-full">
            {!hasTrendData ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-secondary">
                <Inbox className="w-8 h-8 text-secondary opacity-40 mb-2" />
                <p className="text-xs font-medium">Belum ada riwayat aktivitas konseling bulanan.</p>
                <p className="text-[11px] text-muted mt-0.5">Data grafik akan terisi secara otomatis seiring penggunaan.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      borderRadius: '12px', 
                      border: 'none', 
                      color: '#fff', 
                      fontSize: '12px' 
                    }} 
                  />
                  <Line type="monotone" dataKey="screening" stroke="#6366f1" strokeWidth={2.5} name="Skrining Mahasiswa" />
                  <Line type="monotone" dataKey="counseling" stroke="#06b6d4" strokeWidth={2.5} name="Sesi Konseling" />
                  <Line type="monotone" dataKey="emergency" stroke="#ef4444" strokeWidth={2} name="Kasus Krisis" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Distribusi Tingkat Keparahan Psikometrik */}
        <div className="surface-card p-5 rounded-2xl border border-default shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-primary flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span>Distribusi Tingkat Keparahan (PHQ-9 / GAD-7)</span>
            </h3>
            <span className="text-[11px] text-secondary">N = {stats.totalTriaged ?? 0} Mahasiswa</span>
          </div>

          <div className="h-64 w-full">
            {!hasSeverityData ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-secondary">
                <Inbox className="w-8 h-8 text-secondary opacity-40 mb-2" />
                <p className="text-xs font-medium">Belum ada data skrining yang tercatat.</p>
                <p className="text-[11px] text-muted mt-0.5">Distribusi skor keparahan akan ditampilkan dari hasil skrining aktual.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      borderRadius: '12px', 
                      border: 'none', 
                      color: '#fff', 
                      fontSize: '12px' 
                    }} 
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
