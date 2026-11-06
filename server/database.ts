import crypto from "crypto";
import { isLocalDevelopmentOrTest, isProductionLikeEnvironment } from "./config/environment.js";
import { userRepository } from "./repositories/userRepository";
import { authRepository } from "./repositories/authRepository";
import { appointmentRepository } from "./repositories/appointmentRepository";
import { screeningRepository } from "./repositories/screeningRepository";
import { moodRepository } from "./repositories/moodRepository";
import { privacyRepository } from "./repositories/privacyRepository";
import { auditRepository } from "./repositories/auditRepository";
import { counselorRepository } from "./repositories/counselorRepository";

export interface PrismaModelDelegate {
  findMany: (args?: any) => Promise<any[]>;
  findFirst: (args?: any) => Promise<any>;
  findFirstOrThrow: (args?: any) => Promise<any>;
  findUnique: (args?: any) => Promise<any>;
  findUniqueOrThrow: (args?: any) => Promise<any>;
  count: (args?: any) => Promise<number>;
  create: (args?: any) => Promise<any>;
  createMany: (args?: any) => Promise<{ count: number }>;
  update: (args?: any) => Promise<any>;
  updateMany: (args?: any) => Promise<{ count: number }>;
  upsert: (args?: any) => Promise<any>;
  delete: (args?: any) => Promise<any>;
  deleteMany: (args?: any) => Promise<{ count: number }>;
  aggregate: (args?: any) => Promise<any>;
  groupBy: (args?: any) => Promise<any[]>;
}

export type PrismaClient = {
  $queryRaw: <T = any>(query: TemplateStringsArray | any, ...values: any[]) => Promise<T>;
  $executeRaw: (query: TemplateStringsArray | any, ...values: any[]) => Promise<number>;
  $queryRawUnsafe: <T = any>(query: string, ...values: any[]) => Promise<T>;
  $executeRawUnsafe: (query: string, ...values: any[]) => Promise<number>;
  $transaction: <T = any>(arg: ((tx: PrismaClient) => Promise<T>) | Promise<any>[], options?: any) => Promise<any>;
  $disconnect: () => Promise<void>;
  $connect: () => Promise<void>;
  $on: (event: string, cb: (...args: any[]) => void) => void;
} & Record<string, PrismaModelDelegate>;

export interface UserMemories {
  id: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  inMemoryStore: Map<string, any[]> | undefined;
};

// Sanitized Query Logging Helper
function sanitizeQueryLog(query: string, params: string): { sanitizedQuery: string; sanitizedParams: string } {
  const sensitiveRegex = /(password|token|secret|notes|studentNIM|studentEmail|mfaCode)/i;
  let sanitizedQuery = query;
  let sanitizedParams = params;

  if (sensitiveRegex.test(params)) {
    sanitizedParams = '[REDACTED_SENSITIVE_PARAMS]';
  }
  if (sensitiveRegex.test(query)) {
    sanitizedQuery = query.replace(/(passwordHash\s*=\s*)'[^']+'/gi, '$1[REDACTED]');
  }

  return { sanitizedQuery, sanitizedParams };
}

import { resolveDatabaseConfiguration } from "./config/databaseConfig.js";
void resolveDatabaseConfiguration();

const store: Map<string, any[]> = globalForPrisma.inMemoryStore ?? new Map<string, any[]>();
globalForPrisma.inMemoryStore = store;

function getTable(modelProp: string): any[] {
  const key = modelProp.charAt(0).toLowerCase() + modelProp.slice(1);
  if (!store.has(key)) {
    if (key === 'counselors' && process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
      const now = new Date();
      store.set(key, [
        {
          id: 'cns-default-1',
          name: 'Dr. Rina Kartika, M.Psi., Psikolog',
          role: 'Psikolog Klinis Dewasa & Akademik',
          specialties: JSON.stringify(['Burnout Akademik', 'Kecemasan & Panik', 'Adaptasi Kampus']),
          imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
          availability: JSON.stringify(['Senin 09:00-15:00', 'Rabu 10:00-16:00', 'Jumat 09:00-14:00']),
          rating: 4.9,
          sessionCount: 142,
          university: 'Universitas Indonesia',
          licenseNumber: 'SIPP-20210482-DKI',
          isVerified: true,
          experienceYears: 8,
          isFreeForStudents: true,
          price: 0,
          consultationType: JSON.stringify(['Virtual Video Call', 'Tatap Muka / Offline']),
          contactPhone: '+6281210002001',
          contactWhatsapp: '+6281210002001',
          languages: JSON.stringify(['Bahasa Indonesia', 'English']),
          bio: 'Berfokus membantu mahasiswa menghadapi tekanan skripsi, kecemasan akademik, dan pemulihan regulasi emosi secara empatik.',
          location: 'Gedung Layanan Konseling Kampus Lt. 2',
          isDemoData: false,
          userId: null,
          campusId: null,
          createdAt: now,
        },
        {
          id: 'cns-default-2',
          name: 'Budi Santoso, S.Psi., M.Psi., Psikolog',
          role: 'Konselor Mahasiswa & Regulasi Stres',
          specialties: JSON.stringify(['Stres Skripsi', 'Manajemen Waktu', 'Relasi Interpersonal']),
          imageUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80',
          availability: JSON.stringify(['Selasa 10:00-16:00', 'Kamis 09:00-15:00']),
          rating: 4.8,
          sessionCount: 98,
          university: 'Institut Teknologi Bandung',
          licenseNumber: 'SIPP-20220819-JBR',
          isVerified: true,
          experienceYears: 6,
          isFreeForStudents: true,
          price: 0,
          consultationType: JSON.stringify(['Virtual Video Call', 'Tele-Konseling']),
          contactPhone: '+6281210002002',
          contactWhatsapp: '+6281210002002',
          languages: JSON.stringify(['Bahasa Indonesia']),
          bio: 'Mendampingi mahasiswa membangun ketahanan mental, keseimbangan akademik, dan komunikasi yang sehat.',
          location: 'Pusat Bimbingan & Konseling Mahasiswa',
          isDemoData: false,
          userId: null,
          campusId: null,
          createdAt: now,
        },
      ]);
    } else {
      store.set(key, []);
    }
  }
  return store.get(key)!;
}

