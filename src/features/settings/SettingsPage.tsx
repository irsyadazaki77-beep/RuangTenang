import { useEscapeKey } from '../../hooks/useEscapeKey';
import React, { useState, useEffect } from 'react';
import { Settings, User,
  HeartPulse,
  ShieldCheck,
  CreditCard,
  Check,
  Sparkles,
  Zap,
  RotateCcw,
  ShieldAlert,
  HelpCircle,
  Clock,
  UserCheck,
  Terminal,
  KeyRound,
  Lock,
  X,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { UserSession, ScreeningResult, SubscriptionTier } from '../../types';
import { Brain, MessageSquare, Gauge, Cpu, CheckCircle2 } from 'lucide-react';
import { DEFAULT_AI_MODEL_ID, AVAILABLE_AI_MODELS } from '../../lib/aiModels';
import { safeLocalStorage } from '../../lib/storage';
import { AiQuotaBadge } from '../../components/AiQuotaBadge';
import { apiClient } from '../../lib/apiClient';

interface SettingsPageProps {
  userSession: UserSession | null;
  setUserSession: (session: UserSession) => void;
  onOpenScreening: () => void;
  onOpenLegal: () => void;
  onOpenPrivacyCenter?: () => void;
  onOpenAuth?: () => void;
  screeningResult?: ScreeningResult | null;
}

const DEFAULT_GUEST_USER: UserSession = {
  id: 'guest',
  name: 'Tamu / Belum Masuk',
  email: 'tamu@ruangtenang.id',
  role: 'guest',
  tier: 'Free',
  usageStats: { chatMessagesSent: 0, appointmentsBooked: 0 }
};

export const SettingsPage: React.FC<SettingsPageProps> = ({
  userSession,
  setUserSession,
  onOpenScreening,
  onOpenLegal,
  onOpenPrivacyCenter,
  onOpenAuth,
  screeningResult
}) => {
  const safeUser = userSession || DEFAULT_GUEST_USER;
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDevModal, setShowDevModal] = useState(false);
  useEscapeKey(() => setShowDevModal(false), showDevModal);
  const [devPassword, setDevPassword] = useState('');
  const [devError, setDevError] = useState<string | null>(null);

  const [aiModel, setAiModel] = useState(() => safeLocalStorage.getItem('aiModel') || DEFAULT_AI_MODEL_ID);
  const [responseStyle, setResponseStyle] = useState(() => safeLocalStorage.getItem('responseStyle') || 'Seimbang');

  const handleSelectAiModel = (modelId: string) => {
    setAiModel(modelId);
    safeLocalStorage.setItem('aiModel', modelId);
    setSuccessMsg(`Model AI berhasil diubah ke ${AVAILABLE_AI_MODELS.find(m => m.id === modelId)?.name || modelId}.`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleSelectResponseStyle = (style: string) => {
    setResponseStyle(style);
    safeLocalStorage.setItem('responseStyle', style);
    setSuccessMsg(`Gaya respons AI diperbarui ke ${style}.`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const [usageStats, setUsageStats] = useState<{
    dailyLimit: number;
    dailyUsage: number;
    userTier: string;
  } | null>(null);

  // Security & Sessions State
  const [sessions, setSessions] = useState<any[]>([]);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [secTab, setSecTab] = useState<'sessions' | 'history' | 'password'>('sessions');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secMsg, setSecMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSecurityData = async () => {
    if (safeUser.id === 'guest') return;
    try {
      // Active Sessions
      const resSess = await apiClient.get<any>('/api/v1/auth/sessions');
      if (resSess.success && resSess.data) {
        setSessions(resSess.data.sessions || []);
      }

      // Login History
      const resHist = await apiClient.get<any>('/api/v1/auth/login-history');
      if (resHist.success && resHist.data) {
        setLoginHistory(resHist.data.history || []);
      }
    } catch (err) {
      console.error('Error loading security info:', err);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, [safeUser.id]);

  const handleRevokeSession = async (sessionId: string) => {
    try {
      setSecMsg(null);
      const res = await apiClient.post<any>('/api/v1/auth/sessions/revoke', { sessionId });
      if (res.success) {
        setSecMsg({ type: 'success', text: 'Sesi perangkat berhasil dicabut.' });
        fetchSecurityData();
      } else {
        setSecMsg({ type: 'error', text: res.error || 'Gagal mencabut sesi.' });
      }
    } catch (err) {
      setSecMsg({ type: 'error', text: 'Koneksi gagal.' });
    }
  };

  const handleLogoutAllDevices = async () => {
    try {
      setSecMsg(null);
      const res = await apiClient.post<any>('/api/v1/auth/logout-all', {});
      if (res.success) {
        setSecMsg({ type: 'success', text: 'Seluruh sesi perangkat telah berhasil dicabut.' });
        fetchSecurityData();
      } else {
        setSecMsg({ type: 'error', text: res.error || 'Gagal mencabut seluruh sesi.' });
      }
    } catch (err) {
      setSecMsg({ type: 'error', text: 'Koneksi gagal.' });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecMsg(null);

    if (newPassword !== confirmPassword) {
      setSecMsg({ type: 'error', text: 'Konfirmasi kata sandi baru tidak cocok.' });
      return;
    }

    if (newPassword.length < 10) {
      setSecMsg({ type: 'error', text: 'Kata sandi baru minimal 10 karakter.' });
      return;
    }

    try {
      const res = await apiClient.post<any>('/api/v1/auth/change-password', { currentPassword, newPassword });
      if (res.success) {
        setSecMsg({ type: 'success', text: 'Kata sandi berhasil diperbarui. Seluruh sesi lain telah dicabut.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        fetchSecurityData();
      } else {
        setSecMsg({ type: 'error', text: res.error || 'Gagal mengubah kata sandi.' });
      }
    } catch (err) {
      setSecMsg({ type: 'error', text: 'Koneksi gagal.' });
    }
  };

  const fetchUsage = async () => {
    try {
      const res = await apiClient.get<any>(`/api/v1/user/usage-stats?userId=${safeUser.id}&userTier=${safeUser.tier}`);
      if (res.success && res.data) {
        const data = res.data;
        setUsageStats({
          dailyLimit: data.dailyLimit,
          dailyUsage: data.dailyUsage,
          userTier: data.userTier || safeUser.tier
        });
      }
    } catch (err) {
      console.error('Error fetching usage stats in settings:', err);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, [safeUser.tier]);

  const handleSelectTier = async (selectedTier: SubscriptionTier, password?: string) => {
    if (selectedTier === 'Developer' && !password) {
      setDevPassword('');
      setDevError(null);
      setShowDevModal(true);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setDevError(null);

    try {
      const response = await apiClient.post<any>('/api/v1/auth/update-tier', { tier: selectedTier, password });

      if (response.success) {
        setUserSession({
          ...safeUser,
          tier: selectedTier
        });
        setSuccessMsg(
          selectedTier === 'Developer'
            ? 'Mode Developer Aktif! Anda mendapatkan akses Tanpa Limit (Unlimited chat).'
            : selectedTier === 'Pro'
            ? 'Selamat! Paket Anda beralih ke Pendamping Pro (100 pesan/hari).'
            : 'Paket beralih ke Standard (25 pesan/hari).'
        );
        setShowDevModal(false);
        setDevPassword('');
        fetchUsage();
      } else {
        if (selectedTier === 'Developer') {
          setDevError(response.error || 'Password Developer salah!');
        } else {
          setErrorMsg(response.error || 'Gagal mengubah paket.');
        }
      }
    } catch (err) {
      setErrorMsg('Koneksi ke server gagal.');
    } finally {
      setLoading(false);
      setTimeout(() => setSuccessMsg(null), 5000);
    }
  };

  const [activeTab, setActiveTab] = useState<'akun'|'ai'|'privasi'|'memory'|'keamanan'|'langganan'>('akun');
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  
  const TABS = [
    { id: 'akun', label: 'Akun', icon: User },
    { id: 'ai', label: 'Preferensi AI', icon: Brain },
    { id: 'privasi', label: 'Privasi', icon: ShieldCheck },
    { id: 'memory', label: 'Memory', icon: RotateCcw },
    { id: 'keamanan', label: 'Keamanan', icon: Lock },
    { id: 'langganan', label: 'Langganan', icon: CreditCard }
  ] as const;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 min-w-0 flex flex-col md:flex-row gap-6 lg:gap-8 h-full">
      
      {/* Sidebar Tabs for Desktop & Menu List for Mobile */}
      <div className={`w-full md:w-64 shrink-0 flex flex-col gap-2 ${showMobileDetail ? 'hidden md:flex' : 'flex'}`}>
        <h2 className="text-lg font-bold text-slate-800 mb-2 px-2 hidden md:block">Pengaturan</h2>
        <div className="flex flex-col gap-1.5 md:gap-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setShowMobileDetail(true);
                }}
                className={`flex items-center justify-between md:justify-start gap-3 px-4 py-3 sm:py-3.5 md:py-2.5 rounded-xl text-sm font-medium transition-colors border border-transparent cursor-pointer ${
                  activeTab === tab.id 
                    ? 'bg-teal-50 text-teal-700 md:bg-teal-50 md:text-teal-700' 
                    : 'text-slate-600 hover:bg-slate-50 bg-slate-50/50 md:bg-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-5 h-5 shrink-0 ${activeTab === tab.id ? 'text-teal-600' : 'text-slate-400'}`} />
                  <span className="truncate">{tab.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 md:hidden shrink-0" />
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 min-w-0 space-y-6 pb-20 ${!showMobileDetail ? 'hidden md:block' : 'block'}`}>
        {/* Mobile Back Button */}
        {showMobileDetail && (
          <button 
            onClick={() => setShowMobileDetail(false)} 
            className="md:hidden flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-teal-600 hover:text-teal-700 px-3 py-2 mb-2 rounded-lg bg-teal-50 hover:bg-teal-100 cursor-pointer transition-all self-start"
          >
            <ChevronLeft className="w-4 h-4" /> Kembali ke Daftar Pengaturan
          </button>
        )}
      
      {successMsg && (
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl text-teal-800 text-xs sm:text-sm flex items-center gap-2.5 shadow-xs animate-in fade-in duration-300">
          <div className="p-1 bg-teal-600 text-white rounded-full">
            <Check className="w-4 h-4" />
          </div>
          <p className="font-medium">{successMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs sm:text-sm flex items-center gap-2.5 shadow-xs animate-in fade-in duration-300">
          <div className="p-1 bg-rose-600 text-white rounded-full shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <p className="font-medium">{errorMsg}</p>
        </div>
      )}

      {activeTab === 'akun' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <UserCheck className="w-4.5 h-4.5 text-slate-600" />
              Profil Sesi
            </h3>
            
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 border border-slate-150 rounded-lg flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                  {safeUser.name ? safeUser.name.charAt(0).toUpperCase() : 'G'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate">{safeUser.name}</p>
                  <p className="text-xs text-slate-500 capitalize">
                    {safeUser.role === 'konselor' ? 'Konselor / Psikolog' : safeUser.role === 'admin' ? 'Administrator' : 'Mahasiswa'}
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={onOpenAuth}
                  className="w-full py-2.5 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  Ganti Peran / Keluar Sesi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Header Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Brain className="w-4.5 h-4.5 text-teal-600" />
                  Preferensi & Pilihan Model AI
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pilih model kecerdasan buatan yang sesuai dengan kebutuhan refleksi dan kecepatan respon Anda.
                </p>
              </div>
              <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200 self-start sm:self-auto">
                Default Aktif: {AVAILABLE_AI_MODELS.find(m => m.id === aiModel)?.name || 'Gemini 3.1 Flash Lite'}
              </span>
            </div>

            {/* Model Selection Grid */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Daftar Model AI Tersedia
              </label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {AVAILABLE_AI_MODELS.map((model) => {
                  const isSelected = aiModel === model.id;
                  return (
                    <div
                      key={model.id}
                      onClick={() => handleSelectAiModel(model.id)}
                      className={`relative p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-teal-600 bg-teal-50/40 shadow-xs ring-1 ring-teal-500'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{model.name}</span>
                            {model.isDefault && (
                              <span className="text-[9.5px] bg-slate-900 text-white font-bold px-1.5 py-0.5 rounded">
                                Default
                              </span>
                            )}
                          </div>
                          {isSelected ? (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Dipilih
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                              {model.tag}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">
                          {model.description}
                        </p>

                        <div className="p-2 bg-slate-50/80 rounded-lg border border-slate-100 text-[11px] text-slate-600 space-y-1">
                          <div className="flex items-center justify-between text-[10.5px]">
                            <span className="text-slate-500 flex items-center gap-1">
                              <Gauge className="w-3 h-3 text-slate-400" /> Kecepatan:
                            </span>
                            <span className="font-semibold text-slate-700">{model.speed}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10.5px]">
                            <span className="text-slate-500 flex items-center gap-1">
                              <Cpu className="w-3 h-3 text-slate-400" /> Penalaran:
                            </span>
                            <span className="font-semibold text-slate-700">{model.reasoning}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2.5 mt-2 border-t border-slate-150/70 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 text-[10px] truncate max-w-[200px]" title={model.recommendedFor}>
                          🎯 {model.recommendedFor}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectAiModel(model.id);
                          }}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-teal-600 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {isSelected ? 'Aktif' : 'Gunakan'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Default Response Style Option */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-teal-600" />
                Gaya Respons Default
              </label>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {[
                  { id: 'Singkat', label: 'Singkat', desc: 'Ringkas & langsung ke poin' },
                  { id: 'Seimbang', label: 'Seimbang', desc: 'Hangat & proporsional' },
                  { id: 'Mendalam', label: 'Mendalam', desc: 'Eksploratif & reflektif' },
                  { id: 'Fokus mendengarkan', label: 'Mendengarkan', desc: 'Validatif & apresiatif' },
                  { id: 'Fokus solusi', label: 'Solusi', desc: 'Langkah praktis terarah' },
                ].map(style => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => handleSelectResponseStyle(style.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      responseStyle === style.id
                        ? 'border-teal-600 bg-teal-50 text-teal-900 ring-1 ring-teal-500'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">{style.label}</span>
                      {responseStyle === style.id && <Check className="w-3 h-3 text-teal-600 shrink-0" />}
                    </div>
                    <span className="text-[10px] text-slate-500 leading-tight">{style.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'privasi' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <ShieldCheck className="w-4.5 h-4.5 text-slate-600" />
              Privasi & Kebijakan
            </h3>

            <div className="space-y-3">
              <button
                onClick={onOpenLegal}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-50 text-slate-600 rounded-lg border border-slate-100 shrink-0">
                    <ShieldCheck className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Lembar Informasi Legal</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Kebijakan AI & persetujuan medis</p>
                  </div>
                </div>
                <span className="text-xs text-teal-600 font-semibold group-hover:underline">Buka</span>
              </button>

              {onOpenPrivacyCenter && (
                <button
                  onClick={onOpenPrivacyCenter}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-teal-200 hover:border-teal-300 bg-teal-50/50 hover:bg-teal-50 transition-all text-left group shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-600 text-white rounded-lg shrink-0 shadow-sm">
                      <ShieldCheck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Pusat Privasi & Hak Data</h4>
                      <p className="text-xs text-teal-800 mt-0.5">Consent, Ekspor Data, Koreksi & Hapus Data</p>
                    </div>
                  </div>
                  <span className="text-xs bg-teal-600 text-white font-bold px-3 py-1 rounded-lg shadow-sm">
                    Atur
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'memory' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
              <RotateCcw className="w-4.5 h-4.5 text-slate-600" />
              Memory AI
            </h3>
            <p className="text-sm text-slate-600">Manajemen memori jangka panjang AI Anda (fitur segera hadir).</p>
          </div>
        </div>
      )}

      {activeTab === 'keamanan' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4.5 h-4.5 text-teal-600" />
                Keamanan Akun
              </h3>
              <div className="flex bg-slate-100 p-1 rounded-lg gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setSecTab('sessions')}
                  className={`px-3 py-1.5 rounded-md font-medium transition ${secTab === 'sessions' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Sesi ({sessions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSecTab('history')}
                  className={`px-3 py-1.5 rounded-md font-medium transition ${secTab === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Riwayat
                </button>
                <button
                  type="button"
                  onClick={() => setSecTab('password')}
                  className={`px-3 py-1.5 rounded-md font-medium transition ${secTab === 'password' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Sandi
                </button>
              </div>
            </div>

            {secMsg && (
              <div className={`p-3 rounded-lg text-xs font-medium border flex items-center gap-2 ${secMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                {secMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <ShieldAlert className="w-4 h-4 text-rose-600" />}
                <span>{secMsg.text}</span>
              </div>
            )}

            {/* TAB 1: Sesi Perangkat Aktif */}
            {secTab === 'sessions' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-slate-500">Daftar perangkat yang terhubung ke akun Anda:</p>
                  {sessions.length > 1 && (
                    <button
                      type="button"
                      onClick={handleLogoutAllDevices}
                      className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded text-[11px] font-semibold transition"
                    >
                      Keluar dari Perangkat Lain
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {sessions.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Tidak ada data sesi aktif.</p>
                  ) : (
                    sessions.map((s) => (
                      <div key={s.sessionId} className="p-3 border border-slate-200 rounded-lg flex items-center justify-between bg-slate-50/50">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">{s.device || 'Perangkat Web'}</span>
                            {s.isCurrent && (
                              <span className="px-1.5 py-0.5 bg-teal-100 text-teal-800 rounded text-[9px] font-bold">
                                Sesi Ini
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500">IP: {s.ip} • Terakhir aktif: {new Date(s.lastActive).toLocaleString('id-ID')}</p>
                        </div>
                        {!s.isCurrent && (
                          <button
                            type="button"
                            onClick={() => handleRevokeSession(s.sessionId)}
                            className="px-2 py-1 bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-700 rounded text-[11px] font-medium transition"
                          >
                            Cabut Sesi
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: Riwayat Login */}
            {secTab === 'history' && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {loginHistory.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Belum ada catatan riwayat login.</p>
                ) : (
                  loginHistory.map((h, i) => (
                    <div key={h.id || i} className="p-2.5 border border-slate-150 rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-800">{new Date(h.timestamp).toLocaleString('id-ID')}</div>
                        <div className="text-[10px] text-slate-500">IP: {h.ip}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${h.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {h.status === 'SUCCESS' ? 'Berhasil' : 'Gagal / Diblokir'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: Ganti Kata Sandi */}
            {secTab === 'password' && (
              <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kata Sandi Saat Ini</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="••••••••••"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kata Sandi Baru (Minimal 10 Karakter)</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={10}
                    placeholder="••••••••••••"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Konfirmasi Kata Sandi Baru</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={10}
                    placeholder="••••••••••••"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-800"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition"
                >
                  Perbarui Kata Sandi
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {activeTab === 'langganan' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 min-w-0">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4.5 h-4.5 text-slate-600" />
                Pilih Paket Langganan
              </h3>
              {loading && (
                <div className="animate-spin rounded-full h-4.5 w-4.5 border-b-2 border-teal-600"></div>
              )}
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Tingkatkan kuota obrolan harian Anda untuk konsultasi yang lebih intensif dan mendalam.
            </p>

            {/* Real-Time AI Quota Card */}
            <AiQuotaBadge userId={safeUser.id} userTier={safeUser.tier} variant="card" />

            {/* Plans Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 min-w-0">
              
              {/* Plan 1: Free Tier */}
              <div className={`border rounded-xl p-5 flex flex-col space-y-4 transition-all w-full min-w-0 ${
                safeUser.tier === 'Free' 
                  ? 'border-slate-800 bg-slate-50/60 ring-2 ring-slate-850/5' 
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}>
                <div className="space-y-3 flex-1 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wide rounded border border-slate-200">
                      Standard
                    </span>
                    {safeUser.tier === 'Free' && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-700 font-bold">
                        <Check className="w-3.5 h-3.5 text-slate-700 shrink-0" /> Aktif
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">Standard Tier</h4>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">Pendamping emosional dasar harian.</p>
                  </div>
                  <div className="pt-2">
                    <span className="text-xl font-bold text-slate-900">Rp 0</span>
                    <span className="text-xs text-slate-600"> / selamanya</span>
                  </div>
                  
                  {/* Features List */}
                  <ul className="text-xs text-slate-600 space-y-2.5 pt-4 border-t border-slate-100 mt-auto">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      <span>Maksimal <strong>25 pesan / hari</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      <span>Asisten AI Reflektif</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 mt-auto">
                  <button
                    disabled={safeUser.tier === 'Free' || loading}
                    onClick={() => handleSelectTier('Free')}
                    className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      safeUser.tier === 'Free'
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-sm active:scale-95'
                    }`}
                  >
                    {safeUser.tier === 'Free' ? 'Paket Aktif' : 'Pilih Standard'}
                  </button>
                </div>
              </div>

              {/* Plan 2: Pro Tier */}
              <div className={`border rounded-xl p-5 flex flex-col space-y-4 transition-all relative overflow-hidden w-full min-w-0 ${
                safeUser.tier === 'Pro' 
                  ? 'border-teal-600 bg-teal-50/10 ring-2 ring-teal-600/20' 
                  : 'border-slate-200 hover:border-slate-300 bg-white shadow-sm'
              }`}>
                {/* Popular badge */}
                <div className="absolute top-0 right-0 bg-teal-600 text-white font-bold text-[9px] uppercase tracking-wider px-3 py-1 rounded-bl-lg shadow-sm">
                  Pro
                </div>

                <div className="space-y-3 flex-1 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-teal-100 text-teal-800 text-[10px] font-bold uppercase tracking-wide rounded border border-teal-200 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-teal-600 shrink-0" /> Pro
                    </span>
                    {safeUser.tier === 'Pro' && (
                      <span className="flex items-center gap-1 text-[10px] text-teal-700 font-bold">
                        <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" /> Aktif
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">Pendamping Pro</h4>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">Dukungan kognitif intensif.</p>
                  </div>
                  <div className="pt-2">
                    <span className="text-xl font-bold text-slate-900">Rp 29.000</span>
                    <span className="text-xs text-slate-600"> / bulan</span>
                  </div>

                  {/* Features List */}
                  <ul className="text-xs text-slate-600 space-y-2.5 pt-4 border-t border-slate-100 mt-auto">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      <span>Maksimal <strong>100 pesan / hari</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      <span>Respon AI Prioritas</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 mt-auto">
                  <button
                    disabled={safeUser.tier === 'Pro' || loading}
                    onClick={() => handleSelectTier('Pro')}
                    className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      safeUser.tier === 'Pro'
                        ? 'bg-teal-100 text-teal-700 cursor-not-allowed'
                        : 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm active:scale-95'
                    }`}
                  >
                    {safeUser.tier === 'Pro' ? 'Paket Aktif' : 'Aktifkan Pro'}
                  </button>
                </div>
              </div>

              {/* Plan 3: Developer Tier */}
              <div className={`border rounded-xl p-5 flex flex-col space-y-4 transition-all relative overflow-hidden w-full min-w-0 ${
                safeUser.tier === 'Developer' 
                  ? 'border-indigo-600 bg-indigo-50/20 ring-2 ring-indigo-600/20' 
                  : 'border-slate-200 hover:border-slate-300 bg-white shadow-sm'
              }`}>
                {/* Dev Badge */}
                <div className="absolute top-0 right-0 bg-indigo-600 text-white font-bold text-[9px] uppercase tracking-wider px-3 py-1 rounded-bl-lg shadow-sm">
                  Special
                </div>

                <div className="space-y-3 flex-1 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase tracking-wide rounded border border-indigo-200 flex items-center gap-1">
                      <Terminal className="w-3 h-3 text-indigo-600 shrink-0" /> Dev
                    </span>
                    {safeUser.tier === 'Developer' && (
                      <span className="flex items-center gap-1 text-[10px] text-indigo-700 font-bold">
                        <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> Aktif
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">Versi Developer</h4>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">Akses khusus penguji system.</p>
                  </div>
                  <div className="pt-2">
                    <span className="text-xl font-bold text-slate-900">Tanpa Limit</span>
                    <span className="text-xs text-slate-600"> / khusus dev</span>
                  </div>

                  {/* Features List */}
                  <ul className="text-xs text-slate-600 space-y-2.5 pt-4 border-t border-slate-100 mt-auto">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <span><strong>Tanpa Limit</strong> pesan / hari</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <span>Akses Fitur Penuh Sistem</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 mt-auto">
                  <button
                    disabled={safeUser.tier === 'Developer' || loading}
                    onClick={() => handleSelectTier('Developer')}
                    className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      safeUser.tier === 'Developer'
                        ? 'bg-indigo-100 text-indigo-800 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm active:scale-95'
                    }`}
                  >
                    {safeUser.tier === 'Developer' ? 'Dev Aktif' : 'Aktifkan Dev Mode'}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
      
      </div>

      {/* Developer Password Modal */}
      {showDevModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden p-5 space-y-4 font-sans relative">
            <button 
              onClick={() => setShowDevModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl border border-indigo-200 shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Verifikasi Versi Developer</h3>
                <p className="text-[11px] text-slate-600">Masukkan password khusus untuk mendapatkan akses tanpa limit.</p>
              </div>
            </div>

            {devError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{devError}</span>
              </div>
            )}

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSelectTier('Developer', devPassword);
              }}
              className="space-y-3 pt-1"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password Developer
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={devPassword}
                    onChange={(e) => setDevPassword(e.target.value)}
                    placeholder="Masukkan password..."
                    autoFocus
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDevModal(false)}
                  className="flex-1 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-medium transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading || !devPassword}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {loading ? 'Memverifikasi...' : 'Verifikasi & Aktifkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
