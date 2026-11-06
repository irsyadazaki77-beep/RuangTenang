import { useEscapeKey } from '../hooks/useEscapeKey';
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

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
  const shouldReduceMotion = useReducedMotion();

  const showToast = (message: string, type: ToastType = 'info', title?: string) => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5);
    // Limit queue to max 2 items to prevent stacking over UI
    setToasts((prev) => [...prev.slice(-1), { id, type, title, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Render Area - Positioned safely at top on mobile so it never blocks composer */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed top-4 sm:top-5 left-1/2 -translate-x-1/2 sm:left-auto sm:right-5 sm:translate-x-0 z-50 flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] sm:w-80 px-1 pointer-events-none"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              role="alert"
              layout={!shouldReduceMotion}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: shouldReduceMotion ? 0.05 : 0.15 }}
              className={`pointer-events-auto p-3 rounded-xl border shadow-sm backdrop-blur-md flex items-start gap-2.5 text-xs font-medium ${
                toast.type === 'success'
                  ? 'bg-emerald-50/95 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : toast.type === 'error'
                  ? 'bg-rose-50/95 dark:bg-rose-950/90 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                  : toast.type === 'warning'
                  ? 'bg-amber-50/95 dark:bg-amber-950/90 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                  : 'bg-teal-50/95 dark:bg-teal-950/90 border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200'
              }`}
            >
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />}
              {toast.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />}

              <div className="flex-1 space-y-0.5 min-w-0">
                {toast.title && <strong className="font-semibold block text-stone-900 dark:text-stone-100">{toast.title}</strong>}
                <p className="leading-snug break-words">{toast.message}</p>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                aria-label="Tutup notifikasi"
                className="p-1 rounded-md text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: (msg: string) => console.info('Toast:', msg)
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

