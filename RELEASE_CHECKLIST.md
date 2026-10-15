# Production Release Checklist - RuangTenang Kampus 🌿

## Multi-campus readiness gate — 2026-10-15
- [x] Added nullable campus ownership to accounts, counselor profiles, and appointments, plus a shared campus configuration and privacy-limited product-event store.
- [x] Added platform-admin provisioning/mapping endpoints, a separate campus-admin role and panel, tenant-scoped counselor/appointment access checks, opt-in product events, a 10-user analytics suppression threshold, and 90-day event cleanup.
- [ ] Generate both Prisma clients and apply/rehearse migration `20261015000000_campus_tenants` against isolated SQLite and PostgreSQL databases.
- [ ] Map existing accounts, counselor profiles, and appointments only after the data owner approves each campus mapping. Unassigned rows stay unavailable to tenant administrators.
- [ ] Add API-level cross-tenant tests for user records, screenings, appointments, counselor availability, exports, notifications, and room signaling; confirm review of any remaining direct database queries.
- [ ] Run typecheck, lint, unit, integration, security, and E2E suites after the migration; prior release gates and environment blockers below remain open until rerun.
- [ ] Obtain clinical, privacy, accessibility, backup/restore, vendor, and campus-owner sign-off before pilot. This repository change does not provide those human or deployment approvals.
- See [`docs/MULTI_CAMPUS_OPERATIONS.md`](docs/MULTI_CAMPUS_OPERATIONS.md) for provisioning, mapping, and rollout instructions.

### Validation snapshot — 2026-10-15
- [x] `npm run typecheck` passes; both SQLite and PostgreSQL Prisma schemas validate.
- [x] Focused unit/security checks pass: 12 appointment/campus unit tests and 12 appointment authorization/idempotency security tests.
- [ ] Full unit run: 655 passed, 2 failed. The failures are the Windows backup-file permission assertion and production environment fixtures that do not provide the required dedicated 32-byte hex backup key.
- [ ] Full security run: 282 passed, 18 failed. The current SQLite test database lacks `MobileRefreshToken`; other failures include old production-secret fixtures and a counselor-query mock expectation. The appointment idempotency failures from this run were fixed and the focused security file then passed; rerun the full suite after test-database migration.
- [ ] Clean install/client generation and integration/E2E suites remain open. Prisma generation previously hit Windows `EPERM` replacing a locked native engine; no isolated PostgreSQL instance was available for migration rehearsal.
- [ ] `git diff --check` still reports trailing whitespace in pre-existing AI model files; it reports no formatting issue in the tenant files added in this change.

## Fase 1 gate status — 2026-10-02
- [ ] **Not a production candidate.** The final revision has not completed the full required quality gate.
- [ ] `npm ci` failed with Windows `EPERM` while replacing locked native binaries. `npm install --ignore-scripts --no-audit --no-fund` restored enough tooling for local checks, but Prisma Client generation is blocked because `binaries.prisma.sh` is unreachable. Typecheck fails on missing generated Prisma exports; unit/integration/security scripts stop before Vitest for the same reason.
- [x] `npm run lint` exits 0 with 284 warnings and no errors.
- [x] Focused regression suite: 18 tests pass across citation, Mermaid sanitizer, AI adapters, IP privacy, document encryption, and crisis fusion.
- [ ] E2E: 77 passed and 25 failed. Failures include stale route expectations, navigation timeouts, prompt injection expectation, and onboarding overlay interactions; see the recorded run for details.
- [x] Production build completed successfully once; rerun after final edits remains blocked by native binary/file-lock instability if applicable.
- [ ] Apply and rehearse migration `20261002000000_encrypt_document_storage` against an isolated PostgreSQL database; regenerate the SQLite and PostgreSQL Prisma clients.
- See [`docs/RELEASE_REPORT.md`](docs/RELEASE_REPORT.md) for current results and the precise environment blockers.

## 1. Pre-Deployment Verification

