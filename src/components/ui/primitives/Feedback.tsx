import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

/* =========================================================================
   BADGE (Strict Zero-Pill Compliance: subtle, non-neon, informative)
   ========================================================================= */
export type BadgeVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'outline';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

const badgeVariants: Record<BadgeVariant, string> = {
  neutral:
    'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60',
  primary:
    'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800/60',
  success:
    'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60',
  warning:
    'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60',
  danger:
    'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60',
  outline:
    'bg-transparent text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700',
};

const badgeSizes: Record<BadgeSize, string> = {
  sm: 'text-[11px] px-2 py-0.5 rounded-md gap-1',
  md: 'text-xs px-2.5 py-1 rounded-lg gap-1.5',
};

const dotColors: Record<BadgeVariant, string> = {
  neutral: 'bg-slate-400',
  primary: 'bg-teal-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  outline: 'bg-slate-400',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'sm',
  dot = false,
  className = '',
  children,
  ...props
}) => {
  return (
    <span
      className={`
        inline-flex items-center font-medium select-none whitespace-nowrap
        ${badgeVariants[variant]}
        ${badgeSizes[size]}
        ${className}
      `}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`} aria-hidden="true" />}
      {children}
    </span>
  );
};

/* =========================================================================
   CHIP (Interactive filter button with active state & click handler)
   ========================================================================= */
export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  count?: number | string;
  onRemove?: (e: React.MouseEvent) => void;
  size?: 'sm' | 'md';
}

export const Chip: React.FC<ChipProps> = ({
  active = false,
  count,
  onRemove,
  size = 'md',
  disabled,
  className = '',
  children,
  ...props
}) => {
  const isSm = size === 'sm';

  return (
    <button
      type="button"
      disabled={disabled}
      className={`
        inline-flex items-center gap-1.5 select-none font-medium transition-all duration-150 ease-out cursor-pointer
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1
        dark:focus-visible:ring-offset-slate-900 active:scale-[0.97]
        ${isSm ? 'text-xs px-2.5 py-1 rounded-lg min-h-[28px]' : 'text-xs sm:text-sm px-3 py-1.5 rounded-xl min-h-[34px]'}
        ${
          active
            ? 'bg-teal-600 text-white shadow-3xs border border-teal-600'
            : 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/60 hover:bg-slate-200/70 dark:hover:bg-slate-700/70'
        }
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
        ${className}
      `}
      {...props}
    >
      <span className="truncate">{children}</span>
      {count !== undefined && (
        <span
          className={`
            text-[11px] tabular-nums font-mono px-1.5 py-0.2 rounded-md
            ${active ? 'bg-teal-700 text-teal-100' : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}
          `}
        >
          {count}
        </span>
      )}
      {onRemove && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(e);
          }}
          className="hover:opacity-75 p-0.5 rounded-sm focus:outline-none"
          aria-label="Hapus filter"
        >
          <X className="w-3 h-3" />
        </span>
      )}
    </button>
  );
};

/* =========================================================================
   ALERT
   ========================================================================= */
export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: React.ReactNode;
  onDismiss?: () => void;
  icon?: React.ReactNode;
}

const alertStyles: Record<AlertVariant, { container: string; icon: string; title: string; body: string }> = {
  info: {
    container: 'bg-sky-50/70 dark:bg-sky-950/30 border-sky-200/70 dark:border-sky-800/60',
    icon: 'text-sky-600 dark:text-sky-400',
    title: 'text-sky-900 dark:text-sky-200',
    body: 'text-sky-800 dark:text-sky-300',
  },
  success: {
    container: 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/70 dark:border-emerald-800/60',
    icon: 'text-emerald-600 dark:text-emerald-400',
    title: 'text-emerald-900 dark:text-emerald-200',
    body: 'text-emerald-800 dark:text-emerald-300',
  },
  warning: {
    container: 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/70 dark:border-amber-800/60',
    icon: 'text-amber-600 dark:text-amber-400',
    title: 'text-amber-900 dark:text-amber-200',
    body: 'text-amber-800 dark:text-amber-300',
  },
  danger: {
    container: 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/70 dark:border-rose-800/60',
    icon: 'text-rose-600 dark:text-rose-400',
    title: 'text-rose-900 dark:text-rose-200',
    body: 'text-rose-800 dark:text-rose-300',
  },
};

const defaultIcons: Record<AlertVariant, React.ReactNode> = {
  info: <Info className="w-5 h-5 shrink-0" aria-hidden="true" />,
  success: <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />,
  warning: <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />,
  danger: <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />,
};

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  onDismiss,
  icon,
  className = '',
  children,
  ...props
}) => {
  const styles = alertStyles[variant];

  return (
    <div
      role="alert"
      className={`
        w-full p-3.5 sm:p-4 rounded-xl border flex items-start gap-3 transition-colors
        ${styles.container}
        ${className}
      `}
      {...props}
    >
      <div className={`mt-0.5 shrink-0 ${styles.icon}`}>{icon || defaultIcons[variant]}</div>
      <div className="flex-1 min-w-0 text-left">
        {title && <h4 className={`text-xs sm:text-sm font-semibold tracking-tight ${styles.title}`}>{title}</h4>}
        {children && <div className={`text-xs sm:text-[13px] leading-relaxed mt-0.5 ${styles.body}`}>{children}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className={`shrink-0 p-1 rounded-md opacity-70 hover:opacity-100 transition-opacity focus:outline-none ${styles.icon}`}
          aria-label="Tutup notifikasi"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

/* =========================================================================
   SKELETON
   ========================================================================= */
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circle' | 'card' | 'rect';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  className = '',
  style,
  ...props
}) => {
  const variantStyles = {
    text: 'h-4 w-full rounded-md',
    circle: 'w-10 h-10 rounded-full shrink-0',
    card: 'h-32 w-full rounded-2xl',
    rect: 'h-10 w-full rounded-xl',
  };

  const inlineStyles: React.CSSProperties = {
    ...(width !== undefined ? { width: typeof width === 'number' ? `${width}px` : width } : {}),
    ...(height !== undefined ? { height: typeof height === 'number' ? `${height}px` : height } : {}),
    ...style,
  };

  return (
    <div
      aria-hidden="true"
      style={inlineStyles}
      className={`
        animate-pulse bg-slate-200/70 dark:bg-slate-800/80
        ${variantStyles[variant]}
        ${className}
      `}
      {...props}
    />
  );
};

/* =========================================================================
   PROGRESS INDICATOR
   ========================================================================= */
export interface ProgressIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  max?: number;
  label?: string;
  showValue?: boolean;
  size?: 'sm' | 'md';
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  value,
  max = 100,
  label,
  showValue = false,
  size = 'md',
  className = '',
  ...props
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const isSm = size === 'sm';

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`} {...props}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
          {label && <span>{label}</span>}
          {showValue && <span className="tabular-nums font-mono text-slate-500">{Math.round(percentage)}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || 'Indikator progres'}
        className={`
          w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden
          ${isSm ? 'h-1.5' : 'h-2'}
        `}
      >
        <div
          className="h-full bg-teal-600 transition-all duration-300 ease-out rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

/* =========================================================================
   SCORE INDICATOR (Clinical & Mental Health Safe Scale)
   ========================================================================= */
export interface ScoreIndicatorProps {
  score: number;
  maxScore: number;
  label: string;
  category: string;
  description?: string;
}

export const ScoreIndicator: React.FC<ScoreIndicatorProps> = ({
  score,
  maxScore,
  label,
  category,
  description,
}) => {
  const ratio = score / maxScore;

  // Discreet clinical severity indicator without screaming neon colors
  const severityStyle =
    ratio > 0.65
      ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-900/60'
      : ratio > 0.35
      ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-900/60'
      : 'text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 border-teal-200/80 dark:border-teal-900/60';

  return (
    <div className="w-full p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${severityStyle}`}>
          {category}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-mono tabular-nums">
          {score}
        </span>
        <span className="text-xs text-slate-400 font-mono tabular-nums">/ {maxScore}</span>
      </div>
      <ProgressIndicator value={score} max={maxScore} size="sm" />
      {description && (
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{description}</p>
      )}
    </div>
  );
};
