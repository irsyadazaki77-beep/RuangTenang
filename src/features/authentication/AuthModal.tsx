import { useEscapeKey } from '../../hooks/useEscapeKey';
import React, { useState, useEffect, useRef } from 'react';
import { HeartHandshake, User, AlertCircle, CheckCircle, UserPlus, LogIn, KeyRound, ShieldCheck, MailCheck, Lock, X, ShieldAlert } from 'lucide-react';
import { UserRole, UserSession } from '../../types';
import { apiClient } from '../../lib/apiClient';
import { LoginForm } from './components/LoginForm';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSession: UserSession;
  onLogin: (session: UserSession) => void;
  onLogout: () => void;
  requiredRoleNotice?: string;
}

type AuthTab = 'login' | 'register' | 'mfa' | 'forgot' | 'verify';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentSession,
  onLogin,
  onLogout,
  requiredRoleNotice
}) => {
  useEscapeKey(onClose, true);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements || focusableElements.length === 0) return;
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };
    
    // Set initial focus
    const focusable = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable && focusable.length > 0) {
      (focusable[0] as HTMLElement).focus();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const [activeTab, setActiveTab] = useState<AuthTab>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole>('mahasiswa');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [university, setUniversity] = useState('Universitas Indonesia');
  
  // Security State
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingUserId, setPendingUserId] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const resetFormState = () => {
    setErrorMsg('');
    setSuccessMsg('');
    setPassword('');
    setNewPassword('');
    setMfaCode('');
    setVerificationCode('');
    setResetToken('');
    setResetSubmitted(false);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMsg('Silakan isi email dan kata sandi.');
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.post<any>('/api/v1/auth/login', { email: trimmedEmail, password });

      if (!response.success) {
        throw new Error(response.error || 'Masuk gagal.');
      }

      const data = response.data;
      // Check if MFA 2FA is required
      if (data?.mfaRequired) {
        setMfaToken(data.mfaToken);
        setSuccessMsg(data.message || 'Autentikasi Multi-Faktor (2FA) diperlukan.');
        setActiveTab('mfa');
        return;
      }

      onLogin({
        ...data.user,
        usageStats: { chatMessagesSent: 0, appointmentsBooked: 0 }
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Koneksi server gagal.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    onLogin({
      id: 'guest',
      name: 'Tamu / Mahasiswa (Anonim)',
      email: 'anonim@kampus.ac.id',
      role: 'guest',
      tier: 'Free',
      usageStats: { chatMessagesSent: 0, appointmentsBooked: 0 }
    });
    onClose();
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    if (!mfaCode.trim()) {
      setErrorMsg('Masukkan kode 6-digit MFA');
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.post<any>('/api/v1/auth/mfa/verify', { mfaToken, code: mfaCode.trim() });

      if (!response.success) {
        throw new Error(response.error || 'Verifikasi MFA gagal.');
      }

      const data = response.data;
      onLogin({
        ...data.user,
        usageStats: { chatMessagesSent: 0, appointmentsBooked: 0 }
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Verifikasi MFA gagal.');
    } finally {
      setLoading(false);
    }
  };

  const [resetSubmitted, setResetSubmitted] = useState<boolean>(false);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    if (!trimmedEmail || !password || !trimmedName) {
      setErrorMsg('Silakan lengkapi seluruh kolom wajib.');
      setLoading(false);
      return;
    }

    if (password.length < 10) {
      setErrorMsg('Kata sandi minimal 10 karakter untuk perlindungan akun.');
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.post<any>('/api/v1/auth/register', {
        name: trimmedName,
        email: trimmedEmail,
        password,
        university
      });

      if (!response.success) {
        throw new Error(response.error || 'Pendaftaran gagal.');
      }

      const data = response.data;
      setPendingUserId(data.userId);
      setSuccessMsg(data.message || 'Registrasi berhasil! Verifikasi email Anda.');
      setActiveTab('verify');
    } catch (err: any) {
      setErrorMsg(err.message || 'Pendaftaran gagal.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const response = await apiClient.post<any>('/api/v1/auth/verify-email', { userId: pendingUserId, code: verificationCode.trim() });

      if (!response.success) {
        throw new Error(response.error || 'Verifikasi email gagal.');
      }

      setSuccessMsg('Email berhasil diverifikasi! Silakan masuk dengan akun Anda.');
      setActiveTab('login');
      setPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Verifikasi email gagal.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    if (!email.trim()) {
      setErrorMsg('Masukkan alamat email terdaftar.');
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.post<any>('/api/v1/auth/forgot-password', { email: email.trim() });

      if (!response.success) {
        throw new Error(response.error || 'Permintaan reset gagal.');
      }

      const data = response.data;
      setResetSubmitted(true);
      setSuccessMsg(data?.message || 'Jika email terdaftar, instruksi reset kata sandi telah dikirim. Masukkan token reset yang Anda terima.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Permintaan reset kata sandi gagal.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    if (!resetToken || !newPassword) {
      setErrorMsg('Masukkan token reset dan kata sandi baru.');
      setLoading(false);
      return;
    }

    if (newPassword.length < 10) {
      setErrorMsg('Kata sandi baru minimal 10 karakter.');
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.post<any>('/api/v1/auth/reset-password', { token: resetToken.trim(), newPassword });

      if (!response.success) {
        throw new Error(response.error || 'Reset kata sandi gagal.');
      }

      const data = response.data;
      setSuccessMsg(data?.message || 'Kata sandi berhasil diperbarui! Silakan masuk.');
      setActiveTab('login');
      setPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Reset kata sandi gagal.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutClick = async () => {
    setLoading(true);
    try {
      await apiClient.post<any>('/api/v1/auth/logout', {});
      onLogout();
      onClose();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center max-sm:items-end bg-slate-900/60 backdrop-blur-sm p-4 max-sm:p-0 animate-fade-in">
      <div
        ref={modalRef}
        className="bg-white rounded-3xl max-sm:rounded-b-none shadow-2xl border border-teal-50/50 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] max-sm:max-h-[92vh] max-sm:w-full transition-all duration-300 animate-scale-up max-sm:animate-slide-up"
      >
        {/* Drag handle for mobile bottom sheet */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3 sm:hidden shrink-0" />

        {/* Header */}
        <div className="bg-slate-900 text-white p-6 shrink-0 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3.5">
              <div className="p-2 bg-white rounded-2xl shadow-xs shrink-0">
                <img src="/favicon.svg" alt="RuangTenang" className="w-8 h-8 object-contain" />
              </div>
              <div>
                <h3 className="text-lg font-sans font-bold tracking-tight">RuangTenang</h3>
                <p className="text-xs text-teal-400 font-medium">Autentikasi & Keamanan Sesi</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Tutup Sesi"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content (Scrollable) */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {requiredRoleNotice && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-3 text-amber-800 text-sm">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-slate-900">Akses Terbatas Peran</p>
                <p className="text-xs text-amber-700 mt-1">{requiredRoleNotice}</p>
              </div>
            </div>
          )}

          {currentSession && currentSession.role !== 'guest' ? (
            <div className="bg-slate-50 rounded-xl p-6 text-center space-y-4 border border-slate-200">
              <div className="inline-flex p-3 bg-teal-50 text-teal-600 rounded-full shadow-sm border border-teal-200">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-medium text-slate-900 text-lg">{currentSession.name}</h4>
                <p className="text-sm text-slate-600">{currentSession.email}</p>
                <div className="mt-3 inline-flex items-center px-3.5 py-1.5 rounded-md text-xs font-medium bg-slate-800 text-white">
                  Peran Aktif: {currentSession.role === 'konselor' ? 'Psikolog / Konselor Kampus' : currentSession.role === 'admin' ? 'Admin Perguruan Tinggi' : 'Mahasiswa'}
                </div>
              </div>

              <div className="pt-5 mt-2 border-t border-slate-200 flex flex-col space-y-3">
                <div className="flex space-x-3">
                  <button
                    onClick={handleLogoutClick}
                    disabled={loading}
                    className="flex-1 py-2.5 px-4 min-h-[44px] border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 active:scale-95 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                  >
                    {loading ? 'Memproses...' : 'Keluar Sesi (Logout)'}
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-2.5 px-4 min-h-[44px] bg-slate-800 text-white hover:bg-slate-900 active:scale-95 rounded-lg text-sm font-medium transition-all"
                  >
                    Tutup Modal
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Tab Navigation */}
              <div className="flex border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => { setActiveTab('login'); resetFormState(); }}
                  className={`flex-1 py-2 text-xs font-medium border-b-2 transition ${activeTab === 'login' ? 'border-slate-800 text-slate-900 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  Masuk Sesi
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('register'); resetFormState(); }}
                  className={`flex-1 py-2 text-xs font-medium border-b-2 transition ${activeTab === 'register' ? 'border-slate-800 text-slate-900 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  Registrasi
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('forgot'); resetFormState(); }}
                  className={`flex-1 py-2 text-xs font-medium border-b-2 transition ${activeTab === 'forgot' ? 'border-slate-800 text-slate-900 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  Lupa Sandi
                </button>
              </div>

              {/* Status Notifications */}
              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-medium flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* TAB 1: LOGIN */}
              {activeTab === 'login' && (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Email Kampus</label>
                    <input
                      type="email"
                      placeholder="nama@kampus.ac.id"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 border border-slate-300 bg-slate-50 rounded-lg text-base sm:text-sm text-slate-900 min-h-[44px] focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-medium text-slate-700">Kata Sandi</label>
                      <button
                        type="button"
                        onClick={() => { setActiveTab('forgot'); resetFormState(); }}
                        className="text-[11px] text-teal-700 hover:underline"
                      >
                        Lupa kata sandi?
                      </button>
                    </div>
                    <input
                      type="password"
                      placeholder="••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className={`w-full px-3.5 py-2 min-h-[44px] border rounded-lg text-base sm:text-sm text-slate-900 min-h-[44px] focus:outline-none transition-all ${
                        password.length > 0 && password.length < 6
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50'
                          : 'border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 bg-slate-50'
                      }`}
                    />
                  </div>

                  <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="font-semibold text-slate-700 block mb-1">Informasi Akun:</span>
                    <p className="text-slate-600">
                      Gunakan email kampus terdaftar Anda untuk masuk atau buat akun baru di tab Registrasi.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium shadow-sm transition disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>{loading ? 'Memproses...' : 'Masuk Akun'}</span>
                    </button>
                    
                    <div className="relative flex items-center py-2">
                      <div className="flex-grow border-t border-slate-200"></div>
                      <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-medium">Atau</span>
                      <div className="flex-grow border-t border-slate-200"></div>
                    </div>
                    
                    {currentSession?.role === 'guest' ? (
                      <button
                        type="button"
                        onClick={onLogout}
                        disabled={loading}
                        className="w-full py-2.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-600 rounded-lg text-sm font-medium shadow-sm transition disabled:opacity-50 flex items-center justify-center space-x-2"
                      >
                        <X className="w-4 h-4" />
                        <span>Keluar dari Sesi Tamu</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGuestLogin}
                        disabled={loading}
                        className="w-full py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium shadow-sm transition disabled:opacity-50 flex items-center justify-center space-x-2"
                      >
                        <User className="w-4 h-4" />
                        <span>Masuk sebagai Tamu</span>
                      </button>
                    )}
                  </div>
                </form>
              )}

              {/* TAB 2: MFA 2FA STEP */}
              {activeTab === 'mfa' && (
                <form onSubmit={handleMfaSubmit} className="space-y-4 bg-purple-50/60 p-4 border border-purple-200 rounded-xl">
                  <div className="flex items-center space-x-2 text-purple-900 font-semibold text-sm">
                    <ShieldCheck className="w-5 h-5 text-purple-700" />
                    <span>Autentikasi Dua Faktor (2FA / MFA)</span>
                  </div>
                  <p className="text-xs text-purple-700 leading-relaxed">
                    Peran Konselor & Admin mewajibkan perlindungan MFA. Masukkan kode 6-digit keamanan Anda.
                  </p>
                  <div>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="123456"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      required
                      className="w-full text-center tracking-widest text-lg font-mono font-bold px-3.5 py-2.5 border border-purple-300 bg-white rounded-lg focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 min-h-[44px] bg-purple-800 hover:bg-purple-900 text-white active:scale-95 rounded-lg text-sm font-medium shadow-sm transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{loading ? 'Memverifikasi...' : 'Verifikasi & Masuk Sesi'}</span>
                  </button>
                </form>
              )}

              {/* TAB 3: REGISTER */}
              {activeTab === 'register' && (
                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Nama Lengkap</label>
                    <input
                      type="text"
                      placeholder="Ahmad Fauzi"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className={`w-full px-3.5 py-2 min-h-[44px] border rounded-lg text-base sm:text-sm text-slate-900 min-h-[44px] focus:outline-none transition-all ${
                        name.length > 0 && name.length < 2
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50'
                          : 'border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 bg-slate-50'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Email Kampus</label>
                    <input
                      type="email"
                      placeholder="fauzi@ui.ac.id"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className={`w-full px-3.5 py-2 min-h-[44px] border rounded-lg text-base sm:text-sm text-slate-900 min-h-[44px] focus:outline-none transition-all ${
                        email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50'
                          : 'border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 bg-slate-50'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Kata Sandi <span className="text-[10px] text-slate-500">(Minimal 10 karakter)</span>
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={10}
                      className={`w-full px-3.5 py-2 min-h-[44px] border rounded-lg text-base sm:text-sm text-slate-900 min-h-[44px] focus:outline-none transition-all ${
                        password.length > 0 && password.length < 10
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50'
                          : 'border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 bg-slate-50'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Asal Perguruan Tinggi</label>
                    <input
                      type="text"
                      placeholder="Universitas Indonesia"
                      value={university}
                      onChange={(e) => setUniversity(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 border border-slate-300 bg-slate-50 rounded-lg text-base sm:text-sm text-slate-900 min-h-[44px] focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                    />
                  </div>

                  <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <p className="text-slate-600">
                      ℹ️ Pendaftaran publik diperuntukkan bagi mahasiswa. Akun konselor dan admin disediakan khusus oleh administrator kampus.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium shadow-sm transition disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{loading ? 'Memproses...' : 'Daftar Akun Mahasiswa'}</span>
                  </button>
                </form>
              )}

              {/* TAB 4: EMAIL VERIFICATION */}
              {activeTab === 'verify' && (
                <form onSubmit={handleVerifyEmailSubmit} className="space-y-4 bg-teal-50/60 p-4 border border-teal-200 rounded-xl">
                  <div className="flex items-center space-x-2 text-teal-900 font-semibold text-sm">
                    <MailCheck className="w-5 h-5 text-teal-700" />
                    <span>Verifikasi Email Akun</span>
                  </div>
                  <p className="text-xs text-teal-700 leading-relaxed">
                    Kode verifikasi telah dikirim. Masukkan kode 6-digit untuk mengaktifkan akun.
                  </p>
                  <div>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="123456"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      required
                      className="w-full text-center tracking-widest text-lg font-mono font-bold px-3.5 py-2.5 border border-teal-300 bg-white rounded-lg focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-sm font-medium shadow-sm transition disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    <MailCheck className="w-4 h-4" />
                    <span>{loading ? 'Memverifikasi...' : 'Aktivasi & Verifikasi Email'}</span>
                  </button>
                </form>
              )}

              {/* TAB 5: FORGOT PASSWORD */}
              {activeTab === 'forgot' && (
                <div className="space-y-4">
                  {!resetSubmitted && !resetToken ? (
                    <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Email Terdaftar</label>
                        <input
                          type="email"
                          placeholder="nama@kampus.ac.id"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="w-full px-3.5 py-2 border border-slate-300 bg-slate-50 rounded-lg text-base sm:text-sm text-slate-900 min-h-[44px] focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium shadow-sm transition disabled:opacity-50 flex items-center justify-center space-x-2"
                      >
                        <KeyRound className="w-4 h-4" />
                        <span>{loading ? 'Memproses...' : 'Kirim Token Reset Kata Sandi'}</span>
                      </button>

                      <div className="text-center pt-2">
                        <button
                          type="button"
                          onClick={() => setResetSubmitted(true)}
                          className="text-xs text-teal-700 hover:underline"
                        >
                          Sudah memiliki token reset? Masukkan token di sini
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleResetPasswordSubmit} className="space-y-4 bg-amber-50/60 p-4 border border-amber-200 rounded-xl">
                      <div className="flex items-center space-x-2 text-amber-900 font-semibold text-sm">
                        <Lock className="w-5 h-5 text-amber-700" />
                        <span>Reset Kata Sandi Sekali Pakai</span>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Token Reset</label>
                        <input
                          type="text"
                          placeholder="rst-..."
                          value={resetToken}
                          onChange={(e) => setResetToken(e.target.value)}
                          required
                          className="w-full px-3.5 py-2 border border-amber-300 bg-white font-mono text-xs rounded-lg focus:outline-none focus:border-amber-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Kata Sandi Baru (Min 10 Karakter)</label>
                        <input
                          type="password"
                          placeholder="••••••••••••"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          minLength={10}
                          className={`w-full px-3.5 py-2 min-h-[44px] border bg-white text-sm rounded-lg focus:outline-none transition-all ${
                            newPassword.length > 0 && newPassword.length < 10
                              ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50'
                              : 'border-amber-300 focus:border-amber-600 focus:ring-1 focus:ring-amber-600'
                          }`}
                        />
                      </div>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => { setResetSubmitted(false); setResetToken(''); }}
                          className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition"
                        >
                          Kembali
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-2/3 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-sm font-medium shadow-sm transition disabled:opacity-50 flex items-center justify-center space-x-2"
                        >
                          <Lock className="w-4 h-4" />
                          <span>{loading ? 'Memproses...' : 'Simpan Kata Sandi Baru'}</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Security Footer */}
        <div className="bg-slate-100 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center shrink-0 border-t border-slate-200">
          <p className="text-[11px] text-slate-600">
            🔒 Sesi dilindungi secure httpOnly cookie, pembatasan rate limit & proteksi kuncian akun otomatis.
          </p>
        </div>
      </div>
    </div>
  );
};
