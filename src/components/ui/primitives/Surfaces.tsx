import React, { useEffect, useRef } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { Button } from './Button';

/* =========================================================================
   SURFACE & CARD
   ========================================================================= */
export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  level?: 'base' | 'card' | 'elevated' | 'sunken';
}

export const Surface: React.FC<SurfaceProps> = ({
  level = 'card',
  className = '',
  children,
  ...props
}) => {
  const levelStyles = {
    base: 'bg-[#fafaf9] dark:bg-[#080d16]',
    card: 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-3xs',
    elevated: 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm',
    sunken: 'bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60',
  };

  return (
    <div className={`transition-colors ${levelStyles[level]} ${className}`} {...props}>
      {children}
    </div>
  );
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  footer,
  interactive = false,
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`
        bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800/80
        shadow-3xs overflow-hidden flex flex-col text-left transition-all duration-150
        ${interactive ? 'hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs cursor-pointer active:scale-[0.99]' : ''}
        ${className}
      `}
      {...props}
    >
      {(title || subtitle || action) && (
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            {title && <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 truncate">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className="p-4 sm:p-5 flex-1">{children}</div>
      {footer && (
        <div className="px-4 sm:px-5 py-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-950/40">
          {footer}
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   AVATAR (Zero Broken Image Resilience)
   ========================================================================= */
export interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'busy' | 'offline';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  size = 'md',
  status,
  className = '',
}) => {
  const [imageFailed, setImageFailed] = React.useState(false);

  const sizeClasses = {
    sm: 'w-7 h-7 text-[11px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-11 h-11 text-sm',
    xl: 'w-14 h-14 text-base',
  };

  const statusClasses = {
    online: 'bg-emerald-500',
    busy: 'bg-amber-500',
    offline: 'bg-slate-400',
  };

  const getInitials = (n: string) => {
    if (!n) return 'RT';
    const parts = n.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      {src && !imageFailed ? (
        <img
          src={src}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
          className={`rounded-full object-cover border border-slate-200/80 dark:border-slate-700 ${sizeClasses[size]}`}
        />
      ) : (
        <div
          className={`
            rounded-full bg-teal-100/90 dark:bg-teal-950/80 text-teal-800 dark:text-teal-200
            border border-teal-200/80 dark:border-teal-800/60 font-semibold select-none
            flex items-center justify-center
            ${sizeClasses[size]}
          `}
        >
          {getInitials(name)}
        </div>
      )}
      {status && (
        <span
          className={`
            absolute bottom-0 right-0 rounded-full ring-2 ring-white dark:ring-slate-900 shrink-0
            ${size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'}
            ${statusClasses[status]}
          `}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
};

/* =========================================================================
   DRAWER / SLIDE-OVER
   ========================================================================= */
export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  side?: 'left' | 'right';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  side = 'right',
  children,
  footer,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isLeft = side === 'left';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex" role="dialog" aria-modal="true">
      <div
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={drawerRef}
        className={`
          relative w-full max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800
          shadow-2xl flex flex-col h-full z-10 animate-fade-in
          ${isLeft ? 'mr-auto border-r' : 'ml-auto border-l'}
        `}
      >
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="min-w-0 pr-3">
            <h3 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 truncate mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Tutup panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">{children}</div>

        {footer && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

/* =========================================================================
   CONFIRMATION DIALOG
   ========================================================================= */
export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  isLoading?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  danger = false,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 flex flex-col gap-3 text-left animate-scale-up">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{message}</p>
        <div className="flex items-center justify-end gap-2.5 mt-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   EMPTY STATE, ERROR STATE & LOADING STATE
   ========================================================================= */
export interface StateDisplayProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<StateDisplayProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 ${className}`}>
      {icon && <div className="text-slate-400 dark:text-slate-500 mb-3">{icon}</div>}
      <h3 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
      {description && (
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mt-1 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

export interface ErrorStateProps extends StateDisplayProps {
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  icon,
  title = 'Gagal Memuat Data',
  description,
  onRetry,
  action,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 ${className}`}>
      <div className="text-rose-500 mb-3">{icon || <AlertCircle className="w-8 h-8" />}</div>
      <h3 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
      {description && (
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mt-1 leading-relaxed">
          {description}
        </p>
      )}
      <div className="mt-4 flex items-center gap-2">
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Coba Lagi
          </Button>
        )}
        {action}
      </div>
    </div>
  );
};

export const LoadingState: React.FC<{ message?: string; className?: string }> = ({
  message = 'Memuat...',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 p-8 sm:p-12 ${className}`}>
      <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
      <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">{message}</span>
    </div>
  );
};

/* =========================================================================
   TIMELINE & DATA LIST
   ========================================================================= */
export interface TimelineItem {
  id: string;
  title: React.ReactNode;
  timestamp: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  status?: 'completed' | 'active' | 'pending';
}

export const Timeline: React.FC<{ items: TimelineItem[]; className?: string }> = ({
  items,
  className = '',
}) => {
  return (
    <div className={`relative pl-4 space-y-4 border-l border-slate-200 dark:border-slate-800 ${className}`}>
      {items.map((item) => (
        <div key={item.id} className="relative group text-left">
          <div
            className={`
              absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900
              ${
                item.status === 'completed'
                  ? 'bg-teal-600'
                  : item.status === 'active'
                  ? 'bg-teal-400 ring-2 ring-teal-200 dark:ring-teal-900'
                  : 'bg-slate-300 dark:bg-slate-700'
              }
            `}
          />
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">{item.title}</h4>
            <span className="text-[11px] font-mono tabular-nums text-slate-400">{item.timestamp}</span>
          </div>
          {item.description && (
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{item.description}</div>
          )}
        </div>
      ))}
    </div>
  );
};

export interface DataListItem {
  label: string;
  value: React.ReactNode;
  help?: string;
}

export const DataList: React.FC<{ items: DataListItem[]; className?: string }> = ({
  items,
  className = '',
}) => {
  return (
    <div className={`divide-y divide-slate-100 dark:divide-slate-800/80 ${className}`}>
      {items.map((item, idx) => (
        <div key={idx} className="py-2.5 sm:py-3 flex items-center justify-between text-xs sm:text-sm">
          <span className="text-slate-500 dark:text-slate-400 font-medium">{item.label}</span>
          <span className="text-slate-900 dark:text-slate-100 font-semibold tabular-nums text-right">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
};
