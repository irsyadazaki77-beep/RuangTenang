import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, Home, HeartHandshake, ShieldCheck } from 'lucide-react';

export interface GlobalErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

export interface GlobalErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<GlobalErrorBoundaryProps, GlobalErrorBoundaryState> {
  public state: GlobalErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): GlobalErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[GlobalErrorBoundary] Uncaught application error:', error, errorInfo);
  }

  public handleResetSession = (): void => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null });
    // Soft refresh session view if window is available
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public handleNavigateHome = (): void => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center surface-page p-4 sm:p-6 text-center select-none">
          <div className="rounded-3xl bg-white dark:bg-slate-800 p-6 sm:p-8 shadow-xl max-w-md w-full border border-teal-100/80 dark:border-slate-700 space-y-5">
            {/* Header Icon & Branding */}
            <div className="flex items-center justify-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 p-1 border border-teal-100 dark:border-teal-900/60 flex items-center justify-center shadow-xs">
                <img src="/favicon.svg" alt="RuangTenang" className="w-full h-full object-contain" />
              </div>
              <span className="font-bold text-slate-800 dark:text-slate-100 text-sm tracking-tight">RuangTenang Kampus</span>
            </div>

            {/* Calming Emblem */}
            <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 border border-teal-200/80 dark:border-teal-900/80 flex items-center justify-center mx-auto shadow-xs">
              <HeartHandshake className="w-7 h-7" />
            </div>

            {/* Empathetic Safe Message */}
            <div className="space-y-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">
                Sesi Anda Tetap Aman 🌿
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Terjadi kendala teknis ringan saat merender tampilan. Jangan khawatir, seluruh data dan percakapan Anda tersimpan dengan aman.
              </p>
            </div>

            {/* Security Assurance Badge */}
            <div className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
              <span>Sesi terenkripsi & privat</span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={this.handleResetSession}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-98 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white transition-all shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Muat Ulang Sesi</span>
              </button>

              <button
                type="button"
                onClick={this.handleNavigateHome}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 active:scale-98 px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Kembali ke Halaman Utama</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
