import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  resolveWorkspaceSessionDir,
  resolveSafeWorkspacePath,
  ensureCoderWorkspaceInitialized
} from '../../services/coder/coderAgentService.js';

describe('Coder Multi-Project & File Operations', () => {
  const testSessionId = `test-proj-${Date.now()}`;
  let sessionDir: string;

  beforeEach(async () => {
    sessionDir = resolveWorkspaceSessionDir(testSessionId);
    await ensureCoderWorkspaceInitialized(sessionDir);
  });

  afterEach(async () => {
    try {
      await fs.rm(sessionDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('resolves isolated project workspace directory properly', () => {
    expect(sessionDir).toContain('sessions');
    expect(sessionDir).toContain(testSessionId);
  });

  it('allows safe subfolder creation (mkdir) inside session sandbox', async () => {
    const subfolderPath = resolveSafeWorkspacePath('src/components', sessionDir);
    await fs.mkdir(subfolderPath, { recursive: true });

    const exists = await fs.stat(subfolderPath).then(s => s.isDirectory()).catch(() => false);
    expect(exists).toBe(true);
  });

  it('allows safe file rename operations within sandbox', async () => {
    const oldPath = resolveSafeWorkspacePath('temp.txt', sessionDir);
    const newPath = resolveSafeWorkspacePath('renamed.txt', sessionDir);

    await fs.writeFile(oldPath, 'hello world', 'utf-8');
    await fs.rename(oldPath, newPath);

    const oldExists = await fs.stat(oldPath).catch(() => false);
    const newContent = await fs.readFile(newPath, 'utf-8');

    expect(oldExists).toBe(false);
    expect(newContent).toBe('hello world');
  });

  it('blocks path traversal attacks attempting to escape session sandbox', () => {
    expect(() => {
      resolveSafeWorkspacePath('../../secrets.json', sessionDir);
    }).toThrow(/di luar sandbox/);
  });
});