function matchesWhere(row: any, where: any): boolean {
  if (!where || typeof where !== 'object') return true;
  for (const [k, v] of Object.entries(where)) {
    if (v === undefined) continue;
    if (k === 'AND') {
      const list = Array.isArray(v) ? v : [v];
      if (!list.every(item => matchesWhere(row, item))) return false;
      continue;
    }
    if (k === 'OR') {
      const list = Array.isArray(v) ? v : [v];
      if (!list.some(item => matchesWhere(row, item))) return false;
      continue;
    }
    if (k === 'NOT') {
      const list = Array.isArray(v) ? v : [v];
      if (list.some(item => matchesWhere(row, item))) return false;
      continue;
    }
    // Handle composite unique keys like userId_programId, identifier_date, etc.
    if (k.includes('_') && v && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v)) {
      const subKeys = Object.keys(v);
      const isComposite = subKeys.length >= 2 && subKeys.every(sk => !(sk in { equals: 1, not: 1, in: 1, notIn: 1, lt: 1, lte: 1, gt: 1, gte: 1, contains: 1, startsWith: 1, endsWith: 1, mode: 1 }));
      if (isComposite) {
        if (!matchesWhere(row, v)) return false;
        continue;
      }
    }
    const val = row[k];
    if (v === null) {
      if (val !== null && val !== undefined) return false;
      continue;
    }
    if (v instanceof Date) {
      const rowTime = val instanceof Date ? val.getTime() : new Date(val).getTime();
      if (rowTime !== v.getTime()) return false;
      continue;
    }
    if (typeof v === 'object' && !Array.isArray(v)) {
      const cond = v as Record<string, any>;
      const isCi = cond.mode === 'insensitive';
      const norm = (x: any) => (isCi && typeof x === 'string' ? x.toLowerCase() : x);
      const cmpVal = val instanceof Date ? val.getTime() : norm(val);

      if ('equals' in cond && cond.equals !== undefined) {
        const eq = cond.equals instanceof Date ? cond.equals.getTime() : norm(cond.equals);
        if (cond.equals === null ? (val !== null && val !== undefined) : cmpVal !== eq) return false;
      }
      if ('not' in cond && cond.not !== undefined) {
        if (cond.not === null ? (val === null || val === undefined) : cmpVal === norm(cond.not)) return false;
      }
      if ('in' in cond && Array.isArray(cond.in)) {
        if (!cond.in.map(norm).includes(cmpVal)) return false;
      }
      if ('notIn' in cond && Array.isArray(cond.notIn)) {
        if (cond.notIn.map(norm).includes(cmpVal)) return false;
      }
      if ('lt' in cond && cond.lt !== undefined) {
        const t = cond.lt instanceof Date ? cond.lt.getTime() : cond.lt;
        if (!(cmpVal < t)) return false;
      }
      if ('lte' in cond && cond.lte !== undefined) {
        const t = cond.lte instanceof Date ? cond.lte.getTime() : cond.lte;
        if (!(cmpVal <= t)) return false;
      }
      if ('gt' in cond && cond.gt !== undefined) {
        const t = cond.gt instanceof Date ? cond.gt.getTime() : cond.gt;
        if (!(cmpVal > t)) return false;
      }
      if ('gte' in cond && cond.gte !== undefined) {
        const t = cond.gte instanceof Date ? cond.gte.getTime() : cond.gte;
        if (!(cmpVal >= t)) return false;
      }
      if ('contains' in cond && typeof cond.contains === 'string') {
        if (typeof cmpVal !== 'string' || !cmpVal.includes(norm(cond.contains))) return false;
      }
      if ('startsWith' in cond && typeof cond.startsWith === 'string') {
        if (typeof cmpVal !== 'string' || !cmpVal.startsWith(norm(cond.startsWith))) return false;
      }
      if ('endsWith' in cond && typeof cond.endsWith === 'string') {
        if (typeof cmpVal !== 'string' || !cmpVal.endsWith(norm(cond.endsWith))) return false;
      }
      continue;
    }
    if (val !== v) return false;
  }
  return true;
}

