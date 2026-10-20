/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../../database.js';
import { encryptionService } from '../../services/encryptionService.js';
import { getJwtSecret } from '../../middleware/auth.js';
import workspaceRouter from '../../routes/workspace.js';
import workspaceArtifactsRouter from '../../routes/workspaceArtifacts.js';
import attachmentsRouter from '../../routes/attachments.js';
import counselorPortalRouter from '../../routes/counselorPortal.js';
import adminRouter from '../../routes/admin.js';

// Setup isolated Express test app
const app = express();
app.use(express.json());

app.use('/api/v1/workspace/artifacts', workspaceArtifactsRouter);
app.use('/api/v1/workspace', workspaceRouter);
app.use('/api/v1', attachmentsRouter);
app.use('/api/v1/counselor-portal', counselorPortalRouter);
app.use('/api/v1', adminRouter);

const createToken = (user: { userId: string; role: string; email: string; name: string }) => {
  return jwt.sign(
    {
      userId: user.userId,
      role: user.role,
      email: user.email,
      name: user.name,
      sessionId: `sess-${user.userId}`
    },
    getJwtSecret(),
    {
      issuer: 'ruangtenang',
      audience: 'ruangtenang-web',
      algorithm: 'HS256',
      expiresIn: '1h'
    }
  );
};

