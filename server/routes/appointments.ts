import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { serverDb, prisma } from '../database';
import { requireAuth, requireRole, normalizeRole } from '../middleware/auth';
import { verifyOfflineOwner } from '../middleware/offlineOwnership.js';
import { sanitizeInput } from '../security';
import { validatePagination, idempotencyMiddleware } from '../apiV1Helpers';
import { EventEmitter } from 'events';
import { getValidatedTurnConfig } from '../config/envValidation.js';
import { buildScheduledAppointmentTime, canJoinAppointmentRoom, isValidAppointmentStatusTransition } from '../services/appointmentRoomPolicy.js';
import {
  CreateAppointmentSchema as createAppointmentSchema,
  UpdateAppointmentSchema as updateAppointmentSchema,
  RescheduleAppointmentSchema as rescheduleAppointmentSchema
} from '../../shared/contracts/appointments.js';

export { createAppointmentSchema, updateAppointmentSchema, rescheduleAppointmentSchema };

const router = Router();

// EventEmitter for real-time appointment updates
export const appointmentEvents = new EventEmitter();

// --- SSE Endpoint for Real-time Status Transitions ---
router.get('/stream', requireAuth, (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // flush the headers to establish SSE

  // Function to send event
  const sendEvent = (data: any) => {
    // Only send if the update belongs to the user or if user is admin, etc.
    // Basic filter: Check if user is involved (as counselor or student)
    const role = normalizeRole(req.user?.role);
    const isStudentMatch = role === 'mahasiswa' && data.userId === req.user?.userId;
    const isCounselorMatch = role === 'konselor' && data.counselorUserId === req.user?.userId;
    const isAdmin = role === 'admin';

    if (isStudentMatch || isCounselorMatch || isAdmin) {
      res.write(`data: ${JSON.stringify({
        id: data.id,
        status: data.status,
        approvalStatus: data.approvalStatus,
        attendanceStatus: data.attendanceStatus,
        updatedAt: data.updatedAt
      })}\n\n`);
    }
  };

  appointmentEvents.on('update', sendEvent);

  req.on('close', () => {
    appointmentEvents.off('update', sendEvent);
  });
});

export interface AppointmentResponseDTO {
  id: string;
  counselorId: string;
  counselorName: string;
  date: string;
  time: string;
  timezone: 'WIB' | 'WITA' | 'WIT';
  notes?: string;
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'CANCELLED' | 'REJECTED' | 'COMPLETED';
  approvalStatus: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  attendanceStatus: 'SCHEDULED' | 'ATTENDED' | 'NO_SHOW' | 'CANCELLED' | 'RESCHEDULED';
  meetingLink?: string;
  mode: 'video_call' | 'in_person';
  createdAt: string;
  userId: string;
  studentName: string;
  studentNIM?: string;
  studentEmail?: string;
}

/**
 * Utility to parse local appointment date, time, and timezone into an absolute UTC Date object.
 * Handles WIB (+07:00), WITA (+08:00), and WIT (+09:00).
 */
export function parseAppointmentToUtcDate(dateStr: string, timeStr: string, timezoneStr: string = 'WIB'): Date {
  try {
    return buildScheduledAppointmentTime(dateStr, timeStr, timezoneStr);
  } catch {
    return new Date(Number.NaN);
  }
}

export function mapAppointmentToResponse(appt: any, redactPrivateDetails = false): AppointmentResponseDTO {
  return {
    id: appt.id,
    counselorId: appt.counselorId,
    counselorName: appt.counselorName,
    date: appt.date,
    time: appt.time,
    timezone: appt.timezone || 'WIB',
    ...(!redactPrivateDetails ? { notes: appt.notes || '' } : {}),
    status: appt.status,
    approvalStatus: appt.approvalStatus,
    attendanceStatus: appt.attendanceStatus,
    ...(!redactPrivateDetails ? { meetingLink: appt.meetingLink || '' } : {}),
    mode: appt.mode || 'video_call',
    createdAt: appt.createdAt,
    userId: appt.userId || '',
    studentName: appt.studentName || '',
    ...(!redactPrivateDetails ? { studentNIM: appt.studentNIM || '', studentEmail: appt.studentEmail || '' } : {}),
  };
}

const AvailabilityQuerySchema = z.object({
  counselorId: z.string({
    message: 'counselorId wajib diisi'
  }).min(1, 'counselorId tidak boleh kosong'),
  date: z.string({
    message: 'date wajib diisi'
  }).regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
});

