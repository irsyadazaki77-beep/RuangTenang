import Dexie, { type Table } from 'dexie';
import { encryptData, decryptData } from './clientCrypto';

export interface EncryptedRecord {
  id: string;
  encryptedData: string;
  updatedAt: string;
}

const memoryStore = new Map<string, string>();

function isIndexedDBAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
  } catch(e) {
    return false;
  }
}

class ClientIndexedDB {
  private db: Dexie | null = null;
  private encryptedStore: Table<EncryptedRecord> | null = null;

  constructor() {
    if (isIndexedDBAvailable()) {
      try {
        this.db = new Dexie('RuangTenangClientDB');
        this.db.version(1).stores({
          encryptedStore: 'id, updatedAt'
        });
        this.encryptedStore = this.db.table('encryptedStore');
      } catch (e) {
        console.warn('Dexie schema init warning:', e);
        this.db = null;
        this.encryptedStore = null;
      }
    }
  }

  async saveEncrypted(id: string, plaintext: string): Promise<void> {
    try {
      const encryptedData = await encryptData(plaintext);
      memoryStore.set(id, encryptedData);
      if (this.encryptedStore) {
        await this.encryptedStore.put({
          id,
          encryptedData,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (e) {
      console.warn('clientDb saveEncrypted fallback to memory:', e);
      try {
        const encryptedData = await encryptData(plaintext);
        memoryStore.set(id, encryptedData);
      } catch {}
    }
  }

  async getDecrypted(id: string): Promise<string | null> {
    let encryptedData: string | undefined = memoryStore.get(id);

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
    memoryStore.delete(id);
    if (this.encryptedStore) {
      try {
        await this.encryptedStore.delete(id);
      } catch (err) {
        console.warn(`clientDb delete error:`, err);
      }
    }
  }
}

export const clientDb = new ClientIndexedDB();
