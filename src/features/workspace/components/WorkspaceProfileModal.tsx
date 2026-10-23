import React, { useEffect, useState } from 'react';
import { UserRound } from 'lucide-react';
import { apiClient } from '../../../lib/apiClient';
import { useToast } from '../../../components/Toast';
import { ModalShell } from '../../../components/ui/ModalShell';

const ABOUT_MAX = 800;
const INSTRUCTIONS_MAX = 800;

interface AgentProfile {
  aboutMe: string;
  responseInstructions: string;
  isEnabled: boolean;
}

interface WorkspaceProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WorkspaceProfileModal({ isOpen, onClose }: WorkspaceProfileModalProps) {
  const { showToast } = useToast();
  const [aboutMe, setAboutMe] = useState('');
  const [responseInstructions, setResponseInstructions] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setIsLoading(true);
    apiClient.get<{ success: boolean; profile: AgentProfile }>('/api/v1/workspace/profile')
      .then(res => {
        if (cancelled) return;
        if (res.success && res.data?.profile) {
          setAboutMe(res.data.profile.aboutMe);
          setResponseInstructions(res.data.profile.responseInstructions);
          setIsEnabled(res.data.profile.isEnabled);
        } else {
          showToast('Profil hanya tersedia untuk akun yang sudah masuk.', 'info');
        }
      })
      .catch(() => { if (!cancelled) showToast('Gagal memuat profil.', 'error'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, showToast]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await apiClient.put<{ success: boolean }>('/api/v1/workspace/profile', { aboutMe, responseInstructions, isEnabled });
      if (res.success) {
        showToast('Profil disimpan. AI akan memakainya di RuangKerja.', 'success');
        onClose();
      } else {
        showToast(res.error || 'Gagal menyimpan profil.', 'error');
      }
    } catch {
      showToast('Gagal menyimpan profil.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setIsSaving(true);
    try {
      const res = await apiClient.delete<{ success: boolean }>('/api/v1/workspace/profile');
      if (res.success) {
        setAboutMe('');
        setResponseInstructions('');
        setIsEnabled(true);
        showToast('Profil dihapus.', 'info');
      } else {
        showToast(res.error || 'Gagal menghapus profil.', 'error');
      }
    } catch {
      showToast('Gagal menghapus profil.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const fieldClass = 'mt-1 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Profil & Gaya Kerja Saya"
      subtitle="AI RuangKerja menyesuaikan jawaban dengan profil ini di semua workspace."
      maxWidth="lg"
      footer={(
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={handleClear} disabled={isSaving || isLoading} className="h-9 rounded-lg px-3 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:hover:bg-rose-950/40">Hapus profil</button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="h-9 rounded-lg px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Batal</button>
            <button type="button" onClick={handleSave} disabled={isSaving || isLoading} className="h-9 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">{isSaving ? 'Menyimpan…' : 'Simpan'}</button>
          </div>
        </div>
      )}
    >
      <div className="space-y-4">
        <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
          <span className="flex items-center gap-2"><UserRound className="h-4 w-4 text-indigo-600" aria-hidden="true" />Gunakan profil ini</span>
          <input type="checkbox" checked={isEnabled} onChange={event => setIsEnabled(event.target.checked)} disabled={isLoading} className="h-4 w-4 accent-indigo-600" />
        </label>
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
          Tentang saya
          <textarea value={aboutMe} onChange={event => setAboutMe(event.target.value.slice(0, ABOUT_MAX))} disabled={isLoading} rows={4} placeholder="Contoh: Mahasiswa Informatika semester 7, skripsi tentang NLP bahasa Indonesia, menulis kode Python dan TypeScript." className={fieldClass} />
          <span className="mt-0.5 block text-right text-[10px] text-slate-400">{aboutMe.length} / {ABOUT_MAX}</span>
        </label>
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
          Cara AI menjawab
          <textarea value={responseInstructions} onChange={event => setResponseInstructions(event.target.value.slice(0, INSTRUCTIONS_MAX))} disabled={isLoading} rows={4} placeholder="Contoh: Jawab ringkas dengan poin, bahasa Indonesia profesional, sitasi APA 7, sertakan contoh kode singkat." className={fieldClass} />
          <span className="mt-0.5 block text-right text-[10px] text-slate-400">{responseInstructions.length} / {INSTRUCTIONS_MAX}</span>
        </label>
        <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          Disimpan terenkripsi dan hanya dipakai di RuangKerja, bukan di RuangTenang. Teks ini dikirim ke model AI yang Anda pilih, jadi jangan menulis data sensitif seperti kata sandi atau kondisi kesehatan.
        </p>
      </div>
    </ModalShell>
  );
}