// Middleware for strict Appointment & Room Access Authorization
export const verifyAppointmentAccess = async (req: Request, res: Response, next: () => void) => {
  try {
    const appointmentId = req.params.id || req.body.appointmentId;
    if (!appointmentId) {
      return res.status(400).json({ success: false, error: 'MISSING_APPOINTMENT_ID', message: 'ID Janji temu wajib diisi.' });
    }
    const appt = await serverDb.findAppointmentById(appointmentId);
    if (!appt) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Jadwal tidak ditemukan.' });
    }

    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Sesi tidak valid.' });
    }

    // Admin can manage records operationally, but room authorization is separately denied.
    const role = normalizeRole(user.role);
    if (role === 'admin') {
      (req as any).appointment = appt;
      return next();
    }

    // Mahasiswa must be the owner
    if (role === 'mahasiswa') {
      if (appt.userId !== user.userId) {
        console.warn('[APPOINTMENT_ROOM_ACCESS]', JSON.stringify({ appointmentId, userId: user.userId, role, allowed: false, reason: 'ROOM_ACCESS_NOT_PARTICIPANT', timestamp: new Date().toISOString() }));
        return res.status(404).json({
          success: false,
          error: 'ACCESS_DENIED',
          message: 'Akses ditolak. Anda tidak memiliki izin untuk sesi konsultasi ini.'
        });
      }
      (req as any).appointment = appt;
      return next();
    }

    // Counselor must be assigned to this appointment
    if (role === 'konselor') {
      const counselor = await prisma.counselors.findFirst({
        where: { userId: user.userId }
      });
      if (!counselor || appt.counselorId !== counselor.id) {
        console.warn('[APPOINTMENT_ROOM_ACCESS]', JSON.stringify({ appointmentId, userId: user.userId, role, allowed: false, reason: 'ROOM_ACCESS_NOT_PARTICIPANT', timestamp: new Date().toISOString() }));
        return res.status(404).json({
          success: false,
          error: 'ACCESS_DENIED',
          message: 'Akses ditolak. Anda tidak memiliki izin untuk sesi konsultasi ini.'
        });
      }
      (req as any).appointment = appt;
      return next();
    }

    return res.status(403).json({
      success: false,
      error: 'ACCESS_DENIED',
      message: 'Akses ditolak. Anda tidak memiliki izin untuk sesi konsultasi ini.'
    });
  } catch (err: any) {
    console.error('Error in verifyAppointmentAccess:', err);
    res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Gagal memverifikasi otorisasi janji temu.' });
  }
};

/** Recheck room policy on every room-related request; participant identity alone is insufficient. */
export const requireEligibleAppointmentRoom = (req: Request, res: Response, next: () => void) => {
  const appt = (req as any).appointment;
  const role = normalizeRole(req.user?.role);
  if (!appt || !req.user || !['mahasiswa', 'konselor'].includes(role)) {
    if (appt && req.user) console.warn('[APPOINTMENT_ROOM_ACCESS]', JSON.stringify({ appointmentId: appt.id, userId: req.user.userId, role, allowed: false, reason: 'ROOM_ACCESS_NOT_PARTICIPANT', timestamp: new Date().toISOString() }));
    return res.status(403).json({ success: false, allowed: false, error: 'ROOM_ACCESS_NOT_PARTICIPANT' });
  }
  const decision = canJoinAppointmentRoom(appt);
  if (decision.allowed === false) {
    console.warn('[APPOINTMENT_ROOM_ACCESS]', JSON.stringify({ appointmentId: appt.id, userId: req.user.userId, role, allowed: false, reason: decision.reason, timestamp: new Date().toISOString() }));
    return res.status(403).json({ success: false, allowed: false, error: decision.reason });
  }
  (req as any).roomWindow = decision.window;
  console.info('[APPOINTMENT_ROOM_ACCESS]', JSON.stringify({ appointmentId: appt.id, userId: req.user.userId, role, allowed: true, timestamp: decision.window.serverTime.toISOString() }));
  return next();
};

// Availability Check
router.get(['/availability', '/appointments/availability'], async (req: Request, res: Response) => {
  try {
    const parsed = AvailabilityQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        error: 'Parameter tidak valid.',
        details: parsed.error.issues.map(e => ({ path: e.path.join('.'), message: e.message }))
      });
    }

    const { counselorId, date } = parsed.data;
    const availability = await serverDb.getAppointmentAvailability(counselorId, date);
    res.json(availability);
  } catch (err: any) {
    console.error('Error checking availability:', err);
    res.status(500).json({ success: false, code: 'INTERNAL_SERVER_ERROR', error: 'Gagal memeriksa ketersediaan slot.' });
  }
});

