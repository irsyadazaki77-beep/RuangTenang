import React from 'react';
import { Trash2 } from 'lucide-react';

interface ErasureTabProps {
  loading: boolean;
  erasureStatus: any;
  deleteConfirmInput: string;
  setDeleteConfirmInput: (val: string) => void;
  handleClearActivityData: () => void;
  handleExecuteErasure: () => void;
}

export const ErasureTab: React.FC<ErasureTabProps> = ({
  loading,
  erasureStatus,
  deleteConfirmInput,
  setDeleteConfirmInput,
  handleClearActivityData,
  handleExecuteErasure
}) => {
  return (
    <div className="space-y-3.5 border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 p-4 sm:p-5 rounded-2xl">
      <div>
        <h3 className="text-sm font-bold text-rose-900 dark:text-rose-300 flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          Hak untuk Dilupakan (Right to be Forgotten)
        </h3>
        <p className="text-xs text-rose-800 dark:text-rose-400/90 mt-1">
          Tindakan ini menghapus <strong>seluruh rekam jejak secara permanen</strong> tanpa dapat dikembalikan.
        </p>
      </div>

      <div className="surface-card border border-rose-200 dark:border-rose-900/40 p-3.5 rounded-xl text-xs space-y-2">
        <strong className="text-rose-900 dark:text-rose-300 block font-semibold">Data yang Akan Dihapus Permanen:</strong>
        <ul className="list-disc list-inside space-y-1 text-secondary">
          <li>Akun pengguna dan kredensial login</li>
          <li>Seluruh riwayat sesi aktif dan login history</li>
          <li>Seluruh riwayat skrining (PHQ-9 & GAD-7)</li>
          <li>Jadwal konseling dan catatan konsultasi</li>
          <li>Audit log, telemetri, dan penggunaan harian</li>
          <li>Cookie sesi dan data browser lokal</li>
        </ul>
      </div>

      {/* Option to clear only activity history without deleting account */}
      <div className="p-3.5 surface-card border border-default rounded-xl space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h4 className="text-xs font-bold text-primary">Bersihkan Riwayat Aktivitas Saja</h4>
            <p className="text-[11px] text-secondary mt-0.5">Hapus riwayat chat, mood log, dan hasil skrining tanpa menghapus akun atau jadwal konseling Anda.</p>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={handleClearActivityData}
            className="px-3 py-1.5 min-h-[40px] surface-muted hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 border border-default text-secondary rounded-xl text-xs font-semibold transition shrink-0 cursor-pointer active:scale-[0.98]"
          >
            Bersihkan Aktivitas
          </button>
        </div>
      </div>

      {erasureStatus && (
        <div className="p-3 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/50 rounded-xl text-xs text-teal-900 dark:text-teal-300">
          Status Eksekusi Terakhir: <strong>{erasureStatus.status}</strong> • Total {erasureStatus.erasedRecordsCount} item dibersihkan pada {new Date(erasureStatus.completedAt).toLocaleString('id-ID')}
        </div>
      )}

      <div className="space-y-1.5 pt-1">
        <label className="block text-xs font-bold text-rose-900 dark:text-rose-300">
          Ketik <span className="underline select-all">HAPUS SEMUA DATA SAYA</span> untuk mengonfirmasi:
        </label>
        <input
          type="text"
          value={deleteConfirmInput}
          onChange={(e) => setDeleteConfirmInput(e.target.value)}
          placeholder="HAPUS SEMUA DATA SAYA"
          className="w-full px-3 py-2 text-base sm:text-xs surface-card border border-rose-300 dark:border-rose-900/60 rounded-xl text-primary focus:ring-1 focus:ring-rose-500 focus:outline-none min-h-[44px]"
        />
      </div>

      <button
        type="button"
        disabled={loading || deleteConfirmInput.trim() !== 'HAPUS SEMUA DATA SAYA'}
        onClick={handleExecuteErasure}
        className="w-full py-2.5 min-h-[44px] bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-3xs flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
      >
        <Trash2 className="w-4 h-4" />
        <span>{loading ? 'Memproses Penghapusan...' : 'Eksekusi Hapus Semua Data Saya Permanen'}</span>
      </button>
    </div>
  );
};
