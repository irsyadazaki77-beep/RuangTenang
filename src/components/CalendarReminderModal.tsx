import { useEscapeKey } from '../hooks/useEscapeKey';
import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Download,
  Bell,
  ExternalLink,
  CheckCircle2,
  Clock,
  X,
  Volume2,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { Appointment } from '../types';
import {
  downloadIcsCalendarFile,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  parseAppointmentDateTime,
  getAppointmentReminderPrefs,
  saveAppointmentReminderPrefs,
  triggerNativeNotification,
  playNotificationChime,
  ReminderPreferences
} from '../lib/calendarAndReminders';

interface CalendarReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment?: Appointment | null;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const CalendarReminderModal: React.FC<CalendarReminderModalProps> = ({
  isOpen,
  onClose,
  appointment,
  onShowToast
}) => {
  useEscapeKey(onClose, true);

  const [reminderPrefs, setReminderPrefs] = useState<ReminderPreferences>({
    h24: true,
    h1: true,
    h30m: true,
    h10m: true
  });
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    'default'
  );
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, [isOpen]);

  useEffect(() => {
    if (appointment?.id) {
      const prefs = getAppointmentReminderPrefs(appointment.id);
      setReminderPrefs(prefs);
    }
  }, [appointment]);

  if (!isOpen) return null;

  // Fallback default sample appointment if none supplied
  const defaultApt: Appointment = {
    id: 'demo-apt-1',
    counselorId: 'cons-1',
    counselorName: 'Dr. Anita Rahmawati, M.Psi.',
    counselorTitle: 'Spesialis Kecemasan & Akut',
    counselorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
    studentName: 'Mahasiswa Kampus',
    studentNIM: '2106xxxxxx',
    studentEmail: 'mahasiswa@kampus.ac.id',
    studentPhone: '081234567890',
    date: new Date().toISOString().split('T')[0],
    timeSlot: '10:30 WIB',
    timezone: 'WIB',
    mode: 'video_call',
    primaryConcern: 'Manajemen Stres Akademik & Kecemasan',
    status: 'Konfirmasi',
    approvalStatus: 'APPROVED',
    attendanceStatus: 'SCHEDULED',
    meetingLink: 'https://meet.jit.si/ruangtenang-session-demo',
    reminderEnabled: true,
    reminderMinutesBefore: 10,
    createdAt: new Date().toISOString()
  };

  const currentApt = appointment || defaultApt;
  const timeData = parseAppointmentDateTime(
    currentApt.date,
    currentApt.timeSlot,
    currentApt.timezone
  );

  const handleTogglePref = (key: keyof ReminderPreferences) => {
    const updated = { ...reminderPrefs, [key]: !reminderPrefs[key] };
    setReminderPrefs(updated);
    if (currentApt.id) {
      saveAppointmentReminderPrefs(currentApt.id, updated);
      if (onShowToast) {
        onShowToast('Preferensi pengingat jadwal berhasil diperbarui!', 'success');
      }
    }
  };

  const handleRequestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setNotificationPermission(result);
      if (result === 'granted') {
        if (onShowToast) {
          onShowToast('Izin notifikasi browser berhasil diaktifkan!', 'success');
        }
        playNotificationChime();
      } else {
        if (onShowToast) {
          onShowToast('Izin notifikasi ditolak oleh browser. Anda tetap mendapatkan notifikasi in-app.', 'warning');
        }
      }
    }
  };

  const handleTestNotification = () => {
    setTestSent(true);
    playNotificationChime();
    triggerNativeNotification(
      '🔔 Pengingat Sesi Konseling (Uji Coba)',
      `Sesi konseling Anda dengan ${currentApt.counselorName} dijadwalkan pada ${timeData.formattedLocal}.`
    );
    if (onShowToast) {
      onShowToast(`📢 Notifikasi Uji Coba Terkirim! (Suara Chime & Web Alert)`, 'info');
    }
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center max-sm:items-end p-4 max-sm:p-0 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl max-sm:rounded-b-none border border-slate-200 max-w-lg w-full p-6 max-sm:p-5 space-y-5 shadow-xl relative my-8 max-sm:my-0 animate-scale-up max-sm:animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Drag handle for mobile bottom sheet */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto sm:hidden shrink-0" />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Tutup Modals"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1 pr-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-800 text-amber-400 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Integrasi Kalender & Sistem Pengingat</h2>
              <p className="text-xs text-slate-500">
                Ekspor acara dinamis ke kalender & atur jadwal notifikasi otomatis.
              </p>
            </div>
          </div>
        </div>

        {/* APPOINTMENT SUMMARY CARD */}
        <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700">Jadwal Sesi Konseling:</span>
            <span className="font-mono font-bold text-slate-900 px-2 py-0.5 bg-amber-100 text-amber-900 rounded border border-amber-300">
              {currentApt.date} ({currentApt.timeSlot})
            </span>
          </div>
          <p className="text-slate-600">
            Konselor: <strong className="text-slate-900">{currentApt.counselorName}</strong> ({currentApt.mode})
          </p>
          <p className="text-slate-500 text-[11px] font-mono">
            Standard UTC ISO: {timeData.startUtcIso.split('.')[0]}Z
          </p>
        </div>

        {/* SECTION 1: CALENDAR EXPORTS */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-600" />
            <span>Ekspor Ke Aplikasi Kalender (.ICS / Web)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            {/* Google Calendar */}
            <a
              href={generateGoogleCalendarUrl(currentApt)}
              target="_blank"
              rel="noreferrer"
              className="py-2.5 px-3 min-h-[44px] bg-white hover:bg-slate-100 active:scale-95 text-slate-800 border border-slate-300 rounded-xl font-medium flex items-center justify-center gap-1.5 transition-all shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
              <span>Google Calendar</span>
            </a>

            {/* Outlook */}
            <a
              href={generateOutlookCalendarUrl(currentApt)}
              target="_blank"
              rel="noreferrer"
              className="py-2.5 px-3 min-h-[44px] bg-white hover:bg-slate-100 active:scale-95 text-slate-800 border border-slate-300 rounded-xl font-medium flex items-center justify-center gap-1.5 transition-all shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
              <span>Outlook Web</span>
            </a>

            {/* Download .ICS */}
            <button
              onClick={() => downloadIcsCalendarFile(currentApt)}
              className="py-2.5 px-3 min-h-[44px] bg-slate-800 hover:bg-slate-900 active:scale-95 text-white rounded-xl font-medium flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>File (.ICS)</span>
            </button>
          </div>
        </div>

        {/* SECTION 2: REMINDER SCHEDULER (H-24, H-1, H-10) */}
        <div className="space-y-3 pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-slate-600" />
              <span>Pengingat Otomatis (Scheduler)</span>
            </h3>
            <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
              H-24, H-1, H-30m, H-10m
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 space-y-2.5 text-xs">
            {/* H-24 Jam */}
            <label className="flex items-center justify-between cursor-pointer p-1.5 hover:bg-white rounded-lg transition-colors">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={reminderPrefs.h24}
                  onChange={() => handleTogglePref('h24')}
                  className="w-4 h-4 text-slate-800 rounded border-slate-300 focus:ring-slate-800"
                />
                <div>
                  <div className="font-semibold text-slate-800">Pengingat H-24 Jam</div>
                  <div className="text-[11px] text-slate-500">Notifikasi 24 jam sebelum waktu konseling dimulai</div>
                </div>
              </div>
              <Clock className="w-4 h-4 text-slate-400" />
            </label>

            {/* H-1 Jam */}
            <label className="flex items-center justify-between cursor-pointer p-1.5 hover:bg-white rounded-lg transition-colors border-t border-slate-200/60 pt-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={reminderPrefs.h1}
                  onChange={() => handleTogglePref('h1')}
                  className="w-4 h-4 text-slate-800 rounded border-slate-300 focus:ring-slate-800"
                />
                <div>
                  <div className="font-semibold text-slate-800">Pengingat H-1 Jam</div>
                  <div className="text-[11px] text-slate-500">Notifikasi 1 jam sebelum sesi konseling</div>
                </div>
              </div>
              <Clock className="w-4 h-4 text-slate-400" />
            </label>

            {/* H-30 Menit */}
            <label className="flex items-center justify-between cursor-pointer p-1.5 hover:bg-white rounded-lg transition-colors border-t border-slate-200/60 pt-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={reminderPrefs.h30m}
                  onChange={() => handleTogglePref('h30m')}
                  className="w-4 h-4 text-slate-800 rounded border-slate-300 focus:ring-slate-800"
                />
                <div>
                  <div className="font-semibold text-slate-800">Pengingat H-30 Menit</div>
                  <div className="text-[11px] text-slate-500">Notifikasi 30 menit sebelum sesi konseling</div>
                </div>
              </div>
              <Clock className="w-4 h-4 text-slate-400" />
            </label>

            {/* H-10 Menit */}
            <label className="flex items-center justify-between cursor-pointer p-1.5 hover:bg-white rounded-lg transition-colors border-t border-slate-200/60 pt-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={reminderPrefs.h10m}
                  onChange={() => handleTogglePref('h10m')}
                  className="w-4 h-4 text-slate-800 rounded border-slate-300 focus:ring-slate-800"
                />
                <div>
                  <div className="font-semibold text-slate-800">Pengingat H-10 Menit</div>
                  <div className="text-[11px] text-slate-500">Notifikasi mendesak 10 menit sebelum sesi dimulai</div>
                </div>
              </div>
              <Clock className="w-4 h-4 text-slate-400" />
            </label>
          </div>
        </div>

        {/* SECTION 3: BROWSER PERMISSION & TEST NOTIFICATION */}
        <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-700" />
              <span className="font-semibold text-slate-800">Notifikasi Push Browser:</span>
            </div>
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
              notificationPermission === 'granted'
                ? 'bg-teal-100 text-teal-800 border border-teal-300'
                : 'bg-amber-100 text-amber-800 border border-amber-300'
            }`}>
              {notificationPermission === 'granted' ? 'DIIZINKAN' : 'BELUM DIIZINKAN'}
            </span>
          </div>

          {notificationPermission !== 'granted' && (
            <button
              onClick={handleRequestPermission}
              className="w-full py-2.5 min-h-[44px] bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-semibold rounded-lg transition-all text-xs"
            >
              Izinkan Notifikasi Push Browser
            </button>
          )}

          <div className="flex items-center justify-between pt-1 border-t border-slate-200">
            <span className="text-slate-600">Uji coba pengingat suara & alert:</span>
            <button
              onClick={handleTestNotification}
              disabled={testSent}
              className="px-3 py-2 min-h-[44px] bg-white hover:bg-slate-200 active:scale-95 border border-slate-300 text-slate-800 font-medium rounded-lg flex items-center gap-1.5 transition-all text-xs disabled:opacity-50"
            >
              <Volume2 className="w-3.5 h-3.5 text-teal-600" />
              <span>{testSent ? 'Notifikasi Terkirim!' : 'Uji Coba Notifikasi'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 min-h-[44px] bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-medium rounded-xl text-xs transition-all"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
