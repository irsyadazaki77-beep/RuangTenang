# Production Release Checklist - RuangTenang Kampus 🌿

## Current Release Gate Status — 2026-10-20
- [x] **Typecheck (`npm run typecheck`)**: Passes with **0 errors**; both SQLite and PostgreSQL Prisma schemas validate cleanly.
- [x] **Linter (`npm run lint`)**: Passes with **0 errors and 0 warnings** across the entire repository.
- [x] **Full Test Suite (`npm test`)**: **175 test files passed, 1,254 tests passed (0 failed)** covering frontend unit/integration, backend unit/integration, security hardening (`auditRemediation`, `auditRemediationGoal`, IDOR, secrets fail-closed, file-intelligence pipeline), and all UI/UX audit remediation stages (`auditTahap1`, `auditTahap2`, `auditTahap3`).
- [x] **Production Build & Performance Budget (`npm run build:production` + `node scripts/check_bundle_size.cjs`)**: Passes cleanly (`dist/server.mjs`, `dist/backupTool.mjs`, `dist/rehearseEncryptedBackup.mjs` emitted as ESM; total JS compressed size 3,032 KB <= 3,200 KB budget; largest chunk 443 KB <= 1,500 KB budget).
- [x] **Repository Formatting Hygiene (`git diff --check`)**: Passes with 0 trailing whitespace or conflict markers.
- [x] **Security Audit Remediations (`A-01` to `A-03` & `SEC-01` to `SEC-06`)**: Atomic transactional MFA attempt counter and one-time challenge consumption (`authRepository.ts`), IP/User-Agent anonymization in Nginx logs (`nginx/nginx.conf`), aligned AES-256-GCM `.enc` backup documentation (`docs/deployment.md`), strict HTTPS meeting link sanitization, password-verified email modification, admin-scoped telemetry logging, removal of OTP/MFA secret leakage in JSON responses, and multi-campus SSE stream isolation.
- [x] **UI/UX & Accessibility Remediations (`F01` to `F16`)**: Honest empty states for PHQ-9/GAD-7 (`null` score handling), `inert` background & closed mobile sidebar focus prevention, unified `useFocusTrap` & `ModalShell` dialog semantics, accessible labels (`aria-label`/`htmlFor`), WCAG AA contrast tokens, short-viewport/320px chat & popover adaptations, two-tier mobile counselor header, streamlined 3-step booking flow, structured campus-admin emergency contact/timezone controls, skip links + `<main>` landmarks, and resilient `Avatar` fallback initials.

## Multi-campus readiness gate — 2026-10-15
- [x] Added nullable campus ownership to accounts, counselor profiles, and appointments, plus a shared campus configuration and privacy-limited product-event store.
- [x] Added platform-admin provisioning/mapping endpoints, a separate campus-admin role and panel, tenant-scoped counselor/appointment access checks, opt-in product events, a 10-user analytics suppression threshold, and 90-day event cleanup.
- [x] Added API-level cross-tenant tests for user records, screenings, appointments, counselor availability, exports, notifications, SSE stream isolation, and room signaling.
- [x] Ran typecheck, lint, unit, integration, security, and production build suites after schema synchronization (all 175 test files / 1,254 tests passing).
- [ ] Apply/rehearse migration `20261015000000_campus_tenants` and `20261016000000_encrypted_user_journals` against an isolated target PostgreSQL instance prior to production cutover.
- [ ] Map existing accounts, counselor profiles, and appointments only after the data owner approves each campus mapping. Unassigned rows stay unavailable to tenant administrators.
- [ ] Obtain clinical, privacy, accessibility, backup/restore, vendor, and campus-owner sign-off before pilot. This repository change does not provide those human or deployment approvals.
- See [`docs/MULTI_CAMPUS_OPERATIONS.md`](docs/MULTI_CAMPUS_OPERATIONS.md) for provisioning, mapping, and rollout instructions.

## 1. Pre-Deployment Verification

