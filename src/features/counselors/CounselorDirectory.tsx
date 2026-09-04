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
  Filter,
  Briefcase,
  Award,
  Languages,
  MapPin,
  Star,
} from "lucide-react";
import { Counselor } from "../../types";
import { CounselorSpecialtyId, mapSpecialtiesToIds } from "./counselorUtils";


interface CounselorDirectoryProps {
  onSelectCounselorForBooking: (counselor: Counselor) => void;
}

import { useCounselors } from '../../hooks/useCounselors';

export const CounselorDirectory: React.FC<CounselorDirectoryProps> = ({
  onSelectCounselorForBooking,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConcern, setSelectedConcern] = useState<string>("Semua");
  const [methodFilter, setMethodFilter] = useState<string>("Semua");
  const [costFilter, setCostFilter] = useState<string>("Semua");
  const [campusFilter, setCampusFilter] = useState<string>("Semua");
    const [availabilityFilter, setAvailabilityFilter] = useState<string>("Semua");
  const { counselors } = useCounselors();

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedCounselorModal, setSelectedCounselorModal] =
    useState<Counselor | null>(null);
  useEscapeKey(() => setSelectedCounselorModal(null), !!selectedCounselorModal);

  const CONCERN_CATEGORIES: { id: string; label: string; specialtyIds: CounselorSpecialtyId[] }[] = [
    { id: "Semua", label: "Semua", specialtyIds: [] },
    { id: "akademik", label: "Kendala Akademik & Skripsi", specialtyIds: ["akademik"] },
    { id: "kecemasan", label: "Kecemasan & Burnout", specialtyIds: ["kecemasan", "burnout"] },
    { id: "sosial", label: "Hubungan & Sosial Kampus", specialtyIds: ["sosial"] },
    { id: "mood", label: "Suasana Hati & Depresi", specialtyIds: ["mood", "krisis"] },
  ];

  const filteredCounselors = counselors.filter((c) => {
    const matchesSearch = searchQuery.trim() === "" ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.university.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.specialties.some((s) =>
        s.toLowerCase().includes(searchQuery.toLowerCase()),
      );

    const selectedConcernCategory = CONCERN_CATEGORIES.find(cat => cat.id === selectedConcern);
    const cSpecialtyIds = mapSpecialtiesToIds(c.specialties);
    const matchesConcern =
      selectedConcern === "Semua" ||
      !selectedConcernCategory ||
      selectedConcernCategory.specialtyIds.some(id => cSpecialtyIds.includes(id));

    const matchesMethod = methodFilter === "Semua" || c.consultationType.includes(methodFilter as any);
    const matchesCost = costFilter === "Semua" || (costFilter === "Gratis" ? c.isFreeForStudents : !c.isFreeForStudents);
    const matchesCampus = campusFilter === "Semua" || c.university.includes(campusFilter);
        const matchesAvailability = availabilityFilter === "Semua" || (availabilityFilter === "Hari Ini" ? c.availableToday : true);

    return matchesSearch && matchesConcern && matchesMethod && matchesCost && matchesCampus && matchesAvailability;
  });

  return (
    <div className="max-w-6xl mx-auto px-3.5 sm:px-4 md:px-5 py-3.5 sm:py-4 md:py-5 space-y-3.5 sm:space-y-4 font-sans">
      {/* Header Section */}
      <div className="surface-card rounded-xl p-3.5 sm:p-4 space-y-1.5 border border-default shadow-3xs">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 px-2.5 py-0.5 rounded-full border border-teal-200 dark:border-teal-900">
            Direktori Konselor & Psikolog
          </span>
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-primary tracking-tight">
          Temui Konselor & Psikolog
        </h2>
        <p className="text-xs sm:text-sm text-secondary leading-relaxed max-w-2xl">
          Konseling profesional & rahasia untuk masalah skripsi, adaptasi
          perkuliahan, kecemasan, atau masalah pribadi.
        </p>
      </div>

      {/* Filter Controls */}
      <div className="surface-card rounded-xl p-3 sm:p-3.5 space-y-3 border border-default shadow-3xs">
        <div className="flex flex-col md:flex-row gap-2.5">
          {/* Search Box */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama konselor, kampus, atau topik..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full surface-page rounded-lg pl-10 pr-3.5 py-2 text-xs sm:text-sm text-primary placeholder-slate-400 border border-default focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/15 transition-all min-h-[42px]"
            />
          </div>

          <div className="flex items-center gap-2">
            <select value={selectedConcern} onChange={(e) => setSelectedConcern(e.target.value)} className="surface-page border border-default text-primary text-xs sm:text-sm rounded-lg px-2.5 py-2 focus:outline-none focus:border-teal-500 min-h-[42px]">
              {CONCERN_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>Kebutuhan: {cat.label === 'Semua' ? 'Semua' : cat.label}</option>
              ))}
            </select>
            
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`p-2 sm:px-3 rounded-lg border transition-all cursor-pointer min-h-[42px] flex items-center gap-1.5 text-xs sm:text-sm font-medium ${
                showAdvancedFilters ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800' : 'surface-page border-default text-secondary hover:text-primary'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filter</span>
            </button>
          </div>
        </div>
        
        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="flex flex-wrap gap-2 pt-2.5 border-t border-default animate-in slide-in-from-top-2 fade-in">
            <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className="surface-card border border-default text-primary text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-500 min-h-[38px]">
              <option value="Semua">Semua Metode</option>
              <option value="video_call">Video Call</option>
              <option value="in_person">Tatap Muka</option>
            </select>

            <select value={costFilter} onChange={(e) => setCostFilter(e.target.value)} className="surface-card border border-default text-primary text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-500 min-h-[38px]">
              <option value="Semua">Semua Biaya</option>
              <option value="Gratis">Gratis (Mahasiswa)</option>
              <option value="Berbayar">Berbayar</option>
            </select>

            <select value={campusFilter} onChange={(e) => setCampusFilter(e.target.value)} className="surface-card border border-default text-primary text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-500 min-h-[38px]">
              <option value="Semua">Semua Kampus</option>
              <option value="UI">UI</option>
              <option value="ITB">ITB</option>
              <option value="UGM">UGM</option>
              <option value="UNAIR">UNAIR</option>
            </select>
            
            <select value={availabilityFilter} onChange={(e) => setAvailabilityFilter(e.target.value)} className="surface-card border border-default text-primary text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-500 min-h-[38px]">
              <option value="Semua">Semua Ketersediaan</option>
              <option value="Hari Ini">Tersedia Hari Ini</option>
            </select>

            <div className="flex-1" />
            
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedConcern("Semua");
                setMethodFilter("Semua");
                setCostFilter("Semua");
                setCampusFilter("Semua");
                setAvailabilityFilter("Semua");
              }}
              className="px-3 py-1.5 text-rose-600 dark:text-rose-400 text-xs font-medium hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Directory Grid */}
      {filteredCounselors.length === 0 ? (
        <div className="surface-card rounded-xl border border-default p-8 text-center space-y-3 shadow-3xs">
          <div className="w-12 h-12 surface-page rounded-full flex items-center justify-center mx-auto">
             <Users className="w-6 h-6 text-secondary" />
          </div>
          <div>
            <h3 className="font-semibold text-primary text-sm sm:text-base">
              Tidak Ada Konselor Ditemukan
            </h3>
            <p className="text-secondary text-xs sm:text-sm mt-0.5 max-w-sm mx-auto">
              Coba ubah kata kunci pencarian atau sesuaikan filter kriteria.
            </p>
          </div>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedConcern("Semua");
              setMethodFilter("Semua");
              setCostFilter("Semua");
              setCampusFilter("Semua");
              setAvailabilityFilter("Semua");
            }}
            className="px-4 py-2 surface-muted text-primary font-medium text-xs sm:text-sm rounded-lg transition-all cursor-pointer min-h-[38px] sm:min-h-[36px]"
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {filteredCounselors.map((counselor) => (
            <div
              key={counselor.id}
              className="surface-card border border-default hover:border-teal-500/50 rounded-xl p-3.5 sm:p-4 transition-all shadow-3xs hover:shadow-xs space-y-3.5 flex flex-col justify-between group"
            >
              <div className="space-y-3">
                {/* Essentials: Photo, Name, Title, University */}
                <div className="flex items-center gap-3">
                  <img
                    src={counselor.avatar}
                    alt={counselor.name}
                    width={52}
                    height={52}
                    loading="lazy"
                    className="w-12 h-12 sm:w-13 sm:h-13 rounded-full object-cover border border-default shadow-3xs shrink-0 cursor-pointer group-hover:scale-[1.02] transition-transform"
                    onClick={() => setSelectedCounselorModal(counselor)}
                  />
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <h3
                      onClick={() => setSelectedCounselorModal(counselor)}
                      className="font-semibold text-primary text-sm sm:text-base leading-tight cursor-pointer hover:text-teal-600 dark:hover:text-teal-400 transition-colors truncate"
                    >
                      {counselor.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-secondary font-medium truncate">
                      {counselor.title}
                    </p>
                    <p className="text-[11px] text-muted flex items-center gap-1 mt-0.5">
                      <GraduationCap className="w-3 h-3" />
                      <span className="truncate">{counselor.university}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Essential Details: Available schedule, method, and 1 primary CTA */}
              <div className="pt-3 border-t border-default space-y-3">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-secondary text-xs">Sesi Terdekat</span>
                  <span className="font-medium text-primary text-xs flex items-center gap-1.5 surface-muted px-2 py-0.5 rounded-md">
                    <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    {counselor.nextAvailableSlot}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    onClick={() => setSelectedCounselorModal(counselor)}
                    className="px-3 py-2 surface-muted border border-default hover:bg-slate-100 dark:hover:bg-slate-800 text-primary text-xs sm:text-sm font-medium rounded-lg transition-all cursor-pointer min-h-[38px] sm:min-h-[36px]"
                  >
                    Profil
                  </button>

                  <button
                    onClick={() => onSelectCounselorForBooking(counselor)}
                    className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs sm:text-sm rounded-lg shadow-3xs transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[38px] sm:min-h-[36px]"
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3.5 overflow-y-auto">
          <div className="surface-card border border-default rounded-2xl max-w-lg w-full p-4 sm:p-5 shadow-xl space-y-3.5 relative text-primary animate-fade-in my-4 max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setSelectedCounselorModal(null)}
              className="absolute top-3 right-3 p-1.5 text-secondary hover:text-primary rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Profile Header */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 text-center sm:text-left">
              <img
                src={selectedCounselorModal.avatar}
                alt={selectedCounselorModal.name}
                width={56}
                height={56}
                className="w-14 h-14 rounded-xl object-cover border border-default shadow-3xs shrink-0"
              />
              <div className="space-y-0.5 min-w-0 flex-1">
                {selectedCounselorModal.isDemoData ? (
                  <span className="px-2 py-0.5 bg-yellow-50 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-400 font-bold text-[9.5px] uppercase tracking-wider rounded-full border border-yellow-200 dark:border-yellow-900 inline-flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-yellow-600 dark:text-yellow-400" /> Demo Data
                  </span>
                ) : selectedCounselorModal.licenseNumber ? (
                  <span className="px-2 py-0.5 bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 font-bold text-[9.5px] uppercase tracking-wider rounded-full border border-teal-200 dark:border-teal-900 inline-flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-teal-600 dark:text-teal-400" /> Terverifikasi
                  </span>
                ) : (
                  <span className="px-2 py-0.5 surface-muted text-secondary font-bold text-[9.5px] uppercase tracking-wider rounded-full border border-default inline-flex items-center gap-1">
                    <Users className="w-3 h-3 text-secondary" /> Belum Terverifikasi
                  </span>
                )}
                <h2 className="font-bold text-base sm:text-lg text-primary tracking-tight">
                  {selectedCounselorModal.name}
                </h2>
                <p className="text-xs text-secondary font-medium">
                  {selectedCounselorModal.title}
                </p>
                <p className="text-[11px] text-muted flex items-center justify-center sm:justify-start gap-1">
                  <GraduationCap className="w-3 h-3 shrink-0" />
                  <span className="truncate">{selectedCounselorModal.university}</span>
                </p>
              </div>
            </div>

            {/* Quick Metrics Row */}
            <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
              <div>
                <span className="text-[9.5px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-bold">Pengalaman</span>
                <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1 mt-0.5">
                  <Briefcase className="w-3 h-3 text-teal-500" />
                  {selectedCounselorModal.experienceYears} Tahun
                </span>
              </div>
              <div>
                <span className="text-[9.5px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-bold">Rating</span>
                <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1 mt-0.5">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {selectedCounselorModal.rating.toFixed(1)}
                </span>
              </div>
              <div>
                <span className="text-[9.5px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-bold">No. Lisensi</span>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mt-0.5 truncate" title={selectedCounselorModal.licenseNumber || "N/A"}>
                  {selectedCounselorModal.licenseNumber || "N/A"}
                </span>
              </div>
            </div>

            {/* Specialties */}
            <div className="space-y-1">
              <h4 className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                <Award className="w-3 h-3 text-teal-600" /> Spesialisasi & Keahlian
              </h4>
              <div className="flex flex-wrap gap-1">
                {selectedCounselorModal.specialties.map((spec, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 text-[9.5px] font-semibold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 rounded-md border border-teal-100 dark:border-teal-900"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>

            {/* Biography */}
            <div className="space-y-1">
              <h4 className="text-[11px] font-bold text-primary uppercase tracking-wider">
                Biografi & Pendekatan
              </h4>
              <p className="text-xs text-secondary leading-relaxed bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 p-2.5 rounded-xl max-h-28 overflow-y-auto">
                {selectedCounselorModal.bio || "Konselor berpengalaman yang siap mendampingi mahasiswa mengatasi tantangan akademik maupun personal dengan pendekatan yang ramah, hangat, dan solutif."}
              </p>
            </div>

            {/* Additional Info Row */}
            <div className="grid grid-cols-2 gap-3 pt-0.5">
              <div className="space-y-0.5">
                <span className="text-[9.5px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-bold">Bahasa</span>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Languages className="w-3 h-3 text-slate-400" />
                  {selectedCounselorModal.languages?.join(", ") || "Bahasa Indonesia"}
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9.5px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-bold">Lokasi Praktik</span>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span className="truncate">{selectedCounselorModal.location || "Kampus Utama"}</span>
                </span>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-default">
              <div>
                <p className="text-[9.5px] text-slate-400 uppercase tracking-wider font-bold">Layanan Konseling</p>
                <p className="text-xs font-bold text-teal-600 dark:text-teal-400">Gratis untuk Mahasiswa</p>
              </div>

              <button
                onClick={() => {
                  const counselor = selectedCounselorModal;
                  setSelectedCounselorModal(null);
                  onSelectCounselorForBooking(counselor);
                }}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm rounded-lg shadow-3xs transition-all flex items-center gap-1.5 cursor-pointer min-h-[38px] sm:min-h-[36px]"
              >
                <span>Pilih & Jadwalkan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