// List Appointments
router.get(['/', '/db/appointments'], requireAuth, requireRole(['mahasiswa', 'konselor', 'admin']), async (req: Request, res: Response) => {
  try {
    await serverDb.logAudit(
      'READ_APPOINTMENTS',
      `User ${req.user!.name} (${req.user!.email}) dengan role ${req.user!.role} membaca daftar janji temu.`,
      req.user!.role
    );

    const { page, limit, offset } = validatePagination(req, 20);
    
    const andConditions: any[] = [];

    // Role-based data isolation with canonical mapping
    const role = normalizeRole(req.user!.role);
    if (role === 'mahasiswa') {
      andConditions.push({ userId: req.user!.userId });
    } else if (role === 'konselor') {
      const counselor = await prisma.counselors.findFirst({
        where: { userId: req.user!.userId }
      });
      if (!counselor) {
        return res.status(403).json({
          error: 'ACCESS_DENIED',
          message: 'Profil konselor tidak terdaftar atau belum terhubung dengan akun ini.'
        });
      }

      const requestedCounselorId = req.query.counselorId as string;
      if (requestedCounselorId && requestedCounselorId !== counselor.id) {
        return res.status(403).json({
          error: 'ACCESS_DENIED',
          message: 'Konselor tidak memiliki izin untuk mengakses data janji temu konselor lain.'
        });
      }
      
      andConditions.push({ counselorId: counselor.id });
    } else if (role === 'admin') {
      const counselorFilter = req.query.counselorId as string;
      if (counselorFilter && counselorFilter !== 'Semua') {
        andConditions.push({ counselorId: counselorFilter });
      }
      const userFilter = req.query.userId as string;
      if (userFilter) {
        andConditions.push({ userId: userFilter });
      }
    }

    // Filter by status (strictly scoped inside AND)
    const statusFilter = req.query.status as string;
    if (statusFilter && statusFilter !== 'Semua') {
      andConditions.push({
        OR: [
          { status: statusFilter },
          { approvalStatus: statusFilter }
        ]
      });
    }

    // Filter by approvalStatus if explicitly specified
    const approvalStatusFilter = req.query.approvalStatus as string;
    if (approvalStatusFilter && approvalStatusFilter !== 'Semua') {
      andConditions.push({ approvalStatus: approvalStatusFilter });
    }

    // Filter by date
    const dateFilter = req.query.date as string;
    if (dateFilter) {
      const startOfDay = new Date(`${dateFilter}T00:00:00+07:00`);
      const endOfDay = new Date(`${dateFilter}T23:59:59.999+07:00`);
      andConditions.push({
        scheduledAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      });
    }

    // Search query
    const searchQuery = (req.query.search as string || '').toLowerCase().trim();
    if (searchQuery) {
      andConditions.push({
        OR: [
          { studentName: { contains: searchQuery } },
          { studentNIM: { contains: searchQuery } },
          { counselorName: { contains: searchQuery } }
        ]
      });
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {};

    const total = await prisma.appointments.count({ where });
    
    const appointmentsData = await prisma.appointments.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    res.setHeader('X-Total-Count', total);
    res.setHeader('X-Page', page);
    res.setHeader('X-Limit', limit.toString());
    res.setHeader('X-Total-Pages', Math.ceil(total / Math.max(limit, 1)));

    const redactPrivateDetails = normalizeRole(req.user!.role) === 'admin';
    const responseData = appointmentsData.map(appointment => mapAppointmentToResponse(appointment, redactPrivateDetails));

    if (req.query.format === 'object') {
      return res.json({
        data: responseData,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / Math.max(limit, 1)),
        requestId: (req as any).requestId
      });
    }
    res.json(responseData);
  } catch (err: any) {
    console.error('Error fetching appointments:', err);
    res.status(500).json({ error: 'Gagal mengambil data jadwal dari database.' });
  }
});

// Single Appointment by ID with Access Verification
router.get(['/:id', '/db/appointments/:id'], requireAuth, verifyAppointmentAccess, async (req: Request, res: Response) => {
  try {
    const appt = (req as any).appointment;
    res.json({ success: true, record: mapAppointmentToResponse(appt, normalizeRole(req.user!.role) === 'admin') });
  } catch (err: any) {
    console.error('Error fetching appointment by ID:', err);
    res.status(500).json({ error: 'Gagal mengambil data janji temu.' });
  }
});

// Video Consultation Room Access Verification
router.get(['/:id/room-access', '/db/appointments/:id/room-access'], requireAuth, verifyAppointmentAccess, requireEligibleAppointmentRoom, async (req: Request, res: Response) => {
  try {
    const appt = (req as any).appointment;
    
    const window = (req as any).roomWindow;

    res.json({
      success: true,
      allowed: true,
      appointmentId: appt.id,
      serverTime: window.serverTime.toISOString(),
      scheduledStart: window.scheduledStart.toISOString(),
      scheduledEnd: window.scheduledEnd.toISOString(),
      earliestJoinAt: window.earliestJoinAt.toISOString(),
      latestJoinAt: window.latestJoinAt.toISOString(),
      role: normalizeRole(req.user!.role) as 'mahasiswa' | 'konselor'
    });
  } catch (err: any) {
    console.error('Error validating room access:', err);
    res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Gagal memvalidasi izin akses room.' });
  }
});

// GET /api/appointments/:id/ice-servers secured by verifyAppointmentAccess
router.get(['/:id/ice-servers', '/db/appointments/:id/ice-servers'], requireAuth, verifyAppointmentAccess, requireEligibleAppointmentRoom, async (req: Request, res: Response) => {
  try {
    const iceServers: Array<{ urls: string; username?: string; credential?: string }> = [
      { urls: "stun:stun.l.google.com:19302" }
    ];

    const turnConfig = getValidatedTurnConfig();
    if (turnConfig?.url && turnConfig.username && turnConfig.credential) {
      iceServers.push({
        urls: turnConfig.url,
        username: turnConfig.username,
        credential: turnConfig.credential
      });
    }

    res.json({
      success: true,
      iceServers
    });
  } catch (err: any) {
    console.error('Error fetching ICE server configuration');
    res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Gagal mengambil konfigurasi ICE/TURN.' });
  }
});

