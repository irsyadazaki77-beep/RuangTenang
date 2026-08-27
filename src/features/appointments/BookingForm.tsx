import { useEscapeKey } from "../../hooks/useEscapeKey";
import React, { useState, useEffect } from "react";
import {
  XCircle,
  Clock,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Lock,
  Calendar,
  User,
  BookOpen,
  HeartHandshake,
} from "lucide-react";
import { Counselor, UserSession, Appointment, TIER_LIMITS } from "../../types";
import { useCounselors } from "../../hooks/useCounselors";
import { apiClient } from "../../lib/apiClient";

interface BookingFormProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCounselorFromDir: Counselor | null;
  userSession: UserSession;
  setUserSession: React.Dispatch<React.SetStateAction<UserSession>>;
  appointments: Appointment[];
  onAddAppointment: (newApt: Appointment) => void;
  showToast: (
    message: string,
    type: "success" | "error" | "warning" | "info",
  ) => void;
  onShowLimitModal: () => void;
}

const KEBUTUHAN_OPTIONS = [
  {
    id: "akademik",
    title: "Kendala Akademik & Skripsi",
    desc: "Stres revisi, dosen pembimbing, atau beban perkuliahan.",
  },
  {
    id: "kecemasan",
    title: "Kecemasan & Burnout",
    desc: "Gelisah berlebihan, panik, rasa lelah fisik & emosional.",
  },
  {
    id: "hubungan",
    title: "Hubungan & Sosial Kampus",
    desc: "Masalah pertemanan, organisasi, pasangan, atau keluarga.",
  },
  {
    id: "depresi",
    title: "Suasana Hati & Depresi",
    desc: "Perasaan hampa, kehilangan motivasi, atau sedih berkepanjangan.",
  },
  {
    id: "karir",
    title: "Karir & Masa Depan",
    desc: "Kebingungan arah karir, magang, atau tekanan masa depan.",
  },
];

