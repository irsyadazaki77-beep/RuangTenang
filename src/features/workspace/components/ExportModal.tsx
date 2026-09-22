import React, { useState } from 'react';
import {
  X,
  Download,
  FileText,
  Printer,
  Sparkles,
  Code,
  Quote,
  Loader2,
  FileCheck2,
  ShieldCheck,
  FileCode2,
  Share2
} from 'lucide-react';
import { WorkspaceArtifact } from '../types';
import { exportToAcademicDocx } from '../utils/exportDocx';

export type ExportFormatType = 'docx_skripsi' | 'docx_makalah' | 'pdf_print' | 'markdown' | 'text' | 'bibtex' | 'ris';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  artifact: WorkspaceArtifact;
  content: string;
  showToast: (msg: string, type: 'info' | 'success' | 'error') => void;
  onGenerateBibTeX?: (content: string, title?: string) => string;
  onGenerateRIS?: (content: string, title?: string) => string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  artifact,
  content,
  showToast,
  onGenerateBibTeX,
  onGenerateRIS
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormatType>('docx_skripsi');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsExporting(true);

    try {
      const safeTitle = (artifact.title || 'naskah_ruangkerja')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .substring(0, 35);

      if (selectedFormat === 'docx_skripsi' || selectedFormat === 'docx_makalah') {
        showToast('Menyusun dokumen Word standar akademik...', 'info');
        await exportToAcademicDocx({
          title: artifact.title || 'Naskah Akademik',
          content,
          templateType: selectedFormat === 'docx_skripsi' ? 'skripsi' : 'makalah',
          authorName: 'Mahasiswa',
          university: 'Universitas Indonesia'
        });
        showToast(
          selectedFormat === 'docx_skripsi'
            ? 'Dokumen Word Format Skripsi Baku (Margin 4-4-3-3) berhasil diunduh!'
            : 'Dokumen Word Format Makalah Umum berhasil diunduh!',
          'success'
        );
        onClose();
      } else if (selectedFormat === 'pdf_print') {
        showToast('Membuka dialog cetak PDF browser...', 'info');
        // Tutup modal agar tidak menutupi area cetak dokumen
        onClose();
        setTimeout(() => {
          window.print();
        }, 300);
      } else if (selectedFormat === 'markdown') {
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${safeTitle}.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast('Berkas Markdown (.md) bersih berhasil diunduh.', 'success');
        onClose();
      } else if (selectedFormat === 'text') {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${safeTitle}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast('Berkas Teks Polos (.txt) berhasil diunduh.', 'success');
        onClose();
      } else if (selectedFormat === 'bibtex') {
        const bibContent = onGenerateBibTeX ? onGenerateBibTeX(content, artifact.title) : content;
        const blob = new Blob([bibContent], { type: 'application/x-bibtex;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${safeTitle}_citations.bib`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast('Berkas BibTeX (.bib) berhasil diunduh untuk Mendeley/Zotero/LaTeX.', 'success');
        onClose();
      } else if (selectedFormat === 'ris') {
        const risContent = onGenerateRIS ? onGenerateRIS(content, artifact.title) : content;
        const blob = new Blob([risContent], { type: 'application/x-research-info-systems;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${safeTitle}_citations.ris`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast('Berkas RIS (.ris) berhasil diunduh untuk Mendeley/Zotero.', 'success');
        onClose();
      }
    } catch (err: any) {
      console.error('Export error:', err);
      showToast('Gagal memproses ekspor dokumen. Silakan coba lagi.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in no-print"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shadow-3xs">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 id="export-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Ekspor Dokumen Akademik
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-full border border-emerald-300/60 dark:border-emerald-700/60">
                  Baku Indonesia
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-sm">
                {artifact.title || 'Dokumen Tanpa Judul'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Format Selection */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
            Pilih Format Ekspor
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {/* Format 1: Word Standar Skripsi 4-4-3-3 */}
            <label
              className={`flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                selectedFormat === 'docx_skripsi'
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 shadow-2xs'
                  : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800'
              }`}
            >
              <input
                type="radio"
                name="export_format"
                value="docx_skripsi"
                checked={selectedFormat === 'docx_skripsi'}
                onChange={() => setSelectedFormat('docx_skripsi')}
                className="mt-1 text-emerald-600 focus:ring-emerald-500 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                      Dokumen Word (.docx) — Format Skripsi Baku
                    </span>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 rounded-full shrink-0">
                    Rekomendasi
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  Margin baku 4-4-3-3 cm (Kiri 4, Atas 4, Kanan 3, Bawah 3), kertas A4, Times New Roman 12pt, Spasi 1.5, dan indentasi paragraf 1 cm.
                </p>
                <div className="flex items-center gap-2 mt-2 text-[10.5px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-900/30 px-2 py-1 rounded-lg w-fit">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Kompatibel MS Word, Google Docs & WPS Office
                </div>
              </div>
            </label>

            {/* Format 2: Word Format Makalah Umum */}
            <label
              className={`flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                selectedFormat === 'docx_makalah'
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 shadow-2xs'
                  : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800'
              }`}
            >
              <input
                type="radio"
                name="export_format"
                value="docx_makalah"
                checked={selectedFormat === 'docx_makalah'}
                onChange={() => setSelectedFormat('docx_makalah')}
                className="mt-1 text-emerald-600 focus:ring-emerald-500 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                    Dokumen Word (.docx) — Format Makalah & Artikel Umum
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  Margin standar rata 3 cm di setiap sisi, font Times New Roman 12pt, spasi 1.5. Cocok untuk tugas kuliah biasa dan esai.
                </p>
              </div>
            </label>

            {/* Format 3: PDF Siap Cetak */}
            <label
              className={`flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                selectedFormat === 'pdf_print'
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 shadow-2xs'
                  : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800'
              }`}
            >
              <input
                type="radio"
                name="export_format"
                value="pdf_print"
                checked={selectedFormat === 'pdf_print'}
                onChange={() => setSelectedFormat('pdf_print')}
                className="mt-1 text-emerald-600 focus:ring-emerald-500 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Printer className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                      PDF Siap Cetak (.pdf)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full">
                    A4 Print
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  Tata letak bersih tanpa sidebar, tombol, atau navigasi web. Membuka dialog pratinjau cetak / simpan sebagai PDF langsung dari peramban.
                </p>
              </div>
            </label>

            {/* Format 4: Markdown & Plain Text */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label
                className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                  selectedFormat === 'markdown'
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 shadow-2xs'
                    : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800'
                }`}
              >
                <input
                  type="radio"
                  name="export_format"
                  value="markdown"
                  checked={selectedFormat === 'markdown'}
                  onChange={() => setSelectedFormat('markdown')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                    <Code className="w-3.5 h-3.5 text-slate-500" />
                    Markdown (.md)
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    Format bersih untuk Obsidian, Notion, GitHub & AI.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                  selectedFormat === 'text'
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 shadow-2xs'
                    : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800'
                }`}
              >
                <input
                  type="radio"
                  name="export_format"
                  value="text"
                  checked={selectedFormat === 'text'}
                  onChange={() => setSelectedFormat('text')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    Teks Polos (.txt)
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    Salinan teks tanpa format untuk arsip cepat.
                  </p>
                </div>
              </label>
            </div>

            {/* Format 5: Ekspor Sitasi BibTeX / RIS (Jika relevan atau ada daftar pustaka) */}
            <div className="pt-1">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Quote className="w-3 h-3 text-amber-500" />
                Format Sitasi / Referensi Ilmiah
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label
                  className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                    selectedFormat === 'bibtex'
                      ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-500 shadow-2xs'
                      : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:border-amber-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="export_format"
                    value="bibtex"
                    checked={selectedFormat === 'bibtex'}
                    onChange={() => setSelectedFormat('bibtex')}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                      <FileCode2 className="w-3.5 h-3.5 text-amber-500" />
                      BibTeX (.bib)
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                      Format standar LaTeX, Overleaf & Mendeley.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                    selectedFormat === 'ris'
                      ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-500 shadow-2xs'
                      : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:border-amber-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="export_format"
                    value="ris"
                    checked={selectedFormat === 'ris'}
                    onChange={() => setSelectedFormat('ris')}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                      <Share2 className="w-3.5 h-3.5 text-amber-500" />
                      RIS (.ris)
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                      Dukungan langsung impor Zotero & EndNote.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Format otomatis tersusun rapi sesuai kaidah akademik.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyiapkan Dokumen...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Unduh Dokumen Sekarang</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
