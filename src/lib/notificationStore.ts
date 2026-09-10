import { safeLocalStorage } from './storage';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'alert';
}

export function getActiveUserId(): string {
  if (typeof window === 'undefined') return 'guest';
  return safeLocalStorage.getItem('rt_active_user_id') || 'guest';
}

export function getNotifications(): AppNotification[] {
  const userId = getActiveUserId();
  const stored = safeLocalStorage.getItem(`ruangtenang_app_notifications_${userId}`);
  if (!stored) {
    return [];
  }
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveNotifications(notifs: AppNotification[]) {
  const userId = getActiveUserId();
  safeLocalStorage.setItem(`ruangtenang_app_notifications_${userId}`, JSON.stringify(notifs));
  // Dispatch a custom event to update other mounted components reactively
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new Event('ruangtenang_notifications_updated'));
    } catch {}
  }
}

export function addNotification(title: string, message: string, type: AppNotification['type'] = 'info') {
  const notifs = getNotifications();
  const newNotif: AppNotification = {
    id: 'n-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    title,
    message,
    timestamp: new Date().toISOString(),
    read: false,
    type
  };
  notifs.unshift(newNotif);
  saveNotifications(notifs);
}