### Local validation — 2026-10-20
- [x] **Typecheck**: `npm run typecheck` passes with 0 errors.
- [x] **Lint**: `npm run lint` exits successfully with **0 errors and 0 warnings**.
- [x] **Production build**: `npm run build:production` succeeds with the server and backup utilities emitted as ESM.
- [x] **Bundle budget**: `node scripts/check_bundle_size.cjs` passes (3,032 KB total gzip against 3,200 KB limit; largest chunk 443 KB gzip against 1,500 KB limit).
- [x] **Automated test suite**: 1,254 tests pass across 175 unit, integration, and security test files.
- [x] **Telemetry contract regression**: Browser `onerror` and `unhandledrejection` payloads use the accepted `url` field and event type; strict unknown-field rejection, URL sanitization, and admin-only authorization (`POST /api/v1/telemetry/log`) are enforced.
- [ ] **Production environment validation**: Verify against live deployment secrets/configuration on target host.
- [ ] **PostgreSQL migration rehearsal**: Run `npm run db:rehearse:postgres` against an isolated PostgreSQL instance in the staging/production environment.

## 2. Clinical safety review
- [x] Replaced the unusable `119 ext. 8` telephone links with the official Healing119 site; separated the general medical emergency 119 link.
- [x] Removed unverified LISA and demo campus contacts from the production help directory.
- [x] Clarified that Healing119 is early psychological support, queues may be full, and emergencies require 119 or the nearest health facility.
- [x] Changed the screening dialog action so dismissing it no longer labels the person "safe"; unanswered safety questions remain unanswered in submitted data.
- [x] Changed positive PHQ-9 item 9 from an automatic crisis label to professional follow-up in the student's progress view.
- [x] Updated crisis response guidance to avoid treating a denial as proof of safety or claiming a human escalation that did not occur.
- [x] Checked current Healing119 access and queue guidance against the official Kemenkes site and FAQ.
- [ ] **Clinical sign-off required before production**: a licensed mental-health professional and the responsible campus team must review the screening language, triage thresholds, escalation ownership, and emergency routing. This software review is not clinical approval.
- [ ] **Live availability check required before production**: verify the 119 ext. 8 route and campus-specific referral contacts with the responsible service owner; source review does not confirm live phone availability.

## 3. Privacy data-flow review
- [x] Recorded application-side AI, storage, retention, and erasure behavior in [`docs/PRIVACY_DATA_FLOW.md`](docs/PRIVACY_DATA_FLOW.md); external vendor and deployment handling remain owner checks below.
- [x] Fixed non-Gemini AI adapter calls so they receive sanitized prompt/history, not raw input options; raw inline attachments are no longer forwarded to those adapters.
- [x] Replaced inaccurate Gemini-only/ephemeral-vendor and guaranteed-anonymization claims with disclosure of provider routing, pattern-based text filtering, and attachment limitations.
- [x] Encrypted new offline outbox payloads before IndexedDB storage; legacy queued payloads are encrypted before sync. Clearing activity also removes queued mood/journal/screening submissions.
- [x] Account-erasure form now sends the confirmation phrase and password required by the server, plus optional MFA code; it clears this app's IndexedDB records/outbox on the device.
- [x] Updated deletion disclosures to describe records actually removed and the retained erasure audit record; avoided promising deletion from infrastructure backups/logs.
- [x] Centralized stored-attachment path validation for reads, manual deletion, retention cleanup, and account erasure. Resolved paths are constrained to the attachment store; existing symlinks and paths outside that store are rejected.
- [x] Retention keeps a chat intact when an attached file cannot be safely removed, preventing message-cascade deletion from hiding a failed file cleanup.
- [ ] **Retention operations review required before production**: automatic cleanup is run by the daily-maintenance job; verify the job is scheduled and succeeds in the deployment environment. Current cleanup covers chats, mood logs, screenings, finished/cancelled/rejected appointments, and guest chats, not every record type.
- [ ] **Provider privacy review required before production**: confirm the provider list, contractual terms, retention settings, and any training/use controls for each enabled vendor; this code audit cannot establish vendor-side handling.
- [ ] **Data protection owner review required before production**: confirm the required retention for the erasure audit record and any backup/infrastructure logs.