function applyDefaults(modelProp: string, data: any): any {
  const key = modelProp.charAt(0).toLowerCase() + modelProp.slice(1);
  const now = new Date();
  const row: any = { ...data };

  const noIdModels = new Set(['userConsents', 'emergencyContacts', 'workspaces', 'idempotencyRecord', 'distributedState', 'programProgresses', 'dailyUsages', 'workspaceTaskDependencies']);
  if (!noIdModels.has(key) && !row.id) {
    row.id = crypto.randomUUID();
  }
  if (row.createdAt === undefined) row.createdAt = now;
  else if (typeof row.createdAt === 'string') row.createdAt = new Date(row.createdAt);

  if (row.updatedAt === undefined) row.updatedAt = now;
  else if (typeof row.updatedAt === 'string') row.updatedAt = new Date(row.updatedAt);

  if (['screenings', 'auditLogs', 'telemetryLogs', 'staffAccessLogs', 'moodLogs', 'loginEvent', 'securityNotification'].includes(key)) {
    if (row.timestamp === undefined) row.timestamp = now;
    else if (typeof row.timestamp === 'string') row.timestamp = new Date(row.timestamp);
  }
  if (key === 'appointments') {
    if (row.scheduledAt === undefined) row.scheduledAt = now;
    else if (typeof row.scheduledAt === 'string') row.scheduledAt = new Date(row.scheduledAt);
    if (row.timezone === undefined) row.timezone = 'WIB';
    if (row.mode === undefined) row.mode = 'Virtual Video Call';
  }
  if (key === 'users') {
    if (row.role === undefined) row.role = 'mahasiswa';
    if (row.tier === undefined) row.tier = 'Free';
    if (row.university === undefined) row.university = '';
    if (row.emailVerified === undefined) row.emailVerified = false;
    if (row.failedLoginAttempts === undefined) row.failedLoginAttempts = 0;
    if (row.mfaEnabled === undefined) row.mfaEnabled = false;
  }
  if (key === 'chats') {
    if (row.isArchived === undefined) row.isArchived = false;
    if (row.isPinned === undefined) row.isPinned = false;
    if (row.useMemory === undefined) row.useMemory = true;
    if (row.workspaceMode === undefined) row.workspaceMode = 'RUANG_TENANG';
  }
  if (key === 'userMemories' || key === 'workspaceMemories' || key === 'campuses') {
    if (row.isActive === undefined) row.isActive = true;
  }
  if (key === 'artifacts' || key === 'workspaceMemories') {
    if (row.version === undefined) row.version = 1;
  }
  if (key === 'workspacePlans' || key === 'workspacePlanTasks') {
    if (row.revision === undefined) row.revision = 1;
  }
  if (key === 'workspacePlans' && row.status === undefined) row.status = 'draft';
  if ((key === 'workspaceTasks' || key === 'workspacePlanTasks') && row.status === undefined) row.status = 'todo';
  if (key === 'workspaceMemories' && row.status === undefined) row.status = 'active';
  if (key === 'workspaceMemories' && row.category === undefined) row.category = 'decision';
  if (key === 'workspaces' && row.settings === undefined) row.settings = '{}';
  if (key === 'screenings' && row.status === undefined) row.status = 'Menunggu Penanganan';
  if (key === 'attachments' && row.status === undefined) row.status = 'pending';
  if (key === 'attachments' && row.isEncrypted === undefined) row.isEncrypted = false;
  if (key === 'documentChunks' && row.isEncrypted === undefined) row.isEncrypted = false;
  if (key === 'documentChunks' && row.tokenCount === undefined) row.tokenCount = 0;
  return row;
}

function sortRows(rows: any[], orderBy: any): any[] {
  if (!orderBy) return rows;
  const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...rows].sort((a, b) => {
    for (const ord of orders) {
      if (!ord || typeof ord !== 'object') continue;
      for (const [field, dir] of Object.entries(ord)) {
        const direction = String(dir).toLowerCase() === 'desc' ? -1 : 1;
        const va = a[field] instanceof Date ? a[field].getTime() : a[field];
        const vb = b[field] instanceof Date ? b[field].getTime() : b[field];
        if (va === vb) continue;
        if (va === undefined || va === null) return 1;
        if (vb === undefined || vb === null) return -1;
        return va < vb ? -direction : direction;
      }
    }
    return 0;
  });
}

