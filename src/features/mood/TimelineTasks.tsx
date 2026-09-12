import React, { useState, useEffect } from 'react';
import { Clock, Sparkles, Check, Calendar, Video, ArrowRight } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';

interface SelfCareTask {
  id: string;
  task: string;
  done: boolean;
}

interface TimelineTasksProps {
  selfCareChecklist: SelfCareTask[];
  onToggleSelfCare: (id: string) => void;
  onNavigateToSchedule?: () => void;
}

export const TimelineTasks: React.FC<TimelineTasksProps> = ({
  selfCareChecklist,
  onToggleSelfCare,
  onNavigateToSchedule
}) => {
  const [appointments, setAppointments] = useState<any[]>([]);
  
  useEffect(() => {
    apiClient.get<any[]>('/api/v1/appointments?limit=all')
      .then(res => {
        if (Array.isArray(res.data)) {
          setAppointments(res.data);
        } else {
          setAppointments([]);
        }
      })
      .catch(() => setAppointments([]));
  }, []);

  const completedSessions = appointments.filter(a => a.status === 'COMPLETED' || a.status === 'Selesai');
  const upcomingSessions = appointments.filter(a => a.status === 'CONFIRMED' || a.status === 'PENDING' || a.status === 'Menunggu Konfirmasi' || a.status === 'Konfirmasi');

  return (
    <div className="space-y-5">
      <div className="p-3.5 surface-muted rounded-xl text-xs sm:text-sm text-secondary flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-default">
        <span className="font-semibold text-primary flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          Pengingat Sesi & Tindak Lanjut Pemulihan
        </span>
        <span className="font-semibold text-primary surface-card px-2.5 py-1 rounded-md border border-default text-xs">
          {completedSessions.length} Selesai, {upcomingSessions.length} Mendatang
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* Timeline Sessions List */}
        <div className="md:col-span-7 relative border-l border-default ml-2 pl-4 sm:pl-6 space-y-4 pt-1 pb-1">
          {appointments.length === 0 ? (
            <div className="p-5 surface-muted rounded-xl border border-default text-center space-y-3">
              <Calendar className="w-7 h-7 text-secondary mx-auto" />
              <div>
                <h4 className="text-sm font-semibold text-primary">Belum Ada Sesi Konseling</h4>
                <p className="text-xs text-secondary mt-0.5 max-w-sm mx-auto">
                  Jadwalkan sesi konsultasi 1-on-1 dengan psikolog kampus untuk pendampingan mental terarah.
                </p>
              </div>
              {onNavigateToSchedule && (
                <button
                  onClick={onNavigateToSchedule}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 btn-primary text-xs font-semibold rounded-xl shadow-xs transition-all"
                >
                  <span>Jadwalkan Sekarang</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            appointments.map((apt, idx) => {
              const isUpcoming = apt.status === 'CONFIRMED' || apt.status === 'PENDING' || apt.status === 'Menunggu Konfirmasi' || apt.status === 'Konfirmasi';
              return (
                <div key={apt.id || idx} className="relative">
                  <span className={`absolute -left-[23px] sm:-left-[31px] top-2 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${isUpcoming ? 'bg-teal-600 ring-2 ring-teal-200 dark:ring-teal-900' : 'bg-slate-400'}`}></span>
                  <div className={`p-4 rounded-xl space-y-2 border ${isUpcoming ? 'surface-card border-teal-200 dark:border-teal-900 shadow-3xs' : 'surface-card border-default'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] sm:text-xs font-semibold text-primary flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-secondary" /> {apt.date} • {apt.time || apt.timeSlot}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${isUpcoming ? 'bg-teal-600 text-white' : 'surface-muted text-secondary border border-default'}`}>
                        {isUpcoming ? 'Terjadwal' : 'Selesai'}
                      </span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-semibold text-primary">
                      Konseling - {apt.counselorName || 'Psikolog Kampus'}
                    </h4>
                    {apt.notes && <p className="text-xs text-secondary leading-normal">{apt.notes}</p>}
                    {apt.meetingLink && isUpcoming && (
                      <div className="text-xs text-secondary surface-muted p-2 rounded-lg border border-default flex items-center justify-between gap-2 overflow-hidden">
                        <span className="truncate flex items-center gap-1">
                          <Video className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> Link Sesi
                        </span>
                        <a 
                          href={apt.meetingLink} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-xs bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900 text-teal-700 dark:text-teal-300 px-2.5 py-1 rounded-md font-semibold shrink-0"
                        >
                          Buka Ruang Sesi
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Self-Care Checklist Panel */}
        <div className="md:col-span-5 surface-muted rounded-xl p-4 sm:p-5 space-y-3.5 border border-default">
          <div className="flex items-center gap-1.5 border-b border-default pb-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-primary">Latihan Mandiri Harian</span>
          </div>
          <p className="text-[11px] text-secondary leading-normal">
            Selesaikan kebiasaan mikro harian untuk mendukung stabilitas emosi dan fokus studi.
          </p>

          <div className="space-y-2">
            {selfCareChecklist.map((item) => (
              <div 
                key={item.id} 
                onClick={() => onToggleSelfCare(item.id)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                  item.done 
                    ? 'bg-teal-50/50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800 text-secondary line-through' 
                    : 'surface-card border-default text-primary hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${item.done ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-300 dark:border-slate-600 surface-card'}`}>
                  {item.done && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span className="text-xs font-medium leading-snug">{item.task}</span>
              </div>
            ))}
          </div>

          <div className="surface-card rounded-xl border border-default p-3 flex items-center justify-between text-xs gap-3">
            <div className="space-y-0.5">
              <span className="text-secondary font-semibold block uppercase text-[9px] tracking-wider">Tingkat Penyelesaian</span>
              <span className="text-primary font-bold">{selfCareChecklist.filter(t => t.done).length} dari {selfCareChecklist.length} selesai</span>
            </div>
            <div className="w-16 surface-muted rounded-full h-2 overflow-hidden border border-default">
              <div 
                className="bg-teal-500 h-full transition-all duration-300" 
                style={{ width: `${(selfCareChecklist.filter(t => t.done).length / selfCareChecklist.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
