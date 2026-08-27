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

      {/* Filter Controls */}
      <div className="bg-white border border-slate-200/70 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama konselor, kampus, atau topik..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50/50 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 border border-slate-200/80 focus:outline-none focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/10 transition-all min-h-[48px]"
            />
          </div>

          {/* Gender Filter */}
          <div className="flex items-center bg-slate-50/50 p-1 rounded-xl text-sm font-medium border border-slate-200/80">
            {(["Semua", "Perempuan", "Laki-laki"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGenderFilter(g)}
                className={`px-4 py-2 rounded-lg transition-all cursor-pointer min-h-[40px] ${
                  genderFilter === g
                    ? "bg-white text-teal-700 shadow-sm border border-slate-200/60"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        
        {/* Advanced Filters */}
        <div className="flex flex-wrap gap-3 pt-3 border-t border-slate-100">
          <select value={campusFilter} onChange={(e) => setCampusFilter(e.target.value)} className="bg-white border border-slate-200/80 text-slate-600 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-teal-500 min-h-[44px]">
            <option value="Semua">Semua Kampus</option>
            <option value="UI">UI</option>
            <option value="ITB">ITB</option>
            <option value="UGM">UGM</option>
            <option value="UNAIR">UNAIR</option>
          </select>
          <select value={costFilter} onChange={(e) => setCostFilter(e.target.value)} className="bg-white border border-slate-200/80 text-slate-600 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-teal-500 min-h-[44px]">
            <option value="Semua">Semua Biaya</option>
            <option value="Gratis">Gratis (Mahasiswa)</option>
            <option value="Berbayar">Berbayar</option>
          </select>
          <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className="bg-white border border-slate-200/80 text-slate-600 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-teal-500 min-h-[44px]">
            <option value="Semua">Semua Metode</option>
            <option value="video_call">Video Call</option>
            <option value="in_person">Tatap Muka</option>
          </select>
        </div>
      </div>

      {/* Directory Grid */}
      {filteredCounselors.length === 0 ? (
        <div className="bg-white border border-slate-200/70 rounded-2xl p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
             <Users className="w-8 h-8 text-slate-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-lg">
              Tidak Ada Konselor Ditemukan
            </h3>
            <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
              Coba ubah kata kunci pencarian atau sesuaikan filter kriteria.
            </p>
          </div>
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
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-xl transition-all cursor-pointer min-h-[44px]"
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCounselors.map((counselor) => (
            <div
              key={counselor.id}
              className="bg-white border border-slate-200/70 hover:border-teal-200 rounded-2xl p-5 transition-all shadow-sm hover:shadow-md space-y-5 flex flex-col justify-between group"
            >
              <div className="space-y-4">
                {/* Essentials: Photo, Name, Title, University */}
                <div className="flex items-center gap-4">
                  <img
                    src={counselor.avatar}
                    alt={counselor.name}
                    width={64}
                    height={64}
                    loading="lazy"
                    className="w-16 h-16 rounded-full object-cover border border-slate-100 shadow-sm shrink-0 cursor-pointer group-hover:scale-105 transition-transform"
                    onClick={() => setSelectedCounselorModal(counselor)}
                  />
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <h3
                      onClick={() => setSelectedCounselorModal(counselor)}
                      className="font-semibold text-slate-900 text-base leading-tight cursor-pointer hover:text-teal-700 transition-colors truncate"
                    >
                      {counselor.name}
                    </h3>
                    <p className="text-sm text-slate-500 font-medium truncate">
                      {counselor.title}
                    </p>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span className="truncate">{counselor.university}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Essential Details: Available schedule, method, and 1 primary CTA */}
              <div className="pt-4 border-t border-slate-100/80 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Sesi Terdekat</span>
                  <span className="font-medium text-slate-800 flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md">
                    <Calendar className="w-4 h-4 text-teal-600" />
                    {counselor.nextAvailableSlot}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => setSelectedCounselorModal(counselor)}
                    className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-xl transition-all cursor-pointer min-h-[44px]"
                  >
                    Profil
                  </button>

                  <button
                    onClick={() => onSelectCounselorForBooking(counselor)}
                    className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                  >
                    <span>Jadwalkan</span>
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
