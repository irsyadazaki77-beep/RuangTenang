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
import { addNotification } from "../../lib/notificationStore";

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
    selectedCounselorFromDir?.id || ""
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

  const getInitialBookingDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  };

  const [date, setDate] = useState<string>(getInitialBookingDate);
  const [timeSlot, setTimeSlot] = useState("");
  const [timezone, setTimezone] = useState<"WIB" | "WITA" | "WIT">(getLocalTimezone());
  const [mode, setMode] = useState<"video_call">("video_call");
  const [reminderMinutes, setReminderMinutes] = useState<number>(30);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isFullyBooked, setIsFullyBooked] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  useEffect(() => {
    if (selectedCounselorFromDir) {
      setSelectedCounselorId(selectedCounselorFromDir.id);
      setCurrentStep(1); // Auto jump
    } else if (!selectedCounselorId && counselors.length > 0) {
      setSelectedCounselorId(counselors[0].id);
    }
  }, [selectedCounselorFromDir, counselors, selectedCounselorId]);

  useEffect(() => {
    if (!selectedCounselorId || !date) return;
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
        setAvailableSlots([]);
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

    const counselorObj = counselors.find((c) => c.id === selectedCounselorId);
    if (!counselorObj) {
      setFormError("Pilih konselor yang valid.");
      return;
    }

    setIsSubmitting(true);
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
        studentPhone: studentPhone.trim() || undefined,
        date: record.date,
        timeSlot: `${record.time} ${record.timezone || timezone}`,
        timezone: record.timezone || timezone,
        mode: record.mode || mode,
        primaryConcern: record.notes || selectedConcern,
        status:
          record.status === "PENDING" ? "Menunggu Konfirmasi" : "Konfirmasi",
        approvalStatus: record.approvalStatus || "PENDING_APPROVAL",
        attendanceStatus: record.attendanceStatus || "SCHEDULED",
        meetingLink: record.meetingLink || undefined,
        reminderEnabled: true,
        reminderMinutesBefore: reminderMinutes,
        createdAt: record.createdAt || new Date().toISOString(),
      };

      onAddAppointment(createdAppointment);
      addNotification(
        "Sesi Konseling Dijadwalkan 🗓️",
        `Pertemuan dengan ${counselorObj.name} telah berhasil dijadwalkan pada ${date} pukul ${fullTimeSlot}.`,
        "warning"
      );
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center max-sm:items-end p-3 sm:p-4 max-sm:p-0 overflow-y-auto font-sans animate-fade-in">
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-800 rounded-3xl max-sm:rounded-b-none max-w-xl w-full p-5 sm:p-7 shadow-xl relative max-h-[92dvh] overflow-y-auto flex flex-col justify-between max-sm:animate-slide-up transition-transform duration-300">
        {/* Drag handle for mobile bottom sheet */}
        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Header & Stepper */}
        <div>
          <div className="flex items-center justify-between pb-4">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                Langkah {currentStep} dari 4
              </p>
              <h2 className="text-xl font-medium text-slate-800 dark:text-slate-100">
                {currentStep === 1 && "Pilih Konselor"}
                {currentStep === 2 && "Pilih Jadwal Sesi"}
                {currentStep === 3 && "Informasi Pribadi"}
                {currentStep === 4 && "Konfirmasi"}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Tutup Form"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          {/* Visual Stepper Indicators */}
          <div className="grid grid-cols-4 gap-2 mb-8 relative">
            {[
              { label: "Konselor", step: 1 },
              { label: "Jadwal", step: 2 },
              { label: "Data Diri", step: 3 },
              { label: "Konfirmasi", step: 4 },
            ].map((s) => {
              const isCompleted = currentStep > s.step;
              const isActive = currentStep === s.step;
              return (
                <div key={s.step} className="flex flex-col items-center text-center relative z-10">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs border transition-all duration-300 ${
                      isCompleted
                        ? "bg-teal-500 border-teal-500 text-white"
                        : isActive
                        ? "bg-white dark:bg-slate-900 border-teal-500 text-teal-600 ring-4 ring-teal-500/10 font-bold"
                        : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-400"
                    }`}
                  >
                    {isCompleted ? "✓" : s.step}
                  </div>
                  <span
                    className={`text-[10px] mt-1.5 font-bold uppercase tracking-wider transition-colors duration-300 select-none ${
                      isActive
                        ? "text-teal-600 dark:text-teal-400"
                        : isCompleted
                        ? "text-slate-700 dark:text-slate-300"
                        : "text-slate-400"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
            
            {/* Connecting line */}
            <div className="absolute top-3.5 left-[12.5%] right-[12.5%] h-0.5 bg-slate-100 dark:bg-slate-800 -z-0">
              <div
                className="bg-teal-500 h-full transition-all duration-500 ease-out"
                style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
              />
            </div>
          </div>

          {formError && (
            <div className="p-3.5 bg-rose-50/80 border border-rose-100 rounded-2xl text-rose-600 text-sm font-medium flex items-center gap-3 mb-6">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* STEP 1: PILIH KONSELOR */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Pilih psikolog atau konselor kampus yang ingin Anda temui:
              </p>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {loading ? (
                  <div className="text-center text-slate-400 py-8 text-sm">Memuat daftar konselor...</div>
                ) : (
                  counselors.map((c) => {
                    const isSelected = selectedCounselorId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCounselorId(c.id)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${
                        isSelected
                          ? "bg-stone-50 dark:bg-slate-800/80 border-teal-500/30 ring-1 ring-teal-500/30"
                          : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
                      }`}
                    >
                      <img
                        src={c.avatar}
                        alt={c.name}
                        className="w-12 h-12 rounded-full object-cover border border-slate-100 dark:border-slate-700 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-base font-medium truncate ${isSelected ? "text-teal-700 dark:text-teal-400" : "text-slate-800 dark:text-slate-200"}`}
                        >
                          {c.name}
                        </p>
                        <p className="text-sm text-slate-500 truncate">
                          {c.title} &bull; {c.university}
                        </p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? "bg-teal-500 border-teal-500 text-white"
                            : "border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3 h-3" />}
                      </div>
                    </button>
                  );
                })
                )}
              </div>
            </div>
          )}

          {/* STEP 2: PILIH JADWAL & METODE */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="p-4 bg-stone-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 rounded-2xl flex items-center gap-4">
                <img
                  src={currentCounselor.avatar}
                  alt={currentCounselor.name}
                  className="w-12 h-12 rounded-full object-cover shrink-0"
                />
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    Sesi dengan {currentCounselor.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedConcern}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="session-date-input"
                    className="block text-sm text-slate-600 dark:text-slate-400"
                  >
                    Tanggal
                  </label>
                  <input
                    id="session-date-input"
                    type="date"
                    required
                    min={new Date().toISOString().split("T")[0]}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/10 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="session-time-input"
                    className="block text-sm text-slate-600 dark:text-slate-400"
                  >
                    Waktu
                  </label>
                  <select
                    id="session-time-input"
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    disabled={isFullyBooked || availableSlots.length === 0}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/10 transition-all disabled:opacity-50"
                  >
                    {availableSlots.length > 0 ? (
                      availableSlots.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))
                    ) : (
                      <option value="">Penuh / Tidak Tersedia</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="session-timezone"
                  className="block text-sm text-slate-600 dark:text-slate-400"
                >
                  Zona Waktu
                </label>
                <select
                  id="session-timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value as any)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/10 transition-all"
                >
                  <option value="WIB">WIB (Jakarta / Jawa / Sumatra)</option>
                  <option value="WITA">WITA (Bali / Sulawesi / Kaltim)</option>
                  <option value="WIT">WIT (Maluku / Papua)</option>
                </select>
              </div>

              <div className="pt-2">
                <div className="p-4 bg-teal-50/50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-900/30 rounded-2xl flex items-start gap-3">
                  <div className="mt-0.5 text-teal-600">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-teal-800 dark:text-teal-300">Sesi Virtual Video Call</p>
                    <p className="text-xs text-teal-600/80 dark:text-teal-400/80 mt-1">
                      Tautan aman (Jitsi/WebRTC) akan diberikan setelah konfirmasi.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          
          {/* STEP 3: DATA DIRI */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm text-slate-600 dark:text-slate-400">Nama Lengkap</label>
                  <input type="text" value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Sesuai kartu identitas" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/10 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm text-slate-600 dark:text-slate-400">NIM / Nomor Induk</label>
                  <input type="text" value={studentNIM} onChange={(e) => setStudentNIM(e.target.value)} placeholder="Cth: 12345678" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/10 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm text-slate-600 dark:text-slate-400">Email Utama</label>
                  <input type="email" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} placeholder="email@contoh.com" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/10 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm text-slate-600 dark:text-slate-400">Nomor WhatsApp Aktif</label>
                  <input type="tel" value={studentPhone} onChange={(e) => setStudentPhone(e.target.value)} placeholder="0812..." className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/10 transition-all" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: KONFIRMASI RINGKASAN */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="bg-stone-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 space-y-5">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Konselor</p>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{counselors.find(c => c.id === selectedCounselorId)?.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Jadwal Sesi</p>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {new Date(date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} — {timeSlot} {timezone}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Data Pemesan</p>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{studentName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{studentEmail}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Dengan mengonfirmasi jadwal ini, Anda menyetujui bahwa pembatalan atau perubahan jadwal wajib dilakukan maksimal 24 jam sebelum sesi dimulai.
                </p>
              </div>
            </div>
          )}
        </div>
        
{/* Footer Navigation Buttons */}
        <div className="pt-6 mt-8 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="px-5 py-3 min-h-[44px] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm font-medium rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Kembali</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 min-h-[44px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-sm font-medium rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
          )}

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="px-6 py-3 min-h-[44px] bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer ml-auto"
            >
              <span>Lanjut</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreateAppointment}
              disabled={isSubmitting}
              className="px-6 py-3 min-h-[44px] bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer ml-auto"
            >
              {isSubmitting ? "Memproses..." : "Konfirmasi Sesi"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