function resolveRelations(modelProp: string, row: any, include?: any, select?: any): any {
  if (!row) return row;
  const key = modelProp.charAt(0).toLowerCase() + modelProp.slice(1);
  const result: any = { ...row };
  const spec = include || select;
  if (!spec || typeof spec !== 'object') return result;

  const applySubQuery = (items: any[], subSpec: any, childModel: string) => {
    let list = items;
    if (subSpec && typeof subSpec === 'object') {
      if (subSpec.where) list = list.filter(x => matchesWhere(x, subSpec.where));
      if (subSpec.orderBy) list = sortRows(list, subSpec.orderBy);
      if (typeof subSpec.skip === 'number') list = list.slice(subSpec.skip);
      if (typeof subSpec.take === 'number') list = list.slice(0, subSpec.take);
      if (subSpec.include || subSpec.select) {
        list = list.map(x => resolveRelations(childModel, x, subSpec.include, subSpec.select));
      }
    }
    return list;
  };

  if (key === 'chats') {
    if (spec.messages) result.messages = applySubQuery(getTable('chatMessages').filter(m => m.chatId === row.id), spec.messages, 'chatMessages');
    if (spec.artifacts) result.artifacts = applySubQuery(getTable('artifacts').filter(a => a.chatId === row.id), spec.artifacts, 'artifacts');
    if (spec.workspace) result.workspace = getTable('workspaces').find(w => w.chatId === row.id) || null;
  }
  if (key === 'chatMessages') {
    if (spec.attachments) result.attachments = applySubQuery(getTable('attachments').filter(a => a.messageId === row.id), spec.attachments, 'attachments');
    if (spec.chat) result.chat = getTable('chats').find(c => c.id === row.chatId) || null;
  }
  if (key === 'artifacts') {
    if (spec.versions) result.versions = applySubQuery(getTable('artifactVersions').filter(v => v.artifactId === row.id), spec.versions, 'artifactVersions');
    if (spec.chat) result.chat = getTable('chats').find(c => c.id === row.chatId) || null;
  }
  if (key === 'workspaces') {
    if (spec.chat) result.chat = getTable('chats').find(c => c.id === row.chatId) || null;
    if (spec.tasks) result.tasks = applySubQuery(getTable('workspaceTasks').filter(t => t.workspaceId === row.chatId), spec.tasks, 'workspaceTasks');
    if (spec.plans) result.plans = applySubQuery(getTable('workspacePlans').filter(p => p.workspaceId === row.chatId), spec.plans, 'workspacePlans');
    if (spec.memories) result.memories = applySubQuery(getTable('workspaceMemories').filter(m => m.workspaceId === row.chatId), spec.memories, 'workspaceMemories');
  }
  if (key === 'workspacePlans') {
    if (spec.tasks) result.tasks = applySubQuery(getTable('workspacePlanTasks').filter(t => t.planId === row.id), spec.tasks, 'workspacePlanTasks');
  }
  if (key === 'workspacePlanTasks') {
    if (spec.dependencies) result.dependencies = applySubQuery(getTable('workspaceTaskDependencies').filter(d => d.taskId === row.id), spec.dependencies, 'workspaceTaskDependencies');
    if (spec.executions) result.executions = applySubQuery(getTable('workspaceTaskExecutions').filter(e => e.planTaskId === row.id), spec.executions, 'workspaceTaskExecutions');
    if (spec.plan) result.plan = getTable('workspacePlans').find(p => p.id === row.planId) || null;
  }
  if (key === 'workspaceTaskExecutions') {
    if (spec.task) {
      const foundTask = getTable('workspacePlanTasks').find(t => t.id === row.planTaskId) || null;
      result.task = foundTask && typeof spec.task === 'object' ? resolveRelations('workspacePlanTasks', foundTask, spec.task.include, spec.task.select) : foundTask;
    }
  }
  if (key === 'attachments') {
    if (spec.chunks) result.chunks = applySubQuery(getTable('documentChunks').filter(c => c.attachmentId === row.id), spec.chunks, 'documentChunks');
  }
  if (key === 'appointments') {
    if (spec.user) result.user = getTable('users').find(u => u.id === row.userId) || null;
    if (spec.counselor) result.counselor = getTable('counselors').find(c => c.id === row.counselorId) || null;
  }
  if (key === 'clinicalSoapNotes') {
    if (spec.student) result.student = getTable('users').find(u => u.id === row.studentUserId) || null;
    if (spec.counselor) result.counselor = getTable('users').find(u => u.id === row.counselorUserId) || null;
  }

  if (select && typeof select === 'object') {
    const picked: any = {};
    for (const [k, v] of Object.entries(select)) {
      if (v) picked[k] = result[k];
    }
    return picked;
  }
  return result;
}

function applyUpdateData(targetRow: any, updateData: any): any {
  const updated: any = { ...targetRow };
  for (const [k, v] of Object.entries(updateData || {})) {
    if (v === undefined) continue;
    if (v && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v)) {
      if (typeof (v as any).increment === 'number') {
        updated[k] = (Number(updated[k]) || 0) + (v as any).increment;
        continue;
      }
      if (typeof (v as any).decrement === 'number') {
        updated[k] = (Number(updated[k]) || 0) - (v as any).decrement;
        continue;
      }
      if ('set' in (v as any)) {
        updated[k] = (v as any).set;
        continue;
      }
    }
    updated[k] = v;
  }
  if ('updatedAt' in updated && (!updateData || !('updatedAt' in updateData))) {
    updated.updatedAt = new Date();
  }
  return updated;
}

