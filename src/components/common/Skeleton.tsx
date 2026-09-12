import React from 'react';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div 
      className={`bg-slate-200/80 dark:bg-slate-800/80 rounded-md animate-pulse ${className}`} 
      aria-hidden="true" 
    />
  );
}

/**
 * Serene, calm chat message skeleton loader for message history transition
 */
export function ChatSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-4 sm:space-y-5 pb-6 w-full animate-fade-in" aria-label="Memuat riwayat chat...">
      {/* Assistant message skeleton 1 */}
      <div className="flex gap-2.5 sm:gap-3 w-full">
        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-teal-100/60 dark:bg-teal-950/60 shrink-0 mt-0.5 animate-pulse" />
        <div className="space-y-2 max-w-[80%] flex-1">
          <Skeleton className="h-4 w-3/4 rounded-lg" />
          <Skeleton className="h-4 w-1/2 rounded-lg" />
        </div>
      </div>

      {/* User message skeleton */}
      <div className="flex justify-end w-full">
        <div className="bg-slate-200/70 dark:bg-slate-800/70 p-3 sm:p-3.5 rounded-xl rounded-tr-xs max-w-[75%] w-64 space-y-2 animate-pulse">
          <Skeleton className="h-3.5 w-full bg-slate-300/80 dark:bg-slate-700/80 rounded" />
          <Skeleton className="h-3.5 w-4/5 bg-slate-300/80 dark:bg-slate-700/80 rounded" />
        </div>
      </div>

      {/* Assistant message skeleton 2 */}
      <div className="flex gap-2.5 sm:gap-3 w-full">
        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-teal-100/60 dark:bg-teal-950/60 shrink-0 mt-0.5 animate-pulse" />
        <div className="space-y-2 max-w-[85%] flex-1">
          <Skeleton className="h-4 w-5/6 rounded-lg" />
          <Skeleton className="h-4 w-4/6 rounded-lg" />
          <Skeleton className="h-4 w-2/6 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/**
 * Counselor Card Skeleton for CounselorDirectory
 */
export function CounselorCardSkeleton() {
  return (
    <div className="surface-card rounded-xl p-3.5 sm:p-4 border border-default shadow-3xs space-y-3 animate-fade-in">
      <div className="flex items-start gap-3">
        <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
        <div className="space-y-1.5 flex-1 min-w-0">
          <Skeleton className="h-4 w-3/5 rounded" />
          <Skeleton className="h-3 w-2/5 rounded" />
          <Skeleton className="h-3 w-4/5 rounded" />
        </div>
      </div>
      <div className="flex gap-1.5 pt-1">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="pt-2 border-t border-default flex justify-between items-center">
        <Skeleton className="h-4 w-24 rounded" />
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Appointment Card Skeleton for AppointmentScheduler
 */
export function AppointmentCardSkeleton() {
  return (
    <div className="surface-card rounded-xl p-3.5 sm:p-4 border border-default shadow-3xs space-y-3 animate-fade-in">
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-32 rounded" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-48 rounded" />
        <Skeleton className="h-3 w-36 rounded" />
      </div>
      <div className="pt-2 border-t border-default flex gap-2 justify-end">
        <Skeleton className="h-7 w-20 rounded-lg" />
        <Skeleton className="h-7 w-24 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Metric Card Skeleton for CounselorDashboard
 */
export function DashboardMetricSkeleton() {
  return (
    <div className="surface-card rounded-xl p-4 border border-default shadow-3xs space-y-2 animate-fade-in">
      <div className="flex justify-between items-center">
        <Skeleton className="h-3.5 w-24 rounded" />
        <Skeleton className="w-6 h-6 rounded-lg" />
      </div>
      <Skeleton className="h-7 w-20 rounded" />
      <Skeleton className="h-3 w-32 rounded" />
    </div>
  );
}

export function CounselorDirectorySkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 animate-fade-in" aria-label="Memuat daftar konselor...">
      {Array.from({ length: 6 }).map((_, idx) => (
        <CounselorCardSkeleton key={idx} />
      ))}
    </div>
  );
}

export function AppointmentSchedulerSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 animate-fade-in" aria-label="Memuat jadwal pertemuan...">
      {Array.from({ length: 4 }).map((_, idx) => (
        <AppointmentCardSkeleton key={idx} />
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4 space-y-4 animate-fade-in" aria-label="Memuat dasbor konselor...">
      <div className="surface-card rounded-xl p-4 border border-default shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-6 w-64 rounded-lg" />
          <Skeleton className="h-3.5 w-96 max-w-full rounded" />
        </div>
        <Skeleton className="h-8 w-32 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, idx) => (
          <DashboardMetricSkeleton key={idx} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 surface-card rounded-xl p-5 border border-default shadow-3xs space-y-4">
          <Skeleton className="h-5 w-48 rounded" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
        <div className="surface-card rounded-xl p-5 border border-default shadow-3xs space-y-4">
          <Skeleton className="h-5 w-40 rounded" />
          <div className="space-y-3 pt-2">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

