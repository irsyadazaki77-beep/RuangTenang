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

interface EmergencyCenterProps {
  onTriggerSOS?: () => void;
}

export const EmergencyCenter: React.FC<EmergencyCenterProps> = ({
  onTriggerSOS,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [sosStatus, setSosStatus] = useState<SOSDispatchStatus | null>(null);
  const [isTriggeringSOS, setIsTriggeringSOS] = useState(false);
  const [hotlineQuery, setHotlineQuery] = useState("");

  const [contact, setContact] = useState<EmergencyContact>({
    name: "",
    relationship: "",
    phone: "",
    whatsapp: "",
    hasConsent: false,
    consentDate: null,
  });

  const [isSavedSuccessfully, setIsSavedSuccessfully] = useState(false);

  useEffect(() => {
    apiClient.get<any>('/api/v1/emergency-contact')
      .then(res => {
        const data = res.data;
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
      .catch(e => console.warn("Failed to load emergency contact from backend:", e));
  }, []);

  const getCoordinates = (): Promise<{ latitude: number; longitude: number } | undefined> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        return resolve(undefined);
      }
      
      navigator.permissions.query({ name: "geolocation" as any }).then((perm) => {
        if (perm.state === "granted") {
          navigator.geolocation.getCurrentPosition(
            (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
            () => resolve(undefined),
            { timeout: 2000, maximumAge: 60000 }
          );
        } else {
          resolve(undefined);
        }
      }).catch(() => resolve(undefined));
    });
  };
  const handleSendSOS = async () => {
    setIsTriggeringSOS(true);
    setSosStatus(null);
    if (onTriggerSOS) {
      onTriggerSOS();
    }

    if (!navigator.onLine) {
      setSosStatus({
        success: false,
        dispatchId: "SOS-LOCAL-" + Date.now().toString().slice(-4),
        status: "DIRECT_CALL_ONLY",
        timestamp: new Date().toISOString(),
        hasUserConsent: contact.hasConsent,
        message:
          "SOS digital tidak dapat dikirim karena perangkat sedang offline. Gunakan tombol Telepon Langsung untuk menghubungi bantuan.",
      });
      setIsTriggeringSOS(false);
      showToast("Koneksi offline. Silakan gunakan Telepon Langsung.", "warning");
      return;
    }

    try {
      const coords = await getCoordinates();
      const locationPayload = coords ? {
        latitude: coords.latitude,
        longitude: coords.longitude,
        address: `Koordinat: ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`
      } : undefined;

      const response = await apiClient.post<any>("/api/v1/sos/trigger", {
        emergencyContact: contact && contact.name && contact.phone ? {
          name: contact.name,
          phone: contact.phone,
          relationship: contact.relationship,
        } : undefined,
        hasUserConsent: contact.hasConsent,
        studentName: user?.name || "Mahasiswa",
        location: locationPayload,
      });

      if (!response.success && !response.data) throw new Error(response.error || "Network response failure");
      const data = response.data || response;
      setSosStatus(data);
      if (data.status === 'SENT') {
        showToast("Sinyal SOS darurat berhasil dikirim via SMS/WA!", "success");
      } else if (data.status === 'SIMULATED') {
        showToast("Sinyal SOS dicatat di server (Mode Simulasi). Hubungi hotline 119 bila mendesak.", "info");
      } else {
        showToast("Sinyal SOS gagal terkirim. Segera hubungi hotline darurat 119.", "error");
      }
    } catch (e: any) {
      setSosStatus({
        success: false,
        dispatchId: "SOS-LOCAL-" + Date.now().toString().slice(-4),
        status: "DIRECT_CALL_ONLY",
        timestamp: new Date().toISOString(),
        hasUserConsent: contact.hasConsent,
        message:
          "Tidak dapat terhubung ke server. Hubungi nomor " + EMERGENCY_CONTACTS[0].phone + " atau hotline 119 secara langsung.",
      });
      showToast("Panggilan SOS gagal karena masalah jaringan. Silakan hubungi darurat manual.", "error");
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
    } catch (err) {
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
            Pusat Krisis (24 Jam)
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
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              {EMERGENCY_CONTACTS[0].name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {EMERGENCY_CONTACTS[0].description}
            </p>
          </div>
          <a
            href={EMERGENCY_CONTACTS[0].url}
            className="w-full py-2.5 px-3.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded-lg font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors border border-rose-200 dark:border-rose-900 cursor-pointer min-h-[38px] sm:min-h-[36px]"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Telepon Langsung {EMERGENCY_CONTACTS[0].phone}</span>
          </a>
        </div>

        {/* ACTION CARD 2: INSTANT SOS SIGNAL */}
        <div className="surface-card rounded-xl p-3.5 sm:p-4 flex flex-col justify-between space-y-3.5 group hover:shadow-xs border border-default shadow-3xs transition-all">
          <div className="space-y-1.5">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              Sinyal Pesan Darurat ke Kampus / Wali
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Kirimkan pemberitahuan instan otomatis kepada kontak darurat pribadi yang telah Anda simpan di profil Anda.
            </p>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleSendSOS}
              disabled={isTriggeringSOS}
              className="btn-danger w-full py-2.5 px-3.5 rounded-lg text-xs sm:text-sm flex items-center justify-center gap-2 min-h-[38px] sm:min-h-[36px] disabled:opacity-50"
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
              <div className={`p-3 rounded-lg border text-xs space-y-1 animate-fade-in ${
                sosStatus.status === 'SENT' 
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900 text-emerald-950 dark:text-emerald-200'
                  : (sosStatus.status === 'SIMULATED' || sosStatus.status === 'DIRECT_CALL_ONLY')
                  ? 'bg-amber-50/80 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900 text-amber-950 dark:text-amber-200'
                  : 'bg-rose-50/70 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900 text-rose-950 dark:text-rose-200'
              }`}>
                <p className="font-semibold flex items-center gap-1.5">
                  {sosStatus.status === 'SENT' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="text-emerald-900 dark:text-emerald-200">Sinyal SOS Berhasil Terkirim (SMS/WA)</span>
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
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span className="text-rose-900 dark:text-rose-200">Pengiriman SOS Terbatas / Gagal</span>
                    </>
                  )}
                </p>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">
                  {sosStatus.message}
                </p>
                <div className="text-[9.5px] text-slate-500 dark:text-slate-400 pt-0.5 flex justify-between">
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
          <div className="space-y-0.5">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <HeartHandshake className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              Direktori Bantuan Khusus & Kampus
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Temukan nomor darurat krisis internal berbagai universitas dan hotline psikologis tepercaya.
            </p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama kampus atau layanan (UI, ITB, UGM, LISA)..."
              value={hotlineQuery}
              onChange={(e) => setHotlineQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-teal-600 transition-all min-h-[38px] sm:min-h-[36px]"
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
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-xs sm:text-sm truncate">
                      {item.name}
                    </h3>
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" /> {item.jamOperasional}
                    </p>
                  </div>
                  <a
                    href={`tel:${item.number.replace(/\D/g, "")}`}
                    className="w-full sm:w-auto px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-semibold text-xs rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer min-h-[34px] border border-rose-200 dark:border-rose-900 shrink-0"
                  >
                    <PhoneCall className="w-3 h-3" />
                    <span>Telepon ({item.number})</span>
                  </a>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs">
                Tidak ada bantuan khusus yang cocok dengan kata kunci pencarian.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: EMERGENCY CONTACT MANAGER (5 cols) */}
        <div className="lg:col-span-5 surface-card rounded-xl p-3.5 sm:p-4 flex flex-col justify-between space-y-3 border border-default shadow-3xs">
          <div className="space-y-0.5">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              Kontak Darurat Pribadi
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Konfigurasikan kontak kerabat terdekat atau sahabat pilihan Anda untuk notifikasi SOS instan.
            </p>
          </div>

          <form onSubmit={handleSaveContact} className="space-y-2.5">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nama Orang Terdekat:
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={contact.name}
                  onChange={(e) =>
                    setContact({ ...contact, name: e.target.value })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-teal-600 min-h-[36px]"
                  placeholder="Contoh: Ibu"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Hubungan / Relasi:
              </label>
              <select
                value={contact.relationship}
                onChange={(e) =>
                  setContact({ ...contact, relationship: e.target.value })
                }
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-teal-600 min-h-[36px]"
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nomor HP / WhatsApp:
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={contact.phone}
                  onChange={(e) =>
                    setContact({ ...contact, phone: e.target.value })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-teal-600 font-mono min-h-[36px]"
                  placeholder="Contoh: 081234567890"
                />
              </div>
            </div>

            <div className="flex items-start gap-2 pt-0.5 pb-1">
              <input
                type="checkbox"
                id="hasConsent"
                checked={contact.hasConsent}
                onChange={(e) =>
                  setContact({
                    ...contact,
                    hasConsent: e.target.checked,
                    consentDate: e.target.checked ? new Date().toLocaleDateString("id-ID") : null
                  })
                }
                className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <label htmlFor="hasConsent" className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed select-none">
                Saya memberikan persetujuan (consent) untuk menghubungi kontak darurat ini secara otomatis jika saya memicu sinyal SOS.
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-2 px-3.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg shadow-3xs transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px] border-none"
            >
              <Save className="w-3.5 h-3.5" />
              <span>
                {isSavedSuccessfully ? "Tersimpan!" : "Simpan Kontak Darurat"}
              </span>
            </button>
          </form>

          {/* Privacy Notice */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-[10.5px] text-slate-500 dark:text-slate-400">
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
