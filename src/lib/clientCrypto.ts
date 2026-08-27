const KEY_DB_NAME = 'RuangTenangCryptoKeyDB';
const KEY_STORE_NAME = 'cryptoKeys';
const OLD_LOCALSTORAGE_KEY = 'ruangtenang_crypto_seed';

let cachedCryptoKey: CryptoKey | null = null;

function openKeyDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(KEY_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(KEY_STORE_NAME)) {
        db.createObjectStore(KEY_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getStoredSeed(): Promise<string> {
  // Graceful migration from localStorage if exists
  let oldSeed: string | null = null;
  try {
    oldSeed = localStorage.getItem(OLD_LOCALSTORAGE_KEY);
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
      try { localStorage.removeItem(OLD_LOCALSTORAGE_KEY); } catch {}
      return oldSeed;
    } catch {
      // Fallback
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

    if (seed) return seed;

    // Generate new secure seed
    const buffer = new Uint8Array(32);
    window.crypto.getRandomValues(buffer);
    const newSeed = Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('');

    // Save to IndexedDB
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(KEY_STORE_NAME, 'readwrite');
      const store = tx.objectStore(KEY_STORE_NAME);
      const req = store.put(newSeed, 'master_seed');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    return newSeed;
  } catch (err) {
    // In-memory fallback if IndexedDB fails
    const buffer = new Uint8Array(32);
    window.crypto.getRandomValues(buffer);
    return Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

async function getEncryptionKey(): Promise<CryptoKey> {
  if (cachedCryptoKey) return cachedCryptoKey;

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
}

export async function encryptData(plaintext: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
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
    console.error('Encryption failed:', err);
    throw new Error('Gagal mengenkripsi data lokal');
  }
}

export async function decryptData(ciphertextBase64: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    
    const combined = new Uint8Array(
      atob(ciphertextBase64)
        .split('')
        .map(char => char.charCodeAt(0))
    );

    if (combined.length < 12) {
      throw new Error('Ciphertext terlalu pendek');
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
    console.error('Decryption failed:', err);
    throw new Error('Gagal medekripsi data lokal (kunci tidak cocok atau data rusak)');
  }
}
