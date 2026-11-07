import React, { useState } from 'react';
import {
  Calendar,
  CheckSquare,
  FileText,
  ListTodo,
  Sparkles,
  User,
  X
} from 'lucide-react';
import {
  parseSupervisorNotes,
  generateSupervisorControlSheetMarkdown
} from '../utils/supervisorNotesEngine';

interface SupervisorNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveToCanvas?: (markdownContent: string, title: string) => void;
  onAddToWorkspacePlan?: (tasks: Array<{ title: string; description: string }>, planGoal: string) => void;
  showToast?: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export const SupervisorNotesModal: React.FC<SupervisorNotesModalProps> = ({
  isOpen,
  onClose,
  onSaveToCanvas,
  onAddToWorkspacePlan,
  showToast
}) => {
  const [supervisorName, setSupervisorName] = useState('Dr. Ir. Pembimbing Utama, M.Kom.');
  const [rawNotes, setRawNotes] = useState('');
  const [previewParsed, setPreviewParsed] = useState<ReturnType<typeof parseSupervisorNotes> | null>(null);

  if (!isOpen) return null;

  const handleNotesChange = (text: string) => {
    setRawNotes(text);
    if (text.trim().length > 10) {
      setPreviewParsed(parseSupervisorNotes(text, supervisorName));
    } else {
      setPreviewParsed(null);
    }
  };

  const handleCreateControlSheet = () => {
    if (!rawNotes.trim()) return;
    const parsed = parseSupervisorNotes(rawNotes, supervisorName);
    const md = generateSupervisorControlSheetMarkdown(parsed);
    onSaveToCanvas?.(md, `Lembar Kendali Bimbingan - ${supervisorName.slice(0, 25)}`);
    showToast?.('Lembar kendali bimbingan berhasil dibuat di Canvas!', 'success');
    onClose();
  };

  const handleGeneratePlan = () => {
    if (!rawNotes.trim()) return;
    const parsed = parseSupervisorNotes(rawNotes, supervisorName);
    if (parsed.revisionItems.length === 0) {
      showToast?.('Tidak ada butir revisi yang terdeteksi dari catatan.', 'warning');
      return;
    }

    const tasks = parsed.revisionItems.map(item => ({
      title: `[${item.chapterLabel}] ${item.actionTitle}`,
      description: `Arahan dari ${supervisorName}: ${item.details} (Prioritas: ${item.priority})`
    }));

    onAddToWorkspacePlan?.(tasks, `Tindak Lanjut Revisi Bimbingan: ${supervisorName}`);
    showToast?.(`${tasks.length} tugas revisi berhasil ditambahkan ke Rencana Kerja!`, 'success');
    onClose();
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
            <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-xs">
              <ListTodo className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                  Notulensi Bimbingan Dosen $\to$ Action Plan
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300">
                  Smart Parser
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ubah catatan atau transkripsi bimbingan menjadi daftar tugas terarah
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

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                <User className="w-3 h-3 text-violet-500" />
                Nama Dosen Pembimbing:
              </label>
              <input
                type="text"
                value={supervisorName}
                onChange={e => setSupervisorName(e.target.value)}
                placeholder="cth: Dr. Ir. Budi Santoso, M.Kom."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-violet-500" />
                Tanggal Bimbingan:
              </label>
              <input
                type="text"
                disabled
                value={new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tempelkan Catatan / Arahan Dosen:
            </label>
            <textarea
              rows={5}
              value={rawNotes}
              onChange={e => handleNotesChange(e.target.value)}
              placeholder="Contoh catatan bimbingan:&#10;- Bab 1: Pertegas latar belakang paragraf 3 dengan data statistik BPS terbaru&#10;- Bab 2: Tambahkan 2 jurnal internasional bereputasi terkait variabel mediasi&#10;- Bab 3: Ganti teknik sampling menggunakan stratified random sampling N=120&#10;- Rapikan typo dan format sitasi APA 7th"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-violet-500 leading-relaxed"
            />
          </div>

          {/* Live Extracted Action Items */}
          {previewParsed && previewParsed.revisionItems.length > 0 && (
            <div className="space-y-2 p-3.5 rounded-xl border border-violet-100 dark:border-violet-900/50 bg-violet-50/40 dark:bg-violet-950/20">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-violet-800 dark:text-violet-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  {previewParsed.revisionItems.length} Butir Tugas Terdeteksi Otomatis:
                </span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pt-1">
                {previewParsed.revisionItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-violet-700 dark:text-violet-300 text-[11px]">
                          {item.chapterLabel}
                        </span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                          item.priority === 'kritis'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : item.priority === 'sedang'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {item.priority}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                        {item.details}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500">
            Tugas dapat langsung dieksekusi bersama asisten AI di RuangKerja.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!rawNotes.trim()}
              onClick={handleCreateControlSheet}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Simpan Lembar Kendali</span>
            </button>

            <button
              type="button"
              disabled={!rawNotes.trim()}
              onClick={handleGeneratePlan}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors shadow-xs"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Jadikan Plan Workspace</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
