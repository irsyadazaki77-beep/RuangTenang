import { describe, expect, it } from 'vitest';
import {
  getChatIdFromPath,
  getModeChatPath,
  getModeHomePath,
  getWorkspaceModeFromPath
} from '../../features/workspace/utils/workspaceRouting';

describe('workspace route source of truth', () => {
  it.each([
    ['/', 'RUANG_TENANG'],
    ['/c/123', 'RUANG_TENANG'],
    ['/workspace', 'RUANG_KERJA'],
    ['/workspace/c/123', 'RUANG_KERJA'],
    ['/workspace/c/123/artifact', 'RUANG_KERJA']
  ] as const)('maps %s to %s', (path, mode) => {
    expect(getWorkspaceModeFromPath(path)).toBe(mode);
  });

  it.each([
    ['/', undefined],
    ['/c/abc', 'abc'],
    ['/workspace', undefined],
    ['/workspace/c/abc', 'abc'],
    ['/workspace/c/a%20b', 'a b'],
    ['/workspace/c/abc/nested', undefined]
  ] as const)('extracts chat ID from %s', (path, chatId) => {
    expect(getChatIdFromPath(path)).toBe(chatId);
  });

  it('builds navigation paths for the current mode', () => {
    expect(getModeHomePath('RUANG_KERJA')).toBe('/workspace');
    expect(getModeHomePath('RUANG_TENANG')).toBe('/');
    expect(getModeChatPath('RUANG_KERJA', 'a b')).toBe('/workspace/c/a%20b');
    expect(getModeChatPath('RUANG_TENANG', 'a b')).toBe('/c/a%20b');
  });
});
