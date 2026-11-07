import { describe, it, expect, beforeEach } from 'vitest';
import {
  initVirtualFsStorage,
  getAllVirtualFiles,
  saveVirtualFile,
  deleteVirtualFile,
  renameVirtualFile,
  duplicateVirtualFile,
  resetVirtualFiles
} from '../../features/coder/services/virtualFsStorage';

describe('VirtualFsStorage (Dexie / Memory Fallback)', () => {
  const starters = {
    'index.html': '<h1>Test App</h1>',
    'styles.css': 'body { margin: 0; }',
    'app.js': 'console.log("hello");'
  };

  beforeEach(async () => {
    await resetVirtualFiles(starters);
  });

  it('initializes and seeds starter files', async () => {
    const files = await initVirtualFsStorage(starters);
    expect(files['index.html']).toBe('<h1>Test App</h1>');
    expect(files['styles.css']).toBe('body { margin: 0; }');
  });

  it('saves and reads virtual files', async () => {
    await saveVirtualFile('hello.ts', 'const x: number = 42;');
    const all = await getAllVirtualFiles();
    expect(all['hello.ts']).toBe('const x: number = 42;');
  });

  it('renames virtual files', async () => {
    await saveVirtualFile('old.js', 'console.log("old");');
    await renameVirtualFile('old.js', 'new.js');
    const all = await getAllVirtualFiles();
    expect(all['old.js']).toBeUndefined();
    expect(all['new.js']).toBe('console.log("old");');
  });

  it('duplicates virtual files', async () => {
    await saveVirtualFile('component.jsx', '<div>Card</div>');
    await duplicateVirtualFile('component.jsx', 'component-copy.jsx');
    const all = await getAllVirtualFiles();
    expect(all['component.jsx']).toBe('<div>Card</div>');
    expect(all['component-copy.jsx']).toBe('<div>Card</div>');
  });

  it('deletes virtual files', async () => {
    await saveVirtualFile('temp.txt', 'temporary');
    await deleteVirtualFile('temp.txt');
    const all = await getAllVirtualFiles();
    expect(all['temp.txt']).toBeUndefined();
  });
});
