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
  title = 'Ruang Pribadi Terkunci',
  description = 'Ruang pribadi ini dikunci dengan PIN demi kenyamanan privasimu di sesi browser ini.'
}) => {
  const { isVaultConfigured, isVaultUnlocked } = usePrivacyVault();
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'unlock' | 'setup'>('unlock');

  if (isVaultUnlocked) {
    return <>{children}</>;
  }

  // Vault is configured and currently locked
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center animate-fade-in">
      <div className="max-w-md w-full surface-card p-8 rounded-3xl space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200/70 dark:border-teal-800/70 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto shadow-[0_8px_24px_-6px_rgba(13,148,136,0.2)]">
          <Lock className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-primary tracking-tight">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-secondary leading-relaxed">
            {description}
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={() => {
              setModalMode(isVaultConfigured ? 'unlock' : 'setup');
              setIsPinModalOpen(true);
            }}
            className="w-full py-3.5 px-6 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-sm shadow-[0_8px_22px_-6px_rgba(13,148,136,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer btn-tactile"
          >
            <Unlock className="w-4 h-4" />
            <span>{isVaultConfigured ? 'Buka Kunci dengan PIN' : 'Atur PIN untuk Membuka'}</span>
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
