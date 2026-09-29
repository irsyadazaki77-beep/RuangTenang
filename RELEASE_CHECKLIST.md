# Production Release Checklist - RuangTenang Kampus 🌿

## 1. Pre-Deployment Verification
- [x] **Typecheck**: `npm run typecheck` passes with 0 errors.
- [x] **Linting & Accessibility**: `npm run lint` passes (ESLint + `jsx-a11y` rules).
- [x] **Unit & Integration Tests**: All Vitest frontend and backend tests pass without failure.
- [x] **Security Audit**: All AES-256-GCM encryption, JWT verification, and authorization tests pass.
- [x] **Environment Validation**: `NODE_ENV=production` secrets validated (`JWT_SECRET` >= 32 chars, `ENCRYPTION_KEY` >= 32 chars, no demo secrets allowed).
- [x] **Database Migrations**: Database schema synced via Prisma (`npm run db:deploy`).

## 2. Deployment Steps
1. Configure environment variables in deployment environment (Cloud Run / Container environment):
   - Set `NODE_ENV=production`
   - Set `PORT=3000`
   - Set `JWT_SECRET` (at least 32 random characters)
   - Set `ENCRYPTION_KEY` (32-byte hex string)
   - Set `GEMINI_API_KEY`
   - Set `DATABASE_URL`
   - Ensure `SEED_DEMO_DATA=false`
2. Build production container artifact:
   - `npm run build`
3. Execute database migration/deploy step:
   - `npm run db:deploy`
4. Launch production server process:
   - `npm run start`

## 3. Post-Deployment Verification
- [ ] Check Liveness endpoint `/api/v1/health` returns `{ "status": "healthy" }` (HTTP 200).
- [ ] Check Readiness endpoint `/api/v1/readiness` returns `{ "status": "ready", "database": "connected" }` (HTTP 200).
- [ ] Verify HTTPS & CSP headers (`Cache-Control: no-store` on API responses).
- [ ] Test guest chat streaming & AI proxy response.
- [ ] Confirm emergency helpline contacts load correctly.
- [ ] Run production smoke test (`npm run test:security`).

## 4. Rollback Plan
- In case of critical application failure:
  1. Revert container image tag to previous stable image (`docker compose -f docker-compose.prod.yml down && docker compose -f docker-compose.prod.yml up -d`).
  2. If database migration failed or schema became incompatible:
     - Halt application container rollout immediately.
     - Restore PostgreSQL snapshot:
       ```bash
       gunzip -c backups/db_backup_TIMESTAMP.sql.gz | docker exec -i ruangtenang_db_prod psql -U ruangtenang_admin -d ruangtenang_prod
       ```
     - Resolve failed migration marker: `npx prisma migrate resolve --rolled-back <MIGRATION_NAME> --schema prisma/schema.postgres.prisma`.
  3. Verify recovery via `/api/v1/health` and `/api/v1/readiness`.
