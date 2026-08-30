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

const EMERGENCY_CONTACT_KEY = "ruangtenang_emergency_contact";

export const EmergencyCenter: React.FC<EmergencyCenterProps> = ({
  onTriggerSOS,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [sosStatus, setSosStatus] = useState<SOSDispatchStatus | null>(null);
  const [isTriggeringSOS, setIsTriggeringSOS] = useState(false);
  const [hotlineQuery, setHotlineQuery] = useState("");

  const [contact, setContact] = useState<EmergencyContact>({
    name: "Ibu / Ayah / Sahabat",
    relationship: "Orang Tua",
    phone: "0812-9988-7766",
    whatsapp: "6281299887766",
    hasConsent: true,
    consentDate: new Date().toLocaleDateString("id-ID"),
  });

  const [isSavedSuccessfully, setIsSavedSuccessfully] = useState(false);

  useEffect(() => {
    apiClient.get<any>('/api/v1/emergency-contact')
      .then(res => {
        const data = res.data;
        if (data && !data.error && !data.code) {
          setContact({
            name: data.name || "Ibu / Ayah / Sahabat",
            relationship: data.relationship || "Orang Tua",
            phone: data.phone || "0812-9988-7766",
            whatsapp: data.whatsapp || "6281299887766",
            hasConsent: data.hasConsent ?? true,
            consentDate: data.consentDate || new Date().toLocaleDateString("id-ID")
          });
        }
      })
      .catch(e => console.warn("Failed to load emergency contact from backend:", e));
  }, []);

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
          "Koneksi luring. Silakan lakukan panggilan telepon seluler langsung ke nomor " + EMERGENCY_CONTACTS[0].phone + ".",
      });
      setIsTriggeringSOS(false);
      showToast("Sinyal SOS diaktifkan secara lokal (Luring).", "warning");
      return;
    }

    try {
      const response = await apiClient.post<any>("/api/v1/sos/trigger", {
        emergencyContact: contact ? {
          name: contact.name,
          phone: contact.phone,
          relationship: contact.relationship,
        } : undefined,
        hasUserConsent: contact.hasConsent,
        studentName: user?.name || "Mahasiswa",
        location: {
          address: "Kampus / Kos",
        },
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
    } catch (e) {
      setSosStatus({
        success: false,
        dispatchId: "SOS-LOCAL-" + Date.now().toString().slice(-4),
        status: "DIRECT_CALL_ONLY",
        timestamp: new Date().toISOString(),
        hasUserConsent: contact.hasConsent,
        message:
          "Tidak dapat terhubung ke server. Hubungi nomor " + EMERGENCY_CONTACTS[0].phone + " atau hotline 119 secara langsung.",
      });
      showToast("Gagal menghubungi gateway SOS. Hubungi bantuan darurat langsung.", "error");
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
    <div className="max-w-5xl mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-6 font-sans">
      {/* Alert Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-rose-100/80 dark:border-rose-950/60 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200/50 dark:border-rose-900/60">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="text-center sm:text-left space-y-1 flex-1 min-w-0">
          <h1 className="font-bold text-slate-900 dark:text-slate-100 text-lg sm:text-xl tracking-tight">
            Layanan Bantuan Darurat & Krisis (24 Jam)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
            Jika Anda atau kerabat berada dalam situasi krisis atau memerlukan pertolongan segera, hubungi kontak di bawah ini. Layanan darurat aktif 24 jam.
          </p>
        </div>
      </div>

      {/* Main 1-Click Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {/* ACTION CARD 1: DIRECT HOTLINE DIAL */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-5 group hover:shadow-md transition-all">
          <div className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              {EMERGENCY_CONTACTS[0].name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {EMERGENCY_CONTACTS[0].description}
            </p>
          </div>
          <a
            href={EMERGENCY_CONTACTS[0].url}
            className="w-full py-3.5 px-4 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded-2xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors border border-rose-200 dark:border-rose-900 cursor-pointer min-h-[44px]"
          >
            <Phone className="w-4 h-4" />
            <span>Telepon Langsung {EMERGENCY_CONTACTS[0].phone}</span>
          </a>
        </div>

        {/* ACTION CARD 2: INSTANT SOS SIGNAL */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-5 group hover:shadow-md transition-all">
          <div className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              Sinyal Pesan Darurat ke Kampus / Wali
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Kirimkan pemberitahuan instan otomatis kepada kontak darurat pribadi yang telah Anda simpan di profil Anda.
            </p>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleSendSOS}
              disabled={isTriggeringSOS}
              className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-700 text-white font-semibold text-xs sm:text-sm rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px] disabled:opacity-50"
            >
              <ShieldAlert
                className={`w-4 h-4 ${isTriggeringSOS ? "animate-spin" : "text-rose-400 dark:text-rose-200"}`}
              />
              <span>
                {isTriggeringSOS
                  ? "Mengirim Sinyal SOS..."
                  : "Picu Sinyal SOS Digital"}
              </span>
            </button>

            {sosStatus && (
              <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 animate-fade-in ${
                sosStatus.status === 'SENT' 
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900 text-emerald-950 dark:text-emerald-200'
                  : sosStatus.status === 'SIMULATED'
                  ? 'bg-amber-50/80 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900 text-amber-950 dark:text-amber-200'
                  : 'bg-rose-50/70 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900 text-rose-950 dark:text-rose-200'
              }`}>
                <p className="font-semibold flex items-center gap-1.5">
                  {sosStatus.status === 'SENT' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-emerald-900 dark:text-emerald-200">Sinyal SOS Berhasil Terkirim (SMS/WA)</span>
                    </>
                  ) : sosStatus.status === 'SIMULATED' ? (
                    <>
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="text-amber-900 dark:text-amber-200">Sinyal SOS Dicatat (Mode Simulasi Server)</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="text-rose-900 dark:text-rose-200">Pengiriman SOS Terbatas / Gagal</span>
                    </>
                  )}
                </p>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-xs">
                  {sosStatus.message}
                </p>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 pt-1 flex justify-between">
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* LEFT/MAIN COLUMN: HELPLINE DIRECTORY (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <HeartHandshake className="w-4.5 h-4.5 text-teal-600 dark:text-teal-400" />
              Direktori Bantuan Khusus & Kampus
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Temukan nomor darurat krisis internal berbagai universitas dan hotline psikologis tepercaya.
            </p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Cari nama kampus atau layanan (UI, ITB, UGM, LISA)..."
              value={hotlineQuery}
              onChange={(e) => setHotlineQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-teal-600 transition-all min-h-[40px]"
            />
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
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
                  className="p-3 sm:p-3.5 bg-slate-50/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 hover:border-teal-300 dark:hover:border-teal-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/80 px-2 py-0.5 rounded-md border border-teal-200/80 dark:border-teal-900">
                        {item.type}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-xs sm:text-sm truncate">
                      {item.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" /> {item.jamOperasional}
                    </p>
                  </div>
                  <a
                    href={`tel:${item.number.replace(/\D/g, "")}`}
                    className="w-full sm:w-auto px-3 py-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[38px] border border-rose-200 dark:border-rose-900 shrink-0"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Telepon ({item.number})</span>
                  </a>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">
                Tidak ada bantuan khusus yang cocok dengan kata kunci pencarian.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: EMERGENCY CONTACT MANAGER (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 shadow-xs border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <User className="w-4.5 h-4.5 text-teal-600 dark:text-teal-400" />
              Kontak Darurat Pribadi
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Konfigurasikan kontak kerabat terdekat atau sahabat pilihan Anda untuk notifikasi SOS instan.
            </p>
          </div>

          <form onSubmit={handleSaveContact} className="space-y-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nama Orang Terdekat:
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={contact.name}
                  onChange={(e) =>
                    setContact({ ...contact, name: e.target.value })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3.5 py-1.5 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-teal-600 min-h-[38px]"
                  placeholder="Nama wali / sahabat"
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
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-teal-600 min-h-[38px]"
              >
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
                <Phone className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={contact.phone}
                  onChange={(e) =>
                    setContact({ ...contact, phone: e.target.value })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3.5 py-1.5 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-teal-600 font-mono min-h-[38px]"
                  placeholder="Contoh: 0812-xxxx-xxxx"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px] border-none"
            >
              <Save className="w-4 h-4" />
              <span>
                {isSavedSuccessfully ? "Tersimpan!" : "Simpan Kontak Darurat"}
              </span>
            </button>
          </form>

          {/* Privacy Notice */}
          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <Lock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>
              Seluruh data kontak darurat terenkripsi aman & dilindungi hak privasi.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
