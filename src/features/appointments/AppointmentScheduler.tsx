import { useEscapeKey } from '../../hooks/useEscapeKey';
import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Calendar as CalendarIcon,
  Clock,
  Video,
  Bell,
  BellRing,
  Download,
  ExternalLink,
  XCircle,
  Plus,
  FileText,
  MessageSquare,
  User,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Appointment, Counselor, UserSession } from '../../types';
import { useCounselors } from '../../hooks/useCounselors';
import { useToast } from '../../components/Toast';
import { apiClient } from '../../lib/apiClient';

// Sub-components
import { BookingForm } from './BookingForm';
import { RescheduleModal } from './RescheduleModal';
import { CounselorChatSimulation } from './CounselorChatSimulation';
import { AppointmentDetailsModal } from './AppointmentDetailsModal';
import { VideoConsultationRoom } from './VideoConsultationRoom';
import { CalendarReminderModal } from '../../components/CalendarReminderModal';
import {
  downloadIcsCalendarFile,
  generateGoogleCalendarUrl,
  getAppointmentReminderPrefs,
  saveAppointmentReminderPrefs,
  triggerNativeNotification,
  parseAppointmentDateTime
} from '../../lib/calendarAndReminders';

interface AppointmentSchedulerProps {
  selectedCounselorFromDir: Counselor | null;
  userSession: UserSession;
  setUserSession: React.Dispatch<React.SetStateAction<UserSession>>;
}

const APPOINTMENTS_STORAGE_KEY = 'ruangtenang_appointments';