// Create Appointment
router.post(['/', '/db/appointments'], requireAuth, requireRole(['mahasiswa', 'konselor', 'admin']), verifyOfflineOwner, idempotencyMiddleware({
  projectResponse: (body) => {
    if (!body || typeof body !== 'object') return { success: true };
    const response = body as { record?: Record<string, unknown> };
    const record = response.record;
    if (!record) return { success: true };
    const safeRecord = Object.fromEntries([
      'id', 'counselorId', 'counselorName', 'date', 'time', 'timezone', 'mode',
      'status', 'approvalStatus', 'attendanceStatus', 'createdAt',
    ].flatMap(key => key in record ? [[key, record[key]]] : []));
    return { success: true, record: safeRecord };
  },
}), async (req: Request, res: Response) => {
  try {
    const parsed = createAppointmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validasi gagal.',
        details: parsed.error.issues.map(e => ({ path: e.path.join('.'), message: e.message }))
      });
    }

    const validated = parsed.data;
    const role = normalizeRole(req.user!.role);
    if (role === 'konselor') {
      return res.status(403).json({
        success: false,
        error: 'ACCESS_DENIED',
        message: 'Janji temu harus diajukan mahasiswa atau dibuat oleh administrator; konselor tidak dapat membuat penugasan untuk dirinya sendiri.'
      });
    }
    const isMahasiswa = role === 'mahasiswa';
    const finalUserId = isMahasiswa ? req.user!.userId : (validated.userId || req.user!.userId);
    const finalStudentName = isMahasiswa ? req.user!.name : (validated.studentName || 'Mahasiswa');
    const finalStudentEmail = isMahasiswa ? req.user!.email : (validated.studentEmail || '');
    const finalStudentNIM = isMahasiswa ? (req.body.studentNIM || '') : (validated.studentNIM || '');

    const record = await serverDb.addAppointment({
      counselorId: validated.counselorId,
      counselorName: validated.counselorName,
      date: validated.date,
      time: validated.time,
      timezone: validated.timezone || 'WIB',
      mode: validated.mode || 'video_call',
      notes: sanitizeInput(validated.notes || '', 300),
      status: 'PENDING',
      approvalStatus: 'PENDING_APPROVAL',
      attendanceStatus: 'SCHEDULED',
      meetingLink: validated.meetingLink || '',
      userId: finalUserId,
      studentName: sanitizeInput(finalStudentName, 100),
      studentNIM: sanitizeInput(finalStudentNIM, 30),
      studentEmail: sanitizeInput(finalStudentEmail, 100)
    });

    res.json({ success: true, record: mapAppointmentToResponse(record, role === 'admin') });
  } catch (err: any) {
    if (err.message === 'SLOT_ALREADY_BOOKED' || err.code === 'P2034') {
      return res.status(409).json({
        error: 'Jadwal bentrok! Slot pada tanggal dan jam tersebut sudah dipesan oleh mahasiswa lain. Silakan pilih waktu yang berbeda.'
      });
    }
    if (err.message === 'INVALID_APPOINTMENT_DATETIME') return res.status(400).json({ success: false, error: err.message });
    // Avoid logging request fields or ORM error details that may echo private notes.
    console.error('[APPOINTMENT] CREATE_APPOINTMENT_FAILED');
    res.status(500).json({ error: 'Gagal menyimpan jadwal ke database.' });
  }
});

