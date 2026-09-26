import { useState, useEffect } from 'react';
import { UserSession, Appointment } from '../../../types';
import { apiClient } from '../../../lib/apiClient';
import { parseAppointmentDateTime } from '../../../lib/calendarAndReminders';

export interface UpcomingAppointmentState {
  appointment: Appointment;
  countdownText: string;
}

export function useUpcomingAppointment(user: UserSession | null) {
  const [upcomingAppointment, setUpcomingAppointment] = useState<UpcomingAppointmentState | null>(null);
  const [isReminderDismissed, setIsReminderDismissed] = useState(false);

  useEffect(() => {
    if (!user || user.role === 'guest') {
      setUpcomingAppointment(null);
      return;
    }

    let isSubscribed = true;

    apiClient.get<any[]>('/api/v1/appointments?limit=upcoming')
      .then(res => {
        if (!isSubscribed) return;
        if (!res.success || !Array.isArray(res.data) || res.data.length === 0) {
          setUpcomingAppointment(null);
          return;
        }

        const now = Date.now();
        const maxThresholdMs = 48 * 60 * 60 * 1000; // 48 jam

        // Cari appointment terdekat yang CONFIRMED / APPROVED atau SCHEDULED
        for (const item of res.data) {
          if (item.status === 'CANCELLED' || item.status === 'REJECTED') continue;

          const dateStr = item.date;
          const timeSlot = `${item.time} ${item.timezone || 'WIB'}`;
          const timeData = parseAppointmentDateTime(dateStr, timeSlot, item.timezone);
          const aptTime = timeData.startDate.getTime();
          const diffMs = aptTime - now;

          if (diffMs > 0 && diffMs <= maxThresholdMs) {
            // Hitung teks human-friendly countdown
            const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));
            const minsLeft = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

            let countdownText: string;
            const isToday = new Date().toDateString() === timeData.startDate.toDateString();
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const isTomorrow = tomorrow.toDateString() === timeData.startDate.toDateString();

            if (isToday) {
              countdownText = `Hari ini pukul ${item.time} (${hoursLeft > 0 ? `${hoursLeft} jam lagi` : `${minsLeft} menit lagi`})`;
            } else if (isTomorrow) {
              countdownText = `Besok pukul ${item.time}`;
            } else {
              countdownText = `Dalam ${hoursLeft} jam (pukul ${item.time})`;
            }

            const formatted: Appointment = {
              id: item.id,
              counselorId: item.counselorId,
              counselorName: item.counselor?.name || item.counselorName || 'Konselor Kampus',
              counselorTitle: item.counselor?.title || 'Psikolog Klinis Kampus',
              counselorAvatar: item.counselor?.avatar || '',
              studentName: item.studentName || user.name,
              studentNIM: item.studentNIM || '',
              studentEmail: item.studentEmail || user.email,
              studentPhone: '0812xxxxxx',
              date: item.date,
              timeSlot: `${item.time} ${item.timezone || 'WIB'}`,
              timezone: item.timezone || 'WIB',
              mode: item.mode || 'video_call',
              primaryConcern: item.notes || 'Konseling Mental',
              status: item.status,
              approvalStatus: item.approvalStatus || 'APPROVED',
              attendanceStatus: item.attendanceStatus || 'SCHEDULED',
              meetingLink: item.meetingLink || `https://meet.jit.si/ruangtenang-session-${item.id}`,
              reminderEnabled: true,
              reminderMinutesBefore: 30,
              createdAt: item.createdAt
            };

            setUpcomingAppointment({
              appointment: formatted,
              countdownText
            });
            break;
          }
        }
      })
      .catch(() => {
        // Abaikan jika network offline atau error
      });

    return () => {
      isSubscribed = false;
    };
  }, [user]);

  return {
    upcomingAppointment,
    isReminderDismissed,
    setIsReminderDismissed
  };
}
