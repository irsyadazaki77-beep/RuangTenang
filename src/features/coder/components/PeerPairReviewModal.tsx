import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Copy,
  Check,
  Plus,
  CheckCircle2,
  Download,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import {
  peerPairProgrammingService,
  PeerReviewAnnotation,
  PairSessionState
} from '../services/peerPairProgramming';

interface PeerPairReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeFilePath?: string;
  isDark?: boolean;
}

export const PeerPairReviewModal: React.FC<PeerPairReviewModalProps> = ({
  isOpen,
  onClose,
  activeFilePath = 'main.js',
  isDark = true
}) => {
  const [session, setSession] = useState<PairSessionState>(() =>
    peerPairProgrammingService.getState()
  );
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedCard, setCopiedCard] = useState(false);

  // New annotation form state
  const [newComment, setNewComment] = useState('');
  const [targetLine, setTargetLine] = useState<number>(1);
  const [authorName, setAuthorName] = useState('Mahasiswa Reviewer');
  const [category, setCategory] = useState<PeerReviewAnnotation['category']>('saran_perbaikan');

  useEffect(() => {
    if (!isOpen) return;
    const unsub = peerPairProgrammingService.subscribe(setSession);
    if (!session.roomCode) {
      peerPairProgrammingService.createRoom('Mahasiswa 1');
    }
    return unsub;
  }, [isOpen, session.roomCode]);

  if (!isOpen) return null;

  const handleCopyRoomCode = () => {
    navigator.clipboard.writeText(session.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleAddAnnotation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    peerPairProgrammingService.addAnnotation({
      filePath: activeFilePath,
      lineNumber: targetLine,
      author: authorName,
      authorRole: session.myRole === 'driver' ? 'rekan_tim' : 'navigator',
      comment: newComment.trim(),
      category
    });

    setNewComment('');
  };

  const handleDownloadAsistensiCard = () => {
    const md = peerPairProgrammingService.generateLabAsistensiCard('Modul Praktikum Mahasiswa');
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Kartu-Asistensi-${session.roomCode || 'Lab'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setCopiedCard(true);
    setTimeout(() => setCopiedCard(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-md">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Ruang Kolaborasi & Asistensi Lab</h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Pair Programming
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Sesi kolaborasi Driver & Navigator dengan catatan asistensi per baris dan kartu review resmi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadAsistensiCard}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>{copiedCard ? 'Terunduh!' : 'Unduh Kartu Asistensi (.md)'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Room Code & Role Bar */}
        <div className={`px-6 py-3 border-b flex flex-wrap items-center justify-between gap-4 ${isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50/50'}`}>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">Kode Room:</span>
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
              <span className="font-mono font-bold text-sm text-emerald-400 tracking-wider">
                {session.roomCode}
              </span>
              <button
                type="button"
                onClick={handleCopyRoomCode}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Salin Kode Room"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <span className="text-xs text-slate-500">• Berbagi kode ini ke teman satu kelompok</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Peran Anda:</span>
            <button
              type="button"
              onClick={() => peerPairProgrammingService.setRole('driver')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                session.myRole === 'driver'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              🚗 Driver (Penulis)
            </button>
            <button
              type="button"
              onClick={() => peerPairProgrammingService.setRole('navigator')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                session.myRole === 'navigator'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              🧭 Navigator (Reviewer)
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden min-h-[380px]">
          {/* Add Annotation Form (5 cols) */}
          <div className={`md:col-span-5 p-5 border-r flex flex-col ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-slate-50/40'}`}>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sematkan Catatan Asistensi / Review</span>
            </h3>

            <form onSubmit={handleAddAnnotation} className="space-y-3 flex-1 flex flex-col">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Target Baris Kode:</label>
                  <input
                    type="number"
                    min="1"
                    value={targetLine}
                    onChange={e => setTargetLine(parseInt(e.target.value, 10) || 1)}
                    className={`w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none focus:ring-1 focus:ring-emerald-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Kategori:</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className={`w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-300'
                    }`}
                  >
                    <option value="saran_perbaikan">Saran Perbaikan</option>
                    <option value="catatan_asistensi">Catatan Asistensi</option>
                    <option value="pertanyaan">Pertanyaan Logika</option>
                    <option value="apresiasi">Apresiasi Arsitektur</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Nama Reviewer:</label>
                <input
                  type="text"
                  value={authorName}
                  onChange={e => setAuthorName(e.target.value)}
                  placeholder="Contoh: Asisten Lab Dimas"
                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-300'
                  }`}
                />
              </div>

              <div className="flex-1 flex flex-col">
                <label className="text-[10px] text-slate-400 block mb-1">Isi Masukan / Review:</label>
                <textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Contoh: Baris ini perlu ditambah pemeriksaan edge-case saat array kosong..."
                  className={`w-full flex-1 p-2.5 rounded-xl border text-xs resize-none outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-300'
                  }`}
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Simpan Catatan Review</span>
              </button>
            </form>
          </div>

          {/* Annotations List (7 cols) */}
          <div className="md:col-span-7 p-5 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-300">
                Daftar Catatan Review ({session.annotations.length}):
              </span>
              <span className="text-[11px] text-slate-400">
                {session.annotations.filter(a => a.resolved).length} Selesai Dituntaskan
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[380px]">
              {session.annotations.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                  <MessageSquare className="w-8 h-8 opacity-40 mb-2" />
                  <p>Belum ada catatan review. Tambahkan masukan pertama di samping!</p>
                </div>
              ) : (
                session.annotations.map(annot => (
                  <div
                    key={annot.id}
                    className={`p-3 rounded-xl border transition-all ${
                      annot.resolved
                        ? 'opacity-60 bg-slate-900/30 border-slate-800'
                        : isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                          Baris {annot.lineNumber}
                        </span>
                        <span className="text-xs font-bold text-slate-200">{annot.author}</span>
                        <span className="text-[10px] text-slate-400">({annot.authorRole})</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{annot.timestamp}</span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed my-1.5">{annot.comment}</p>

                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <span className="text-slate-400 capitalize">{annot.category.replace(/_/g, ' ')}</span>
                      {!annot.resolved ? (
                        <button
                          type="button"
                          onClick={() => peerPairProgrammingService.resolveAnnotation(annot.id)}
                          className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Tandai Selesai</span>
                        </button>
                      ) : (
                        <span className="text-slate-500 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Dituntaskan
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-3 border-t flex items-center justify-between text-xs text-slate-400 ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Kartu Asistensi Praktikum mencatat seluruh kontribusi rekan tim dan asisten lab</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
            }`}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