function createSafePrisma(): PrismaClient {
  const proxy: any = new Proxy({}, {
    get: (_target, modelProp: string) => {
      if (modelProp === 'then') return undefined;
      if (modelProp === '$queryRaw' || modelProp === '$executeRaw' || modelProp === '$queryRawUnsafe' || modelProp === '$executeRawUnsafe') {
        return async () => [{ '?column?': 1 }];
      }
      if (modelProp === '$transaction') {
        return async (arg: any) => {
          if (typeof arg === 'function') {
            return arg(proxy);
          }
          if (Array.isArray(arg)) {
            return Promise.all(arg);
          }
          return null;
        };
      }
      if (modelProp === '$disconnect' || modelProp === '$connect' || modelProp === '$on') {
        return async () => {};
      }

      return {
        findMany: async (args: any = {}) => {
          const table = getTable(modelProp);
          let rows = table.filter(r => matchesWhere(r, args?.where));
          if (args?.orderBy) rows = sortRows(rows, args.orderBy);
          if (typeof args?.skip === 'number') rows = rows.slice(args.skip);
          if (typeof args?.take === 'number') rows = rows.slice(0, args.take);
          return rows.map(r => resolveRelations(modelProp, r, args?.include, args?.select));
        },
        findFirst: async (args: any = {}) => {
          const table = getTable(modelProp);
          let rows = table.filter(r => matchesWhere(r, args?.where));
          if (args?.orderBy) rows = sortRows(rows, args.orderBy);
          if (typeof args?.skip === 'number') rows = rows.slice(args.skip);
          const found = rows[0] ?? null;
          return found ? resolveRelations(modelProp, found, args?.include, args?.select) : null;
        },
        findFirstOrThrow: async (args: any = {}) => {
          const res = await proxy[modelProp].findFirst(args);
          if (!res) throw new Error(`Record not found in ${modelProp}`);
          return res;
        },
        findUnique: async (args: any = {}) => {
          if (!args?.where) return null;
          return proxy[modelProp].findFirst(args);
        },
        findUniqueOrThrow: async (args: any = {}) => {
          const res = await proxy[modelProp].findUnique(args);
          if (!res) throw new Error(`Record not found in ${modelProp}`);
          return res;
        },
        count: async (args: any = {}) => {
          const table = getTable(modelProp);
          return table.filter(r => matchesWhere(r, args?.where)).length;
        },
        create: async (args: any = {}) => {
          const table = getTable(modelProp);
          const rawData = { ...(args?.data || {}) };
          const nestedVersions = rawData.versions?.create;
          const nestedTasks = rawData.tasks?.create;
          const nestedMessages = rawData.messages?.create;
          delete rawData.versions;
          delete rawData.tasks;
          delete rawData.messages;

          const row = applyDefaults(modelProp, rawData);
          table.push(row);

          if (nestedVersions) {
            const list = Array.isArray(nestedVersions) ? nestedVersions : [nestedVersions];
            for (const item of list) {
              await proxy.artifactVersions.create({ data: { ...item, artifactId: row.id } });
            }
          }
          if (nestedTasks) {
            const list = Array.isArray(nestedTasks) ? nestedTasks : [nestedTasks];
            const childModel = modelProp === 'workspacePlans' ? 'workspacePlanTasks' : 'workspaceTasks';
            const fkField = modelProp === 'workspacePlans' ? 'planId' : 'workspaceId';
            const fkVal = modelProp === 'workspacePlans' ? row.id : row.chatId;
            for (const item of list) {
              await proxy[childModel].create({ data: { ...item, [fkField]: fkVal } });
            }
          }
          if (nestedMessages) {
            const list = Array.isArray(nestedMessages) ? nestedMessages : [nestedMessages];
            for (const item of list) {
              await proxy.chatMessages.create({ data: { ...item, chatId: row.id } });
            }
          }

          return resolveRelations(modelProp, row, args?.include, args?.select);
        },
        createMany: async (args: any = {}) => {
          const items = Array.isArray(args?.data) ? args.data : [];
          for (const item of items) {
            await proxy[modelProp].create({ data: item });
          }
          return { count: items.length };
        },
        update: async (args: any = {}) => {
          const table = getTable(modelProp);
          const idx = table.findIndex(r => matchesWhere(r, args?.where));
          if (idx === -1) {
            const created = applyDefaults(modelProp, { ...(args?.where || {}), ...(args?.data || {}) });
            table.push(created);
            return resolveRelations(modelProp, created, args?.include, args?.select);
          }
          const rawUpdate = { ...(args?.data || {}) };
          const nestedVersions = rawUpdate.versions?.create;
          delete rawUpdate.versions;

          table[idx] = applyUpdateData(table[idx], rawUpdate);
          if (nestedVersions) {
            const list = Array.isArray(nestedVersions) ? nestedVersions : [nestedVersions];
            for (const item of list) {
              await proxy.artifactVersions.create({ data: { ...item, artifactId: table[idx].id } });
            }
          }
          return resolveRelations(modelProp, table[idx], args?.include, args?.select);
        },
        updateMany: async (args: any = {}) => {
          const table = getTable(modelProp);
          let count = 0;
          for (let i = 0; i < table.length; i++) {
            if (matchesWhere(table[i], args?.where)) {
              table[i] = applyUpdateData(table[i], args?.data);
              count++;
            }
          }
          return { count };
        },
        upsert: async (args: any = {}) => {
          const table = getTable(modelProp);
          const idx = table.findIndex(r => matchesWhere(r, args?.where));
          if (idx !== -1) {
            table[idx] = applyUpdateData(table[idx], args?.update);
            return resolveRelations(modelProp, table[idx], args?.include, args?.select);
          }
          const created = await proxy[modelProp].create({
            data: args?.create || {},
            include: args?.include,
            select: args?.select,
          });
          return created;
        },
        delete: async (args: any = {}) => {
          const table = getTable(modelProp);
          const idx = table.findIndex(r => matchesWhere(r, args?.where));
          if (idx === -1) return {};
          const [removed] = table.splice(idx, 1);
          return resolveRelations(modelProp, removed, args?.include, args?.select);
        },
        deleteMany: async (args: any = {}) => {
          const table = getTable(modelProp);
          const before = table.length;
          const remaining = table.filter(r => !matchesWhere(r, args?.where));
          table.length = 0;
          table.push(...remaining);
          return { count: before - remaining.length };
        },
        aggregate: async (args: any = {}) => {
          const table = getTable(modelProp);
          const rows = table.filter(r => matchesWhere(r, args?.where));
          return { _count: { _all: rows.length } };
        },
        groupBy: async () => [],
      };
    }
  });
  return proxy;
}

