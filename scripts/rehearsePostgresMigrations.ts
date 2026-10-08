import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Client } from 'pg';

const root = process.cwd();
const migrationRoot = path.join(root, 'prisma', 'migrations');
const schemaPath = path.join(root, 'prisma', 'schema.postgres.prisma');
const adminUrl = process.env.POSTGRES_ADMIN_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!adminUrl?.startsWith('postgres://') && !adminUrl?.startsWith('postgresql://')) {
  throw new Error('POSTGRES_ADMIN_URL or POSTGRES_URL must point to a PostgreSQL database that can create temporary databases.');
}

const migrations = fs.readdirSync(migrationRoot)
  .filter((name) => fs.existsSync(path.join(migrationRoot, name, 'migration.sql')))
  .sort();
const suffix = `${process.pid}_${Date.now().toString(36)}`;
const createdDatabases: string[] = [];
const migrationWorkspaces: string[] = [];

function databaseUrl(database: string): string {
  const url = new URL(adminUrl!);
  url.pathname = `/${database}`;
  return url.toString();
}

function quotedIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

async function createDatabase(name: string): Promise<string> {
  const client = new Client({ connectionString: adminUrl });
  await client.connect();
  try {
    await client.query(`CREATE DATABASE ${quotedIdentifier(name)}`);
  } finally {
    await client.end();
  }
  createdDatabases.push(name);
  return databaseUrl(name);
}

function runPrisma(args: string[], env: NodeJS.ProcessEnv): string {
  return execFileSync(process.execPath, [
    path.join(root, 'node_modules', 'prisma', 'build', 'index.js'),
    ...args,
  ], { cwd: root, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function migrationWorkspace(upTo: string): string {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ruangtenang-prisma-history-'));
  migrationWorkspaces.push(tempRoot);
  const prismaDir = path.join(tempRoot, 'prisma');
  const targetMigrations = path.join(prismaDir, 'migrations');
  fs.mkdirSync(targetMigrations, { recursive: true });
  fs.copyFileSync(schemaPath, path.join(prismaDir, 'schema.postgres.prisma'));
  for (const name of migrations) {
    fs.cpSync(path.join(migrationRoot, name), path.join(targetMigrations, name), { recursive: true });
    if (name === upTo) break;
  }
  return path.join(prismaDir, 'schema.postgres.prisma');
}

async function query(client: Client, sql: string, values: unknown[] = []) {
  return client.query(sql, values);
}

async function seedLegacyAppointment(url: string) {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await query(client, `INSERT INTO "Users" ("id", "name", "email", "passwordHash") VALUES ('upgrade-user', 'Migration User', 'migration-user@example.test', 'not-a-real-password')`);
    await query(client, `INSERT INTO "Counselors" ("id", "name", "role", "specialties", "imageUrl", "availability") VALUES ('upgrade-counselor', 'Migration Counselor', 'counselor', '[]', '', '[]')`);
    await query(client, `INSERT INTO "Appointments" ("id", "counselorId", "counselorName", "date", "time", "status", "approvalStatus", "attendanceStatus", "userId") VALUES ('upgrade-appointment', 'upgrade-counselor', 'Migration Counselor', '2026-11-12', '14:30', 'scheduled', 'approved', 'pending', 'upgrade-user')`);
    await query(client, `INSERT INTO "AppointmentSlot" ("id", "counselorId", "date", "time", "appointmentId") VALUES ('upgrade-slot', 'upgrade-counselor', '2026-11-12', '14:30', 'upgrade-appointment')`);
  } finally {
    await client.end();
  }
}

async function seedLegacyDocument(url: string) {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await query(client, `INSERT INTO "Users" ("id", "name", "email", "passwordHash") VALUES ('document-user', 'Migration User', 'document-user@example.test', 'not-a-real-password')`);
    await query(client, `INSERT INTO "Attachments" ("id", "userId", "filename", "mimeType", "size", "data") VALUES ('legacy-attachment', 'document-user', 'legacy.txt', 'text/plain', 5, 'uploads/legacy.txt')`);
    await query(client, `INSERT INTO "DocumentChunks" ("id", "attachmentId", "userId", "chunkIndex", "content") VALUES ('legacy-chunk', 'legacy-attachment', 'document-user', 0, 'hello')`);
  } finally {
    await client.end();
  }
}

async function assertSchemaAndRelations(url: string) {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const models = [
      'users', 'chats', 'chatMessages', 'messageBookmarks', 'attachments', 'documentChunks', 'selfCareTasks', 'artifacts',
      'artifactVersions', 'workspaces', 'workspaceTasks', 'appointments', 'appointmentSlot',
      'screenings', 'clinicalSoapNotes', 'userSession', 'loginEvent', 'distributedState', 'distributedLock',
    ] as const;
    for (const model of models) await prisma[model].count();
    await prisma.$queryRaw`SELECT 1`;

    await prisma.users.create({ data: {
      id: 'cascade-user', name: 'Cascade User', email: 'cascade-user@example.test', passwordHash: 'not-a-real-password',
    } });
    await prisma.chats.create({ data: {
      id: 'cascade-chat', userId: 'cascade-user', title: 'Cascade Chat', workspaceMode: 'RUANG_KERJA',
      workspace: { create: { tasks: { create: { id: 'cascade-task', title: 'Cascade Task' } } } },
    } });
    const workspaceBeforeDelete = await prisma.workspaces.count({ where: { chatId: 'cascade-chat' } });
    const taskBeforeDelete = await prisma.workspaceTasks.count({ where: { id: 'cascade-task' } });
    if (workspaceBeforeDelete !== 1 || taskBeforeDelete !== 1) throw new Error('Workspace relation chain was not created.');
    await prisma.chats.delete({ where: { id: 'cascade-chat' } });
    if (await prisma.workspaces.count({ where: { chatId: 'cascade-chat' } }) !== 0) throw new Error('Deleting a chat did not cascade to Workspaces.');
    if (await prisma.workspaceTasks.count({ where: { id: 'cascade-task' } }) !== 0) throw new Error('Deleting a chat did not cascade to WorkspaceTasks.');

    await prisma.attachments.create({ data: {
      id: 'cascade-attachment', userId: 'cascade-user', filename: 'cascade.txt', mimeType: 'text/plain', size: 5, data: 'uploads/cascade.txt',
      chunks: { create: { id: 'cascade-chunk', userId: 'cascade-user', chunkIndex: 0, content: 'hello' } },
    } });
    await prisma.attachments.delete({ where: { id: 'cascade-attachment' } });
    if (await prisma.documentChunks.count({ where: { id: 'cascade-chunk' } }) !== 0) throw new Error('Deleting an attachment did not cascade to DocumentChunks.');
    await prisma.users.delete({ where: { id: 'cascade-user' } });
  } finally {
    await prisma.$disconnect();
  }
}

