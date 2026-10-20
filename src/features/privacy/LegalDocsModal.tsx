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
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center max-sm:items-end p-4 max-sm:p-0"
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
                  sivitas akademika kampus. Platform ini menyediakan fitur
                  refleksi dengan AI, skrining mandiri PHQ-9 dan GAD-7, catatan
                  kesejahteraan, serta akses ke direktori konselor kampus.
                </p>
                <div className="p-4 bg-slate-50 rounded-xl text-slate-600 space-y-2">
                  <p className="font-medium text-slate-900">
                    Misi Utama Layanan:
                  </p>
                  <ul className="list-disc list-inside space-y-1.5 ml-1">
                    <li>
                      Menyediakan fitur untuk mencatat atau merefleksikan pengalaman sehari-hari.
                    </li>
                    <li>
                      Menampilkan hasil skrining mandiri sebagai bahan pertimbangan, bukan diagnosis.
                    </li>
                    <li>
                      Membantu pengguna menemukan informasi konselor dan mengajukan janji sesuai layanan kampus yang tersedia.
                    </li>
                  </ul>
                </div>
              </section>
            )}

            {activeTab === "privacy" && (
              <section className="space-y-4">
                <h3 className="text-base font-medium text-slate-900 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-slate-800" /> Privasi dan Pemrosesan Data
                </h3>
                <p>
                  Informasi ini merangkum perilaku aplikasi yang dikonfigurasi. Ini bukan jaminan bahwa data tidak dapat diakses di server, cadangan, atau log infrastruktur.
                </p>
                <div className="space-y-3">
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <strong className="text-slate-900 block mb-1">
                      Pemrosesan dan Penyimpanan:
                    </strong>
                    Percakapan akun, skrining, mood, janji temu, dan file unggahan dapat diproses atau disimpan di server aplikasi. Pesan chat dikirim ke endpoint model yang dipilih. File perlu persetujuan AI sebelum diunggah; OCR gambar/hasil pindai dapat memakai Gemini/OpenAI terpisah dari model chat. Memilih Ollama tidak otomatis memindahkan file atau mematikan OCR cloud.
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <strong className="text-slate-900 block mb-1">
                      Retensi & Penghapusan Otomatis:
                    </strong>
                    Masa simpan dapat diatur di Pusat Privasi. Pembersihan otomatis mencakup chat, mood, skrining, serta janji temu yang selesai/dibatalkan sesuai masa simpan. Permintaan hapus akun juga menyimpan catatan audit penghapusan. Mekanisme aplikasi tidak membuktikan penghapusan dari cadangan atau log infrastruktur.
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
                    Skrining atau pemeriksaan keselamatan otomatis tidak selalu mengenali situasi berbahaya dan tidak otomatis menghubungi konselor atau layanan darurat. Jika ada bahaya langsung, gunakan Pusat Bantuan Krisis atau hubungi layanan darurat.
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
                <p>Periksa pilihan persetujuan pada Pusat Privasi sebelum memakai fitur yang memproses data.</p>
                <div className="p-4 bg-slate-50 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 font-medium text-slate-900">
                    <CheckCircle2 className="w-5 h-5 text-teal-600" />{" "}
                    Penyaringan teks terbatas
                  </div>
                  <p className="text-slate-600">
                    Pesan teks diperiksa dengan penyaring pola untuk beberapa jenis identitas. Penyaring ini tidak menjamin anonimisasi; nama, detail yang tidak dikenali, dan identitas dalam gambar/lampiran dapat tetap terkirim ke provider AI. Tinjau dan samarkan lampiran sebelum mengirim.
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
                    Jika ada bahaya langsung, hubungi 119 atau minta orang
                    tepercaya menemani Anda ke IGD/fasilitas kesehatan terdekat.
                    Untuk dukungan psikologis awal, gunakan{" "}
                    <a href="https://www.healing119.id/" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                      Healing119 (119 ekstensi 8)
                    </a>
                    . Layanan ini bukan terapi jangka panjang dan antrean dapat penuh.
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
                    Dapat menggunakan pola teks untuk membantu memilih respons; hasilnya bisa keliru.
                  </li>
                  <li>
                    Memiliki pemeriksaan keamanan, tetapi pemeriksaan otomatis dapat melewatkan atau salah menandai konten.
                  </li>
                  <li>
                    Tidak dirancang untuk memberi diagnosis atau resep; jawaban AI tetap dapat keliru.
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
                  <p className="font-medium text-slate-900">Informasi layanan kampus</p>
                  <p>Kontak, biaya, jam layanan, dan ketersediaan bergantung pada kampus Anda; aplikasi ini belum memiliki satu kontak kampus yang berlaku untuk semua pengguna.</p>
                  <div className="flex flex-wrap gap-3 pt-1">
                    <a href="/counselors" className="text-slate-800 underline font-medium hover:text-slate-900">Buka Direktori Konselor</a>
                    <a href="/emergency" className="text-slate-800 underline font-medium hover:text-slate-900">Buka Pusat Bantuan Krisis</a>
                  </div>
                </div>
              </section>
            )}

            {activeTab === "security-report" && (
              <section className="space-y-4">
                <h3 className="text-base font-medium text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600" /> Pelaporan
                  Masalah & Kerentanan Keamanan
                </h3>
                <p>Kontak pelaporan keamanan belum dikonfigurasi di aplikasi ini. Jika menemukan masalah, hubungi pengelola aplikasi atau kampus melalui kanal resmi yang Anda ketahui.</p>
              </section>
            )}
          </main>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-600">
            Ringkasan perilaku aplikasi saat ini
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
