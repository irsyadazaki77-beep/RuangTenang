import React, { useState } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { usePrivacyVault } from '../../contexts/PrivacyVaultContext';
import { VaultPinModal } from './VaultPinModal';

interface PrivacyGuardProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export const PrivacyGuard: React.FC<PrivacyGuardProps> = ({
  children,
  title = 'Bilik Pribadi Terkunci',
  description = 'Data jurnal suasana hati, catatan emosional, dan riwayat skrining Anda dilindungi dengan PIN keamanan.'
}) => {
  const { isVaultConfigured, isVaultUnlocked } = usePrivacyVault();
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'unlock' | 'setup'>('unlock');

  // If vault is not configured, or if already unlocked, render children directly
  if (!isVaultConfigured || isVaultUnlocked) {
    return <>{children}</>;
  }

  // Vault is configured and currently locked
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center animate-fade-in">
      <div className="max-w-md w-full surface-card border border-default p-8 rounded-3xl shadow-xl space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto shadow-md">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-primary">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-secondary leading-relaxed">
            {description}
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={() => {
              setModalMode('unlock');
              setIsPinModalOpen(true);
            }}
            className="w-full py-3.5 px-6 rounded-2xl bg-teal-600 hover:bg-teal-700 active:scale-98 text-white font-bold text-sm shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Unlock className="w-4 h-4" />
            <span>Buka Kunci dengan PIN</span>
          </button>
        </div>
      </div>

      <VaultPinModal
        isOpen={isPinModalOpen}
        mode={modalMode}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={() => setIsPinModalOpen(false)}
      />
    </div>
  );
};
