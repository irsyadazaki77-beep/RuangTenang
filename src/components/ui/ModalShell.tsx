import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
}

const MAX_WIDTH_MAP = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
};

export function ModalShell({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = '2xl',
  headerRight,
  footer,
}: ModalShellProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Focus modal container or first button
      const timer = setTimeout(() => {
        const focusable = modalRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        focusable?.focus();
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown);
        previousFocusRef.current?.focus?.();
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className={`w-full ${MAX_WIDTH_MAP[maxWidth]} bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col h-[90vh] sm:h-[88vh] max-h-[820px] overflow-hidden animate-slide-up focus:outline-none`}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs shrink-0">
          <div className="min-w-0 pr-3">
            <h2 id="modal-title" className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base tracking-tight truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerRight}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
              aria-label="Tutup Dialog"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar min-h-0">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="px-4 sm:px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
