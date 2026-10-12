import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Download,
  FileText,
  Printer,
  Sparkles,
  Code,
  Loader2,
  FileCheck2,
  ShieldCheck,
  FileCode2,
  Share2,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { WorkspaceArtifact } from '../types';
import { createAcademicStylePreset, exportToAcademicDocx, validateAcademicCompleteness, type AcademicStyleProfile } from '../utils/exportDocx';
import type { PresentationTheme, PresentationOutlineSlide } from '../utils/exportPptx';
import { parseCitations } from '../utils/citationExport';

export type ExportFormatType = 
  | 'docx_skripsi' 
  | 'docx_ieee_apa' 
  | 'docx_makalah' 
  | 'pptx'
  | 'xlsx'
  | 'pdf_print' 
  | 'markdown' 
  | 'text' 
  | 'bibtex' 
  | 'ris';

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
  const [showChecklistDetails, setShowChecklistDetails] = useState(false);
  const [styleProfile, setStyleProfile] = useState<AcademicStyleProfile>(() => createAcademicStylePreset('skripsi'));
  const [presentationTheme, setPresentationTheme] = useState<PresentationTheme>('academic_minimal');
  const [pptxOutline, setPptxOutline] = useState<{ slides: PresentationOutlineSlide[]; error: string; loading: boolean }>({ slides: [], error: '', loading: false });

  const hasTabularData = useMemo(() => {
    try {
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.rows) && parsed.rows.length > 0) return true;
    } catch { /* not JSON; fall back to markdown tables */ }
    return /\|[ \t]*:?-+:?[ \t]*\|/.test(content);
  }, [content]);

  // Compute academic completeness validation in real-time
  const validation = useMemo(() => {
    return validateAcademicCompleteness(content, artifact.title);
  }, [content, artifact.title]);
  const referenceAudit = useMemo(() => {
    const referenceHeading = /^\s*(?:#{1,6}\s*)?(?:DAFTAR\s+(?:PUSTAKA|REFERENSI)|REFERENCES|BIBLIOGRAPHY)\b[^\n]*\n([\s\S]*?)(?=\n\s*#{1,6}\s+|$)/im.exec(content);
    const references = referenceHeading ? parseCitations(referenceHeading[1]) : [];
    const dois = references.map(reference => reference.doi?.toLowerCase()).filter((doi): doi is string => Boolean(doi));
    return {
      count: references.length,
      missingMetadata: references.filter(reference => !reference.title || !reference.authors.length || !reference.year || !reference.journal && !reference.doi && !reference.url).length,
      duplicateDois: dois.length - new Set(dois).size
    };
  }, [content]);
  useEffect(() => {
    if (selectedFormat !== 'pptx') { setPptxOutline({ slides: [], error: '', loading: false }); return; }
    let active = true;
    setPptxOutline({ slides: [], error: '', loading: true });
    void import('../utils/exportPptx').then(({ buildPresentationOutline }) => {
      if (!active) return;
      setPptxOutline({ slides: buildPresentationOutline({ title: artifact.title, content, artifactType: artifact.type, theme: presentationTheme }), error: '', loading: false });
    }).catch(error => {
      if (active) setPptxOutline({ slides: [], error: error instanceof Error ? error.message : 'Outline tidak dapat disusun.', loading: false });
    });
    return () => { active = false; };
  }, [selectedFormat, artifact.title, artifact.type, content, presentationTheme]);

  const selectFormat = (format: ExportFormatType) => {
    setSelectedFormat(format);
    if (format === 'docx_skripsi') setStyleProfile(createAcademicStylePreset('skripsi'));
    else if (format === 'docx_ieee_apa') setStyleProfile(createAcademicStylePreset('ieee_apa'));
    else if (format === 'docx_makalah') setStyleProfile(createAcademicStylePreset('makalah'));
  };

  if (!isOpen) return null;

  const handleDownload = async (overrideFormat?: ExportFormatType) => {
    const formatToUse = overrideFormat || selectedFormat;
    setIsExporting(true);

    try {
      const safeTitle = (artifact.title || 'naskah_ruangkerja')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .substring(0, 35);

      if (formatToUse === 'docx_skripsi') {
        showToast('Menyusun dokumen Word dengan profil yang dipilih...', 'info');
        await exportToAcademicDocx({
          title: artifact.title || 'Naskah Akademik',
          content,
          templateType: 'skripsi',
          style: styleProfile
        });
        showToast('Dokumen Word (.docx) berhasil diunduh dengan profil yang dipilih.', 'success');
        onClose();
      } else if (formatToUse === 'docx_ieee_apa') {
        showToast('Menyusun dokumen Word dengan profil paper...', 'info');
        await exportToAcademicDocx({
          title: artifact.title || 'Academic Paper',
          content,
          templateType: 'ieee_apa',
          style: styleProfile
        });
        showToast('Dokumen Word (.docx) berhasil diunduh dengan profil yang dipilih.', 'success');
        onClose();
      } else if (formatToUse === 'docx_makalah') {
        showToast('Menyusun dokumen Word dengan profil makalah...', 'info');
        await exportToAcademicDocx({
          title: artifact.title || 'Makalah Akademik',
          content,
          templateType: 'makalah',
          style: styleProfile
        });
        showToast('Dokumen Word (.docx) berhasil diunduh dengan profil yang dipilih.', 'success');
        onClose();
      } else if (formatToUse === 'pptx') {
        const { buildPresentationOutline, exportEditablePptx } = await import('../utils/exportPptx');
        const outline = buildPresentationOutline({ title: artifact.title, content, artifactType: artifact.type, theme: presentationTheme });
        await exportEditablePptx({ title: artifact.title || 'Presentasi Akademik', content, artifactType: artifact.type, theme: presentationTheme });
        showToast(`PowerPoint editable berhasil diunduh (${outline.length} slide).`, 'success');
        onClose();
      } else if (formatToUse === 'xlsx') {
        const { exportToXlsx } = await import('../utils/exportXlsx');
        await exportToXlsx({ title: artifact.title || 'Data Ruang Kerja', content, artifactType: artifact.type });
        showToast('Excel (.xlsx) berhasil diunduh.', 'success');
        onClose();
      } else if (formatToUse === 'pdf_print') {
        showToast('Membuka dialog cetak PDF browser...', 'info');
        onClose();
        setTimeout(() => {
          window.print();
        }, 300);
      } else if (formatToUse === 'markdown') {
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
      } else if (formatToUse === 'text') {
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
      } else if (formatToUse === 'bibtex') {
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
      } else if (formatToUse === 'ris') {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in no-print"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-scale-up max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shadow-3xs shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 id="export-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Pusat Ekspor Dokumen Ilmiah
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-full border border-emerald-300/60 dark:border-emerald-700/60">
                  Dokumen dan presentasi editable
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

        {/* Modal Body: Scrollable Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1 min-h-0">
          
          {/* Section 1: Pratinjau Kelengkapan Naskah Skripsi (Academic Completeness Validation) */}
          <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-slate-50/50 dark:from-emerald-950/30 dark:via-slate-900/40 dark:to-slate-900/60 p-4 transition-all">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                  Pratinjau Kelengkapan Naskah
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-0.5 rounded-full">
                  Tinjauan awal
                </span>
                <button
                  type="button"
                  onClick={() => setShowChecklistDetails(!showChecklistDetails)}
                  className="text-[11px] text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-400 underline underline-offset-2 cursor-pointer"
                >
                  {showChecklistDetails ? 'Sembunyikan' : 'Rincian'}
                </button>
              </div>
            </div>

            {/* Metrics Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-center">
              <div className="bg-white/80 dark:bg-slate-800/80 rounded-xl p-2 border border-slate-200/60 dark:border-slate-800">
                <span className="text-[10.5px] text-slate-500 dark:text-slate-400 block">Jumlah Kata</span>
                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">{validation.wordCount.toLocaleString()} kata</span>
              </div>
              <div className="bg-white/80 dark:bg-slate-800/80 rounded-xl p-2 border border-slate-200/60 dark:border-slate-800">
                <span className="text-[10.5px] text-slate-500 dark:text-slate-400 block">Estimasi Halaman</span>
                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">~{validation.estimatedPages} hal (perkiraan)</span>
              </div>
              <div className="bg-white/80 dark:bg-slate-800/80 rounded-xl p-2 border border-slate-200/60 dark:border-slate-800">
                <span className="text-[10.5px] text-slate-500 dark:text-slate-400 block">Sitasi Rujukan</span>
                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">{validation.citationCount} sitasi</span>
              </div>
              <div className="bg-white/80 dark:bg-slate-800/80 rounded-xl p-2 border border-slate-200/60 dark:border-slate-800">
                <span className="text-[10.5px] text-slate-500 dark:text-slate-400 block">Daftar Pustaka</span>
                <span className={`text-xs sm:text-sm font-bold ${validation.hasReferences ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {validation.hasReferences ? `${referenceAudit.count} entri` : 'Belum Ada'}
                </span>
              </div>
            </div>

            {/* Checklist Items Preview */}
            <div className={`space-y-1.5 pt-1 ${showChecklistDetails ? 'block' : 'hidden sm:block'}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {validation.checks.map(check => (
                  <div 
                    key={check.id}
                    className="flex items-center gap-2 p-2 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-800 text-xs"
                  >
                    {check.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                        <span className="truncate">{check.label}</span>
                        {check.passed ? (
                          <span className="text-[10px] text-emerald-600 font-medium">Terdeteksi</span>
                        ) : (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Perlu ditinjau</span>
                        )}
                      </div>
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">{check.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/50 px-3 py-2 text-[11px] text-slate-600 dark:text-slate-300">
              Struktur: {validation.structuralStatus === 'passed' ? 'terdeteksi' : 'perlu ditinjau'} · Referensi: {referenceAudit.count} entri, {referenceAudit.missingMetadata} metadata belum lengkap, {referenceAudit.duplicateDois} DOI duplikat · {validation.citationCount} penanda sitasi terdeteksi. Format, kecocokan identitas, dukungan semantik, dan integritas file keluaran belum diperiksa di panel ini.
            </div>
          </div>

          {/* Section 2: Format Ekspor Dokumen Utama */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
              Pilihan Format Ekspor Dokumen
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Opsi 1: Word Standar Skripsi Indonesia 4-4-3-3 */}
              <label
                className={`flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  selectedFormat === 'docx_skripsi'
                    ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-500 shadow-2xs'
                    : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800'
                }`}
              >
                <input
                  type="radio"
                  name="export_format"
                  value="docx_skripsi"
                  checked={selectedFormat === 'docx_skripsi'}
                  onChange={() => selectFormat('docx_skripsi')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                        Unduh profil skripsi (.docx)
                      </span>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 rounded-full shrink-0">
                      Preset contoh
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    Preset awal A4 dengan margin 4-4-3-3 cm, Times New Roman 12pt, dan spasi 1.5. Sesuaikan dengan pedoman tugas atau kampus.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-[10.5px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-900/30 px-2 py-1 rounded-lg w-fit">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    Profil dapat disesuaikan sebelum ekspor
                  </div>
                </div>
              </label>

              {selectedFormat.startsWith('docx_') && (
                <details className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40 p-3.5">
                  <summary className="cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">Sesuaikan profil Word</summary>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 text-xs">
                    <label className="space-y-1">Kertas
                      <select value={styleProfile.paperSize} onChange={event => setStyleProfile({ ...styleProfile, paperSize: event.target.value as AcademicStyleProfile['paperSize'] })} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-2">
                        <option value="A4">A4</option><option value="LETTER">Letter</option>
                      </select>
                    </label>
                    {(['marginTopCm', 'marginBottomCm', 'marginLeftCm', 'marginRightCm'] as const).map((key, index) => (
                      <label key={key} className="space-y-1">{['Atas', 'Bawah', 'Kiri', 'Kanan'][index]} (cm)
                        <input type="number" min="1" max="7" step="0.1" value={styleProfile[key]} onChange={event => setStyleProfile({ ...styleProfile, [key]: Number(event.target.value) })} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-2" />
                      </label>
                    ))}
                    <label className="space-y-1">Font
                      <input value={styleProfile.fontFamily} maxLength={80} onChange={event => setStyleProfile({ ...styleProfile, fontFamily: event.target.value })} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-2" />
                    </label>
                    <label className="space-y-1">Ukuran (pt)
                      <input type="number" min="9" max="16" step="0.5" value={styleProfile.fontSizePt} onChange={event => setStyleProfile({ ...styleProfile, fontSizePt: Number(event.target.value) })} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-2" />
                    </label>
                    <label className="space-y-1">Spasi baris
                      <select value={styleProfile.lineSpacing} onChange={event => setStyleProfile({ ...styleProfile, lineSpacing: Number(event.target.value) as AcademicStyleProfile['lineSpacing'] })} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-2">
                        <option value={1}>1.0</option><option value={1.15}>1.15</option><option value={1.5}>1.5</option><option value={2}>2.0</option>
                      </select>
                    </label>
                    <label className="space-y-1">Gaya referensi
                      <select value={styleProfile.citationStyle} onChange={event => setStyleProfile({ ...styleProfile, citationStyle: event.target.value as AcademicStyleProfile['citationStyle'] })} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-2">
                        <option value="APA7">APA 7</option><option value="IEEE">IEEE</option>
                      </select>
                    </label>
                    <label className="space-y-1">Nomor halaman
                      <select value={styleProfile.pageNumbering} onChange={event => setStyleProfile({ ...styleProfile, pageNumbering: event.target.value as AcademicStyleProfile['pageNumbering'] })} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-2">
                        <option value="roman_front_arabic_main">Romawi awal, Arab isi</option><option value="arabic_top_right">Arab kanan atas</option><option value="roman_bottom_center">Romawi bawah tengah</option><option value="none">Tanpa nomor</option>
                      </select>
                    </label>
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500">Ekspor menerapkan pilihan ini; verifikasi aturan akhir dengan pedoman pengajar atau penerbit.</p>
                </details>
              )}

              <label className={`flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer ${selectedFormat === 'pptx' ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-500' : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-800'}`}>
                <input type="radio" name="export_format" value="pptx" checked={selectedFormat === 'pptx'} onChange={() => selectFormat('pptx')} className="mt-1 text-emerald-600" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">PowerPoint editable (.pptx)</div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Teks, bentuk, dan grafik native disusun dari konten artifact.</p>
                  {selectedFormat === 'pptx' && <div className="mt-2 space-y-2">
                    <label className="block text-xs text-slate-600 dark:text-slate-300">Tema
                      <select value={presentationTheme} onChange={event => setPresentationTheme(event.target.value as PresentationTheme)} className="ml-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-1.5">
                        <option value="academic_minimal">Academic minimal</option><option value="professional">Professional</option><option value="technology">Technology</option><option value="clean_corporate">Clean corporate</option>
                      </select>
                    </label>
                    <div className="rounded-lg bg-white/80 dark:bg-slate-900/70 p-2 text-[11px]">
                      <div className="font-semibold">Pratinjau outline{pptxOutline.loading ? ' · memuat' : ` · ${pptxOutline.slides.length} slide`}</div>
                      {pptxOutline.error ? <p className="mt-1 text-rose-600">{pptxOutline.error}</p> : <ol className="mt-1 list-decimal pl-4 text-slate-600 dark:text-slate-300">{pptxOutline.slides.slice(0, 8).map((slide, index) => <li key={`${slide.title}-${index}`}>{slide.title} · {slide.layout}</li>)}</ol>}
                      {pptxOutline.slides.length > 8 && <p className="text-slate-500">+ {pptxOutline.slides.length - 8} slide lainnya</p>}
                      <p className="mt-1 text-slate-500">Outline ini memeriksa susunan konten; tidak mewakili render visual akhir.</p>
                    </div>
                  </div>}
                </div>
              </label>

              <label className={`flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all ${hasTabularData ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'} ${selectedFormat === 'xlsx' ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-500' : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-800'}`}>
                <input type="radio" name="export_format" value="xlsx" disabled={!hasTabularData} checked={selectedFormat === 'xlsx'} onChange={() => selectFormat('xlsx')} className="mt-1 text-emerald-600" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">Excel (.xlsx)</div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{hasTabularData ? 'Setiap tabel menjadi satu sheet; data grafik menyertakan sheet sumber data.' : 'Tidak tersedia: artifact ini tidak berisi tabel atau data terstruktur.'}</p>
                </div>
              </label>

              {/* Opsi 2: Word Format Paper IEEE / APA */}
              <label
                className={`flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  selectedFormat === 'docx_ieee_apa'
                    ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-500 shadow-2xs'
                    : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800'
                }`}
              >
                <input
                  type="radio"
                  name="export_format"
                  value="docx_ieee_apa"
                  checked={selectedFormat === 'docx_ieee_apa'}
                  onChange={() => selectFormat('docx_ieee_apa')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                        Unduh Format Paper IEEE / APA (.docx)
                      </span>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200 rounded-full shrink-0">
                      Preset contoh
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    Preset paper A4 dengan margin 2.54 cm. Cocokkan format akhir dengan pedoman penerbit.
                  </p>
                </div>
              </label>

              {/* Opsi 3: PDF Siap Cetak */}
              <label
                className={`flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  selectedFormat === 'pdf_print'
                    ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-500 shadow-2xs'
                    : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800'
                }`}
              >
                <input
                  type="radio"
                  name="export_format"
                  value="pdf_print"
                  checked={selectedFormat === 'pdf_print'}
                  onChange={() => selectFormat('pdf_print')}
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
                      A4 Print Clean
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    Tampilan lembar naskah bersih tanpa sidebar dan tombol UI. Siap simpan sebagai PDF langsung dari browser.
                  </p>
                </div>
              </label>

              {/* Opsi 4: Markdown, Text, & Format Sitasi */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedFormat('markdown')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedFormat === 'markdown'
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200'
                      : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5">
                    <Code className="w-3.5 h-3.5 text-slate-500" />
                    Markdown (.md)
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">Untuk Obsidian/AI</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedFormat('text')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedFormat === 'text'
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200'
                      : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    Teks Polos (.txt)
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">Salinan arsip</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedFormat('bibtex')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedFormat === 'bibtex'
                      ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-900 dark:text-amber-200'
                      : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5">
                    <FileCode2 className="w-3.5 h-3.5 text-amber-500" />
                    BibTeX (.bib)
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">LaTeX & Mendeley</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedFormat('ris')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedFormat === 'ris'
                      ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-900 dark:text-amber-200'
                      : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5">
                    <Share2 className="w-3.5 h-3.5 text-amber-500" />
                    RIS (.ris)
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">Zotero & EndNote</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer with Quick Direct Download Buttons */}
        <div className="px-5 sm:px-6 py-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Periksa hasil dan cocokkan dengan pedoman akademik yang berlaku.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={() => handleDownload()}
              disabled={isExporting || (selectedFormat === 'pptx' && (pptxOutline.loading || Boolean(pptxOutline.error) || pptxOutline.slides.length === 0))}
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
                  <span>Unduh Dokumen Terpilih</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
