import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { prisma, serverDb } from '../../database.js';
import screeningRouter from '../../routes/screening.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development-ruangtenang';
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1/screenings', screeningRouter);

const token = (u: Record<string, string>) =>
  jwt.sign({ ...u, sessionId: 'test-session' }, JWT_SECRET, { issuer: 'ruangtenang', audience: 'ruangtenang-web', algorithm: 'HS256' });

const IDS = ['scr-int-a', 'scr-int-b'];
const USERS = ['scoring-student-a', 'scoring-student-b', 'scoring-counselor', 'scoring-admin'];
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
const zeros = (n: number) => Array(n).fill(0);

describe('screening API: authoritative scoring & safety (real DB, real router)', () => {
  const a = token({ userId: USERS[0], name: 'A', role: 'mahasiswa', email: 'sa@test.com' });
  const b = token({ userId: USERS[1], name: 'B', role: 'mahasiswa', email: 'sb@test.com' });
  const c = token({ userId: USERS[2], name: 'C', role: 'konselor', email: 'sc@test.com' });
  const adm = token({ userId: USERS[3], name: 'Adm', role: 'admin', email: 'sad@test.com' });

  const cleanup = async () => {
    await prisma.screenings.deleteMany({ where: { userId: { in: USERS } } });
    await prisma.users.deleteMany({ where: { id: { in: USERS } } });
  };

  beforeAll(async () => {
    vi.spyOn(serverDb, 'isSessionActive').mockResolvedValue(true);
    await cleanup();
    await prisma.users.createMany({
      data: [
        { id: USERS[0], name: 'A', email: 'sa@test.com', passwordHash: 'h', role: 'mahasiswa' },
        { id: USERS[1], name: 'B', email: 'sb@test.com', passwordHash: 'h', role: 'mahasiswa' },
        { id: USERS[2], name: 'C', email: 'sc@test.com', passwordHash: 'h', role: 'konselor' },
        { id: USERS[3], name: 'Adm', email: 'sad@test.com', passwordHash: 'h', role: 'admin' },
      ],
    });
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await cleanup();
  });

  it('rejects unauthenticated submissions', async () => {
    const res = await request(app).post('/api/v1/screenings').send({ phq9Score: 1, gad7Score: 1 });
    expect(res.status).toBe(401);
  });

  it('stores authoritative severity, ignoring client severity (PHQ-9 17 => Sedang-Berat)', async () => {
    const phq = [2, 2, 2, 2, 2, 2, 2, 2, 1]; // 17
    const res = await request(app)
      .post('/api/v1/screenings')
      .set(auth(a))
      .send({ phq9Score: 17, gad7Score: 0, phq9Severity: 'Minimal', gad7Severity: 'Berat', phq9Answers: phq, gad7Answers: zeros(7) });
    expect(res.status).toBe(200);
    expect(res.body.record.phq9Severity).toBe('Sedang-Berat');
    expect(res.body.record.gad7Severity).toBe('Minimal');
    expect(res.body.record.scoringVersion).toBe('PHQ9_CLASSIC_5_BAND_V1+GAD7_CLASSIC_4_BAND_V1');
    expect(res.body.record.verification).toBe('answers_verified');
    const row = await prisma.screenings.findUnique({ where: { id: res.body.record.id } });
    expect(row?.phq9Severity).toBe('Sedang-Berat');
  });

  it('accepts a legacy client that sends the Sedang-Berat label (previously failed validation)', async () => {
    const res = await request(app)
      .post('/api/v1/screenings')
      .set(auth(a))
      .send({ phq9Score: 16, gad7Score: 3, phq9Severity: 'Sedang-Berat', gad7Severity: 'Minimal' });
    expect(res.status).toBe(200);
    expect(res.body.record.verification).toBe('total_only');
  });

  it('item 9 flag cannot be downgraded by the client', async () => {
    const res = await request(app)
      .post('/api/v1/screenings')
      .set(auth(a))
      .send({
        phq9Score: 2,
        gad7Score: 0,
        phq9Answers: [0, 0, 0, 0, 0, 0, 0, 0, 2],
        gad7Answers: zeros(7),
        hasSelfHarmRisk: false,
        riskIndicators: { item9Score: 0, hasSelfHarmRisk: false, riskCategory: 'STANDAR' },
      });
    expect(res.status).toBe(200);
    expect(res.body.record.hasSelfHarmRisk).toBe(true);
    expect(res.body.record.safety.item9Positive).toBe(true);
    expect(res.body.record.riskIndicators.riskCategory).toBe('RISIKO_MENYAKITI_DIRI');
    const row = await prisma.screenings.findUnique({ where: { id: res.body.record.id } });
    expect(row?.hasSelfHarmRisk).toBe(true);
    expect(row?.item9Score).toBe(2);
  });

  it('rejects invalid scores, incomplete answers and score/answer mismatch with typed errors', async () => {
    const bad = [
      { phq9Score: 28, gad7Score: 0 },
      { phq9Score: -1, gad7Score: 0 },
      { phq9Score: 1.5, gad7Score: 0 },
      { phq9Score: '5', gad7Score: 0 },
    ];
    for (const body of bad) {
      const r = await request(app).post('/api/v1/screenings').set(auth(a)).send(body);
      expect(r.status).toBe(400);
    }
    const mismatch = await request(app)
      .post('/api/v1/screenings')
      .set(auth(a))
      .send({ phq9Score: 9, gad7Score: 0, phq9Answers: zeros(9), gad7Answers: zeros(7) });
    expect(mismatch.status).toBe(400);
    expect(mismatch.body.code).toBe('SCORE_MISMATCH');
    const incomplete = await request(app)
      .post('/api/v1/screenings')
      .set(auth(a))
      .send({ phq9Score: 0, gad7Score: 0, phq9Answers: [...zeros(8), -1], gad7Answers: zeros(7) });
    expect(incomplete.status).toBe(400);
    expect(incomplete.body.code).toBe('ANSWERS_INCOMPLETE');
  });

  it('spoofed userId cannot change the owner', async () => {
    const res = await request(app).post('/api/v1/screenings').set(auth(a)).send({ phq9Score: 1, gad7Score: 1, userId: USERS[1] });
    expect(res.status).toBe(200);
    expect(res.body.record.userId).toBe(USERS[0]);
    const mine = await request(app).get('/api/v1/screenings').set(auth(b));
    expect(mine.body.every((r: any) => r.userId === USERS[1])).toBe(true);
  });

  it('history re-derives unified severity for legacy rows without rewriting them', async () => {
    await prisma.screenings.create({
      data: { id: IDS[0], userId: USERS[1], phq9Score: 17, gad7Score: 12, phq9Severity: 'Berat', gad7Severity: 'Sedang' },
    });
    const res = await request(app).get('/api/v1/screenings').set(auth(b));
    const legacy = res.body.find((r: any) => r.id === IDS[0]);
    expect(legacy.phq9Severity).toBe('Sedang-Berat');
    expect(legacy.legacyStoredPhq9Severity).toBe('Berat');
    expect(legacy.scoringVersion).toBe('LEGACY_UNKNOWN');
    expect(legacy.safety.item9Positive).toBeNull();
    const row = await prisma.screenings.findUnique({ where: { id: IDS[0] } });
    expect(row?.phq9Severity).toBe('Berat'); // original preserved
    await prisma.screenings.delete({ where: { id: IDS[0] } });
  });

  it('counselor without consent/assignment and admin cannot read student screenings', async () => {
    const cr = await request(app).get(`/api/v1/screenings?userId=${USERS[0]}`).set(auth(c));
    expect(cr.status).toBe(403);
    const ar = await request(app).get('/api/v1/screenings').set(auth(adm));
    expect(ar.status).toBe(403);
  });
});
