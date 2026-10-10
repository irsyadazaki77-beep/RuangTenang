import React, { useState, useEffect } from 'react';
import { Menu, Ghost, ChevronLeft, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AiQuotaBadge } from '../AiQuotaBadge';
import { VersionBadge } from '../changelog/VersionBadge';
import { clientDb } from '../../lib/clientDb';
import { useToast } from '../Toast';
import { getAuthSessionSnapshot } from '../../lib/authSessionLifecycle';
import type { OutboxSummary } from '../../lib/clientDb';

const EMPTY_OUTBOX_SUMMARY: OutboxSummary = { pending: 0, syncing: 0, failed: 0, permanentlyRejected: 0, authPaused: 0, quarantined: 0, hasOwnerUnknown: false };

interface TopbarProps {
  onOpenSidebar?: () => void;
  title?: string;
  showBackButton?: boolean;
  user?: any;
  onOpenSettings?: () => void;
  onOpenChangelog?: () => void;
  rightElement?: React.ReactNode;
}

export function Topbar({ onOpenSidebar, title = 'RuangTenang', showBackButton, user, onOpenSettings, onOpenChangelog, rightElement }: TopbarProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [outboxSummary, setOutboxSummary] = useState<OutboxSummary>(EMPTY_OUTBOX_SUMMARY);

  useEffect(() => {
    let active = true;
    const refreshOutboxSummary = async () => {
      const session = getAuthSessionSnapshot();
      if (user?.role !== 'mahasiswa' || session.phase !== 'authenticated' || session.userId !== user.id) {
        if (active) setOutboxSummary(EMPTY_OUTBOX_SUMMARY);
        return;
      }
      const summary = await clientDb.getOutboxSummary();
      if (active && getAuthSessionSnapshot().userId === user.id) setOutboxSummary(summary);
    };
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Koneksi internet terhubung kembali.', 'info');
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast('Koneksi terputus. Menggunakan Modus Offline / Hemat Data.', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('ruangtenang:outbox-updated', refreshOutboxSummary);
    void refreshOutboxSummary();

    return () => {
      active = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('ruangtenang:outbox-updated', refreshOutboxSummary);
    };
  }, [showToast, user?.id, user?.role]);

  const isSyncing = outboxSummary.syncing > 0;

  return (
    <div className="h-14 border-b border-default flex items-center justify-between px-3 sm:px-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-10 w-full min-w-0 shrink-0 pt-safe">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {onOpenSidebar && (
          <button 
            onClick={onOpenSidebar} 
            className="lg:hidden p-2 -ml-1 text-secondary hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 rounded-xl shrink-0 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center" 
            aria-label="Buka Menu Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        
        {showBackButton && (
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 -ml-1 text-secondary hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 rounded-xl shrink-0 transition-colors cursor-pointer" 
            aria-label="Kembali"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2 pr-2 border-r border-default shrink-0">
          <div className="w-6 h-6 rounded-lg bg-teal-50 dark:bg-teal-950/70 border border-teal-200/80 dark:border-teal-900 shadow-3xs flex items-center justify-center p-0.5">
            <img src="/favicon.svg" alt="RuangTenang" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-xs sm:text-sm text-primary hidden xs:inline tracking-tight">{title}</span>
        </div>

        {!isOnline && (
          <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 shrink-0 ml-1 sm:ml-2 font-medium">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xs:inline">Offline</span>
          </div>
        )}

        {isSyncing && (
          <div className="text-xs text-teal-600 dark:text-teal-400 flex items-center gap-1.5 shrink-0 ml-1 sm:ml-2 font-medium">
            <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />
            <span className="hidden xs:inline">Menyinkronkan...</span>
          </div>
        )}

        {outboxSummary.pending > 0 && (
          <div className="text-xs text-teal-700 dark:text-teal-300 shrink-0 ml-1 sm:ml-2 font-medium" aria-live="polite">
            {outboxSummary.pending} tertunda
          </div>
        )}

        {outboxSummary.failed > 0 && (
          <div className="text-xs text-rose-700 dark:text-rose-300 flex items-center gap-1 shrink-0 ml-1 sm:ml-2 font-medium" aria-live="polite">
            <AlertCircle className="w-3.5 h-3.5" />
            {outboxSummary.failed} gagal
          </div>
        )}

        {outboxSummary.permanentlyRejected > 0 && (
          <div className="text-xs text-rose-700 dark:text-rose-300 flex items-center gap-1 shrink-0 ml-1 sm:ml-2 font-medium" aria-live="polite">
            <AlertCircle className="w-3.5 h-3.5" />
            {outboxSummary.permanentlyRejected} perlu ditinjau
          </div>
        )}

        {outboxSummary.authPaused > 0 && (
          <div className="text-xs text-amber-700 dark:text-amber-300 shrink-0 ml-1 sm:ml-2 font-medium" aria-live="polite">
            Sesi diperlukan ({outboxSummary.authPaused})
          </div>
        )}

        {(outboxSummary.hasOwnerUnknown || outboxSummary.quarantined > 0) && user?.role === 'mahasiswa' && (
          <div className="text-xs text-amber-700 dark:text-amber-300 shrink-0 ml-1 sm:ml-2 font-medium" title="Data offline lama dikarantina karena pemiliknya tidak dapat diverifikasi.">
            Data lama dikarantina
          </div>
        )}

        {user?.role === 'guest' && (
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 shrink-0 ml-2 font-medium">
            <Ghost className="w-3.5 h-3.5 shrink-0 text-amber-500" />
            <span className="hidden xs:inline">Sesi Tamu</span>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-1.5 sm:gap-2 relative shrink-0">
        <VersionBadge variant="compact" onClick={onOpenChangelog} />
        <AiQuotaBadge userId={user?.id} userTier={user?.tier} variant="compact" onOpenSettings={onOpenSettings} />
        {rightElement}
      </div>
    </div>
  );
}
