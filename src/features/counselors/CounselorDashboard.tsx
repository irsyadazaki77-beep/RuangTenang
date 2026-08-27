import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Users,
  HeartPulse,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Search,
  Filter,
  PieChart,
  ArrowUpRight,
  FileText,
  Download,
  ShieldCheck,
  RefreshCw,
  Activity,
  Globe,
  Award,
  Terminal,
  Lock
} from 'lucide-react';
import { useCounselorAnalytics } from '../../hooks/useCounselorAnalytics';
import { RiskAlert } from '../../types';
import { apiClient } from '../../lib/apiClient';

interface AuditLogEntry {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  userRole?: string;
}

export const CounselorDashboard: React.FC = () => {
  const [riskAlerts, setRiskAlerts] = useState<RiskAlert[]>([]);
  const [searchRisk, setSearchRisk] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('Semua');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');

  const { analytics, loading: analyticsLoading } = useCounselorAnalytics();

  useEffect(() => {
    const fetchRiskAlerts = async () => {
      try {
        const res = await apiClient.get<any>('/api/v1/screenings?limit=100');
        if (res.success) {
          const data = res.data;
          const items = Array.isArray(data) ? data : (data?.data || []);
          
          // Filter high risk (hasSelfHarmRisk or riskLevel tinggi/krisis)
          const risky = items.filter((s: any) => s.hasSelfHarmRisk || s.riskLevel?.toLowerCase() === 'krisis' || s.riskLevel?.toLowerCase() === 'tinggi');
          
          const alerts: RiskAlert[] = risky.map((s: any, idx: number) => {
             const indicators = s.riskIndicators ? (typeof s.riskIndicators === 'string' ? JSON.parse(s.riskIndicators) : s.riskIndicators) : [];
             return {
               id: s.id,
               sessionId: `sess-${s.id.slice(0,4)}`,
               studentAlias: `Mahasiswa Anonim ${s.userId ? s.userId.slice(0, 4) : idx}`,
               university: 'Universitas Indonesia',
               riskLevel: s.riskLevel || 'Tinggi',
               triggers: indicators.length > 0 ? indicators : ['Indikasi krisis sistem'],
               detectedAt: new Date(s.timestamp).toLocaleString('id-ID'),
               status: s.status || 'Menunggu Penanganan',
               phq9Score: s.phq9Score,
               gad7Score: s.gad7Score
             };
          });
          setRiskAlerts(alerts);
        }
      } catch (err) {
        console.error('Failed to fetch screenings for risk alerts', err);
      }
    };
    fetchRiskAlerts();
  }, []);

  const handleUpdateAlertStatus = async (id: string, newStatus: 'Sedang Ditangani' | 'Selesai') => {
    try {
      const res = await apiClient.put(`/api/v1/screenings/${id}`, { status: newStatus });
      if (res.success) {
        setRiskAlerts(prev =>
          prev.map(item => (item.id === id ? { ...item, status: newStatus } : item))
        );
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const exportRiskAuditReportTxt = () => {
    let report = `=== RUANGTENANG - DOKUMEN AUDIT KRISIS & RESIKO KESEHATAN MENTAL ===\n`;
    report += `Tanggal Laporan: ${new Date().toLocaleDateString('id-ID')}\n`;
    report += `Penyusun: Tim Bimbingan Konseling & Layanan Psikologi Perguruan Tinggi\n\n`;
    report += `RINGKASAN SIKLUS:\n`;
    report += `- Total Sesi Konseling Bulan Ini: ${analytics.totalSessionsThisMonth}\n`;
    report += `- Mahasiswa Aktif Minggu Ini: ${analytics.activeStudentsThisWeek}\n`;
    report += `- Kasus Resiko Tinggi Terdeteksi: ${analytics.highRiskCount}\n\n`;
    report += `DAFTAR ANTREAN RESIKO TERDETEKSI:\n`;
    filteredAlerts.forEach((item, index) => {
      report += `${index + 1}. [${item.riskLevel.toUpperCase()}] ${item.studentAlias} (${item.university})\n`;
      report += `   Trigger: ${item.triggers.join(', ')}\n`;
      report += `   Status: ${item.status}\n`;
      report += `   Waktu Deteksi: ${item.detectedAt}\n\n`;
    });

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Audit_Krisis_RuangTenang_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const filteredAlerts = riskAlerts.filter((item) => {
    const matchesSearch =
      item.studentAlias.toLowerCase().includes(searchRisk.toLowerCase()) ||
      item.triggers.some(t => t.toLowerCase().includes(searchRisk.toLowerCase())) ||
      item.university.toLowerCase().includes(searchRisk.toLowerCase());

    const matchesLevel = levelFilter === 'Semua' || item.riskLevel === levelFilter;
    const matchesStatus =
      statusFilter === 'Semua' ||
      (statusFilter === 'Menunggu' && item.status === 'Menunggu Penanganan') ||
      (statusFilter === 'Ditangani' && item.status === 'Sedang Ditangani') ||
      (statusFilter === 'Selesai' && item.status === 'Selesai');

    return matchesSearch && matchesLevel && matchesStatus;
  });

  // Counselor Appointments State
  const [counselorAppts, setCounselorAppts] = useState<any[]>([]);
  const [apptStatusFilter, setApptStatusFilter] = useState<string>('Semua');
  const [apptPage, setApptPage] = useState<number>(1);
  const [apptTotalPages, setApptTotalPages] = useState<number>(1);
  const [apptTotal, setApptTotal] = useState<number>(0);
  const [isLoadingAppts, setIsLoadingAppts] = useState<boolean>(false);

  const fetchCounselorAppointments = async () => {
    setIsLoadingAppts(true);
    try {
      const url = `/api/v1/appointments?status=${apptStatusFilter}&page=${apptPage}&limit=5&format=object`;
      const res = await apiClient.get<any>(url);
      if (res.success && res.data) {
        const json = res.data;
        setCounselorAppts(json.data || []);
        setApptTotalPages(json.totalPages || 1);
        setApptTotal(json.total || 0);
      }
    } catch (e) {
      console.warn('Failed to fetch counselor appointments:', e);
    } finally {
      setIsLoadingAppts(false);
    }
  };

  useEffect(() => {
    fetchCounselorAppointments();
  }, [apptStatusFilter, apptPage]);

  const handleApproveAppointment = async (id: string) => {
    try {
      const res = await apiClient.put(`/api/v1/appointments/${id}`, { status: 'CONFIRMED', approvalStatus: 'APPROVED' });
      if (res.success) {
        fetchCounselorAppointments();
      }
    } catch (e) {
      console.warn('Approve appointment failed:', e);
    }
  };

  const handleRejectAppointment = async (id: string) => {
    try {
      const res = await apiClient.put(`/api/v1/appointments/${id}`, { status: 'REJECTED', approvalStatus: 'REJECTED' });
      if (res.success) {
        fetchCounselorAppointments();
      }
    } catch (e) {
      console.warn('Reject appointment failed:', e);
    }
  };

  if (!analytics) return <div className="p-8 text-center text-slate-500">Memuat dashboard...</div>;

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4 space-y-4">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-lg sm:text-xl font-sans font-semibold tracking-tight text-slate-900">Dasbor Analitik & Layanan Konselor</h1>
          <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
            Pantau tren kecemasan, depresi, triase krisis, dan kelola antrean penanganan mahasiswa.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
            <span>Status Krisis:</span>
            <span className="font-medium text-teal-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-ping"></span>
              Siaga 24 Jam
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur rounded-xl p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-base sm:text-xs text-slate-600 font-medium">Sesi Konseling Bulan Ini</span>
            <div className="p-2 bg-slate-50 text-slate-900 border border-slate-200 rounded-lg">
              <Users className="w-4 h-4 text-slate-700" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-sans font-bold text-slate-900">{analytics.totalSessionsThisMonth}</p>
          <p className="text-[11px] text-teal-600 font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> +12% dari bulan lalu
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-xl p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-base sm:text-xs text-slate-600 font-medium">Kasus Berisiko Tinggi</span>
            <div className="p-2 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-sans font-bold text-rose-500">{analytics.highRiskCount}</p>
          <p className="text-[11px] text-rose-600 font-medium">Perlu penanganan prioritas</p>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-xl p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-base sm:text-xs text-slate-600 font-medium">Rata-rata PHQ-9 (Depresi)</span>
            <div className="p-2 bg-amber-50 text-amber-600 border border-amber-100 rounded-lg">
              <HeartPulse className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-sans font-bold text-slate-900">{analytics.averagePhq9Score} <span className="text-xs text-amber-600 font-normal">(Sedang)</span></p>
          <p className="text-[11px] text-slate-600">Skor rata-rata aktif</p>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-xl p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-base sm:text-xs text-slate-600 font-medium">Rata-rata GAD-7 (Kecemasan)</span>
            <div className="p-2 bg-slate-50 text-slate-900 border border-slate-200 rounded-lg">
              <BarChart3 className="w-4 h-4 text-slate-700" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-sans font-bold text-slate-900">{analytics.averageGad7Score} <span className="text-xs text-teal-600 font-normal">(Sedang)</span></p>
          <p className="text-[11px] text-slate-600">Skor rata-rata kecemasan</p>
        </div>
      </div>

      {/* Visual Analytics Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Screening Severity Breakdown */}
        <div className="bg-white/80 backdrop-blur rounded-xl p-4 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-semibold text-slate-900 text-sm">Distribusi Depresi & Kecemasan</h3>
            <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-medium">Skrining</span>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* Minimal */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Minimal (Stabil)</span>
                <span className="font-semibold text-teal-600">{analytics.screeningDistribution.minimal} Mhs</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-teal-500 rounded-full" style={{ width: '22%' }} />
              </div>
            </div>

            {/* Mild */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Ringan (Kelelahan Ringan)</span>
                <span className="font-semibold text-slate-600">{analytics.screeningDistribution.mild} Mhs</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-400 rounded-full" style={{ width: '38%' }} />
              </div>
            </div>

            {/* Moderate */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Sedang (Perlu Konseling)</span>
                <span className="font-semibold text-amber-600">{analytics.screeningDistribution.moderate} Mhs</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '28%' }} />
              </div>
            </div>

            {/* Severe */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Berat (Pendampingan Intensif)</span>
                <span className="font-semibold text-rose-600">{analytics.screeningDistribution.severe} Mhs</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: '12%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Top Stressors Categories */}
        <div className="bg-white/80 backdrop-blur rounded-xl p-4 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-semibold text-slate-900 text-sm">Pemicu Stres Mahasiswa (Stressors)</h3>
            <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-medium">Topik AI</span>
          </div>

          <div className="space-y-3.5 text-xs">
            {analytics.stressorsBreakdown.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>{item.category}</span>
                  <span className="font-semibold text-slate-800">{item.percentage}% ({item.count})</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-700 rounded-full"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FLAGGED RISK QUEUE */}
      <div className="bg-white/80 backdrop-blur rounded-xl p-4 space-y-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-base font-sans font-bold text-slate-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>Antrean Penanganan Krisis ({filteredAlerts.length})</span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Sesi terindikasi bahaya diri/krisis untuk tindakan proaktif konselor.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-600 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Cari pemicu/kampus..."
                value={searchRisk}
                onChange={(e) => setSearchRisk(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-md pl-8 pr-2 py-1 text-base sm:text-xs text-slate-900 focus:outline-none focus:border-slate-800 w-full sm:w-auto"
              />
            </div>

            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-md px-2 py-1 text-base sm:text-xs text-slate-600 font-medium focus:outline-none"
            >
              <option value="Semua">Risk: Semua</option>
              <option value="Tinggi">Tinggi</option>
              <option value="Sedang">Sedang</option>
              <option value="Rendah">Rendah</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-md px-2 py-1 text-base sm:text-xs text-slate-600 font-medium focus:outline-none"
            >
              <option value="Semua">Status: Semua</option>
              <option value="Menunggu">Menunggu</option>
              <option value="Ditangani">Sedang Ditangani</option>
              <option value="Selesai">Selesai</option>
            </select>

            <button
              onClick={exportRiskAuditReportTxt}
              className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-md text-xs font-medium transition-all active:scale-95"
              title="Unduh Dokumen Audit Krisis (.txt)"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Audit</span>
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          {filteredAlerts.map((alertItem) => (
            <div
              key={alertItem.id}
              className={`p-3 rounded-lg border space-y-2 transition-all text-xs ${
                alertItem.riskLevel === 'Tinggi'
                  ? 'bg-rose-50/80 border-rose-200'
                  : alertItem.riskLevel === 'Sedang'
                  ? 'bg-amber-50/80 border-amber-200'
                  : 'bg-slate-50/80 border-slate-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900 text-sm">{alertItem.studentAlias}</span>
                    <span className="text-[10px] text-slate-600 bg-white px-1.5 py-0.2 rounded border border-slate-300">{alertItem.university}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {alertItem.triggers.map((trig, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-white text-slate-600 text-[10px] font-medium rounded border border-slate-300"
                      >
                        Trigger: "{trig}"
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2 py-1 text-[11px] font-medium rounded border ${
                      alertItem.status === 'Menunggu Penanganan'
                        ? 'bg-rose-500 text-white border-rose-300 animate-pulse'
                        : alertItem.status === 'Sedang Ditangani'
                        ? 'bg-amber-500 text-white border-amber-300'
                        : 'bg-teal-50 text-teal-600 border-teal-200'
                    }`}
                  >
                    {alertItem.status}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs pt-2 border-t border-slate-300/50 gap-2">
                <span className="text-slate-600 text-[11px]">Terdeteksi: {alertItem.detectedAt}</span>

                <div className="flex items-center gap-2">
                  {alertItem.status !== 'Selesai' && (
                    <button
                      onClick={() => handleUpdateAlertStatus(alertItem.id, 'Sedang Ditangani')}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs rounded transition-all shadow-2xs"
                    >
                      Jangkau & Ambil Alih
                    </button>
                  )}
                  {alertItem.status !== 'Selesai' && (
                    <button
                      onClick={() => handleUpdateAlertStatus(alertItem.id, 'Selesai')}
                      className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-medium text-xs rounded transition-all"
                    >
                      Tandai Selesai
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ANTREAN APPOINTMENT & KONFIRMASI JADWAL KONSELOR */}
      <div className="bg-white/80 backdrop-blur rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h2 className="font-sans font-semibold text-slate-900 text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-800" />
              <span>Antrean Scheduling & Konfirmasi Jadwal Konseling ({apptTotal})</span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Kelola pengajuan janji temu dari mahasiswa. Verifikasi status dan konfirmasi slot konseling.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchCounselorAppointments}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAppts ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs & Pagination Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {['Semua', 'PENDING', 'CONFIRMED', 'CANCELLED', 'REJECTED'].map((filter) => (
              <button
                key={filter}
                onClick={() => {
                  setApptStatusFilter(filter);
                  setApptPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg border font-medium transition-all ${
                  apptStatusFilter === filter
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {filter === 'Semua'
                  ? 'Semua Status'
                  : filter === 'PENDING'
                  ? '⏳ Menunggu Konfirmasi'
                  : filter === 'CONFIRMED'
                  ? '✅ Terkonfirmasi'
                  : filter === 'CANCELLED'
                  ? '🚫 Dibatalkan'
                  : '❌ Ditolak'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-slate-600">
            <span>Halaman {apptPage} dari {apptTotalPages}</span>
            <button
              disabled={apptPage <= 1}
              onClick={() => setApptPage(prev => Math.max(1, prev - 1))}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded disabled:opacity-40 font-medium hover:border-slate-400"
            >
              &laquo; Prev
            </button>
            <button
              disabled={apptPage >= apptTotalPages}
              onClick={() => setApptPage(prev => Math.min(apptTotalPages, prev + 1))}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded disabled:opacity-40 font-medium hover:border-slate-400"
            >
              Next &raquo;
            </button>
          </div>
        </div>

        {/* Appointments Table */}
        {isLoadingAppts ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="space-y-3 w-1/2">
                  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                </div>
                <div className="h-8 bg-slate-200 rounded w-24"></div>
              </div>
            ))}
          </div>
        ) : counselorAppts.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl text-slate-500 text-xs">
            Tidak ada jadwal konseling yang sesuai dengan filter.
          </div>
        ) : (
          <>
            {/* Mobile Stacked Cards (sm:hidden) */}
            <div className="sm:hidden space-y-4">
              {counselorAppts.map((appt) => (
                <div key={appt.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                  <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                    <div>
                      <div className="font-semibold text-slate-900">{appt.studentName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">ID: {appt.id}</div>
                      {appt.studentNIM && <div className="text-[10px] text-slate-400">NIM: {appt.studentNIM}</div>}
                    </div>
                    <span className={`px-2.5 py-1 rounded text-[11px] font-medium border inline-block ${
                        appt.status === 'PENDING'
                          ? 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse'
                          : appt.status === 'CONFIRMED'
                          ? 'bg-teal-50 text-teal-700 border-teal-200'
                          : appt.status === 'REJECTED'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {appt.status === 'PENDING' ? '⏳ Menunggu Konfirmasi' : appt.status === 'CONFIRMED' ? '✅ Terkonfirmasi' : appt.status === 'REJECTED' ? '❌ Ditolak' : 'Dibatalkan'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <div>
                      <span className="block text-slate-400 mb-0.5">Konselor</span>
                      <span className="font-medium text-slate-800">{appt.counselorName}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 mb-0.5">Jadwal</span>
                      <span className="font-mono text-slate-800">{appt.date} <br/> {appt.time} {appt.timezone}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg">
                    <span className="block text-slate-400 mb-0.5">Catatan</span>
                    {appt.notes || '-'}
                  </div>

                  <div className="pt-2 flex justify-end">
                    {appt.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2 w-full">
                          <button
                            onClick={() => handleRejectAppointment(appt.id)}
                            className="flex-1 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-300 font-medium rounded transition-all"
                          >
                            Tolak
                          </button>
                          <button
                            onClick={() => handleApproveAppointment(appt.id)}
                            className="flex-1 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded transition-all shadow-2xs"
                          >
                            Konfirmasi
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Selesai Diverifikasi</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (hidden sm:block) */}
            <div className="hidden sm:block overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                    <th className="p-3">ID & Mahasiswa</th>
                    <th className="p-3">Konselor</th>
                    <th className="p-3">Tanggal & Slot Jam</th>
                    <th className="p-3">Keluhan / Catatan</th>
                    <th className="p-3">Status Booking</th>
                    <th className="p-3 text-right">Aksi Verifikasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {counselorAppts.map((appt) => (
                    <tr key={appt.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-medium text-slate-900">
                        <div className="font-semibold text-slate-900">{appt.studentName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">ID: {appt.id}</div>
                        {appt.studentNIM && <div className="text-[10px] text-slate-400">NIM: {appt.studentNIM}</div>}
                      </td>
                      <td className="p-3 text-slate-700">{appt.counselorName}</td>
                      <td className="p-3 font-mono text-slate-800">
                        <div>{appt.date}</div>
                        <div className="text-slate-500 text-[11px]">{appt.time} {appt.timezone}</div>
                      </td>
                      <td className="p-3 text-slate-600 max-w-xs truncate" title={appt.notes}>
                        {appt.notes || '-'}
                      </td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded text-[11px] font-medium border inline-block ${
                          appt.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse'
                            : appt.status === 'CONFIRMED'
                            ? 'bg-teal-50 text-teal-700 border-teal-200'
                            : appt.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {appt.status === 'PENDING' ? '⏳ Menunggu Konfirmasi' : appt.status === 'CONFIRMED' ? '✅ Terkonfirmasi' : appt.status === 'REJECTED' ? '❌ Ditolak' : 'Dibatalkan'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {appt.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleApproveAppointment(appt.id)}
                              className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded transition-all shadow-2xs"
                            >
                              Konfirmasi
                            </button>
                            <button
                              onClick={() => handleRejectAppointment(appt.id)}
                              className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-300 font-medium rounded transition-all"
                            >
                              Tolak
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Selesai Diverifikasi</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

    </div>
  );
};
