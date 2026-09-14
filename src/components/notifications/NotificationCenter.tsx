import React, { useState, useEffect } from 'react';
import { X, Bell, Trash2, Shield, Calendar, Award, MessageSquare } from 'lucide-react';
import { getNotifications, saveNotifications, AppNotification } from '../../lib/notificationStore';
import { useEscapeKey } from '../../hooks/useEscapeKey';

import { EmptyState } from '../common/EmptyState';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  useEscapeKey(onClose, isOpen);

  // Sync state initially and listen to updates
  useEffect(() => {
    setNotifications(getNotifications());

    const handleUpdate = () => {
      setNotifications(getNotifications());
    };

    window.addEventListener('ruangtenang_notifications_updated', handleUpdate);
    return () => {
      window.removeEventListener('ruangtenang_notifications_updated', handleUpdate);
    };
  }, []);

  if (!isOpen) return null;

  const filtered = notifications.filter(n => {
    if (activeTab === 'unread') return !n.read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
    saveNotifications(updated);
  };

  const deleteNotification = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    setNotifications(updated);
    saveNotifications(updated);
  };

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    saveNotifications(updated);
  };

  const clearAll = () => {
    setNotifications([]);
    saveNotifications([]);
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHrs = Math.floor(diffMins / 60);

      if (diffMins < 1) return 'Baru saja';
      if (diffMins < 60) return `${diffMins} menit lalu`;
      if (diffHrs < 24) return `${diffHrs} jam lalu`;
      
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end p-0">
      {/* Background overlay click */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer Container */}
      <div className="relative w-full max-w-[380px] surface-card h-full shadow-2xl flex flex-col justify-between border-l border-default animate-slide-right">
        
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-default flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 rounded-xl border border-teal-100 dark:border-teal-900/50">
              <Bell className="w-4 h-4 animate-swing" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-primary">
                Pusat Notifikasi
              </h2>
              <p className="text-[11px] text-secondary">
                {unreadCount > 0 ? `${unreadCount} belum dibaca` : 'Semua pesan sudah dibaca'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-secondary hover:text-primary rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Tutup Pusat Notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="px-3 sm:px-4 py-1.5 surface-muted border-b border-default flex items-center justify-between shrink-0">
          <div className="flex gap-1.5">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center active:scale-[0.98] ${
                activeTab === 'all'
                  ? 'bg-teal-600 text-white shadow-3xs'
                  : 'text-secondary hover:text-primary hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
              }`}
            >
              Semua ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={`px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center active:scale-[0.98] ${
                activeTab === 'unread'
                  ? 'bg-teal-600 text-white shadow-3xs'
                  : 'text-secondary hover:text-primary hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
              }`}
            >
              Belum Dibaca ({unreadCount})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer min-h-[36px] flex items-center"
                title="Tandai Semua Selesai Dibaca"
              >
                Tandai dibaca
              </button>
            )}
            {notifications.length > 0 && unreadCount === 0 && (
              <button
                onClick={clearAll}
                className="text-[11px] font-semibold text-secondary hover:text-rose-600 flex items-center gap-1 cursor-pointer min-h-[36px]"
                title="Bersihkan Semua Notifikasi"
              >
                <Trash2 className="w-3.5 h-3.5" /> Bersihkan
              </button>
            )}
          </div>
        </div>

        {/* Notifications Scroll Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-3.5 space-y-2 custom-scrollbar surface-card">
          {filtered.length === 0 ? (
            <div className="py-12">
              <EmptyState 
                icon="info" 
                title={activeTab === 'unread' ? 'Tidak ada pesan belum dibaca.' : 'Kotak masuk kosong.'} 
                description="Notifikasi mengenai konsultasi dan info penting akan masuk ke sini."
                className="border-none shadow-none"
              />
            </div>
          ) : (
            filtered.map((n) => {
              const Icon = n.type === 'alert' ? Shield : n.type === 'success' ? Award : n.type === 'warning' ? Calendar : MessageSquare;
              return (
                <div
                  key={n.id}
                  onClick={() => !n.read && markAsRead(n.id)}
                  className={`group p-3 rounded-xl border transition-all relative flex gap-2.5 ${
                    n.read
                      ? 'surface-card border-default text-secondary hover:border-slate-300 dark:hover:border-slate-700'
                      : 'bg-teal-50/40 dark:bg-teal-950/20 border-teal-200/70 dark:border-teal-900/60 shadow-3xs text-primary cursor-pointer hover:bg-teal-50/50 dark:hover:bg-teal-950/30'
                  }`}
                >
                  {/* Left Icon Panel */}
                  <div className={`p-1.5 rounded-lg shrink-0 h-8 w-8 flex items-center justify-center ${
                    n.type === 'alert'
                      ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-500'
                      : n.type === 'success'
                      ? 'bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400'
                      : n.type === 'warning'
                      ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-500'
                      : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500'
                  }`}>
                    <Icon className="w-4 h-4 shrink-0" />
                  </div>

                  {/* Body Text */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-start justify-between gap-1.5">
                      <h4 className={`text-xs font-bold leading-snug truncate ${n.read ? 'text-primary opacity-80' : 'text-primary'}`}>
                        {n.title}
                      </h4>
                      <span className="text-[10px] text-secondary font-medium whitespace-nowrap pt-0.5 shrink-0">
                        {formatTime(n.timestamp)}
                      </span>
                    </div>
                    <p className={`text-xs leading-relaxed ${n.read ? 'text-secondary' : 'text-primary/90'}`}>
                      {n.message}
                    </p>
                  </div>

                  {/* Absolute Top Marker dot if unread */}
                  {!n.read && (
                    <span className="absolute top-3 right-3 w-1.5 h-1.5 bg-teal-500 rounded-full" />
                  )}

                  {/* Quick Actions */}
                  <div className="absolute right-2.5 bottom-2.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 flex items-center gap-1 pt-1 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                      className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center text-secondary hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                      title="Hapus"
                      aria-label="Hapus notifikasi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info lock */}
        <div className="p-3 surface-muted border-t border-default text-center shrink-0">
          <p className="text-[10px] text-secondary leading-snug font-medium">
            Notifikasi Anda disimpan secara lokal & privat.
          </p>
        </div>
      </div>
    </div>
  );
};
