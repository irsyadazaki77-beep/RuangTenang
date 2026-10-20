import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  PhoneCall,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Lock,
  User,
  Phone,
  Save,
  HeartHandshake,
} from "lucide-react";
import { EMERGENCY_CONTACTS, VERIFIED_HELPLINES } from '../lib/emergencyResources';
import { EmergencyContact, SOSDispatchStatus } from "../types";
import { useToast } from "./Toast";
import { apiClient } from "../lib/apiClient";
import { useAuth } from "../contexts/AuthContext";

interface CampusReferralContact {
  label: string;
  phone?: string;
  url?: string;
}

const createEmptyEmergencyContact = (): EmergencyContact => ({
  name: "",
  relationship: "",
  phone: "",
  whatsapp: "",
  hasConsent: false,
  consentDate: undefined,
});

export const EmergencyCenter: React.FC<{ onTriggerSOS?: () => void; onOpenPrivacyCenter?: () => void }> = ({
  onTriggerSOS,
  onOpenPrivacyCenter,
}) => {
  const { user } = useAuth();
  const canUseDigitalSOS = Boolean(user?.id && user.role !== 'guest');
  const { showToast } = useToast();
  const [sosStatus, setSosStatus] = useState<SOSDispatchStatus | null>(null);
  const [isTriggeringSOS, setIsTriggeringSOS] = useState(false);
  const [isContactLoading, setIsContactLoading] = useState(false);
  const [contactLoadError, setContactLoadError] = useState("");
  const [contactReloadKey, setContactReloadKey] = useState(0);
  const [shareLocation, setShareLocation] = useState(false);
  const [hotlineQuery, setHotlineQuery] = useState("");
  const [campusReferralContacts, setCampusReferralContacts] = useState<CampusReferralContact[]>([]);

  const [contact, setContact] = useState<EmergencyContact>(createEmptyEmergencyContact);

  const [isSavedSuccessfully, setIsSavedSuccessfully] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setContact(createEmptyEmergencyContact());
    setIsSavedSuccessfully(false);
    setSosStatus(null);
    setShareLocation(false);
    setContactLoadError("");

    const shouldLoadContact = Boolean(user?.id && user.role !== 'guest');
    setIsContactLoading(shouldLoadContact);
    if (!shouldLoadContact) return () => controller.abort();

    apiClient.get<any>('/api/v1/emergency-contact', { signal: controller.signal })
      .then(response => {
        if (!active) return;
        if (!response.success) {
          setContactLoadError(response.error || "Kontak darurat belum dapat dimuat.");
          return;
        }
        const data = response.data;
        if (data && !data.error && !data.code) {
          setContact({
            name: data.name || "",
            relationship: data.relationship || "",
            phone: data.phone || "",
            whatsapp: data.whatsapp || "",
            hasConsent: data.hasConsent ?? false,
            consentDate: data.consentDate || null
          });
        }
      })
      .catch(e => {
        if (active && !controller.signal.aborted) {
          console.warn("Failed to load emergency contact from backend:", e);
          setContactLoadError("Kontak darurat belum dapat dimuat. Periksa koneksi lalu coba lagi.");
        }
      })
      .finally(() => {
        if (active) setIsContactLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [user?.id, user?.role, contactReloadKey]);

  useEffect(() => {
    let cancelled = false;
    setCampusReferralContacts([]);
    if (!user?.campusId) return () => { cancelled = true; };
    apiClient.get<{ campus?: { referralContacts?: CampusReferralContact[] } }>('/api/v1/campuses/me')
      .then(response => {
        const contacts = response.data?.campus?.referralContacts;
        if (!cancelled && response.success && Array.isArray(contacts)) setCampusReferralContacts(contacts);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [user?.campusId]);

  const getCoordinates = (): Promise<{ latitude: number; longitude: number } | undefined> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        return resolve(undefined);
      }

      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        () => resolve(undefined),
        { timeout: 8000, maximumAge: 60000 }
      );
    });
  };
  const handleSendSOS = async () => {
    setIsTriggeringSOS(true);
    setSosStatus(null);
    onTriggerSOS?.();
    if (!navigator.onLine) {
      setSosStatus({
        success: false,
        dispatchId: "SOS-LOCAL-" + Date.now().toString().slice(-4),
        status: "DIRECT_CALL_ONLY",
        timestamp: new Date().toISOString(),
        hasUserConsent: false,
        message:
          "SOS digital tidak dapat dikirim karena perangkat sedang offline. Gunakan tombol Telepon Langsung untuk menghubungi bantuan.",
      });
      setIsTriggeringSOS(false);
      showToast("Koneksi offline. Silakan gunakan Telepon Langsung.", "warning");
      return;
    }

    try {
      const coords = shareLocation ? await getCoordinates() : undefined;
      const locationPayload = coords ? {
        latitude: coords.latitude,
        longitude: coords.longitude,
        address: `Koordinat: ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`
      } : undefined;

      const response = await apiClient.post<any>("/api/v1/sos/trigger", {
        location: locationPayload,
      });

      if (!response.success && !response.data) throw new Error(response.error || "Network response failure");
      const data = response.data || response;
      setSosStatus(data);
      if (data.status === 'SENT') {
        showToast("Permintaan SOS diterima oleh penyedia SMS/WA. Status penerimaan kontak belum dapat dipastikan.", "success");
      } else if (data.status === 'SIMULATED') {
        showToast("Sinyal SOS hanya dicatat dalam mode simulasi. Untuk dukungan psikologis buka Healing119; untuk darurat medis hubungi 119.", "info");
      } else if (data.status === 'CONSENT_REQUIRED') {
        showToast("Aktifkan izin SOS di Pusat Privasi sebelum mengirim sinyal digital.", "warning");
      } else if (data.status === 'CONTACT_MISSING') {
        showToast("Simpan kontak darurat terlebih dahulu.", "warning");
      } else if (data.status === 'COOLDOWN_ACTIVE' || data.status === 'RATE_LIMIT_EXCEEDED') {
        showToast(data.message || "Pengiriman SOS sementara dibatasi.", "warning");
      } else {
        showToast("Sinyal SOS gagal terkirim. Gunakan Healing119 untuk dukungan psikologis; untuk darurat medis hubungi 119 atau pergi ke IGD.", "error");
      }
    } catch (_e: any) {
      setSosStatus({
        success: false,
        dispatchId: "SOS-LOCAL-" + Date.now().toString().slice(-4),
        status: "DIRECT_CALL_ONLY",
        timestamp: new Date().toISOString(),
        hasUserConsent: false,
        message:
          "Tidak dapat terhubung ke server. Untuk dukungan psikologis buka healing119.id atau hubungi 119 ekstensi 8. Untuk darurat medis, hubungi 119 atau pergi ke fasilitas kesehatan terdekat.",
      });
      showToast("Sinyal SOS tidak terkirim. Gunakan Healing119 untuk dukungan psikologis; untuk darurat medis hubungi 119 atau pergi ke IGD.", "error");
    } finally {
      setIsTriggeringSOS(false);
    }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.post<any>('/api/v1/emergency-contact', contact);
      if (res.success) {
        setIsSavedSuccessfully(true);
        showToast("Kontak darurat berhasil diperbarui di server.", "success");
        setTimeout(() => setIsSavedSuccessfully(false), 3000);
      } else {
        showToast(res.error || "Gagal menyimpan kontak.", "error");
      }
    } catch (_err) {
      showToast("Gagal menyimpan kontak (koneksi bermasalah).", "error");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-3.5 sm:px-4 md:px-5 py-3.5 sm:py-4 md:py-5 space-y-3.5 sm:space-y-4 font-sans">
      {/* Alert Header */}
      <div className="surface-card rounded-xl p-3.5 sm:p-4 border border-rose-100/80 dark:border-rose-950/60 shadow-3xs flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4">
        <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200/50 dark:border-rose-900/60">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="text-center sm:text-left space-y-0.5 flex-1 min-w-0">
          <h2 className="font-bold text-primary text-base sm:text-lg tracking-tight">
            Bantuan Krisis Kesehatan Mental
          </h2>
          <p className="text-xs sm:text-sm text-secondary leading-relaxed max-w-2xl">
            Jika Anda atau kerabat berada dalam situasi krisis atau memerlukan pertolongan segera, hubungi kontak di bawah ini.
          </p>
        </div>
      </div>

      {/* Main 1-Click Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
        {/* ACTION CARD 1: DIRECT HOTLINE DIAL */}
        <div className="surface-card rounded-xl p-3.5 sm:p-4 flex flex-col justify-between space-y-3.5 group hover:shadow-xs border border-default shadow-3xs transition-all">
          <div className="space-y-1.5">
            <h2 className="text-sm sm:text-base font-bold text-primary">
              {EMERGENCY_CONTACTS[0].name}
            </h2>
            <p className="text-xs text-secondary leading-relaxed">
              {EMERGENCY_CONTACTS[0].description}
            </p>
          </div>
          <a
            href={EMERGENCY_CONTACTS[0].url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-3.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded-lg font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors border border-rose-200 dark:border-rose-900 cursor-pointer min-h-[44px] sm:min-h-[36px]"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Buka Healing119 (telepon / chat)</span>
          </a>
          <a href="tel:119" className="w-full py-2.5 px-3.5 surface-muted text-primary rounded-lg font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 border border-default cursor-pointer min-h-[44px] sm:min-h-[36px]">
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Telepon 119, lalu tekan 8</span>
          </a>
        </div>

        {/* ACTION CARD 2: INSTANT SOS SIGNAL */}
        <div className="surface-card rounded-xl p-3.5 sm:p-4 flex flex-col justify-between space-y-3.5 group hover:shadow-xs border border-default shadow-3xs transition-all">
          <div className="space-y-1.5">
            <h2 className="text-sm sm:text-base font-bold text-primary">
              Sinyal SOS ke Kontak Darurat
            </h2>
            <p className="text-xs text-secondary leading-relaxed">
              Kirim permintaan ke kontak pribadi tersimpan. Fitur ini memerlukan koneksi, kontak dan dua persetujuan aktif, serta penyedia pesan yang dikonfigurasi. Status diterima penyedia belum memastikan kontak menerima atau membaca pesan; untuk bantuan segera, gunakan layanan langsung di atas.
            </p>
          </div>

          <div className="space-y-2.5">
            <label className="flex items-start gap-2 text-[11px] text-secondary leading-relaxed">
              <input type="checkbox" checked={shareLocation} onChange={event => setShareLocation(event.target.checked)} className="mt-0.5 accent-rose-600" />
              <span>Bagikan lokasi perangkat saat ini bersama sinyal SOS. Lokasi hanya diminta setelah Anda memilih opsi ini.</span>
            </label>
            <button
              type="button"
              onClick={handleSendSOS}
              disabled={isTriggeringSOS}
              className="btn-danger w-full py-2.5 px-3.5 rounded-lg text-xs sm:text-sm flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[36px] disabled:opacity-50 cursor-pointer"
            >
              <ShieldAlert
                className={`w-3.5 h-3.5 ${isTriggeringSOS ? "animate-spin" : "text-white"}`}
              />
              <span>
                {isTriggeringSOS
                  ? "Mengirim..."
                  : "Kirim Sinyal Darurat"}
              </span>
            </button>

            {sosStatus && (
              <div role="status" aria-live="polite" className={`p-3 rounded-lg border text-xs space-y-1 animate-fade-in ${
                sosStatus.status === 'SENT'
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900 text-emerald-950 dark:text-emerald-200'
                : (sosStatus.status === 'SIMULATED' || sosStatus.status === 'DIRECT_CALL_ONLY' || sosStatus.status === 'GUEST_DIRECT_CALL_ONLY' || sosStatus.status === 'COOLDOWN_ACTIVE' || sosStatus.status === 'RATE_LIMIT_EXCEEDED')
                  ? 'bg-amber-50/80 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900 text-amber-950 dark:text-amber-200'
                  : 'bg-rose-50/70 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900 text-rose-950 dark:text-rose-200'
              }`}>
                <p className="font-semibold flex items-center gap-1.5">
                  {sosStatus.status === 'SENT' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="text-emerald-900 dark:text-emerald-200">Permintaan SOS Diterima Penyedia SMS/WA</span>
                    </>
                  ) : sosStatus.status === 'SIMULATED' ? (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="text-amber-900 dark:text-amber-200">Sinyal SOS Dicatat (Mode Simulasi Server)</span>
                    </>
                  ) : sosStatus.status === 'DIRECT_CALL_ONLY' ? (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="text-amber-900 dark:text-amber-200">Mode Telepon Langsung (Offline)</span>
                    </>
                  ) : sosStatus.status === 'GUEST_DIRECT_CALL_ONLY' ? (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span className="text-rose-900 dark:text-rose-200">Sesi Tamu: Gunakan Telepon Langsung</span>
                    </>
                  ) : sosStatus.status === 'CONSENT_REQUIRED' ? (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span className="text-rose-900 dark:text-rose-200">Izin SOS di Pusat Privasi Belum Aktif</span>
                    </>
                  ) : sosStatus.status === 'CONTACT_MISSING' ? (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span className="text-rose-900 dark:text-rose-200">Kontak Darurat Belum Tersimpan</span>
                    </>
                  ) : sosStatus.status === 'COOLDOWN_ACTIVE' || sosStatus.status === 'RATE_LIMIT_EXCEEDED' ? (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="text-amber-900 dark:text-amber-200">Pengiriman SOS Sementara Dibatasi</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span className="text-rose-900 dark:text-rose-200">Pengiriman SOS Terbatas / Gagal</span>
                    </>
                  )}
                </p>
                <p className="text-secondary leading-relaxed text-[11px]">
                  {sosStatus.status === 'SENT'
                    ? `${sosStatus.message} Status ini hanya mengonfirmasi permintaan diterima penyedia; aplikasi belum dapat memastikan kontak membaca atau menerima pesan.`
                    : sosStatus.message}
                </p>
                {sosStatus.status === 'CONSENT_REQUIRED' && onOpenPrivacyCenter && (
                  <button type="button" onClick={onOpenPrivacyCenter} className="min-h-9 rounded-md border border-rose-300 px-2.5 text-[11px] font-semibold text-rose-900 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:border-rose-800 dark:text-rose-200 dark:hover:bg-rose-950">
                    Buka Pusat Privasi
                  </button>
                )}
                <div className="text-[9.5px] text-secondary pt-0.5 flex justify-between">
                  <span>ID: {sosStatus.dispatchId}</span>
                  <span>
                    {new Date(sosStatus.timestamp).toLocaleTimeString("id-ID")}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid of Helpline Directory & Contact Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4">
        {/* LEFT/MAIN COLUMN: HELPLINE DIRECTORY (7 cols) */}
        <div className="lg:col-span-7 surface-card rounded-xl p-3.5 sm:p-4 space-y-3 border border-default shadow-3xs">
          {user?.campusId && (
            <section className="space-y-2 rounded-xl border border-teal-200 bg-teal-50/60 p-3 dark:border-teal-900 dark:bg-teal-950/30" aria-labelledby="campus-referrals-title">
              <div>
                <h3 id="campus-referrals-title" className="text-xs font-bold text-primary">Kontak rujukan kampus</h3>
                <p className="mt-0.5 text-xs text-secondary">Kontak yang dikonfigurasi kampus Anda. Untuk darurat medis, hubungi 119 atau fasilitas kesehatan terdekat.</p>
              </div>
              {campusReferralContacts.length > 0 ? (
                <ul className="space-y-1.5">
                  {campusReferralContacts.map((item, index) => (
                    <li key={`${item.label}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface p-2.5 text-xs">
                      <span className="font-medium">{item.label}</span>
                      {(item.url || item.phone) && (
                        <a
                          href={item.url || `tel:${(item.phone || '').replace(/[^\d+]/g, '')}`}
                          target={item.url ? '_blank' : undefined}
                          rel={item.url ? 'noopener noreferrer' : undefined}
                          className="font-semibold text-teal-700 underline underline-offset-2 dark:text-teal-300"
                        >
                          {item.url ? 'Buka layanan' : item.phone}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-secondary">Belum ada kontak rujukan kampus yang dikonfigurasi.</p>
              )}
            </section>
          )}
          <div className="space-y-0.5">
            <h2 className="text-xs sm:text-sm font-bold text-primary flex items-center gap-1.5">
              <HeartHandshake className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              Direktori Bantuan Khusus & Kampus
            </h2>
            <p className="text-xs text-secondary">
              Kanal bantuan resmi yang telah diperiksa. Untuk Healing119, panggil 119 ekstensi 8 atau buka situsnya untuk memulai layanan suara/chat.
            </p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama kampus atau layanan bantuan..."
              value={hotlineQuery}
              onChange={(e) => setHotlineQuery(e.target.value)}
              className="w-full surface-muted border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3.5 py-1.5 text-base sm:text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-teal-600 transition-all min-h-[44px] sm:min-h-[36px]"
            />
          </div>

          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
            {VERIFIED_HELPLINES.filter(
              (h) =>
                h.name.toLowerCase().includes(hotlineQuery.toLowerCase()) ||
                h.type.toLowerCase().includes(hotlineQuery.toLowerCase()),
            ).length > 0 ? (
              VERIFIED_HELPLINES.filter(
                (h) =>
                  h.name.toLowerCase().includes(hotlineQuery.toLowerCase()) ||
                  h.type.toLowerCase().includes(hotlineQuery.toLowerCase()),
              ).map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 sm:p-3 bg-slate-50/80 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 hover:border-teal-300 dark:hover:border-teal-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9.5px] font-semibold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/80 px-1.5 py-0.5 rounded border border-teal-200/80 dark:border-teal-900">
                        {item.type}
                      </span>
                    </div>
                    <h3 className="font-semibold text-primary text-xs sm:text-sm truncate">
                      {item.name}
                    </h3>
                    <p className="text-[10.5px] text-secondary flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" /> {item.jamOperasional}
                    </p>
                  </div>
                  <a
                    href={item.url || `tel:${item.number.replace(/\D/g, "")}`}
                    target={item.url ? "_blank" : undefined}
                    rel={item.url ? "noopener noreferrer" : undefined}
                    className="w-full sm:w-auto px-3 py-2 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-semibold text-xs rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer min-h-[44px] sm:min-h-[34px] border border-rose-200 dark:border-rose-900 shrink-0"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>{item.url ? `Buka layanan (${item.number})` : `Telepon (${item.number})`}</span>
                  </a>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-muted text-xs">
                Tidak ada bantuan khusus yang cocok dengan kata kunci pencarian.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: EMERGENCY CONTACT MANAGER (5 cols) */}
        <div className="lg:col-span-5 surface-card rounded-xl p-3.5 sm:p-4 flex flex-col justify-between space-y-3 border border-default shadow-3xs">
          <div className="space-y-0.5">
            <h2 className="text-xs sm:text-sm font-bold text-primary flex items-center gap-1.5">
              <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              Kontak Darurat Pribadi
            </h2>
            <p className="text-xs text-secondary">
              Simpan kontak kerabat atau sahabat yang dapat menerima permintaan SOS melalui penyedia pesan yang dikonfigurasi.
            </p>
          </div>

          {isContactLoading && <p role="status" className="text-xs text-secondary">Memuat kontak darurat…</p>}
          {contactLoadError && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
              <span>{contactLoadError}</span>
              <button type="button" onClick={() => setContactReloadKey(value => value + 1)} className="min-h-9 rounded-md border border-amber-400 px-2.5 font-semibold hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:border-amber-800 dark:hover:bg-amber-950">Muat ulang</button>
            </div>
          )}
          {user?.role === 'guest' && <p className="text-xs text-secondary">Sesi tamu dapat memakai bantuan langsung; menyimpan kontak dan mengirim SOS digital memerlukan akun.</p>}

          <form onSubmit={handleSaveContact} className="space-y-2.5">
            <div className="space-y-1">
              <label htmlFor="emergency-contact-name" className="block text-xs font-semibold text-secondary">
                Nama Orang Terdekat:
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="emergency-contact-name"
                  type="text"
                  required
                  disabled={!canUseDigitalSOS || isContactLoading}
                  value={contact.name}
                  onChange={(e) =>
                    setContact({ ...contact, name: e.target.value })
                  }
                  className="w-full surface-muted border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-base sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-teal-600 min-h-[44px] sm:min-h-[36px]"
                  placeholder="Contoh: Ibu"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="emergency-contact-rel" className="block text-xs font-semibold text-secondary">
                Hubungan / Relasi:
              </label>
              <select
                id="emergency-contact-rel"
                disabled={!canUseDigitalSOS || isContactLoading}
                value={contact.relationship}
                onChange={(e) =>
                  setContact({ ...contact, relationship: e.target.value })
                }
                className="w-full surface-muted border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-base sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-teal-600 min-h-[44px] sm:min-h-[36px]"
              >
                <option value="">-- Pilih Hubungan --</option>
                <option value="Orang Tua">Orang Tua (Ayah / Ibu)</option>
                <option value="Saudara Kandung">Saudara Kandung</option>
                <option value="Wali / Kerabat">Wali / Kerabat Kampus</option>
                <option value="Sahabat Dekat">Sahabat Dekat / Teman Kos</option>
                <option value="Pasangan">Pasangan / Pendamping</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="emergency-contact-phone" className="block text-xs font-semibold text-secondary">
                Nomor HP / WhatsApp:
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="emergency-contact-phone"
                  type="tel"
                  inputMode="tel"
                  required
                  disabled={!canUseDigitalSOS || isContactLoading}
                  value={contact.phone}
                  onChange={(e) =>
                    setContact({ ...contact, phone: e.target.value })
                  }
                  className="w-full surface-muted border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-base sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-teal-600 font-mono min-h-[44px] sm:min-h-[36px]"
                  placeholder="Contoh: 081234567890"
                />
              </div>
            </div>

            <div className="flex items-start gap-2 pt-0.5 pb-1">
              <input
                type="checkbox"
                id="hasConsent"
                disabled={!canUseDigitalSOS || isContactLoading}
                checked={contact.hasConsent}
                onChange={(e) =>
                  setContact({
                    ...contact,
                    hasConsent: e.target.checked,
                    consentDate: e.target.checked ? new Date().toLocaleDateString("id-ID") : null
                  })
                }
                className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <label htmlFor="hasConsent" className="text-xs text-secondary leading-relaxed select-none cursor-pointer">
                Saya memberikan persetujuan (consent) untuk menghubungi kontak darurat ini secara otomatis jika saya memicu sinyal SOS.
              </label>
            </div>
            <p className="text-[10.5px] text-secondary leading-relaxed">
              Pengiriman SOS juga memerlukan izin aktif di Pusat Privasi. Saat disimpan, kontak dan persetujuan ini tersimpan di server akun Anda.
            </p>

            <button
              type="submit"
              disabled={!canUseDigitalSOS || isContactLoading}
              className="w-full py-2.5 px-3.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs sm:text-sm rounded-lg shadow-3xs transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] sm:min-h-[36px] border-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-3.5 h-3.5" />
              <span>
                {isSavedSuccessfully ? "Tersimpan!" : "Simpan Kontak Darurat"}
              </span>
            </button>
          </form>

          {/* Privacy Notice */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-[10.5px] text-secondary">
            <Lock className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>
              Seluruh data kontak darurat terenkripsi aman & dilindungi hak privasi.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
