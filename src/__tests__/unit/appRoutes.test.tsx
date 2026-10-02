import React from 'react';
import { describe, expect, it } from 'vitest';
import { Chat } from '../../features/chat/types';
import { UserSession } from '../../types';
import { createStudentRoutes } from '../../app/routes/studentRoutes';
import { counselorRoutes } from '../../app/routes/counselorRoutes';

const testUser: UserSession = {
  id: 'route-test-user',
  name: 'Route Test',
  email: 'route-test@example.test',
  role: 'mahasiswa',
  tier: 'Free',
  usageStats: { chatMessagesSent: 0, appointmentsBooked: 0 }
};

function createRouteContext() {
  return {
    user: testUser,
    setUser: () => undefined,
    chats: [] as Chat[],
    setChats: () => undefined,
    selectedCounselor: null,
    setSelectedCounselor: () => undefined,
    onSwitchMode: () => undefined,
    onOpenSidebar: () => undefined,
    onOpenSettings: () => undefined,
    onOpenChangelog: () => undefined,
    onPersisted: () => undefined,
    onTriggerSOS: () => undefined,
    navigate: () => undefined
  };
}

describe('declarative application routes', () => {
  it('preserves student chat, workspace, and feature paths', () => {
    const routes = createStudentRoutes(createRouteContext());
    const paths = new Set(routes.map(route => route.path));

    expect(paths).toEqual(new Set([
      '/', '/c/:chatId', '/workspace', '/workspace/c/:chatId', '/mood', '/mindfulness',
      '/screening', '/counselors', '/counselor-portal', '/counselordashboard', '/emergency', '*'
    ]));
    expect(routes.find(route => route.path === '/workspace')?.mode).toBe('ruangkerja');
    expect(routes.find(route => route.path === '/c/:chatId')?.mode).toBe('ruangtenang');
  });

  it('supports direct counselor URLs and redirects previous entry paths', () => {
    const paths = new Set(counselorRoutes.map(route => route.path));

    expect(paths).toEqual(new Set([
      '/counselor/dashboard', '/counselor/portal', '/counselor', '/',
      '/counselordashboard', '/counselor-portal', '*'
    ]));
    expect(React.isValidElement(counselorRoutes.find(route => route.path === '/counselordashboard')?.element)).toBe(true);
    expect(React.isValidElement(counselorRoutes.find(route => route.path === '/counselor-portal')?.element)).toBe(true);
  });
});
