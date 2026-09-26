import React, { forwardRef, useId } from 'react';
import { Search, X, ChevronDown, Check } from 'lucide-react';

/* =========================================================================
   INPUT
   ========================================================================= */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, leftElement, rightElement, id, disabled, className = '', ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    const hasError = Boolean(error);

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-slate-700 dark:text-slate-300 select-none">
            {label}
            {props.required && <span className="text-rose-500 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leftElement && (
            <div className="absolute left-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              {leftElement}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={hasError ? 'true' : undefined}
            aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
            className={`
              w-full h-10 rounded-xl bg-white dark:bg-slate-900/90
              border text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500
              transition-all duration-150 ease-out
              focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-950
              disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed
              ${leftElement ? 'pl-9' : 'pl-3.5'}
              ${rightElement ? 'pr-9' : 'pr-3.5'}
              ${
                hasError
                  ? 'border-rose-400 dark:border-rose-600 focus:border-rose-500 focus:ring-rose-500/20'
                  : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 focus:border-teal-600 focus:ring-teal-500/20'
              }
              ${className}
            `}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3 flex items-center text-slate-400 dark:text-slate-500">
              {rightElement}
            </div>
          )}
        </div>
        {hasError ? (
          <p id={errorId} className="text-xs text-rose-500 dark:text-rose-400 font-medium">
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-slate-500 dark:text-slate-400">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';

/* =========================================================================
   TEXTAREA
   ========================================================================= */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  showCount?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, helperText, error, showCount, id, disabled, maxLength, value, className = '', ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id || generatedId;
    const hasError = Boolean(error);
    const currentLength = typeof value === 'string' ? value.length : 0;

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        <div className="flex items-center justify-between">
          {label && (
            <label htmlFor={textareaId} className="text-xs font-medium text-slate-700 dark:text-slate-300 select-none">
              {label}
              {props.required && <span className="text-rose-500 ml-0.5">*</span>}
            </label>
          )}
          {showCount && maxLength && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          maxLength={maxLength}
          value={value}
          aria-invalid={hasError ? 'true' : undefined}
          className={`
            w-full min-h-[80px] p-3 rounded-xl bg-white dark:bg-slate-900/90
            border text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500
            transition-all duration-150 ease-out
            focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-950
            disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed
            resize-y
            ${
              hasError
                ? 'border-rose-400 dark:border-rose-600 focus:border-rose-500 focus:ring-rose-500/20'
                : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 focus:border-teal-600 focus:ring-teal-500/20'
            }
            ${className}
          `}
          {...props}
        />
        {hasError ? (
          <p className="text-xs text-rose-500 dark:text-rose-400 font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

/* =========================================================================
   SEARCH INPUT
   ========================================================================= */
export interface SearchInputProps extends Omit<InputProps, 'leftElement' | 'rightElement'> {
  onClear?: () => void;
  shortcut?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onClear, shortcut, value, onChange, placeholder = 'Cari...', className = '', ...props }, ref) => {
    const hasValue = Boolean(value && String(value).length > 0);

    return (
      <Input
        ref={ref}
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        leftElement={<Search className="w-4 h-4" aria-hidden="true" />}
        rightElement={
          hasValue && onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal-500"
              aria-label="Bersihkan pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : shortcut ? (
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
              {shortcut}
            </kbd>
          ) : undefined
        }
        className={`pr-8 ${className}`}
        {...props}
      />
    );
  }
);
SearchInput.displayName = 'SearchInput';

/* =========================================================================
   SELECT
   ========================================================================= */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  options?: Array<{ value: string; label: string; disabled?: boolean }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, helperText, error, options, children, id, disabled, className = '', ...props }, ref) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const hasError = Boolean(error);

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={selectId} className="text-xs font-medium text-slate-700 dark:text-slate-300 select-none">
            {label}
            {props.required && <span className="text-rose-500 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={hasError ? 'true' : undefined}
            className={`
              w-full h-10 pl-3.5 pr-9 rounded-xl bg-white dark:bg-slate-900/90
              border text-sm text-slate-900 dark:text-slate-100 appearance-none
              transition-all duration-150 ease-out cursor-pointer
              focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-950
              disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed
              ${
                hasError
                  ? 'border-rose-400 dark:border-rose-600 focus:border-rose-500 focus:ring-rose-500/20'
                  : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 focus:border-teal-600 focus:ring-teal-500/20'
              }
              ${className}
            `}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="absolute right-3 pointer-events-none text-slate-400 dark:text-slate-500 flex items-center">
            <ChevronDown className="w-4 h-4" aria-hidden="true" />
          </div>
        </div>
        {hasError ? (
          <p className="text-xs text-rose-500 dark:text-rose-400 font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
Select.displayName = 'Select';

/* =========================================================================
   CHECKBOX
   ========================================================================= */
export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  description?: React.ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, id, disabled, checked, className = '', ...props }, ref) => {
    const generatedId = useId();
    const checkboxId = id || generatedId;

    return (
      <label
        htmlFor={checkboxId}
        className={`inline-flex items-start gap-2.5 cursor-pointer select-none group ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${className}`}
      >
        <div className="relative flex items-center justify-center mt-0.5">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            disabled={disabled}
            checked={checked}
            className="peer sr-only"
            {...props}
          />
          <div
            className={`
              w-4 h-4 rounded-md border transition-all duration-150 ease-out flex items-center justify-center
              peer-focus-visible:ring-2 peer-focus-visible:ring-teal-500 peer-focus-visible:ring-offset-2
              dark:peer-focus-visible:ring-offset-slate-900
              ${
                checked
                  ? 'bg-teal-600 border-teal-600 text-white'
                  : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 group-hover:border-slate-400 dark:group-hover:border-slate-600'
              }
            `}
          >
            {checked && <Check className="w-3 h-3 stroke-[3]" />}
          </div>
        </div>
        {(label || description) && (
          <div className="flex flex-col text-left">
            {label && <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">{label}</span>}
            {description && <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</span>}
          </div>
        )}
      </label>
    );
  }
);
Checkbox.displayName = 'Checkbox';

/* =========================================================================
   RADIO
   ========================================================================= */
export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  description?: React.ReactNode;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, description, id, disabled, checked, className = '', ...props }, ref) => {
    const generatedId = useId();
    const radioId = id || generatedId;

    return (
      <label
        htmlFor={radioId}
        className={`inline-flex items-start gap-2.5 cursor-pointer select-none group ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${className}`}
      >
        <div className="relative flex items-center justify-center mt-0.5">
          <input
            ref={ref}
            type="radio"
            id={radioId}
            disabled={disabled}
            checked={checked}
            className="peer sr-only"
            {...props}
          />
          <div
            className={`
              w-4 h-4 rounded-full border transition-all duration-150 ease-out flex items-center justify-center
              peer-focus-visible:ring-2 peer-focus-visible:ring-teal-500 peer-focus-visible:ring-offset-2
              dark:peer-focus-visible:ring-offset-slate-900
              ${
                checked
                  ? 'border-teal-600 bg-teal-600'
                  : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 group-hover:border-slate-400'
              }
            `}
          >
            {checked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
          </div>
        </div>
        {(label || description) && (
          <div className="flex flex-col text-left">
            {label && <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">{label}</span>}
            {description && <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</span>}
          </div>
        )}
      </label>
    );
  }
);
Radio.displayName = 'Radio';

/* =========================================================================
   TOGGLE / SWITCH
   ========================================================================= */
export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  id?: string;
  size?: 'sm' | 'md';
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  id,
  size = 'md',
}) => {
  const generatedId = useId();
  const toggleId = id || generatedId;

  const isSmall = size === 'sm';

  return (
    <div
      className={`inline-flex items-center justify-between gap-3 ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
      onClick={() => !disabled && onChange(!checked)}
    >
      {(label || description) && (
        <div className="flex flex-col text-left">
          {label && (
            <span id={`${toggleId}-label`} className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">
              {label}
            </span>
          )}
          {description && (
            <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</span>
          )}
        </div>
      )}
      <button
        type="button"
        role="switch"
        id={toggleId}
        aria-checked={checked}
        aria-labelledby={label ? `${toggleId}-label` : undefined}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) onChange(!checked);
        }}
        className={`
          relative inline-flex shrink-0 transition-colors duration-200 ease-in-out rounded-full
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2
          dark:focus-visible:ring-offset-slate-900
          ${isSmall ? 'w-8 h-4.5 p-0.5' : 'w-10 h-6 p-0.5'}
          ${checked ? 'bg-teal-600' : 'bg-slate-200 dark:bg-slate-700'}
        `}
      >
        <span
          aria-hidden="true"
          className={`
            pointer-events-none inline-block rounded-full bg-white shadow-xs
            transform transition-transform duration-200 ease-in-out
            ${isSmall ? 'w-3.5 h-3.5' : 'w-5 h-5'}
            ${checked ? (isSmall ? 'translate-x-3.5' : 'translate-x-4') : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
};
