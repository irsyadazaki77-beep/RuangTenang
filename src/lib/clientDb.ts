import Dexie, { type Table } from 'dexie';
import {
  decryptOutboxPayload,
  encryptData,
  encryptOutboxPayload,
  decryptData,
  clearClientCryptoMemory,
} from './clientCrypto';
import { apiClient } from './apiClient';
import {
  getStableAuthenticatedSession,
  getStableStudentSession,
  isCurrentAuthenticatedSession,
  type AuthSessionSnapshot,
} from './authSessionLifecycle';
import {
  MAX_OFFLINE_ACTION_BYTES,
  MAX_PENDING_OFFLINE_ACTIONS_PER_USER,
  OFFLINE_ACTION_ENDPOINTS,
  OfflineActionPayloadSchemas,
  type OfflineActionType,
} from '../../shared/contracts/offlineActions';

export interface EncryptedRecord {
  id: string;
  encryptedData: string;
  updatedAt: string;
}

export type OutboxStatus = 'pending' | 'syncing' | 'failed' | 'quarantined';
export type OutboxFailureKind = 'transient' | 'auth' | 'permanent' | 'owner_unknown' | 'invalid_payload';
export type LegacyOutboxType = OfflineActionType | 'journal_entry' | 'screening_result';

/** Optional legacy fields remain readable only so the v3 migration can quarantine them safely. */
export interface OutboxItem {
  id?: number;
  ownerUserId?: string | null;
  type: LegacyOutboxType;
  operation?: 'create';
  encryptedPayload?: string;
  encryptionVersion?: number;
  idempotencyKey?: string;
  status?: OutboxStatus;
  retryCount?: number;
  nextRetryAt?: string;
  lastAttemptGeneration?: number;
  leaseToken?: string;
  leaseExpiresAt?: string;
  failureKind?: OutboxFailureKind;
  failureCode?: string;
  createdAt: string;
  updatedAt?: string;
  /** v1/v2 fields. Never used by sync after migration. */
  url?: string;
  payload?: unknown;
}

export interface OutboxItemSummary {
  id: number;
  type: LegacyOutboxType;
  status: OutboxStatus;
  retryCount: number;
  failureKind?: OutboxFailureKind;
  createdAt: string;
  updatedAt: string;
}

export interface OutboxSummary {
  pending: number;
  syncing: number;
  failed: number;
  permanentlyRejected: number;
  authPaused: number;
  quarantined: number;
  hasOwnerUnknown: boolean;
}

export interface OutboxSyncResult {
  synced: number;
  failed: number;
  needsAuthentication: boolean;
  nextWakeAt?: number;
}

interface SecureOutboxItem extends OutboxItem {
  id: number;
  ownerUserId: string;
  operation: 'create';
  encryptedPayload: string;
  encryptionVersion: 2;
  idempotencyKey: string;
  status: OutboxStatus;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

interface EnqueueOptions {
  type: OfflineActionType;
  payload: unknown;
  expectedUserId?: string;
  idempotencyKey?: string;
}

const OUTBOX_UPDATED_EVENT = 'ruangtenang:outbox-updated';
const OUTBOX_CHANNEL_NAME = 'ruangtenang-outbox-status-v1';
const MAX_ATTEMPTS = 5;
const LEASE_DURATION_MS = 60_000;
const MAX_BACKOFF_MS = 15 * 60_000;
const MAX_QUEUE_AGE_MS = 90 * 24 * 60 * 60_000;
const memoryCipherStore = new Map<string, string>();
const memoryVolatilePlaintextStore = new Map<string, string>();

function hasIndexedDB(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
  } catch {
    return false;
  }
}

