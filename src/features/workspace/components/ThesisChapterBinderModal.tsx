import React, { useState, useEffect } from 'react';
import {
  Download,
  FileText,
  Layers,
  X
} from 'lucide-react';
import { WorkspaceArtifact } from '../types';
import {
  THESIS_STANDARD_SLOTS,
  ThesisBinderMap,
  autoMapArtifactsToChapters,
  compileThesisBinderMarkdown,
  downloadThesisBinderDocx
} from '../utils/exportThesisBinder';

interface ThesisChapterBinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  artifacts: WorkspaceArtifact[];
  defaultTitle?: string;
  authorName?: string;
  onCreateArtifact?: (content: string, title: string) => void;
  showToast?: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export const ThesisChapterBinderModal: React.FC<ThesisChapterBinderModalProps> = ({
  isOpen,
  onClose,
  artifacts,
  defaultTitle = '',
  authorName = '',
  onCreateArtifact,
  showToast
}) => {
  const [thesisTitle, setThesisTitle] = useState(defaultTitle || 'Judul Naskah Skripsi / Tugas Akhir');
  const [author, setAuthor] = useState(authorName || '');
  const [university] = useState('Universitas');
  const [binderMap, setBinderMap] = useState<ThesisBinderMap>(() => autoMapArtifactsToChapters(artifacts));
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setBinderMap(autoMapArtifactsToChapters(artifacts));
    }
  }, [isOpen, artifacts]);

  if (!isOpen) return null;

  const documentArtifacts = artifacts.filter(a => a.type === 'DOCUMENT');
  const mappedSlotsCount = Object.values(binderMap).filter(Boolean).length;

  const handleSlotChange = (scope: string, artifactId: string) => {
    setBinderMap(prev => ({
      ...prev,
      [scope]: artifactId === '__none__' ? '' : artifactId
    }));
  };

  const handleExportDocx = async () => {
    if (mappedSlotsCount === 0) {
      showToast?.('Pilih minimal satu bab untuk digabungkan.', 'warning');
      return;
    }
    setIsExporting(true);
    try {
      await downloadThesisBinderDocx(thesisTitle, author, university, artifacts, binderMap);
      showToast?.('Naskah skripsi lengkap berhasil diekspor ke Word (.docx)!', 'success');
      onClose();
    } catch (e) {
      showToast?.('Gagal mengekspor naskah skripsi.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCombineToCanvas = () => {
    if (mappedSlotsCount === 0) {
      showToast?.('Pilih minimal satu bab untuk digabungkan.', 'warning');
      return;
    }
    const combinedMd = compileThesisBinderMarkdown(thesisTitle, author, artifacts, binderMap);
    onCreateArtifact?.(combinedMd, `Naskah Gabungan Skripsi - ${thesisTitle.slice(0, 30)}`);
    showToast?.('Naskah gabungan berhasil dibuka di Canvas!', 'success');
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
            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                  Binder Skripsi & Ekspor Naskah Utuh
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                  Multi-Chapter
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gabungkan Bab 1 sampai Bab 5 & Daftar Pustaka menjadi satu naskah siap sidang
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

        {/* Form Meta */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Judul Naskah Skripsi / Tugas Akhir *
              </label>
              <input
                type="text"
                value={thesisTitle}
                onChange={e => setThesisTitle(e.target.value)}
                placeholder="cth: Pengaruh Model Pembelajaran Berbasis AI terhadap..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Nama Mahasiswa Peneliti
              </label>
              <input
                type="text"
                value={author}
                onChange={e => setAuthor(e.target.value)}
                placeholder="Nama Anda"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Chapters Slot Mapping */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div className="flex items-center justify-between text-xs pb-1">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Pemetaan Bab Naskah ({mappedSlotsCount} dari {THESIS_STANDARD_SLOTS.length} Bab Terpilih)
            </span>
            <span className="text-[11px] text-slate-400">
              Daftar Pustaka tiap bab akan disatukan otomatis
            </span>
          </div>

          <div className="space-y-2">
            {THESIS_STANDARD_SLOTS.map(slot => {
              const selectedArtId = binderMap[slot.scope] || '';

              return (
                <div
                  key={slot.scope}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-44">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] ${
                      selectedArtId
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                    }`}>
                      {slot.order}
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {slot.title}
                    </span>
                  </div>

                  <div className="flex-1 sm:max-w-xs">
                    <select
                      value={selectedArtId || '__none__'}
                      onChange={e => handleSlotChange(slot.scope, e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-medium"
                    >
                      <option value="__none__">-- Belum Dipetakan (Lewati) --</option>
                      {documentArtifacts.map(art => (
                        <option key={art.id} value={art.id}>
                          {art.title || 'Dokumen Tanpa Judul'} ({art.content.length} kar)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500">
            Format keluaran mengikuti standar skripsi A4, margin 4-4-3-3, Times New Roman, dan spasi 1.5.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCombineToCanvas}
              disabled={mappedSlotsCount === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Buka Gabungan di Canvas</span>
            </button>

            <button
              type="button"
              disabled={mappedSlotsCount === 0 || isExporting}
              onClick={handleExportDocx}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Mengekspor Dokumen...' : 'Download Skripsi Lengkap (.docx)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
