import React, { Suspense, type ReactNode } from 'react';
import { ErrorState } from '../common/ErrorState';
import { LoadingState } from '../ui/primitives/Surfaces';
import { GlobalErrorBoundary } from './GlobalErrorBoundary';

interface FeatureErrorBoundaryProps {
  children: ReactNode;
  featureName: string;
}

export function FeatureErrorBoundary({ children, featureName }: FeatureErrorBoundaryProps) {
  const reload = () => window.location.reload();
  return (
    <GlobalErrorBoundary
      fallback={
        <div className="min-h-full flex items-center justify-center p-4" role="alert">
          <ErrorState
            title={`${featureName} mengalami kendala`}
            description="Bagian ini gagal dimuat. Muat ulang halaman untuk mencoba lagi."
            onRetry={reload}
          />
        </div>
      }
      onReset={reload}
    >
      <Suspense
        fallback={
          <div className="h-full flex items-center justify-center surface-page" role="status">
            <LoadingState message={`Memuat ${featureName.toLowerCase()}`} className="p-4" />
          </div>
        }
      >
        {children}
      </Suspense>
    </GlobalErrorBoundary>
  );
}

