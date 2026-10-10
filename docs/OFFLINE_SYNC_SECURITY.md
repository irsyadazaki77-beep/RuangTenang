# Offline Sync Security

## Threat model

This design addresses accidental cross-account reads, retries, writes, and queue acknowledgements on a shared browser profile. It assumes the server session is authoritative and that browser storage may contain data from several previously signed-in accounts. It does not treat a user ID, local storage value, offline-owner header, or ciphertext as authorization.

An attacker running JavaScript on the same origin, a successful XSS, browser extensions with page access, or someone using an unlocked profile can inspect application memory and invoke the same-origin IndexedDB APIs. Web Crypto and per-account derivation reduce accidental mixing and protect persisted payloads from casual inspection; they do not create an XSS boundary.

## Data flow and ownership

```text
Restored authenticated session
  → validated action schema and fixed operation allowlist
  → owner derived from AuthContext lifecycle (student accounts only)
  → account-bound AES-GCM ciphertext + stable idempotency key
  → owner-indexed IndexedDB record
  → generation and owner checks before decrypt, request, and acknowledgement
  → active cookie session + offline-owner consistency assertion
  → authenticated server actor and endpoint ownership rules
  → database-backed idempotency reservation
  → owner-scoped queue acknowledgement
```

Outbox records contain the owner ID, action type, fixed `create` operation, encrypted payload, encryption version, idempotency key, status, retry metadata, and timestamps. They do not contain a URL or authentication credential. Only `mood_log → POST /api/v1/mood` and `appointment → POST /api/v1/appointments` can be newly enqueued. Other old action names remain legacy-only and cannot sync.

Offline payloads and decrypted action bodies are never written to console or telemetry. Mood and booking creation failures log stable generic error codes rather than request or ORM details that might echo private notes.

Enqueue, list, count, clear, and sync APIs derive the active identity from the in-memory authentication lifecycle. An expected user ID supplied by a form is only a mismatch check; it never selects the stored owner. Guest, counselor, admin, initializing, refreshing, logging-out, and switching-account states cannot enqueue or process student offline actions.

## Encryption

Outbox encryption uses Web Crypto AES-GCM with a fresh 96-bit random IV for every payload. A random 256-bit outbox root seed is stored in the same-origin crypto IndexedDB key store, then HKDF-SHA-256 derives a key with the account ID as namespace information. AES-GCM additional authenticated data binds ciphertext to the account ID, action type, operation, and format version. The outbox stores a version-2 ciphertext envelope and the numeric `encryptionVersion`.

The account ID is public context, not a secret or encryption key. The root seed is available to same-origin JavaScript. No Privacy Vault PIN, password, or access token is used as key material. If secure randomness, IndexedDB key storage, AES-GCM, validation, or encryption is unavailable, enqueue fails and no plaintext outbox fallback is written. Existing non-outbox app caches retain their prior RAM-only fallback behavior.

## IndexedDB migration and legacy records

Database version 3 adds owner/status indexes and upgrades old outbox rows in a version-change transaction. Rows without a verifiable v2 envelope are marked `quarantined`; missing owners remain `null` with `failureKind: owner_unknown`. No active account is assigned to a legacy row. The migration never decrypts legacy payloads to infer identity. If an old row contains an unencrypted payload object, the migration encrypts it as opaque legacy material; if encryption fails, the upgrade fails closed rather than committing plaintext.

Quarantined records are excluded from all account-scoped readers and sync queries. The UI explains that legacy data cannot be attributed safely. There is no “claim as current user” action. Because no former owner can be established, account-scoped deletion does not remove these rows; they remain encrypted and quarantined until browser site data is cleared.

## Authentication lifecycle and account changes

The lifecycle is `initializing → authenticated`, with explicit `refreshing`, `logging_out`, `switching_account`, and `unauthenticated` transitions. Every identity/lifecycle transition advances a session generation. Sync starts only for a restored, stable authenticated student session. Logout, session refresh, and account changes invalidate the generation, clear in-memory plaintext/key caches, and abort active fetches where supported.

The sync loop checks owner and generation before decrypting, after decryption, immediately before request dispatch, after the response, and before deleting the queue row. Credentials are supplied by the browser's active authenticated session at request time; they are never read from the queue. The `X-RuangTenang-Offline-Owner` header is only compared with the authenticated server actor and grants no authority. Server routes derive record ownership from `req.user`.

On account switch, the old account's persistent queue is retained. Privacy clearing and account erasure delete only the current account's queue and known account-keyed encrypted caches. They do not clear another account's queue.

## Retry, acknowledgement, and idempotency

Each queued action has one random idempotency key that remains unchanged through retries. The server rejects offline-owner requests without an idempotency key, bounds and validates key format, and namespaces keys by authenticated actor, method, and route. A request body hash detects key reuse with different content. A database uniqueness reservation prevents two requests or tabs from executing the same key concurrently. Replays return a cached safe response; mood responses cache only the new record ID, and appointment responses cache scheduling fields without clinical notes or student identifiers.

Transient network/timeout, 429, 5xx, and in-progress idempotency responses retry with bounded exponential backoff, at most five transient attempts. A valid `Retry-After` value is honored within a 1-second to 15-minute bound. A 401 pauses that item until the authentication generation changes. 400, 403, 409 conflicts, and 422 are retained as permanent failures for user review. Successful actions are deleted only after a server success response and a final owner/generation/lease check. Failed actions are not silently deleted.

Records older than 90 days stop auto-retrying and become retained permanent failures for review. Each student account is limited to 100 queued records and each serialized payload to 64 KiB. Quota/limit/encryption failures are surfaced as “not saved”; the UI does not claim success.

## Multi-tab behavior

IndexedDB read-write transactions claim work using a per-item lease token with a 60-second expiry. Only one tab can claim a given item at a time. A tab that closes mid-sync leaves a recoverable lease; other tabs can retry after expiry. `BroadcastChannel` and a same-tab event refresh status displays only; they are not the concurrency guarantee. Server idempotency is the final duplicate guard.

## UI status and guest behavior

Pending counts and queue details are read only for the active account. The UI distinguishes pending, syncing, transient failure, authentication pause, permanent failure, and quarantine notice. A success toast is emitted only after a server-confirmed sync or a successfully encrypted local enqueue. Guests may complete supported local-only screening, but cannot create persistent sensitive outbox entries that later attach to a signed-in account.

## Remaining limits

- XSS, malicious same-origin scripts, browser extensions, or physical access to an unlocked browser can inspect plaintext while it is in memory and can access the same-origin crypto key store.
- A request already received by the server may finish after the browser aborts it. The client leaves the queue row unacknowledged; the stable server idempotency key lets the original account safely resolve the result later.
- A process crash after a server-side idempotency reservation but before response caching can leave the key marked in progress. The client retries only a bounded number of times and then retains the item for review rather than risk duplicating an operation.
- Legacy ownerless records cannot be safely attributed or automatically restored. Encryption at rest does not prove their former owner.
- Server idempotency reservations are retained for 24 hours. Very late retries after that window are not guaranteed to deduplicate.
