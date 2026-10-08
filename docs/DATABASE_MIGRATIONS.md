# Database migrations

- Development uses `prisma/schema.sqlite.prisma`; `npm run db:push:sqlite` is for local SQLite setup only.
- Production uses PostgreSQL and `prisma/schema.postgres.prisma`. Deploy with `npm run db:deploy:postgres` (`prisma migrate deploy`). Production must not use `prisma db push`.
- A fresh PostgreSQL deployment is the ordered history in `prisma/migrations/`, not the Prisma schema file. CI runs that history against empty databases and checks it against the PostgreSQL schema.
- Add a timestamped migration for each production schema change. Review the SQL, defaults, nullability, foreign keys, indexes, and data conversion before committing it. Keep already-applied migrations unchanged; add a forward migration for corrections.
- Rehearse locally with `POSTGRES_ADMIN_URL=<postgres-url-with-CREATE-DATABASE-privilege> npm run db:rehearse:postgres`. The script creates temporary databases, exercises fresh and legacy upgrades, checks Prisma queries and cascades, compares the resulting schema, and removes the temporary databases.

The 2026-10-01 `complete_postgresql_baseline` migration repairs omissions from the original PostgreSQL baseline before document encryption is applied. It creates missing document, clinical, artifact, and self-care tables and converts legacy appointment date/time wall-clock values to UTC `scheduledAt` using each row's timezone before dropping the old columns.
