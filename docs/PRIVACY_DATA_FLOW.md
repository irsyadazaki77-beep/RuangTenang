# Privacy data flow and deletion boundaries

This document records what the checked-in application code does. It is not a vendor contract review, legal opinion, or production operations attestation.

## AI requests

- The app presents Gemini, DeepSeek, Groq, and OpenRouter as possible AI providers. A selected model or automatic routing decision chooses the provider through the RuangTenang server.
- For registered accounts, the server checks the stored AI consent before using the AI pipeline. When consent is absent, it returns a local fallback. Guest and temporary sessions currently enter the AI path without a persistent consent record; review this behavior with the data-protection and product owners before deployment.
- The shared safety pipeline normalizes text and applies pattern-based personal-data redaction before the request path. This is not guaranteed anonymization. Names, unsupported identifiers, and content embedded in images or files may remain identifiable.
- Provider adapters do not all support the same attachment formats. Do not assume every file or prompt is handled identically across providers. Confirm enabled providers and model routing in each deployment.
- Code inspection cannot establish provider-side retention, training, region, or deletion behavior. The provider privacy review gate in `RELEASE_CHECKLIST.md` remains open until those terms and deployment settings are confirmed by the responsible owner.

## Application storage

- Account records, chats, mood logs, screenings, appointments, consent settings, and related records are persisted in the configured database.
- Uploaded files are stored under `uploads/attachments/`; attachment metadata and extracted document chunks are stored in the database. Browser-side offline submissions are held in the app's IndexedDB outbox, with current code encrypting payloads before persistence.
- The attachment service validates database-stored paths against the attachment directory for reads and deletion. Existing symlinks and paths that resolve outside the directory are rejected.

## Retention and erasure

- Automatic retention uses each consent record's configured retention period for old chats, mood logs, screenings, and completed/cancelled/rejected appointments. Guest chats and related uploads are eligible after 24 hours. Old unlinked uploads are also cleaned.
- If an attachment cannot be safely deleted, cleanup keeps its database record and preserves its associated chat so a message cascade cannot silently discard the failure evidence. Operators should inspect the maintenance result/log and retry after resolving the storage issue.
- Account erasure deletes application records and files reachable through the app's configured storage path, while retaining an erasure audit record. The audit hashes the email, but its details still include the account ID and may include the requesting staff member's name; the responsible owner must approve its retention and access policy. Activity-only erasure follows its narrower product flow.
- The app cannot confirm deletion from provider systems, database snapshots, infrastructure logs, or previously created backups. Backup encryption, storage location, access, expiry, and restore rehearsal remain deployment-owner responsibilities in `docs/deployment.md` and `RELEASE_CHECKLIST.md`.

## Owner checks before production

1. Confirm the actual enabled AI vendors, model routing, terms, data-use controls, and retention settings.
2. Confirm guest/temporary AI processing behavior and whether the consent design matches campus policy.
3. Set the required retention period for erasure audit records, backups, and infrastructure logs.
4. Verify the daily maintenance schedule and investigate attachment cleanup failures in the deployment environment.
5. Store backups in approved encrypted, access-controlled off-host storage and rehearse restore into an isolated database.
