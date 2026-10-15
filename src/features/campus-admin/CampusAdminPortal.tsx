import React, { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient';

interface CampusSettings {
  id: string;
  name: string;
  slug: string;
  timeZone: string;
  referralContacts: Array<{ label: string; phone?: string; url?: string }>;
  branding: { brandName?: string; primaryColor?: string };
  aiEnabled: boolean;
  retentionDays: number;
  isActive: boolean;
}

interface CampusMetric {
  eventType: string;
  label: string;
  uniqueActors: number | null;
  eventCount: number | null;
  suppressed: boolean;
}

interface CampusCounselor {
  id: string;
  name: string;
  role: string;
  specialties: string[];
  availability: string[];
  isVerified: boolean;
  isFreeForStudents: boolean;
  price: number | null;
  availabilityText: string;
  specialtiesText: string;
}

const inputClass = 'w-full rounded-xl border border-default bg-surface px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-teal-500';

export const CampusAdminPortal: React.FC<{ userName: string; onLogout: () => void }> = ({ userName, onLogout }) => {
  const [campus, setCampus] = useState<CampusSettings | null>(null);
  const [metrics, setMetrics] = useState<CampusMetric[]>([]);
  const [counselors, setCounselors] = useState<CampusCounselor[]>([]);
  const [timeZone, setTimeZone] = useState('Asia/Jakarta');
  const [brandName, setBrandName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#0f766e');
  const [contactsText, setContactsText] = useState('[]');
  const [aiEnabled, setAiEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingCounselorId, setSavingCounselorId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [settingsResult, overviewResult, counselorsResult] = await Promise.all([
        apiClient.get<{ success: boolean; campus: CampusSettings }>('/api/v1/campus-admin/settings'),
        apiClient.get<{ success: boolean; events: CampusMetric[] }>('/api/v1/campus-admin/overview'),
        apiClient.get<{ success: boolean; counselors: CampusCounselor[] }>('/api/v1/campus-admin/counselors')
      ]);
      if (!settingsResult.success || !settingsResult.data || !overviewResult.success || !overviewResult.data || !counselorsResult.success || !counselorsResult.data) {
        throw new Error('Unable to load campus admin data');
      }
      const settingsResponse = settingsResult.data;
      const overviewResponse = overviewResult.data;
      const counselorsResponse = counselorsResult.data;
      setCampus(settingsResponse.campus);
      setTimeZone(settingsResponse.campus.timeZone);
      setBrandName(settingsResponse.campus.branding?.brandName || settingsResponse.campus.name);
      setPrimaryColor(settingsResponse.campus.branding?.primaryColor || '#0f766e');
      setContactsText(JSON.stringify(settingsResponse.campus.referralContacts || [], null, 2));
      setAiEnabled(settingsResponse.campus.aiEnabled);
      setMetrics(overviewResponse.events || []);
      setCounselors((counselorsResponse.counselors || []).map(counselor => ({
        ...counselor,
        availabilityText: counselor.availability.join(', '),
        specialtiesText: counselor.specialties.join(', ')
      })));
    } catch {
      setError('Data kampus belum dapat dimuat. Periksa koneksi atau hubungi administrator platform.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    setError('');
    let referralContacts: CampusSettings['referralContacts'];
    try {
      const parsed: unknown = JSON.parse(contactsText);
      if (!Array.isArray(parsed)) throw new Error('Kontak rujukan harus berupa daftar JSON.');
      referralContacts = parsed;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Format kontak rujukan tidak valid.');
      setSaving(false);
      return;
    }

    try {
      const response = await apiClient.patch<{ success: boolean; campus: CampusSettings }>('/api/v1/campus-admin/settings', {
        timeZone,
        referralContacts,
        branding: { brandName, primaryColor },
        aiEnabled
      });
      if (!response.success || !response.data?.campus) throw new Error('Campus settings were not saved');
      setCampus(response.data.campus);
      setNotice('Pengaturan kampus tersimpan.');
    } catch {
      setError('Pengaturan tidak tersimpan. Periksa kembali isian dan coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const updateCounselorDraft = (id: string, updates: Partial<CampusCounselor>) => {
    setCounselors(current => current.map(counselor => counselor.id === id ? { ...counselor, ...updates } : counselor));
  };

  const saveCounselor = async (event: React.FormEvent, counselor: CampusCounselor) => {
    event.preventDefault();
    setSavingCounselorId(counselor.id);
    setNotice('');
    setError('');
    const price = Number(counselor.price);
    const isFreeForStudents = counselor.isFreeForStudents;
    try {
      const result = await apiClient.patch<{ success: boolean }>(`/api/v1/campus-admin/counselors/${encodeURIComponent(counselor.id)}`, {
        availability: counselor.availabilityText.split(',').map(value => value.trim()).filter(Boolean),
        specialties: counselor.specialtiesText.split(',').map(value => value.trim()).filter(Boolean),
        isFreeForStudents,
        price: Number.isFinite(price) ? price : 0
      });
      if (!result.success) throw new Error('Counselor settings were not saved');
      setNotice(`Pengaturan ${counselor.name} tersimpan.`);
    } catch {
      setError('Pengaturan konselor tidak tersimpan. Periksa kembali isian.');
    } finally {
      setSavingCounselorId(null);
    }
  };

  return (
    <main className="min-h-[100dvh] surface-page text-primary">
      <header className="border-b border-default surface-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">RuangTenang · Administrasi Kampus</p>
            <h1 className="mt-1 text-xl font-bold">{campus?.name || 'Panel kampus'}</h1>
            <p className="mt-1 text-sm text-secondary">Masuk sebagai {userName}</p>
          </div>
          <button type="button" onClick={onLogout} className="rounded-xl border border-default px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Keluar</button>
        </div>
      </header>

      {loading ? <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-secondary" role="status">Memuat data kampus…</div> : (
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1.2fr_0.8fr]">
          {error && <p className="lg:col-span-2 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200" role="alert">{error}</p>}
          <section className="surface-card rounded-2xl border border-default p-5" aria-labelledby="analytics-title">
            <h2 id="analytics-title" className="text-lg font-semibold">Adopsi 30 hari terakhir</h2>
            <p className="mt-1 text-sm text-secondary">Data penggunaan agregat. Angka di bawah 10 pengguna unik disembunyikan.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {metrics.map(metric => (
                <article key={metric.eventType} className="rounded-xl border border-default bg-surface p-4">
                  <h3 className="text-sm font-medium">{metric.label}</h3>
                  <p className="mt-2 text-2xl font-bold">{metric.suppressed ? '—' : metric.uniqueActors}</p>
                  <p className="mt-1 text-xs text-secondary">{metric.suppressed ? 'Belum mencapai kelompok minimum' : 'pengguna unik'}</p>
                </article>
              ))}
            </div>
            <p className="mt-4 text-xs text-secondary">Metrik ini tidak mengukur diagnosis atau tingkat kesehatan mahasiswa.</p>
          </section>

          <section className="surface-card rounded-2xl border border-default p-5" aria-labelledby="counselors-title">
            <h2 id="counselors-title" className="text-lg font-semibold">Konselor kampus</h2>
            {counselors.length === 0 ? <p className="mt-3 text-sm text-secondary">Belum ada profil konselor yang ditautkan ke kampus ini.</p> : (
              <ul className="mt-3 divide-y divide-default">
                {counselors.map(counselor => (
                  <li key={counselor.id} className="py-4 first:pt-0 last:pb-0">
                    <p className="font-medium">{counselor.name}</p>
                    <p className="text-sm text-secondary">{counselor.role} · {counselor.isVerified ? 'Terverifikasi' : 'Belum terverifikasi'}</p>
                    <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={event => saveCounselor(event, counselor)}>
                      <label className="text-xs font-medium">Hari tersedia, pisahkan dengan koma
                        <input className={`${inputClass} mt-1`} value={counselor.availabilityText} onChange={event => updateCounselorDraft(counselor.id, { availabilityText: event.target.value })} maxLength={500} />
                        <span className="mt-1 block font-normal text-secondary">Gunakan nama hari Indonesia, misalnya Senin, Rabu, Jumat. Slot yang ditawarkan: 09.00, 10.30, 14.00, dan 16.00 WIB.</span>
                      </label>
                      <label className="text-xs font-medium">Spesialisasi, pisahkan dengan koma
                        <input className={`${inputClass} mt-1`} value={counselor.specialtiesText} onChange={event => updateCounselorDraft(counselor.id, { specialtiesText: event.target.value })} maxLength={500} />
                      </label>
                      <label className="text-xs font-medium">Biaya per sesi (Rp)
                        <input type="number" min={0} max={100000000} className={`${inputClass} mt-1`} value={counselor.isFreeForStudents ? 0 : (counselor.price ?? 0)} onChange={event => updateCounselorDraft(counselor.id, { price: Number(event.target.value), isFreeForStudents: Number(event.target.value) === 0 })} />
                      </label>
                      <label className="flex items-center gap-2 self-end pb-2 text-xs font-medium">
                        <input type="checkbox" checked={counselor.isFreeForStudents} onChange={event => updateCounselorDraft(counselor.id, { isFreeForStudents: event.target.checked, ...(event.target.checked ? { price: 0 } : {}) })} className="h-4 w-4 accent-teal-700" />
                        Gratis bagi mahasiswa
                      </label>
                      <button type="submit" disabled={savingCounselorId === counselor.id} className="w-fit rounded-xl border border-default px-3 py-2 text-xs font-semibold hover:bg-slate-100 disabled:opacity-60 dark:hover:bg-slate-800 sm:col-span-2">{savingCounselorId === counselor.id ? 'Menyimpan…' : 'Simpan pengaturan konselor'}</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-xs text-secondary">Verifikasi identitas dan pemetaan akun konselor dilakukan administrator platform setelah kampus dikonfirmasi.</p>
          </section>

          <section className="surface-card rounded-2xl border border-default p-5 lg:col-span-2" aria-labelledby="settings-title">
            <h2 id="settings-title" className="text-lg font-semibold">Pengaturan kampus</h2>
            <p className="mt-1 text-sm text-secondary">Konfigurasi ini berlaku untuk akun yang sudah dipetakan ke kampus {campus?.slug}.</p>
            <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={saveSettings}>
              <label className="text-sm font-medium">Nama tampilan
                <input className={`${inputClass} mt-1`} value={brandName} onChange={event => setBrandName(event.target.value)} maxLength={80} required />
              </label>
              <label className="text-sm font-medium">Zona waktu
                <input className={`${inputClass} mt-1`} value={timeZone} onChange={event => setTimeZone(event.target.value)} maxLength={64} required aria-describedby="timezone-help" />
                <span id="timezone-help" className="mt-1 block text-xs font-normal text-secondary">Gunakan nama zona IANA, misalnya Asia/Jakarta.</span>
              </label>
              <label className="text-sm font-medium">Warna utama
                <input className={`${inputClass} mt-1`} value={primaryColor} onChange={event => setPrimaryColor(event.target.value)} pattern="^#[0-9a-fA-F]{6}$" aria-describedby="color-help" />
                <span id="color-help" className="mt-1 block text-xs font-normal text-secondary">Format hex, seperti #0f766e.</span>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-default p-3 text-sm font-medium">
                <input type="checkbox" checked={aiEnabled} onChange={event => setAiEnabled(event.target.checked)} className="h-4 w-4 accent-teal-700" />
                Izinkan layanan AI untuk kampus ini
              </label>
              <label className="text-sm font-medium md:col-span-2">Kontak rujukan darurat (JSON)
                <textarea className={`${inputClass} mt-1 min-h-32 font-mono text-xs`} value={contactsText} onChange={event => setContactsText(event.target.value)} aria-describedby="contacts-help" />
                <span id="contacts-help" className="mt-1 block text-xs font-normal text-secondary">Setiap item berisi label dan boleh menyertakan phone atau url HTTPS.</span>
              </label>
              <div className="flex flex-wrap items-center gap-3 md:col-span-2">
                <button type="submit" disabled={saving} className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">{saving ? 'Menyimpan…' : 'Simpan pengaturan'}</button>
                {notice && <span className="text-sm text-teal-700 dark:text-teal-300" role="status">{notice}</span>}
                {error && <span className="text-sm text-red-700 dark:text-red-300" role="alert">{error}</span>}
              </div>
            </form>
            <p className="mt-4 text-xs text-secondary">Masa retensi saat ini: {campus?.retentionDays} hari. Perubahan retensi memerlukan persetujuan pemilik kebijakan data.</p>
          </section>
        </div>
      )}
    </main>
  );
};

export default CampusAdminPortal;
