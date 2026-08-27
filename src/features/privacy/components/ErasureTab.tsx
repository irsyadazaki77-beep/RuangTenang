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
    <div className="space-y-4 border border-rose-200 bg-rose-50/30 p-5 rounded-2xl">
      <div>
        <h3 className="text-sm font-bold text-rose-900 flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-rose-600" />
          Hak untuk Dilupakan (Right to be Forgotten)
        </h3>
        <p className="text-xs text-rose-800 mt-1">
          Tindakan ini menghapus <strong>seluruh rekam jejak secara permanen</strong> tanpa dapat dikembalikan.
        </p>
      </div>

      <div className="bg-white border border-rose-200 p-4 rounded-xl text-xs text-slate-700 space-y-2">
        <strong className="text-rose-900 block font-bold">Data yang Akan Dihapus Permanen:</strong>
        <ul className="list-disc list-inside space-y-1 text-slate-600">
          <li>Akun pengguna dan kredensial login</li>
          <li>Seluruh riwayat sesi aktif dan login history</li>
          <li>Seluruh riwayat skrining (PHQ-9 & GAD-7)</li>
          <li>Jadwal konseling dan catatan konsultasi</li>
          <li>Audit log, telemetri, dan penggunaan harian</li>
          <li>Cookie sesi dan data browser lokal</li>
        </ul>
      </div>

      {/* Option to clear only activity history without deleting account */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-800">Bersihkan Riwayat Aktivitas Saja</h4>
            <p className="text-[11px] text-slate-500">Hapus riwayat chat, mood log, dan hasil skrining tanpa menghapus akun atau jadwal konseling Anda.</p>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={handleClearActivityData}
            className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold transition shrink-0 ml-3"
          >
            Bersihkan Aktivitas
          </button>
        </div>
      </div>

      {erasureStatus && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
          Status Eksekusi Terakhir: <strong>{erasureStatus.status}</strong> • Total {erasureStatus.erasedRecordsCount} item dibersihkan pada {new Date(erasureStatus.completedAt).toLocaleString('id-ID')}
        </div>
      )}

      <div className="space-y-2 pt-2">
        <label className="block text-xs font-bold text-rose-900">
          Ketik <span className="underline select-all">HAPUS SEMUA DATA SAYA</span> untuk mengonfirmasi:
        </label>
        <input
          type="text"
          value={deleteConfirmInput}
          onChange={(e) => setDeleteConfirmInput(e.target.value)}
          placeholder="HAPUS SEMUA DATA SAYA"
          className="w-full px-3 py-2 text-xs border border-rose-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
        />
      </div>

      <button
        type="button"
        disabled={loading || deleteConfirmInput.trim() !== 'HAPUS SEMUA DATA SAYA'}
        onClick={handleExecuteErasure}
        className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-2"
      >
        <Trash2 className="w-4 h-4" />
        <span>{loading ? 'Memproses Penghapusan...' : 'Eksekusi Hapus Semua Data Saya Permanen'}</span>
      </button>
    </div>
  );
};
