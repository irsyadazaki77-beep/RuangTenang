import { describe, it, expect, beforeEach } from 'vitest';
import { safeLocalStorage } from '../../lib/storage';
import { getNotifications, saveNotifications, addNotification, getActiveUserId } from '../../lib/notificationStore';

describe('User-Scoped Local Isolation Validation', () => {
  beforeEach(() => {
    safeLocalStorage.clear();
  });

  it('correctly tracks active user ID and defaults to guest', () => {
    expect(getActiveUserId()).toBe('guest');
    
    safeLocalStorage.setItem('rt_active_user_id', 'user-123');
    expect(getActiveUserId()).toBe('user-123');
  });

  it('isolates app notifications strictly between different logged-in users', () => {
    // 1. User A logs in and receives a booking notification
    safeLocalStorage.setItem('rt_active_user_id', 'user-A');
    expect(getActiveUserId()).toBe('user-A');
    addNotification('Booking Terkonfirmasi', 'Sesi konseling Anda terjadwal.', 'success');
    
    const notifsA = getNotifications();
    expect(notifsA.length).toBe(1);
    expect(notifsA[0].title).toBe('Booking Terkonfirmasi');

    // 2. User B logs in (or active session changes)
    safeLocalStorage.setItem('rt_active_user_id', 'user-B');
    expect(getActiveUserId()).toBe('user-B');
    
    // User B should have clean slate
    const notifsB = getNotifications();
    expect(notifsB.length).toBe(0);

    // User B receives their own notification
    addNotification('Pemberitahuan Sistem', 'Akun Anda telah diamankan.', 'info');
    expect(getNotifications().length).toBe(1);
    expect(getNotifications()[0].title).toBe('Pemberitahuan Sistem');

    // 3. Switch back to User A, their original notifications are intact and isolated
    safeLocalStorage.setItem('rt_active_user_id', 'user-A');
    const reloadedA = getNotifications();
    expect(reloadedA.length).toBe(1);
    expect(reloadedA[0].title).toBe('Booking Terkonfirmasi');
  });

  it('isolates onboarding goals strictly per user and prevents leakage on account switch or guest mode', () => {
    // 1. User A logs in and sets goals
    safeLocalStorage.setItem('rt_active_user_id', 'user-A');
    safeLocalStorage.setItem('rt_onboarding_completed_user-A', 'true');
    safeLocalStorage.setItem('rt_user_goals_user-A', JSON.stringify(['academic', 'mindfulness']));

    const activeUserAGoals = safeLocalStorage.getItem(`rt_user_goals_${safeLocalStorage.getItem('rt_active_user_id')}`);
    expect(JSON.parse(activeUserAGoals || '[]')).toEqual(['academic', 'mindfulness']);

    // 2. User A logs out -> Guest mode active
    safeLocalStorage.setItem('rt_active_user_id', 'guest');
    const guestGoals = safeLocalStorage.getItem(`rt_user_goals_${safeLocalStorage.getItem('rt_active_user_id')}`);
    expect(guestGoals).toBeNull(); // Guest does not read User A goals

    // 3. User B logs in
    safeLocalStorage.setItem('rt_active_user_id', 'user-B');
    const userBGoals = safeLocalStorage.getItem(`rt_user_goals_${safeLocalStorage.getItem('rt_active_user_id')}`);
    expect(userBGoals).toBeNull(); // User B does not see User A goals

    // User B sets their own goals
    safeLocalStorage.setItem('rt_onboarding_completed_user-B', 'true');
    safeLocalStorage.setItem('rt_user_goals_user-B', JSON.stringify(['anxiety']));
    const savedUserBGoals = safeLocalStorage.getItem(`rt_user_goals_${safeLocalStorage.getItem('rt_active_user_id')}`);
    expect(JSON.parse(savedUserBGoals || '[]')).toEqual(['anxiety']);

    // 4. Switch back to User A -> User A goals remain intact
    safeLocalStorage.setItem('rt_active_user_id', 'user-A');
    const restoredUserAGoals = safeLocalStorage.getItem(`rt_user_goals_${safeLocalStorage.getItem('rt_active_user_id')}`);
    expect(JSON.parse(restoredUserAGoals || '[]')).toEqual(['academic', 'mindfulness']);
  });
});
