import React, { useState } from 'react';
import { Lock, Unlock, KeyRound, AlertCircle, X, RefreshCw } from 'lucide-react';
import { usePrivacyVault } from '../../contexts/PrivacyVaultContext';
import { motion } from 'motion/react';

interface VaultPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'unlock' | 'setup' | 'change' | 'remove';
  onSuccess?: () => void;
}

export const VaultPinModal: React.FC<VaultPinModalProps> = ({
  isOpen,
  onClose,
  mode = 'unlock',
  onSuccess
}) => {
  const { isVaultConfigured, setupPin, unlockVault, removePin } = usePrivacyVault();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  if (!isOpen) return null;

  const currentMode = !isVaultConfigured && mode === 'unlock' ? 'setup' : mode;

  const handleDigitPress = (digit: string) => {
    setErrorMsg(null);
    if (currentMode === 'setup') {
      if (step === 'enter') {
        if (pin.length < 6) setPin(prev => prev + digit);
      } else {
        if (confirmPin.length < 6) setConfirmPin(prev => prev + digit);
      }
    } else {
      if (pin.length < 6) setPin(prev => prev + digit);
    }
  };

  const handleDelete = () => {
    setErrorMsg(null);
    if (currentMode === 'setup' && step === 'confirm') {
      setConfirmPin(prev => prev.slice(0, -1));
    } else {
      setPin(prev => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    setPin('');
    setConfirmPin('');
    setOldPin('');
    setErrorMsg(null);
    setStep('enter');
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleSetupNext = () => {
    if (pin.length < 4) {
      setErrorMsg('PIN minimal 4 digit.');
      triggerShake();
      return;
    }
    setStep('confirm');
    setErrorMsg(null);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (currentMode === 'setup') {
        if (pin !== confirmPin) {
          setErrorMsg('Konfirmasi PIN tidak cocok!');
          triggerShake();
          setConfirmPin('');
          setIsSubmitting(false);
          return;
        }
        const ok = await setupPin(pin);
        if (ok) {
          onSuccess?.();
          onClose();
        } else {
          setErrorMsg('Gagal menyetel PIN.');
        }
      } else if (currentMode === 'unlock') {
        const ok = await unlockVault(pin);
        if (ok) {
          onSuccess?.();
          onClose();
        } else {
          setErrorMsg('PIN yang dimasukkan salah.');
          triggerShake();
          setPin('');
        }
      } else if (currentMode === 'remove') {
        const ok = await removePin(pin);
        if (ok) {
          onSuccess?.();
          onClose();
        } else {
          setErrorMsg('PIN salah, tidak dapat menghapus proteksi.');
          triggerShake();
          setPin('');
        }
      }
    } catch {
      setErrorMsg('Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activePinString = (currentMode === 'setup' && step === 'confirm') ? confirmPin : pin;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <motion.div
        animate={isShaking ? { x: [-10, 10, -10, 10, -5, 5, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 space-y-5 text-center relative overflow-hidden"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon & Title */}
        <div className="space-y-2 pt-2">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto shadow-xs">
            {currentMode === 'setup' ? <KeyRound className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
          </div>

          <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
            {currentMode === 'setup'
              ? step === 'enter' ? 'Buat PIN Bilik Privasi' : 'Konfirmasi PIN Anda'
              : currentMode === 'remove'
              ? 'Hapus Proteksi PIN'
              : 'Buka Kunci Bilik Pribadi'}
          </h3>

          <p className="text-xs text-slate-500 dark:text-slate-400 px-2">
            {currentMode === 'setup'
              ? step === 'enter'
                ? 'Masukkan 4-6 digit PIN untuk mengunci catatan mood & jurnal emosional Anda.'
                : 'Ketik ulang PIN yang sama untuk memastikan tidak ada kesalahan.'
              : 'Masukkan PIN untuk mengakses catatan mood, skrining, dan riwayat konseling.'}
          </p>
        </div>

        {/* PIN Indicators (Dots) */}
        <div className="flex justify-center items-center gap-3 py-2">
          {[0, 1, 2, 3, 4, 5].map(idx => {
            const isFilled = idx < activePinString.length;
            return (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full border transition-all ${
                  isFilled
                    ? 'bg-teal-600 border-teal-600 scale-110 shadow-xs'
                    : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800'
                }`}
              />
            );
          })}
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="text-xs text-rose-500 font-medium flex items-center justify-center gap-1 animate-fade-in">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Numeric Keypad (1 - 9, Clear, 0, Backspace) */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto pt-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigitPress(num)}
              className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-800/70 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:border-teal-400 border border-slate-200/80 dark:border-slate-750 text-slate-800 dark:text-slate-100 font-bold text-lg active:scale-95 transition-all cursor-pointer shadow-3xs"
            >
              {num}
            </button>
          ))}

          <button
            type="button"
            onClick={handleClear}
            className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 text-slate-500 font-semibold text-xs active:scale-95 transition-all cursor-pointer"
          >
            Hapus
          </button>

          <button
            type="button"
            onClick={() => handleDigitPress('0')}
            className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-800/70 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:border-teal-400 border border-slate-200/80 dark:border-slate-750 text-slate-800 dark:text-slate-100 font-bold text-lg active:scale-95 transition-all cursor-pointer shadow-3xs"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 text-slate-500 font-semibold text-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center"
          >
            ⌫
          </button>
        </div>

        {/* Action Button (Lanjut / Buka) */}
        <div className="pt-2">
          {currentMode === 'setup' && step === 'enter' ? (
            <button
              type="button"
              onClick={handleSetupNext}
              disabled={pin.length < 4}
              className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              Lanjutkan Konfirmasi
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={activePinString.length < 4 || isSubmitting}
              className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>{currentMode === 'setup' ? 'Simpan PIN & Kunci' : 'Buka Bilik Privasi'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
