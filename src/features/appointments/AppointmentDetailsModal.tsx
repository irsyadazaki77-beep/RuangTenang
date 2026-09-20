import { useEscapeKey } from '../../hooks/useEscapeKey';
import React from 'react';
import { XCircle, FileText, Download, GraduationCap, Calendar, Share2 } from 'lucide-react';
import { Appointment } from '../../types';
import { downloadIcsFile, generateGoogleCalendarUrl } from '../../lib/calendarAndReminders';

interface AppointmentDetailsModalProps {
  appointment: Appointment | null;
  onClose: () => void;
}

export const AppointmentDetailsModal: React.FC<AppointmentDetailsModalProps> = ({
  appointment,
  onClose,
}) => {
  useEscapeKey(onClose, true);

  if (!appointment) return null;

  const handleDownload = () => {
    const blob = new Blob([appointment.notes || ""], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Ringkasan_Konseling_${appointment.studentName}_${appointment.date}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in font-sans">
      <div className="surface-card text-primary rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl relative overflow-hidden border border-default animate-scale-up">
        {/* Header */}
        <div className="p-4 surface-card border-b border-default flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 surface-muted rounded-xl text-teal-700 dark:text-teal-400 border border-default">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-primary text-sm sm:text-base leading-tight">
                Laporan Ringkasan Hasil Konseling
              </h3>
              <p className="text-xs text-secondary font-medium mt-0.5">
                ID Sesi: {appointment.id} | Tanggal: {appointment.date}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-secondary hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Tutup Dokumen"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Doctor Info Block */}
          <div className="p-3.5 surface-muted border border-default rounded-xl flex flex-col sm:flex-row gap-3.5 items-start sm:items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={appointment.counselorAvatar}
                alt={appointment.counselorName}
                width={48}
                height={48}
                loading="lazy"
                decoding="async"
                className="w-11 h-11 rounded-xl object-cover border border-default shadow-3xs"
              />
              <div>
                <h4 className="font-bold text-primary text-sm sm:text-base">{appointment.counselorName}</h4>
                <p className="text-xs text-secondary font-medium">{appointment.counselorTitle}</p>
                <p className="text-[11px] text-secondary font-medium">Status: Selesai</p>
              </div>
            </div>
            <div className="px-2.5 py-1 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-900/50 rounded-lg text-xs font-semibold shrink-0">
              Sesi Selesai (Hadir)
            </div>
          </div>

          {/* Student Metadata Card */}
          <div className="grid grid-cols-2 gap-3 text-xs surface-muted p-3.5 rounded-xl border border-default">
            <div>
              <span className="block text-secondary font-medium mb-0.5">Nama Mahasiswa:</span>
              <span className="font-semibold text-primary">{appointment.studentName}</span>
            </div>
            <div>
              <span className="block text-secondary font-medium mb-0.5">NIM / ID Mahasiswa:</span>
              <span className="font-mono font-semibold text-primary">{appointment.studentNIM || 'N/A'}</span>
            </div>
            <div className="col-span-2 pt-2 border-t border-default">
              <span className="block text-secondary font-medium mb-0.5">Keluhan / Konsentrasi Utama:</span>
              <span className="font-medium text-primary">{appointment.primaryConcern}</span>
            </div>
          </div>

          {/* Summary Text */}
          <div className="space-y-2.5 text-sm text-primary leading-relaxed">
            <h4 className="font-bold text-xs sm:text-sm text-primary border-b border-default pb-1.5 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Catatan Ringkasan & Tindakan Psikologis</span>
            </h4>
            <div className="p-3.5 surface-muted border border-default rounded-xl whitespace-pre-wrap font-sans text-secondary text-xs sm:text-sm leading-relaxed max-h-[250px] overflow-y-auto">
              {appointment.notes || "Belum ada ringkasan yang ditulis untuk sesi ini."}
            </div>
          </div>

          {/* Professional Legal Disclaimer */}
          <div className="p-3 surface-muted border border-default rounded-xl text-[10.5px] text-secondary leading-relaxed">
            <strong>Pernyataan Hukum (Simulasi):</strong> Ini adalah dokumen ringkasan bimbingan konseling simulasi yang diterbitkan oleh sistem RuangTenang Kampus untuk demonstrasi/proyek akademik. Tidak mengandung resep medis nyata, rujukan hukum, atau diagnosis fisik yang mengikat.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 surface-card border-t border-default flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <a
              href={generateGoogleCalendarUrl(appointment)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 min-h-[40px] bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-300 text-xs font-semibold rounded-xl border border-teal-200/80 dark:border-teal-900/60 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Google Calendar</span>
            </a>
            <button
              type="button"
              onClick={() => downloadIcsFile(appointment)}
              className="px-3.5 py-2 min-h-[40px] surface-card hover:bg-slate-100 dark:hover:bg-slate-800 text-secondary text-xs font-semibold rounded-xl border border-default transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Simpan (.ics)</span>
            </button>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleDownload}
              className="px-3.5 py-2 min-h-[40px] surface-card hover:bg-slate-100 dark:hover:bg-slate-800 text-secondary text-xs font-semibold rounded-xl border border-default transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh (.txt)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 min-h-[40px] bg-slate-800 dark:bg-white hover:bg-slate-900 dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