function randomId(): string {
  if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') {
    throw new Error('CRYPTO_UNAVAILABLE: secure random identifiers are unavailable.');
  }
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return `rt-${Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

/** A stable key for an online request that may need to be retried through the offline outbox. */
export function createOfflineIdempotencyKey(): string {
  return randomId();
}

function isEncryptedLegacyPayload(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Record<string, unknown>;
  return payload.__ruangtenangEncrypted === true && typeof payload.ciphertext === 'string';
}

function safeFailureCode(error: unknown): string {
  if (error instanceof Error && /^[A-Z0-9_:-]{1,80}$/i.test(error.message)) return error.message;
  return 'OFFLINE_SYNC_FAILED';
}

class ClientIndexedDB {
  private db: Dexie | null = null;
  private encryptedStore: Table<EncryptedRecord, string> | null = null;
  private outboxQueue: Table<OutboxItem, number> | null = null;
  private readonly activeSyncControllers = new Set<AbortController>();
  private readonly activeSyncUsers = new Set<string>();
  private channel: BroadcastChannel | null = null;

  constructor() {
    if (hasIndexedDB()) {
      try {
        this.db = new Dexie('RuangTenangClientDB');
        this.db.version(1).stores({ encryptedStore: 'id, updatedAt' });
        this.db.version(2).stores({
          encryptedStore: 'id, updatedAt',
          outboxQueue: '++id, type, createdAt',
        });
        this.db.version(3).stores({
          encryptedStore: 'id, updatedAt',
          outboxQueue: '++id, ownerUserId, status, [ownerUserId+status], type, createdAt, nextRetryAt, leaseExpiresAt, &[ownerUserId+idempotencyKey]',
        }).upgrade(async transaction => {
          const legacyRecords = transaction.table('outboxQueue');
          const records = await legacyRecords.toArray() as Record<string, unknown>[];
          for (const raw of records) {
            // Never infer ownership from whichever account happens to open the database.
            if (typeof raw.ownerUserId !== 'string' || !raw.ownerUserId.trim()) raw.ownerUserId = null;
            const hasVerifiedV2Envelope = typeof raw.ownerUserId === 'string'
              && typeof raw.encryptedPayload === 'string'
              && raw.encryptedPayload.startsWith('rtenc:v2:')
              && raw.encryptionVersion === 2
              && typeof raw.idempotencyKey === 'string'
              && /^[A-Za-z0-9._:-]{1,100}$/.test(raw.idempotencyKey)
              && raw.operation === 'create';
            if (!hasVerifiedV2Envelope) {
              raw.ownerUserId = null;
              raw.status = 'quarantined';
              raw.failureKind = 'owner_unknown';
              raw.failureCode = 'OWNER_UNKNOWN';
              raw.updatedAt = new Date().toISOString();
            }
            // Some very old records may have persisted an object directly. Encrypt it as opaque
            // legacy material; do not inspect/decrypt it to guess the former account.
            if ('payload' in raw && !isEncryptedLegacyPayload(raw.payload)) {
              const serializedLegacyPayload = JSON.stringify(raw.payload) ?? 'null';
              const ciphertext = await Dexie.waitFor(encryptData(serializedLegacyPayload));
              raw.payload = { __ruangtenangEncrypted: true, ciphertext };
            }
            delete raw.url;
            await legacyRecords.put(raw as unknown as OutboxItem);
          }
        });
        this.encryptedStore = this.db.table('encryptedStore');
        this.outboxQueue = this.db.table('outboxQueue');
        if (typeof BroadcastChannel !== 'undefined') {
          this.channel = new BroadcastChannel(OUTBOX_CHANNEL_NAME);
          this.channel.onmessage = () => this.dispatchUpdatedEvent();
        }
      } catch (error) {
        console.warn('Dexie schema init warning:', error instanceof Error ? error.message : 'storage unavailable');
        this.db = null;
        this.encryptedStore = null;
        this.outboxQueue = null;
      }
    }
  }

  private dispatchUpdatedEvent(): void {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(OUTBOX_UPDATED_EVENT));
  }

  private publishOutboxUpdate(): void {
    this.dispatchUpdatedEvent();
    this.channel?.postMessage({ updatedAt: Date.now() });
  }

  private requireOutbox(): Table<OutboxItem, number> {
    if (!this.db || !this.outboxQueue) throw new Error('OFFLINE_STORAGE_UNAVAILABLE');
    return this.outboxQueue;
  }

  private requireAccountCacheSession(id: string) {
    const match = /^(?:chats|onboarding)_(.+)$/.exec(id);
    return match ? getStableAuthenticatedSession(match[1]) : null;
  }

  async saveEncrypted(id: string, plaintext: string): Promise<void> {
    const accountSession = this.requireAccountCacheSession(id);
    try {
      const encryptedData = await encryptData(plaintext);
      if (accountSession && !isCurrentAuthenticatedSession(accountSession)) {
        throw new Error('OFFLINE_ACCOUNT_CHANGED');
      }
      memoryCipherStore.set(id, encryptedData);
      memoryVolatilePlaintextStore.delete(id);
      if (this.encryptedStore) {
        await this.encryptedStore.put({ id, encryptedData, updatedAt: new Date().toISOString() });
      }
    } catch (error) {
      if (accountSession && !isCurrentAuthenticatedSession(accountSession)) throw error;
      console.warn('[CLIENT_DB] Encrypted persistent storage unavailable; record remains memory-only:', safeFailureCode(error));
      memoryVolatilePlaintextStore.set(id, plaintext);
      memoryCipherStore.delete(id);
    }
  }

  async getDecrypted(id: string): Promise<string | null> {
    const accountSession = this.requireAccountCacheSession(id);
    if (memoryVolatilePlaintextStore.has(id)) return memoryVolatilePlaintextStore.get(id) || null;
    let encryptedData = memoryCipherStore.get(id);
    try {
      if (!encryptedData && this.encryptedStore) {
        const record = await this.encryptedStore.get(id);
        encryptedData = record?.encryptedData;
      }
      const plaintext = encryptedData ? await decryptData(encryptedData) : null;
      if (accountSession && !isCurrentAuthenticatedSession(accountSession)) {
        throw new Error('OFFLINE_ACCOUNT_CHANGED');
      }
      return plaintext;
    } catch (error) {
      console.warn('[CLIENT_DB] Encrypted record could not be read:', safeFailureCode(error));
      return null;
    }
  }

  async deleteRecord(id: string): Promise<void> {
    this.requireAccountCacheSession(id);
    memoryCipherStore.delete(id);
    memoryVolatilePlaintextStore.delete(id);
    if (this.encryptedStore) await this.encryptedStore.delete(id);
  }

  async enqueueOfflineAction({ type, payload, expectedUserId, idempotencyKey: requestedIdempotencyKey }: EnqueueOptions): Promise<number> {
    const session = getStableStudentSession(expectedUserId);
    const schema = OfflineActionPayloadSchemas[type];
    const parsed = schema.safeParse(payload);
    if (!parsed.success) throw new Error('OFFLINE_PAYLOAD_INVALID');
    const serializedPayload = JSON.stringify(parsed.data);
    if (new TextEncoder().encode(serializedPayload).byteLength > MAX_OFFLINE_ACTION_BYTES) {
      throw new Error('OFFLINE_PAYLOAD_TOO_LARGE');
    }

    const operation = 'create' as const;
    const encryptedPayload = await encryptOutboxPayload(serializedPayload, {
      ownerUserId: session.userId!,
      type,
      operation,
    });
    if (!isCurrentAuthenticatedSession(session)) throw new Error('OFFLINE_ACCOUNT_CHANGED');

    const table = this.requireOutbox();
    const idempotencyKey = requestedIdempotencyKey || randomId();
    if (idempotencyKey.length > 100 || !/^[A-Za-z0-9._:-]+$/.test(idempotencyKey)) throw new Error('OFFLINE_IDEMPOTENCY_KEY_INVALID');
    const now = new Date().toISOString();
    let itemId: number | undefined;
    try {
      await this.db!.transaction('rw', table, async () => {
        const currentSession = getStableStudentSession(expectedUserId);
        if (currentSession.generation !== session.generation || currentSession.userId !== session.userId) {
          throw new Error('OFFLINE_ACCOUNT_CHANGED');
        }
        const pendingCount = await table.where('ownerUserId').equals(session.userId!).count();
        if (pendingCount >= MAX_PENDING_OFFLINE_ACTIONS_PER_USER) throw new Error('OFFLINE_QUEUE_LIMIT_REACHED');
        const item: Omit<SecureOutboxItem, 'id'> = {
          ownerUserId: session.userId!,
          type,
          operation,
          encryptedPayload,
          encryptionVersion: 2,
          idempotencyKey,
          status: 'pending',
          retryCount: 0,
          createdAt: now,
          updatedAt: now,
        };
        itemId = await table.add(item);
      });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('OFFLINE_')) throw error;
      const errorName = error && typeof error === 'object' && 'name' in error ? String(error.name) : '';
      const nestedError = error && typeof error === 'object' && 'inner' in error ? error.inner : undefined;
      const nestedName = nestedError && typeof nestedError === 'object' && 'name' in nestedError ? String(nestedError.name) : '';
      throw new Error(/quota/i.test(`${errorName} ${nestedName}`) ? 'OFFLINE_STORAGE_QUOTA_EXCEEDED' : 'OFFLINE_STORAGE_WRITE_FAILED');
    }
    if (!itemId) throw new Error('OFFLINE_STORAGE_WRITE_FAILED');
    this.publishOutboxUpdate();
    return itemId;
  }

  /** Returns metadata for the active account only. Ciphertext and payload never leave this class. */
  async getOutboxItems(): Promise<OutboxItemSummary[]> {
    const session = getStableAuthenticatedSession();
    const table = this.requireOutbox();
    const items = await table.where('ownerUserId').equals(session.userId!).toArray();
    if (!isCurrentAuthenticatedSession(session)) return [];
    return items.filter((item): item is SecureOutboxItem => Boolean(item.id && item.ownerUserId === session.userId && item.status))
      .map(item => ({
        id: item.id,
        type: item.type,
        status: item.status!,
        retryCount: item.retryCount || 0,
        ...(item.failureKind ? { failureKind: item.failureKind } : {}),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt || item.createdAt,
      }));
  }

  async getOutboxSummary(): Promise<OutboxSummary> {
    let ownItems: OutboxItemSummary[] = [];
    try {
      ownItems = await this.getOutboxItems();
    } catch {
      // Guests and account restoration do not get to enumerate any queue.
    }
      let hasOwnerUnknown = false;
      const table = this.outboxQueue;
      if (table) {
        try {
          // Unknown-owner entries cannot belong to a signed-in account. Expose only a
          // generic device-level notice, never a cross-account count or record metadata.
          hasOwnerUnknown = (await table.where('status').equals('quarantined').limit(1).toArray())
            .some(item => !item.ownerUserId);
        } catch {
          hasOwnerUnknown = false;
        }
      }
    return {
      pending: ownItems.filter(item => item.status === 'pending').length,
      syncing: ownItems.filter(item => item.status === 'syncing').length,
      failed: ownItems.filter(item => item.status === 'failed' && item.failureKind === 'transient').length,
      permanentlyRejected: ownItems.filter(item => item.status === 'failed' && (item.failureKind === 'permanent' || item.failureKind === 'invalid_payload')).length,
      authPaused: ownItems.filter(item => item.status === 'failed' && item.failureKind === 'auth').length,
      quarantined: ownItems.filter(item => item.status === 'quarantined').length,
      hasOwnerUnknown,
    };
  }

  async clearOutboxTypes(types: LegacyOutboxType[]): Promise<void> {
    if (types.length === 0) return;
    const session = getStableAuthenticatedSession();
    const table = this.requireOutbox();
    const scopedItems = await table.where('ownerUserId').equals(session.userId!).toArray();
    if (!isCurrentAuthenticatedSession(session)) throw new Error('OFFLINE_ACCOUNT_CHANGED');
    await table.bulkDelete(scopedItems.filter(item => types.includes(item.type)).flatMap(item => item.id ? [item.id] : []));
    this.publishOutboxUpdate();
  }

  async clearUserPersistentData(expectedUserId: string): Promise<void> {
    const session = getStableAuthenticatedSession(expectedUserId);
    const table = this.requireOutbox();
    const scopedItems = await table.where('ownerUserId').equals(session.userId!).toArray();
    if (!isCurrentAuthenticatedSession(session)) throw new Error('OFFLINE_ACCOUNT_CHANGED');
    await table.bulkDelete(scopedItems.flatMap(item => item.id ? [item.id] : []));
    if (this.encryptedStore) {
      const ownedPrefixes = [`chats_${session.userId}`, `onboarding_${session.userId}`];
      const ownedKeys = await Promise.all(ownedPrefixes.flatMap(prefix => [
        this.encryptedStore!.where('id').equals(prefix).primaryKeys(),
        this.encryptedStore!.where('id').startsWith(`${prefix}_`).primaryKeys(),
      ]));
      if (!isCurrentAuthenticatedSession(session)) throw new Error('OFFLINE_ACCOUNT_CHANGED');
      await this.encryptedStore.bulkDelete(ownedKeys.flat());
    }
    this.clearAllMemory();
    this.publishOutboxUpdate();
  }

  async processOutboxQueue(sessionInput: Pick<AuthSessionSnapshot, 'userId' | 'generation'>, signal?: AbortSignal): Promise<OutboxSyncResult> {
    if (!sessionInput.userId || !isCurrentAuthenticatedSession(sessionInput)) {
      return { synced: 0, failed: 0, needsAuthentication: false };
    }
    const session = getStableStudentSession(sessionInput.userId);
    if (session.generation !== sessionInput.generation) return { synced: 0, failed: 0, needsAuthentication: false };
    if (typeof navigator !== 'undefined' && !navigator.onLine) return { synced: 0, failed: 0, needsAuthentication: false };
    if (this.activeSyncUsers.has(session.userId!)) return { synced: 0, failed: 0, needsAuthentication: false };
    const table = this.requireOutbox();
    this.activeSyncUsers.add(session.userId!);
    let synced = 0;
    let failed = 0;
    let needsAuthentication = false;
    try {
      await this.expireOldActions(table, session);
      while (!signal?.aborted && isCurrentAuthenticatedSession(session)) {
        const candidates = await table.where('ownerUserId').equals(session.userId!).toArray();
        if (!isCurrentAuthenticatedSession(session)) break;
        const now = Date.now();
        const candidate = candidates.find(item => this.isEligible(item, now, session.generation));
        if (!candidate?.id) break;
        const leaseToken = randomId();
        const leased = await this.claimItem(table, candidate.id, session, leaseToken);
        if (!leased) continue;

        const abortController = new AbortController();
        this.activeSyncControllers.add(abortController);
        const abortForParent = () => abortController.abort();
        signal?.addEventListener('abort', abortForParent, { once: true });
        try {
          if (!isCurrentAuthenticatedSession(session)) break;
          if (leased.ownerUserId !== session.userId || !leased.encryptedPayload || leased.encryptionVersion !== 2 || leased.operation !== 'create') {
            await this.recordFailure(table, leased, session, leaseToken, 'invalid_payload', 'INVALID_SECURE_OUTBOX_RECORD');
            failed++;
            continue;
          }
          const context = { ownerUserId: session.userId!, type: leased.type, operation: leased.operation };
          const plaintext = await decryptOutboxPayload(leased.encryptedPayload, context);
          if (!isCurrentAuthenticatedSession(session) || signal?.aborted || abortController.signal.aborted) break;
          const schema = OfflineActionPayloadSchemas[leased.type as OfflineActionType];
          if (!schema) {
            await this.recordFailure(table, leased, session, leaseToken, 'permanent', 'UNSUPPORTED_OFFLINE_ACTION');
            failed++;
            continue;
          }
          let payload: unknown;
          try {
            payload = schema.parse(JSON.parse(plaintext));
          } catch {
            await this.recordFailure(table, leased, session, leaseToken, 'invalid_payload', 'OFFLINE_PAYLOAD_INVALID');
            failed++;
            continue;
          }
          if (!isCurrentAuthenticatedSession(session) || signal?.aborted || abortController.signal.aborted) break;
          const response = await apiClient.request(OFFLINE_ACTION_ENDPOINTS[leased.type as OfflineActionType], {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
              'Idempotency-Key': leased.idempotencyKey!,
              'X-RuangTenang-Offline-Owner': session.userId!,
            },
            signal: abortController.signal,
          }, 0, 15_000);
          if (!isCurrentAuthenticatedSession(session) || signal?.aborted || abortController.signal.aborted) break;
          if (response.success) {
            const deleted = await this.acknowledgeItem(table, leased, session, leaseToken);
            if (deleted) synced++;
          } else {
            const classification = this.classifyFailure(response.status, response.code);
            await this.recordFailure(table, leased, session, leaseToken, classification.kind, classification.code, session.generation, response.retryAfterMs);
            failed++;
            if (classification.kind === 'auth') {
              needsAuthentication = true;
              break;
            }
          }
        } catch (error) {
          if (!isCurrentAuthenticatedSession(session) || signal?.aborted || abortController.signal.aborted) break;
          await this.recordFailure(table, leased, session, leaseToken, 'transient', safeFailureCode(error), session.generation);
          failed++;
        } finally {
          signal?.removeEventListener('abort', abortForParent);
          this.activeSyncControllers.delete(abortController);
        }
      }
    } finally {
      this.activeSyncUsers.delete(session.userId!);
      if (synced || failed) this.publishOutboxUpdate();
    }
    if (!isCurrentAuthenticatedSession(session)) return { synced, failed, needsAuthentication };
    const remaining = await table.where('ownerUserId').equals(session.userId!).toArray();
    if (!isCurrentAuthenticatedSession(session)) return { synced, failed, needsAuthentication };
    const wakeTimes = remaining.flatMap(item => {
      if (item.status === 'syncing' && item.leaseExpiresAt) return [Date.parse(item.leaseExpiresAt)];
      if (item.status === 'failed' && item.failureKind === 'transient' && item.nextRetryAt) return [Date.parse(item.nextRetryAt)];
      return [];
    }).filter(Number.isFinite);
    return { synced, failed, needsAuthentication, ...(wakeTimes.length ? { nextWakeAt: Math.min(...wakeTimes) } : {}) };
  }

  private isEligible(item: OutboxItem, now: number, generation: number): boolean {
    if (item.status === 'quarantined' || !item.ownerUserId || !item.encryptedPayload || !item.idempotencyKey) return false;
    if (item.status === 'syncing') {
      const leaseExpiresAt = Date.parse(item.leaseExpiresAt || '');
      return !Number.isFinite(leaseExpiresAt) || leaseExpiresAt <= now;
    }
    if (item.status === 'pending') return !item.nextRetryAt || Date.parse(item.nextRetryAt) <= now;
    if (item.status !== 'failed') return false;
    if (item.failureKind === 'permanent' || item.failureKind === 'invalid_payload' || item.failureKind === 'owner_unknown') return false;
    if (item.failureKind === 'auth') return (item.lastAttemptGeneration ?? -1) < generation;
    return !item.nextRetryAt || Date.parse(item.nextRetryAt) <= now;
  }

  private async expireOldActions(table: Table<OutboxItem, number>, session: AuthSessionSnapshot): Promise<void> {
    if (!isCurrentAuthenticatedSession(session)) return;
    const items = await table.where('ownerUserId').equals(session.userId!).toArray();
    const now = Date.now();
    const expiredIds = items.filter(item => {
      if (!item.id || item.status === 'quarantined' || item.failureKind === 'permanent' || item.failureKind === 'invalid_payload') return false;
      const createdAt = Date.parse(item.createdAt);
      return Number.isFinite(createdAt) && now - createdAt > MAX_QUEUE_AGE_MS;
    }).flatMap(item => item.id ? [item.id] : []);
    if (expiredIds.length === 0 || !isCurrentAuthenticatedSession(session)) return;
    await this.db!.transaction('rw', table, async () => {
      for (const id of expiredIds) {
        const item = await table.get(id);
        if (!isCurrentAuthenticatedSession(session) || !item || item.ownerUserId !== session.userId) continue;
        item.status = 'failed';
        item.failureKind = 'permanent';
        item.failureCode = 'OFFLINE_ACTION_EXPIRED_REQUIRES_REVIEW';
        item.leaseToken = undefined;
        item.leaseExpiresAt = undefined;
        item.updatedAt = new Date().toISOString();
        await table.put(item);
      }
    });
    this.publishOutboxUpdate();
  }

  private async claimItem(table: Table<OutboxItem, number>, id: number, session: AuthSessionSnapshot, leaseToken: string): Promise<SecureOutboxItem | null> {
    let claimed: SecureOutboxItem | null = null;
    await this.db!.transaction('rw', table, async () => {
      const item = await table.get(id);
      if (!item || item.ownerUserId !== session.userId || !this.isEligible(item, Date.now(), session.generation)) return;
      if (!isCurrentAuthenticatedSession(session)) return;
      item.status = 'syncing';
      item.leaseToken = leaseToken;
      item.leaseExpiresAt = new Date(Date.now() + LEASE_DURATION_MS).toISOString();
      item.updatedAt = new Date().toISOString();
      await table.put(item);
      claimed = item as SecureOutboxItem;
    });
    if (claimed) this.publishOutboxUpdate();
    return claimed;
  }

  private async acknowledgeItem(table: Table<OutboxItem, number>, item: SecureOutboxItem, session: AuthSessionSnapshot, leaseToken: string): Promise<boolean> {
    if (!isCurrentAuthenticatedSession(session)) return false;
    let acknowledged = false;
    await this.db!.transaction('rw', table, async () => {
      const current = await table.get(item.id);
      if (!isCurrentAuthenticatedSession(session) || !current || current.ownerUserId !== session.userId || current.leaseToken !== leaseToken) return;
      await table.delete(item.id);
      acknowledged = true;
    });
    return acknowledged;
  }

  private async recordFailure(
    table: Table<OutboxItem, number>,
    item: SecureOutboxItem,
    session: AuthSessionSnapshot,
    leaseToken: string,
    failureKind: OutboxFailureKind,
    failureCode: string,
    attemptedGeneration?: number,
    retryAfterMs?: number,
  ): Promise<void> {
    if (!isCurrentAuthenticatedSession(session)) return;
    await this.db!.transaction('rw', table, async () => {
      const current = await table.get(item.id);
      if (!isCurrentAuthenticatedSession(session) || !current || current.ownerUserId !== session.userId || current.leaseToken !== leaseToken) return;
      const retryCount = (current.retryCount || 0) + (failureKind === 'auth' ? 0 : 1);
      const exhausted = failureKind === 'transient' && retryCount >= MAX_ATTEMPTS;
      current.status = 'failed';
      current.failureKind = exhausted ? 'permanent' : failureKind;
      current.failureCode = exhausted ? 'RETRY_LIMIT_REACHED' : failureCode;
      current.retryCount = retryCount;
      current.lastAttemptGeneration = attemptedGeneration;
      current.leaseToken = undefined;
      current.leaseExpiresAt = undefined;
      current.updatedAt = new Date().toISOString();
      if (failureKind === 'transient' && !exhausted) {
        const exponentialDelay = 1000 * 2 ** Math.max(0, retryCount - 1);
        const delay = Math.min(Math.max(retryAfterMs ?? exponentialDelay, 1000), MAX_BACKOFF_MS);
        current.nextRetryAt = new Date(Date.now() + delay).toISOString();
      } else if (failureKind === 'auth') {
        current.nextRetryAt = undefined;
      }
      await table.put(current);
    });
  }

  private classifyFailure(status?: number, code?: string): { kind: OutboxFailureKind; code: string } {
    if (status === 401) return { kind: 'auth', code: 'AUTH_REQUIRED' };
    if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504 || status === undefined || code === 'TIMEOUT' || code === 'NETWORK_ERROR') {
      return { kind: 'transient', code: status === 429 ? 'RATE_LIMITED' : code || `HTTP_${status || 'NETWORK'}` };
    }
    if (status === 409 && code === 'IDEMPOTENCY_IN_PROGRESS') return { kind: 'transient', code };
    if (status === 403) return { kind: 'permanent', code: 'FORBIDDEN' };
    if (status === 400 || status === 409 || status === 422) return { kind: 'permanent', code: code || `HTTP_${status}` };
    if (status !== undefined && status >= 500) return { kind: 'transient', code: code || `HTTP_${status}` };
    return { kind: 'permanent', code: code || `HTTP_${status || 'UNKNOWN'}` };
  }

  invalidateActiveSyncs(): void {
    for (const controller of this.activeSyncControllers) controller.abort();
    this.activeSyncControllers.clear();
  }

  clearAllMemory(): void {
    memoryCipherStore.clear();
    memoryVolatilePlaintextStore.clear();
    clearClientCryptoMemory();
  }
}

export const clientDb = new ClientIndexedDB();
export { OUTBOX_UPDATED_EVENT };