async function deploy(url: string, schema = schemaPath) {
  return runPrisma(['migrate', 'deploy', '--schema', schema], { ...process.env, DATABASE_URL: url });
}

async function checkDrift(url: string) {
  runPrisma([
    'migrate', 'diff', '--from-url', url, '--to-schema-datamodel', schemaPath, '--exit-code',
  ], { ...process.env, DATABASE_URL: url });
}

function assertProviderModelParity() {
  const parse = (file: string) => {
    const contents = fs.readFileSync(file, 'utf8');
    const models = new Map<string, string[]>();
    for (const match of contents.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g)) {
      const fields = match[2].split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('//') && !line.startsWith('@@'))
        .map((line) => line.match(/^(\w+)\s+/)?.[1])
        .filter((field): field is string => Boolean(field))
        .sort();
      models.set(match[1], fields);
    }
    return models;
  };
  const postgres = parse(schemaPath);
  const sqlite = parse(path.join(root, 'prisma', 'schema.sqlite.prisma'));
  if (postgres.size !== sqlite.size) throw new Error(`Provider schema model count differs (PostgreSQL ${postgres.size}, SQLite ${sqlite.size}).`);
  for (const [model, fields] of postgres) {
    const sqliteFields = sqlite.get(model);
    if (!sqliteFields || fields.join(',') !== sqliteFields.join(',')) {
      throw new Error(`Provider schema fields differ for ${model}.`);
    }
  }
}