## 4. Account authorization review
- [x] Restricted appointment lists to student ownership, counselor assignment, or admin filters; appointment creation is limited to students and admins so counselors cannot create a relationship that grants themselves clinical access.
- [x] Applied appointment ownership/assignment authorization to update, delete, and reschedule routes, matching room-access checks.
- [x] Restricted program-progress lookup to the owning student or an admin; other signed-in roles no longer retrieve a user's progress by ID.
- [x] Canonicalized appointment role checks so accepted role aliases (for example `student`, `clinical_counselor`, and `campus_admin`) receive the same row scoping as their canonical roles; this closes an unfiltered-list path for aliases.
- [x] Removed implicit administrator access to individual screening records and the clinical counselor portal; health-data access now requires student self-access or a consented counselor relationship.
- [x] Counselor assignment lookup now verifies the authenticated account role and exact counselor-to-user mapping before returning assigned students.
- [x] Excluded cancelled/rejected appointments from counselor health-data assignments and blocked counselors from creating appointments that could assign themselves a student's case.
- [x] Enforced password verification (`currentPassword`) and duplicate checks before allowing email address updates on `/api/v1/privacy/correct-data`.

## 5. Upload and input-abuse review
- [x] Added an upload-specific limit of 10 requests per 15 minutes before multipart parsing; existing 5 MB/file and 3-file request limits remain in place.
- [x] Bounded multipart field sizes/counts and concurrent upload processing; PDF page limits are checked from document metadata before full text extraction.
- [x] Extended retention cleanup to delete expired chat attachments and unlinked uploads, including guest attachments after 24 hours; cleanup removes extracted document chunks and uses the centralized attachment path checks above.
- [x] Daily maintenance output now reports attachment cleanup counts.
- [x] Enforced maximum 100 chunks per document across sentence-splitting loops and final flush, with overlapping window prompt-injection scanning up to the extraction limit.
- [ ] **Operational verification required before production**: confirm upload limits work with the production proxy/IP configuration and monitor file storage/cleanup failures. Express limiters now use atomic Redis counters with an enforced per-process fallback and alert metric when Redis is unavailable.

## 6. Performance and loading review
- [x] Lazy-loaded the student and counselor application shells by authenticated role, with an accessible loading status while the selected workspace downloads.
- [x] Production build passes. The role-specific shells, Canvas editor, Mermaid renderer, and export engines are split into on-demand chunks.
- [x] Bundle budget passes at 3,032 KB total gzip and 443 KB largest gzip chunk (`elk`).
- [x] **Server bundle format**: emitted as ESM so script entrypoint guards using `import.meta` remain valid.
- [x] Bounded artifact version diffing (250,000-cell exact LCS cap with unique-line anchors and 250-line paginated `ArtifactDiffViewer`) and debounced Tiptap Markdown synchronization.
- [ ] **Field performance measurement required before production**: measure initial route LCP/INP and mobile transfer size on a representative low-end device and throttled connection; local bundle size is not a substitute for real-user metrics.

## 7. Accessibility and mobile interaction review
- [x] Screening and safety-check dialogs expose dialog semantics, trap keyboard focus, and restore focus on close; the safety overlay has a name/description for assistive technology.
- [x] Shared `ModalShell` and `useFocusTrap` dialogs have unique accessible title/description IDs, initial focus, a keyboard focus loop, Escape close, focus restoration, and background scroll lock.
- [x] Closed mobile sidebar is marked `inert` so keyboard Tab navigation cannot focus off-screen drawer controls.
- [x] Privacy-center focus handling runs only while open, skips hidden/disabled controls, keeps Tab within the dialog, and restores prior focus on close.
- [x] Screening question changes are announced politely, and selected answers expose pressed state to screen readers.
- [x] ESLint (`jsx-a11y` + `react-hooks`) passes with 0 errors and 0 warnings across the entire codebase.
- [ ] **Manual accessibility review required before production**: test the screening and safety dialogs with NVDA/VoiceOver, keyboard-only navigation, 200% zoom, and reduced-motion settings on physical devices.

