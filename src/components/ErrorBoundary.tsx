import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-slate-50 p-4 sm:p-6 text-center">
          <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-xl max-w-md w-full border border-slate-200/80 space-y-4">
            <div className="flex justify-center items-center gap-2 mb-2">
              <img src="/favicon.svg" alt="RuangTenang" className="w-8 h-8 object-contain" />
              <span className="font-bold text-slate-800 text-sm">RuangTenang Kampus</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h1 className="text-xl font-bold text-slate-800">Ups, Terjadi Kendala Tampilan</h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                RuangTenang menemui kendala teknis ringan saat merender komponen. Anda dapat mencoba memuat ulang sesi ini.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={this.handleReset}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white transition-all hover:bg-teal-700 active:scale-98 shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Coba Muat Ulang Tampilan</span>
              </button>

              <button
                onClick={() => {
                  window.location.href = '/';
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-700 transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Kembali ke Halaman Utama</span>
              </button>
            </div>

            {this.state.error && (
              <details open className="mt-4 text-left">
                <summary className="text-[11px] text-slate-500 hover:text-slate-700 cursor-pointer font-medium select-none">
                  Detail Teknis (Diagnostik)
                </summary>
                <pre className="mt-2 text-[10px] bg-slate-100 p-3 rounded-lg overflow-auto max-h-48 text-slate-700 font-mono whitespace-pre-wrap">
                  {this.state.error.toString()}
                  {'\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

