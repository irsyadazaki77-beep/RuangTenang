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
      setCurrentStep(1);
    }
  }, [selectedCounselorFromDir]);

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
      if (!selectedCounselorId) return setFormError("Pilih konselor terlebih dahulu untuk melanjutkan.");
    } else if (currentStep === 2) {
      if (!date || !timeSlot) return setFormError("Pilih tanggal dan waktu sesi.");
    } else if (currentStep === 3) {
      if (!studentName.trim() || !studentNIM.trim() || !studentEmail.trim()) {
        return setFormError("Mohon lengkapi Nama, NIM, dan Email Anda.");
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

  const currentCounselor = counselors.find((c) => c.id === selectedCounselorId);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center max-sm:items-end p-3 sm:p-4 max-sm:p-0 font-sans animate-fade-in">
      <div className="surface-card text-primary border border-default rounded-2xl max-sm:rounded-b-none max-sm:rounded-t-2xl max-w-lg w-full p-4 sm:p-6 shadow-xl relative max-h-[92dvh] overflow-y-auto flex flex-col justify-between max-sm:animate-slide-up transition-transform duration-200">
        {/* Drag handle for mobile bottom sheet */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Header & Stepper */}
        <div>
          <div className="flex items-center justify-between pb-3.5 border-b border-default mb-4">
            <div>
              <p className="text-[10.5px] font-semibold text-secondary uppercase tracking-wider mb-0.5">
                Langkah {currentStep} dari 4
              </p>
              <h2 className="text-lg sm:text-xl font-bold text-primary">
                {currentStep === 1 && "Pilih Konselor"}
                {currentStep === 2 && "Pilih Jadwal Sesi"}
                {currentStep === 3 && "Informasi Pribadi"}
                {currentStep === 4 && "Konfirmasi"}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-secondary hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
              aria-label="Tutup Form"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Stepper Indicator: Langkah X dari 4 + Progress Bar */}
          <div className="sm:hidden mb-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-teal-700 dark:text-teal-400">
                Langkah {currentStep} dari 4: {
                  currentStep === 1 ? "Pilih Konselor" :
                  currentStep === 2 ? "Pilih Jadwal" :
                  currentStep === 3 ? "Data Diri" : "Konfirmasi"
                }
              </span>
              <span className="text-secondary font-medium">
                {Math.round((currentStep / 4) * 100)}%
              </span>
            </div>
            <div className="h-1.5 w-full surface-muted rounded-full overflow-hidden border border-default">
              <div
                className="h-full bg-teal-600 dark:bg-teal-500 rounded-full transition-all duration-200"
                style={{ width: `${(currentStep / 4) * 100}%` }}
              />
            </div>
          </div>

          {/* Desktop Visual Stepper Indicators */}
          <div className="hidden sm:grid sm:grid-cols-4 gap-2 mb-6 relative">
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
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs border transition-all duration-200 ${
                      isCompleted
                        ? "bg-teal-600 border-teal-600 text-white"
                        : isActive
                        ? "surface-card border-teal-600 text-teal-700 dark:text-teal-400 ring-3 ring-teal-500/20 font-bold"
                        : "surface-muted border-default text-secondary"
                    }`}
                  >
                    {isCompleted ? "✓" : s.step}
                  </div>
                  <span
                    className={`text-[10px] mt-1 font-semibold uppercase tracking-wider transition-colors duration-200 select-none ${
                      isActive
                        ? "text-teal-700 dark:text-teal-400 font-bold"
                        : isCompleted
                        ? "text-primary"
                        : "text-secondary"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
            
            {/* Connecting line */}
            <div className="absolute top-3 left-[12.5%] right-[12.5%] h-0.5 bg-slate-200 dark:bg-slate-800 -z-0">
              <div
                className="bg-teal-600 dark:bg-teal-500 h-full transition-all duration-300 ease-out"
                style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
              />
            </div>
          </div>

          {formError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2.5 mb-4">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* STEP 1: PILIH KONSELOR */}
          {currentStep === 1 && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <p className="text-xs text-secondary">
                Pilih psikolog atau konselor kampus yang ingin Anda temui:
              </p>
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {loading ? (
                  <div className="text-center text-secondary py-8 text-xs">Memuat daftar konselor...</div>
                ) : (
                  counselors.map((c) => {
                    const isSelected = selectedCounselorId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCounselorId(c.id)}
                        className={`w-full text-left p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                          isSelected
                            ? "surface-muted border-teal-600/50 ring-1 ring-teal-600/50"
                            : "surface-card border-default hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        }`}
                      >
                        <img
                          src={c.avatar}
                          alt={c.name}
                          className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover border border-default shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-semibold truncate ${isSelected ? "text-teal-700 dark:text-teal-400" : "text-primary"}`}
                          >
                            {c.name}
                          </p>
                          <p className="text-xs text-secondary truncate mt-0.5">
                            {c.title} &bull; {c.university}
                          </p>
                        </div>
                        <div
                          className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? "bg-teal-600 border-teal-600 text-white"
                              : "border-default"
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
            <div className="space-y-4 animate-in fade-in duration-200">
              {currentCounselor ? (
                <div className="p-3.5 surface-muted border border-default rounded-xl flex items-center gap-3">
                  <img
                    src={currentCounselor.avatar}
                    alt={currentCounselor.name}
                    className="w-10 h-10 rounded-xl object-cover shrink-0 border border-default"
                  />
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-primary">
                      Sesi dengan {currentCounselor.name}
                    </p>
                    <p className="text-[11px] text-secondary mt-0.5">
                      {selectedConcern}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-amber-800 dark:text-amber-300 text-xs">
                  Pilih konselor terlebih dahulu di Langkah 1.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="session-date-input"
                    className="block text-xs font-semibold text-secondary"
                  >
                    Tanggal Sesi
                  </label>
                  <input
                    id="session-date-input"
                    type="date"
                    required
                    min={new Date().toISOString().split("T")[0]}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full surface-muted border border-default rounded-xl px-3.5 py-2 text-base sm:text-sm text-primary focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-all min-h-[44px]"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="session-time-input"
                    className="block text-xs font-semibold text-secondary"
                  >
                    Waktu Sesi
                  </label>
                  <select
                    id="session-time-input"
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    disabled={isFullyBooked || availableSlots.length === 0}
                    className="w-full surface-muted border border-default rounded-xl px-3.5 py-2 text-base sm:text-sm text-primary focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-all disabled:opacity-50 min-h-[44px]"
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

              <div className="space-y-1">
                <label
                  htmlFor="session-timezone"
                  className="block text-xs font-semibold text-secondary"
                >
                  Zona Waktu
                </label>
                <select
                  id="session-timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value as any)}
                  className="w-full surface-muted border border-default rounded-xl px-3.5 py-2 text-base sm:text-sm text-primary focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-all min-h-[44px]"
                >
                  <option value="WIB">WIB (Jakarta / Jawa / Sumatra)</option>
                  <option value="WITA">WITA (Bali / Sulawesi / Kaltim)</option>
                  <option value="WIT">WIT (Maluku / Papua)</option>
                </select>
              </div>

              <div className="pt-1">
                <div className="p-3 bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/40 rounded-xl flex items-start gap-2.5">
                  <div className="mt-0.5 text-teal-600 dark:text-teal-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-teal-900 dark:text-teal-200">Sesi Virtual Video Call</p>
                    <p className="text-[11px] text-teal-700 dark:text-teal-400 mt-0.5">
                      Tautan aman sesi tele-konseling akan diberikan setelah terkonfirmasi.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: DATA DIRI */}
          {currentStep === 3 && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-secondary">Nama Lengkap</label>
                  <input type="text" value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Sesuai kartu identitas" className="w-full surface-muted border border-default rounded-xl px-3.5 py-2 text-base sm:text-sm text-primary focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-all min-h-[44px]" />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-secondary">NIM / Nomor Induk</label>
                  <input type="text" value={studentNIM} onChange={(e) => setStudentNIM(e.target.value)} placeholder="Cth: 12345678" className="w-full surface-muted border border-default rounded-xl px-3.5 py-2 text-base sm:text-sm text-primary focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-all min-h-[44px]" />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-secondary">Email Utama</label>
                  <input type="email" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} placeholder="email@contoh.com" className="w-full surface-muted border border-default rounded-xl px-3.5 py-2 text-base sm:text-sm text-primary focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-all min-h-[44px]" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: KONFIRMASI RINGKASAN */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="surface-muted border border-default rounded-xl p-4 space-y-3">
                <div className="space-y-0.5">
                  <p className="text-[11px] font-semibold text-secondary">Konselor</p>
                  <p className="text-xs sm:text-sm font-bold text-primary">{counselors.find(c => c.id === selectedCounselorId)?.name || "-"}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[11px] font-semibold text-secondary">Jadwal Sesi</p>
                  <p className="text-xs sm:text-sm font-bold text-primary">
                    {date ? new Date(date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "-"} — {timeSlot} {timezone}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[11px] font-semibold text-secondary">Data Pemesan</p>
                  <p className="text-xs sm:text-sm font-bold text-primary">{studentName}</p>
                  <p className="text-[11px] text-secondary mt-0.5">{studentEmail}</p>
                </div>
              </div>

              <div className="p-3 surface-card border border-default rounded-xl">
                <p className="text-[11px] text-secondary leading-relaxed">
                  Dengan mengonfirmasi jadwal ini, Anda menyetujui bahwa pembatalan atau perubahan jadwal wajib dilakukan maksimal 24 jam sebelum sesi dimulai.
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Sticky Footer Navigation Buttons */}
        <div className="sticky bottom-0 surface-card border-t border-default pt-3 pb-[max(env(safe-area-inset-bottom),_0.75rem)] mt-5 -mx-4 sm:-mx-6 px-4 sm:px-6 flex items-center justify-between gap-2.5 z-10">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="px-4 py-2 min-h-[44px] surface-card border border-default hover:bg-slate-100 dark:hover:bg-slate-800 text-secondary text-xs sm:text-sm font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Kembali</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 min-h-[44px] text-secondary hover:text-primary text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer active:scale-[0.98]"
            >
              Batal
            </button>
          )}

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="px-5 py-2 min-h-[44px] bg-slate-800 dark:bg-white hover:bg-slate-900 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs sm:text-sm font-semibold rounded-xl shadow-3xs transition-all flex items-center gap-1.5 cursor-pointer ml-auto active:scale-[0.98]"
            >
              <span>Lanjut</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreateAppointment}
              disabled={isSubmitting}
              className="px-5 py-2 min-h-[44px] bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-3xs transition-all disabled:opacity-50 cursor-pointer ml-auto active:scale-[0.98] flex items-center gap-1.5"
            >
              {isSubmitting ? "Memproses..." : "Konfirmasi Sesi"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
