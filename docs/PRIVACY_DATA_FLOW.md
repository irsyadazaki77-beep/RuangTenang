# Privacy data flow and deletion boundaries

This document records what the checked-in application code does. It is not a vendor contract review, legal opinion, or production operations attestation.

## AI requests

- The app can use Gemini, DeepSeek, Groq, OpenRouter, OpenAI, and an Ollama endpoint when configured. A selected model or automatic routing decision chooses the provider through the RuangTenang server. Ollama identifies the model service; it does not prove that the configured endpoint runs on the student's device or on the same host as the app.
- For registered accounts, the server checks the stored AI consent before using the AI pipeline, including temporary chats. Anonymous guest sessions require an explicit session-only acknowledgement before a provider can receive a message; without it, the server returns a general notice and does not invoke an AI provider. The guest acknowledgement is kept in browser session storage and is not a persistent consent record. Review the disclosure and guest consent design with the data-protection and product owners before deployment.
- The shared safety pipeline normalizes text and applies pattern-based personal-data redaction before the request path. This is not guaranteed anonymization. Names, unsupported identifiers, and content embedded in images or files may remain identifiable.
- Provider adapters do not all support the same attachment formats. Do not assume every file or prompt is handled identically across providers. Confirm enabled providers and model routing in each deployment.
- Chat and Workspace file uploads require AI consent before the browser sends the file body; the upload and retry endpoints also check consent before accepting or reprocessing files. OCR can call configured Gemini/OpenAI providers independently of the selected chat model, including when the chat catalog contains only Ollama.
- When `LOCAL_AI_ONLY=true` or `DISABLE_CLOUD_AI=true` in a non-test runtime, AI model adapters reject cloud providers and use configured Ollama only. Outside that global setting, visual OCR may use configured Gemini/OpenAI independently of the chat model selected for the later conversation. The current visual OCR adapter supports Gemini/OpenAI only, so an image without extracted text is preview-only in local-only mode. The application server and its configured database/storage still process uploaded files.
- Chat, mood, screening, and appointment records are also persisted by the app according to the configured database and retention settings; selecting an Ollama model does not by itself make application storage local-only. Temporary chat skips saving new chat messages to history, but still sends them for AI processing; uploaded files remain subject to application storage and cleanup rules.
- Research workflows keep Tavily web search disabled unless the user explicitly enables it in the plan panel for that Workspace session. When enabled and used, a pattern-sanitized query is sent to Tavily; pattern-based filtering is not guaranteed anonymization, and local model inference does not disable this separate external tool. Turning the option off removes the web-search tool from new task executions.
- Workspace citation searches send the entered title, author, keyword, or DOI to Crossref directly when the user invokes lookup. This is separate from Tavily opt-in and local model routing; returned metadata does not verify that a paper supports a claim.
- Code inspection cannot establish provider-side retention, training, region, or deletion behavior. The provider privacy review gate in `RELEASE_CHECKLIST.md` remains open until those terms, endpoint location, routing behavior, and deployment settings are confirmed by the responsible owner.

## Application storage

- Account records, chats, mood logs, screenings, appointments, consent settings, and related records are persisted in the configured database.
- Unsaved Workspace Canvas drafts and pre-chat local artifacts may be held in browser `sessionStorage` for tab-session recovery. This browser storage is plaintext, is not a server backup, and should not be treated as secure deletion or as suitable for a shared browser profile.
- Uploaded files are stored under `uploads/attachments/`; attachment metadata and extracted document chunks are stored in the database. Browser-side offline submissions are held in the app's IndexedDB outbox, with current code encrypting payloads before persistence.
- Calendar exports use a neutral event title and omit appointment topics. Creating a Google Calendar or Outlook event sends the event time, location, and any available session link to that calendar provider; a downloaded `.ics` stays on the device until the user shares/imports it.
- The attachment service validates database-stored paths against the attachment directory for reads and deletion. Existing symlinks and paths that resolve outside the directory are rejected.
- Tenant records now include a campus link for accounts, counselors, and appointments. Existing rows remain unassigned after migration until a responsible owner confirms the campus mapping; campus-scoped APIs exclude unassigned appointment data.

## Campus adoption analytics

- Campus product events contain only an allow-listed event code, campus ID, timestamp, and a keyed campus-scoped HMAC actor value. Chat text, screening results, journal text, names, and email addresses are not event fields.
- Events are recorded only when the student has explicitly enabled analytics consent. The daily-maintenance task removes events older than 90 days. Activity deletion and account erasure remove the matching pseudonymous events.
- Campus dashboards suppress each event metric when fewer than 10 distinct actors appear in the reporting period. Pseudonymous values remain protected data and require the same access and retention review as other analytics.

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