describe('Production Hardening: Strict IDOR & Privilege Escalation Regression Suite', () => {
  const userA = {
    userId: `usr_idor_a_${Date.now()}`,
    email: `usera_${Date.now()}@kampus.ac.id`,
    name: 'User A',
    role: 'mahasiswa'
  };

  const userB = {
    userId: `usr_idor_b_${Date.now()}`,
    email: `userb_${Date.now()}@kampus.ac.id`,
    name: 'User B',
    role: 'mahasiswa'
  };

  const counselor = {
    userId: `cns_idor_${Date.now()}`,
    email: `counselor_${Date.now()}@kampus.ac.id`,
    name: 'Counselor',
    role: 'konselor'
  };

  let tokenA: string;
  let tokenB: string;
  let tokenCounselor: string;

  const chatAId = `chat_idor_a_${Date.now()}`;
  const artifactAId = `art_idor_a_${Date.now()}`;
  let taskAId: string;

  beforeAll(async () => {
    tokenA = createToken(userA);
    tokenB = createToken(userB);
    tokenCounselor = createToken(counselor);

    // 1. Create User A, User B, Counselor with active session records
    await prisma.users.createMany({
      data: [
        {
          id: userA.userId,
          email: userA.email,
          passwordHash: 'hash',
          name: userA.name,
          role: userA.role,
          activeSessions: JSON.stringify([{ sessionId: `sess-${userA.userId}` }])
        },
        {
          id: userB.userId,
          email: userB.email,
          passwordHash: 'hash',
          name: userB.name,
          role: userB.role,
          activeSessions: JSON.stringify([{ sessionId: `sess-${userB.userId}` }])
        },
        {
          id: counselor.userId,
          email: counselor.email,
          passwordHash: 'hash',
          name: counselor.name,
          role: counselor.role,
          activeSessions: JSON.stringify([{ sessionId: `sess-${counselor.userId}` }])
        }
      ]
    });

    // 2. Create Chat and Workspace for User A
    await prisma.chats.create({
      data: {
        id: chatAId,
        userId: userA.userId,
        title: encryptionService.encryptSensitive('Workspace Rahasia User A') || 'Workspace Rahasia User A',
        workspaceMode: 'RUANG_KERJA',
        workspace: {
          create: {
            description: encryptionService.encryptSensitive('Deskripsi Rahasia User A') || 'Deskripsi Rahasia User A'
          }
        }
      }
    });

    // 3. Create a task in User A's workspace
    const task = await prisma.workspaceTasks.create({
      data: {
        id: `wt_task_a_${Date.now()}`,
        workspaceId: chatAId,
        title: encryptionService.encryptSensitive('Task Rahasia User A') || 'Task Rahasia User A',
        status: 'todo',
        source: 'manual'
      }
    });
    taskAId = task.id;

    // 4. Create an Artifact for User A in chatAId
    await prisma.artifacts.create({
      data: {
        id: artifactAId,
        userId: userA.userId,
        chatId: chatAId,
        title: 'Skripsi Bab 1 User A',
        type: 'DOCUMENT',
        content: encryptionService.encryptSensitive('Konten sangat rahasia karya User A') || 'Konten sangat rahasia karya User A',
        version: 1,
        versions: {
          create: [
            {
              id: `ver_art_a_1_${Date.now()}`,
              version: 1,
              title: 'Skripsi Bab 1 User A',
              content: encryptionService.encryptSensitive('Konten versi 1') || 'Konten versi 1'
            }
          ]
        }
      }
    });
  });

  afterAll(async () => {
    try {
      await prisma.artifactVersions.deleteMany({ where: { artifactId: artifactAId } });
      await prisma.artifacts.deleteMany({ where: { id: artifactAId } });
      await prisma.workspaceTasks.deleteMany({ where: { workspaceId: chatAId } });
      await prisma.workspaces.deleteMany({ where: { chatId: chatAId } });
      await prisma.chats.deleteMany({ where: { id: chatAId } });
      await prisma.users.deleteMany({ where: { id: { in: [userA.userId, userB.userId, counselor.userId] } } });
    } catch {}
  });

  describe('1. Workspace IDOR Isolation', () => {
    it('User B cannot retrieve User A workspace details (GET -> 404)', async () => {
      const res = await request(app)
        .get(`/api/v1/workspace/${chatAId}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('WORKSPACE_NOT_FOUND');
    });

    it('User B cannot update User A workspace title or preferences (PUT -> 404)', async () => {
      const res = await request(app)
        .put(`/api/v1/workspace/${chatAId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ name: 'Hacked Title By User B' });
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('WORKSPACE_NOT_FOUND');
    });

    it('User B cannot create a task in User A workspace (POST -> 404)', async () => {
      const res = await request(app)
        .post(`/api/v1/workspace/${chatAId}/tasks`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ title: 'Tugas Ilegal', source: 'user' });
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('WORKSPACE_NOT_FOUND');
    });

    it('User B cannot update task status in User A workspace (PUT -> 404)', async () => {
      const res = await request(app)
        .put(`/api/v1/workspace/${chatAId}/tasks/${taskAId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ status: 'done' });
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('WORKSPACE_NOT_FOUND');
    });

    it('User B cannot delete task in User A workspace (DELETE -> 404)', async () => {
      const res = await request(app)
        .delete(`/api/v1/workspace/${chatAId}/tasks/${taskAId}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('WORKSPACE_NOT_FOUND');
    });

    it('User B cannot access research sources list in User A workspace (GET -> 404)', async () => {
      const res = await request(app)
        .get(`/api/v1/workspace/${chatAId}/sources`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('WORKSPACE_NOT_FOUND');
    });

    it('User B search never leaks User A workspace, tasks, or documents', async () => {
      const res = await request(app)
        .get(`/api/v1/workspace/search?q=Rahasia`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items || res.body.data).toEqual([]);
    });
  });

  describe('2. Agent Plan & Execution IDOR Isolation', () => {
    it('User B cannot create an agent plan in User A workspace (POST -> 404)', async () => {
      const res = await request(app)
        .post(`/api/v1/workspace/${chatAId}/plans`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          id: `plan_fake_${Date.now()}`,
          goal: 'Tujuan ilegal',
          title: 'Plan Ilegal',
          status: 'draft',
          tasks: [
            {
              id: 'task-fake-1',
              title: 'Task fake',
              type: 'analysis',
              status: 'todo',
              dependsOn: []
            }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('User B cannot execute an agent loop on User A workspace (POST /agent -> 404)', async () => {
      const res = await request(app)
        .post(`/api/v1/workspace/${chatAId}/plans/plan-1/tasks/task-1/agent`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ executionId: `exec_${Date.now()}` });
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('WORKSPACE_NOT_FOUND');
    });

    it('User B cannot transition User A plan status (POST /transition -> 404)', async () => {
      const res = await request(app)
        .post(`/api/v1/workspace/${chatAId}/plans/plan-1/transition`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ action: 'approve' });
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('WORKSPACE_NOT_FOUND');
    });
  });

  describe('3. Canvas / Artifacts IDOR & Version Rollback Isolation', () => {
    it('User B cannot list User A artifacts under User A workspace (GET -> 404)', async () => {
      const res = await request(app)
        .get(`/api/v1/workspace/artifacts?chatId=${chatAId}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('CHAT_NOT_FOUND');
    });

    it('User B library (/all) never returns User A artifacts', async () => {
      const res = await request(app)
        .get(`/api/v1/workspace/artifacts/all`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const found = res.body.data.find((a: any) => a.id === artifactAId);
      expect(found).toBeUndefined();
    });

    it('User B cannot modify/autosave User A artifact (PUT -> 404)', async () => {
      const res = await request(app)
        .put(`/api/v1/workspace/artifacts/${artifactAId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ title: 'Modified by User B', content: 'Infiltrated content' });
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('User B cannot trigger rollback on User A artifact (POST /rollback -> 404)', async () => {
      const res = await request(app)
        .post(`/api/v1/workspace/artifacts/${artifactAId}/rollback`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ targetVersion: 1 });
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('User B cannot delete User A artifact (DELETE -> 404)', async () => {
      const res = await request(app)
        .delete(`/api/v1/workspace/artifacts/${artifactAId}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('NOT_FOUND');
    });
  });

  describe('4. File Intelligence & Tabular IDOR Isolation', () => {
    it('User B cannot fetch text preview of User A attachment (GET /preview -> 404)', async () => {
      const res = await request(app)
        .get(`/api/v1/chat/attachments/non_existent_or_user_a/preview`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('User B cannot access dataset profile or cell preview without ownership (GET -> 404)', async () => {
      const res = await request(app)
        .get(`/api/v1/chat/attachments/fake_attachment_id/dataset`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('User B cannot access the combined dataset overview without ownership (GET -> 404)', async () => {
      const res = await request(app)
        .get(`/api/v1/chat/attachments/fake_attachment_id/dataset/overview`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('5. Role-Based Privilege Escalation Hardening', () => {
    it('Student role cannot access Counselor Portal endpoints (GET /counselor-portal/triage-queue -> 403)', async () => {
      const res = await request(app)
        .get('/api/v1/counselor-portal/triage-queue')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Student role cannot access Admin telemetry (GET /api/v1/telemetry -> 403)', async () => {
      const res = await request(app)
        .get('/api/v1/telemetry')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Counselor role cannot access Admin audit logs (GET /api/v1/audit-logs -> 403)', async () => {
      const res = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${tokenCounselor}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
