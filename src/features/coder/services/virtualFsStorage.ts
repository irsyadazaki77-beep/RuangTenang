import Dexie, { type Table } from 'dexie';

export interface VirtualFileRecord {
  path: string;
  content: string;
  updatedAt: number;
  size: number;
}

const BROWSER_SANDBOX_LEGACY_KEY = 'ruangcoder_browser_virtual_files_v2';
const inMemoryCache: Record<string, string> = {};

class RuangCoderDatabase extends Dexie {
  files!: Table<VirtualFileRecord, string>;

  constructor() {
    super('RuangCoderVirtualDB');
    this.version(1).stores({
      files: '&path, updatedAt, size'
    });
  }
}

let dbInstance: RuangCoderDatabase | null = null;

function isIndexedDBAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function getDb(): RuangCoderDatabase | null {
  if (!isIndexedDBAvailable()) return null;
  if (!dbInstance) {
    dbInstance = new RuangCoderDatabase();
  }
  return dbInstance;
}

/**
 * Initializes virtual filesystem storage, performing a one-time migration
 * from legacy localStorage if present.
 */
export async function initVirtualFsStorage(defaultFiles: Record<string, string>): Promise<Record<string, string>> {
  const db = getDb();
  if (!db) {
    Object.assign(inMemoryCache, defaultFiles);
    return { ...inMemoryCache };
  }

  try {
    const count = await db.files.count();

    if (count === 0) {
      let filesToSeed: Record<string, string> = { ...defaultFiles };
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const raw = window.localStorage.getItem(BROWSER_SANDBOX_LEGACY_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
              filesToSeed = parsed;
            }
          }
        } catch {
          // ignore corrupted legacy storage
        }
      }

      const now = Date.now();
      const records: VirtualFileRecord[] = Object.entries(filesToSeed).map(([path, content]) => ({
        path,
        content,
        updatedAt: now,
        size: content.length
      }));

      await db.files.bulkPut(records);
      Object.assign(inMemoryCache, filesToSeed);
      return filesToSeed;
    }

    return await getAllVirtualFiles();
  } catch (err) {
    console.warn('[RuangCoder] IndexedDB init fallback to memory/starter files:', err);
    Object.assign(inMemoryCache, defaultFiles);
    return { ...defaultFiles };
  }
}

/**
 * Retrieve all virtual files as a path -> content map.
 */
export async function getAllVirtualFiles(): Promise<Record<string, string>> {
  const db = getDb();
  if (!db) return { ...inMemoryCache };

  try {
    const records = await db.files.toArray();
    const map: Record<string, string> = {};
    for (const r of records) {
      map[r.path] = r.content;
    }
    Object.assign(inMemoryCache, map);
    return map;
  } catch (err) {
    console.warn('[RuangCoder] Failed to fetch virtual files from IndexedDB:', err);
    return { ...inMemoryCache };
  }
}

/**
 * Save or update a single virtual file in IndexedDB.
 */
export async function saveVirtualFile(filePath: string, content: string): Promise<void> {
  const cleaned = filePath.trim().replace(/^[/\\]+/, '');
  if (!cleaned) return;
  inMemoryCache[cleaned] = content;

  const db = getDb();
  if (!db) return;

  try {
    await db.files.put({
      path: cleaned,
      content,
      updatedAt: Date.now(),
      size: content.length
    });
  } catch (err) {
    console.warn(`[RuangCoder] Failed to save virtual file "${cleaned}":`, err);
  }
}

/**
 * Delete a virtual file from IndexedDB.
 */
export async function deleteVirtualFile(filePath: string): Promise<void> {
  const cleaned = filePath.trim().replace(/^[/\\]+/, '');
  if (!cleaned) return;
  delete inMemoryCache[cleaned];

  const db = getDb();
  if (!db) return;

  try {
    await db.files.delete(cleaned);
  } catch (err) {
    console.warn(`[RuangCoder] Failed to delete virtual file "${cleaned}":`, err);
  }
}

/**
 * Rename a virtual file in IndexedDB.
 */
export async function renameVirtualFile(oldPath: string, newPath: string): Promise<void> {
  const oldCleaned = oldPath.trim().replace(/^[/\\]+/, '');
  const newCleaned = newPath.trim().replace(/^[/\\]+/, '');
  if (!oldCleaned || !newCleaned || oldCleaned === newCleaned) return;

  const oldContent = inMemoryCache[oldCleaned] ?? '';
  delete inMemoryCache[oldCleaned];
  inMemoryCache[newCleaned] = oldContent;

  const db = getDb();
  if (!db) return;

  try {
    const record = await db.files.get(oldCleaned);
    const content = record ? record.content : oldContent;

    await db.transaction('rw', db.files, async () => {
      await db.files.delete(oldCleaned);
      await db.files.put({
        path: newCleaned,
        content,
        updatedAt: Date.now(),
        size: content.length
      });
    });
  } catch (err) {
    console.warn(`[RuangCoder] Failed to rename virtual file "${oldCleaned}" to "${newCleaned}":`, err);
  }
}

/**
 * Duplicate a virtual file in IndexedDB.
 */
export async function duplicateVirtualFile(sourcePath: string, targetPath: string): Promise<void> {
  const src = sourcePath.trim().replace(/^[/\\]+/, '');
  const target = targetPath.trim().replace(/^[/\\]+/, '');
  if (!src || !target || src === target) return;

  const content = inMemoryCache[src] ?? '';
  inMemoryCache[target] = content;

  const db = getDb();
  if (!db) return;

  try {
    const record = await db.files.get(src);
    const fileContent = record ? record.content : content;
    await db.files.put({
      path: target,
      content: fileContent,
      updatedAt: Date.now(),
      size: fileContent.length
    });
  } catch (err) {
    console.warn(`[RuangCoder] Failed to duplicate virtual file "${src}":`, err);
  }
}

/**
 * Reset all virtual files to starter template.
 */
export async function resetVirtualFiles(starterFiles: Record<string, string>): Promise<Record<string, string>> {
  for (const k of Object.keys(inMemoryCache)) {
    delete inMemoryCache[k];
  }
  Object.assign(inMemoryCache, starterFiles);

  const db = getDb();
  if (!db) return { ...starterFiles };

  try {
    await db.files.clear();
    const now = Date.now();
    const records: VirtualFileRecord[] = Object.entries(starterFiles).map(([path, content]) => ({
      path,
      content,
      updatedAt: now,
      size: content.length
    }));
    await db.files.bulkPut(records);
    return { ...starterFiles };
  } catch (err) {
    console.warn('[RuangCoder] Failed to reset virtual files:', err);
    return { ...starterFiles };
  }
}
