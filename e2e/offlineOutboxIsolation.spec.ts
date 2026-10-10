import { expect, test, type Page } from '@playwright/test';

async function openModuleHarness(page: Page) {
  await page.goto('/favicon.svg');
  await page.evaluate(() => {
    (window as unknown as { __readOutboxRows: () => Promise<Array<Record<string, unknown>>> }).__readOutboxRows = () =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('RuangTenangClientDB');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const database = open.result;
          const read = database.transaction('outboxQueue', 'readonly').objectStore('outboxQueue').getAll();
          read.onsuccess = () => { database.close(); resolve(read.result as Array<Record<string, unknown>>); };
          read.onerror = () => { database.close(); reject(read.error); };
        };
      });
  });
  return page.evaluate(async () => {
    const [{ clientDb }, auth] = await Promise.all([
      import('/src/lib/clientDb.ts'),
      import('/src/lib/authSessionLifecycle.ts'),
    ]);
    return Boolean(clientDb && auth.transitionAuthSession);
  });
}

test.describe('Offline outbox account isolation', () => {
  test('A data stays encrypted and scoped while B is active, then syncs only after A returns', async ({ page }) => {
    await openModuleHarness(page);
    const result = await page.evaluate(async () => {
      const [{ clientDb }, auth, cryptoModule, api] = await Promise.all([
        import('/src/lib/clientDb.ts'),
        import('/src/lib/authSessionLifecycle.ts'),
        import('/src/lib/clientCrypto.ts'),
        import('/src/lib/apiClient.ts'),
      ]);
      const calls: Array<{ url: string; body: string; owner: string; idempotencyKey: string }> = [];
      api.apiClient.request = async (url, options) => {
        const headers = options?.headers as Record<string, string>;
        calls.push({
          url,
          body: String(options?.body || ''),
          owner: headers['X-RuangTenang-Offline-Owner'],
          idempotencyKey: headers['Idempotency-Key'],
        });
        return { success: true, status: 200 };
      };

      const sessionA = auth.transitionAuthSession('authenticated', { id: 'offline-user-a', role: 'mahasiswa' });
      await clientDb.enqueueOfflineAction({
        type: 'mood_log',
        payload: { mood: 1, notes: 'PRIVATE_A_NOTE_MUST_NEVER_LEAK_TO_B' },
        expectedUserId: 'offline-user-a',
      });
      const testWindow = window as unknown as { __readOutboxRows: () => Promise<Array<Record<string, unknown>>> };
      const recordA = (await testWindow.__readOutboxRows()).find(row => row.ownerUserId === 'offline-user-a')!;
      const ciphertextBytes = JSON.stringify(recordA);
      const wrongAccountDecryptFailed = await cryptoModule.decryptOutboxPayload(String(recordA.encryptedPayload), {
        ownerUserId: 'offline-user-b', type: 'mood_log', operation: 'create',
      }).then(() => false, () => true);

      auth.transitionAuthSession('logging_out');
      const sessionB = auth.transitionAuthSession('authenticated', { id: 'offline-user-b', role: 'mahasiswa' });
      const visibleToB = await clientDb.getOutboxItems();
      const bResult = await clientDb.processOutboxQueue({ userId: sessionB.userId, generation: sessionB.generation });
      const pendingAfterB = (await testWindow.__readOutboxRows()).find(row => row.id === recordA.id);

      const returnedA = auth.transitionAuthSession('authenticated', { id: 'offline-user-a', role: 'mahasiswa' });
      const aResult = await clientDb.processOutboxQueue({ userId: returnedA.userId, generation: returnedA.generation });
      return {
        sessionAUser: sessionA.userId,
        visibleToB: visibleToB.length,
        bResult,
        pendingAfterB: pendingAfterB?.status,
        aResult,
        calls,
        wrongAccountDecryptFailed,
        persistedPlaintextFound: ciphertextBytes.includes('PRIVATE_A_NOTE_MUST_NEVER_LEAK_TO_B') || 'payload' in recordA || 'url' in recordA,
        remainingForA: await clientDb.getOutboxItems(),
      };
    });

    expect(result.sessionAUser).toBe('offline-user-a');
    expect(result.visibleToB).toBe(0);
    expect(result.bResult.synced).toBe(0);
    expect(result.pendingAfterB).toBe('pending');
    expect(result.wrongAccountDecryptFailed).toBe(true);
    expect(result.persistedPlaintextFound).toBe(false);
    expect(result.aResult.synced).toBe(1);
    expect(result.calls).toHaveLength(1);
    expect(result.calls[0]).toMatchObject({ url: '/api/v1/mood', owner: 'offline-user-a' });
    expect(result.calls[0].body).toContain('PRIVATE_A_NOTE_MUST_NEVER_LEAK_TO_B');
    expect(result.calls[0].idempotencyKey).toBeTruthy();
    expect(result.remainingForA).toHaveLength(0);
  });

  test('logout during decryption discards the stale result and never starts a request', async ({ page }) => {
    await openModuleHarness(page);
    const result = await page.evaluate(async () => {
      const [{ clientDb }, auth, api] = await Promise.all([
        import('/src/lib/clientDb.ts'),
        import('/src/lib/authSessionLifecycle.ts'),
        import('/src/lib/apiClient.ts'),
      ]);
      const calls: string[] = [];
      api.apiClient.request = async url => {
        calls.push(url);
        return { success: true, status: 200 };
      };
      const sessionA = auth.transitionAuthSession('authenticated', { id: 'decrypt-user-a', role: 'mahasiswa' });
      await clientDb.enqueueOfflineAction({ type: 'mood_log', payload: { mood: 2, notes: 'A-only' }, expectedUserId: 'decrypt-user-a' });
      const subtle = window.crypto.subtle;
      const originalDecrypt = subtle.decrypt.bind(subtle);
      const harness = window as typeof window & { __decryptStarted?: boolean; __releaseDecrypt?: () => void };
      Object.defineProperty(subtle, 'decrypt', {
        configurable: true,
        value: (algorithm: AlgorithmIdentifier, key: CryptoKey, data: BufferSource) => new Promise<ArrayBuffer>((resolve, reject) => {
          harness.__decryptStarted = true;
          harness.__releaseDecrypt = () => { void originalDecrypt(algorithm, key, data).then(resolve, reject); };
        }),
      });
      const processing = clientDb.processOutboxQueue({ userId: sessionA.userId, generation: sessionA.generation });
      while (!harness.__decryptStarted) await new Promise(resolve => setTimeout(resolve, 5));
      auth.transitionAuthSession('logging_out');
      clientDb.invalidateActiveSyncs();
      auth.transitionAuthSession('authenticated', { id: 'decrypt-user-b', role: 'mahasiswa' });
      harness.__releaseDecrypt?.();
      Object.defineProperty(subtle, 'decrypt', { configurable: true, value: originalDecrypt });
      const staleResult = await processing;
      const bItems = await clientDb.getOutboxItems();
      const testWindow = window as unknown as { __readOutboxRows: () => Promise<Array<Record<string, unknown>>> };
      const rawA = (await testWindow.__readOutboxRows()).filter(row => row.ownerUserId === 'decrypt-user-a');
      return { calls, staleResult, bItems: bItems.length, aCount: rawA.length, aStatus: rawA[0]?.status };
    });

    expect(result.calls).toEqual([]);
    expect(result.staleResult.synced).toBe(0);
    expect(result.bItems).toBe(0);
    expect(result.aCount).toBe(1);
    expect(result.aStatus).toBe('syncing');
  });

  test('guest writes are rejected and legacy ownerless records are encrypted then quarantined', async ({ page }) => {
    await page.goto('/favicon.svg');
    const legacyInsertCount = await page.evaluate(async () => {
      return new Promise<number>((resolve, reject) => {
        // Dexie stores its declared version multiplied by ten in IndexedDB metadata.
        const open = indexedDB.open('RuangTenangClientDB', 20);
        open.onupgradeneeded = () => {
          const db = open.result;
          db.createObjectStore('encryptedStore', { keyPath: 'id' }).createIndex('updatedAt', 'updatedAt');
          const queue = db.createObjectStore('outboxQueue', { keyPath: 'id', autoIncrement: true });
          queue.createIndex('type', 'type');
          queue.createIndex('createdAt', 'createdAt');
        };
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const transaction = db.transaction('outboxQueue', 'readwrite');
          transaction.objectStore('outboxQueue').add({
            type: 'mood_log', url: '/api/v1/mood',
            payload: { mood: 1, notes: 'LEGACY_PLAINTEXT_SECRET' },
            createdAt: new Date().toISOString(),
          });
          transaction.oncomplete = () => {
            const read = db.transaction('outboxQueue', 'readonly').objectStore('outboxQueue').getAll();
            read.onsuccess = () => { const count = read.result.length; db.close(); resolve(count); };
            read.onerror = () => { db.close(); reject(read.error); };
          };
          transaction.onerror = () => reject(transaction.error);
        };
      });
    });
    expect(legacyInsertCount).toBe(1);
    await openModuleHarness(page);
    const result = await page.evaluate(async () => {
      const [{ clientDb }, auth, api] = await Promise.all([
        import('/src/lib/clientDb.ts'),
        import('/src/lib/authSessionLifecycle.ts'),
        import('/src/lib/apiClient.ts'),
      ]);
      let requestCount = 0;
      api.apiClient.request = async () => { requestCount++; return { success: true, status: 200 }; };
      auth.transitionAuthSession('unauthenticated');
      const guestWrite = await clientDb.enqueueOfflineAction({ type: 'mood_log', payload: { mood: 1, notes: 'guest private data' } })
        .then(() => 'unexpected-success', error => error.message);
      const session = auth.transitionAuthSession('authenticated', { id: 'legacy-test-user', role: 'mahasiswa' });
      const summary = await clientDb.getOutboxSummary();
      const scoped = await clientDb.getOutboxItems();
      const processed = await clientDb.processOutboxQueue({ userId: session.userId, generation: session.generation });
      const testWindow = window as unknown as { __readOutboxRows: () => Promise<Array<Record<string, unknown>>> };
      const allRows = await testWindow.__readOutboxRows();
      const legacyRecord = allRows.find(row => row.ownerUserId === null) || allRows[0];
      return {
        guestWrite,
        summary,
        scopedCount: scoped.length,
        processed,
        requestCount,
        owner: legacyRecord?.ownerUserId,
        status: legacyRecord?.status,
        failureKind: legacyRecord?.failureKind,
        encrypted: Boolean((legacyRecord?.payload as { ciphertext?: string } | undefined)?.ciphertext),
        leakedPlaintext: JSON.stringify(allRows).includes('LEGACY_PLAINTEXT_SECRET'),
        records: allRows.map(row => ({ id: row.id, owner: row.ownerUserId, status: row.status, failureKind: row.failureKind })),
      };
    });
    expect(result.guestWrite).toBe('OFFLINE_AUTH_REQUIRED');
    expect(result.records).toEqual([{ id: 1, owner: null, status: 'quarantined', failureKind: 'owner_unknown' }]);
    expect(result.summary.hasOwnerUnknown).toBe(true);
    expect(result.scopedCount).toBe(0);
    expect(result.processed.synced).toBe(0);
    expect(result.requestCount).toBe(0);
    expect(result.owner).toBeNull();
    expect(result.status).toBe('quarantined');
    expect(result.failureKind).toBe('owner_unknown');
    expect(result.encrypted).toBe(true);
    expect(result.leakedPlaintext).toBe(false);
  });

  test('a queue survives a browser reload and is visible only after the owning account returns', async ({ page }) => {
    await openModuleHarness(page);
    await page.evaluate(async () => {
      const [{ clientDb }, auth] = await Promise.all([
        import('/src/lib/clientDb.ts'), import('/src/lib/authSessionLifecycle.ts'),
      ]);
      auth.transitionAuthSession('authenticated', { id: 'restart-user-a', role: 'mahasiswa' });
      await clientDb.enqueueOfflineAction({ type: 'mood_log', payload: { mood: 4, notes: 'persistent only for A' } });
    });

    await page.reload();
    await openModuleHarness(page);
    const result = await page.evaluate(async () => {
      const [{ clientDb }, auth, api] = await Promise.all([
        import('/src/lib/clientDb.ts'),
        import('/src/lib/authSessionLifecycle.ts'),
        import('/src/lib/apiClient.ts'),
      ]);
      api.apiClient.request = async () => ({ success: true, status: 200 });
      const sessionB = auth.transitionAuthSession('authenticated', { id: 'restart-user-b', role: 'mahasiswa' });
      const bVisible = await clientDb.getOutboxItems();
      await clientDb.processOutboxQueue({ userId: sessionB.userId, generation: sessionB.generation });
      const sessionA = auth.transitionAuthSession('authenticated', { id: 'restart-user-a', role: 'mahasiswa' });
      const aVisible = await clientDb.getOutboxItems();
      const sync = await clientDb.processOutboxQueue({ userId: sessionA.userId, generation: sessionA.generation });
      return { bCount: bVisible.length, aCount: aVisible.length, synced: sync.synced, remaining: (await clientDb.getOutboxItems()).length };
    });

    expect(result).toEqual({ bCount: 0, aCount: 1, synced: 1, remaining: 0 });
  });

  test('401 pauses retry for the same auth generation and 403 remains permanently failed', async ({ page }) => {
    await openModuleHarness(page);
    const result = await page.evaluate(async () => {
      const [{ clientDb }, auth, api] = await Promise.all([
        import('/src/lib/clientDb.ts'),
        import('/src/lib/authSessionLifecycle.ts'),
        import('/src/lib/apiClient.ts'),
      ]);
      const sessionA = auth.transitionAuthSession('authenticated', { id: 'auth-failure-user', role: 'mahasiswa' });
      await clientDb.enqueueOfflineAction({ type: 'mood_log', payload: { mood: 1, notes: 'auth failure case' } });
      let calls = 0;
      api.apiClient.request = async () => {
        calls++;
        return calls === 1
          ? { success: false, status: 401, code: 'UNAUTHORIZED' }
          : { success: false, status: 403, code: 'FORBIDDEN' };
      };
      const first = await clientDb.processOutboxQueue({ userId: sessionA.userId, generation: sessionA.generation });
      const sameGenerationRetry = await clientDb.processOutboxQueue({ userId: sessionA.userId, generation: sessionA.generation });
      const after401 = await clientDb.getOutboxSummary();
      auth.transitionAuthSession('refreshing');
      const refreshed = auth.transitionAuthSession('authenticated', { id: 'auth-failure-user', role: 'mahasiswa' });
      const second = await clientDb.processOutboxQueue({ userId: refreshed.userId, generation: refreshed.generation });
      const after403 = await clientDb.getOutboxSummary();
      const noFurtherRetry = await clientDb.processOutboxQueue({ userId: refreshed.userId, generation: refreshed.generation });
      return { calls, first, sameGenerationRetry, after401, second, after403, noFurtherRetry };
    });

    expect(result.calls).toBe(2);
    expect(result.first.needsAuthentication).toBe(true);
    expect(result.sameGenerationRetry.failed).toBe(0);
    expect(result.after401.authPaused).toBe(1);
    expect(result.second.failed).toBe(1);
    expect(result.after403.permanentlyRejected).toBe(1);
    expect(result.noFurtherRetry.failed).toBe(0);
  });

  test('Web Crypto unavailable rejects enqueue and leaves persistent queue unchanged', async ({ page }) => {
    await openModuleHarness(page);
    const result = await page.evaluate(async () => {
      const [{ clientDb }, auth] = await Promise.all([
        import('/src/lib/clientDb.ts'), import('/src/lib/authSessionLifecycle.ts'),
      ]);
      const session = auth.transitionAuthSession('authenticated', { id: 'crypto-unavailable-e2e-user', role: 'mahasiswa' });
      const testWindow = window as unknown as { __readOutboxRows: () => Promise<Array<Record<string, unknown>>> };
      await clientDb.enqueueOfflineAction({
        type: 'mood_log', payload: { mood: 3, notes: 'baseline encrypted record' }, expectedUserId: session.userId!,
      });
      const before = await testWindow.__readOutboxRows();
      const originalCrypto = window.crypto;
      const enqueueError = await (async () => {
        try {
          Object.defineProperty(window, 'crypto', {
            value: { ...originalCrypto, subtle: undefined },
            configurable: true,
          });
          return await clientDb.enqueueOfflineAction({
          type: 'mood_log', payload: { mood: 5, notes: 'NEVER_STORE_PLAINTEXT_ON_CRYPTO_FAILURE' },
          expectedUserId: session.userId!,
          }).then(() => 'unexpected-success', error => error.message);
        } finally {
          Object.defineProperty(window, 'crypto', { value: originalCrypto, configurable: true });
        }
      })();
      const after = await testWindow.__readOutboxRows();
      return {
        enqueueError,
        beforeCount: before.length,
        afterCount: after.length,
        leakedPlaintext: JSON.stringify(after).includes('NEVER_STORE_PLAINTEXT_ON_CRYPTO_FAILURE'),
      };
    });

    expect(result.enqueueError).toContain('CRYPTO_UNAVAILABLE');
    expect(result.afterCount).toBe(result.beforeCount);
    expect(result.leakedPlaintext).toBe(false);
  });

  test('account-keyed chat caches cannot be read or written by another active account', async ({ page }) => {
    await openModuleHarness(page);
    const result = await page.evaluate(async () => {
      const [{ clientDb }, auth] = await Promise.all([
        import('/src/lib/clientDb.ts'), import('/src/lib/authSessionLifecycle.ts'),
      ]);
      auth.transitionAuthSession('authenticated', { id: 'chat-cache-user-a', role: 'mahasiswa' });
      await clientDb.saveEncrypted('chats_chat-cache-user-a', '[{"title":"PRIVATE_A_CHAT"}]');
      auth.transitionAuthSession('logging_out');
      auth.transitionAuthSession('authenticated', { id: 'chat-cache-user-b', role: 'mahasiswa' });
      const readError = await clientDb.getDecrypted('chats_chat-cache-user-a')
        .then(value => value, error => error.message);
      const writeError = await clientDb.saveEncrypted('chats_chat-cache-user-a', '[{"title":"B"}]')
        .then(() => 'unexpected-success', error => error.message);
      auth.transitionAuthSession('logging_out');
      auth.transitionAuthSession('authenticated', { id: 'chat-cache-user-a', role: 'mahasiswa' });
      const ownerRead = await clientDb.getDecrypted('chats_chat-cache-user-a');
      return { readError, writeError, ownerRead };
    });

    expect(result.readError).toBe('OFFLINE_ACCOUNT_CHANGED');
    expect(result.writeError).toBe('OFFLINE_ACCOUNT_CHANGED');
    expect(result.ownerRead).toContain('PRIVATE_A_CHAT');
  });

  test('two tabs claim a user queue item once and rely on one server idempotency key', async ({ page, context }) => {
    await openModuleHarness(page);
    const secondTab = await context.newPage();
    await openModuleHarness(secondTab);
    await page.evaluate(async () => {
      const [{ clientDb }, auth] = await Promise.all([
        import('/src/lib/clientDb.ts'), import('/src/lib/authSessionLifecycle.ts'),
      ]);
      auth.transitionAuthSession('authenticated', { id: 'multitab-user', role: 'mahasiswa' });
      await clientDb.enqueueOfflineAction({ type: 'mood_log', payload: { mood: 3, notes: 'one action' }, expectedUserId: 'multitab-user' });
    });
    await Promise.all([page, secondTab].map(tab => tab.evaluate(async () => {
      const [{ clientDb }, auth, api] = await Promise.all([
        import('/src/lib/clientDb.ts'),
        import('/src/lib/authSessionLifecycle.ts'),
        import('/src/lib/apiClient.ts'),
      ]);
      auth.transitionAuthSession('authenticated', { id: 'multitab-user', role: 'mahasiswa' });
      api.apiClient.request = async () => {
        const key = 'offline-multitab-request-count';
        const calls = Number(localStorage.getItem(key) || 0) + 1;
        localStorage.setItem(key, String(calls));
        await new Promise(resolve => setTimeout(resolve, 150));
        return { success: true, status: 200 };
      };
      const session = auth.getAuthSessionSnapshot();
      return clientDb.processOutboxQueue({ userId: session.userId, generation: session.generation });
    })));
    await expect.poll(() => page.evaluate(() => Number(localStorage.getItem('offline-multitab-request-count') || 0))).toBe(1);
    await page.evaluate(async () => {
      const { clientDb } = await import('/src/lib/clientDb.ts');
      const session = await import('/src/lib/authSessionLifecycle.ts').then(module => module.getAuthSessionSnapshot());
      return clientDb.getOutboxItems().then(items => ({ session, items }));
    }).then(({ items }) => expect(items).toHaveLength(0));
  });
});