// Update Appointment
router.put(['/:id', '/db/appointments/:id'], requireAuth, verifyAppointmentAccess, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const appt = await serverDb.findAppointmentById(id);
    if (!appt) {
      return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
    }

    const role = normalizeRole(req.user!.role);
    if (role === 'mahasiswa') {
      if (appt.userId !== req.user!.userId) {
        return res.status(403).json({
          error: 'ACCESS_DENIED',
          message: 'Akses ditolak. Anda hanya diperbolehkan mengubah jadwal milik Anda sendiri.'
        });
      }
    } else if (role === 'konselor') {
      const counselor = await prisma.counselors.findFirst({
        where: { userId: req.user!.userId }
      });
      if (!counselor || appt.counselorId !== counselor.id) {
        return res.status(403).json({
          error: 'ACCESS_DENIED',
          message: 'Akses ditolak. Konselor hanya diizinkan mengelola janji temu yang ditugaskan kepada dirinya.'
        });
      }
    }

    const parsed = updateAppointmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validasi gagal.',
        details: parsed.error.issues.map(e => ({ path: e.path.join('.'), message: e.message }))
      });
    }

    const validated = parsed.data;
    if (validated.status && !isValidAppointmentStatusTransition(appt.status, validated.status)) {
      return res.status(409).json({ success: false, error: 'INVALID_APPOINTMENT_STATUS_TRANSITION' });
    }
    if (validated.approvalStatus !== undefined) {
      return res.status(400).json({ success: false, error: 'APPROVAL_STATUS_DERIVED_FROM_APPOINTMENT_STATUS' });
    }
    if (validated.attendanceStatus !== undefined && validated.status !== 'COMPLETED' && validated.status !== 'CANCELLED') {
      return res.status(400).json({ success: false, error: 'ATTENDANCE_STATUS_DERIVED_FROM_APPOINTMENT_STATUS' });
    }
    if (role === 'mahasiswa' && validated.status && validated.status !== 'CANCELLED') {
      return res.status(403).json({ success: false, error: 'STATUS_UPDATE_FORBIDDEN' });
    }
    if (validated.status === 'IN_PROGRESS') {
      if (role !== 'konselor' || appt.approvalStatus !== 'APPROVED') {
        return res.status(403).json({ success: false, error: 'SESSION_START_FORBIDDEN' });
      }
      const roomDecision = canJoinAppointmentRoom(appt);
      if (roomDecision.allowed === false) {
        return res.status(409).json({ success: false, error: 'SESSION_START_NOT_AVAILABLE', reason: roomDecision.reason });
      }
    }
    if (validated.status === 'COMPLETED' && role !== 'konselor') {
      return res.status(403).json({ success: false, error: 'SESSION_COMPLETION_FORBIDDEN' });
    }
    const updates: any = {};

    // FIELD-LEVEL AUTHORIZATION ENFORCEMENT
    if (role === 'mahasiswa') {
      // Mahasiswa can cancel or update notes/mode while still pending
      if (validated.status !== undefined) {
        const s = validated.status.toUpperCase();
        if (s === 'CANCELLED') {
          updates.status = 'CANCELLED';
          updates.attendanceStatus = 'CANCELLED';
        }
      }
      if (appt.status === 'PENDING') {
        if (validated.notes !== undefined) updates.notes = sanitizeInput(validated.notes, 300);
        if (validated.mode !== undefined) updates.mode = validated.mode;
      }
    } else if (role === 'konselor') {
      // Counselor can update status, approvalStatus, attendanceStatus, meetingLink, notes
      // REASSIGNMENT (counselorId/counselorName), changing student details, or rescheduling date/time is FORBIDDEN for counselor
      if (validated.status !== undefined) {
        updates.status = validated.status;
        if (validated.status === 'CONFIRMED') {
          updates.approvalStatus = 'APPROVED';
        } else if (validated.status === 'REJECTED') {
          updates.approvalStatus = 'REJECTED';
        } else if (validated.status === 'CANCELLED') {
          updates.attendanceStatus = 'CANCELLED';
        } else if (validated.status === 'COMPLETED') {
          updates.attendanceStatus = 'ATTENDED';
        }
      }
      if (validated.meetingLink !== undefined) updates.meetingLink = validated.meetingLink;
      if (validated.notes !== undefined) updates.notes = sanitizeInput(validated.notes, 300);
      if (validated.mode !== undefined) updates.mode = validated.mode;
    } else if (role === 'admin') {
      // Admin manages scheduling and assignments; private clinical fields remain counselor-only.
      if (validated.counselorId !== undefined) updates.counselorId = validated.counselorId;
      if (validated.counselorName !== undefined) updates.counselorName = validated.counselorName;
      if (validated.date !== undefined) updates.date = validated.date;
      if (validated.time !== undefined) updates.time = validated.time;
      if (validated.timezone !== undefined) updates.timezone = validated.timezone;
      if (validated.mode !== undefined) updates.mode = validated.mode;
      if (validated.status !== undefined) {
        updates.status = validated.status;
        if (validated.status === 'CONFIRMED') {
          updates.approvalStatus = 'APPROVED';
        } else if (validated.status === 'REJECTED') {
          updates.approvalStatus = 'REJECTED';
        } else if (validated.status === 'CANCELLED') {
          updates.attendanceStatus = 'CANCELLED';
        } else if (validated.status === 'COMPLETED') {
          updates.attendanceStatus = 'ATTENDED';
        }
      }
    }

    const record = await serverDb.updateAppointment(id, updates, appt.status);
    if (!record) {
      return res.status(409).json({ success: false, error: 'APPOINTMENT_STATUS_CONFLICT' });
    }
    if (record.status !== appt.status || record.approvalStatus !== appt.approvalStatus || record.attendanceStatus !== appt.attendanceStatus) {
      clearAppointmentRoomState(id);
    }
    
    // Emit event for SSE
    // Need to get counselor user ID to filter SSE properly
    let counselorUserId = '';
    const counselorProfile = await prisma.counselors.findUnique({ where: { id: record.counselorId } });
    if (counselorProfile && counselorProfile.userId) {
      counselorUserId = counselorProfile.userId;
    }
    appointmentEvents.emit('update', {
      id: record.id,
      appointmentId: record.id,
      userId: record.userId,
      counselorUserId,
      status: record.status,
      approvalStatus: record.approvalStatus,
      attendanceStatus: record.attendanceStatus,
      updatedAt: new Date().toISOString()
    });

    res.json({ success: true, record: mapAppointmentToResponse(record) });
  } catch (err: any) {
    if (err.message === 'APPOINTMENT_STATUS_CONFLICT') {
      return res.status(409).json({ success: false, error: 'APPOINTMENT_STATUS_CONFLICT' });
    }
    if (err.message === 'SLOT_ALREADY_BOOKED') {
      return res.status(409).json({
        error: 'Jadwal bentrok! Slot pada tanggal dan jam tersebut sudah terisi oleh jadwal lain.'
      });
    }
    if (err.code === 'P2034') {
      return res.status(409).json({ success: false, error: 'APPOINTMENT_CONCURRENT_UPDATE' });
    }
    if (err.message === 'INVALID_APPOINTMENT_DATETIME') return res.status(400).json({ success: false, error: err.message });
    console.error('Error updating appointment:', err);
    res.status(500).json({ error: 'Gagal memperbarui jadwal.' });
  }
});

