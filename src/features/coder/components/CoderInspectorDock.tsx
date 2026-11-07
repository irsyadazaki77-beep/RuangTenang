import React from 'react';

interface CoderInspectorDockProps {
  /** True bila salah satu panel inspector (Autograder, Audit, SQL, Maba, Metodologi) terbuka. */
  isOpen: boolean;
  isDark?: boolean;
  children: React.ReactNode;
}

/**
 * Dock bawah untuk panel analisis lab. Panel anak (yang aslinya modal `fixed inset-0`)
 * dikurung oleh `transform` sehingga mengisi dock, bukan seluruh layar. Backdrop gelap
 * dinetralkan agar editor Monaco di atasnya tetap terlihat dan bisa dipakai.
 */
export const CoderInspectorDock: React.FC<CoderInspectorDockProps> = ({
  isOpen,
  isDark = true,
  children
}) => (
  <section
    aria-label="Inspector Lab"
    data-testid="coder-inspector-dock"
    data-open={isOpen}
    style={{ transform: 'translateZ(0)' }}
    className={[
      'fixed left-0 right-0 lg:left-12 bottom-12 lg:bottom-6 z-40 border-t shadow-2xl',
      'transition-[height] duration-200 overflow-hidden',
      isOpen ? 'h-[48vh]' : 'h-0 pointer-events-none border-t-0',
      isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300',
      '[&>div]:!bg-transparent [&>div]:!backdrop-blur-none [&>div]:!p-0 [&>div]:!items-stretch',
      '[&>div>div]:!max-w-none [&>div>div]:!w-full [&>div>div]:!max-h-full [&>div>div]:!h-full',
      '[&>div>div]:!rounded-none [&>div>div]:!shadow-none [&>div>div]:!border-0'
    ].join(' ')}
  >
    {children}
  </section>
);

export default CoderInspectorDock;
