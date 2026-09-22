import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Search, 
  Filter, 
  UserCheck, 
  FileEdit, 
  Clock, 
  CheckCircle2
} from 'lucide-react';
import { TriageItem, RiskLevel } from '../types';

interface TriageQueueProps {
  items: TriageItem[];
  loading: boolean;
  onSelectStudent: (item: TriageItem) => void;
  onCreateSoapNote: (item: TriageItem) => void;
  onUpdateStatus: (id: string, status: 'IN_PROGRESS' | 'RESOLVED' | 'REFERRED') => void;
}

export const TriageQueue: React.FC<TriageQueueProps> = ({
  items,
  loading,
  onSelectStudent,
  onCreateSoapNote,
  onUpdateStatus
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filteredItems = items.filter((item) => {
    const matchesSearch = (item.studentName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.studentEmail || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.university || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRisk = filterRisk === 'ALL' || item.riskLevel === filterRisk;
    const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;
    return matchesSearch && matchesRisk && matchesStatus;
  });

  const getRiskBadge = (risk: RiskLevel, suicideRisk?: boolean) => {
    if (suicideRisk || risk === 'CRITICAL') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200 border border-rose-300 dark:border-rose-800 animate-pulse">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
          KRISIS TINGGI
        </span>
      );
    }
    switch (risk) {
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Risiko Berat
          </span>
        );
      case 'MODERATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-950/80 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-800">
            <Clock className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
            Risiko Sedang
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Risiko Rendah
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900">Selesai</span>;
      case 'IN_PROGRESS':
        return <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900">Sedang Ditangani</span>;
      case 'REFERRED':
        return <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-900">Dirujuk RS</span>;
      default:
        return <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-900">Menunggu Triage</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="surface-card p-4 rounded-2xl border border-default shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama, email, atau universitas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-default surface-muted rounded-xl text-primary focus:outline-none focus:border-indigo-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <div className="flex items-center gap-1.5 text-xs text-secondary shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>Tingkat Risiko:</span>
          </div>
          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-default surface-muted rounded-xl text-primary focus:outline-none focus:border-indigo-600"
          >
            <option value="ALL">Semua Risiko</option>
            <option value="CRITICAL">Krisis & Darurat</option>
            <option value="HIGH">Risiko Berat</option>
            <option value="MODERATE">Risiko Sedang</option>
            <option value="MILD">Risiko Rendah</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-default surface-muted rounded-xl text-primary focus:outline-none focus:border-indigo-600"
          >
            <option value="ALL">Semua Status</option>
            <option value="PENDING">Menunggu</option>
            <option value="IN_PROGRESS">Ditangani</option>
            <option value="REFERRED">Dirujuk</option>
            <option value="RESOLVED">Selesai</option>
          </select>
        </div>
      </div>

      {/* Queue List */}
      {loading ? (
        <div className="surface-card p-12 rounded-2xl border border-default text-center text-secondary text-xs flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span>Memuat antrean triage skrining klinis...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="surface-card p-12 rounded-2xl border border-default text-center text-secondary text-xs space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h4 className="font-bold text-sm text-primary">Tidak Ada Kasus Dalam Antrean</h4>
          <p className="text-secondary max-w-sm mx-auto">
            Semua skrining mahasiswa dan permohonan konseling klinis telah tertangani atau tidak cocok dengan filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`surface-card p-4 sm:p-5 rounded-2xl border transition-all duration-200 hover:shadow-md ${
                item.riskLevel === 'CRITICAL' || item.suicideRisk
                  ? 'border-rose-300 dark:border-rose-900/70 bg-rose-50/20 dark:bg-rose-950/10'
                  : 'border-default'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Student Info & Risk Metrics */}
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="font-bold text-sm sm:text-base text-primary">
                      {item.studentName}
                    </h3>
                    {getRiskBadge(item.riskLevel, item.suicideRisk)}
                    {getStatusBadge(item.status)}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-secondary">
                    <span>{item.studentEmail}</span>
                    <span>•</span>
                    <span>{item.university || 'Universitas Indonesia'}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(item.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  {/* Clinical Scores Indicator */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    {item.phq9Score !== undefined && (
                      <div className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-medium border border-default">
                        <span className="text-secondary mr-1">Skor Depresi (PHQ-9):</span>
                        <span className="font-bold text-primary">{item.phq9Score}/27</span>
                        <span className="text-slate-400 ml-1">({item.phq9Severity || 'Skrining'})</span>
                      </div>
                    )}
                    {item.gad7Score !== undefined && (
                      <div className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-medium border border-default">
                        <span className="text-secondary mr-1">Skor Kecemasan (GAD-7):</span>
                        <span className="font-bold text-primary">{item.gad7Score}/21</span>
                        <span className="text-slate-400 ml-1">({item.gad7Severity || 'Skrining'})</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Counselor Action Triggers */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                  <button
                    type="button"
                    onClick={() => onCreateSoapNote(item)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <FileEdit className="w-3.5 h-3.5" />
                    <span>Catat SOAP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectStudent(item)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold surface-muted border border-default hover:bg-slate-100 dark:hover:bg-slate-800 text-primary flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Detail Kasus</span>
                  </button>

                  <div className="relative group">
                    <select
                      value={item.status}
                      onChange={(e) => onUpdateStatus(item.id, e.target.value as any)}
                      className="px-2.5 py-2 rounded-xl text-xs font-medium surface-muted border border-default text-secondary hover:text-primary focus:outline-none cursor-pointer"
                    >
                      <option value="PENDING">Menunggu</option>
                      <option value="IN_PROGRESS">Ditangani</option>
                      <option value="REFERRED">Rujuk RS</option>
                      <option value="RESOLVED">Selesai</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