export const AppointmentScheduler: React.FC<AppointmentSchedulerProps> = ({
  selectedCounselorFromDir,
  userSession,
  setUserSession
}) => {
  const { showToast } = useToast();
  const { counselors, loading: counselorsLoading } = useCounselors();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  useEscapeKey(() => setShowLimitModal(false), showLimitModal);

  // Modal and focus tracking states (for progressive disclosure)
  const [rescheduleApt, setRescheduleApt] = useState<Appointment | null>(null);
  const [activeChatApt, setActiveChatApt] = useState<Appointment | null>(null);
  const [activeVideoApt, setActiveVideoApt] = useState<Appointment | null>(null);
  const [activeSummaryApt, setActiveSummaryApt] = useState<Appointment | null>(null);
  const [selectedCalendarApt, setSelectedCalendarApt] = useState<Appointment | null>(null);
  const [cancelModalAptId, setCancelModalAptId] = useState<string | null>(null);

  // Real-time Appointment Status Updates (SSE)
  useEffect(() => {
    if (!userSession || userSession.role === 'guest') {
      return;
    }

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/v1/appointments/stream', { withCredentials: true });
      
      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data && data.id) {
            setAppointments(prev => prev.map(a => {
              if (a.id === data.id) {
                return {
                  ...a,
                  status: data.status === 'PENDING' ? 'Menunggu Konfirmasi' : data.status === 'CONFIRMED' ? 'Konfirmasi' : data.status === 'CANCELLED' ? 'Dibatalkan' : data.status === 'REJECTED' ? 'Ditolak' : 'Selesai',
                  approvalStatus: data.approvalStatus,
                  attendanceStatus: data.attendanceStatus,
                  notes: data.notes || a.notes,
                  mode: data.mode || a.mode,
                  date: data.date || a.date,
                  timeSlot: (data.time && data.timezone) ? `${data.time} ${data.timezone}` : a.timeSlot
                };
              }
              return a;
            }));
            showToast(`Pembaruan: Status janji temu Anda telah diubah menjadi ${data.status}.`, 'info');
          }
        } catch (err) {
          console.warn('Failed to parse SSE data', err);
        }
      };

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
        }
      };
    } catch (e) {
      console.warn('SSE connection initialization error', e);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [userSession?.role, showToast]);

  // Active Reminder Scheduler Interval
  useEffect(() => {
    if (appointments.length === 0) return;

    const checkScheduledReminders = () => {
      const now = Date.now();
      appointments.forEach(apt => {
        if (apt.status === 'Dibatalkan' || apt.status === 'Ditolak') return;

        const prefs = getAppointmentReminderPrefs(apt.id);
        const timeData = parseAppointmentDateTime(apt.date, apt.timeSlot, apt.timezone);
        const startMs = timeData.startDate.getTime();
        const diffMs = startMs - now;

        // H-24 Jam threshold (24 hours = 86,400,000 ms)
        if (prefs.h24 && !prefs.h24Sent && diffMs <= 86400000 && diffMs > 82800000) {
          prefs.h24Sent = true;
          saveAppointmentReminderPrefs(apt.id, prefs);
          triggerNativeNotification(
            '🔔 Pengingat H-24 Jam Konseling',
            `Besok Anda memiliki jadwal konseling dengan ${apt.counselorName} pukul ${apt.timeSlot}.`
          );
          showToast(`🔔 Pengingat H-24 Jam: Konseling dengan ${apt.counselorName} besok pukul ${apt.timeSlot}.`, 'info');
        }

        // H-1 Jam threshold (1 hour = 3,600,000 ms)
        if (prefs.h1 && !prefs.h1Sent && diffMs <= 3600000 && diffMs > 1800000) {
          prefs.h1Sent = true;
          saveAppointmentReminderPrefs(apt.id, prefs);
          triggerNativeNotification(
            '🔔 Pengingat H-1 Jam Konseling',
            `Sesi konseling Anda dengan ${apt.counselorName} akan dimulai dalam 1 jam!`
          );
          showToast(`🔔 Pengingat H-1 Jam: Sesi konseling dengan ${apt.counselorName} dimulai 1 jam lagi.`, 'warning');
        }

        // H-30 Menit threshold (30 mins = 1,800,000 ms)
        if (prefs.h30m && !prefs.h30mSent && diffMs <= 1800000 && diffMs > 600000) {
          prefs.h30mSent = true;
          saveAppointmentReminderPrefs(apt.id, prefs);
          triggerNativeNotification(
            '🔔 Pengingat H-30 Menit Konseling',
            `Sesi konseling Anda dengan ${apt.counselorName} akan dimulai dalam 30 menit.`
          );
          showToast(`🔔 Pengingat H-30m: Sesi dengan ${apt.counselorName} dimulai 30 menit lagi.`, 'warning');
        }

        // H-10 Menit threshold (10 mins = 600,000 ms)
        if (prefs.h10m && !prefs.h10mSent && diffMs <= 600000 && diffMs > 0) {
          prefs.h10mSent = true;
          saveAppointmentReminderPrefs(apt.id, prefs);
          triggerNativeNotification(
            '🚨 Pengingat H-10 Menit Konseling!',
            `Sesi konseling Anda dengan ${apt.counselorName} akan dimulai dalam 10 menit. Bersiaplah!`
          );
          showToast(`🚨 Pengingat H-10m: Sesi dengan ${apt.counselorName} dimulai 10 menit lagi!`, 'warning');
        }
      });
    };

    checkScheduledReminders();
    const intervalId = setInterval(checkScheduledReminders, 30000);
    return () => clearInterval(intervalId);
  }, [appointments]);

  // Notification Status
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    'default'
  );

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    // Load appointments from persistent backend API
    apiClient.get<any[]>('/api/v1/appointments?limit=all')
      .then(res => {
        const data = res.data;
        if (Array.isArray(data) && data.length > 0 && counselors.length > 0) {
          const formatted: Appointment[] = data.map((item: any) => {
            const counselor = counselors.find(c => c.id === item.counselorId) || counselors[0];
            return {
              id: item.id,
              counselorId: counselor.id,
              counselorName: counselor.name,
              counselorTitle: counselor.title,
              counselorAvatar: counselor.avatar,
              studentName: item.studentName || 'Mahasiswa',
              studentNIM: item.studentNIM || '',
              studentEmail: item.studentEmail || 'mahasiswa@kampus.ac.id',
              studentPhone: '0812xxxxxx',
              date: item.date,
              timeSlot: `${item.time} ${item.timezone || 'WIB'}`,
              timezone: item.timezone || 'WIB',
              mode: item.mode || 'video_call',
              primaryConcern: item.notes || 'Konseling Mental',
              status: item.status === 'PENDING' ? 'Menunggu Konfirmasi' : item.status === 'CONFIRMED' ? 'Konfirmasi' : item.status === 'CANCELLED' ? 'Dibatalkan' : item.status === 'REJECTED' ? 'Ditolak' : 'Selesai',
              approvalStatus: item.approvalStatus || 'PENDING_APPROVAL',
              attendanceStatus: item.attendanceStatus || 'SCHEDULED',
              meetingLink: item.meetingLink || `https://meet.jit.si/ruangtenang-session-${item.id}`,
              reminderEnabled: true,
              reminderMinutesBefore: 30,
              createdAt: item.createdAt
            };
          });
          setAppointments(formatted);
        } else {
          setAppointments([]);
        }
      })
      .catch(err => {
        console.warn('Backend API appointments fetch error:', err);
        setAppointments([]);
      });
  }, [counselors]);

  useEffect(() => {
    if (selectedCounselorFromDir) {
      setIsBookingOpen(true);
    }
  }, [selectedCounselorFromDir]);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      showToast('Browser Anda tidak mendukung Web Push Notification.', 'error');
      return;
    }
    const perm = await Notification.requestPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      new Notification('Pengingat Sesi RuangTenang Aktif', {
        body: 'Sistem notifikasi pengingat sesi konseling psikolog berhasil diaktifkan.',
        icon: '/favicon.ico'
      });
    }
  };

  const triggerTestNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🔔 Pengingat Sesi Konseling Psikolog', {
        body: 'Sesi konseling Anda bersama Dr. Anita Rahmawati akan dimulai dalam 30 menit.',
        icon: '/favicon.ico'
      });
    } else {
      showToast('Peringatan: Sesi konseling Anda akan dimulai dalam 30 menit! (Notifikasi Browser aktif)', 'warning');
    }
  };

  const confirmCancelAppointment = async (id: string) => {
    try {
      const res = await apiClient.put(`/api/v1/appointments/${id}`, {
        status: 'CANCELLED',
        attendanceStatus: 'CANCELLED'
      });

      if (!res.success) {
        showToast(res.error || 'Gagal membatalkan jadwal di server.', 'error');
        return;
      }

      setAppointments(prev => prev.map(a => {
        if (a.id === id) {
          return { ...a, status: 'Dibatalkan' as const, attendanceStatus: 'CANCELLED' as const };
        }
        return a;
      }));
      setCancelModalAptId(null);
      showToast('Jadwal konseling berhasil dibatalkan.', 'success');
    } catch (e: any) {
      console.warn('Backend cancel failed:', e);
      showToast('Terjadi kesalahan saat membatalkan jadwal konseling.', 'error');
    }
  };

  const handleCancelAppointment = (id: string) => {
    setCancelModalAptId(id);
  };

  const handleAddAppointment = (newApt: Appointment) => {
    setAppointments(prev => [newApt, ...prev.filter(a => a.id !== newApt.id)]);
    setUserSession(prev => ({
      ...prev,
      usageStats: {
        ...prev.usageStats,
        appointmentsBooked: prev.usageStats.appointmentsBooked + 1
      }
    }));
  };

  const handleReschedule = async (appointmentId: string, newDate: string, newTime: string, newTimezone: 'WIB' | 'WITA' | 'WIT') => {
    const newTimeSlot = `${newTime} ${newTimezone}`;

    try {
      const res = await apiClient.post<{ success: boolean; record?: any; message?: string }>(`/api/v1/appointments/${appointmentId}/reschedule`, {
        date: newDate,
        time: newTime,
        timezone: newTimezone,
      });

      if (!res.success) {
        throw new Error(res.error || 'Gagal mengubah jadwal konseling.');
      }

      const rec = (res.data as any)?.record;
      setAppointments(prev => prev.map(a => {
        if (a.id === appointmentId) {
          return {
            ...a,
            date: rec?.date || newDate,
            timeSlot: `${rec?.time || newTime} ${rec?.timezone || newTimezone}`,
            timezone: (rec?.timezone || newTimezone) as 'WIB' | 'WITA' | 'WIT',
            status: 'Menunggu Konfirmasi' as const,
            approvalStatus: 'PENDING_APPROVAL' as const,
            attendanceStatus: 'RESCHEDULED' as const
          };
        }
        return a;
      }));

      showToast(`Jadwal Berhasil Diubah ke Tanggal ${newDate} Pukul ${newTimeSlot}! (Menunggu konfirmasi ulang)`, 'success');
    } catch (e: any) {
      console.warn('Backend reschedule failed:', e);
      showToast(e.message || 'Gagal mengubah jadwal.', 'error');
      throw e;
    }
  };

  const handleCompleteSession = async (appointmentId: string, summaryNotes: string) => {
    try {
      const res = await apiClient.put(`/api/v1/appointments/${appointmentId}`, {
        status: 'Selesai',
        attendanceStatus: 'ATTENDED',
        notes: summaryNotes
      });

      if (!res.success) {
        showToast(res.error || 'Gagal memperbarui status sesi di server.', 'error');
        return;
      }

      setAppointments(prev => prev.map(a => {
        if (a.id === appointmentId) {
          return {
            ...a,
            status: 'Selesai' as const,
            attendanceStatus: 'ATTENDED' as const,
            notes: summaryNotes
          };
        }
        return a;
      }));
      showToast('Sesi konseling telah ditandai selesai.', 'success');
    } catch (err) {
      console.warn('Sync complete session with backend failed:', err);
      showToast('Terjadi kesalahan saat memperbarui status sesi.', 'error');
    }
  };

  const downloadIcsFile = (apt: Appointment) => {
    downloadIcsCalendarFile(apt);
  };

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4 space-y-4">
      {/* Header */}
      <div className="surface-card rounded-xl p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-semibold text-lg text-primary">Jadwal Anda</h2>
          <p className="text-xs text-secondary max-w-xl leading-relaxed">
            Kelola pengajuan jadwal bimbingan konseling.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBookingOpen(true)}
            className="w-full sm:w-auto px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5 active:scale-95 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Buat Jadwal Baru</span>
          </button>
        </div>
      </div>

      {/* Notification Banner Controls */}
      <div className="surface-card rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm border border-default">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-md border border-amber-200 dark:border-amber-900/50 shrink-0">
            <BellRing className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <h3 className="font-medium text-primary text-xs">Sistem Notifikasi Pengingat Pertemuan</h3>
            <p className="text-[11px] text-secondary mt-0.5">
              Status Browser:{' '}
              <span className={`font-medium ${notificationPermission === 'granted' ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {notificationPermission === 'granted' ? 'Aktif' : 'Belum Diizinkan'}
              </span>
            </p>
          </div>
        </div>

        <div className="w-full sm:w-auto flex items-center gap-2 shrink-0">
          {notificationPermission !== 'granted' ? (
            <button
              onClick={requestNotificationPermission}
              className="w-full sm:w-auto px-4 py-2 min-h-[40px] bg-amber-500 hover:bg-[#B77C00] text-white font-medium text-xs rounded-lg transition-all shadow-2xs flex items-center justify-center cursor-pointer"
            >
              Aktifkan Notifikasi
            </button>
          ) : (
            <button
              onClick={triggerTestNotification}
              className="px-4 py-2 min-h-[40px] surface-card hover:bg-slate-100 dark:hover:bg-slate-800 text-primary border border-default font-medium text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              <span>Uji Coba Pengingat</span>
            </button>
          )}
        </div>
      </div>

      {/* APPOINTMENTS LIST / RIWAYAT APPOINTMENT (with progressive disclosure) */}
      <div className="space-y-6">
        <h2 className="font-sans font-semibold tracking-tight text-xl text-primary flex items-center gap-2 border-b border-default pb-3">
          <CalendarCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <span>Daftar Pertemuan Terjadwal ({appointments.length})</span>
        </h2>

        {appointments.length === 0 ? (
          <div className="surface-card rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-sm border border-default">
            <CalendarIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-secondary text-sm">Belum ada sesi konseling yang dijadwalkan.</p>
            <button
              onClick={() => setIsBookingOpen(true)}
              className="mt-2 px-6 py-3 min-h-[44px] bg-slate-800 dark:bg-white hover:bg-slate-900 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-medium text-sm rounded-xl shadow-sm cursor-pointer"
            >
              Jadwalkan Sesi Pertama
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="surface-card rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm border border-default transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <img
                      src={apt.counselorAvatar}
                      alt={apt.counselorName}
                      width={56}
                      height={56}
                      loading="lazy"
                      decoding="async"
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-default shadow-sm shrink-0"
                    />
                    <div className="min-w-0">
                      <h3 className="font-sans font-semibold tracking-tight text-primary text-sm sm:text-base truncate">{apt.counselorName}</h3>
                      <p className="text-xs sm:text-sm text-secondary font-medium mt-0.5 truncate">{apt.counselorTitle}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-lg border ${
                      apt.status === 'Dibatalkan'
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50'
                        : apt.status === 'Ditolak'
                        ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50'
                        : apt.status === 'Menunggu Konfirmasi'
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-900/50'
                        : apt.status === 'Selesai'
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                        : 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-900/50'
                    }`}>
                      {apt.status === 'Menunggu Konfirmasi' ? '⏳ Menunggu Konfirmasi' : apt.status}
                    </span>
                    {apt.attendanceStatus && (
                      <span className="text-[11px] font-mono font-medium text-secondary">
                        {apt.attendanceStatus === 'SCHEDULED' ? 'Terjadwal' : apt.attendanceStatus === 'ATTENDED' ? 'Selesai (Hadir)' : apt.attendanceStatus === 'RESCHEDULED' ? 'Dijadwalkan Ulang' : 'Dibatalkan'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl text-xs sm:text-sm space-y-2.5 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-primary">
                    <span className="flex items-center gap-2 text-secondary">
                      <CalendarIcon className="w-4 h-4 text-secondary" /> Tanggal & Waktu:
                    </span>
                    <span className="font-medium text-primary">{apt.date} | {apt.timeSlot}</span>
                  </div>
                  <div className="flex items-center justify-between text-primary">
                    <span className="flex items-center gap-2 text-secondary">
                      <Video className="w-4 h-4 text-secondary" /> Format:
                    </span>
                    <span className="font-medium text-primary">{apt.mode}</span>
                  </div>
                  
                  {/* Virtual Meeting Link */}
                  {apt.mode === 'video_call' && apt.status !== 'Selesai' && (
                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-secondary font-medium">Link Pertemuan:</span>
                      {apt.meetingLink ? (
                        <a
                          href={apt.meetingLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-teal-600 dark:text-teal-400 hover:underline font-mono font-medium flex items-center gap-1.5"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Buka Link Sesi</span>
                        </a>
                      ) : (
                        <span className="text-xs text-slate-500 dark:text-slate-400 italic">
                          Belum tersedia (menunggu konfirmasi konselor)
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-primary">
                    <span className="flex items-center gap-2 text-secondary">
                      <Bell className="w-4 h-4 text-secondary" /> Pengingat:
                    </span>
                    <span className="text-secondary">{apt.reminderMinutesBefore} Menit Sebelum Sesi</span>
                  </div>
                </div>

                {/* Calendar Export & Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                  {apt.status !== 'Selesai' && (
                    <>
                      <button
                        onClick={() => setSelectedCalendarApt(apt)}
                        className="flex-1 py-2.5 min-h-[44px] bg-slate-800 dark:bg-white hover:bg-slate-900 dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                      >
                        <Bell className="w-4 h-4 text-amber-400 dark:text-amber-600" />
                        <span>Pengingat & Kalender</span>
                      </button>

                      <a
                        href={generateGoogleCalendarUrl(apt)}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2.5 px-3 min-h-[44px] surface-card hover:bg-slate-100 dark:hover:bg-slate-800 text-primary border border-default rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1.5"
                        title="Buka di Google Calendar"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span className="hidden sm:inline">Google Cal</span>
                      </a>

                      {/* Reschedule Button */}
                      {apt.status !== 'Dibatalkan' && (
                        <button
                          onClick={() => setRescheduleApt(apt)}
                          className="px-3.5 py-2.5 min-h-[44px] bg-amber-50 dark:bg-amber-950/40 hover:bg-[#FEF5D9] text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer"
                        >
                          Reschedule
                        </button>
                      )}

                      <button
                        onClick={() => downloadIcsFile(apt)}
                        className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-secondary border border-default rounded-xl transition-all cursor-pointer"
                        title="Unduh File Kalender (.ics)"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      {apt.status !== 'Dibatalkan' && (
                        <button
                          onClick={() => handleCancelAppointment(apt.id)}
                          className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center bg-transparent hover:bg-rose-50 dark:hover:bg-rose-950/40 text-secondary hover:text-rose-500 border border-default hover:border-rose-200 dark:hover:border-rose-900/50 rounded-xl transition-all cursor-pointer"
                          title="Batalkan Sesi Konseling"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Chat Simulation Actions */}
                {apt.status !== 'Dibatalkan' && (
                  <div className="pt-2.5 border-t border-slate-100 w-full flex flex-col gap-2">
                    {apt.status === 'Selesai' ? (
                      <button
                        onClick={() => setActiveSummaryApt(apt)}
                        className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Lihat Ringkasan Hasil Konseling</span>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => setActiveChatApt(apt)}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>Mulai Sesi Chat Teks (Simulasi)</span>
                        </button>
                        
                        {apt.mode === 'video_call' && (
                          <button
                            onClick={() => setActiveVideoApt(apt)}
                            className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
                          >
                            <Video className="w-4 h-4" />
                            <span>Mulai Tele-Konseling Video</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BOOKING FORM MODAL */}
      <BookingForm
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        selectedCounselorFromDir={selectedCounselorFromDir}
        userSession={userSession}
        setUserSession={setUserSession}
        appointments={appointments}
        onAddAppointment={handleAddAppointment}
        showToast={showToast}
        onShowLimitModal={() => setShowLimitModal(true)}
      />

      {/* RESCHEDULE MODAL */}
      <RescheduleModal
        appointment={rescheduleApt}
        onClose={() => setRescheduleApt(null)}
        onReschedule={handleReschedule}
      />

      {/* SIMULATED COUNSELOR CHAT MODAL */}
      <CounselorChatSimulation
        appointment={activeChatApt}
        onClose={() => setActiveChatApt(null)}
        onCompleteSession={handleCompleteSession}
        showToast={showToast}
      />

      {/* VIDEO CONSULTATION ROOM MODAL */}
      <VideoConsultationRoom
        appointment={activeVideoApt}
        onClose={() => setActiveVideoApt(null)}
        onEndCall={handleCompleteSession}
        userRole={userSession.role as any}
      />

      {/* SUMMARY / DETAIL APPOINTMENT MODAL (PROGRESSIVE DISCLOSURE) */}
      <AppointmentDetailsModal
        appointment={activeSummaryApt}
        onClose={() => setActiveSummaryApt(null)}
      />

      {/* CALENDAR & REMINDER INTEGRATION MODAL */}
      <CalendarReminderModal
        isOpen={!!selectedCalendarApt}
        onClose={() => setSelectedCalendarApt(null)}
        appointment={selectedCalendarApt}
        onShowToast={showToast}
      />

      {/* CONFIRMATION CANCEL MODAL */}
      {cancelModalAptId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-lg shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-sans font-semibold tracking-tight text-lg text-slate-900">Batalkan Sesi Konseling?</h3>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                  Apakah Anda yakin ingin membatalkan jadwal konseling ini? Status ketersediaan konselor akan otomatis diperbarui dan tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setCancelModalAptId(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Kembali
              </button>
              <button
                onClick={() => confirmCancelAppointment(cancelModalAptId)}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                Ya, Batalkan Sesi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Limit Modal */}
      {showLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-50 rounded-xl shadow-lg border border-slate-200 w-full max-w-sm overflow-hidden p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center mx-auto">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-sans font-semibold tracking-tight text-lg font-medium text-slate-800">Batas Jadwal Tercapai</h3>
              <p className="text-sm text-slate-600 mt-2">
                Anda telah menggunakan seluruh kuota pemesanan jadwal untuk tier Free. Tingkatkan ke tier Plus atau Pro untuk melanjutkan. (Fitur Upgrade Coming Soon)
              </p>
            </div>
            <button
              onClick={() => setShowLimitModal(false)}
              className="w-full py-2.5 bg-slate-800 text-white hover:bg-slate-900 rounded-lg text-sm font-medium transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
