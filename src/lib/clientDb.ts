import Dexie, { type Table } from 'dexie';
import { encryptData, decryptData } from './clientCrypto';

export interface EncryptedRecord {
  id: string;
  encryptedData: string;
  updatedAt: string;
}

class ClientIndexedDB extends Dexie {
  encryptedStore!: Table<EncryptedRecord>;

  constructor() {
    super('RuangTenangClientDB');
    this.version(1).stores({
      encryptedStore: 'id, updatedAt'
    });
  }

  async saveEncrypted(id: string, plaintext: string): Promise<void> {
    const encryptedData = await encryptData(plaintext);
    await this.encryptedStore.put({
      id,
      encryptedData,
      updatedAt: new Date().toISOString()
    });
  }

  async getDecrypted(id: string): Promise<string | null> {
    const record = await this.encryptedStore.get(id);
    if (!record) return null;
    try {
      return await decryptData(record.encryptedData);
    } catch (err) {
      console.error(`Failed to decrypt record: ${id}`, err);
      return null;
    }
  }

  async deleteRecord(id: string): Promise<void> {
    await this.encryptedStore.delete(id);
  }
}

export const clientDb = new ClientIndexedDB();
