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
  CartesianGrid 
} from 'recharts';
import { 
  Activity, 
  TrendingUp, 
  Users, 
  ShieldAlert, 
  Clock 
} from 'lucide-react';
import { CounselorStats } from '../types';

interface CounselorAnalyticsProps {
  stats: CounselorStats;
}

const severityData = [
  { name: 'Minimal / Normal', count: 324, color: '#10B981' },
  { name: 'Ringan (Mild)', count: 186, color: '#06B6D4' },
  { name: 'Sedang (Moderate)', count: 98, color: '#F59E0B' },
  { name: 'Berat (Severe)', count: 42, color: '#EF4444' },
  { name: 'Krisis / Suisiditas', count: 11, color: '#881337' }
];

const monthlyTrendData = [
  { month: 'Apr', screening: 85, counseling: 28, emergency: 2 },
  { month: 'Mei', screening: 120, counseling: 45, emergency: 4 },
  { month: 'Jun (UTS)', screening: 240, counseling: 78, emergency: 7 },
  { month: 'Jul', screening: 160, counseling: 52, emergency: 3 },
  { month: 'Agu', screening: 195, counseling: 64, emergency: 5 },
  { month: 'Sep (UAS/Skripsi)', screening: 310, counseling: 104, emergency: 9 }
];

export const CounselorAnalytics: React.FC<CounselorAnalyticsProps> = ({ stats }) => {
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
            {stats.totalTriaged || 661}
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            +18% dari bulan lalu
          </p>
        </div>

        <div className="surface-card p-4 rounded-2xl border border-default shadow-xs space-y-1">
          <div className="flex items-center justify-between text-secondary">
            <span className="text-xs font-semibold">Kasus Aktif Ditangani</span>
            <Activity className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-primary">
            {stats.activeCases || 48}
          </div>
          <p className="text-[11px] text-secondary">
            Dalam pendampingan CBT aktif
          </p>
        </div>

        <div className="surface-card p-4 rounded-2xl border border-default shadow-xs space-y-1">
          <div className="flex items-center justify-between text-secondary">
            <span className="text-xs font-semibold">Intervensi Krisis & Darurat</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400">
            {stats.emergencyInterventions || 11}
          </div>
          <p className="text-[11px] text-secondary">
            Protokol tanggap darurat 24/7
          </p>
        </div>

        <div className="surface-card p-4 rounded-2xl border border-default shadow-xs space-y-1">
          <div className="flex items-center justify-between text-secondary">
            <span className="text-xs font-semibold">Rata-rata Waktu Tanggap</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-primary">
            {stats.averageResponseTimeHours ? `${stats.averageResponseTimeHours} jam` : '1.4 jam'}
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            SLA &lt; 4 jam terpenuhi (99.2%)
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
              <span>Tren Skrining & Konseling Kampus</span>
            </h3>
            <span className="text-[11px] text-secondary">Semester Berjalan</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
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
          </div>
        </div>

        {/* Distribusi Tingkat Keparahan Psikometrik */}
        <div className="surface-card p-5 rounded-2xl border border-default shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-primary flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span>Distribusi Tingkat Keparahan (PHQ-9 / GAD-7)</span>
            </h3>
            <span className="text-[11px] text-secondary">N = 661 Mahasiswa</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
                <YAxis tick={{ fontSize: 11 }} />
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
          </div>
        </div>
      </div>
    </div>
  );
};
