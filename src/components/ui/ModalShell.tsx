import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { modalBackdropVariants, modalPanelVariants, reducedMotionVariants } from '../../lib/motionTokens';

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
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const subtitleId = useId();
  const shouldReduceMotion = useReducedMotion();
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const getFocusableElements = () => Array.from(
      modalRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) || []
    ).filter((element) =>
      !element.hasAttribute('hidden') &&
      element.getAttribute('aria-hidden') !== 'true' &&
      !element.closest('[hidden], [aria-hidden="true"]') &&
      element.getClientRects().length > 0
    );

    const timer = setTimeout(() => {
      const firstFocusable = getFocusableElements()[0];
      (firstFocusable || modalRef.current)?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        event.preventDefault();
        modalRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !modalRef.current?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !modalRef.current?.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-backdrop"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={shouldReduceMotion ? reducedMotionVariants : modalBackdropVariants}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs pt-safe pb-safe"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          <motion.div
            key="modal-panel"
            ref={modalRef}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={shouldReduceMotion ? reducedMotionVariants : modalPanelVariants}
            className={`w-full ${MAX_WIDTH_MAP[maxWidth]} surface-card border-t sm:border border-slate-200/90 dark:border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85dvh] sm:max-h-[90vh] overflow-hidden focus:outline-none will-change-transform`}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={subtitle ? subtitleId : undefined}
          >
            {/* Mobile Bottom Sheet Drag Handle Indicator */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-2 sm:py-3.5 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs shrink-0">
              <div className="min-w-0 pr-3">
                <h2 id={titleId} className="font-semibold text-primary text-sm sm:text-base tracking-tight truncate">
                  {title}
                </h2>
                {subtitle && (
                  <p id={subtitleId} className="text-[12px] text-secondary truncate mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {headerRight}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center btn-press-compact"
                  aria-label="Tutup Dialog"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Body Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 overscroll-contain custom-scrollbar min-h-0">
              {children}
            </div>

            {/* Optional Footer */}
            {footer && (
              <div className="px-4 sm:px-6 py-2.5 sm:py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
