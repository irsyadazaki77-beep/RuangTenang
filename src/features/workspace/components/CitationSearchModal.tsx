import React, { useState, useEffect } from 'react';
import {
  Search,
  BookOpen,
  Quote,
  Copy,
  Check,
  Plus,
  ExternalLink,
  Sparkles,
  X,
  FileText,
  Bookmark,
  Layers
} from 'lucide-react';
import {
  AcademicPaper,
  CitationFormat,
  searchAcademicPapers,
  resolveDOI,
  formatAPA7,
  formatIEEE,
  formatHarvard,
  formatBibTeX,
  CURATED_PAPERS_DATABASE
} from '../utils/citationEngine';

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
  const [query, setQuery] = useState('');
  const [papers, setPapers] = useState<AcademicPaper[]>(CURATED_PAPERS_DATABASE);
  const [selectedPaper, setSelectedPaper] = useState<AcademicPaper | null>(CURATED_PAPERS_DATABASE[0] || null);
  const [format, setFormat] = useState<CitationFormat>('APA7');
  const [copied, setCopied] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchAcademicPapers(query);
        setPapers(results);
        if (results.length > 0 && !results.some(p => p.id === selectedPaper?.id)) {
          setSelectedPaper(results[0]);
        }
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen) return null;

  const getFormattedCitation = (paper: AcademicPaper, fmt: CitationFormat): string => {
    switch (fmt) {
      case 'APA7': return formatAPA7(paper);
      case 'IEEE': return formatIEEE(paper);
      case 'HARVARD': return formatHarvard(paper);
      case 'BIBTEX': return formatBibTeX(paper);
    }
  };

  const currentCitationText = selectedPaper ? getFormattedCitation(selectedPaper, format) : '';

  const handleCopy = () => {
    if (!currentCitationText) return;
    navigator.clipboard.writeText(currentCitationText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsert = () => {
    if (!selectedPaper || !onInsertCitation) return;
    onInsertCitation(currentCitationText, selectedPaper);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <Quote className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100">
                Pencari & Generator Sitasi DOI Ilmiah
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Format otomatis APA 7th, IEEE, Harvard, dan BibTeX untuk rujukan skripsi & paper
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Cari judul paper, penulis, kata kunci riset, atau tempelkan DOI (cth: 10.1016/j.chb.2021.106821)..."
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all placeholder:text-slate-400"
              autoFocus
            />
            {isSearching && (
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Main 2-Column Split View */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-0">
          {/* Left Column: Paper Search Results (5 cols) */}
          <div className="md:col-span-5 border-r border-slate-100 dark:border-slate-800 overflow-y-auto p-3 space-y-2 custom-scrollbar max-h-[45vh] md:max-h-full">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
              Hasil Referensi ({papers.length}):
            </div>

            {papers.length === 0 ? (
              <div className="text-center py-8 px-4 text-slate-400 text-xs">
                Tidak ada artikel ditemukan. Coba gunakan kata kunci lain atau masukkan kode DOI langsung.
              </div>
            ) : (
              papers.map(paper => {
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
                      {paper.authors.slice(0, 2).join(', ')}{paper.authors.length > 2 ? ' et al.' : ''} ({paper.year})
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 truncate max-w-[160px]">
                        {paper.journal}
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
            {selectedPaper ? (
              <div className="space-y-4">
                {/* Selected Paper Meta */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">
                      Tahun {selectedPaper.year}
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
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Tersalin ke Clipboard!' : 'Salin Sitasi'}</span>
                </button>

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
