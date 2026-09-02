# Production Release Checklist — RuangTenang 🌿

Comprehensive release checklist for SREs, QA Engineers, and DevOps to ensure zero-downtime, secure, and accessible deployment of RuangTenang pre-production and production releases.

---

## 📅 Release Metadata
- **Current Version:** `v0.9.0` (Semantic pre-production release)
- **Target Environment:** Cloud Run (Monolith Container) + Cloud SQL (PostgreSQL)
- **Date:** 2 September 2026

---

## 🗂️ Production Readiness Checklist

### 1. Verification & Testing Gates
- [ ] **dependencies installed:** All packages are updated, and no unresolved or vulnerability-prone npm dependencies exist in `package.json`.
- [ ] **env validated:** `NODE_ENV=production` variable verification is set, and strict fail-fast validation for `JWT_SECRET`, `ENCRYPTION_KEY`, and `GEMINI_API_KEY` is fully configured.
- [ ] **migrations reviewed:** Postgres migration files are clean and review-checked for zero data-destructive operations.
- [ ] **typecheck:** TypeScript compilation passes with zero errors (`npm run typecheck`).
- [ ] **lint:** Codebase is clean of styling, structural, and syntax errors (`npm run lint`).
- [ ] **unit:** All Vitest unit tests for both client and server are green (`npm run test:unit`).
- [ ] **integration:** Integration tests for data persistence, session, and API flows pass successfully (`npm run test:integration`).
- [ ] **security:** AES-256-GCM encryption on client and server side, JWT expiration, and CSRF guardrails validated successfully (`npm run test:security`).
- [ ] **E2E:** Playwright end-to-end tests for critical paths (counselor booking, crisis center SOS, PHQ-9 screening) pass with zero flakiness (`npm run test:e2e`).
- [ ] **production build:** Standard build command executes correctly and compiles a self-contained production bundle at `dist/` and `dist/server.cjs` (`npm run build`).

### 2. Database & Infrastructure Safety
- [ ] **PostgreSQL migration rehearsal:** Database schema and query performance are fully audited and validated using the custom Postgres rehearsal tool (`npm run db:rehearse`).
- [ ] **backup verified:** SQLite and pg_dump backups are tested and validated as restorable in SRE simulations (`npm run db:backup`).
- [ ] **privacy checks:** GDPR & UU PDP compliance checks passed (Consent opt-in/opt-out status for AI, raw data export, and Right to Be Forgotten deletion workflows).
- [ ] **smoke test:** Simple HTTP response check on `/api/v1/health` and live Gemini verification ping is successful.
- [ ] **tag release:** Commit is tagged with the official semantic version (e.g., `git tag -a v0.9.0 -m "Release v0.9.0"`).

---

## 🚀 Execution & Rollback Protocols

### Deployment Workflow (Zero Downtime)
1. **Rehearse Postgres Schema:** Execute `npm run db:rehearse` to verify PostgreSQL connection and index alignment.
2. **Execute Database Migration:** Apply prisma migration to Cloud SQL:
   ```bash
   npm run db:deploy:postgres
   ```
3. **Build Bundle:** Run production bundler:
   ```bash
   npm run build
   ```
4. **Deploy Container:** Rollout new container to Cloud Run with correct secrets mapped.
5. **Post-Deployment Smoke Test:** Access `/api/v1/health` and verify `status: "healthy"`.

### Rollback Plan
In case of critical degradation or failure (e.g., latency spikes, memory leak, DB connection issues):
1. **Revert Image:** Immediately point Cloud Run traffic back to the previous stable release container tag.
2. **Restore DB Backup:** If schema modifications occurred and caused failure, restore database from backup created prior to release.
3. **Notify SRE Team:** Log incident report in observability systems.
