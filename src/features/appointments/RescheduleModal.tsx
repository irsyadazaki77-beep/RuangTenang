import { useEscapeKey } from '../../hooks/useEscapeKey';
import React, { useState, useEffect } from 'react';
import { XCircle, AlertCircle, Clock } from 'lucide-react';
import { Appointment } from '../../types';
import { apiClient } from '../../lib/apiClient';
import { getAppointmentDateInputValue } from '../../lib/appointmentTime';
import { parseAppointmentDateTime } from '../../lib/calendarAndReminders';

interface RescheduleModalProps {
  appointment: Appointment | null;
  onClose: () => void;
  onReschedule: (appointmentId: string, newDate: string, newTime: string, newTimezone: 'WIB' | 'WITA' | 'WIT') => Promise<void> | void;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  appointment,
  onClose,
  onReschedule,
}) => {
  useEscapeKey(onClose, true);

  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('14:00');
  const [rescheduleTimezone, setRescheduleTimezone] = useState<'WIB' | 'WITA' | 'WIT'>('WIB');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isFullyBooked, setIsFullyBooked] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [availabilityRetry, setAvailabilityRetry] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (appointment) {
      const minimumDate = getAppointmentDateInputValue(new Date(), appointment.timezone || 'WIB');
      setRescheduleDate(appointment.date < minimumDate ? minimumDate : appointment.date);
      setRescheduleTime(appointment.timeSlot.split(' ')[0] || '14:00');
      setRescheduleTimezone(appointment.timezone || 'WIB');
      setErrorMsg(null);
    }
  }, [appointment]);

  useEffect(() => {
    if (!appointment || !rescheduleDate) {
      setAvailableSlots([]);
      setIsFullyBooked(false);
      setIsLoadingSlots(false);
      setAvailabilityError(null);
      return;
    }
    let isMounted = true;
    setIsLoadingSlots(true);
    setAvailableSlots([]);
    setIsFullyBooked(false);
    setAvailabilityError(null);
    const query = new URLSearchParams({ counselorId: appointment.counselorId, date: rescheduleDate, timezone: rescheduleTimezone });
    apiClient.get<{ availableSlots: string[] }>(`/api/v1/appointments/availability?${query.toString()}`)
      .then(res => {
        if (!isMounted) return;
        const data = res.data;
        if (!res.success || !data || !Array.isArray(data.availableSlots)) {
          throw new Error(res.error || 'Ketersediaan slot tidak dapat dimuat.');
        }
        // Keep the current reservation selectable when the student keeps the same date.
        const slots = [...data.availableSlots];
        const currentTime = appointment.timeSlot.split(' ')[0];
        const currentReservationIsFuture = parseAppointmentDateTime(rescheduleDate, currentTime, rescheduleTimezone).startDate.getTime() > Date.now() + 5 * 60_000;
        if (rescheduleDate === appointment.date && rescheduleTimezone === (appointment.timezone || 'WIB') && currentReservationIsFuture && !slots.includes(currentTime)) {
          slots.push(currentTime);
          slots.sort();
        }
        setAvailableSlots(slots);
        setIsFullyBooked(slots.length === 0);
        setIsLoadingSlots(false);
        if (slots.length > 0) setRescheduleTime(current => slots.includes(current) ? current : slots[0]);
      })
      .catch(err => {
        if (!isMounted) return;
        setIsLoadingSlots(false);
        setAvailableSlots([]);
        setIsFullyBooked(false);
        setAvailabilityError(err instanceof Error ? err.message : 'Ketersediaan slot gagal dimuat. Muat ulang slot sebelum menyimpan jadwal.');
        console.warn('Failed to fetch availability for reschedule:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [appointment, rescheduleDate, rescheduleTimezone, availabilityRetry]);

  if (!appointment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (isLoadingSlots) {
      setErrorMsg('Tunggu sampai pemeriksaan ketersediaan slot selesai.');
      return;
    }
    if (availabilityError) {
      setErrorMsg(availabilityError);
      return;
    }
    if (isFullyBooked || availableSlots.length === 0) {
      setErrorMsg('Tidak ada slot waktu yang dapat dipilih pada tanggal ini. Pilih tanggal lain.');
      return;
    }
    if (!availableSlots.includes(rescheduleTime)) {
      setErrorMsg('Pilih slot yang tersedia untuk tanggal tersebut.');
      return;
    }

    setIsSaving(true);
    try {
      await onReschedule(appointment.id, rescheduleDate, rescheduleTime, rescheduleTimezone);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengubah jadwal. Terjadi konflik slot.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center max-sm:items-end p-3 sm:p-4 max-sm:p-0 animate-fade-in font-sans">
      <div className="surface-card text-primary rounded-2xl max-sm:rounded-b-none max-sm:rounded-t-2xl max-w-md w-full p-4 sm:p-6 shadow-xl relative space-y-4 border border-default max-sm:animate-slide-up transition-transform duration-200">

        {/* Drag handle for mobile bottom sheet */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        <div className="flex items-center justify-between border-b border-default pb-3">
          <h2 className="font-bold text-base sm:text-lg text-primary">Ubah Jadwal Sesi (Reschedule)</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-secondary hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Tutup Modals"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs sm:text-sm text-secondary">
          Mengubah jadwal konseling dengan <strong className="text-primary font-semibold">{appointment.counselorName}</strong>.
        </p>

        {errorMsg && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs sm:text-sm">
          <div className="space-y-1">
            <label className="block font-semibold text-xs text-secondary">Tanggal Baru:</label>
            <input
              type="date"
              required
              min={getAppointmentDateInputValue(new Date(), rescheduleTimezone)}
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              className="w-full surface-muted border border-default rounded-xl px-3.5 py-2 text-base sm:text-sm text-primary focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 min-h-[44px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block font-semibold text-xs text-secondary">Jam Baru:</label>
              <select
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
                disabled={isLoadingSlots || !!availabilityError || isFullyBooked || availableSlots.length === 0}
                className="w-full surface-muted border border-default rounded-xl px-3.5 py-2 text-base sm:text-sm text-primary focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 font-mono disabled:opacity-50 min-h-[44px]"
              >
                {isLoadingSlots ? (
                  <option value="">Memeriksa slot…</option>
                ) : availabilityError ? (
                  <option value="">Slot gagal dimuat</option>
                ) : availableSlots.length > 0 ? (
                  availableSlots.map(slot => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))
                ) : (
                  <option value="">Tidak tersedia</option>
                )}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block font-semibold text-xs text-secondary">Zona Waktu:</label>
              <select
                value={rescheduleTimezone}
                onChange={(e) => {
                  const nextTimezone = e.target.value as 'WIB' | 'WITA' | 'WIT';
                  const minimumDate = getAppointmentDateInputValue(new Date(), nextTimezone);
                  setRescheduleTimezone(nextTimezone);
                  setRescheduleDate(currentDate => currentDate < minimumDate ? minimumDate : currentDate);
                }}
                className="w-full surface-muted border border-default rounded-xl px-3.5 py-2 text-base sm:text-sm text-primary focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 font-medium min-h-[44px]"
              >
                <option value="WIB">WIB</option>
                <option value="WITA">WITA</option>
                <option value="WIT">WIT</option>
              </select>
            </div>
          </div>

          {/* Slot availability note */}
          <div className="p-2.5 surface-muted border border-default rounded-xl text-xs text-secondary flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-secondary" />
              Slot tersedia ({rescheduleDate}):
            </span>
            <span className="font-semibold text-primary font-mono">
              {isLoadingSlots ? 'Memeriksa…' : availabilityError ? 'Gagal dimuat' : isFullyBooked ? '0 Slot' : `${availableSlots.length} Slot`}
            </span>
          </div>
          {availabilityError && (
            <div className="flex items-center justify-between gap-3 text-xs text-rose-700 dark:text-rose-300" role="status" aria-live="polite">
              <span>{availabilityError}</span>
              <button type="button" onClick={() => setAvailabilityRetry(value => value + 1)} className="shrink-0 underline font-semibold" disabled={isLoadingSlots}>
                Coba lagi
              </button>
            </div>
          )}

          <div className="pt-3 border-t border-default flex justify-end gap-2.5 mt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 min-h-[44px] surface-card border border-default hover:bg-slate-100 dark:hover:bg-slate-800 text-secondary text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer active:scale-[0.98]"
              aria-label="Tutup Modals"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving || isLoadingSlots || !!availabilityError || isFullyBooked || availableSlots.length === 0}
              className="px-5 py-2 min-h-[44px] bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-3xs transition-all disabled:opacity-50 cursor-pointer active:scale-[0.98]"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan Jadwal Baru'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
