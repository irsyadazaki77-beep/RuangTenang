import React, { useState } from 'react';
import { Lock, Unlock, KeyRound, AlertCircle, X, RefreshCw, ShieldCheck, Clock } from 'lucide-react';
import { usePrivacyVault } from '../../contexts/PrivacyVaultContext';
import { motion } from 'motion/react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

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
  const {
    isVaultConfigured,
    setupPin,
    unlockVault,
    removePin,
    verifyPinDetailed,
    isLockedOut,
    lockoutSecondsRemaining
  } = usePrivacyVault();

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const modalRef = useFocusTrap<HTMLDivElement>({ isOpen, onClose });

  if (!isOpen) return null;

  const currentMode = !isVaultConfigured && mode === 'unlock' ? 'setup' : mode;

  const handleDigitPress = (digit: string) => {
    if (isLockedOut) return;
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
    if (isLockedOut) return;
    setErrorMsg(null);
    if (currentMode === 'setup' && step === 'confirm') {
      setConfirmPin(prev => prev.slice(0, -1));
    } else {
      setPin(prev => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    if (isLockedOut) return;
    setPin('');
    setConfirmPin('');
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
    if (isLockedOut) {
      setErrorMsg(`Brankas terkunci sementara demi keamanan (${lockoutSecondsRemaining} detik).`);
      triggerShake();
      return;
    }

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
        const result = await verifyPinDetailed(pin);
        if (result.valid) {
          await unlockVault(pin);
          onSuccess?.();
          onClose();
        } else if (result.isLockedOut) {
          setErrorMsg(`Terlalu banyak percobaan salah. Brankas terkunci selama ${result.remainingSeconds || lockoutSecondsRemaining} detik.`);
          triggerShake();
          setPin('');
        } else {
          const attemptsLeft = result.remainingAttempts ?? 0;
          const attemptText = attemptsLeft > 0 ? ` (Sisa ${attemptsLeft}x sebelum terkunci)` : '';
          setErrorMsg(`PIN yang dimasukkan salah.${attemptText}`);
          triggerShake();
          setPin('');
        }
      } else if (currentMode === 'remove') {
        const result = await verifyPinDetailed(pin);
        if (result.valid) {
          await removePin(pin);
          onSuccess?.();
          onClose();
        } else if (result.isLockedOut) {
          setErrorMsg(`Brankas terkunci selama ${result.remainingSeconds || lockoutSecondsRemaining} detik.`);
          triggerShake();
          setPin('');
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vault-pin-title"
        aria-describedby="vault-pin-desc"
        animate={isShaking ? { x: [-10, 10, -10, 10, -5, 5, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4 text-center relative overflow-hidden focus:outline-none"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Tutup formulir PIN"
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon & Title */}
        <div className="space-y-1.5 pt-1">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto shadow-xs">
            {currentMode === 'setup' ? <KeyRound className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
          </div>

          <h3 id="vault-pin-title" className="font-bold text-lg text-slate-900 dark:text-slate-100">
            {currentMode === 'setup'
              ? step === 'enter' ? 'Buat PIN Bilik Privasi' : 'Konfirmasi PIN Anda'
              : currentMode === 'remove'
              ? 'Hapus Proteksi PIN'
              : 'Buka Kunci Bilik Pribadi'}
          </h3>

          <p id="vault-pin-desc" className="text-xs text-slate-500 dark:text-slate-400 px-2 leading-relaxed">
            {currentMode === 'setup'
              ? step === 'enter'
                ? 'Masukkan 4-6 digit PIN untuk mengunci catatan mood & jurnal emosional Anda.'
                : 'Ketik ulang PIN yang sama untuk memastikan tidak ada kesalahan.'
              : 'Masukkan PIN untuk mengakses catatan mood, skrining, dan riwayat konseling.'}
          </p>
        </div>

        {/* Lockout Warning Banner */}
        {isLockedOut && (
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 rounded-2xl text-xs flex items-center justify-center gap-2 font-medium animate-pulse">
            <Clock className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>Terkunci sementara: <strong className="font-mono">{lockoutSecondsRemaining}s</strong></span>
          </div>
        )}

        {/* PIN Indicators (Dots) */}
        <div className="flex justify-center items-center gap-3 py-1">
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
        {errorMsg && !isLockedOut && (
          <div className="text-xs text-rose-500 font-medium flex items-center justify-center gap-1 animate-fade-in">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Numeric Keypad (1 - 9, Clear, 0, Backspace) */}
        <div className={`grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto pt-1 ${isLockedOut ? 'opacity-40 pointer-events-none' : ''}`}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              type="button"
              disabled={isLockedOut}
              onClick={() => handleDigitPress(num)}
              className="h-11 rounded-2xl bg-slate-50 dark:bg-slate-800/70 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:border-teal-400 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold text-lg active:scale-95 transition-all cursor-pointer shadow-3xs disabled:cursor-not-allowed"
            >
              {num}
            </button>
          ))}

          <button
            type="button"
            disabled={isLockedOut}
            onClick={handleClear}
            aria-label="Hapus semua digit PIN"
            className="h-11 rounded-2xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 text-slate-500 font-semibold text-xs active:scale-95 transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            Hapus
          </button>

          <button
            type="button"
            disabled={isLockedOut}
            onClick={() => handleDigitPress('0')}
            className="h-11 rounded-2xl bg-slate-50 dark:bg-slate-800/70 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:border-teal-400 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold text-lg active:scale-95 transition-all cursor-pointer shadow-3xs disabled:cursor-not-allowed"
          >
            0
          </button>

          <button
            type="button"
            disabled={isLockedOut}
            onClick={handleDelete}
            aria-label="Hapus satu digit PIN"
            className="h-11 rounded-2xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 text-slate-500 font-semibold text-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center disabled:cursor-not-allowed"
          >
            ⌫
          </button>
        </div>

        {/* Action Button (Lanjut / Buka) */}
        <div className="pt-1">
          {currentMode === 'setup' && step === 'enter' ? (
            <button
              type="button"
              onClick={handleSetupNext}
              disabled={pin.length < 4 || isLockedOut}
              className="w-full py-2.5 rounded-2xl bg-teal-700 hover:bg-teal-800 disabled:opacity-40 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              Lanjutkan Konfirmasi
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={activePinString.length < 4 || isSubmitting || isLockedOut}
              className="w-full py-2.5 rounded-2xl bg-teal-700 hover:bg-teal-800 disabled:opacity-40 text-white font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
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

        {/* Security Reassurance Footnote */}
        <div className="pt-1 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>Derivasi Kunci PBKDF2 100.000 putaran • Bebas Cloud</span>
        </div>
      </motion.div>
    </div>
  );
};
