import React, { useState, useMemo } from 'react';
import { 
  X, 
  Sparkles, 
  Search, 
  Calendar, 
  Check, 
  Copy, 
  Share2, 
  Layers, 
  Zap, 
  ShieldCheck, 
  Wrench, 
  Brain, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw,
  Info,
  CheckCircle2,
  Tag
} from 'lucide-react';
import { 
  APP_CHANGELOG, 
  CURRENT_APP_VERSION, 
  LAST_UPDATED_DATE, 
  CATEGORY_METADATA, 
  ChangeCategory, 
  ReleaseNote, 
  markUpdateAsSeen 
} from '../../data/changelogData';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSelectedVersion?: string;
  onUpdateSeen?: () => void;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({
  isOpen,
  onClose,
  initialSelectedVersion,
  onUpdateSeen
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ChangeCategory | 'all'>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>(() => {
    // Default: expand latest version
    return { [CURRENT_APP_VERSION]: true };
  });
  const [copiedVersion, setCopiedVersion] = useState<string | null>(null);
  const [hasMarkedRead, setHasMarkedRead] = useState(false);

  // Handle Mark as Read
  const handleMarkAsRead = () => {
    markUpdateAsSeen();
    setHasMarkedRead(true);
    if (onUpdateSeen) onUpdateSeen();
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const toggleExpand = (version: string) => {
    setExpandedVersions(prev => ({
      ...prev,
      [version]: !prev[version]
    }));
  };

  const handleCopyNotes = (release: ReleaseNote) => {
    const text = `📢 RuangTenang Update ${release.version} (${release.date})\n📌 ${release.title}\n\n💡 Highlight:\n${release.highlights.map(h => `• ${h}`).join('\n')}\n\n🚀 Detail Pembaruan:\n${release.changes.map(c => `[${CATEGORY_METADATA[c.category].label}] ${c.title}: ${c.description}`).join('\n')}`;
    
    navigator.clipboard.writeText(text);
    setCopiedVersion(release.version);
    setTimeout(() => setCopiedVersion(null), 2500);
  };

  // Filter releases based on search, category, and period
  const filteredReleases = useMemo(() => {
    return APP_CHANGELOG.filter(release => {
      // Period filter
      if (selectedPeriod === 'today_yesterday') {
        if (release.periodLabel !== 'Hari Ini' && release.periodLabel !== 'Kemarin') return false;
      } else if (selectedPeriod === 'this_week') {
        if (release.periodLabel !== 'Minggu Ini' && release.periodLabel !== 'Hari Ini' && release.periodLabel !== 'Kemarin') return false;
      } else if (selectedPeriod === 'archive') {
        if (release.periodLabel !== 'Minggu Lalu' && release.periodLabel !== 'Arsip Terdahulu') return false;
      }

      // Search & category filter inside changes
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        release.version.toLowerCase().includes(q) ||
        release.title.toLowerCase().includes(q) ||
        release.tagline.toLowerCase().includes(q) ||
        release.changes.some(c => 
          c.title.toLowerCase().includes(q) || 
          c.description.toLowerCase().includes(q) ||
          (c.impact && c.impact.toLowerCase().includes(q))
        );

      const matchesCategory = 
        selectedCategory === 'all' ||
        release.changes.some(c => c.category === selectedCategory);

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory, selectedPeriod]);

  if (!isOpen) return null;

  const renderCategoryIcon = (cat: ChangeCategory) => {
    switch (cat) {
      case 'feature':
        return <Sparkles className="w-3.5 h-3.5" />;
      case 'improvement':
        return <Zap className="w-3.5 h-3.5" />;
      case 'security':
        return <ShieldCheck className="w-3.5 h-3.5" />;
      case 'fix':
        return <Wrench className="w-3.5 h-3.5" />;
      case 'ai':
        return <Brain className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
        aria-hidden="true" 
      />
      
      <div className="relative w-full max-w-3xl max-h-[92vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-slate-100 z-10 animate-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 bg-stone-50/80 dark:bg-slate-900/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-900 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 shadow-3xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Pusat Pembaruan & Versi
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-teal-100 dark:bg-teal-900/70 text-teal-800 dark:text-teal-300 rounded-full border border-teal-200/80 dark:border-teal-800 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                  {CURRENT_APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Catatan rilis harian, perbaikan, dan fitur baru RuangTenang • Terakhir diperbarui {LAST_UPDATED_DATE}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0 ml-2"
            aria-label="Tutup Jendela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="p-3 sm:px-5 border-b border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 space-y-2.5 shrink-0">
          {/* Search bar & Period Pills */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari pembaruan (contoh: mood, sesi, keamanan, AI)..."
                className="w-full bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Period Filter Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0 overflow-x-auto text-[11px]">
              {[
                { id: 'all', label: 'Semua Waktu' },
                { id: 'today_yesterday', label: 'Hari Ini & Kemarin' },
                { id: 'this_week', label: 'Minggu Ini' },
                { id: 'archive', label: 'Arsip' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPeriod(p.id)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    selectedPeriod === p.id
                      ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-3xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-teal-600 text-white font-semibold shadow-3xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Semua Kategori
            </button>
            
            {(Object.keys(CATEGORY_METADATA) as ChangeCategory[]).map(catKey => {
              const cat = CATEGORY_METADATA[catKey];
              const isSelected = selectedCategory === catKey;
              return (
                <button
                  key={catKey}
                  onClick={() => setSelectedCategory(catKey)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer border ${
                    isSelected
                      ? `${cat.bgClass} ${cat.colorClass} ${cat.borderClass} font-bold ring-1 ring-teal-500/30`
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {renderCategoryIcon(catKey)}
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Changelog List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/40">
          {filteredReleases.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Info className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Tidak ada catatan pembaruan yang cocok
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Coba sesuaikan kata kunci pencarian atau pilih filter kategori "Semua" untuk melihat riwayat rilis lainnya.
              </p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory('all'); setSelectedPeriod('all'); }}
                className="px-3 py-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700 bg-teal-50 dark:bg-teal-950/60 rounded-xl cursor-pointer"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            filteredReleases.map((release) => {
              const isExpanded = expandedVersions[release.version] ?? true;
              const filteredChanges = selectedCategory === 'all' 
                ? release.changes 
                : release.changes.filter(c => c.category === selectedCategory);

              if (filteredChanges.length === 0 && selectedCategory !== 'all') {
                return null;
              }

              return (
                <div 
                  key={release.version}
                  className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all shadow-3xs overflow-hidden ${
                    release.isLatest 
                      ? 'border-teal-500/70 dark:border-teal-500/50 ring-2 ring-teal-500/10' 
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {/* Release Card Header */}
                  <div 
                    onClick={() => toggleExpand(release.version)}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                          {release.version}
                        </span>

                        {release.badge && (
                          <span className={`px-2 py-0.5 text-[10.5px] font-bold rounded-full border ${
                            release.isLatest 
                              ? 'bg-teal-500 text-white border-teal-600'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}>
                            {release.badge}
                          </span>
                        )}

                        <span className="px-2 py-0.5 text-[10px] font-medium bg-stone-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full">
                          {release.periodLabel}
                        </span>

                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {release.releaseTime || release.date}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {release.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {release.tagline}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyNotes(release);
                        }}
                        className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-xs flex items-center gap-1 cursor-pointer"
                        title="Salin Catatan Rilis"
                      >
                        {copiedVersion === release.version ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-teal-600" />
                            <span className="text-[11px] text-teal-600 font-semibold hidden xs:inline">Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="text-[11px] hidden xs:inline">Salin</span>
                          </>
                        )}
                      </button>

                      <div className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 pb-5 sm:px-5 sm:pb-5 space-y-4 border-t border-slate-100 dark:border-slate-800/80 pt-4">
                      
                      {/* Key Highlights */}
                      {release.highlights.length > 0 && selectedCategory === 'all' && (
                        <div className="p-3 bg-teal-50/50 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/60 rounded-xl space-y-1.5">
                          <span className="text-[11px] font-bold text-teal-900 dark:text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-teal-600" /> Ringkasan Utama
                          </span>
                          <ul className="text-xs text-teal-950 dark:text-teal-200 space-y-1 pl-1">
                            {release.highlights.map((hl, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                                <span>{hl}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Detailed Changes List */}
                      <div className="space-y-2.5">
                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          Daftar Perubahan ({filteredChanges.length})
                        </span>
                        
                        <div className="space-y-2">
                          {filteredChanges.map(change => {
                            const cat = CATEGORY_METADATA[change.category];
                            return (
                              <div 
                                key={change.id}
                                className="p-3 bg-stone-50/60 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 rounded-xl space-y-1.5 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${cat.bgClass} ${cat.colorClass} ${cat.borderClass}`}>
                                      {renderCategoryIcon(change.category)}
                                      {cat.label}
                                    </span>
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                      {change.title}
                                    </h4>
                                  </div>
                                </div>

                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-0.5">
                                  {change.description}
                                </p>

                                {change.impact && (
                                  <div className="text-[11px] text-teal-800 dark:text-teal-300 bg-teal-50/60 dark:bg-teal-950/40 px-2.5 py-1 rounded-lg border border-teal-100 dark:border-teal-900/50 flex items-start gap-1.5 mt-1">
                                    <span className="font-bold shrink-0">Dampak:</span>
                                    <span>{change.impact}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Build tag footer */}
                      {release.buildNumber && (
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                          <span>Build ID: {release.buildNumber}</span>
                          <span>Verified Deployment</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:px-6 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
            <span>Pembaruan otomatis diterapkan secara transparan tanpa perlu reload manual.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleMarkAsRead}
              className="w-full sm:w-auto px-4 py-2 bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all shadow-3xs cursor-pointer flex items-center justify-center gap-2 min-h-[38px]"
            >
              <Check className="w-4 h-4" />
              {hasMarkedRead ? 'Telah Ditandai Selesai' : 'Saya Mengerti (Tandai Selesai)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