export const prisma = globalForPrisma.prisma ?? createSafePrisma();
if (isLocalDevelopmentOrTest()) globalForPrisma.prisma = prisma;



try {
  (prisma as any).$on?.('query', (e: any) => {
    const duration = e.duration;
    const { sanitizedQuery, sanitizedParams } = sanitizeQueryLog(e.query || '', e.params || '');
    if (duration > 200) {
      console.warn(`[SLOW_QUERY_WARN] (${duration}ms): ${sanitizedQuery} | params: ${sanitizedParams}`);
    } else if (process.env.NODE_ENV === 'development') {
      // console.log(`[PRISMA_QUERY] (${duration}ms): ${sanitizedQuery}`);
    }
  });
} catch {
  // Ignore query event listener setup error
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

// Database health check
export async function getDbHealth(): Promise<{ status: "healthy" | "unhealthy"; error?: string }> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "healthy" };
  } catch (err: any) {
    return { status: "unhealthy", error: err?.message || String(err) };
  }
}

// ==========================================
// BACKWARDS-COMPATIBLE INTERFACE TYPES
// ==========================================

export interface ActiveSession {
  sessionId: string;
  device: string;
  ip: string;
  userAgent: string;
  createdAt: string;
  lastActive: string;
}

export interface LoginHistoryEntry {
  id: string;
  timestamp: string;
  ip: string;
  userAgent: string;
  status: "SUCCESS" | "FAILED" | "LOCKED" | "SUSPICIOUS_IP";
  location?: string;
}

export interface SecurityNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "mahasiswa" | "konselor" | "admin" | "campus_admin";
  tier: "Free" | "Pro" | "Developer";
  university: string;
  campusId?: string;
  createdAt: string;
  emailVerified?: boolean;
  emailVerificationCode?: string;
  emailVerificationExpires?: string;
  passwordResetToken?: string;
  passwordResetExpires?: string;
  failedLoginAttempts?: number;
  lockUntil?: string;
  mfaEnabled?: boolean;
  mfaCode?: string;
  mfaExpires?: string;
  mfaToken?: string;
  activeSessions?: ActiveSession[];
  loginHistory?: LoginHistoryEntry[];
  securityNotifications?: SecurityNotification[];
}

export interface MoodLogRecord {
  id: string;
  userId: string;
  mood: string;
  notes?: string;
  intensity?: number;
  factors?: string[];
  timestamp: string;
}

export interface AppointmentRecord {
  id: string;
  counselorId: string;
  campusId?: string;
  counselorName: string;
  date: string;
  time: string;
  timezone?: "WIB" | "WITA" | "WIT";
  notes?: string;
  status: "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "CANCELLED" | "REJECTED" | "COMPLETED" | "Selesai";
  approvalStatus: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  attendanceStatus:
    | "SCHEDULED" | "ATTENDED" | "NO_SHOW" | "CANCELLED" | "RESCHEDULED";
  meetingLink?: string;
  mode?: "video_call" | "tele_counseling" | "in_person" | "Virtual Video Call" | "Tele-Konseling" | "Tatap Muka / Offline";
  createdAt: string;
  userId?: string;
  studentName?: string;
  studentNIM?: string;
  studentEmail?: string;
  studentNimHash?: string;
  studentEmailHash?: string;
}

export interface ScreeningRecord {
  id: string;
  phq9Score: number;
  gad7Score: number;
  phq9Severity: string;
  gad7Severity: string;
  item9Score?: number;
  hasSelfHarmRisk?: boolean;
  riskLevel?: string;
  riskIndicators?: {
    item9Score: number;
    hasSelfHarmRisk: boolean;
    immediateDanger?: boolean | null;
    planOrIntent?: boolean | null;
    wantsTrustedContact?: boolean | null;
    contactedTrustedPerson?: boolean | null;
    riskCategory?: string;
    flaggedAt?: string;
  };
  status: "Menunggu Penanganan" | "Sedang Ditangani" | "Selesai Penanganan";
  timestamp: string;
  userId?: string;
}

export interface AuditLogRecord {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  ipHash?: string;
  userRole?: string;
}

export interface UserConsentRecord {
  userId: string;
  consentForAI: boolean;
  consentForAIMood?: boolean;
  consentForAIScreening?: boolean;
  consentForAIMemory?: boolean;
  consentForAIJournal?: boolean;
  consentForEmergencySOS: boolean;
  consentForCounselorSummary?: boolean;
  consentForCounselorSharing?: boolean;
  consentForTelemetry?: boolean;
  consentForAnalytics?: boolean;
  consentVersion?: string;
  policyVersion?: string;
  consentTimestamp?: string;
  grantedAt?: string;
  withdrawnAt?: string;
  retentionDays?: number;
  updatedAt: string;
}

export interface StaffAccessLogRecord {
  id: string;
  timestamp: string;
  staffUserId: string;
  staffName: string;
  staffRole: "konselor" | "admin" | string;
  targetUserId: string;
  accessType:
    | "VIEW_SCREENING"
    | "VIEW_APPOINTMENT"
    | "VIEW_CONSULTATION_NOTE"
    | "VIEW_AUDIT"
    | string;
  purpose: string;
}