// Delete Appointment
router.delete(['/:id', '/db/appointments/:id'], requireAuth, verifyAppointmentAccess, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const appt = await serverDb.findAppointmentById(id);
    if (!appt) {
      return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
    }

    const role = normalizeRole(req.user!.role);
    if (role === 'mahasiswa') {
      if (appt.userId !== req.user!.userId) {
        return res.status(403).json({
          error: 'ACCESS_DENIED',
          message: 'Akses ditolak. Anda hanya diperbolehkan membatalkan jadwal milik Anda sendiri.'
        });
      }
    } else if (role === 'konselor') {
      const counselor = await prisma.counselors.findFirst({
        where: { userId: req.user!.userId }
      });
      if (!counselor || appt.counselorId !== counselor.id) {
        return res.status(403).json({
          error: 'ACCESS_DENIED',
          message: 'Akses ditolak. Konselor hanya diizinkan menghapus/membatalkan janji temu yang ditugaskan kepada dirinya.'
        });
      }
    }

    const success = await serverDb.deleteAppointment(id);
    if (success) clearAppointmentRoomState(id);
    res.json({ success });
  } catch (err: any) {
    console.error('Error deleting appointment:', err);
    res.status(500).json({ error: 'Gagal menghapus jadwal.' });
  }
});

// Reschedule Appointment
router.post(['/:id/reschedule', '/db/appointments/:id/reschedule'], requireAuth, verifyAppointmentAccess, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const appt = await serverDb.findAppointmentById(id);
    if (!appt) {
      return res.status(404).json({ success: false, error: 'Jadwal tidak ditemukan.' });
    }

    // Rescheduling is a normal pending/confirmed workflow; terminal or active sessions are immutable.
    if (['CANCELLED', 'REJECTED', 'COMPLETED', 'IN_PROGRESS'].includes(appt.status) || appt.attendanceStatus === 'ATTENDED') {
      return res.status(400).json({ success: false, error: 'APPOINTMENT_CANNOT_BE_RESCHEDULED' });
    }

    // Role-based authorization
    const role = normalizeRole(req.user!.role);
    if (role === 'mahasiswa') {
      if (appt.userId !== req.user!.userId) {
        return res.status(403).json({
          success: false,
          error: 'Akses ditolak. Anda hanya diperbolehkan menjadwal ulang janji temu milik Anda sendiri.'
        });
      }
    } else if (role === 'konselor') {
      const counselor = await prisma.counselors.findFirst({
        where: { userId: req.user!.userId }
      });
      if (!counselor || appt.counselorId !== counselor.id) {
        return res.status(403).json({
          success: false,
          error: 'Akses ditolak. Konselor hanya dapat menjadwal ulang janji temu yang ditugaskan kepada dirinya.'
        });
      }
    }

    const parsed = rescheduleAppointmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Validasi gagal.',
        details: parsed.error.issues.map(e => ({ path: e.path.join('.'), message: e.message }))
      });
    }

    const { date, time, timezone, reason } = parsed.data;

    // Validate future/today date (reject past dates)
    const today = new Date().toISOString().split('T')[0];
    if (date < today) {
      return res.status(400).json({
        success: false,
        error: 'Tanggal jadwal baru tidak boleh di masa lalu.'
      });
    }

    let updatedNotes = appt.notes || '';
    if (reason) {
      const sanitizedReason = sanitizeInput(reason, 300);
      updatedNotes = updatedNotes 
        ? `${updatedNotes} | Rescheduled: ${sanitizedReason}` 
        : `Rescheduled: ${sanitizedReason}`;
    }

    const record = await serverDb.updateAppointment(id, {
      date,
      time,
      ...(timezone ? { timezone } : {}),
      attendanceStatus: 'RESCHEDULED',
      status: 'PENDING',
      approvalStatus: 'PENDING_APPROVAL',
      notes: updatedNotes
    }, appt.status);

    if (!record) {
      return res.status(404).json({ success: false, error: 'Jadwal gagal dijadwalkan ulang.' });
    }
    clearAppointmentRoomState(id);

    // Emit event for SSE
    let counselorUserId = '';
    const counselorProfile = await prisma.counselors.findUnique({ where: { id: record.counselorId } });
    if (counselorProfile && counselorProfile.userId) {
      counselorUserId = counselorProfile.userId;
    }
    appointmentEvents.emit('update', {
      id: record.id,
      appointmentId: record.id,
      userId: record.userId,
      counselorUserId,
      status: record.status,
      approvalStatus: record.approvalStatus,
      attendanceStatus: record.attendanceStatus,
      updatedAt: new Date().toISOString()
    });

    res.json({ success: true, record: mapAppointmentToResponse(record, role === 'admin'), message: 'Jadwal janji temu berhasil dijadwalkan ulang.' });
  } catch (err: any) {
    if (err.message === 'APPOINTMENT_STATUS_CONFLICT') {
      return res.status(409).json({ success: false, error: 'APPOINTMENT_STATUS_CONFLICT' });
    }
    if (err.message === 'SLOT_ALREADY_BOOKED') {
      return res.status(409).json({
        success: false,
        error: 'Jadwal bentrok! Slot pada tanggal dan jam baru tersebut sudah terisi oleh jadwal lain.'
      });
    }
    if (err.code === 'P2034') {
      return res.status(409).json({ success: false, error: 'APPOINTMENT_CONCURRENT_UPDATE' });
    }
    if (err.message === 'INVALID_APPOINTMENT_DATETIME') return res.status(400).json({ success: false, error: err.message });
    console.error('Error rescheduling appointment:', err);
    res.status(500).json({ success: false, error: 'Gagal menjadwalkan ulang janji temu.' });
  }
});

