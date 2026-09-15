import crypto from 'crypto';

/**
 * ============================================================================
 * RUANGTENANG KAMPUS - BLIND INDEXING CRYPTOGRAPHIC SERVICE
 * ============================================================================
 * 
 * @module BlindIndexService
 * @description
 * High-performance, cryptographically secure Blind Indexing service for 
 * exact-match database searching on application-level encrypted PII fields
 * (e.g. Student NIM `studentNIM` and Student Email `studentEmail`).
 * 
 * ARCHITECTURAL BACKGROUND:
 * Standard AES-256-GCM encryption utilizes a randomized Initialization Vector (IV)
 * for every single encryption operation. This ensures semantic security (ciphertext
 * non-determinism), meaning encrypting the same NIM twice yields completely different
 * ciphertexts. However, this breaks standard database querying like:
 * `SELECT * FROM Appointments WHERE studentNIM = '13520999'`.
 * 
 * SOLUTION (BLIND INDEXING):
 * A "Blind Index" computes a one-way, key-keyed cryptographic hash (HMAC-SHA256)
 * of the plaintext field using a dedicated secret (`BLIND_INDEX_SECRET`).
 * Because HMAC-SHA256 is deterministic given the same secret key and input,
 * `generateHash('13520999')` always produces the exact same 64-character hex digest.
 * This digest is stored in indexed database columns (`studentNimHash`, `studentEmailHash`).
 * Exact-match database lookups query against the HMAC hash while the actual data
 * remains safely encrypted with AES-256-GCM.
 * 
 * SECURITY CONSTANTS:
 * - HMAC Key Source: process.env.BLIND_INDEX_SECRET (Must be at least 32 characters)
 * - Hash Algorithm: SHA-256
 * - Input Normalization: White-space trimming & lowercasing for consistent query semantics
 * - Digest Output: Hexadecimal string (64 characters)
 * - Attack Mitigations: Prevents frequency analysis dictionary attacks via HMAC secret keying.
 */

export class BlindIndexService {
  /**
   * Dedicated HMAC secret key used to compute one-way search indexes.
   * Must remain confidential and isolated from general data encryption keys.
   */
  private readonly secretKey: string;

  /**
   * Initializes the BlindIndexService instance.
   * Retrieves and validates `process.env.BLIND_INDEX_SECRET`.
   * 
   * @param secretOverride - Optional secret key override (primarily for unit testing or isolated contexts).
   * @throws {Error} Clear, descriptive error if process.env.BLIND_INDEX_SECRET is missing or empty.
   */
  constructor(secretOverride?: string) {
    const secret = secretOverride || process.env.BLIND_INDEX_SECRET;

    if (!secret || typeof secret !== 'string' || secret.trim() === '') {
      throw new Error(
        'FATAL_CRYPTO_ERROR: BLIND_INDEX_SECRET environment variable is missing or empty. ' +
        'Blind indexing requires a dedicated, cryptographically strong HMAC secret key ' +
        'to build deterministic one-way database indexes for encrypted PII fields.'
      );
    }

    this.secretKey = secret.trim();
  }

  /**
   * Computes a deterministic HMAC-SHA256 blind index hash for a given plaintext string.
   * 
   * @param plaintext - The raw sensitive string to index (e.g., student NIM or email).
   * @returns The 64-character hexadecimal HMAC string, or `null` if the input is null, undefined, or empty.
   * @throws {Error} Throws if a fatal low-level Node.js crypto exception occurs.
   * 
   * @example
   * ```ts
   * const service = new BlindIndexService();
   * const nimHash = service.generateHash("13520999");
   * // Output: "a4f8b2c9e7..." (64 hex characters)
   * ```
   */
  public generateHash(plaintext: string | null | undefined): string | null {
    if (plaintext === null || plaintext === undefined) {
      return null;
    }

    if (typeof plaintext !== 'string') {
      return null;
    }

    const normalized = plaintext.trim().toLowerCase();
    if (normalized.length === 0) {
      return null;
    }

    try {
      return crypto
        .createHmac('sha256', this.secretKey)
        .update(normalized, 'utf8')
        .digest('hex');
    } catch (error: any) {
      console.error('[BLIND_INDEX_CRYPTO_ERROR] Failed to compute HMAC-SHA256 hash:', error?.message || error);
      throw new Error('BLIND_INDEX_GENERATION_FAILED: Cryptographic HMAC calculation encountered a critical error.');
    }
  }