export const BookingForm: React.FC<BookingFormProps> = ({
  isOpen,
  onClose,
  selectedCounselorFromDir,
  userSession,
  setUserSession,
  appointments,
  onAddAppointment,
  showToast,
  onShowLimitModal,
}) => {
  useEscapeKey(onClose, true);

  const { counselors, loading } = useCounselors();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedConcern, setSelectedConcern] = useState<string>(
    "Kendala Akademik & Skripsi",
  );
  const [selectedCounselorId, setSelectedCounselorId] = useState<string>(
    selectedCounselorFromDir?.id || "c-1"
  );
  const [studentName, setStudentName] = useState(userSession.name || "");
  const [studentNIM, setStudentNIM] = useState("");
  const [studentEmail, setStudentEmail] = useState(userSession.email || "");
  const [studentPhone, setStudentPhone] = useState("");
  const getLocalTimezone = (): "WIB" | "WITA" | "WIT" => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz === "Asia/Makassar" || tz === "Asia/Kuala_Lumpur" || tz === "Asia/Singapore" || tz === "Asia/Brunei" || tz === "Asia/Kuching") return "WITA";
      if (tz === "Asia/Jayapura" || tz === "Asia/Dili") return "WIT";
      return "WIB";
    } catch {
      return "WIB";
    }
  };

  const [date, setDate] = useState("2026-08-05");
  const [timeSlot, setTimeSlot] = useState("14:00");
  const [timezone, setTimezone] = useState<"WIB" | "WITA" | "WIT">(getLocalTimezone());
  const [mode, setMode] = useState<"video_call">("video_call");
  const [reminderMinutes, setReminderMinutes] = useState<number>(30);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [availableSlots, setAvailableSlots] = useState<string[]>([
    "09:00",
    "10:30",
    "14:00",
    "16:00",
  ]);
  const [isFullyBooked, setIsFullyBooked] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  useEffect(() => {
    if (selectedCounselorFromDir) {
      setSelectedCounselorId(selectedCounselorFromDir.id);
      setCurrentStep(1); // Auto jump
    }
  }, [selectedCounselorFromDir]);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingSlots(true);
    apiClient.get<{ availableSlots: string[]; fullyBooked?: boolean }>(
      `/api/v1/appointments/availability?counselorId=${selectedCounselorId}&date=${date}`,
    )
      .then((res) => {
        if (!isMounted) return;
        setIsLoadingSlots(false);
        const data = res.data;
        if (data && Array.isArray(data.availableSlots)) {
          setAvailableSlots(data.availableSlots);
          setIsFullyBooked(
            data.fullyBooked || data.availableSlots.length === 0,
          );
          if (data.availableSlots.length > 0) {
            if (!data.availableSlots.includes(timeSlot)) {
              setTimeSlot(data.availableSlots[0]);
            }
          } else {
            setTimeSlot("");
          }
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setIsLoadingSlots(false);
        console.warn("Failed to check server availability:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCounselorId, date]);

  const handleNextStep = () => {
    setFormError(null);
    if (currentStep === 1) {
      if (!selectedCounselorId) return setFormError("Pilih konselor terlebih dahulu.");
    } else if (currentStep === 2) {
      if (!date || !timeSlot) return setFormError("Pilih tanggal dan waktu sesi.");
    } else if (currentStep === 3) {
      if (!studentName.trim() || !studentNIM.trim() || !studentEmail.trim() || !studentPhone.trim()) {
        return setFormError("Mohon lengkapi semua informasi pribadi Anda.");
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handlePrevStep = () => {
    setFormError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const currentLimit = TIER_LIMITS[userSession.tier].appointments;
    if (userSession.usageStats.appointmentsBooked >= currentLimit) {
      onClose();
      onShowLimitModal();
      return;
    }

    if (!studentName.trim() || studentName.trim().length < 2) {
      setFormError("Nama mahasiswa wajib diisi (minimal 2 karakter).");
      return;
    }

    if (studentNIM && !/^\d{6,15}$/.test(studentNIM.trim())) {
      setFormError("NIM harus berupa angka (6 hingga 15 digit).");
      return;
    }

    if (
      studentEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail.trim())
    ) {
      setFormError(
        "Format email kampus tidak valid (contoh: mahasiswa@ui.ac.id).",
      );
      return;
    }

    setIsSubmitting(true);
    const counselorObj =
      counselors.find((c) => c.id === selectedCounselorId) ||
      counselors[0];
    const fullTimeSlot = `${timeSlot} ${timezone}`;

    try {
      const res = await apiClient.post<any>("/api/v1/appointments", {
        counselorId: counselorObj.id,
        counselorName: counselorObj.name,
        date,
        time: timeSlot,
        timezone,
        mode,
        notes: selectedConcern,
        userId: studentNIM || "mahasiswa-anon",
        studentName: studentName.trim(),
        studentNIM: studentNIM.trim(),
        studentEmail: studentEmail.trim(),
      });

      if (!res.success) {
        if (res.status === 409) {
          setFormError(
            res.error ||
              "🚫 Jadwal bentrok! Slot tersebut telah dipesan oleh mahasiswa lain.",
          );
        } else {
          setFormError(
            res.error ||
              "Gagal menyimpan jadwal ke server. Silakan coba lagi.",
          );
        }
        setIsSubmitting(false);
        return;
      }

      const resData = res.data;
      const record = resData?.record || resData;
      const createdAppointment: Appointment = {
        id: record.id,
        counselorId: counselorObj.id,
        counselorName: counselorObj.name,
        counselorTitle: counselorObj.title,
        counselorAvatar: counselorObj.avatar,
        studentName: record.studentName || studentName.trim(),
        studentNIM: record.studentNIM || studentNIM.trim(),
        studentEmail: record.studentEmail || studentEmail.trim(),
        studentPhone: studentPhone.trim() || "081234567890",
        date: record.date,
        timeSlot: `${record.time} ${record.timezone || timezone}`,
        timezone: record.timezone || timezone,
        mode: record.mode || mode,
        primaryConcern: record.notes || selectedConcern,
        status:
          record.status === "PENDING" ? "Menunggu Konfirmasi" : "Konfirmasi",
        approvalStatus: record.approvalStatus || "PENDING_APPROVAL",
        attendanceStatus: record.attendanceStatus || "SCHEDULED",
        meetingLink:
          record.meetingLink ||
          `https://meet.jit.si/ruangtenang-session-${record.id}`,
        reminderEnabled: true,
        reminderMinutesBefore: reminderMinutes,
        createdAt: record.createdAt || new Date().toISOString(),
      };

      onAddAppointment(createdAppointment);
      onClose();
      setFormError(null);
      showToast(
        `Jadwal Konseling Terdaftar untuk ${date} Pukul ${fullTimeSlot}.`,
        "success",
      );
    } catch (e) {
      console.warn("Backend appointment save failed:", e);
      setFormError("Terjadi kesalahan jaringan saat menyimpan jadwal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentCounselor =
    counselors.find((c) => c.id === selectedCounselorId) ||
    counselors[0];

  return (
    <div className="fixed inset-0 z-50 bg-slate-800/80 backdrop-blur-sm flex items-center justify-center max-sm:items-end p-3 sm:p-4 max-sm:p-0 overflow-y-auto font-sans animate-fade-in">
      <div className="bg-white text-slate-800 rounded-3xl max-sm:rounded-b-none max-w-xl w-full p-5 sm:p-7 shadow-lg relative max-h-[92dvh] overflow-y-auto flex flex-col justify-between max-sm:animate-slide-up transition-transform duration-300">
        {/* Drag handle for mobile bottom sheet */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3 sm:hidden shrink-0" />

        {/* Header & Stepper */}
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                Langkah {currentStep} dari 4
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-1">
                {currentStep === 1 && "Pilih Konselor"}
                {currentStep === 2 && "Pilih Jadwal"}
                {currentStep === 3 && "Data Diri"}
                {currentStep === 4 && "Konfirmasi"}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer min-h-[36px]"
              aria-label="Tutup Form"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-1.5 mb-5 overflow-hidden">
            <div
              className="bg-teal-600 h-1.5 transition-all duration-300"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center gap-2 mb-4">
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* STEP 2: PILIH KONSELOR */}
          {currentStep === 1 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Pilih psikolog / konselor kampus berpengalaman yang sesuai:
              </p>
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                {loading ? (
                  <div className="text-center text-slate-500 py-4 text-sm">Memuat konselor...</div>
                ) : (
                  counselors.map((c) => {
                    const isSelected = selectedCounselorId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCounselorId(c.id)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3.5 min-h-[72px] ${
                        isSelected
                          ? "bg-teal-50 border-teal-600 ring-1 ring-teal-600"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <img
                        src={c.avatar}
                        alt={c.name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-base sm:text-sm font-bold truncate ${isSelected ? "text-teal-900" : "text-slate-900"}`}
                        >
                          {c.name}
                        </p>
                        <p className="text-xs text-slate-600 truncate">
                          {c.title} &bull; {c.university}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {c.specialties.slice(0, 2).map((s, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "bg-teal-600 border-teal-600 text-white"
                            : "border-slate-300"
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                    </button>
                  );
                })
                )}
              </div>
            </div>
          )}

          {/* STEP 3: PILIH JADWAL & METODE */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl flex items-center gap-3">
                <img
                  src={currentCounselor.avatar}
                  alt={currentCounselor.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {currentCounselor.name}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {selectedConcern}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="session-date-input"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Tanggal Sesi:
                  </label>
                  <input
                    id="session-date-input"
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-base sm:text-xs text-slate-800 focus:outline-none focus:border-teal-600 min-h-[44px]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="session-time-input"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Jam Slot:
                  </label>
                  <select
                    id="session-time-input"
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    disabled={isFullyBooked || availableSlots.length === 0}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-base sm:text-xs text-slate-800 focus:outline-none focus:border-teal-600 disabled:bg-slate-100 min-h-[44px]"
                  >
                    {availableSlots.length > 0 ? (
                      availableSlots.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))
                    ) : (
                      <option value="">(Penuh - Pilih Tanggal Lain)</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="session-timezone"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Zona Waktu:
                </label>
                <select
                  id="session-timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-base sm:text-xs text-slate-800 focus:outline-none focus:border-teal-600 min-h-[44px]"
                >
                  <option value="WIB">WIB (Jakarta / Jawa / Sumatra)</option>
                  <option value="WITA">WITA (Bali / Sulawesi / Kaltim)</option>
                  <option value="WIT">WIT (Maluku / Papua)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Metode Konsultasi:
                </label>
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-teal-800 font-bold text-xs">
                    <span className="flex w-5 h-5 bg-teal-600 text-white rounded-full items-center justify-center">
                      📹
                    </span>
                    Sesi Virtual Video Call (Jitsi / WebRTC)
                  </div>
                  <p className="text-xs text-teal-700">
                    Tautan ruang temu virtual akan langsung aktif begitu sesi
                    dikonfirmasi oleh konselor.
                  </p>
                </div>
              </div>
            </div>
          )}

          
          {/* STEP 3: DATA DIRI */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
                <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">Informasi Pribadi & Kontak</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nama Lengkap</label>
                    <input type="text" value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Contoh: Budi Santoso" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-base sm:text-sm text-slate-800 focus:outline-none focus:border-teal-500 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">NIM / Nomor Induk Mahasiswa</label>
                    <input type="text" value={studentNIM} onChange={(e) => setStudentNIM(e.target.value)} placeholder="Contoh: 1201928391" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-base sm:text-sm text-slate-800 focus:outline-none focus:border-teal-500 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Kampus / Pribadi</label>
                    <input type="email" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} placeholder="Contoh: budi@univ.edu" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-base sm:text-sm text-slate-800 focus:outline-none focus:border-teal-500 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nomor WhatsApp Aktif</label>
                    <input type="tel" value={studentPhone} onChange={(e) => setStudentPhone(e.target.value)} placeholder="Contoh: 081234567890" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-base sm:text-sm text-slate-800 focus:outline-none focus:border-teal-500 transition-all" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: KONFIRMASI RINGKASAN */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-teal-50/50 border border-teal-200 rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden sticky top-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                <h3 className="font-bold text-teal-900 text-sm flex items-center gap-2 border-b border-teal-100/50 pb-2 relative z-10">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" /> Ringkasan Reservasi
                </h3>
                
                <div className="space-y-3 text-sm relative z-10">
                  <div className="flex justify-between items-start">
                    <span className="text-teal-700/70 font-medium">Konselor:</span>
                    <span className="font-bold text-teal-950 text-right">{counselors.find(c => c.id === selectedCounselorId)?.name}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-teal-700/70 font-medium">Jadwal Sesi:</span>
                    <span className="font-bold text-teal-950 text-right">
                      {new Date(date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} <br/>
                      {timeSlot} {timezone}
                    </span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-teal-700/70 font-medium">Metode:</span>
                    <span className="font-bold text-teal-950 text-right">{mode}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-teal-700/70 font-medium">Data Pasien:</span>
                    <span className="font-bold text-teal-950 text-right">{studentName} <br/><span className="text-teal-700/60 font-normal text-xs">{studentEmail} | {studentPhone}</span></span>
                  </div>
                </div>

                <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 mt-4 space-y-1 relative z-10">
                  <p className="text-xs font-bold text-rose-800 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5"/> Kebijakan Pembatalan</p>
                  <p className="text-[11px] text-rose-700/80 leading-relaxed">
                    Pembatalan atau perubahan jadwal (reschedule) wajib dilakukan maksimal <strong>H-1 (24 jam)</strong> sebelum sesi dimulai. Pembatalan sepihak yang mendadak tanpa pemberitahuan akan mempengaruhi prioritas reservasi Anda di masa mendatang.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        
{/* Footer Navigation Buttons */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 mt-6">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 text-xs font-semibold rounded-xl transition-all flex items-center gap-1 cursor-pointer min-h-[44px]"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-slate-500 hover:text-slate-800 text-xs font-semibold rounded-xl transition-all cursor-pointer min-h-[44px]"
            >
              Batal
            </button>
          )}

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white active:scale-95 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer min-h-[44px]"
            >
              <span>Lanjutkan</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreateAppointment}
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white active:scale-95 text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer min-h-[44px]"
            >
              {isSubmitting ? "Memproses..." : "Konfirmasi & Simpan Jadwal"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
