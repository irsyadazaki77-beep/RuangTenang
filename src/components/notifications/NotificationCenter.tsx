import React, { useState, useEffect } from 'react';
import { X, Bell, Check, Trash2, Shield, Calendar, Award, MessageSquare } from 'lucide-react';
import { getNotifications, saveNotifications, AppNotification, AppNotification as NotificationType } from '../../lib/notificationStore';
import { useEscapeKey } from '../../hooks/useEscapeKey';

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
      <div className="relative w-full max-w-[380px] bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col justify-between border-l border-slate-100 dark:border-slate-800 animate-slide-right">
        
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 rounded-lg">
              <Bell className="w-4 h-4 animate-swing" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Pusat Notifikasi
              </h2>
              <p className="text-[10.5px] text-slate-500">
                {unreadCount > 0 ? `${unreadCount} belum dibaca` : 'Semua pesan sudah dibaca'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="px-3.5 sm:px-4 py-2 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between shrink-0">
          <div className="flex gap-1.5">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-teal-600 text-white shadow-3xs'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Semua ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                activeTab === 'unread'
                  ? 'bg-teal-600 text-white shadow-3xs'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Belum Dibaca ({unreadCount})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[10.5px] font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                title="Tandai Semua Selesai Dibaca"
              >
                Tandai dibaca
              </button>
            )}
            {notifications.length > 0 && unreadCount === 0 && (
              <button
                onClick={clearAll}
                className="text-[10.5px] font-bold text-slate-400 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                title="Bersihkan Semua Notifikasi"
              >
                <Trash2 className="w-3 h-3" /> Bersihkan
              </button>
            )}
          </div>
        </div>

        {/* Notifications Scroll Area */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2.5 custom-scrollbar bg-white dark:bg-slate-900">
          {filtered.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center space-y-2.5">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-full border border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-600">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <p className="text-slate-600 dark:text-slate-400 font-medium text-xs sm:text-sm">
                  {activeTab === 'unread' ? 'Tidak ada pesan belum dibaca.' : 'Kotak masuk kosong.'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Notifikasi mengenai konsultasi dan info penting akan masuk ke sini.
                </p>
              </div>
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
                      ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500'
                      : 'bg-teal-50/20 dark:bg-teal-950/10 border-teal-100/60 dark:border-teal-900/60 shadow-3xs text-slate-800 dark:text-slate-200 cursor-pointer hover:bg-teal-50/30 dark:hover:bg-teal-950/20'
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
                      <h4 className={`text-xs font-bold leading-snug truncate ${n.read ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-slate-100'}`}>
                        {n.title}
                      </h4>
                      <span className="text-[9.5px] text-slate-400 font-medium whitespace-nowrap pt-0.5 shrink-0">
                        {formatTime(n.timestamp)}
                      </span>
                    </div>
                    <p className={`text-xs leading-relaxed ${n.read ? 'text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-400'}`}>
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
                      className="p-1.5 min-h-[32px] min-w-[32px] sm:min-h-0 sm:min-w-0 flex items-center justify-center text-slate-400 hover:text-rose-500 rounded-md transition-colors cursor-pointer"
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
        <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-center shrink-0">
          <p className="text-[9.5px] text-slate-400 leading-snug font-medium">
            Notifikasi Anda disimpan secara lokal & aman demi privasi data medis mahasiswa.
          </p>
        </div>
      </div>
    </div>
  );
};
