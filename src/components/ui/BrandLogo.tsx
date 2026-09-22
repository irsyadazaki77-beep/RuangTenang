import React from 'react';

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
    xs: 'w-5 h-5',
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-14 h-14'
  };

  const isWorkMode = mode === 'RUANG_KERJA';
  const chosenSizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* LOGO ASLI RUANGTENANG: Menggunakan aset resmi favicon.svg di seluruh mode */}
      <div className={`relative inline-flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-teal-200/80 dark:border-teal-900 shadow-2xs p-1 transition-all duration-300 ${chosenSizeClass}`}>
        <img
          src="/favicon.svg"
          alt="RuangTenang"
          className="w-full h-full object-contain pointer-events-none select-none"
        />
      </div>

      {showText && !iconOnly && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`font-bold tracking-tight text-slate-900 dark:text-slate-100 ${textClassName}`}>
              RuangTenang
            </span>
            {isWorkMode && (
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/60 rounded-md shrink-0">
                RuangKerja
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
