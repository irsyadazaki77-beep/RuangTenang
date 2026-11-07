import React, { useState, useMemo } from 'react';
import {
  Share2,
  X,
  Search,
  Filter,
  AlertCircle,
  Lightbulb,
  BookOpen,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { KnowledgeGraphData, GraphNode, buildKnowledgeGraphFromChunks } from '../../../../server/services/file-intelligence/graphRagService';

interface KnowledgeGraphExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  chunks?: Array<{ text: string; documentTitle?: string }>;
  onAskCouncilAboutGap?: (question: string) => void;
}

export const KnowledgeGraphExplorerModal: React.FC<KnowledgeGraphExplorerModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  chunks = [],
  onAskCouncilAboutGap
}) => {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNode, setActiveNode] = useState<GraphNode | null>(null);
  const [activeTab, setActiveTab] = useState<'graph' | 'gaps'>('graph');

  // Generate knowledge graph from workspace chunks
  const graphData: KnowledgeGraphData = useMemo(() => {
    return buildKnowledgeGraphFromChunks(workspaceId, chunks);
  }, [workspaceId, chunks]);

  const filteredNodes = useMemo(() => {
    return graphData.nodes.filter(n => {
      const matchType = selectedType === 'all' || n.type === selectedType;
      const matchSearch = n.label.toLowerCase().includes(searchQuery.toLowerCase());
      return matchType && matchSearch;
    });
  }, [graphData.nodes, selectedType, searchQuery]);

  if (!isOpen) return null;

  const getNodeColor = (type: GraphNode['type']) => {
    switch (type) {
      case 'variable': return 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300';
      case 'theory': return 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-300';
      case 'methodology': return 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300';
      case 'author': return 'bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-300';
      default: return 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                  Jejaring Pengetahuan Skripsi (GraphRAG Explorer)
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300">
                  {graphData.nodes.length} Simpul · {graphData.edges.length} Relasi
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Visualisasi keterkaitan teori, variabel, metodologi, dan rujukan ilmiah
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('graph')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                  activeTab === 'graph'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-purple-600'
                }`}
              >
                Graf Pengetahuan
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('gaps')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 ${
                  activeTab === 'gaps'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-purple-600'
                }`}
              >
                <span>Research Gap</span>
                {graphData.researchGaps.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {graphData.researchGaps.length}
                  </span>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-5 py-2.5 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari konsep, teori, atau variabel..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Tipe:
            </span>
            {['all', 'variable', 'theory', 'methodology', 'author'].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedType(t)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                  selectedType === t
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {t === 'all' ? 'Semua' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'graph' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Node Network Map (2 Cols) */}
              <div className="md:col-span-2 space-y-3">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/20 min-h-[360px] flex flex-wrap gap-2.5 content-start">
                  {filteredNodes.length > 0 ? (
                    filteredNodes.map(node => {
                      const isSelected = activeNode?.id === node.id;
                      return (
                        <button
                          key={node.id}
                          type="button"
                          onClick={() => setActiveNode(node)}
                          className={`p-2.5 rounded-xl border text-left transition-all ${getNodeColor(node.type)} ${
                            isSelected ? 'ring-2 ring-purple-500 shadow-md scale-105' : 'hover:shadow-xs'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-current opacity-70" />
                            <span className="font-bold text-xs">{node.label}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] opacity-75 mt-1 gap-2">
                            <span>{node.type}</span>
                            <span>{node.mentionCount}x disebut</span>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 py-12">
                      <BookOpen className="w-8 h-8 stroke-1 mb-2" />
                      <p className="text-xs">Tidak ada simpul yang cocok dengan pencarian.</p>
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 flex items-center justify-between text-xs text-purple-900 dark:text-purple-200">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>Klik sembarang simpul untuk memeriksa kutipan & relasi antarkonsep.</span>
                  </div>
                </div>
              </div>

              {/* Node Inspector Panel (1 Col) */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
                {activeNode ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Inspektur Simpul
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${getNodeColor(activeNode.type)}`}>
                        {activeNode.type}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {activeNode.label}
                    </h4>

                    <div className="text-xs text-slate-500 space-y-1">
                      <p>Sumber: <b className="text-slate-700 dark:text-slate-300">{activeNode.documentSource}</b></p>
                      <p>Frekuensi: <b className="text-slate-700 dark:text-slate-300">{activeNode.mentionCount} kali</b></p>
                    </div>

                    {activeNode.snippet && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          Konteks Kutipan Asli:
                        </span>
                        <blockquote className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs italic text-slate-600 dark:text-slate-300 border-l-2 border-purple-500 leading-relaxed">
                          "{activeNode.snippet}..."
                        </blockquote>
                      </div>
                    )}

                    {/* Connected relations */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        Relasi Terhubung:
                      </span>
                      {graphData.edges
                        .filter(e => e.source === activeNode.id || e.target === activeNode.id)
                        .map(e => (
                          <div key={e.id} className="text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                            <span className="text-purple-600 dark:text-purple-400 font-medium">{e.relation}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{(e.confidence * 100).toFixed(0)}% yakin</span>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 text-slate-400 space-y-2">
                    <Share2 className="w-8 h-8 mx-auto stroke-1 text-slate-300 dark:text-slate-700" />
                    <p className="text-xs">Pilih salah satu konsep di sisi kiri untuk melihat detail relasinya.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Research Gaps Tab */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/60 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <h4 className="font-bold text-amber-900 dark:text-amber-200">
                    Deteksi Celah Riset (Research Gap Intelligence)
                  </h4>
                  <p className="text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                    GraphRAG menganalisis dokumen skripsi Anda untuk menemukan variabel atau argumen yang belum didukung oleh teori rujukan yang cukup kuat.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {graphData.researchGaps.map(gap => (
                  <div
                    key={gap.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          {gap.severity.toUpperCase()} PRIORITY
                        </span>
                        <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                          Celah: {gap.conceptA} ↔ {gap.conceptB}
                        </h5>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {gap.description}
                    </p>

                    <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Rekomendasi Pertanyaan Dewan Penguji:</span>
                        <p className="italic mt-0.5">"{gap.suggestedResearchQuestion}"</p>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          onAskCouncilAboutGap?.(gap.suggestedResearchQuestion);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-2xs"
                      >
                        <span>Konsultasikan ke Dewan AI</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
