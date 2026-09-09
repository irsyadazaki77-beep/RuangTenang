import { safeLocalStorage } from './storage';

const KEY_DB_NAME = 'RuangTenangCryptoKeyDB';
const KEY_STORE_NAME = 'cryptoKeys';
const OLD_LOCALSTORAGE_KEY = 'ruangtenang_crypto_seed';

let cachedCryptoKey: CryptoKey | null = null;
let inMemorySeed: string | null = null;

function hasSubtleCrypto(): boolean {
  return typeof window !== 'undefined' && !!window.crypto && !!window.crypto.subtle;
}

function hasIndexedDB(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
  } catch(e) {
    return false;
  }
}

function openKeyDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDB()) {
      return reject(new Error('IndexedDB unavailable'));
    }
    try {
      const request = indexedDB.open(KEY_DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(KEY_STORE_NAME)) {
          db.createObjectStore(KEY_STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (e) {
      reject(e);
    }
  });
}

async function getStoredSeed(): Promise<string> {
  if (inMemorySeed) return inMemorySeed;

  // Graceful migration from safeLocalStorage if exists
  let oldSeed: string | null = null;
  try {
    oldSeed = safeLocalStorage.getItem(OLD_LOCALSTORAGE_KEY);
  } catch {}
  if (oldSeed) {
    try {
      const db = await openKeyDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(KEY_STORE_NAME, 'readwrite');
        const store = tx.objectStore(KEY_STORE_NAME);
        const req = store.put(oldSeed, 'master_seed');
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      try { safeLocalStorage.removeItem(OLD_LOCALSTORAGE_KEY); } catch {}
      inMemorySeed = oldSeed;
      return oldSeed;
    } catch {
      inMemorySeed = oldSeed;
      return oldSeed;
    }
  }

  // Retrieve from IndexedDB
  try {
    const db = await openKeyDB();
    const seed = await new Promise<string | null>((resolve, reject) => {
      const tx = db.transaction(KEY_STORE_NAME, 'readonly');
      const store = tx.objectStore(KEY_STORE_NAME);
      const req = store.get('master_seed');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    if (seed) {
      inMemorySeed = seed;
      return seed;
    }

    // Generate new secure seed
    let newSeed = '';
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const buffer = new Uint8Array(32);
      window.crypto.getRandomValues(buffer);
      newSeed = Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      newSeed = 'fallback-seed-' + Math.random().toString(36).substring(2) + Date.now();
    }

    // Save to IndexedDB
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(KEY_STORE_NAME, 'readwrite');
        const store = tx.objectStore(KEY_STORE_NAME);
        const req = store.put(newSeed, 'master_seed');
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {}

    inMemorySeed = newSeed;
    return newSeed;
  } catch {
    // In-memory fallback if IndexedDB fails
    if (!inMemorySeed) {
      if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
        const buffer = new Uint8Array(32);
        window.crypto.getRandomValues(buffer);
        inMemorySeed = Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('');
      } else {
        inMemorySeed = 'fallback-seed-' + Math.random().toString(36).substring(2) + Date.now();
      }
    }
    return inMemorySeed;
  }
}

async function getEncryptionKey(): Promise<CryptoKey | null> {
  if (!hasSubtleCrypto()) return null;
  if (cachedCryptoKey) return cachedCryptoKey;

  try {
    const seed = await getStoredSeed();
    const encoder = new TextEncoder();
    const rawKeyMaterial = encoder.encode(seed);
    
    const baseKey = await window.crypto.subtle.importKey(
      'raw',
      rawKeyMaterial,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    const derivedKey = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('ruangtenang-client-salt-v1'),
        iterations: 50000,
        hash: 'SHA-256'
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    cachedCryptoKey = derivedKey;
    return derivedKey;
  } catch (err) {
    console.warn('SubtleCrypto deriveKey failed:', err);
    return null;
  }
}

export async function encryptData(plaintext: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    if (!key || !hasSubtleCrypto()) {
      // Safe fallback when Web Crypto is unavailable
      return 'fb64:' + btoa(encodeURIComponent(plaintext));
    }

    const encoder = new TextEncoder();
    const encodedPlaintext = encoder.encode(plaintext);
    
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encodedPlaintext
    );

    const combined = new Uint8Array(iv.length + ciphertextBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertextBuffer), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (err) {
    console.warn('Encryption fallback used:', err);
    return 'fb64:' + btoa(encodeURIComponent(plaintext));
  }
}

export async function decryptData(ciphertextBase64: string): Promise<string> {
  if (!ciphertextBase64) return '';
  if (ciphertextBase64.startsWith('fb64:')) {
    try {
      return decodeURIComponent(atob(ciphertextBase64.slice(5)));
    } catch {
      return '';
    }
  }

  try {
    const key = await getEncryptionKey();
    if (!key || !hasSubtleCrypto()) {
      return '';
    }
    
    const combined = new Uint8Array(
      atob(ciphertextBase64)
        .split('')
        .map(char => char.charCodeAt(0))
    );

    if (combined.length < 12) {
      return '';
    }

    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    console.warn('Decryption failed, treating as empty:', err);
    return '';
  }
}