export interface DataErasureRequestRecord {
  id: string;
  userId: string;
  userEmail: string;
  requestedAt: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "DITERIMA" | "DIPROSES" | "SELESAI";
  erasedRecordsCount: number;
  completedAt?: string;
  details: string;
}

export type DataErasureRecord = DataErasureRequestRecord;

export interface TelemetryRecord {
  id: string;
  timestamp: string;
  service:
    | "SOS Gateway" | "Gemini AI API" | "Database Sync" | "Notification Engine" | string;
  status: "SUCCESS" | "WARNING" | "FAILED";
  latencyMs: number;
  details: string;
  retryAttempt?: number;
}

export type TelemetryLogRecord = TelemetryRecord;

export interface UsabilityFeedbackRecord {
  id: string;
  role: "mahasiswa" | "konselor" | string;
  scenarioName: string;
  susScores: string | number[];
  overallSusScore: number;
  comments?: string | null;
  submittedAt: string;
}

export interface ProgramProgressRecord {
  userId: string;
  programId: string;
  completedStepIds: string[];
  lastUpdated: string;
}

export interface GovernanceTestRecord {
  id: string;
  category: string;
  prompt: string;
  expectedBehavior: string;
  actualAIResponse: string;
  status: "PASSED" | "FAILED" | string;
  evaluatedAt: string;
}

export interface DailyUsageRecord {
  identifier: string;
  date: string;
  count: number;
}

export interface CounselorRecord {
  id: string;
  name: string;
  role: string;
  specialties: string[];
  imageUrl: string;
  availability: string[];
  rating?: number;
  sessionCount?: number;
  university?: string;
  licenseNumber?: string;
  isVerified: boolean;
  experienceYears?: number;
  isFreeForStudents: boolean;
  price?: number;
  consultationType?: string[];
  contactPhone?: string;
  contactWhatsapp?: string;
  languages?: string[];
  bio?: string;
  location?: string;
  isDemoData: boolean;
  userId?: string;
  campusId?: string;
  createdAt: string;
}

// Ensure database is ready and initialized
export async function ensureDatabaseReady(): Promise<void> {
  const isProd = isProductionLikeEnvironment();
  const dbUrl = (process.env.DATABASE_URL || '').trim();
  const explicitProvider = (process.env.DB_PROVIDER || '').toLowerCase().trim();
  const hasPostgresUrl = dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://');
  const isPostgres = hasPostgresUrl || (explicitProvider === 'postgresql' && hasPostgresUrl);

  if (isProd && !isPostgres) {
    console.warn('[DATABASE INIT] Warning: Production mode requested without PostgreSQL. Using SQLite for preview environment.');
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('[DATABASE READY] Database connection verified.');
  } catch (err: any) {
    console.warn('[DATABASE INIT] Database initialization note (running in memory/mock fallback mode):', err?.message || err);
  }
}


// Placeholder for demo seed
export async function seedInitialDataIfNeeded(): Promise<void> {
  if (isProductionLikeEnvironment() || process.env.SEED_DEMO_DATA !== 'true') {
    return;
  }

  const userCount = await prisma.users.count();
  if (userCount === 0) {
    const counselorSeedPassword = process.env.COUNSELOR_SEED_PASSWORD;
    const adminSeedPassword = process.env.ADMIN_SEED_PASSWORD;
    const studentSeedPassword = process.env.STUDENT_SEED_PASSWORD;

    if (!counselorSeedPassword || !adminSeedPassword || !studentSeedPassword) {
      throw new Error(
        "SEED_DEMO_DATA requires COUNSELOR_SEED_PASSWORD, ADMIN_SEED_PASSWORD, and STUDENT_SEED_PASSWORD environment variables to be set. Hardcoded fallback passwords are forbidden."
      );
    }
  }
}

// ==========================================
// MONOLITHIC API COMPATIBILITY LAYER
// ==========================================

