import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white border border-teal-600 shadow-2xs hover:shadow-xs focus-visible:ring-teal-500',
  secondary:
    'bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-800 active:bg-slate-100 dark:active:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700/80 shadow-3xs hover:border-slate-300 dark:hover:border-slate-600 focus-visible:ring-teal-500',
  outline:
    'bg-transparent hover:bg-slate-100/60 dark:hover:bg-slate-800/60 active:bg-slate-200/60 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 focus-visible:ring-teal-500',
  ghost:
    'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 active:bg-slate-200/60 dark:active:bg-slate-700/60 text-slate-700 dark:text-slate-300 border border-transparent focus-visible:ring-teal-500',
  danger:
    'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white border border-rose-600 shadow-2xs focus-visible:ring-rose-500',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-2.5 text-xs gap-1.5 rounded-lg min-h-[32px]',
  md: 'h-10 px-3.5 text-sm gap-2 rounded-xl min-h-[40px]',
  lg: 'h-11 px-5 text-sm sm:text-base gap-2.5 rounded-xl min-h-[44px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center font-medium select-none
          whitespace-nowrap transition-all duration-150 ease-out cursor-pointer
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          dark:focus-visible:ring-offset-slate-900
          active:scale-[0.98] will-change-transform
          disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:active:scale-100
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
            <span className="truncate">{children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0 flex items-center">{leftIcon}</span>}
            <span className="truncate">{children}</span>
            {rightIcon && <span className="shrink-0 flex items-center">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  shape?: 'rounded' | 'circle';
}

const iconSizeStyles = {
  sm: 'w-8 h-8 min-w-[32px] min-h-[32px] p-1.5 rounded-lg text-xs',
  md: 'w-10 h-10 min-w-[40px] min-h-[40px] p-2 rounded-xl text-sm',
  lg: 'w-11 h-11 min-w-[44px] min-h-[44px] p-2.5 rounded-xl text-base',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      'aria-label': ariaLabel,
      variant = 'ghost',
      size = 'md',
      isLoading = false,
      shape = 'rounded',
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        aria-label={ariaLabel}
        title={ariaLabel}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center transition-all duration-150 ease-out cursor-pointer
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          dark:focus-visible:ring-offset-slate-900
          active:scale-[0.96] will-change-transform
          disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:active:scale-100
          ${variantStyles[variant]}
          ${iconSizeStyles[size]}
          ${shape === 'circle' ? '!rounded-full' : ''}
          ${className}
        `}
        {...props}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : children}
      </button>
    );
  }
);
IconButton.displayName = 'IconButton';
