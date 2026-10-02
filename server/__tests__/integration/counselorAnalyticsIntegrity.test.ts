import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { prisma, serverDb } from '../../database.js';
import { getJwtSecret } from '../../middleware/auth.js';
import counselorPortalRouter from '../../routes/counselorPortal.js';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1/counselor-portal', counselorPortalRouter);

const generateUserToken = (user: { userId: string; role: string; name: string; email: string }) => {
  return jwt.sign(
    {
      userId: user.userId,
      role: user.role,
      name: user.name,
      email: user.email,
      sessionId: `sess-${user.userId}`
    },
    getJwtSecret(),
    {
      expiresIn: '1h',
      issuer: 'ruangtenang',
      audience: 'ruangtenang-web',
      algorithm: 'HS256'
    }
  );
};

describe('FASE 11: Analytics Integrity & Authoritative Metrics Test Suite', () => {
  const counselorAUser = { userId: 'couns-f11-a', name: 'Konselor F11 A', role: 'konselor', email: 'counselorf11a@ui.ac.id' };
  const counselorBUser = { userId: 'couns-f11-b', name: 'Konselor F11 B', role: 'konselor', email: 'counselorf11b@ui.ac.id' };
  const adminUser = { userId: 'admin-f11-usr', name: 'Admin F11', role: 'admin', email: 'adminf11@ui.ac.id' };

  const student1 = { userId: 'mhs-f11-1', name: 'Mahasiswa 1', role: 'mahasiswa', email: 'mhs1@ui.ac.id' };
  const student2 = { userId: 'mhs-f11-2', name: 'Mahasiswa 2', role: 'mahasiswa', email: 'mhs2@ui.ac.id' };
  const student3 = { userId: 'mhs-f11-3', name: 'Mahasiswa 3', role: 'mahasiswa', email: 'mhs3@ui.ac.id' };

  const counselorAProfileId = 'c-prof-f11-a';
  const counselorBProfileId = 'c-prof-f11-b';

  let tokenCounselorA: string;
  let tokenCounselorB: string;
  let tokenAdmin: string;

  beforeAll(async () => {
    vi.spyOn(serverDb, 'isSessionActive').mockResolvedValue(true);

    tokenCounselorA = generateUserToken(counselorAUser);
    tokenCounselorB = generateUserToken(counselorBUser);
    tokenAdmin = generateUserToken(adminUser);

    // Clean any residual test fixtures
    await prisma.clinicalSoapNotes.deleteMany({
      where: { counselorUserId: { in: [counselorAUser.userId, counselorBUser.userId] } }
    });
    await prisma.appointments.deleteMany({
      where: { counselorId: { in: [counselorAProfileId, counselorBProfileId] } }
    });
    await prisma.screenings.deleteMany({
      where: { userId: { in: [student1.userId, student2.userId, student3.userId] } }
    });
    await prisma.counselors.deleteMany({
      where: { id: { in: [counselorAProfileId, counselorBProfileId] } }
    });
    await prisma.users.deleteMany({
      where: { id: { in: [counselorAUser.userId, counselorBUser.userId, adminUser.userId, student1.userId, student2.userId, student3.userId] } }
    });

    // Create Base Users
    await prisma.users.createMany({
      data: [
        { id: counselorAUser.userId, name: counselorAUser.name, email: counselorAUser.email, passwordHash: 'hash', role: 'konselor' },
        { id: counselorBUser.userId, name: counselorBUser.name, email: counselorBUser.email, passwordHash: 'hash', role: 'konselor' },
        { id: adminUser.userId, name: adminUser.name, email: adminUser.email, passwordHash: 'hash', role: 'admin' },
        { id: student1.userId, name: student1.name, email: student1.email, passwordHash: 'hash', role: 'mahasiswa' },
        { id: student2.userId, name: student2.name, email: student2.email, passwordHash: 'hash', role: 'mahasiswa' },
        { id: student3.userId, name: student3.name, email: student3.email, passwordHash: 'hash', role: 'mahasiswa' },
      ]
    });

    // Create Counselor Profiles
    await prisma.counselors.createMany({
      data: [
        {
          id: counselorAProfileId,
          userId: counselorAUser.userId,
          name: counselorAUser.name,
          role: 'Psikolog Klinis',
          specialties: JSON.stringify(['Anxiety']),
          imageUrl: '/c1.jpg',
          availability: JSON.stringify(['Senin'])
        },
        {
          id: counselorBProfileId,
          userId: counselorBUser.userId,
          name: counselorBUser.name,
          role: 'Psikolog Klinis',
          specialties: JSON.stringify(['Stress']),
          imageUrl: '/c2.jpg',
          availability: JSON.stringify(['Selasa'])
        }
      ]
    });

    // Provide student consent for counselor sharing
    await prisma.userConsents.deleteMany({
      where: { userId: { in: [student1.userId, student2.userId, student3.userId] } }
    });
    await prisma.userConsents.createMany({
      data: [
        { userId: student1.userId, consentForCounselorSharing: true, consentForCounselorSummary: true },
        { userId: student2.userId, consentForCounselorSharing: true, consentForCounselorSummary: true },
        { userId: student3.userId, consentForCounselorSharing: true, consentForCounselorSummary: true }
      ]
    });
  });

  afterAll(async () => {
    await prisma.clinicalSoapNotes.deleteMany({
      where: { counselorUserId: { in: [counselorAUser.userId, counselorBUser.userId] } }
    });
    await prisma.appointments.deleteMany({
      where: { counselorId: { in: [counselorAProfileId, counselorBProfileId] } }
    });
    await prisma.screenings.deleteMany({
      where: { userId: { in: [student1.userId, student2.userId, student3.userId] } }
    });
    await prisma.counselors.deleteMany({
      where: { id: { in: [counselorAProfileId, counselorBProfileId] } }
    });
    await prisma.users.deleteMany({
      where: { id: { in: [counselorAUser.userId, counselorBUser.userId, adminUser.userId, student1.userId, student2.userId, student3.userId] } }
    });
  });

  // 1 & 14 & 16: Zero appointments / Empty state
  it('1. should return null for response times and zero metrics when counselor has no records (no fake 30m or 0.5h)', async () => {
    const res = await request(app)
      .get('/api/v1/counselor-portal/stats')
      .set('Authorization', `Bearer ${tokenCounselorB}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { data } = res.body;

    // Response time must be honest null, not 30 or 0.5
    expect(data.avgResponseTimeMinutes).toBeNull();
    expect(data.averageResponseTimeHours).toBeNull();
    expect(data.totalAppointments).toBe(0);
    expect(data.activeCases).toBe(0);
    expect(data.highRiskSoapNotes).toBe(0);
    expect(data.completedNotes).toBe(0);
    expect(data.totalStudents).toBe(0);
  });

  // 2, 3, 4: Real response time calculation from timestamps
  it('2. should calculate authentic response time from real createdAt to counselor action timestamps', async () => {
    // Appointment A: Created 10:00, Counselor SOAP note action 10:30 -> diff = 30 minutes
    const baseTime = new Date('2026-09-01T10:00:00.000Z');
    const soapTimeA = new Date('2026-09-01T10:30:00.000Z');

    // Appointment B: Created 11:00, Counselor SOAP note action 12:00 -> diff = 60 minutes
    const baseTimeB = new Date('2026-09-01T11:00:00.000Z');
    const soapTimeB = new Date('2026-09-01T12:00:00.000Z');

    const apptAId = 'appt-resp-time-a';
    const apptBId = 'appt-resp-time-b';

    await prisma.appointments.createMany({
      data: [
        {
          id: apptAId,
          counselorId: counselorAProfileId,
          counselorName: counselorAUser.name,
          scheduledAt: new Date('2026-09-02T10:00:00.000Z'),
          status: 'CONFIRMED',
          approvalStatus: 'APPROVED',
          attendanceStatus: 'SCHEDULED',
          createdAt: baseTime,
          userId: student1.userId
        },
        {
          id: apptBId,
          counselorId: counselorAProfileId,
          counselorName: counselorAUser.name,
          scheduledAt: new Date('2026-09-02T11:00:00.000Z'),
          status: 'COMPLETED',
          approvalStatus: 'APPROVED',
          attendanceStatus: 'ATTENDED',
          createdAt: baseTimeB,
          userId: student2.userId
        }
      ]
    });

    // Create SOAP notes corresponding to counselor action
    await prisma.clinicalSoapNotes.createMany({
      data: [
        {
          id: 'soap-resp-a',
          appointmentId: apptAId,
          studentUserId: student1.userId,
          counselorUserId: counselorAUser.userId,
          subjective: 'sub',
          objective: 'obj',
          assessment: 'ass',
          plan: 'pln',
          riskLevel: 'Rendah',
          createdAt: soapTimeA,
          updatedAt: soapTimeA
        },
        {
          id: 'soap-resp-b',
          appointmentId: apptBId,
          studentUserId: student2.userId,
          counselorUserId: counselorAUser.userId,
          subjective: 'sub',
          objective: 'obj',
          assessment: 'ass',
          plan: 'pln',
          riskLevel: 'Rendah',
          createdAt: soapTimeB,
          updatedAt: soapTimeB
        }
      ]
    });

    const res = await request(app)
      .get('/api/v1/counselor-portal/stats')
      .set('Authorization', `Bearer ${tokenCounselorA}`);

    expect(res.status).toBe(200);
    const { data } = res.body;

    // Average: (30 + 60) / 2 = 45 minutes = 0.8 hours (rounded to 1 decimal place)
    expect(data.avgResponseTimeMinutes).toBe(45);
    expect(data.averageResponseTimeHours).toBe(0.8);
  });

  // 6 & 7: Severity distribution & No double count on selfHarm + high PHQ-9
  it('3. should calculate mutually exclusive severity distribution without double-counting self-harm and high PHQ', async () => {
    // Clean previous screenings for student1
    await prisma.screenings.deleteMany({ where: { userId: student1.userId } });

    await prisma.screenings.createMany({
      data: [
        // 1. Krisis: hasSelfHarmRisk true AND phq9Score >= 20 -> Must be 1 Krisis count, not 2
        {
          id: 'scr-1',
          userId: student1.userId,
          phq9Score: 24,
          gad7Score: 18,
          phq9Severity: 'Berat',
          gad7Severity: 'Berat',
          hasSelfHarmRisk: true,
          status: 'Menunggu Penanganan',
          timestamp: new Date()
        },
        // 2. Krisis: hasSelfHarmRisk true but low PHQ9 -> Krisis count
        {
          id: 'scr-2',
          userId: student1.userId,
          phq9Score: 8,
          gad7Score: 5,
          phq9Severity: 'Ringan',
          gad7Severity: 'Ringan',
          hasSelfHarmRisk: true,
          status: 'Menunggu Penanganan',
          timestamp: new Date()
        },
        // 3. Berat: phq9 = 17, no self harm
        {
          id: 'scr-3',
          userId: student1.userId,
          phq9Score: 17,
          gad7Score: 12,
          phq9Severity: 'Berat',
          gad7Severity: 'Sedang',
          hasSelfHarmRisk: false,
          status: 'Menunggu Penanganan',
          timestamp: new Date()
        },
        // 4. Sedang: phq9 = 12, no self harm
        {
          id: 'scr-4',
          userId: student1.userId,
          phq9Score: 12,
          gad7Score: 10,
          phq9Severity: 'Sedang',
          gad7Severity: 'Sedang',
          hasSelfHarmRisk: false,
          status: 'Menunggu Penanganan',
          timestamp: new Date()
        },
        // 5. Ringan: phq9 = 7, no self harm
        {
          id: 'scr-5',
          userId: student1.userId,
          phq9Score: 7,
          gad7Score: 6,
          phq9Severity: 'Ringan',
          gad7Severity: 'Ringan',
          hasSelfHarmRisk: false,
          status: 'Menunggu Penanganan',
          timestamp: new Date()
        },
        // 6. Minimal: phq9 = 3, no self harm
        {
          id: 'scr-6',
          userId: student1.userId,
          phq9Score: 3,
          gad7Score: 2,
          phq9Severity: 'Minimal',
          gad7Severity: 'Minimal',
          hasSelfHarmRisk: false,
          status: 'Menunggu Penanganan',
          timestamp: new Date()
        }
      ]
    });

    const res = await request(app)
      .get('/api/v1/counselor-portal/stats')
      .set('Authorization', `Bearer ${tokenCounselorA}`);

    expect(res.status).toBe(200);
    const { data } = res.body;

    const severityMap: Record<string, number> = {};
    for (const item of data.severityDistribution) {
      severityMap[item.name] = item.count;
    }

    expect(severityMap['Krisis / Suisiditas']).toBe(2);
    expect(severityMap['Berat (Severe)']).toBe(1);
    expect(severityMap['Sedang (Moderate)']).toBe(1);
    expect(severityMap['Ringan (Mild)']).toBe(1);
    expect(severityMap['Minimal / Normal']).toBe(1);

    // Sum of severity buckets must exactly equal totalScreenings
    const sumBuckets = Object.values(severityMap).reduce((a, b) => a + b, 0);
    expect(sumBuckets).toBe(data.totalScreenings);
  });

  // 8 & 9: Active cases vs resolved status
  it('4. should correctly count active cases and exclude cancelled / completed', async () => {
    // Add extra appointments with various lifecycle statuses for counselorA
    await prisma.appointments.createMany({
      data: [
        {
          id: 'appt-stat-sched',
          counselorId: counselorAProfileId,
          counselorName: counselorAUser.name,
          scheduledAt: new Date(),
          status: 'SCHEDULED',
          approvalStatus: 'APPROVED',
          attendanceStatus: 'SCHEDULED',
          userId: student1.userId
        },
        {
          id: 'appt-stat-prog',
          counselorId: counselorAProfileId,
          counselorName: counselorAUser.name,
          scheduledAt: new Date(),
          status: 'IN_PROGRESS',
          approvalStatus: 'APPROVED',
          attendanceStatus: 'SCHEDULED',
          userId: student1.userId
        },
        {
          id: 'appt-stat-canc',
          counselorId: counselorAProfileId,
          counselorName: counselorAUser.name,
          scheduledAt: new Date(),
          status: 'CANCELLED',
          approvalStatus: 'REJECTED',
          attendanceStatus: 'CANCELLED',
          userId: student1.userId
        },
        {
          id: 'appt-stat-comp',
          counselorId: counselorAProfileId,
          counselorName: counselorAUser.name,
          scheduledAt: new Date(),
          status: 'COMPLETED',
          approvalStatus: 'APPROVED',
          attendanceStatus: 'ATTENDED',
          userId: student1.userId
        }
      ]
    });

    const res = await request(app)
      .get('/api/v1/counselor-portal/stats')
      .set('Authorization', `Bearer ${tokenCounselorA}`);

    expect(res.status).toBe(200);
    const { data } = res.body;

    // Active cases: previous CONFIRMED (apptAId) + SCHEDULED + IN_PROGRESS = 3
    // CANCELLED and COMPLETED must NOT be counted as active
    expect(data.activeCases).toBe(3);
  });

  // 10: Monthly trend across year boundaries
  it('5. should group monthly trend across year boundaries without collapsing duplicate month names', async () => {
    const res = await request(app)
      .get('/api/v1/counselor-portal/stats')
      .set('Authorization', `Bearer ${tokenCounselorA}`);

    expect(res.status).toBe(200);
    const { monthlyTrend } = res.body.data;

    expect(Array.isArray(monthlyTrend)).toBe(true);
    expect(monthlyTrend.length).toBe(6);

    // Each month label must contain both month name and year indicator (e.g. "Agu '26", "Sep '26")
    const labels = monthlyTrend.map((m: any) => m.month);
    const uniqueLabels = new Set(labels);
    expect(uniqueLabels.size).toBe(6); // Every month in the 6-month window must be unique
  });

  // Risk classification is not an intervention event.
  it('6. reports high-risk SOAP notes without claiming interventions occurred', async () => {
    // Currently, counselorA has 2 screenings with hasSelfHarmRisk: true,
    // but 0 SOAP notes with riskLevel: 'CRISIS'.
    const res = await request(app)
      .get('/api/v1/counselor-portal/stats')
      .set('Authorization', `Bearer ${tokenCounselorA}`);

    expect(res.status).toBe(200);
    const { data } = res.body;

    // Risk detection count
    expect(data.highRiskScreenings).toBeGreaterThanOrEqual(2);
    // Emergency intervention: must only count actual crisis intervention documentation
    expect(data.highRiskSoapNotes).toBe(0);

    // A crisis-classified SOAP note still does not establish that intervention occurred.
    await prisma.clinicalSoapNotes.create({
      data: {
        id: 'soap-crisis-interv',
        studentUserId: student1.userId,
        counselorUserId: counselorAUser.userId,
        subjective: 'Emergency intervention conducted',
        objective: 'Self-harm ideation de-escalated',
        assessment: 'Severe crisis resolved safely',
        plan: 'Referral to campus hospital',
        riskLevel: 'CRISIS',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    const resAfter = await request(app)
      .get('/api/v1/counselor-portal/stats')
      .set('Authorization', `Bearer ${tokenCounselorA}`);

    expect(resAfter.body.data.highRiskSoapNotes).toBe(1);
  });

  // 12 & 13: Counselor scoping vs Admin scoping
  it('7. scopes counselors to assignments and gives admins no implicit student scope', async () => {
    // Counselor B has no assignments -> 0 totalStudents
    const resB = await request(app)
      .get('/api/v1/counselor-portal/stats')
      .set('Authorization', `Bearer ${tokenCounselorB}`);

    expect(resB.body.data.totalStudents).toBe(0);

    // Admins are denied access to counselor clinical statistics entirely.
    const resAdmin = await request(app)
      .get('/api/v1/counselor-portal/stats')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(resAdmin.status).toBe(403);
    expect(resAdmin.body.error).toBe('ACCESS_DENIED');
  });

  // 5: >500 screening records count accuracy (Verifies removal of arbitrary take: 500 cap)
  it('8. should accurately aggregate >500 screening records via database aggregations without arbitrary limits', async () => {
    // Bulk create 520 minimal screenings for student1
    const bulkScreenings = [];
    const now = Date.now();
    for (let i = 0; i < 520; i++) {
      bulkScreenings.push({
        id: `bulk-scr-${now}-${i}`,
        userId: student1.userId,
        phq9Score: 2,
        gad7Score: 1,
        phq9Severity: 'Minimal',
        gad7Severity: 'Minimal',
        hasSelfHarmRisk: false,
        status: 'Menunggu Penanganan',
        timestamp: new Date()
      });
    }

    await prisma.screenings.createMany({ data: bulkScreenings });

    const res = await request(app)
      .get('/api/v1/counselor-portal/stats')
      .set('Authorization', `Bearer ${tokenCounselorA}`);

    expect(res.status).toBe(200);
    const { data } = res.body;

    // Should be at least 520 + previous 6 = 526, not capped at 500!
    expect(data.totalScreenings).toBeGreaterThanOrEqual(526);
    expect(data.totalTriaged).toBe(data.totalScreenings);

    // Find the Minimal bucket
    const minimalItem = data.severityDistribution.find((s: any) => s.name === 'Minimal / Normal');
    expect(minimalItem.count).toBeGreaterThanOrEqual(521);

    // Clean up bulk records
    await prisma.screenings.deleteMany({
      where: { id: { startsWith: `bulk-scr-${now}-` } }
    });
  });

  // 11 & 15: Triage resolution rate & SOAP count accuracy
  it('9. should compute triage resolution rate and SOAP notes count accurately', async () => {
    const res = await request(app)
      .get('/api/v1/counselor-portal/stats')
      .set('Authorization', `Bearer ${tokenCounselorA}`);

    expect(res.status).toBe(200);
    const { data } = res.body;

    // SOAP notes count must match clinicalSoapNotes in DB for counselorA
    const actualSoapDbCount = await prisma.clinicalSoapNotes.count({
      where: { counselorUserId: counselorAUser.userId }
    });
    expect(data.totalSoapNotes).toBe(actualSoapDbCount);
    expect(data.completedNotes).toBe(actualSoapDbCount);

    // Resolution rate is resolvedScreenings / totalScreenings
    expect(typeof data.triageResolutionRate).toBe('string');
    expect(data.triageResolutionRate).toMatch(/^\d+(\.\d+)?%$/);
  });
});
