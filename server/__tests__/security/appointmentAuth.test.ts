import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { prisma, serverDb } from '../../database.js';
import appointmentsRouter from '../../routes/appointments.js';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development-ruangtenang';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1/appointments', appointmentsRouter);
app.use('/api/appointments', appointmentsRouter);

const generateToken = (user: any) => jwt.sign({ ...user, sessionId: "test-session" }, JWT_SECRET, { issuer: 'ruangtenang', audience: 'ruangtenang-web', algorithm: 'HS256' });

describe('Appointment Security & IDOR Prevention Tests', () => {
  const student1Token = generateToken({ userId: 'std-idor-1', name: 'Student One', role: 'mahasiswa', email: 's1@test.com' });
  const student2Token = generateToken({ userId: 'std-idor-2', name: 'Student Two', role: 'mahasiswa', email: 's2@test.com' });
  const counselor1Token = generateToken({ userId: 'cns-user-1', name: 'Counselor Alpha', role: 'konselor', email: 'c1@test.com' });
  const counselor2Token = generateToken({ userId: 'cns-user-2', name: 'Counselor Beta', role: 'konselor', email: 'c2@test.com' });
  const adminToken = generateToken({ userId: 'adm-user-1', name: 'Admin Root', role: 'admin', email: 'admin@test.com' });

  beforeAll(async () => {
    vi.useFakeTimers();
    vi.spyOn(serverDb, 'isSessionActive').mockResolvedValue(true);

    // Clean up
    await prisma.appointments.deleteMany({ where: { id: { in: ['apt-sec-1', 'apt-sec-2', 'apt-room-video-1', 'apt-room-cancelled-1'] } } });
    await prisma.counselors.deleteMany({ where: { id: { in: ['cns-prof-1', 'cns-prof-2', 'cns-room-prof'] } } });
    await prisma.users.deleteMany({ where: { id: { in: ['std-idor-1', 'std-idor-2', 'cns-user-1', 'cns-user-2', 'adm-user-1', 'user-room-1', 'cns-room-2', 'user-attacker-3'] } } });

    // Seed users
    await prisma.users.createMany({
      data: [
        { id: 'std-idor-1', name: 'Student One', email: 's1@test.com', passwordHash: 'hash', role: 'mahasiswa' },
        { id: 'std-idor-2', name: 'Student Two', email: 's2@test.com', passwordHash: 'hash', role: 'mahasiswa' },
        { id: 'cns-user-1', name: 'Counselor Alpha', email: 'c1@test.com', passwordHash: 'hash', role: 'konselor' },
        { id: 'cns-user-2', name: 'Counselor Beta', email: 'c2@test.com', passwordHash: 'hash', role: 'konselor' },
        { id: 'adm-user-1', name: 'Admin Root', email: 'admin@test.com', passwordHash: 'hash', role: 'admin' },
        { id: 'user-room-1', name: 'User Room 1', email: 'room1@test.com', passwordHash: 'hash', role: 'mahasiswa' },
        { id: 'cns-room-2', name: 'Counselor Room 2', email: 'room2@test.com', passwordHash: 'hash', role: 'konselor' },
        { id: 'user-attacker-3', name: 'Attacker Room 3', email: 'room3@test.com', passwordHash: 'hash', role: 'mahasiswa' },
      ]
    });

    // Seed counselor profiles
    await prisma.counselors.createMany({
      data: [
        {
          id: 'cns-prof-1',
          userId: 'cns-user-1',
          name: 'Counselor Alpha',
          role: 'konselor',
          university: 'UI',
          specialties: JSON.stringify(['Anxiety']),
          imageUrl: '/images/counselor1.jpg',
          availability: JSON.stringify(['Senin', 'Selasa']),
          contactWhatsapp: '081111'
        },
        {
          id: 'cns-prof-2',
          userId: 'cns-user-2',
          name: 'Counselor Beta',
          role: 'konselor',
          university: 'ITB',
          specialties: JSON.stringify(['Burnout']),
          imageUrl: '/images/counselor2.jpg',
          availability: JSON.stringify(['Rabu', 'Kamis']),
          contactWhatsapp: '082222'
        },
        {
          id: 'cns-room-prof',
          userId: 'cns-room-2',
          name: 'Counselor Room 2',
          role: 'konselor',
          university: 'UGM',
          specialties: JSON.stringify(['Stress']),
          imageUrl: '/images/counselor3.jpg',
          availability: JSON.stringify(['Senin', 'Minggu']),
          contactWhatsapp: '083333'
        },
      ]
    });

    // Seed appointments
    await prisma.appointments.createMany({
      data: [
        {
          id: 'apt-sec-1',
          counselorId: 'cns-prof-1',
          counselorName: 'Counselor Alpha',
          userId: 'std-idor-1',
          studentName: 'Student One',
          scheduledAt: new Date('2026-03-10T09:00:00.000Z'),
          status: 'PENDING',
          approvalStatus: 'PENDING_APPROVAL',
          attendanceStatus: 'SCHEDULED',
          notes: 'Notes for appt 1'
        },
        {
          id: 'apt-sec-2',
          counselorId: 'cns-prof-2',
          counselorName: 'Counselor Beta',
          userId: 'std-idor-2',
          studentName: 'Student Two',
          scheduledAt: new Date('2026-03-11T14:00:00.000Z'),
          status: 'CONFIRMED',
          approvalStatus: 'APPROVED',
          attendanceStatus: 'SCHEDULED',
          notes: 'Notes for appt 2'
        },
        {
          id: 'apt-room-video-1',
          counselorId: 'cns-room-prof',
          counselorName: 'Counselor Room 2',
          userId: 'user-room-1',
          studentName: 'User Room 1',
          scheduledAt: new Date('2026-09-20T10:00:00+07:00'),
          status: 'CONFIRMED',
          approvalStatus: 'APPROVED',
          attendanceStatus: 'SCHEDULED',
          notes: 'Video Room Consultation Test'
        },
        {
          id: 'apt-room-cancelled-1',
          counselorId: 'cns-room-prof',
          counselorName: 'Counselor Room 2',
          userId: 'user-room-1',
          studentName: 'User Room 1',
          scheduledAt: new Date('2026-09-20T10:00:00+07:00'),
          status: 'CANCELLED',
          approvalStatus: 'REJECTED',
          attendanceStatus: 'CANCELLED',
          notes: 'Cancelled Video Room Test'
        }
      ]
    });
  });

  beforeEach(() => {
    vi.setSystemTime(new Date('2026-09-20T09:50:00+07:00'));
  });

  afterAll(async () => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    await prisma.appointments.deleteMany({ where: { id: { in: ['apt-sec-1', 'apt-sec-2', 'apt-room-video-1', 'apt-room-cancelled-1'] } } });
    await prisma.counselors.deleteMany({ where: { id: { in: ['cns-prof-1', 'cns-prof-2', 'cns-room-prof'] } } });
    await prisma.users.deleteMany({ where: { id: { in: ['std-idor-1', 'std-idor-2', 'cns-user-1', 'cns-user-2', 'adm-user-1', 'user-room-1', 'cns-room-2', 'user-attacker-3'] } } });
  });

  it('Mahasiswa can only fetch their own appointments', async () => {
    const res = await request(app)
      .get('/api/v1/appointments')
      .set('Authorization', `Bearer ${student1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].id).toBe('apt-sec-1');
  });

  it('Counselor 1 can only fetch appointments assigned to Counselor 1', async () => {
    const res = await request(app)
      .get('/api/v1/appointments')
      .set('Authorization', `Bearer ${counselor1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].id).toBe('apt-sec-1');
    expect(res.body[0].counselorId).toBe('cns-prof-1');
  });

  it('Counselor 1 is denied access when requesting counselorId of Counselor 2 (IDOR Prevention)', async () => {
    const res = await request(app)
      .get('/api/v1/appointments?counselorId=cns-prof-2')
      .set('Authorization', `Bearer ${counselor1Token}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('ACCESS_DENIED');
  });

  it('Status filter does not bypass counselor isolation', async () => {
    const res = await request(app)
      .get('/api/v1/appointments?status=CONFIRMED')
      .set('Authorization', `Bearer ${counselor1Token}`);

    expect(res.status).toBe(200);
    // Counselor 1 only has a PENDING appointment, so filtering by CONFIRMED should return 0, NOT leak Counselor 2's CONFIRMED appointment!
    expect(res.body.length).toBe(0);
  });

  it('Prevents Mahasiswa 2 from updating Mahasiswa 1 appointment (IDOR)', async () => {
    const res = await request(app)
      .put('/api/v1/appointments/apt-sec-1')
      .set('Authorization', `Bearer ${student2Token}`)
      .send({ notes: 'Hacked notes' });

    expect([403, 404]).toContain(res.status);
  });

  it('Prevents Counselor 2 from approving Counselor 1 appointment (IDOR)', async () => {
    const res = await request(app)
      .put('/api/v1/appointments/apt-sec-1')
      .set('Authorization', `Bearer ${counselor2Token}`)
      .send({ status: 'CONFIRMED' });

    expect([403, 404]).toContain(res.status);
  });

  it('rejects terminal appointment status recovery through the general update route', async () => {
    const res = await request(app)
      .put('/api/v1/appointments/apt-room-cancelled-1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CONFIRMED' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('INVALID_APPOINTMENT_STATUS_TRANSITION');
  });

  it('Prevents Counselor 1 from reassigning appointment to another counselor (Field-Level Auth)', async () => {
    const res = await request(app)
      .put('/api/v1/appointments/apt-sec-1')
      .set('Authorization', `Bearer ${counselor1Token}`)
      .send({ counselorId: 'cns-prof-2', counselorName: 'Counselor Beta' });

    expect(res.status).toBe(200);
    // Field is ignored for counselor
    const check = await serverDb.findAppointmentById('apt-sec-1');
    expect(check?.counselorId).toBe('cns-prof-1');
  });

  it('Admin can view all appointments and filter by counselorId', async () => {
    const res = await request(app)
      .get('/api/v1/appointments')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  describe('Video Consultation Room Access Authorization & Time Window Tests', () => {
    const user1ClientToken = generateToken({ userId: 'user-room-1', name: 'User Room 1', role: 'mahasiswa', email: 'room1@test.com' });
    const user2CounselorToken = generateToken({ userId: 'cns-room-2', name: 'Counselor Room 2', role: 'konselor', email: 'room2@test.com' });
    const user3AttackerToken = generateToken({ userId: 'user-attacker-3', name: 'Attacker Room 3', role: 'mahasiswa', email: 'room3@test.com' });

    it('Scenario 1: User 3 (unauthorized user / attacker) accessing room-access MUST return HTTP 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/appointments/apt-room-video-1/room-access')
        .set('Cookie', [`rt_auth_token=${user3AttackerToken}`]);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('ACCESS_DENIED');
    });

    it('Scenario 2: User 1 accesses room at 09:40 WIB (20 mins before 10:00 schedule) MUST return HTTP 403 (too early, 15m tolerance)', async () => {
      vi.setSystemTime(new Date('2026-09-20T09:40:00+07:00'));
      const res = await request(app)
        .get('/api/appointments/apt-room-video-1/room-access?simulatedTime=2026-09-20T09:50:00%2B07:00')
        .set('Cookie', [`rt_auth_token=${user1ClientToken}`])
        .set('x-simulated-time', '2026-09-20T09:50:00+07:00');

      expect([400, 403]).toContain(res.status);
      expect(res.body.success).toBe(false);
      expect(res.body.allowed).toBe(false);
      expect(res.body.error).toBe('ROOM_ACCESS_TOO_EARLY');
    });

    it('Scenario 3: User 1 or User 2 accesses room at 09:50 WIB (10 mins before 10:00 schedule) MUST return HTTP 200 OK', async () => {
      vi.setSystemTime(new Date('2026-09-20T09:50:00+07:00'));
      // User 1 (Client owner)
      const resUser1 = await request(app)
        .get('/api/appointments/apt-room-video-1/room-access')
        .set('Cookie', [`rt_auth_token=${user1ClientToken}`]);

      expect(resUser1.status).toBe(200);
      expect(resUser1.body.success).toBe(true);
      expect(resUser1.body.allowed).toBe(true);
      expect(resUser1.body.appointmentId).toBe('apt-room-video-1');

      // User 2 (Assigned Counselor)
      const resUser2 = await request(app)
        .get('/api/appointments/apt-room-video-1/room-access')
        .set('Cookie', [`rt_auth_token=${user2CounselorToken}`]);

      expect(resUser2.status).toBe(200);
      expect(resUser2.body.success).toBe(true);
      expect(resUser2.body.allowed).toBe(true);
    });

    it('Scenario 4: User 1 accessing CANCELLED appointment room MUST return HTTP 400 or 403', async () => {
      const res = await request(app)
        .get('/api/appointments/apt-room-cancelled-1/room-access')
        .set('Cookie', [`rt_auth_token=${user1ClientToken}`])
        .set('x-simulated-time', '2026-09-20T09:50:00+07:00');

      expect([400, 403]).toContain(res.status);
      expect(res.body.success).toBe(false);
      expect(res.body.allowed).toBe(false);
      expect(res.body.error).toBe('ROOM_ACCESS_CANCELLED');
    });

    it('Scenario 5: Attacker (User 3) accessing /ice-servers MUST return HTTP 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/appointments/apt-room-video-1/ice-servers')
        .set('Cookie', [`rt_auth_token=${user3AttackerToken}`]);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('ACCESS_DENIED');
    });

    it('Scenario 6: Authorized student (User 1) accessing /ice-servers MUST return HTTP 200 and dynamic iceServers config', async () => {
      const res = await request(app)
        .get('/api/appointments/apt-room-video-1/ice-servers')
        .set('Cookie', [`rt_auth_token=${user1ClientToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.iceServers)).toBe(true);
      expect(res.body.iceServers[0].urls).toBe('stun:stun.l.google.com:19302');
      const responseBody = JSON.stringify(res.body);
      for (const name of ['JWT_SECRET', 'ENCRYPTION_KEY', 'BLIND_INDEX_SECRET', 'DATABASE_URL', 'GEMINI_API_KEY', 'TURN_SHARED_SECRET']) {
        const value = process.env[name];
        if (value) expect(responseBody).not.toContain(value);
      }
      if (process.env.TURN_URL && process.env.TURN_SHARED_SECRET) {
        expect(res.body.iceServers[1].urls).toBe(process.env.TURN_URL);
        expect(res.body.iceServers[1].username).toMatch(/^\d+:/);
        expect(res.body.iceServers[1].credential).not.toBe(process.env.TURN_SHARED_SECRET);
      } else {
        expect(res.body.iceServers).toHaveLength(1);
      }
    });

    it('Scenario 7: Authorized counselor (User 2) accessing /ice-servers MUST return HTTP 200 and dynamic iceServers config', async () => {
      const res = await request(app)
        .get('/api/appointments/apt-room-video-1/ice-servers')
        .set('Cookie', [`rt_auth_token=${user2CounselorToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.iceServers)).toBe(true);
    });

    it('denies ICE and signaling after the room window expires, regardless of a client clock override', async () => {
      vi.setSystemTime(new Date('2026-09-20T11:31:00+07:00'));
      const iceRes = await request(app)
        .get('/api/v1/appointments/apt-room-video-1/ice-servers?simulatedTime=2026-09-20T09:50:00%2B07:00')
        .set('Cookie', [`rt_auth_token=${user1ClientToken}`])
        .set('x-simulated-time', '2026-09-20T09:50:00+07:00');
      expect(iceRes.status).toBe(403);
      expect(iceRes.body.error).toBe('ROOM_ACCESS_EXPIRED');

      const signalRes = await request(app)
        .get('/api/v1/appointments/apt-room-video-1/webrtc/signals')
        .set('Cookie', [`rt_auth_token=${user1ClientToken}`]);
      expect(signalRes.status).toBe(403);
      expect(signalRes.body.error).toBe('ROOM_ACCESS_EXPIRED');
    });

    it('denies PENDING appointments and platform admins from confidential room access', async () => {
      const pendingRes = await request(app)
        .get('/api/v1/appointments/apt-sec-1/room-access')
        .set('Cookie', [`rt_auth_token=${student1Token}`]);
      expect(pendingRes.status).toBe(403);
      expect(pendingRes.body.error).toBe('ROOM_ACCESS_NOT_APPROVED');

      const adminRes = await request(app)
        .get('/api/v1/appointments/apt-room-video-1/room-access')
        .set('Cookie', [`rt_auth_token=${adminToken}`]);
      expect(adminRes.status).toBe(403);
      expect(adminRes.body.error).toBe('ROOM_ACCESS_NOT_PARTICIPANT');
    });

    it('Scenario 8: Counselor A (counselor1Token) accessing Counselor B (User 2) room MUST return HTTP 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/appointments/apt-room-video-1/room-access')
        .set('Cookie', [`rt_auth_token=${counselor1Token}`]);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('ACCESS_DENIED');
    });

    it('Scenario 9: Student B (student2Token) accessing Student A (User 1) room MUST return HTTP 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/appointments/apt-room-video-1/room-access')
        .set('Cookie', [`rt_auth_token=${student2Token}`]);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('ACCESS_DENIED');
    });

    it('Scenario 10: Unauthorized user cannot read or update room presence (HTTP 403)', async () => {
      const resGet = await request(app)
        .get('/api/v1/appointments/apt-room-video-1/room-presence')
        .set('Cookie', [`rt_auth_token=${user3AttackerToken}`]);
      expect(resGet.status).toBe(404);

      const resPost = await request(app)
        .post('/api/v1/appointments/apt-room-video-1/room-presence')
        .set('Cookie', [`rt_auth_token=${user3AttackerToken}`])
        .send({ isScreenSharing: true });
      expect(resPost.status).toBe(404);
    });

    it('Scenario 11: Unauthorized user cannot read or update in-call notes (HTTP 403)', async () => {
      const resGet = await request(app)
        .get('/api/v1/appointments/apt-room-video-1/in-call-notes')
        .set('Cookie', [`rt_auth_token=${user3AttackerToken}`]);
      expect(resGet.status).toBe(404);

      const resPost = await request(app)
        .post('/api/v1/appointments/apt-room-video-1/in-call-notes')
        .set('Cookie', [`rt_auth_token=${user3AttackerToken}`])
        .send({ sharedContent: 'Hacked Notes' });
      expect(resPost.status).toBe(404);
    });

    it('Scenario 12: Unauthorized user cannot send or receive WebRTC signals (HTTP 403)', async () => {
      const resPost = await request(app)
        .post('/api/v1/appointments/apt-room-video-1/webrtc/signal')
        .set('Cookie', [`rt_auth_token=${user3AttackerToken}`])
        .send({ type: 'offer', payload: { sdp: 'fake-sdp', type: 'offer' } });
      expect(resPost.status).toBe(404);

      const resGet = await request(app)
        .get('/api/v1/appointments/apt-room-video-1/webrtc/signals')
        .set('Cookie', [`rt_auth_token=${user3AttackerToken}`]);
      expect(resGet.status).toBe(404);
    });

    it('Scenario 13: Valid participants can perform WebRTC signaling exchange (offer, answer, candidate, cleanup)', async () => {
      // 1. Reset signals
      await request(app)
        .post('/api/v1/appointments/apt-room-video-1/webrtc/reset')
        .set('Cookie', [`rt_auth_token=${user2CounselorToken}`]);

      // 2. Counselor sends WebRTC offer
      const offerPayload = { sdp: 'mock-counselor-sdp-offer-v1', type: 'offer' };
      const offerRes = await request(app)
        .post('/api/v1/appointments/apt-room-video-1/webrtc/signal')
        .set('Cookie', [`rt_auth_token=${user2CounselorToken}`])
        .send({ type: 'offer', payload: offerPayload });

      expect(offerRes.status).toBe(200);
      expect(offerRes.body.success).toBe(true);
      expect(offerRes.body.signalId).toBeDefined();

      // 3. Student receives the offer
      const studentSignals = await request(app)
        .get('/api/v1/appointments/apt-room-video-1/webrtc/signals')
        .set('Cookie', [`rt_auth_token=${user1ClientToken}`]);

      expect(studentSignals.status).toBe(200);
      expect(studentSignals.body.signals.length).toBe(1);
      expect(studentSignals.body.signals[0].type).toBe('offer');
      expect(studentSignals.body.signals[0].payload.sdp).toBe('mock-counselor-sdp-offer-v1');

      // 4. Student sends WebRTC answer
      const answerPayload = { sdp: 'mock-student-sdp-answer-v1', type: 'answer' };
      const answerRes = await request(app)
        .post('/api/v1/appointments/apt-room-video-1/webrtc/signal')
        .set('Cookie', [`rt_auth_token=${user1ClientToken}`])
        .send({ type: 'answer', payload: answerPayload });

      expect(answerRes.status).toBe(200);

      // 5. Counselor receives the answer
      const counselorSignals = await request(app)
        .get('/api/v1/appointments/apt-room-video-1/webrtc/signals')
        .set('Cookie', [`rt_auth_token=${user2CounselorToken}`]);

      expect(counselorSignals.status).toBe(200);
      expect(counselorSignals.body.signals.some((s: any) => s.type === 'answer')).toBe(true);

      // 6. ICE candidate exchange
      const candidatePayload = { candidate: 'candidate:1 1 UDP 2122252543 192.168.1.1 50000 typ host', sdpMid: '0', sdpMLineIndex: 0 };
      const candidateRes = await request(app)
        .post('/api/v1/appointments/apt-room-video-1/webrtc/signal')
        .set('Cookie', [`rt_auth_token=${user1ClientToken}`])
        .send({ type: 'candidate', payload: candidatePayload });

      expect(candidateRes.status).toBe(200);

      // 7. Presence ping and leave
      const pingRes = await request(app)
        .post('/api/v1/appointments/apt-room-video-1/room-presence')
        .set('Cookie', [`rt_auth_token=${user1ClientToken}`])
        .send({ isScreenSharing: false, networkQuality: 'good' });

      expect(pingRes.status).toBe(200);

      const leaveRes = await request(app)
        .post('/api/v1/appointments/apt-room-video-1/room-presence')
        .set('Cookie', [`rt_auth_token=${user1ClientToken}`])
        .send({ action: 'leave' });

      expect(leaveRes.status).toBe(200);
      expect(leaveRes.body.success).toBe(true);
    });

    it('Scenario 14: Valid participants can synchronize collaborative in-call notes', async () => {
      const updateRes = await request(app)
        .post('/api/v1/appointments/apt-room-video-1/in-call-notes')
        .set('Cookie', [`rt_auth_token=${user2CounselorToken}`])
        .send({ sharedContent: 'Rencana coping: Latihan pernapasan 4-7-8 setiap pagi.' });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.sharedContent).toContain('Latihan pernapasan 4-7-8');

      const fetchRes = await request(app)
        .get('/api/v1/appointments/apt-room-video-1/in-call-notes')
        .set('Cookie', [`rt_auth_token=${user1ClientToken}`]);

      expect(fetchRes.status).toBe(200);
      expect(fetchRes.body.data.sharedContent).toContain('Latihan pernapasan 4-7-8');
    });
  });
});