async function main() {
  assertProviderModelParity();
  console.log('[migration rehearsal] SQLite and PostgreSQL domain models have matching model and field sets.');
  const freshUrl = await createDatabase(`rt_fresh_${suffix}`);
  console.log('[migration rehearsal] Fresh database: applying complete migration history.');
  await deploy(freshUrl);
  await assertSchemaAndRelations(freshUrl);
  await checkDrift(freshUrl);
  const repeat = await deploy(freshUrl);
  if (!repeat.includes('No pending migrations')) throw new Error('Latest database did not report that there were no pending migrations on repeat deploy.');
  console.log('[migration rehearsal] Fresh deploy, Prisma sanity queries, readiness ping, cascades, drift check, and repeat deploy passed.');

  const legacyA = await createDatabase(`rt_legacy_a_${suffix}`);
  const beforeBaseline = migrations.find((name) => name.startsWith('20260929000000_'));
  if (!beforeBaseline) throw new Error('Could not locate the 20260929000000 legacy checkpoint.');
  const schemaA = migrationWorkspace(beforeBaseline);
  await deploy(legacyA, schemaA);
  await seedLegacyAppointment(legacyA);
  await deploy(legacyA);
  const appointmentClient = new Client({ connectionString: legacyA });
  await appointmentClient.connect();
  try {
    const result = await query(appointmentClient, `SELECT to_char("scheduledAt", 'YYYY-MM-DD HH24:MI') AS value, "timezone" FROM "Appointments" WHERE "id" = 'upgrade-appointment'`);
    if (result.rows[0]?.value !== '2026-11-12 07:30' || result.rows[0]?.timezone !== 'WIB') {
      throw new Error('Legacy appointment date/time was not converted from WIB wall time to the correct UTC instant.');
    }
    const slot = await query(appointmentClient, `SELECT to_char("scheduledAt", 'YYYY-MM-DD HH24:MI') AS value FROM "AppointmentSlot" WHERE "id" = 'upgrade-slot'`);
    if (slot.rows[0]?.value !== '2026-11-12 07:30') {
      throw new Error('Legacy appointment slot was not aligned with the migrated UTC appointment time.');
    }
  } finally {
    await appointmentClient.end();
  }
  await assertSchemaAndRelations(legacyA);
  await checkDrift(legacyA);
  console.log('[migration rehearsal] Upgrade from 20260929000000 passed and preserved legacy appointment data.');

  const legacyB = await createDatabase(`rt_legacy_b_${suffix}`);
  const encryptionMigration = migrations.find((name) => name.startsWith('20261002000000_'));
  if (!encryptionMigration) throw new Error('Could not locate the encryption migration checkpoint.');
  const schemaB = migrationWorkspace(encryptionMigration);
  await deploy(legacyB, schemaB);
  await seedLegacyDocument(legacyB);
  await deploy(legacyB);
  const documentClient = new Client({ connectionString: legacyB });
  await documentClient.connect();
  try {
    const attachment = await query(documentClient, `SELECT "isEncrypted" FROM "Attachments" WHERE "id" = 'legacy-attachment'`);
    const chunk = await query(documentClient, `SELECT "isEncrypted" FROM "DocumentChunks" WHERE "id" = 'legacy-chunk'`);
    if (attachment.rows[0]?.isEncrypted !== false || chunk.rows[0]?.isEncrypted !== false) {
      throw new Error('Encryption migration did not preserve legacy document rows with the safe default.');
    }
  } finally {
    await documentClient.end();
  }
  await assertSchemaAndRelations(legacyB);
  await checkDrift(legacyB);
  console.log('[migration rehearsal] Upgrade from the encryption migration passed and preserved attachment/chunk data.');
}

main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[migration rehearsal] Failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    const admin = new Client({ connectionString: adminUrl });
    await admin.connect();
    try {
      for (const name of createdDatabases) {
        await admin.query(`DROP DATABASE IF EXISTS ${quotedIdentifier(name)} WITH (FORCE)`);
      }
    } finally {
      await admin.end();
      const tempBase = path.resolve(os.tmpdir()) + path.sep;
      for (const tempRoot of migrationWorkspaces) {
        const resolved = path.resolve(tempRoot);
        if (!resolved.startsWith(tempBase) || !path.basename(resolved).startsWith('ruangtenang-prisma-history-')) {
          throw new Error('Refusing to remove a migration workspace outside the generated temporary workspace area.');
        }
        fs.rmSync(resolved, { recursive: true, force: true });
      }
  }
});
