import type { WorkspaceMode } from '../types';

export function getWorkspaceModeFromPath(pathname: string): WorkspaceMode {
  if (pathname === '/coder' || pathname.startsWith('/coder/') || pathname === '/ruang-coder' || pathname.startsWith('/ruang-coder/')) {
    return 'RUANG_CODER';
  }
  return pathname === '/workspace' || pathname.startsWith('/workspace/')
    ? 'RUANG_KERJA'
    : 'RUANG_TENANG';
}

export function getChatIdFromPath(pathname: string): string | undefined {
  const match = pathname.match(/^\/(?:workspace\/)?c\/([^/]+)\/?$/);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

export function getModeHomePath(mode: WorkspaceMode): '/workspace' | '/coder' | '/' {
  if (mode === 'RUANG_CODER') return '/coder';
  return mode === 'RUANG_KERJA' ? '/workspace' : '/';
}

export function getModeChatPath(mode: WorkspaceMode, chatId: string): string {
  if (mode === 'RUANG_CODER') return '/coder';
  return mode === 'RUANG_KERJA'
    ? `/workspace/c/${encodeURIComponent(chatId)}`
    : `/c/${encodeURIComponent(chatId)}`;
}
