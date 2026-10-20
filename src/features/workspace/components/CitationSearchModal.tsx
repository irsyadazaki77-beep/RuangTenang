import React, { useState, useEffect, useId, useRef } from 'react';
import {
  Search,
  Quote,
  Copy,
  Check,
  Plus,
  ExternalLink,
  X,
  Upload,
  BookMarked,
} from 'lucide-react';
import {
  AcademicPaper,
  CitationFormat,
  searchAcademicPapersWithStatus,
  formatAPA7,
  formatIEEE,
  formatHarvard,
  formatBibTeX,
} from '../utils/citationEngine';
import { parseCitations, generateRIS } from '../utils/citationExport';
import { useFocusTrap } from '../../../hooks/useFocusTrap';

interface CitationSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertCitation?: (formattedCitation: string, paper: AcademicPaper) => void;
}

export const CitationSearchModal: React.FC<CitationSearchModalProps> = ({
  isOpen,
  onClose,
  onInsertCitation
}) => {
  const [activeMode, setActiveMode] = useState<'search' | 'import'>('search');
  const [query, setQuery] = useState('');
  const [papers, setPapers] = useState<AcademicPaper[]>([]);
  const [importedPapers, setImportedPapers] = useState<AcademicPaper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<AcademicPaper | null>(null);
  const [format, setFormat] = useState<CitationFormat>('APA7');
  const [copied, setCopied] = useState(false);
  const [copiedRefManager, setCopiedRefManager] = useState<'BIB' | 'RIS' | null>(null);
  const [clipboardError, setClipboardError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [searchRetryCount, setSearchRetryCount] = useState(0);
  const [importRawText, setImportRawText] = useState('');
  const [importError, setImportError] = useState('');
  const [isDraggingBib, setIsDraggingBib] = useState(false);
  const bibFileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useFocusTrap<HTMLDivElement>({ isOpen, onClose, initialFocusRef: searchInputRef });

  useEffect(() => {
    if (!isOpen || activeMode !== 'search') return;
    let active = true;
    const controller = new AbortController();
    const normalizedQuery = query.trim();
    setPapers([]);
    setSelectedPaper(null);
    setSearchError(false);
    setIsSearching(Boolean(normalizedQuery));
    if (!normalizedQuery) {
      return () => { active = false; controller.abort(); };
    }

    const timer = setTimeout(async () => {
      try {
        const result = await searchAcademicPapersWithStatus(normalizedQuery, controller.signal);
        if (!active || controller.signal.aborted) return;
        setPapers(result.papers);
        setSearchError(result.unavailable);
        setSelectedPaper(previous => result.papers.find(paper => paper.id === previous?.id) || result.papers[0] || null);
      } catch {
        if (!active || controller.signal.aborted) return;
        setPapers([]);
        setSelectedPaper(null);
        setSearchError(true);
      } finally {
        if (active && !controller.signal.aborted) setIsSearching(false);
      }
    }, 300);

    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [query, isOpen, activeMode, searchRetryCount]);

  if (!isOpen) return null;

  const parseBibOrRisIntoPapers = (raw: string) => {
    const parsedRefs = parseCitations(raw);
    setImportError(raw.trim() && parsedRefs.length === 0 ? 'Tidak ada entri .bib atau .ris yang dikenali. Periksa format berkas atau teks yang ditempel.' : '');
    const mapped: AcademicPaper[] = parsedRefs.map((ref, idx) => ({
      id: ref.id || `imported_${idx + 1}`,
      title: ref.title || `Judul tidak tersedia (referensi impor #${idx + 1})`,
      authors: ref.authors.length ? ref.authors : ['Penulis Tidak Diketahui'],
      year: Number.isInteger(Number(ref.year)) && Number(ref.year) >= 1000 && Number(ref.year) <= new Date().getFullYear() + 1
        ? Number(ref.year)
        : undefined,
      journal: ref.journal || ref.publisher || ref.institution || 'Sumber Impor (.bib/.ris)',
      volume: ref.volume,
      issue: ref.issue,
      pages: ref.pages,
      doi: ref.doi || '',
      url: ref.url,
      source: 'import',
      verified: false
    }));
    setImportedPapers(mapped);
    setSelectedPaper(mapped[0] || null);
  };

  const handleBibFileUpload = async (file: File) => {
    setImportError('');
    setImportRawText('');
    setImportedPapers([]);
    setSelectedPaper(null);
    if (file.size > 2 * 1024 * 1024) {
      setImportError('Berkas referensi terlalu besar. Batas impor adalah 2 MB.');
      return;
    }
    try {
      const content = await file.text();
      setImportRawText(content);
      parseBibOrRisIntoPapers(content);
    } catch {
      setImportError('Berkas referensi tidak dapat dibaca. Coba berkas .bib atau .ris lain.');
    }
  };

  const getFormattedCitation = (paper: AcademicPaper, fmt: CitationFormat): string => {
    switch (fmt) {
      case 'APA7': return formatAPA7(paper);
      case 'IEEE': return formatIEEE(paper);
      case 'HARVARD': return formatHarvard(paper);
      case 'BIBTEX': return formatBibTeX(paper);
    }
  };

  const displayedPapers = activeMode === 'search' ? papers : importedPapers;
  const currentCitationText = selectedPaper ? getFormattedCitation(selectedPaper, format) : '';

  const handleCopy = async () => {
    if (!currentCitationText) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('CLIPBOARD_UNAVAILABLE');
      await navigator.clipboard.writeText(currentCitationText);
      setClipboardError('');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setClipboardError('Clipboard tidak dapat diakses. Pilih teks sitasi lalu salin secara manual.');
    }
  };

  const handleCopyToReferenceManager = async (targetFormat: 'BIB' | 'RIS') => {
    if (!selectedPaper) return;
    const bibText = formatBibTeX(selectedPaper);
    const payload = targetFormat === 'BIB' ? bibText : (generateRIS(bibText, selectedPaper.title) || bibText);
    try {
      if (!navigator.clipboard?.writeText) throw new Error('CLIPBOARD_UNAVAILABLE');
      await navigator.clipboard.writeText(payload);
      setClipboardError('');
      setCopiedRefManager(targetFormat);
      setTimeout(() => setCopiedRefManager(null), 2000);
    } catch {
      setCopiedRefManager(null);
      setClipboardError('Clipboard tidak dapat diakses. Salin sitasi dari kotak teks secara manual.');
    }
  };

  const handleInsert = () => {
    if (!selectedPaper || !onInsertCitation) return;
    onInsertCitation(currentCitationText, selectedPaper);
    onClose();
  };

  const handleInsertAllImported = () => {
    if (!importedPapers.length || !onInsertCitation) return;
    const combined = importedPapers.map(p => getFormattedCitation(p, format)).join('\n- ');
    onInsertCitation(combined, importedPapers[0]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div
        ref={dialogRef}
        className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <Quote className="w-5 h-5" />
            </div>
            <div>
              <h2 id={titleId} className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100">
                Pencari & Generator Sitasi DOI Ilmiah
              </h2>
              <p id={descriptionId} className="text-xs text-slate-500 dark:text-slate-400">
                Format otomatis APA 7th, IEEE, Harvard, BibTeX & sinkronisasi Zotero / Mendeley (.bib / .ris)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveMode('search');
                  setSelectedPaper(papers[0] || null);
                }}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  activeMode === 'search'
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Cari Crossref / DOI
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveMode('import');
                  setSelectedPaper(importedPapers[0] || null);
                }}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                  activeMode === 'import'
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Upload className="w-3 h-3" />
                <span>Impor .bib / .ris</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup pencarian sitasi"
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar OR .bib / .ris Import Dropzone */}
        {activeMode === 'search' ? (
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Cari judul paper, penulis, kata kunci riset, atau tempelkan DOI (cth: 10.1016/j.chb.2021.106821)..."
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all placeholder:text-slate-400"
              />
              {isSearching && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              Kueri dikirim langsung ke Crossref untuk mencari metadata bibliografi. Hindari memasukkan informasi pribadi; mode AI lokal tidak mengubah pencarian eksternal ini.
            </p>
          </div>
        ) : (
          <div
            onDragOver={e => { e.preventDefault(); setIsDraggingBib(true); }}
            onDragLeave={() => setIsDraggingBib(false)}
            onDrop={e => {
              e.preventDefault();
              setIsDraggingBib(false);
              const file = e.dataTransfer.files?.[0];
              if (file) void handleBibFileUpload(file);
            }}
            className={`p-3.5 border-b border-slate-100 dark:border-slate-800 transition-colors ${
              isDraggingBib ? 'bg-emerald-50/80 dark:bg-emerald-950/40' : 'bg-slate-50/50 dark:bg-slate-850/40'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <input
                ref={bibFileInputRef}
                type="file"
                accept=".bib,.ris,.txt"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) void handleBibFileUpload(file);
                  e.target.value = '';
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => bibFileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl border border-dashed border-emerald-400 dark:border-emerald-700 bg-white dark:bg-slate-900 hover:bg-emerald-50/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Pilih / Drop File .bib atau .ris (Zotero / Mendeley)</span>
              </button>
              <input
                type="text"
                value={importRawText}
                onChange={e => {
                  setImportRawText(e.target.value);
                  parseBibOrRisIntoPapers(e.target.value);
                }}
                maxLength={500000}
                placeholder="Atau tempelkan entri @article{...} BibTeX / TY  - JOUR format RIS langsung di sini..."
                aria-label="Tempel teks BibTeX atau RIS"
                className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-mono"
              />
            </div>
          </div>
        )}

        {activeMode === 'import' && importError && <p role="alert" className="px-4 py-2 text-xs text-rose-700 dark:text-rose-300">{importError}</p>}

        {/* Main 2-Column Split View */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-0">
          {/* Left Column: Paper Search Results (5 cols) */}
          <div className="md:col-span-5 border-r border-slate-100 dark:border-slate-800 overflow-y-auto p-3 space-y-2 custom-scrollbar max-h-[45vh] md:max-h-full">
            <div className="flex items-center justify-between px-1">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Hasil Referensi ({displayedPapers.length}):
              </div>
              {activeMode === 'import' && importedPapers.length > 1 && onInsertCitation && (
                <button
                  type="button"
                  onClick={handleInsertAllImported}
                  className="text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  + Sematkan Semua ({importedPapers.length})
                </button>
              )}
            </div>

            {displayedPapers.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-xs text-slate-400">
                <p>{activeMode === 'import'
                  ? 'Unggah/drop file .bib atau .ris dari Zotero/Mendeley, atau tempelkan teks BibTeX/RIS di atas.'
                  : !query.trim()
                  ? 'Masukkan judul, penulis, kata kunci, atau DOI untuk mencari metadata Crossref.'
                  : isSearching
                  ? 'Mencari metadata di Crossref…'
                  : searchError
                  ? 'Layanan Crossref belum merespons. Coba lagi atau gunakan tautan DOI penerbit.'
                  : 'Crossref tidak menemukan metadata yang cocok. Coba kata kunci atau DOI lain.'}</p>
                {activeMode === 'search' && searchError && !isSearching && <button type="button" onClick={() => setSearchRetryCount(count => count + 1)} className="min-h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-slate-800">Coba lagi</button>}
              </div>
            ) : (
              displayedPapers.map(paper => {
                const isSelected = selectedPaper?.id === paper.id;
                return (
                  <button
                    key={paper.id}
                    onClick={() => setSelectedPaper(paper)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 shadow-2xs'
                        : 'bg-white dark:bg-slate-850 border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                      {paper.title}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                      {paper.authors.slice(0, 2).join(', ')}{paper.authors.length > 2 ? ' et al.' : ''} ({paper.year ?? 'n.d.'})
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 truncate max-w-[160px]">
                        {paper.journal}
                      </span>
                      <span className={`text-[9.5px] font-semibold ${paper.source === 'crossref' ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                        {paper.source === 'crossref' ? 'Metadata Crossref' : 'Impor · belum diverifikasi'}
                      </span>
                      {paper.doi && (
                        <span className="text-[9.5px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                          DOI
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right Column: Selected Paper Details & Citation Generator (7 cols) */}
          <div className="md:col-span-7 flex flex-col justify-between overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
            {clipboardError && <p role="status" aria-live="polite" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">{clipboardError}</p>}
            {selectedPaper ? (
              <div className="space-y-4">
                {/* Selected Paper Meta */}
                <div className="space-y-2">
                  <p className="text-[10px] text-slate-500">
                    {selectedPaper.source === 'import'
                      ? 'Metadata dibaca dari berkas referensi (.bib / .ris); periksa kembali bidang yang kosong atau belum diverifikasi.'
                      : 'Metadata bibliografis ditemukan di Crossref; dukungan isi artikel terhadap klaim tidak diperiksa.'}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">
                      Tahun {selectedPaper.year ?? 'tidak tercantum'}
                    </span>
                    {selectedPaper.citationCount !== undefined && selectedPaper.citationCount > 0 && (
                      <span className="text-[11px] text-slate-400">
                        • {selectedPaper.citationCount} sitasi terindeks
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                    {selectedPaper.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    <strong className="font-semibold text-slate-800 dark:text-slate-200">Penulis:</strong> {selectedPaper.authors.join('; ')}
                  </p>

                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    <strong className="font-semibold text-slate-800 dark:text-slate-200">Jurnal:</strong> <em>{selectedPaper.journal}</em>
                    {selectedPaper.volume && `, Vol. ${selectedPaper.volume}`}
                    {selectedPaper.pages && `, Hal. ${selectedPaper.pages}`}
                  </p>

                  {selectedPaper.doi && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                      <span>DOI:</span>
                      <a
                        href={`https://doi.org/${selectedPaper.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline flex items-center gap-1"
                      >
                        {selectedPaper.doi}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {selectedPaper.abstract && (
                    <div className="pt-2">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Abstrak Singkat:
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 line-clamp-4">
                        {selectedPaper.abstract}
                      </p>
                    </div>
                  )}
                </div>

                {/* Format Selector Pills */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Format Sitasi:
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(['APA7', 'IEEE', 'HARVARD', 'BIBTEX'] as CitationFormat[]).map(fmt => (
                      <button
                        key={fmt}
                        onClick={() => setFormat(fmt)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          format === fmt
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {fmt === 'APA7' && 'APA 7th Edition'}
                        {fmt === 'IEEE' && 'IEEE (Numerik)'}
                        {fmt === 'HARVARD' && 'Harvard'}
                        {fmt === 'BIBTEX' && 'BibTeX (LaTeX)'}
                      </button>
                    ))}
                  </div>

                  {/* Formatted Citation Output Box */}
                  <div className="relative p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed select-all">
                    {currentCitationText}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                Pilih artikel di sebelah kiri untuk melihat rujukan sitasi
              </div>
            )}

            {/* Bottom Actions */}
            {selectedPaper && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Tersalin ke Clipboard!' : 'Salin Sitasi'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyToReferenceManager('BIB')}
                    title="Salin format BibTeX untuk ditempel langsung ke Zotero / Mendeley (Import from Clipboard)"
                    className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-amber-200 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/40 hover:bg-amber-100/80 text-amber-800 dark:text-amber-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {copiedRefManager === 'BIB' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <BookMarked className="w-3.5 h-3.5" />}
                    <span>{copiedRefManager === 'BIB' ? 'BibTeX Tersalin!' : 'Salin ke Zotero/Mendeley (.bib)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyToReferenceManager('RIS')}
                    title="Salin format RIS untuk Zotero / Mendeley / EndNote"
                    className="flex items-center gap-1 px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-600 dark:text-slate-300 text-xs font-mono font-semibold transition-colors cursor-pointer"
                  >
                    <span>{copiedRefManager === 'RIS' ? '✓ .ris' : '.ris'}</span>
                  </button>
                </div>

                {onInsertCitation && (
                  <button
                    onClick={handleInsert}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Sematkan ke Canvas</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
