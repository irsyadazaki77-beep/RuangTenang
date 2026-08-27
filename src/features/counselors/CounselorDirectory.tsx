import { useEscapeKey } from "../../hooks/useEscapeKey";
import React, { useState, useEffect } from "react";
import {
  Search,
  Users,
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  X,
  Calendar,
  MessageSquare,
  Lock,
  Filter,
} from "lucide-react";
import { Counselor } from "../../types";


interface CounselorDirectoryProps {
  onSelectCounselorForBooking: (counselor: Counselor) => void;
}

import { useCounselors } from '../../hooks/useCounselors';

export const CounselorDirectory: React.FC<CounselorDirectoryProps> = ({
  onSelectCounselorForBooking,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { counselors, loading, error } = useCounselors();

  const [selectedConcern, setSelectedConcern] = useState<string>("Semua");
  const [scheduleFilter, setScheduleFilter] = useState<
    "Semua" | "Hari Ini" | "Minggu Ini"
  >("Semua");
  const [genderFilter, setGenderFilter] = useState<"Semua" | "Perempuan" | "Laki-laki">("Semua");
  const [methodFilter, setMethodFilter] = useState<string>("Semua");
  const [costFilter, setCostFilter] = useState<string>("Semua");
  const [campusFilter, setCampusFilter] = useState<string>("Semua");
  const [languageFilter, setLanguageFilter] = useState<string>("Semua");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("Semua");
  const [selectedCounselorModal, setSelectedCounselorModal] =
    useState<Counselor | null>(null);
  useEscapeKey(() => setSelectedCounselorModal(null), !!selectedCounselorModal);

  const CONCERN_CATEGORIES = [
    "Semua",
    "Kendala Akademik & Skripsi",
    "Kecemasan & Burnout",
    "Hubungan & Sosial Kampus",
    "Suasana Hati & Depresi",
  ];

  const filteredCounselors = counselors.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.university.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.specialties.some((s) =>
        s.toLowerCase().includes(searchQuery.toLowerCase()),
      );

    const matchesConcern =
      selectedConcern === "Semua" ||
      c.specialties.some((s) =>
        s.toLowerCase().includes(selectedConcern.toLowerCase().split(" ")[0]),
      );

    const matchesGender =
      genderFilter === "Semua" ||
      (genderFilter === "Perempuan" &&
        (c.name.includes("Dr.") ||
          c.name.includes("S.Psi") ||
          c.name.includes("Anindya") ||
          c.name.includes("Larasati") ||
          c.name.includes("Aulia"))) ||
      (genderFilter === "Laki-laki" &&
        !c.name.includes("Anindya") &&
        !c.name.includes("Larasati") &&
        !c.name.includes("Aulia"));

    const matchesMethod = methodFilter === "Semua" || c.consultationType.includes(methodFilter as any);
    const matchesCost = costFilter === "Semua" || (costFilter === "Gratis" ? c.isFreeForStudents : !c.isFreeForStudents);
    const matchesCampus = campusFilter === "Semua" || c.university.includes(campusFilter);
    const matchesLanguage = languageFilter === "Semua" || (c.languages && c.languages.includes(languageFilter));
    const matchesAvailability = availabilityFilter === "Semua" || (availabilityFilter === "Hari Ini" ? c.availableToday : true);

    return matchesSearch && matchesConcern && matchesGender && matchesMethod && matchesCost && matchesCampus && matchesLanguage && matchesAvailability;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 font-sans">
      {/* Header Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
            Direktori Konselor Terverifikasi
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Temui Konselor & Psikolog Kampus
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
          Konseling profesional & rahasia untuk masalah skripsi, adaptasi
          perkuliahan, kecemasan, atau masalah pribadi.
        </p>
      </div>

      {/* Filter Controls (Requirement 11) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Cari nama konselor, kampus, atau topik..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 rounded-xl pl-10 pr-4 py-2.5 text-base sm:text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 min-h-[44px]"
            />
          </div>

          {/* Gender Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold border border-slate-200">
            <span className="text-slate-500 text-xs px-2">Gender:</span>
            {(["Semua", "Perempuan", "Laki-laki"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGenderFilter(g)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer min-h-[44px] ${
                  genderFilter === g
                    ? "bg-teal-700 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        
        {/* Advanced Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-3 border-t border-slate-100">
          <select value={campusFilter} onChange={(e) => setCampusFilter(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 text-base sm:text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500">
            <option value="Semua">Semua Kampus</option>
            <option value="UI">UI</option>
            <option value="ITB">ITB</option>
            <option value="UGM">UGM</option>
            <option value="UNAIR">UNAIR</option>
          </select>
          <select value={costFilter} onChange={(e) => setCostFilter(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 text-base sm:text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500">
            <option value="Semua">Semua Biaya</option>
            <option value="Gratis">Gratis (Mahasiswa)</option>
            <option value="Berbayar">Berbayar</option>
          </select>
          <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 text-base sm:text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500">
            <option value="Semua">Semua Metode</option>
            <option value="video_call">Video Call</option>
            <option value="Chat">Chat</option>
            <option value="in_person">Tatap Muka</option>
          </select>
          <select value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 text-base sm:text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500">
            <option value="Semua">Semua Bahasa</option>
            <option value="Indonesia">Indonesia</option>
            <option value="Inggris">Inggris</option>
            <option value="Jawa">Jawa</option>
          </select>
          <select value={availabilityFilter} onChange={(e) => setAvailabilityFilter(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 text-base sm:text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500">
            <option value="Semua">Semua Ketersediaan</option>
            <option value="Hari Ini">Tersedia Hari Ini</option>
          </select>
        </div>

        {/* Concern Categories Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 no-scrollbar text-xs border-t border-slate-100">
          <span className="text-slate-500 font-bold shrink-0 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-teal-600" /> Kebutuhan:
          </span>
          {CONCERN_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedConcern(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap cursor-pointer min-h-[44px] ${
                selectedConcern === cat
                  ? "bg-teal-700 text-white font-bold"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Grid (Requirement 10: Clean Essentials) */}
      {filteredCounselors.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3 shadow-xs">
          <Users className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="font-bold text-slate-900 text-sm">
            Tidak Ada Konselor Ditemukan
          </h3>
          <p className="text-slate-500 text-xs max-w-sm mx-auto">
            Coba ubah kata kunci pencarian atau sesuaikan filter kriteria.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedConcern("Semua");
              setGenderFilter("Semua");
              setMethodFilter("Semua");
              setCostFilter("Semua");
              setCampusFilter("Semua");
              setLanguageFilter("Semua");
              setAvailabilityFilter("Semua");
            }}
            className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer min-h-[44px]"
          >
            Reset Semua Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCounselors.map((counselor) => (
            <div
              key={counselor.id}
              className="bg-white border border-slate-200 hover:border-teal-500 rounded-2xl p-5 transition-all shadow-xs space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                
                {/* Credentials & Verification Notice */}
                {counselor.isDemoData ? (
                  <div className="bg-yellow-50/50 border border-yellow-100 rounded-xl p-3 mb-2 space-y-1">
                     <p className="text-[11px] text-yellow-800 flex items-center gap-1 font-medium"><ShieldCheck className="w-3.5 h-3.5" /> Demo Data (Fiktif)</p>
                     <p className="text-[10px] text-yellow-600">Tidak untuk digunakan nyata</p>
                  </div>
                ) : counselor.licenseNumber ? (
                  <div className="bg-teal-50/50 border border-teal-100 rounded-xl p-3 mb-2 space-y-1">
                     <p className="text-[11px] text-teal-800 flex items-center gap-1 font-medium"><ShieldCheck className="w-3.5 h-3.5" /> Terverifikasi HIMPSI & SIPP Aktif</p>
                     <p className="text-[10px] text-teal-600">No: {counselor.licenseNumber}</p>
                  </div>
                ) : (
                  <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 mb-2 space-y-1">
                     <p className="text-[11px] text-slate-700 flex items-center gap-1 font-medium"><Users className="w-3.5 h-3.5" /> Konselor Belum Terverifikasi</p>
                     <p className="text-[10px] text-slate-500">Menunggu proses verifikasi SIPP</p>
                  </div>
                )}
                {/* Essentials: Photo, Name, Title, University */}
                <div className="flex items-start gap-3.5">
                  <img
                    src={counselor.avatar}
                    alt={counselor.name}
                    width={56}
                    height={56}
                    loading="lazy"
                    className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0 cursor-pointer"
                    onClick={() => setSelectedCounselorModal(counselor)}
                  />
                  <div className="space-y-1 flex-1 min-w-0">
                    <h3
                      onClick={() => setSelectedCounselorModal(counselor)}
                      className="font-bold text-slate-900 text-base leading-tight cursor-pointer hover:text-teal-700 transition-colors truncate"
                    >
                      {counselor.name}
                    </h3>
                    <p className="text-xs text-slate-600 font-medium">
                      {counselor.title}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{counselor.university}</span>
                    </p>
                  </div>
                </div>

                {/* Specialties & Badge */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="px-2.5 py-1 bg-teal-50 text-teal-700 rounded-lg text-xs font-bold border border-teal-200 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> 100% Virtual Session
                  </span>
                  
                  {counselor.availableToday && (
                    <span className="px-2.5 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-bold border border-green-200 flex items-center gap-1">
                      Hari Ini
                    </span>
                  )}
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium">
                      {counselor.isFreeForStudents ? 'Gratis' : `Rp${counselor.price?.toLocaleString('id-ID')}`}
                  </span>
                  {counselor.specialties.slice(0, 1).map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Essential Details: Available schedule, method, and 1 primary CTA */}
              <div className="pt-3 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Jadwal Tersedia Terdekat:</span>
                  <span className="font-bold text-slate-900 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-teal-600" />{" "}
                    {counselor.nextAvailableSlot}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedCounselorModal(counselor)}
                    className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-all cursor-pointer min-h-[44px]"
                  >
                    Profil
                  </button>

                  <button
                    onClick={() => onSelectCounselorForBooking(counselor)}
                    className="flex-1 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
                  >
                    <span>Pilih & Jadwalkan</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedCounselorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 relative text-slate-800 animate-fade-in">
            <button
              onClick={() => setSelectedCounselorModal(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-800 rounded-lg transition-colors cursor-pointer min-h-[44px]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4">
              <img
                src={selectedCounselorModal.avatar}
                alt={selectedCounselorModal.name}
                width={64}
                height={64}
                className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-xs"
              />
              <div className="space-y-1 min-w-0 flex-1">
                {selectedCounselorModal.isDemoData ? (
                  <span className="px-2.5 py-0.5 bg-yellow-50 text-yellow-700 font-semibold text-xs rounded-full border border-yellow-200 inline-flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-yellow-600" /> Demo Data
                  </span>
                ) : selectedCounselorModal.licenseNumber ? (
                  <span className="px-2.5 py-0.5 bg-teal-50 text-teal-700 font-semibold text-xs rounded-full border border-teal-200 inline-flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-600" /> Psikolog Terverifikasi
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-slate-50 text-slate-700 font-semibold text-xs rounded-full border border-slate-200 inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-600" /> Belum Terverifikasi
                  </span>
                )}
                <h2 className="font-bold text-base text-slate-900 truncate">
                  {selectedCounselorModal.name}
                </h2>
                <p className="text-xs text-slate-600 font-medium truncate">
                  {selectedCounselorModal.title}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {selectedCounselorModal.university}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-900">
                Pendekatan Konseling
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl max-h-32 overflow-y-auto">
                {selectedCounselorModal.bio}
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <div>
                <p className="text-xs text-slate-500 font-medium">
                  Layanan Konseling:
                </p>
                <p className="text-xs font-bold text-slate-900">
                  Khusus Mahasiswa Perguruan Tinggi
                </p>
              </div>

              <button
                onClick={() => {
                  const counselor = selectedCounselorModal;
                  setSelectedCounselorModal(null);
                  onSelectCounselorForBooking(counselor);
                }}
                className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer min-h-[44px]"
              >
                <span>Pilih & Jadwalkan</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
