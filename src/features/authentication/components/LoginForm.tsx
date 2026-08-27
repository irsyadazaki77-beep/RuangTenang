import React, { useState } from 'react';
import { Mail, KeyRound, ArrowRight } from 'lucide-react';
import { apiClient } from '../../../lib/apiClient';

interface LoginFormProps {
  onSuccess: (data: any) => void;
  onRequireMfa: (userId: string, token: string) => void;
  onForgotPassword: () => void;
  setGlobalError: (err: string) => void;
}

export function LoginForm({ onSuccess, onRequireMfa, onForgotPassword, setGlobalError }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setGlobalError('');

    try {
      const trimmedEmail = email.trim();
      const response = await apiClient.post<any>('/api/v1/auth/login', { email: trimmedEmail, password });
      
      if (!response.success) {
        setGlobalError(response.error || 'Gagal masuk');
        setLoading(false);
        return;
      }

      const data = response.data;
      if (data.mfaRequired) {
        onRequireMfa(data.userId, data.mfaToken);
      } else {
        onSuccess(data.user);
      }
    } catch (err: any) {
      setGlobalError(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700">Email Kampus</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="w-4 h-4 text-slate-400" />
            </div>
            <input 
              type="email" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-base sm:text-sm min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-slate-800"
              placeholder="nama@kampus.ac.id"
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-slate-700">Kata Sandi</label>
            <button 
              type="button"
              onClick={onForgotPassword}
              className="text-[11px] font-semibold text-teal-600 hover:text-teal-700 hover:underline"
            >
              Lupa Sandi?
            </button>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <KeyRound className="w-4 h-4 text-slate-400" />
            </div>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-base sm:text-sm min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-slate-800"
              placeholder="••••••••"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !email.trim() || !password}
        className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm shadow-sm hover:shadow active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 mt-2"
      >
        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Masuk ke Akun <ArrowRight className="w-4 h-4" /></>}
      </button>
    </form>
  );
}