// ============================================================================
// REAL-TIME VIDEO ROOM SIGNALING & IN-CALL COLLABORATION
// ============================================================================

export interface RoomParticipant {
  userId: string;
  role: 'mahasiswa' | 'konselor' | 'admin';
  name: string;
  isScreenSharing: boolean;
  networkQuality: 'good' | 'poor';
  joinedAt: string;
  lastPing: number;
}

export interface InCallNote {
  appointmentId: string;
  sharedContent: string;
  lastUpdatedBy: string;
  updatedAt: string;
}

export interface WebRtcSignalMessage {
  id: string;
  appointmentId: string;
  senderId: string;
  senderRole: string;
  type: 'offer' | 'answer' | 'candidate' | 'hangup' | 'screen-state' | 'leave';
  payload: any;
  timestamp: number;
}

const activeRoomPresences = new Map<string, Map<string, RoomParticipant>>();
const activeInCallNotes = new Map<string, InCallNote>();
const activeRoomSignals = new Map<string, WebRtcSignalMessage[]>();

function clearAppointmentRoomState(appointmentId: string): void {
  activeRoomPresences.delete(appointmentId);
  activeRoomSignals.delete(appointmentId);
  activeInCallNotes.delete(appointmentId);
}

// Clean up stale participants (no ping for > 30s) and expired signals (> 2 mins)
setInterval(() => {
  const now = Date.now();
  for (const [roomId, participants] of activeRoomPresences.entries()) {
    for (const [userId, participant] of participants.entries()) {
      if (now - participant.lastPing > 35000) {
        participants.delete(userId);
      }
    }
    if (participants.size === 0) {
      activeRoomPresences.delete(roomId);
    }
  }

  const signalCutoff = now - 120000;
  for (const [roomId, signals] of activeRoomSignals.entries()) {
    const filtered = signals.filter(s => s.timestamp > signalCutoff);
    if (filtered.length === 0) {
      activeRoomSignals.delete(roomId);
    } else {
      activeRoomSignals.set(roomId, filtered);
    }
  }
}, 15000);

// GET /api/v1/appointments/:id/room-presence
router.get(['/:id/room-presence', '/db/appointments/:id/room-presence'], requireAuth, verifyAppointmentAccess, requireEligibleAppointmentRoom, async (req: Request, res: Response) => {
  try {
    const appointmentId = req.params.id;
    const roomMap = activeRoomPresences.get(appointmentId) || new Map<string, RoomParticipant>();
    const participants = Array.from(roomMap.values());
    
    // Check if counselor and student are connected
    const hasCounselor = participants.some(p => p.role === 'konselor');
    const hasStudent = participants.some(p => p.role === 'mahasiswa');
    const activeScreenSharer = participants.find(p => p.isScreenSharing);

    let statusText = 'Menunggu peserta terhubung...';
    if (hasCounselor && hasStudent) {
      statusText = 'Konselor dan Mahasiswa terhubung';
    } else if (hasCounselor) {
      statusText = 'Konselor telah berada di ruangan';
    } else if (hasStudent) {
      statusText = 'Mahasiswa menunggu di ruangan';
    }

    res.json({
      success: true,
      data: {
        appointmentId,
        participants,
        participantCount: participants.length,
        hasCounselor,
        hasStudent,
        statusText,
        activeScreenSharer: activeScreenSharer ? { userId: activeScreenSharer.userId, name: activeScreenSharer.name } : null
      }
    });
  } catch (err) {
    console.error('Error fetching room presence:', err);
    res.status(500).json({ success: false, error: 'Gagal mengambil status ruangan' });
  }
});

// POST /api/v1/appointments/:id/room-presence (Heartbeat / Status update)
router.post(['/:id/room-presence', '/db/appointments/:id/room-presence'], requireAuth, verifyAppointmentAccess, requireEligibleAppointmentRoom, async (req: Request, res: Response) => {
  try {
    const appointmentId = req.params.id;
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { isScreenSharing = false, networkQuality = 'good', action = 'ping' } = req.body;

    let roomMap = activeRoomPresences.get(appointmentId);
    if (!roomMap) {
      roomMap = new Map<string, RoomParticipant>();
      activeRoomPresences.set(appointmentId, roomMap);
    }

    if (action === 'leave') {
      roomMap.delete(user.userId);
      return res.json({ success: true, message: 'Berhasil keluar dari ruangan' });
    }

    const participant: RoomParticipant = {
      userId: user.userId,
      role: (user.role as any) || 'mahasiswa',
      name: user.name || (user.role === 'konselor' ? 'Konselor' : 'Mahasiswa'),
      isScreenSharing: !!isScreenSharing,
      networkQuality: networkQuality === 'poor' ? 'poor' : 'good',
      joinedAt: roomMap.get(user.userId)?.joinedAt || new Date().toISOString(),
      lastPing: Date.now()
    };

    roomMap.set(user.userId, participant);

    res.json({
      success: true,
      participant,
      participantCount: roomMap.size
    });
  } catch (err) {
    console.error('Error updating room presence:', err);
    res.status(500).json({ success: false, error: 'Gagal memperbarui status ruangan' });
  }
});

