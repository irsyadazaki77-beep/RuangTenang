import { safeLocalStorage } from './storage';

const KEY_DB_NAME = 'RuangTenangCryptoKeyDB';
const KEY_STORE_NAME = 'cryptoKeys';
const OLD_LOCALSTORAGE_KEY = 'ruangtenang_crypto_seed';
const OUTBOX_V2_ROOT_KEY = 'outbox_v2_root';
const OUTBOX_CIPHERTEXT_PREFIX = 'rtenc:v2:';

let cachedCryptoKey: CryptoKey | null = null;
let inMemorySeed: string | null = null;
const accountKeyCache = new Map<string, CryptoKey>();

function hasSubtleCrypto(): boolean {
  return typeof window !== 'undefined' && !!window.crypto && !!window.crypto.subtle;
}

function hasIndexedDB(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
  } catch(_e) {
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
  } catch (err: any) {
    console.warn('SubtleCrypto deriveKey failed:', err);
    return null;
  }
}

async function getOrCreateOutboxRootSeed(): Promise<Uint8Array> {
  if (!hasSubtleCrypto() || typeof window.crypto.getRandomValues !== 'function') {
    throw new Error('CRYPTO_UNAVAILABLE: secure offline encryption requires Web Crypto.');
  }
  const db = await openKeyDB();
  try {
    return await new Promise<Uint8Array>((resolve, reject) => {
      const transaction = db.transaction(KEY_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(KEY_STORE_NAME);
      let root: Uint8Array | null = null;
      let requestError: unknown;
      const request = store.get(OUTBOX_V2_ROOT_KEY);
      request.onsuccess = () => {
        if (typeof request.result === 'string') {
          const bytes = Uint8Array.from(atob(request.result), character => character.charCodeAt(0));
          if (bytes.length !== 32) {
            requestError = new Error('CORRUPTED_OUTBOX_KEY');
            transaction.abort();
            return;
          }
          root = bytes;
          return;
        }
        root = window.crypto.getRandomValues(new Uint8Array(32));
        store.put(btoa(String.fromCharCode(...root)), OUTBOX_V2_ROOT_KEY);
      };
      request.onerror = () => {
        requestError = request.error;
        transaction.abort();
      };
      transaction.oncomplete = () => root ? resolve(root) : reject(requestError || new Error('OUTBOX_KEY_CREATE_FAILED'));
      transaction.onerror = () => reject(requestError || transaction.error || new Error('OUTBOX_KEY_CREATE_FAILED'));
      transaction.onabort = () => reject(requestError || transaction.error || new Error('OUTBOX_KEY_CREATE_FAILED'));
    });
  } finally {
    db.close();
  }
}

async function getAccountOutboxKey(ownerUserId: string): Promise<CryptoKey> {
  if (!ownerUserId.trim()) throw new Error('ENCRYPTION_ACCOUNT_REQUIRED');
  const cached = accountKeyCache.get(ownerUserId);
  if (cached) return cached;
  const seed = await getOrCreateOutboxRootSeed();
  const material = await window.crypto.subtle.importKey('raw', seed, 'HKDF', false, ['deriveKey']);
  const key = await window.crypto.subtle.deriveKey({
    name: 'HKDF',
    hash: 'SHA-256',
    salt: new TextEncoder().encode('ruangtenang-offline-outbox-v2'),
    info: new TextEncoder().encode(`account:${ownerUserId}`),
  }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  accountKeyCache.set(ownerUserId, key);
  return key;
}

export interface OutboxEncryptionContext {
  ownerUserId: string;
  type: string;
  operation: string;
}

function outboxAdditionalData(context: OutboxEncryptionContext): Uint8Array {
  if (!context.ownerUserId.trim() || !context.type.trim() || !context.operation.trim()) {
    throw new Error('ENCRYPTION_CONTEXT_REQUIRED');
  }
  return new TextEncoder().encode(`ruangtenang|outbox|v2|${context.ownerUserId}|${context.type}|${context.operation}`);
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), character => character.charCodeAt(0));
}

export async function encryptOutboxPayload(plaintext: string, context: OutboxEncryptionContext): Promise<string> {
  if (!hasSubtleCrypto() || typeof window.crypto.getRandomValues !== 'function') {
    throw new Error('CRYPTO_UNAVAILABLE: secure offline encryption is unavailable.');
  }
  const key = await getAccountOutboxKey(context.ownerUserId);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await window.crypto.subtle.encrypt({
    name: 'AES-GCM',
    iv,
    additionalData: outboxAdditionalData(context),
  }, key, new TextEncoder().encode(plaintext));
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return `${OUTBOX_CIPHERTEXT_PREFIX}${toBase64(combined)}`;
}

export async function decryptOutboxPayload(ciphertext: string, context: OutboxEncryptionContext): Promise<string> {
  if (!ciphertext.startsWith(OUTBOX_CIPHERTEXT_PREFIX)) throw new Error('UNSUPPORTED_OUTBOX_CIPHERTEXT_VERSION');
  if (!hasSubtleCrypto()) throw new Error('CRYPTO_UNAVAILABLE: Web Crypto is unavailable.');
  const combined = fromBase64(ciphertext.slice(OUTBOX_CIPHERTEXT_PREFIX.length));
  if (combined.length < 28) throw new Error('CORRUPTED_CIPHERTEXT');
  const key = await getAccountOutboxKey(context.ownerUserId);
  const plaintext = await window.crypto.subtle.decrypt({
    name: 'AES-GCM',
    iv: combined.slice(0, 12),
    additionalData: outboxAdditionalData(context),
  }, key, combined.slice(12));
  return new TextDecoder().decode(plaintext);
}

export function clearClientCryptoMemory(): void {
  cachedCryptoKey = null;
  inMemorySeed = null;
  accountKeyCache.clear();
}

export async function isClientCryptoAvailable(): Promise<boolean> {
  if (!hasSubtleCrypto()) return false;
  try {
    const key = await getEncryptionKey();
    return Boolean(key);
  } catch {
    return false;
  }
}

export async function encryptData(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  if (!key || !hasSubtleCrypto()) {
    throw new Error('CRYPTO_UNAVAILABLE: WebCrypto AES-GCM is not supported or key derivation failed.');
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
}

export async function decryptData(ciphertextBase64: string, context?: OutboxEncryptionContext): Promise<string> {
  if (!ciphertextBase64) return '';

  if (ciphertextBase64.startsWith(OUTBOX_CIPHERTEXT_PREFIX)) {
    if (!context) throw new Error('ENCRYPTION_CONTEXT_REQUIRED');
    return decryptOutboxPayload(ciphertextBase64, context);
  }

  // Explicitly reject insecure legacy base64 plaintext records
  if (ciphertextBase64.startsWith('fb64:')) {
    console.warn('[SECURITY] Refusing to treat legacy fb64 plaintext payload as valid ciphertext.');
    return '';
  }

  const key = await getEncryptionKey();
  if (!key || !hasSubtleCrypto()) {
    throw new Error('CRYPTO_UNAVAILABLE: WebCrypto AES-GCM is not supported or key derivation failed.');
  }
  
  const combined = new Uint8Array(
    atob(ciphertextBase64)
      .split('')
      .map(char => char.charCodeAt(0))
  );

  // AES-GCM requires 12 bytes IV + at least 16 bytes authentication tag
  if (combined.length < 28) {
    throw new Error('CORRUPTED_CIPHERTEXT: Insufficient ciphertext buffer length for AES-GCM authentication.');
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
}
