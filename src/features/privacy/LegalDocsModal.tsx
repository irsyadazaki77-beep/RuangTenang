import { useEscapeKey } from "../../hooks/useEscapeKey";
import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  FileText,
  Info,
  Lock,
  HeartPulse,
  Cpu,
  Mail,
  AlertTriangle,
  X,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

interface LegalDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: string;
}

export const LegalDocsModal: React.FC<LegalDocsModalProps> = ({
  isOpen,
  onClose,
  defaultTab = "about",
}) => {
  useEscapeKey(onClose, true);

  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
      if (e.key === "Tab") {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusableElements || focusableElements.length === 0) return;
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[
          focusableElements.length - 1
        ] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    // Set initial focus
    const focusable = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable && focusable.length > 0) {
      (focusable[0] as HTMLElement).focus();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const tabs = [
    { id: "about", title: "Tentang Layanan", icon: Info },
    { id: "privacy", title: "Kebijakan Privasi", icon: Lock },
    { id: "terms", title: "Syarat Penggunaan", icon: FileText },
    { id: "consent", title: "Persetujuan Pemrosesan Data", icon: ShieldCheck },
    { id: "disclaimer", title: "Disclaimer Medis", icon: HeartPulse },
    { id: "how-ai-works", title: "Cara Kerja AI", icon: Cpu },
    { id: "contact", title: "Kontak Pengelola", icon: Mail },
    { id: "security-report", title: "Laporan Keamanan", icon: AlertTriangle },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-docs-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center max-sm:items-end p-4 max-sm:p-0 overflow-y-auto"
    >
      <div
        ref={modalRef}
        className="bg-white border border-teal-50/50 text-slate-900 rounded-3xl max-sm:rounded-b-none max-w-4xl w-full max-h-[90vh] max-sm:max-h-[92vh] max-sm:w-full max-sm:animate-slide-up flex flex-col shadow-2xl overflow-hidden relative transition-all duration-300"
      >
        {/* Drag handle for mobile bottom sheet */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3 sm:hidden shrink-0" />
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-50 rounded-xl text-teal-600 border border-teal-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="legal-docs-title"
                className="text-lg font-sans font-semibold tracking-tight text-slate-900"
              >
                Informasi Layanan, Privasi & Ketentuan Medis
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">
                RuangTenang • Pusat Kesehatan Mental & Pendamping AI Kampus
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup Dialog Informasi Legal"
            className="p-2 min-h-[44px] min-w-[44px] text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#1E293B]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content Layout */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Navigation Sidebar */}
          <nav
            aria-label="Menu Dokumen Legal"
            className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50 p-4 overflow-y-auto space-y-1.5 shrink-0"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  aria-selected={isActive}
                  role="tab"
                  className={`w-full text-left px-4 py-3 min-h-[44px] rounded-lg text-sm font-medium flex items-center justify-between transition-all focus:outline-none focus:ring-2 focus:ring-[#1E293B] ${
                    isActive
                      ? "bg-slate-800 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-600"}`}
                    />
                    <span>{tab.title}</span>
                  </div>
                  {isActive && (
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Content View Area */}
          <main className="flex-1 p-6 sm:p-8 overflow-y-auto space-y-5 text-sm text-slate-600 leading-relaxed">
            {activeTab === "about" && (
              <section className="space-y-4">
                <h3 className="text-base font-medium text-slate-900 flex items-center gap-2">
                  <Info className="w-5 h-5 text-slate-800" /> Tentang Layanan
                  RuangTenang
                </h3>
                <p>
                  RuangTenang adalah ekosistem kesehatan mental dan pendampingan
                  kesejahteraan psikologis terpadu yang dirancang khusus untuk
                  sivitas akademika kampus. Platform ini memadukan teknologi
                  kecerdasan buatan (AI) pendamping reflektif, alat skrining
                  mandiri tervalidasi (PHQ-9 & GAD-7), serta sistem rujukan
                  langsung ke konselor profesional kampus.
                </p>
                <div className="p-4 bg-slate-50 rounded-xl text-slate-600 space-y-2">
                  <p className="font-medium text-slate-900">
                    Misi Utama Layanan:
                  </p>
                  <ul className="list-disc list-inside space-y-1.5 ml-1">
                    <li>
                      Menyediakan ruang aman tanpa stigma bagi mahasiswa untuk
                      mengekspresikan emosi.
                    </li>
                    <li>
                      Memfasilitasi deteksi dini kecemasan dan depresi akademis.
                    </li>
                    <li>
                      Menghubungkan mahasiswa dengan konselor manusia
                      dengan sistem penjadwalan transparan.
                    </li>
                  </ul>
                </div>
              </section>
            )}

            {activeTab === "privacy" && (
              <section className="space-y-4">
                <h3 className="text-base font-medium text-slate-900 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-slate-800" /> Kebijakan Privasi
                  & Enkripsi Data
                </h3>
                <p>
                  Kami menerapkan prinsip <strong>Privacy by Design</strong>.
                  Data pribadi Anda terlindungi dengan standar enkripsi tinggi
                  dan asas minimisasi data.
                </p>
                <div className="space-y-3">
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <strong className="text-slate-900 block mb-1">
                      Penyimpanan Lokal & Privat:
                    </strong>
                    Seluruh riwayat obrolan dan catatan pribadi disimpan di
                    memori lokal perangkat Anda.
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <strong className="text-slate-900 block mb-1">
                      Retensi & Penghapusan Otomatis:
                    </strong>
                    Sesuai kebijakan data retention policy, data sesi
                    kedaluwarsa secara otomatis dalam 90 hari. Pengguna dapat
                    mengeksekusi hak penghapusan permanen (Right to be
                    Forgotten) kapan saja melalui menu vault privasi.
                  </div>
                </div>
              </section>
            )}

            {activeTab === "terms" && (
              <section className="space-y-4">
                <h3 className="text-base font-medium text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-800" /> Syarat &
                  Ketentuan Penggunaan
                </h3>
                <p>
                  Dengan mengakses layanan RuangTenang, Anda menyetujui
                  ketentuan berikut:
                </p>
                <ol className="list-decimal list-inside space-y-2 pl-1">
                  <li>
                    Layanan ini diperuntukkan bagi mahasiswa, dosen, dan staf
                    perguruan tinggi.
                  </li>
                  <li>
                    Pengguna dilarang melakukan eksploitasi, pencurian
                    identitas, atau penyalahgunaan sistem.
                  </li>
                  <li>
                    Segala bentuk ancaman terhadap diri sendiri atau orang lain
                    akan memicu protokol krisis internal untuk keselamatan
                    pengguna.
                  </li>
                </ol>
              </section>
            )}

            {activeTab === "consent" && (
              <section className="space-y-4">
                <h3 className="text-base font-medium text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-slate-800" /> Persetujuan
                  Pemrosesan Data (Data Consent)
                </h3>
                <p>Sesuai Undang-Undang Perlindungan Data Pribadi (UU PDP):</p>
                <div className="p-4 bg-slate-50 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 font-medium text-slate-900">
                    <CheckCircle2 className="w-5 h-5 text-teal-600" />{" "}
                    Anonimisasi Otomatis
                  </div>
                  <p className="text-slate-600">
                    Nama, NIM, email, dan nomor telepon tidak pernah dikirimkan
                    ke model AI eksternal. Semua data identitas disaring dan
                    dianonimkan secara otomatis sebelum pemrosesan.
                  </p>
                </div>
              </section>
            )}

            {activeTab === "disclaimer" && (
              <section className="space-y-4">
                <h3 className="text-base font-medium text-slate-900 flex items-center gap-2">
                  <HeartPulse className="w-5 h-5 text-amber-500" /> Disclaimer
                  Medis & Batasan Klinis
                </h3>
                <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl text-amber-600 space-y-3">
                  <div className="flex items-center gap-2 font-medium text-base text-slate-900">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                    Bukan Psikolog / Dokter Medis & Bukan Layanan Darurat
                  </div>
                  <p>
                    Asisten AI RuangTenang bekerja sebagai{" "}
                    <strong>pendamping reflektif awal</strong> dan BUKAN
                    psikolog, psikiater, atau profesional medis. AI tidak
                    berwenang memberikan diagnosis klinis, resep obat, atau
                    terapi medis formal.
                  </p>
                  <p>
                    Jika Anda mengalami krisis mental atau pikiran menyakiti
                    diri, harap langsung menghubungi layanan darurat 119 Ext 8
                    atau tim konselor kampus terdekat.
                  </p>
                </div>
              </section>
            )}

            {activeTab === "how-ai-works" && (
              <section className="space-y-4">
                <h3 className="text-base font-medium text-slate-900 flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-slate-800" /> Cara Kerja
                  Kecerdasan Buatan (AI)
                </h3>
                <p>
                  Model AI menggunakan kerangka kerja komunikasi reflektif
                  (Reflective Listening & Solution-Focused Coaching):
                </p>
                <ul className="list-disc list-inside space-y-1.5 pl-1">
                  <li>
                    Menggunakan deteksi kata kunci berbasis emosi untuk
                    merespons dengan empati.
                  </li>
                  <li>
                    Dilengkapi sistem proteksi prompt injection dan penyaringan
                    materi berbahaya.
                  </li>
                  <li>
                    Dibatasi secara ketat dari memberikan tindakan atau
                    pertimbangan medis klinis.
                  </li>
                </ul>
              </section>
            )}

            {activeTab === "contact" && (
              <section className="space-y-4">
                <h3 className="text-base font-medium text-slate-900 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-slate-800" /> Kontak Pengelola &
                  Pusat Konseling Kampus
                </h3>
                <div className="bg-slate-50 p-5 rounded-xl space-y-2">
                  <p className="font-medium text-slate-900">
                    Layanan Bimbingan & Konseling Virtual Kampus (Layanan
                    Portals Resmi BK Digital 24/7)
                  </p>
                  <p>
                    Akses Platform:{" "}
                    <a
                      href="#"
                      className="text-slate-800 underline font-medium hover:text-slate-900"
                    >
                      portal-bk.virtual.kampus.ac.id
                    </a>
                  </p>
                  <p>
                    Email Pengelola:{" "}
                    <a
                      href="mailto:konseling@kampus.ac.id"
                      className="text-slate-800 underline font-medium hover:text-slate-900"
                    >
                      konseling@kampus.ac.id
                    </a>
                  </p>
                  <p>Telepon Office: (021) 786-3333 ext. 401</p>
                </div>
              </section>
            )}

            {activeTab === "security-report" && (
              <section className="space-y-4">
                <h3 className="text-base font-medium text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600" /> Pelaporan
                  Masalah & Kerentanan Keamanan
                </h3>
                <p>
                  Kami berkomitmen menjaga keamanan data seluruh pengguna.
                  Apabila Anda menemukan celah keamanan, bug, atau potensi
                  kebocoran data, silakan laporkan ke Tim Keamanan Informasi
                  Kampus:
                </p>
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 space-y-1.5">
                  <p className="font-medium text-slate-900">
                    Email Laporan Keamanan & Bug Bounty:
                  </p>
                  <p className="font-mono text-sm font-medium">
                    security-response@kampus.ac.id
                  </p>
                  <p className="text-xs text-rose-600 mt-1">
                    Setiap laporan yang terverifikasi akan ditindaklanjuti dalam
                    waktu maksimal 1x24 jam.
                  </p>
                </div>
              </section>
            )}
          </main>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-600">
            Versi Layanan 2.4.0 • Terakhir Diperbarui: Agustus 2026
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg min-h-[44px] transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1E293B]"
          >
            Tutup Informasi
          </button>
        </div>
      </div>
    </div>
  );
};
