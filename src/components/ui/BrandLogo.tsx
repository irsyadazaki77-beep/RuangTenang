import React from 'react';

export const BRAND_IDENTITIES = {
  RUANG_TENANG: { name: 'RuangTenang', src: '/favicon.svg' },
  RUANG_KERJA: { name: 'RuangKerja', src: '/ruangkerja.svg' },
} as const;

export interface BrandLogoProps {
  mode?: 'RUANG_TENANG' | 'RUANG_KERJA';
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textClassName?: string;
  iconOnly?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  mode = 'RUANG_TENANG',
  className = '',
  size = 'md',
  showText = false,
  textClassName = '',
  iconOnly = false
}) => {
  const sizeClasses: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', string> = {
    xs: 'w-8 h-8',
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  const isWorkMode = mode === 'RUANG_KERJA';
  const brand = BRAND_IDENTITIES[mode];
  const chosenSizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Theme-aware soft container for logo mark */}
      <div
        className={`relative inline-flex shrink-0 items-center justify-center rounded-lg p-1 transition-colors ${
          isWorkMode
            ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-300/30 dark:border-indigo-700/40'
            : 'bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-300/30 dark:border-emerald-700/40'
        } ${chosenSizeClass}`}
      >
        <img
          src={brand.src}
          alt={brand.name}
          className="w-full h-full object-contain pointer-events-none select-none"
        />
      </div>

      {showText && !iconOnly && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`font-bold tracking-tight text-slate-900 dark:text-slate-100 ${textClassName}`}>
              {brand.name}
            </span>
            {isWorkMode && (
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-300/60 dark:border-indigo-700/60 rounded-md shrink-0">
                dari RuangTenang
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
            {isWorkMode ? 'Selesaikan Tugas Tanpa Cemas' : 'Kesehatan Mental'}
          </span>
        </div>
      )}
    </div>
  );
};

export default BrandLogo;
