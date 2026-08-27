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
- [ ] Check `/api/v1/health` endpoint returns `{ status: "healthy" }` (HTTP 200).
- [ ] Verify HTTPS & CSP headers (`Cache-Control: no-store` on API responses).
- [ ] Test guest chat streaming & AI proxy response.
- [ ] Confirm emergency helpline contacts load correctly.

## 4. Rollback Plan
- In case of critical failure:
  1. Revert container image tag to previous stable build.
  2. Restore database backup from `backups/` if schema changes occurred.
  3. Restart production container instance.