## 8. Release and recovery review
- [x] Corrected the smoke check to inspect the real public web manifest; removed its request to a nonexistent version endpoint.
- [x] Hardened PostgreSQL backups to invoke `pg_dump` without a shell, avoid putting the database URL in process arguments/logs, validate the archive with `pg_restore --list`, restrict local file permissions, and publish only completed backup files.
- [x] Changed rollback guidance to prefer application rollback and treat database restore as a separately approved recovery action, since restore can discard writes made after the snapshot.
- [x] Local database backups are authenticated AES-256-GCM ciphertext (`.enc`) and require a dedicated `BACKUP_ENCRYPTION_KEY`; plaintext staging files are removed after encryption.
- [x] Local backup retention is seven days; PostgreSQL CI restores an encrypted backup into a disposable database and verifies the restored schema.
- [ ] **Restore rehearsal required before production**: restore a recent PostgreSQL dump into a new isolated database on the target infrastructure, verify representative records and application startup, then record duration and recovery point.
- [ ] **Backup storage required before production**: configure encrypted, access-controlled off-host storage and confirm a retained off-host copy.
- [ ] **Deployment rollback rehearsal required before production**: keep immutable prior application images available and practice routing traffic back without restoring the database.

## 9. Deployment Steps
1. Configure non-secret values in `.env.production` and provide secret file paths using `.env.example`:
   - Set `NODE_ENV=production`
   - Set `PORT=3000`
   - Mount `JWT_SECRET`, `ENCRYPTION_KEY`, `BLIND_INDEX_SECRET`, and `DATABASE_URL` from Compose secret files; production SQLite is rejected.
   - Set `BACKUP_ENCRYPTION_KEY` as a dedicated 32-byte hex key in its own secret file.
   - Set PostgreSQL and Redis passwords in mounted secret files. The database URL password must match the PostgreSQL password file.
   - Configure provider credentials only for AI providers that are enabled. `GEMINI_API_KEY` is optional when another provider or local fallback is intended.
   - Keep demo seeding disabled in production.
2. Build production container artifact:
   - `npm run build:production`
3. Execute database migration/deploy step:
   - `npm run db:deploy`
4. Launch production server process:
   - `npm run start`

## 10. Post-Deployment Verification
- [ ] Check Liveness endpoint `/api/v1/health` returns `{ "status": "ok" }` (HTTP 200).
- [ ] Check Readiness endpoint `/api/v1/readiness` returns `{ "status": "ready", "database": "connected" }` (HTTP 200).
- [ ] Verify HTTPS & CSP headers (`Cache-Control: no-store` on API responses).
- [ ] Verify `/manifest.json` loads and the configured production origin is correct.
- [ ] Check AI chat only when its provider credentials, consent flow, quota, and provider fallback have been configured for the deployment.
- [ ] Confirm emergency helpline contacts load correctly.
- [ ] Run production smoke check against the deployed HTTPS origin. PowerShell: `$env:SMOKE_TARGET_URL='https://<deployment-host>'; npm run test:smoke`. POSIX shell: `SMOKE_TARGET_URL=https://<deployment-host> npm run test:smoke`.

## 11. Rollback and data recovery
1. For an application-only incident, route traffic to the previous immutable image and verify liveness/readiness. Do not restore the database solely because the application image was rolled back.
2. If a migration has failed, stop rollout and assess the migration state and backward compatibility before running `prisma migrate resolve` or applying another migration.
3. Restore a database snapshot only under the incident recovery procedure, against an isolated target first, with an explicit recovery point and an understanding that writes after that snapshot will be lost.
4. Verify recovery via `/api/v1/health`, `/api/v1/readiness`, and the release smoke check.
