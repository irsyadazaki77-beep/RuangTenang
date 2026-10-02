# Deployment and recovery runbook

This runbook describes the checked-in Docker Compose and Node deployment paths. It does not certify that a specific production environment is configured, monitored, backed up, or ready to receive traffic. The active release gates are tracked in [`../RELEASE_CHECKLIST.md`](../RELEASE_CHECKLIST.md).

## Runtime requirements

- Production requires PostgreSQL. Startup rejects SQLite in production.
- Inject `JWT_SECRET`, `ENCRYPTION_KEY`, `BLIND_INDEX_SECRET`, and `DATABASE_URL` from the deployment secret store. Do not bake credentials into an image or use `VITE_` names for server secrets.
- Configure credentials only for AI providers enabled in that environment. AI provider availability and consent are separate from application liveness/readiness.
- The checked-in Compose production stack includes PostgreSQL, Redis, the app, and Nginx. Review and replace example origins and TLS mounts before deployment.
- `GET /api/v1/health` is a process liveness check. `GET /api/v1/readiness` checks the database and required startup configuration. Neither proves that AI providers, email/SMS, counselor availability, or all application flows work.

## Release sequence

1. Review code, Prisma migrations, environment values, and the open gates in the active release checklist.
2. Build the production artifact with `npm run build` and retain its immutable image identifier.
3. Take a pre-migration PostgreSQL backup and confirm it is non-empty and archive-readable.
4. Apply migrations with `npm run db:deploy` (or the deployment job's equivalent) before routing new traffic.
5. Start the new app image and check `/api/v1/health` and `/api/v1/readiness`.
6. Run `npm run test:smoke` with `SMOKE_TARGET_URL` set to the deployed HTTPS origin. This smoke check does not test authenticated workflows, AI providers, clinical correctness, or restore capability.
7. Keep the previous immutable image available until the release is accepted.

The repository's `deploy.sh` is a Compose rollout helper. Review its environment parsing, migration behavior, and host-specific configuration before using it in a production environment; a successful container health check is not a complete release sign-off.

## PostgreSQL backup

Run `npm run db:backup` from an operator environment with `DATABASE_URL`, `pg_dump`, and `pg_restore` configured. The utility writes a PostgreSQL custom-format archive under `backups/`, validates its archive table of contents with `pg_restore --list`, uses a temporary file until validation passes, and applies restrictive local permissions where the operating system supports them.

The dump contains sensitive application data and is **not encrypted by this utility**. Store it only in access-controlled, encrypted storage, keep an off-host copy, and apply the approved retention schedule. Do not commit backup files or leave them on a shared deployment host.

## Restore rehearsal and recovery

Practice restores against a new, isolated, empty PostgreSQL database. Do not restore over production as a routine rollback step.

```bash
pg_restore --exit-on-error --no-owner --dbname="$RESTORE_DATABASE_URL" backups/postgres-backup-TIMESTAMP.dump
```

After restore, validate migration state, representative application records, and app startup before considering a controlled endpoint or traffic switch. Record the snapshot time, restore duration, and any lost-write window. Restore can discard all writes newer than the snapshot.

For an application-only failure, route traffic to the retained previous image and inspect schema compatibility. Do not roll back the database just because the app image was reverted. For a failed migration, stop rollout and assess the migration state before using `prisma migrate resolve` or applying a corrective migration. Database restore is a separate incident-recovery action requiring an explicit recovery point and incident-owner decision.

## SQLite development backup

SQLite is for local development only. Its backup path currently copies the database file; stop the application and any writer before backing up or restoring so the copy is consistent. Production uses PostgreSQL and must not use this fallback.

## Capacity and service-level limits

No throughput, concurrency, availability, or recovery-time target has been established by this repository review. Measure these in the target environment before publishing capacity claims or committing an operational SLA.