// WebRTC Signaling: POST Signal
router.post(['/:id/webrtc/signal', '/db/appointments/:id/webrtc/signal', '/:id/signal', '/db/appointments/:id/signal'], requireAuth, verifyAppointmentAccess, requireEligibleAppointmentRoom, async (req: Request, res: Response) => {
  try {
    const appointmentId = req.params.id;
    const user = req.user!;
    const signalSchema = z.object({
      type: z.enum(['offer', 'answer', 'candidate', 'hangup', 'screen-state', 'leave']),
      payload: z.record(z.string(), z.unknown()).optional()
    }).strict();
    const parsedSignal = signalSchema.safeParse(req.body);
    if (!parsedSignal.success || JSON.stringify(parsedSignal.data?.payload || {}).length > 32_000) {
      return res.status(400).json({ success: false, error: 'INVALID_SIGNAL_PAYLOAD' });
    }
    const { type, payload } = parsedSignal.data;

    let signals = activeRoomSignals.get(appointmentId);
    if (!signals) {
      signals = [];
      activeRoomSignals.set(appointmentId, signals);
    }

    const newSignal: WebRtcSignalMessage = {
      id: `sig_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      appointmentId,
      senderId: user.userId,
      senderRole: user.role,
      type,
      payload: payload || {},
      timestamp: Date.now()
    };

    signals.push(newSignal);
    if (signals.length > 100) {
      signals.splice(0, signals.length - 100);
    }

    res.json({
      success: true,
      signalId: newSignal.id,
      timestamp: newSignal.timestamp
    });
  } catch (err) {
    console.error('Error posting WebRTC signal:', err);
    res.status(500).json({ success: false, error: 'Gagal mengirim sinyal WebRTC' });
  }
});

// WebRTC Signaling: GET Signals
router.get(['/:id/webrtc/signals', '/db/appointments/:id/webrtc/signals', '/:id/signals', '/db/appointments/:id/signals'], requireAuth, verifyAppointmentAccess, requireEligibleAppointmentRoom, async (req: Request, res: Response) => {
  try {
    const appointmentId = req.params.id;
    const user = req.user!;
    const since = Number(req.query.since || 0);

    const signals = activeRoomSignals.get(appointmentId) || [];
    const pendingSignals = signals.filter(s => s.senderId !== user.userId && s.timestamp > since);

    res.json({
      success: true,
      signals: pendingSignals,
      serverTime: Date.now()
    });
  } catch (err) {
    console.error('Error getting WebRTC signals:', err);
    res.status(500).json({ success: false, error: 'Gagal mengambil sinyal WebRTC' });
  }
});

// WebRTC Signaling: Reset room signals
router.post(['/:id/webrtc/reset', '/db/appointments/:id/webrtc/reset'], requireAuth, verifyAppointmentAccess, requireEligibleAppointmentRoom, async (req: Request, res: Response) => {
  try {
    const appointmentId = req.params.id;
    activeRoomSignals.delete(appointmentId);
    res.json({ success: true, message: 'Ruang sinyal WebRTC direset.' });
  } catch (err) {
    console.error('Error resetting WebRTC signals:', err);
    res.status(500).json({ success: false, error: 'Gagal mereset sinyal WebRTC' });
  }
});

// GET /api/v1/appointments/:id/in-call-notes
router.get(['/:id/in-call-notes', '/db/appointments/:id/in-call-notes'], requireAuth, verifyAppointmentAccess, requireEligibleAppointmentRoom, async (req: Request, res: Response) => {
  try {
    const appointmentId = req.params.id;
    const existing = activeInCallNotes.get(appointmentId) || {
      appointmentId,
      sharedContent: '',
      lastUpdatedBy: 'Sistem',
      updatedAt: new Date().toISOString()
    };

    res.json({ success: true, data: existing });
  } catch (err) {
    console.error('Error fetching in-call notes:', err);
    res.status(500).json({ success: false, error: 'Gagal mengambil catatan in-call' });
  }
});

// POST /api/v1/appointments/:id/in-call-notes
router.post(['/:id/in-call-notes', '/db/appointments/:id/in-call-notes'], requireAuth, verifyAppointmentAccess, requireEligibleAppointmentRoom, async (req: Request, res: Response) => {
  try {
    const appointmentId = req.params.id;
    const user = req.user;
    const { sharedContent = '' } = req.body;

    const updatedNote: InCallNote = {
      appointmentId,
      sharedContent: sanitizeInput(sharedContent),
      lastUpdatedBy: user?.name || (user?.role === 'konselor' ? 'Konselor' : 'Mahasiswa'),
      updatedAt: new Date().toISOString()
    };

    activeInCallNotes.set(appointmentId, updatedNote);

    res.json({ success: true, data: updatedNote });
  } catch (err) {
    console.error('Error updating in-call notes:', err);
    res.status(500).json({ success: false, error: 'Gagal menyimpan catatan in-call' });
  }
});

export default router;
