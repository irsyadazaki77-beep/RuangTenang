import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  FileText,
  Plus,
  Quote,
  Sparkles,
  Trash2,
  X
} from 'lucide-react';
import {
  auditThesisCitations,
  addBibliographyEntry,
  removeGhostReferenceLine,
  injectCitationAtCursor
} from '../utils/citationIntegrity';

interface CitationConsistencyAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentContent: string;
  onUpdateContent: (newContent: string) => void;
  workspaceAttachments?: Array<{ name: string; citationId?: string }>;
}

export const CitationConsistencyAuditModal: React.FC<CitationConsistencyAuditModalProps> = ({
  isOpen,
  onClose,
  documentContent,
  onUpdateContent,
  workspaceAttachments = []
}) => {
  const [activeTab, setActiveTab] = useState<'audit' | 'inject'>('audit');
  const [injectAuthor, setInjectAuthor] = useState('');
  const [injectYear, setInjectYear] = useState(String(new Date().getFullYear()));
  const [injectTitle, setInjectTitle] = useState('');
  const [justInjected, setJustInjected] = useState(false);

  const report = useMemo(() => auditThesisCitations(documentContent), [documentContent]);

  if (!isOpen) return null;

  const handleFixMissing = (author: string, year: string) => {
    const updated = addBibliographyEntry(documentContent, author, year);
    onUpdateContent(updated);
  };

  const handleRemoveGhost = (rawLine: string) => {
    const updated = removeGhostReferenceLine(documentContent, rawLine);
    onUpdateContent(updated);
  };

  const handleInjectCitation = () => {
    if (!injectAuthor.trim() || !injectYear.trim()) return;
    const authorClean = injectAuthor.trim();
    const yearClean = injectYear.trim();
    const inTextMarker = `(${authorClean}, ${yearClean})`;

    // Inject in text
    let updated = injectCitationAtCursor(documentContent, inTextMarker);
    // Also ensure added to bibliography
    updated = addBibliographyEntry(updated, authorClean, yearClean, injectTitle.trim() || 'Publikasi Ilmiah');

    onUpdateContent(updated);
    setJustInjected(true);
    setTimeout(() => setJustInjected(false), 2000);
    setInjectAuthor('');
    setInjectTitle('');
  };

  const handleInjectFromAttachment = (fileName: string) => {
    // Guess author and year from filename, e.g. "Santoso_2023_Penerapan_AI.pdf"
    const yearMatch = fileName.match(/\b(20\d\d|19\d\d)\b/);
    const year = yearMatch ? yearMatch[1] : String(new Date().getFullYear());
    const namePart = fileName.replace(/\.[^/.]+$/, '').split(/[_\-\s]+/)[0] || 'Peneliti';
    const author = namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase();

    setInjectAuthor(author);
    setInjectYear(year);
    setInjectTitle(fileName.replace(/\.[^/.]+$/, ''));
    setActiveTab('inject');
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800';
    if (score >= 65) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800';
    return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Quote className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                  Audit Konsistensi Sitasi & Sisip Kutipan
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                  APA 7th & IEEE
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Deteksi otomatis kutipan tanpa daftar pustaka & rujukan silang (Ghost Citations)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-5 pt-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`pb-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Hasil Audit Konsistensi</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {report.healthScore}%
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inject')}
            className={`pb-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'inject'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Sisipkan Sitasi Baru</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'audit' ? (
            <>
              {/* Score Banner */}
              <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${getScoreColor(report.healthScore)}`}>
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-black">{report.healthScore}%</div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm">
                      {report.healthScore >= 85
                        ? 'Sitasi Sehat & Konsisten'
                        : report.healthScore >= 65
                        ? 'Perlu Sedikit Perapian Sitasi'
                        : 'Banyak Kutipan / Rujukan Tidak Sinkron'}
                    </h4>
                    <p className="text-[11px] opacity-80 mt-0.5">
                      {report.totalInTextCitations} kutipan di teks · {report.totalBibliographyEntries} entri di Daftar Pustaka
                    </p>
                  </div>
                </div>

                <div className="text-right text-[11px] font-semibold">
                  {report.ghostReferences.length === 0 && report.missingBibliography.length === 0 ? (
                    <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                      <Check className="w-3.5 h-3.5" /> 100% Sinkron
                    </span>
                  ) : (
                    <span>
                      {report.missingBibliography.length + report.ghostReferences.length} Masalah Terdeteksi
                    </span>
                  )}
                </div>
              </div>

              {/* Missing Bibliography Warning */}
              {report.missingBibliography.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Kutipan di Teks yang Belum Ada di Daftar Pustaka ({report.missingBibliography.length})
                  </h5>
                  <div className="space-y-1.5">
                    {report.missingBibliography.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/30 flex items-center justify-between text-xs gap-2"
                      >
                        <div>
                          <span className="font-bold text-rose-900 dark:text-rose-200 font-mono">
                            {item.raw}
                          </span>
                          <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                            Penulis: {item.author} ({item.year})
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleFixMissing(item.author, item.year)}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px] transition-colors shrink-0 shadow-2xs"
                        >
                          + Tambah ke Daftar Pustaka
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ghost References Warning */}
              {report.ghostReferences.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Ghost References — Ada di Daftar Pustaka tapi Tidak Dikutip ({report.ghostReferences.length})
                  </h5>
                  <div className="space-y-1.5">
                    {report.ghostReferences.map((bib, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/30 flex items-center justify-between text-xs gap-2"
                      >
                        <p className="text-[11px] text-amber-900 dark:text-amber-200 font-medium truncate max-w-sm sm:max-w-md">
                          {bib.raw}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleRemoveGhost(bib.raw)}
                          className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] transition-colors shrink-0 shadow-2xs flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Hapus Baris</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Matched Valid Citations */}
              <div className="space-y-2 pt-1">
                <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Kutipan & Rujukan Terverifikasi Sinkron ({report.matchedCitations.length})
                </h5>
                {report.matchedCitations.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {report.matchedCitations.map((match, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-xs flex items-start gap-2"
                      >
                        <span className="font-bold text-emerald-700 dark:text-emerald-300 font-mono shrink-0">
                          {match.inTextRaw}
                        </span>
                        <span className="text-slate-400">↔</span>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                          {match.bibRaw}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Belum ada pasangan kutipan teks dan daftar pustaka yang cocok.
                  </p>
                )}
              </div>
            </>
          ) : (
            /* Quick In-Text Injector Tab */
            <div className="space-y-4">
              <div className="space-y-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  Formulir Sisip Sitasi Cepat
                </h4>
                <p className="text-[11px] text-slate-500">
                  Secara otomatis menyisipkan format in-text <code>(Penulis, Tahun)</code> pada naskah dan menambahkan entri bibliografi lengkap di Daftar Pustaka.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Nama Belakang Penulis Utama *
                    </label>
                    <input
                      type="text"
                      value={injectAuthor}
                      onChange={e => setInjectAuthor(e.target.value)}
                      placeholder="cth: Santoso / Smith / Rahmawati"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Tahun Publikasi *
                    </label>
                    <input
                      type="text"
                      value={injectYear}
                      onChange={e => setInjectYear(e.target.value)}
                      placeholder="cth: 2023"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Judul Artikel / Buku / Dokumen (Opsional)
                  </label>
                  <input
                    type="text"
                    value={injectTitle}
                    onChange={e => setInjectTitle(e.target.value)}
                    placeholder="cth: Analisis Sentimen Mahasiswa Menggunakan Transformator NLP"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-[11px] font-mono text-slate-500">
                    Preview Sitasi:{' '}
                    <span className="font-bold text-teal-600 dark:text-teal-400">
                      {injectAuthor.trim() ? `(${injectAuthor.trim()}, ${injectYear.trim() || '2024'})` : '(-)'}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={!injectAuthor.trim() || !injectYear.trim()}
                    onClick={handleInjectCitation}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors shadow-xs"
                  >
                    {justInjected ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Berhasil Disisipkan!</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Sisipkan ke Dokumen</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Quick Pick from Attached Workspace Files */}
              {workspaceAttachments.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                    Pilih Cepat dari Berkas Lampiran Workspace:
                  </h5>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {workspaceAttachments.map((file, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                            {file.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleInjectFromAttachment(file.name)}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-teal-700 dark:text-teal-300 font-semibold text-[11px] shrink-0"
                        >
                          Pilih
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
