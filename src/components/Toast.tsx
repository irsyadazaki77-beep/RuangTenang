import { useEscapeKey } from '../hooks/useEscapeKey';
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: ToastType = 'info', title?: string) => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5);
    setToasts((prev) => [...prev, { id, type, title, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Render Area */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full px-4 pointer-events-none"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto p-3.5 rounded-2xl border shadow-lg flex items-start gap-3 transition-all animate-slide-up text-xs font-medium ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : toast.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : toast.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-teal-50 border-teal-200 text-teal-900'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
            {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />}

            <div className="flex-1 space-y-0.5">
              {toast.title && <strong className="font-bold block text-slate-900">{toast.title}</strong>}
              <p className="leading-normal">{toast.message}</p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              aria-label="Tutup notifikasi"
              className="p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-600 hover:text-slate-900 bg-black/5 hover:bg-black/10 rounded-lg shrink-0 transition-colors active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: (msg: string) => console.log('Toast:', msg)
    };
  }
  return context;
};

export interface ToastProps {
  message: string;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  useEscapeKey(onClose, true);

  return (
    <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-slate-800 text-white px-4 py-3 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 animate-fade-in pointer-events-auto">
      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white active:scale-95" aria-label="Close toast">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

