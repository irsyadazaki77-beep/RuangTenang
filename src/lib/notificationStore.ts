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
    // Initial notifications for a warm first-time experience
    const initial: AppNotification[] = [
      {
        id: 'n-1',
        title: 'Selamat Datang di RuangTenang! 🌟',
        message: 'Tempat aman untuk menjaga kesehatan mental Anda selama perkuliahan.',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
        read: false,
        type: 'info'
      },
      {
        id: 'n-2',
        title: 'Daily Check-in Aktif 📝',
        message: 'Ayo luangkan waktu 30 detik untuk mencatat mood Anda hari ini di tab Chat.',
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago
        read: true,
        type: 'success'
      }
    ];
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
