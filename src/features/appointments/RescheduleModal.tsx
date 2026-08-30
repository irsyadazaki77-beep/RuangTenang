import { useEscapeKey } from '../../hooks/useEscapeKey';
import React, { useState, useEffect } from 'react';
import { XCircle, AlertCircle, Clock } from 'lucide-react';
import { Appointment } from '../../types';
import { apiClient } from '../../lib/apiClient';

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
  const [availableSlots, setAvailableSlots] = useState<string[]>(['09:00', '10:30', '14:00', '16:00']);
  const [isFullyBooked, setIsFullyBooked] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (appointment) {
      setRescheduleDate(appointment.date);
      setRescheduleTime(appointment.timeSlot.split(' ')[0] || '14:00');
      setRescheduleTimezone(appointment.timezone || 'WIB');
      setErrorMsg(null);
    }
  }, [appointment]);

  useEffect(() => {
    if (!appointment || !rescheduleDate) return;
    let isMounted = true;
    setIsLoadingSlots(true);
    apiClient.get<{ availableSlots: string[] }>(`/api/v1/appointments/availability?counselorId=${appointment.counselorId}&date=${rescheduleDate}`)
      .then(res => {
        if (!isMounted) return;
        setIsLoadingSlots(false);
        const data = res.data;
        if (data && Array.isArray(data.availableSlots)) {
          // If rescheduling to the same date, include the current booked time slot as available
          const slots = [...data.availableSlots];
          const currentTime = appointment.timeSlot.split(' ')[0];
          if (rescheduleDate === appointment.date && !slots.includes(currentTime)) {
            slots.push(currentTime);
            slots.sort();
          }
          setAvailableSlots(slots);
          setIsFullyBooked(slots.length === 0);
          if (slots.length > 0 && !slots.includes(rescheduleTime)) {
            setRescheduleTime(slots[0]);
          }
        }
      })
      .catch(err => {
        if (!isMounted) return;
        setIsLoadingSlots(false);
        console.warn('Failed to fetch availability for reschedule:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [appointment, rescheduleDate]);

  if (!appointment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (isFullyBooked || availableSlots.length === 0) {
      setErrorMsg('Semua slot jadwal pada tanggal ini telah penuh terisi.');
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
    <div className="fixed inset-0 z-50 bg-slate-800/80 backdrop-blur-sm flex items-center justify-center max-sm:items-end p-4 max-sm:p-0 overflow-y-auto animate-fade-in">
      <div className="bg-slate-50 text-slate-800 rounded-3xl max-sm:rounded-b-none max-w-md w-full p-6 sm:p-8 shadow-sm relative space-y-5 max-sm:animate-slide-up transition-transform duration-300">
        
        {/* Drag handle for mobile bottom sheet */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3 sm:hidden shrink-0" />

        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <h2 className="font-sans font-semibold tracking-tight text-lg text-slate-900">Ubah Jadwal Sesi (Reschedule)</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-600 hover:text-slate-800 rounded-md transition-colors"
            aria-label="Tutup Modals"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-600">
          Mengubah jadwal konseling dengan <strong className="text-slate-900">{appointment.counselorName}</strong>.
        </p>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-lg text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block font-medium text-slate-600 mb-1.5">Tanggal Baru:</label>
            <input
              type="date"
              required
              min={new Date().toISOString().split('T')[0]}
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:border-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-600 mb-1.5">Jam Baru:</label>
              <select
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
                disabled={isFullyBooked || availableSlots.length === 0}
                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:border-slate-800 font-mono disabled:bg-slate-100 disabled:text-slate-400"
              >
                {availableSlots.length > 0 ? (
                  availableSlots.map(slot => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))
                ) : (
                  <option value="">(Penuh)</option>
                )}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-600 mb-1.5">Zona Waktu:</label>
              <select
                value={rescheduleTimezone}
                onChange={(e) => setRescheduleTimezone(e.target.value as any)}
                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:border-slate-800 font-medium"
              >
                <option value="WIB">WIB</option>
                <option value="WITA">WITA</option>
                <option value="WIT">WIT</option>
              </select>
            </div>
          </div>

          {/* Slot availability note */}
          <div className="p-2.5 bg-slate-100 border border-slate-300 rounded-lg text-xs text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-600" />
              Slot tersedia ({rescheduleDate}):
            </span>
            <span className="font-semibold text-slate-900 font-mono">
              {isLoadingSlots ? '...' : isFullyBooked ? '0 Slot (Penuh)' : `${availableSlots.length} Slot`}
            </span>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-2.5 bg-transparent hover:bg-slate-100 text-slate-600 rounded-lg font-medium transition-colors"
              aria-label="Tutup Modals"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving || isFullyBooked || availableSlots.length === 0}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan Jadwal Baru'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
