import Dexie, { type Table } from 'dexie';
import { encryptData, decryptData } from './clientCrypto';

export interface EncryptedRecord {
  id: string;
  encryptedData: string;
  updatedAt: string;
}

export interface OutboxItem {
  id?: number;
  type: 'mood_log' | 'journal_entry' | 'screening_result' | 'appointment';
  url: string;
  payload: any;
  createdAt: string;
}

// Volatile memory stores for current tab/session
// memoryCipherStore: retains valid AES-GCM ciphertext in memory
const memoryCipherStore = new Map<string, string>();
// memoryVolatilePlaintextStore: volatile RAM-only fallback when WebCrypto is unavailable; NEVER persisted to disk
const memoryVolatilePlaintextStore = new Map<string, string>();

function isIndexedDBAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
  } catch {
    return false;
  }
}

class ClientIndexedDB {
  private db: Dexie | null = null;
  private encryptedStore: Table<EncryptedRecord> | null = null;
  public outboxQueue: Table<OutboxItem> | null = null;

  constructor() {
    if (isIndexedDBAvailable()) {
      try {
        this.db = new Dexie('RuangTenangClientDB');
        this.db.version(1).stores({
          encryptedStore: 'id, updatedAt'
        });
        this.db.version(2).stores({
          encryptedStore: 'id, updatedAt',
          outboxQueue: '++id, type, createdAt'
        });
        this.encryptedStore = this.db.table('encryptedStore');
        this.outboxQueue = this.db.table('outboxQueue');
      } catch (e) {
        console.warn('Dexie schema init warning:', e);
        this.db = null;
        this.encryptedStore = null;
        this.outboxQueue = null;
      }
    }
  }

  /**
   * Encrypts and persists data using AES-GCM.
   * If WebCrypto is unavailable or fails, data is retained strictly in volatile session RAM
   * and NEVER written to persistent storage (fail-closed persistence).
   */
  async saveEncrypted(id: string, plaintext: string): Promise<void> {
    try {
      const encryptedData = await encryptData(plaintext);
      memoryCipherStore.set(id, encryptedData);
      memoryVolatilePlaintextStore.delete(id);

      if (this.encryptedStore) {
        await this.encryptedStore.put({
          id,
          encryptedData,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (e: any) {
      console.warn('[CLIENT_DB] WebCrypto unavailable or encryption failed. Storing in volatile session memory only:', e?.message || e);
      // Strictly volatile memory-only fallback: NEVER write plaintext or fb64 to IndexedDB or localStorage
      memoryVolatilePlaintextStore.set(id, plaintext);
      memoryCipherStore.delete(id);
    }
  }

  async getDecrypted(id: string): Promise<string | null> {
    // 1. Check volatile plaintext RAM fallback first
    if (memoryVolatilePlaintextStore.has(id)) {
      return memoryVolatilePlaintextStore.get(id) || null;
    }

    // 2. Check in-memory ciphertext cache
    let encryptedData: string | undefined = memoryCipherStore.get(id);

    // 3. Fallback to IndexedDB persistent store
    if (!encryptedData && this.encryptedStore) {
      try {
        const record = await this.encryptedStore.get(id);
        if (record) {
          encryptedData = record.encryptedData;
        }
      } catch (err) {
        console.warn(`clientDb get error for record ${id}:`, err);
      }
    }

    if (!encryptedData) return null;

    try {
      return await decryptData(encryptedData);
    } catch (err) {
      console.warn(`Failed to decrypt record: ${id}`, err);
      return null;
    }
  }

  async deleteRecord(id: string): Promise<void> {
    memoryCipherStore.delete(id);
    memoryVolatilePlaintextStore.delete(id);
    if (this.encryptedStore) {
      try {
        await this.encryptedStore.delete(id);
      } catch (err) {
        console.warn(`clientDb delete error:`, err);
      }
    }
  }

  /**
   * Add a pending payload to the offline outbox queue
   */
  async addToOutbox(type: OutboxItem['type'], url: string, payload: any): Promise<void> {
    if (this.outboxQueue) {
      try {
        await this.outboxQueue.add({
          type,
          url,
          payload,
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Failed to queue item in outbox:', err);
      }
    }
  }

  /**
   * Retrieve all items from the offline outbox queue
   */
  async getOutboxItems(): Promise<OutboxItem[]> {
    if (!this.outboxQueue) return [];
    try {
      return await this.outboxQueue.toArray();
    } catch {
      return [];
    }
  }

  /**
   * Process and sync pending offline items when connection is restored
   */
  async processOutboxQueue(apiClientInstance: any): Promise<number> {
    if (!this.outboxQueue) return 0;
    try {
      const items = await this.outboxQueue.toArray();
      if (items.length === 0) return 0;

      let syncedCount = 0;
      for (const item of items) {
        if (!item.id) continue;
        try {
          const res = await apiClientInstance.post(item.url, item.payload);
          if (res && (res.success || res.status < 400)) {
            await this.outboxQueue.delete(item.id);
            syncedCount++;
          }
        } catch (err) {
          console.warn(`Outbox item ${item.id} sync attempt failed:`, err);
        }
      }
      return syncedCount;
    } catch (e) {
      console.warn('Error processing outbox queue:', e);
      return 0;
    }
  }

  /**
   * Clears volatile in-memory session caches upon user logout or session termination
   */
  clearAllMemory(): void {
    memoryCipherStore.clear();
    memoryVolatilePlaintextStore.clear();
  }
}

export const clientDb = new ClientIndexedDB();