### Local validation — 2026-10-01
- [x] **Typecheck**: `npm run typecheck` passes with 0 errors.
- [x] **Lint**: `npm run lint` exits successfully with 0 errors and 302 warnings. This is not a warning-free lint run.
- [x] **Production build**: `npm run build` succeeds with the server emitted as ESM, removing the four CommonJS `import.meta` warnings. The frontend still reports the 5 MB uncompressed Mermaid chunk; it is lazy-loaded.
- [x] **Bundle budget**: `node scripts/check_bundle_size.cjs` passes (2,310 KB total gzip; largest chunk 1,401 KB gzip against a 1,500 KB limit).
- [x] **Frontend tests**: 187 tests pass across 32 unit and integration files.
- [x] **Backend tests**: 508 unit, integration, and security tests pass across 55 files using a temporary isolated SQLite database. Vitest was invoked directly so the normal test setup would not rewrite the working SQLite schema or touch its database.
- [x] **Telemetry contract regression**: Browser `onerror` and `unhandledrejection` payloads now use the accepted `url` field and event type; four tests cover payload acceptance, strict unknown-field rejection, and URL sanitization.
- [ ] **Production environment validation**: Not verified against deployment secrets/configuration.
- [ ] **PostgreSQL migration rehearsal**: Not run against an isolated PostgreSQL instance.

Production environment validation and PostgreSQL migration rehearsal remain unverified.

## 2. Clinical safety review — 2026-10-01
- [x] Replaced the unusable `119 ext. 8` telephone links with the official Healing119 site; separated the general medical emergency 119 link.
- [x] Removed unverified LISA and demo campus contacts from the production help directory.
- [x] Clarified that Healing119 is early psychological support, queues may be full, and emergencies require 119 or the nearest health facility.
- [x] Changed the screening dialog action so dismissing it no longer labels the person “safe”; unanswered safety questions remain unanswered in submitted data.
- [x] Changed positive PHQ-9 item 9 from an automatic crisis label to professional follow-up in the student's progress view.
- [x] Updated crisis response guidance to avoid treating a denial as proof of safety or claiming a human escalation that did not occur.
- [x] Checked current Healing119 access and queue guidance against the official Kemenkes site and FAQ.
- [ ] **Clinical sign-off required before production**: a licensed mental-health professional and the responsible campus team must review the screening language, triage thresholds, escalation ownership, and emergency routing. This software review is not clinical approval.
- [ ] **Live availability check required before production**: verify the 119 ext. 8 route and campus-specific referral contacts with the responsible service owner; source review does not confirm live phone availability.

## 3. Privacy data-flow review — 2026-10-01
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

## 4. Account authorization review — 2026-10-01
- [x] Restricted appointment lists to student ownership, counselor assignment, or admin filters; appointment creation is limited to students and admins so counselors cannot create a relationship that grants themselves clinical access.
- [x] Applied appointment ownership/assignment authorization to update, delete, and reschedule routes, matching room-access checks.
- [x] Restricted program-progress lookup to the owning student or an admin; other signed-in roles no longer retrieve a user's progress by ID.
- [x] Canonicalized appointment role checks so accepted role aliases (for example `student`, `clinical_counselor`, and `campus_admin`) receive the same row scoping as their canonical roles; this closes an unfiltered-list path for aliases.
- [x] Removed implicit administrator access to individual screening records and the clinical counselor portal; health-data access now requires student self-access or a consented counselor relationship.
- [x] Counselor assignment lookup now verifies the authenticated account role and exact counselor-to-user mapping before returning assigned students.
- [x] Excluded cancelled/rejected appointments from counselor health-data assignments and blocked counselors from creating appointments that could assign themselves a student's case.
- [ ] **Access-control verification required before production**: exercise student-to-student, counselor-to-unassigned-student, peer-counselor, and unknown-role requests against an isolated deployment; this source review did not run security tests.

## 5. Upload and input-abuse review — 2026-10-02
- [x] Added an upload-specific limit of 10 requests per 15 minutes before multipart parsing; existing 5 MB/file and 3-file request limits remain in place.
- [x] Bounded multipart field sizes/counts and concurrent upload processing; PDF page limits are checked from document metadata before full text extraction.
- [x] Extended retention cleanup to delete expired chat attachments and unlinked uploads, including guest attachments after 24 hours; cleanup removes extracted document chunks and uses the centralized attachment path checks above.
- [x] Daily maintenance output now reports attachment cleanup counts.
- [ ] **Operational verification required before production**: confirm upload limits work with the production proxy/IP configuration and monitor file storage/cleanup failures. Express limiters now use atomic Redis counters with an enforced per-process fallback and alert metric when Redis is unavailable.

