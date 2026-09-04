export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'alert';
}

export function getNotifications(): AppNotification[] {
  const stored = localStorage.getItem('ruangtenang_app_notifications');
  if (!stored) {
    const initial: AppNotification[] = [];
    localStorage.setItem('ruangtenang_app_notifications', JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveNotifications(notifs: AppNotification[]) {
  localStorage.setItem('ruangtenang_app_notifications', JSON.stringify(notifs));
  // Dispatch a custom event to update other mounted components reactively
  window.dispatchEvent(new Event('ruangtenang_notifications_updated'));
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
