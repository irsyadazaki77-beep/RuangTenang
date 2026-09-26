import React, { useState, useRef, useEffect, useId } from 'react';

/* =========================================================================
   TABS
   ========================================================================= */
export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  count?: number | string;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  variant?: 'underline' | 'segmented';
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
  variant = 'underline',
}) => {
  if (variant === 'segmented') {
    return (
      <div
        role="tablist"
        className={`flex items-center gap-1 p-1 bg-slate-100/90 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 overflow-x-auto no-scrollbar ${className}`}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={`
                flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium
                whitespace-nowrap transition-all duration-150 ease-out cursor-pointer select-none
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500
                disabled:opacity-40 disabled:cursor-not-allowed
                ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-3xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }
              `}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[11px] font-mono tabular-nums px-1.5 py-0.2 rounded-md ${
                    isActive
                      ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300'
                      : 'bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="tablist"
      className={`flex items-center gap-4 sm:gap-6 border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={`
              relative flex items-center gap-2 py-3 text-xs sm:text-sm font-medium
              whitespace-nowrap transition-colors duration-150 ease-out cursor-pointer select-none
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500
              disabled:opacity-40 disabled:cursor-not-allowed
              ${
                isActive
                  ? 'text-teal-700 dark:text-teal-300 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }
            `}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="text-[11px] font-mono tabular-nums text-slate-500">{tab.count}</span>
            )}
            {isActive && (
              <span
                aria-hidden="true"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 dark:bg-teal-400 rounded-full"
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

/* =========================================================================
   SEGMENTED CONTROL
   ========================================================================= */
export interface SegmentOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  className = '',
}: SegmentedControlProps<T>) {
  const isSm = size === 'sm';

  return (
    <div
      role="radiogroup"
      className={`inline-flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/70 dark:border-slate-700/60 ${className}`}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(opt.value)}
            className={`
              flex items-center gap-1.5 font-medium whitespace-nowrap transition-all duration-150 ease-out select-none cursor-pointer rounded-lg
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500
              ${isSm ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs sm:text-sm'}
              ${
                isSelected
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-3xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }
            `}
          >
            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* =========================================================================
   TOOLTIP
   ========================================================================= */
export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delayMs?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delayMs = 250,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipId = useId();

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => setIsVisible(true), delayMs);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {React.cloneElement(children as React.ReactElement<any>, {
        'aria-describedby': isVisible ? tooltipId : undefined,
      })}
      {isVisible && (
        <div
          id={tooltipId}
          role="tooltip"
          className={`
            absolute z-50 pointer-events-none px-2.5 py-1 text-xs font-medium text-white
            bg-slate-900/95 dark:bg-slate-800 rounded-md shadow-lg border border-slate-700/60
            whitespace-nowrap transition-opacity duration-150 animate-fade-in
            ${positionClasses[position]}
          `}
        >
          {content}
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   DROPDOWN & POPOVER
   ========================================================================= */
export interface DropdownItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  align = 'left',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <div onClick={() => setIsOpen((prev) => !prev)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className={`
            absolute z-50 mt-1.5 w-56 rounded-xl bg-white dark:bg-slate-900
            border border-slate-200/90 dark:border-slate-800 shadow-xl py-1 focus:outline-none
            animate-popover
            ${align === 'right' ? 'right-0' : 'left-0'}
          `}
        >
          {items.map((item, idx) => {
            if (item.divider) {
              return <hr key={`divider-${idx}`} className="my-1 border-slate-100 dark:border-slate-800" />;
            }
            return (
              <button
                key={item.id}
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick?.();
                    setIsOpen(false);
                  }
                }}
                className={`
                  w-full flex items-center gap-2.5 px-3.5 py-2 text-xs sm:text-sm text-left
                  transition-colors cursor-pointer select-none
                  disabled:opacity-40 disabled:cursor-not-allowed
                  ${
                    item.danger
                      ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800'
                  }
                `}
              >
                {item.icon && <span className="shrink-0">{item.icon}</span>}
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