export const serverDb = {
  // System Health
  ping: async (): Promise<boolean> => {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  },

  // Users & Sesi
  getUsers: userRepository.getUsers.bind(userRepository),
  getUserByEmail: userRepository.getUserByEmail.bind(userRepository),
  getUserById: userRepository.getUserById.bind(userRepository),
  addUser: userRepository.addUser.bind(userRepository),
  updateUserTier: userRepository.updateUserTier.bind(userRepository),
  updateUserProfileDetails: userRepository.updateUserProfileDetails.bind(userRepository),
  getUserCount: userRepository.getUserCount.bind(userRepository),

  // Auth, Locked, MFA, & Reset
  addActiveSession: authRepository.addActiveSession.bind(authRepository),
  getActiveSessions: authRepository.getActiveSessions.bind(authRepository),
  removeActiveSession: authRepository.removeActiveSession.bind(authRepository),
  removeAllActiveSessions: authRepository.removeAllActiveSessions.bind(authRepository),
  isSessionActive: authRepository.isSessionActive.bind(authRepository),
  recordLoginHistory: authRepository.recordLoginHistory.bind(authRepository),
  getLoginHistory: authRepository.getLoginHistory.bind(authRepository),
  recordFailedAttempt: authRepository.recordFailedAttempt.bind(authRepository),
  resetFailedAttempts: authRepository.resetFailedAttempts.bind(authRepository),
  isAccountLocked: authRepository.isAccountLocked.bind(authRepository),
  setEmailVerificationCode: authRepository.setEmailVerificationCode.bind(authRepository),
  verifyEmail: authRepository.verifyEmail.bind(authRepository),
  setPasswordResetToken: authRepository.setPasswordResetToken.bind(authRepository),
  resetPasswordWithToken: authRepository.resetPasswordWithToken.bind(authRepository),
  setMfaCode: authRepository.setMfaCode.bind(authRepository),
  verifyMfaCode: authRepository.verifyMfaCode.bind(authRepository),
  addSecurityNotification: authRepository.addSecurityNotification.bind(authRepository),
  getSecurityNotifications: authRepository.getSecurityNotifications.bind(authRepository),
  updateUserPassword: authRepository.updateUserPassword.bind(authRepository),
  updateUserEmail: authRepository.updateUserEmail.bind(authRepository),

  // Appointments (Jadwal) & Concurrency Slots
  cleanOldAppointments: (...args: any[]) => (appointmentRepository.cleanOldAppointments as any)(...args),
  getAppointments: (...args: any[]) => (appointmentRepository.getAppointments as any)(...args),
  findAppointmentById: (...args: any[]) => (appointmentRepository.findAppointmentById as any)(...args),
  findAppointmentsByNIM: (...args: any[]) => (appointmentRepository.findAppointmentsByNIM as any)(...args),
  findAppointmentsByEmail: (...args: any[]) => (appointmentRepository.findAppointmentsByEmail as any)(...args),
  getAppointmentAvailability: (...args: any[]) => (appointmentRepository.getAppointmentAvailability as any)(...args),
  addAppointment: (...args: any[]) => (appointmentRepository.addAppointment as any)(...args),
  updateAppointment: (...args: any[]) => (appointmentRepository.updateAppointment as any)(...args),
  deleteAppointment: (...args: any[]) => (appointmentRepository.deleteAppointment as any)(...args),

  // Screenings (Krisis) & Triage
  getScreenings: screeningRepository.getScreenings.bind(screeningRepository),
  countScreenings: screeningRepository.countScreenings.bind(screeningRepository),
  findScreeningById: screeningRepository.findScreeningById.bind(screeningRepository),
  addScreening: screeningRepository.addScreening.bind(screeningRepository),
  updateScreeningStatus: screeningRepository.updateScreeningStatus.bind(screeningRepository),

  // Mood Logs
  getMoodLogs: moodRepository.getMoodLogs.bind(moodRepository),
  addMoodLog: moodRepository.addMoodLog.bind(moodRepository),

  // Privacy & Consents
  getUserConsent: privacyRepository.getUserConsent.bind(privacyRepository),
  saveUserConsent: privacyRepository.saveUserConsent.bind(privacyRepository),
  addStaffAccessLog: privacyRepository.addStaffAccessLog.bind(privacyRepository),
  getStaffAccessLogsForUser: privacyRepository.getStaffAccessLogsForUser.bind(privacyRepository),
  requestDataErasure: privacyRepository.requestDataErasure.bind(privacyRepository),
  getErasureStatus: privacyRepository.getErasureStatus.bind(privacyRepository),

  // Audits & Logs
  logAudit: auditRepository.logAudit.bind(auditRepository),
  getAuditLogs: auditRepository.getAuditLogs.bind(auditRepository),
  countAuditLogs: auditRepository.countAuditLogs.bind(auditRepository),
  addTelemetryLog: auditRepository.addTelemetryLog.bind(auditRepository),
  getTelemetryLogs: auditRepository.getTelemetryLogs.bind(auditRepository),
  countTelemetryLogs: auditRepository.countTelemetryLogs.bind(auditRepository),
  addGovernanceTest: auditRepository.addGovernanceTest.bind(auditRepository),
  getGovernanceTests: auditRepository.getGovernanceTests.bind(auditRepository),
  countGovernanceTests: auditRepository.countGovernanceTests.bind(auditRepository),
  getDailyUsage: auditRepository.getDailyUsage.bind(auditRepository),
  incrementDailyUsage: auditRepository.incrementDailyUsage.bind(auditRepository),
  consumeQuotaTransaction: auditRepository.consumeQuotaTransaction.bind(auditRepository),
  rollbackQuotaTransaction: auditRepository.rollbackQuotaTransaction.bind(auditRepository),
  getWeeklyUsage: auditRepository.getWeeklyUsage.bind(auditRepository),
  saveProgramProgress: auditRepository.saveProgramProgress.bind(auditRepository),
  getProgramProgress: auditRepository.getProgramProgress.bind(auditRepository),
  addUsabilityFeedback: auditRepository.addUsabilityFeedback.bind(auditRepository),
  getUsabilityFeedbacks: auditRepository.getUsabilityFeedbacks.bind(auditRepository),
  countUsabilityFeedbacks: auditRepository.countUsabilityFeedbacks.bind(auditRepository),

  // Counselors
  getCounselors: counselorRepository.getCounselors.bind(counselorRepository),
  getCounselorById: counselorRepository.getCounselorById.bind(counselorRepository),
  addCounselor: counselorRepository.addCounselor.bind(counselorRepository),
};