## 6. Performance and loading review — 2026-10-01
- [x] Lazy-loaded the student and counselor application shells by authenticated role, with an accessible loading status while the selected workspace downloads.
- [x] Production build passes. The main entry chunk decreased from 674 KB to 147 KB raw; the role-specific shells are separate chunks.
- [x] Bundle budget passes at 2,310 KB total gzip and 1,401 KB largest gzip chunk. Mermaid remains a large 5.0 MB raw / 1.4 MB gzip chunk, deferred until a Mermaid diagram is rendered.
- [x] **Server bundle format**: emitted as ESM so script entrypoint guards using `import.meta` remain valid and the four CommonJS format warnings are gone.
- [ ] **Frontend chunk warning**: Mermaid remains a 5 MB uncompressed chunk (1,401 KB gzip); it is lazy-loaded, and further splitting can be considered if field metrics warrant it.
- [ ] **Field performance measurement required before production**: measure initial route LCP/INP and mobile transfer size on a representative low-end device and throttled connection; local bundle size is not a substitute for real-user metrics.

## 7. Accessibility and mobile interaction review — 2026-10-02
- [x] Screening and safety-check dialogs expose dialog semantics, trap keyboard focus, and restore focus on close; the safety overlay has a name/description for assistive technology.
- [x] Shared `ModalShell` dialogs now have unique accessible title/description IDs, initial focus, a keyboard focus loop, Escape close, focus restoration, and background scroll lock.
- [x] Privacy-center focus handling now runs only while open, skips hidden/disabled controls, keeps Tab within the dialog, and restores prior focus on close.
- [x] Screening question changes are announced politely, and selected answers expose pressed state to screen readers.
- [ ] **Manual accessibility review required before production**: test the screening and safety dialogs with NVDA/VoiceOver, keyboard-only navigation, 200% zoom, and reduced-motion settings. Automated lint is not a substitute.
- [ ] **Lint follow-up**: targeted ESLint passes with 0 errors and 1 existing ref-cleanup warning in `ScreeningModal.tsx` for its auto-advance timer.

## 8. Release and recovery review — 2026-10-01
- [x] Corrected the smoke check to inspect the real public web manifest; removed its request to a nonexistent version endpoint.
- [x] Hardened PostgreSQL backups to invoke `pg_dump` without a shell, avoid putting the database URL in process arguments/logs, validate the archive with `pg_restore --list`, restrict local file permissions, and publish only completed backup files.
- [x] Changed rollback guidance to prefer application rollback and treat database restore as a separately approved recovery action, since restore can discard writes made after the snapshot.
- [ ] **Restore rehearsal required before production**: restore a recent PostgreSQL dump into a new isolated database, verify representative records and application startup, then record duration and recovery point.
- [x] Local database backups are now authenticated AES-256-GCM ciphertext and require a dedicated `BACKUP_ENCRYPTION_KEY`; plaintext staging files are removed after encryption.
- [x] Local backup retention is seven days; PostgreSQL CI now restores an encrypted backup into a disposable database and verifies the restored schema.
- [ ] **Backup storage required before production**: configure encrypted, access-controlled off-host storage and confirm a retained off-host copy. The repository does not configure a cloud/object-storage destination.
- [ ] **Deployment rollback rehearsal required before production**: keep immutable prior application images available and practice routing traffic back without restoring the database.
- [ ] **Live release gates remain open**: run the smoke check against the deployment target and complete the pending clinical, privacy, access-control, accessibility, and production-environment reviews above.

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
   - `npm run build`
3. Execute database migration/deploy step:
   - `npm run db:deploy`
4. Launch production server process:
   - `npm run start`

## 10. Post-Deployment Verification
- [ ] Check Liveness endpoint `/api/v1/health` returns `{ "status": "healthy" }` (HTTP 200).
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
