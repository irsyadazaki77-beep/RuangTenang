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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<any[]>('/api/v1/appointments?limit=all')
      .then(res => {
        if (Array.isArray(res.data)) {
          setAppointments(res.data);
        } else {
          setAppointments([]);
        }
      })
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }, []);

  const completedSessions = appointments.filter(a => a.status === 'COMPLETED' || a.status === 'Selesai');
  const upcomingSessions = appointments.filter(a => a.status === 'CONFIRMED' || a.status === 'PENDING' || a.status === 'Menunggu Konfirmasi' || a.status === 'Konfirmasi');

  return (
    <div className="space-y-6">
      <div className="p-4 bg-slate-50 rounded-xl text-xs sm:text-sm text-slate-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <span className="font-medium text-slate-800 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-slate-600" />
          Integrasi Pengingat & Tindak Lanjut Pemulihan Mandiri
        </span>
        <span className="font-semibold text-slate-900 bg-white px-2.5 py-1 rounded-md border border-slate-200">
          {completedSessions.length} Sesi Selesai, {upcomingSessions.length} Mendatang
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* Timeline Cards */}
        <div className="md:col-span-7 relative border-l border-slate-200 ml-3 pl-6 space-y-6 pt-2 pb-2">
          {appointments.length === 0 ? (
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-3">
              <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
              <div>
                <h4 className="text-sm font-semibold text-slate-800">Belum Ada Sesi Konseling</h4>
                <p className="text-xs text-slate-500 mt-1">Jadwalkan sesi konsultasi 1-on-1 dengan psikolog kampus untuk pendampingan mental terarah.</p>
              </div>
              {onNavigateToSchedule && (
                <button
                  onClick={onNavigateToSchedule}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-2xs transition-all"
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
                  <span className={`absolute -left-[30px] top-1.5 w-4.5 h-4.5 rounded-full border-[3px] border-white ${isUpcoming ? 'bg-slate-900 ring-2 ring-slate-200' : 'bg-slate-300'}`}></span>
                  <div className={`p-4 rounded-xl space-y-2 border ${isUpcoming ? 'bg-slate-50 border-slate-200 shadow-2xs' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] sm:text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-600" /> {apt.date} • {apt.time || apt.timeSlot}
                      </span>
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider ${isUpcoming ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                        {isUpcoming ? 'Terjadwal' : 'Selesai'}
                      </span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-semibold text-slate-900">
                      Konseling - {apt.counselorName || 'Psikolog Kampus'}
                    </h4>
                    {apt.notes && <p className="text-xs text-slate-600 leading-normal">{apt.notes}</p>}
                    {apt.meetingLink && isUpcoming && (
                      <div className="text-[10px] sm:text-xs text-slate-600 font-mono bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between gap-2 overflow-hidden">
                        <span className="truncate flex items-center gap-1">
                          <Video className="w-3 h-3 text-teal-600" /> Link Sesi
                        </span>
                        <a 
                          href={apt.meetingLink} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-[10px] bg-teal-50 hover:bg-teal-100 text-teal-700 px-2 py-0.5 rounded font-sans font-semibold"
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
        <div className="md:col-span-5 bg-slate-50 rounded-xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold text-slate-900">Program Latihan Mandiri (Rekomendasi Psikolog)</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-normal">
            Selesaikan tugas perawatan diri harian untuk mempercepat pemulihan kognitif Anda dan menyeimbangkan regulasi emosi.
          </p>

          <div className="space-y-2.5">
            {selfCareChecklist.map((item) => (
              <div 
                key={item.id} 
                onClick={() => onToggleSelfCare(item.id)}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-start gap-2.5 ${
                  item.done 
                    ? 'bg-teal-50/55 border-teal-200 text-slate-600 line-through' 
                    : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
                }`}
              >
                <div className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${item.done ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-300 bg-white'}`}>
                  {item.done && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <span className="text-xs font-semibold leading-snug">{item.task}</span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-3 flex items-center justify-between text-xs gap-3">
            <div className="space-y-0.5">
              <span className="text-slate-600 font-semibold block uppercase text-[9px] tracking-wider">Tingkat Penyelesaian</span>
              <span className="text-slate-800 font-bold">{selfCareChecklist.filter(t => t.done).length} dari {selfCareChecklist.length} selesai</span>
            </div>
            <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
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
