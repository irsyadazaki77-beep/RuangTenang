import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Save, 
  AlertCircle, 
  CheckCircle, 
  Stethoscope, 
  Printer 
} from 'lucide-react';
import { SoapNote, TriageItem } from '../types';
import { apiClient } from '../../../lib/apiClient';

interface SoapNoteEditorProps {
  selectedStudent?: TriageItem | null;
  existingNote?: SoapNote | null;
  onSaveSuccess: (note: SoapNote) => void;
  onCancel?: () => void;
}

export const SoapNoteEditor: React.FC<SoapNoteEditorProps> = ({
  selectedStudent,
  existingNote,
  onSaveSuccess,
  onCancel
}) => {
  const [studentId, setStudentId] = useState(existingNote?.studentId || selectedStudent?.studentId || '');
  const [studentName, setStudentName] = useState(existingNote?.studentName || selectedStudent?.studentName || '');
  const [subjective, setSubjective] = useState(existingNote?.subjective || '');
  const [objective, setObjective] = useState(existingNote?.objective || '');
  const [assessment, setAssessment] = useState(existingNote?.assessment || '');
  const [plan, setPlan] = useState(existingNote?.plan || '');
  const [riskLevel, setRiskLevel] = useState<'LOW' | 'MODERATE' | 'HIGH' | 'CRISIS'>(
    existingNote?.riskLevel || (selectedStudent?.riskLevel === 'CRITICAL' ? 'CRISIS' : selectedStudent?.riskLevel as any || 'LOW')
  );
  const [referralTarget, setReferralTarget] = useState(existingNote?.referralTarget || '');
  const [followUpDate, setFollowUpDate] = useState(existingNote?.followUpDate || '');
  const [summary] = useState(existingNote?.summary || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (selectedStudent) {
      setStudentId(selectedStudent.studentId || selectedStudent.id);
      setStudentName(selectedStudent.studentName);
      if (selectedStudent.phq9Score !== undefined || selectedStudent.gad7Score !== undefined) {
        setObjective((prev) => {
          if (prev) return prev;
          return `Hasil Skrining Awal:\n- Skor PHQ-9 (Depresi): ${selectedStudent.phq9Score ?? 'N/A'}/27 (${selectedStudent.phq9Severity ?? '-'})\n- Skor GAD-7 (Kecemasan): ${selectedStudent.gad7Score ?? 'N/A'}/21 (${selectedStudent.gad7Severity ?? '-'})\n- Riwayat Risiko Suisiditas: ${selectedStudent.suicideRisk ? 'POSITIF (Butuh Perhatian Khusus)' : 'Negatif'}`;
        });
      }
    }
  }, [selectedStudent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!studentId) {
      setErrorMsg('Identitas Mahasiswa / NIM wajib diisi.');
      return;
    }
    if (!subjective.trim() || !assessment.trim() || !plan.trim()) {
      setErrorMsg('Kolom Subjective, Assessment, dan Plan (SOAP) wajib dilengkapi.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        studentId,
        studentName: studentName || 'Mahasiswa Terdaftar',
        subjective,
        objective,
        assessment,
        plan,
        riskLevel,
        referralTarget: referralTarget || undefined,
        followUpDate: followUpDate || undefined,
        summary: summary || undefined,
      };

      const response = await apiClient.post<any>('/api/v1/counselor-portal/soap-notes', payload);

      if (!response.success) {
        throw new Error(response.error || 'Gagal menyimpan catatan SOAP.');
      }

      setSuccessMsg('Catatan Klinis SOAP berhasil dienkripsi (AES-256-GCM) dan disimpan.');
      onSaveSuccess(response.data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem saat menyimpan catatan klinis.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="surface-card rounded-2xl border border-default p-5 sm:p-6 shadow-sm space-y-6">
      {/* Header with PDP Compliance Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-default">
        <div>
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base sm:text-lg font-bold text-primary">
              Catatan Klinis SOAP (SOAP Clinical Notes)
            </h2>
          </div>
          <p className="text-xs text-secondary mt-0.5">
            Dokumentasi rekam medis psikologis sesi konseling terintegrasi sistem kampus.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
            <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>AES-256-GCM (UU PDP)</span>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="p-2 rounded-xl border border-default surface-muted hover:bg-slate-100 dark:hover:bg-slate-800 text-secondary hover:text-primary transition-all cursor-pointer"
            title="Cetak Salinan Klinis"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status Alerts */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form Formats */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Student Identification Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-default">
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">
              Nama Mahasiswa / Klien
            </label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="cth. Anisa Rahmawati"
              className="w-full px-3 py-2 text-xs border border-default surface-card rounded-xl text-primary focus:outline-none focus:border-indigo-600"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">
              ID Mahasiswa / NIM
            </label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="cth. 2106012345"
              className="w-full px-3 py-2 text-xs border border-default surface-card rounded-xl text-primary focus:outline-none focus:border-indigo-600"
              required
            />
          </div>
        </div>

        {/* SOAP Input Sections */}
        <div className="space-y-4">
          {/* S - Subjective */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-[11px]">S</span>
                <span>Subjective (Keluhan Utama Mahasiswa)</span>
              </label>
              <span className="text-[11px] text-secondary">Gejala, pemicu akademik/sosial, laporan verbal</span>
            </div>
            <textarea
              rows={3}
              value={subjective}
              onChange={(e) => setSubjective(e.target.value)}
              placeholder="Deskripsikan keluhan yang disampaikan mahasiswa, riwayat stresor, masalah tidur, beban skripsi/kuliah..."
              className="w-full p-3 text-xs leading-relaxed border border-default surface-card rounded-xl text-primary focus:outline-none focus:border-indigo-600"
              required
            />
          </div>

          {/* O - Objective */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-[11px]">O</span>
                <span>Objective (Observasi Klinis & Skor Skrining)</span>
              </label>
              <span className="text-[11px] text-secondary">Afek, kontak mata, skor PHQ-9 / GAD-7</span>
            </div>
            <textarea
              rows={3}
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Observasi perilaku konseli: kontak mata, afek datar/cemas, penampilan, skor instrumen psikometrik..."
              className="w-full p-3 text-xs leading-relaxed border border-default surface-card rounded-xl text-primary focus:outline-none focus:border-indigo-600"
            />
          </div>

          {/* A - Assessment */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-[11px]">A</span>
                <span>Assessment (Evaluasi Psikologis / Diagnostik Kerja)</span>
              </label>
              <span className="text-[11px] text-secondary">Dinamika psikologis & estimasi risiko bahaya diri</span>
            </div>
            <textarea
              rows={3}
              value={assessment}
              onChange={(e) => setAssessment(e.target.value)}
              placeholder="Analisis konselor terhadap dinamika masalah: Academic Burnout, Generalized Anxiety, Depressive Episode..."
              className="w-full p-3 text-xs leading-relaxed border border-default surface-card rounded-xl text-primary focus:outline-none focus:border-indigo-600"
              required
            />
          </div>

          {/* P - Plan */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-[11px]">P</span>
                <span>Plan (Rencana Intervensi & Tindak Lanjut)</span>
              </label>
              <span className="text-[11px] text-secondary">Teknik CBT, sleep hygiene, tugas mandiri, rujukan</span>
            </div>
            <textarea
              rows={3}
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              placeholder="Intervensi yang diberikan: Cognitive Restructuring, latihan pernapasan diaphragmatic, jadwal sesi lanjutan..."
              className="w-full p-3 text-xs leading-relaxed border border-default surface-card rounded-xl text-primary focus:outline-none focus:border-indigo-600"
              required
            />
          </div>
        </div>

        {/* Clinical Parameters: Risk, Referral, Follow Up */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-default">
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">
              Tingkat Risiko Klinis
            </label>
            <select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value as any)}
              className="w-full px-3 py-2 text-xs border border-default surface-card rounded-xl text-primary focus:outline-none focus:border-indigo-600"
            >
              <option value="LOW">Rendah (Mild / Preventive)</option>
              <option value="MODERATE">Sedang (Moderate / Follow-up Regular)</option>
              <option value="HIGH">Tinggi (Severe / Intensive Support)</option>
              <option value="CRISIS">Krisis (Emergency / Immediate Protocol)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">
              Rujukan Medis / RS Mitra
            </label>
            <select
              value={referralTarget}
              onChange={(e) => setReferralTarget(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-default surface-card rounded-xl text-primary focus:outline-none focus:border-indigo-600"
            >
              <option value="">Tidak Perlu Rujukan (Internal)</option>
              <option value="RS Universitas Indonesia (RSUI)">RS Universitas Indonesia (RSUI)</option>
              <option value="RSUPN Dr. Cipto Mangunkusumo (RSCM)">RSUPN Dr. Cipto Mangunkusumo</option>
              <option value="RS Akademik UGM (RSA UGM)">RS Akademik UGM</option>
              <option value="RS Universitas Airlangga (RSUA)">RS Universitas Airlangga</option>
              <option value="Pusat Kesehatan Mahasiswa / PKM">Puskesmas / PKM Kampus</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">
              Jadwal Sesi Lanjutan (Follow-up)
            </label>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-default surface-card rounded-xl text-primary focus:outline-none focus:border-indigo-600"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-default">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-semibold surface-muted border border-default hover:bg-slate-100 dark:hover:bg-slate-800 text-secondary hover:text-primary rounded-xl transition cursor-pointer"
            >
              Batal
            </button>
          )}

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Mengenkripsi & Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Catatan SOAP Terenkripsi</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