  /**
   * Computes a deterministic HMAC-SHA256 blind index hash for required plaintext fields.
   * Unlike `generateHash`, this method throws an explicit validation error if the input is missing.
   * 
   * @param plaintext - The non-empty plaintext string required for indexing.
   * @returns The 64-character hexadecimal HMAC string.
   * @throws {Error} If input is null, undefined, or empty, or if calculation fails.
   */
  public generateHashRequired(plaintext: string): string {
    if (!plaintext || typeof plaintext !== 'string' || plaintext.trim() === '') {
      throw new Error('BLIND_INDEX_VALIDATION_ERROR: Plaintext input is required and cannot be empty.');
    }

    const hash = this.generateHash(plaintext);
    if (!hash) {
      throw new Error('BLIND_INDEX_ERROR: Failed to produce a valid blind index hash.');
    }

    return hash;
  }

  /**
   * Convenience method to generate a blind index specifically for a Student NIM.
   * Normalizes the NIM string (trims whitespace) before hashing.
   * 
   * @param nim - Student NIM string (e.g., "13520999").
   * @returns Hexadecimal HMAC hash string, or `null` if empty.
   */
  public generateNimHash(nim: string | null | undefined): string | null {
    return this.generateHash(nim);
  }

  /**
   * Convenience method to generate a blind index specifically for a Student Email.
   * Normalizes the email string (trims whitespace and lowercases) before hashing.
   * 
   * @param email - Student email address string (e.g., "mahasiswa@ui.ac.id").
   * @returns Hexadecimal HMAC hash string, or `null` if empty.
   */
  public generateEmailHash(email: string | null | undefined): string | null {
    return this.generateHash(email);
  }

  /**
   * Verifies whether a candidate plaintext matches a stored blind index hash.
   * Uses timing-safe string comparison to prevent side-channel timing attacks.
   * 
   * @param candidatePlaintext - Raw candidate string to verify.
   * @param expectedHash - Stored 64-character hex hash from the database.
   * @returns `true` if candidate plaintext produces expectedHash, `false` otherwise.
   */
  public verifyHash(candidatePlaintext: string | null | undefined, expectedHash: string | null | undefined): boolean {
    if (!candidatePlaintext || !expectedHash) {
      return false;
    }

    const computedHash = this.generateHash(candidatePlaintext);
    if (!computedHash) {
      return false;
    }

    const computedBuffer = Buffer.from(computedHash, 'utf8');
    const expectedBuffer = Buffer.from(expectedHash, 'utf8');

    if (computedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(computedBuffer, expectedBuffer);
  }
}

/**
 * Lazy Singleton Instance Holder for BlindIndexService.
 * Instantiates on-demand to guarantee that environment setup (e.g., dotenv, envValidation)
 * has run before accessing process.env.BLIND_INDEX_SECRET.
 */
let instance: BlindIndexService | null = null;

/**
 * Retrieves the global singleton instance of `BlindIndexService`.
 * Initializes the instance if not already cached.
 * 
 * @returns {BlindIndexService} The initialized BlindIndexService instance.
 * @throws {Error} If process.env.BLIND_INDEX_SECRET is missing or empty.
 */
export function getBlindIndexService(): BlindIndexService {
  if (!instance) {
    instance = new BlindIndexService();
  }
  return instance;
}

/**
 * Reset singleton instance (useful for testing when changing process.env.BLIND_INDEX_SECRET).
 */
export function resetBlindIndexServiceInstance(): void {
  instance = null;
}

/**
 * Convenience Proxy Export matching singleton service pattern across RuangTenang architecture.
 */
export const blindIndexService = {
  generateHash(plaintext: string | null | undefined): string | null {
    return getBlindIndexService().generateHash(plaintext);
  },
  generateHashRequired(plaintext: string): string {
    return getBlindIndexService().generateHashRequired(plaintext);
  },
  generateNimHash(nim: string | null | undefined): string | null {
    return getBlindIndexService().generateNimHash(nim);
  },
  generateEmailHash(email: string | null | undefined): string | null {
    return getBlindIndexService().generateEmailHash(email);
  },
  verifyHash(candidatePlaintext: string | null | undefined, expectedHash: string | null | undefined): boolean {
    return getBlindIndexService().verifyHash(candidatePlaintext, expectedHash);
  }
};

export default BlindIndexService;
