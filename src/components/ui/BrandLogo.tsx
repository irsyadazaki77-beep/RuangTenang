import React from 'react';

interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textClassName?: string;
  className?: string;
  iconOnly?: boolean;
}

const SIZE_MAP = {
  xs: { box: 'w-5 h-5 rounded-md p-0.5', icon: 'w-4 h-4', text: 'text-xs' },
  sm: { box: 'w-6 h-6 rounded-lg p-0.5', icon: 'w-5 h-5', text: 'text-sm' },
  md: { box: 'w-8 h-8 rounded-xl p-1', icon: 'w-6 h-6', text: 'text-base' },
  lg: { box: 'w-10 h-10 rounded-xl p-1.5', icon: 'w-7 h-7', text: 'text-lg' },
  xl: { box: 'w-14 h-14 rounded-2xl p-2.5', icon: 'w-9 h-9', text: 'text-2xl' },
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'sm',
  showText = false,
  textClassName = '',
  className = '',
  iconOnly = false
}) => {
  const currentSize = SIZE_MAP[size] || SIZE_MAP.sm;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div 
        className={`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 shadow-3xs flex items-center justify-center shrink-0 ${currentSize.box}`}
        aria-hidden="true"
      >
        <img 
          src="/favicon.svg" 
          alt="RuangTenang" 
          className="w-full h-full object-contain pointer-events-none select-none" 
          loading="eager"
        />
      </div>
      {showText && !iconOnly && (
        <span className={`font-bold tracking-tight text-stone-900 dark:text-stone-100 ${currentSize.text} ${textClassName}`}>
          RuangTenang
        </span>
      )}
    </div>
  );
};
