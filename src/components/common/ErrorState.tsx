import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle, WifiOff, Clock, ShieldAlert, ServerCrash, RefreshCw } from 'lucide-react';

export type ErrorType = 'network' | 'timeout' | 'unauthorized' | 'not-found' | 'rate-limit' | 'server' | 'unknown';

interface ErrorStateProps {
  type?: ErrorType;
  title?: string;
  description?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

const errorConfig = {
  network: {
    icon: WifiOff,
    title: 'Koneksi Terputus',
    description: 'Sepertinya kamu sedang offline atau koneksi tidak stabil. Periksa jaringanmu dan coba lagi.',
  },
  timeout: {
    icon: Clock,
    title: 'Permintaan Waktu Habis',
    description: 'Server butuh waktu terlalu lama untuk merespons. Silakan coba beberapa saat lagi.',
  },
  unauthorized: {
    icon: ShieldAlert,
    title: 'Akses Ditolak',
    description: 'Kamu tidak memiliki izin untuk melihat halaman ini atau sesi kamu telah berakhir.',
  },
  'not-found': {
    icon: AlertCircle,
    title: 'Tidak Ditemukan',
    description: 'Data atau halaman yang kamu cari tidak dapat ditemukan.',
  },
  'rate-limit': {
    icon: Clock,
    title: 'Terlalu Banyak Permintaan',
    description: 'Kamu mengirim terlalu banyak permintaan. Tunggu sebentar sebelum mencoba lagi.',
  },
  server: {
    icon: ServerCrash,
    title: 'Gangguan Server',
    description: 'Terjadi masalah pada server kami. Tim kami sedang menanganinya.',
  },
  unknown: {
    icon: AlertCircle,
    title: 'Terjadi Kesalahan',
    description: 'Terjadi kesalahan yang tidak terduga. Silakan coba lagi.',
  },
};

export function ErrorState({
  type = 'unknown',
  title,
  description,
  onRetry,
  isRetrying = false,
  className = '',
}: ErrorStateProps) {
  const config = errorConfig[type] || errorConfig.unknown;
  const Icon = config.icon;
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`flex flex-col items-center justify-center p-8 text-center bg-red-50/50 dark:bg-red-950/20 rounded-2xl border border-red-100 dark:border-red-900/30 ${className}`}
    >
      <div className="w-12 h-12 mb-4 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-500 dark:text-red-400">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">{displayTitle}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
        {displayDescription}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
          {isRetrying ? 'Mencoba lagi...' : 'Coba Lagi'}
        </button>
      )}
    </motion.div>
  );
}
