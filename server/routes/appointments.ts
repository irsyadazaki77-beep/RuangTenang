import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { serverDb, prisma } from '../database';
import { requireAuth } from '../middleware/auth';
import { sanitizeInput } from '../security';
import { validatePagination, idempotencyMiddleware } from '../apiV1Helpers';

const router = Router();

export const createAppointmentSchema = z.object({
  counselorId: z.string().max(100).optional(),
  counselorName: z.string().min(2, 'Nama konselor minimal 2 karakter').max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid (YYYY-MM-DD)'),
  time: z.string().min(2, 'Format jam tidak valid').max(50),
  timezone: z.enum(['WIB', 'WITA', 'WIT']).optional(),
  mode: z.enum(['video_call', 'in_person', 'tele_counseling']).optional(),
  notes: z.string().max(500).optional(),
  userId: z.string().max(100).optional(),
  studentName: z.string().max(100).optional(),
  studentNIM: z.string().max(30).optional(),
  studentEmail: z.string().email().optional().or(z.literal('')),
}).strict();

export const updateAppointmentSchema = z.object({
  counselorId: z.string().max(100).optional(),
  counselorName: z.string().max(100).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid (YYYY-MM-DD)').optional(),
  time: z.string().max(50).optional(),
  timezone: z.enum(['WIB', 'WITA', 'WIT']).optional(),
  mode: z.enum(['video_call', 'in_person', 'tele_counseling']).optional(),
  notes: z.string().max(500).optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'REJECTED', 'Selesai', 'requested', 'confirmed', 'completed', 'cancelled']).optional(),
  approvalStatus: z.enum(['PENDING_APPROVAL', 'APPROVED', 'REJECTED']).optional(),
  attendanceStatus: z.enum(['SCHEDULED', 'ATTENDED', 'NO_SHOW', 'CANCELLED', 'RESCHEDULED']).optional(),
  meetingLink: z.string().max(255).optional(),
  studentName: z.string().max(100).optional(),
  studentNIM: z.string().max(30).optional(),
  studentEmail: z.string().email().optional().or(z.literal('')).optional(),
}).strict();

export interface AppointmentResponseDTO {
  id: string;
  counselorId: string;
  counselorName: string;
  date: string;
  time: string;
  timezone: 'WIB' | 'WITA' | 'WIT';
  notes?: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'Selesai';
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

export function mapAppointmentToResponse(appt: any): AppointmentResponseDTO {
  return {
    id: appt.id,
    counselorId: appt.counselorId,
    counselorName: appt.counselorName,
    date: appt.date,
    time: appt.time,
    timezone: appt.timezone || 'WIB',
    notes: appt.notes || '',
    status: appt.status,
    approvalStatus: appt.approvalStatus,
    attendanceStatus: appt.attendanceStatus,
    meetingLink: appt.meetingLink || '',
    mode: appt.mode || 'video_call',
    createdAt: appt.createdAt,
    userId: appt.userId || '',
    studentName: appt.studentName || '',
    studentNIM: appt.studentNIM || '',
    studentEmail: appt.studentEmail || '',
  };
}

// Availability Check
router.get(['/availability', '/appointments/availability'], async (req: Request, res: Response) => {
  try {
    const counselorId = (req.query.counselorId as string) || 'cons-1';
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

    const availability = await serverDb.getAppointmentAvailability(counselorId, date);
    res.json(availability);
  } catch (err: any) {
    console.error('Error checking availability:', err);
    res.status(500).json({ error: 'Gagal memeriksa ketersediaan slot.' });
  }
});

// List Appointments
router.get(['/', '/db/appointments'], requireAuth, async (req: Request, res: Response) => {
  try {
    await serverDb.logAudit(
      'READ_APPOINTMENTS',
      `User ${req.user!.name} (${req.user!.email}) dengan role ${req.user!.role} membaca daftar janji temu.`,
      req.user!.role
    );

    const { page, limit, offset } = validatePagination(req, 20);
    
    const andConditions: any[] = [];

    // Role-based data isolation with canonical mapping
    if (req.user!.role === 'mahasiswa') {
      andConditions.push({ userId: req.user!.userId });
    } else if (req.user!.role === 'konselor') {
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
    } else if (req.user!.role === 'admin') {
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
      andConditions.push({ date: dateFilter });
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

    const responseData = appointmentsData.map(mapAppointmentToResponse);

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

// Create Appointment
router.post(['/', '/db/appointments'], requireAuth, idempotencyMiddleware, async (req: Request, res: Response) => {
  try {
    const parsed = createAppointmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validasi gagal.',
        details: parsed.error.issues.map(e => ({ path: e.path.join('.'), message: e.message }))
      });
    }

    const validated = parsed.data;
    const isMahasiswa = req.user!.role === 'mahasiswa';
    const finalUserId = isMahasiswa ? req.user!.userId : (validated.userId || req.user!.userId);
    const finalStudentName = isMahasiswa ? req.user!.name : (validated.studentName || 'Mahasiswa');
    const finalStudentEmail = isMahasiswa ? req.user!.email : (validated.studentEmail || '');
    const finalStudentNIM = isMahasiswa ? (req.body.studentNIM || '') : (validated.studentNIM || '');

    const record = await serverDb.addAppointment({
      counselorId: validated.counselorId || 'cons-1',
      counselorName: validated.counselorName,
      date: validated.date,
      time: validated.time,
      timezone: validated.timezone || 'WIB',
      mode: validated.mode || 'video_call',
      notes: sanitizeInput(validated.notes || '', 300),
      status: 'PENDING',
      approvalStatus: 'PENDING_APPROVAL',
      attendanceStatus: 'SCHEDULED',
      meetingLink: `https://meet.jit.si/ruangtenang-session-${Date.now().toString().slice(-6)}`,
      userId: finalUserId,
      studentName: sanitizeInput(finalStudentName, 100),
      studentNIM: sanitizeInput(finalStudentNIM, 30),
      studentEmail: sanitizeInput(finalStudentEmail, 100)
    });

    res.json({ success: true, record: mapAppointmentToResponse(record) });
  } catch (err: any) {
    if (err.message === 'SLOT_ALREADY_BOOKED') {
      return res.status(409).json({
        error: 'Jadwal bentrok! Slot pada tanggal dan jam tersebut sudah dipesan oleh mahasiswa lain. Silakan pilih waktu yang berbeda.'
      });
    }
    console.error('Error creating appointment:', err);
    res.status(500).json({ error: 'Gagal menyimpan jadwal ke database.' });
  }
});

// Update Appointment
router.put(['/:id', '/db/appointments/:id'], requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const appt = await serverDb.findAppointmentById(id);
    if (!appt) {
      return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
    }

    if (req.user!.role === 'mahasiswa') {
      if (appt.userId !== req.user!.userId) {
        return res.status(403).json({
          error: 'ACCESS_DENIED',
          message: 'Akses ditolak. Anda hanya diperbolehkan mengubah jadwal milik Anda sendiri.'
        });
      }
    } else if (req.user!.role === 'konselor') {
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
    const updates: any = {};

    // FIELD-LEVEL AUTHORIZATION ENFORCEMENT
    if (req.user!.role === 'mahasiswa') {
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
    } else if (req.user!.role === 'konselor') {
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
        }
      }
      if (validated.approvalStatus !== undefined) updates.approvalStatus = validated.approvalStatus;
      if (validated.attendanceStatus !== undefined) updates.attendanceStatus = validated.attendanceStatus;
      if (validated.meetingLink !== undefined) updates.meetingLink = validated.meetingLink;
      if (validated.notes !== undefined) updates.notes = sanitizeInput(validated.notes, 300);
      if (validated.mode !== undefined) updates.mode = validated.mode;
    } else if (req.user!.role === 'admin') {
      // Admin has unrestricted update authority including reassignment and rescheduling
      if (validated.counselorId !== undefined) updates.counselorId = validated.counselorId;
      if (validated.counselorName !== undefined) updates.counselorName = validated.counselorName;
      if (validated.date !== undefined) updates.date = validated.date;
      if (validated.time !== undefined) updates.time = validated.time;
      if (validated.timezone !== undefined) updates.timezone = validated.timezone;
      if (validated.mode !== undefined) updates.mode = validated.mode;
      if (validated.notes !== undefined) updates.notes = sanitizeInput(validated.notes, 300);
      if (validated.status !== undefined) {
        updates.status = validated.status;
        if (validated.status === 'CONFIRMED') {
          updates.approvalStatus = 'APPROVED';
        } else if (validated.status === 'REJECTED') {
          updates.approvalStatus = 'REJECTED';
        } else if (validated.status === 'CANCELLED') {
          updates.attendanceStatus = 'CANCELLED';
        }
      }
      if (validated.approvalStatus !== undefined) updates.approvalStatus = validated.approvalStatus;
      if (validated.attendanceStatus !== undefined) updates.attendanceStatus = validated.attendanceStatus;
      if (validated.meetingLink !== undefined) updates.meetingLink = validated.meetingLink;
      if (validated.studentName !== undefined) updates.studentName = sanitizeInput(validated.studentName, 100);
      if (validated.studentNIM !== undefined) updates.studentNIM = sanitizeInput(validated.studentNIM, 30);
      if (validated.studentEmail !== undefined) updates.studentEmail = sanitizeInput(validated.studentEmail, 100);
    }

    const record = await serverDb.updateAppointment(id, updates);
    if (!record) {
      return res.status(404).json({ error: 'Jadwal gagal diperbarui.' });
    }
    res.json({ success: true, record: mapAppointmentToResponse(record) });
  } catch (err: any) {
    if (err.message === 'SLOT_ALREADY_BOOKED') {
      return res.status(409).json({
        error: 'Jadwal bentrok! Slot pada tanggal dan jam tersebut sudah terisi oleh jadwal lain.'
      });
    }
    console.error('Error updating appointment:', err);
    res.status(500).json({ error: 'Gagal memperbarui jadwal.' });
  }
});

// Delete Appointment
router.delete(['/:id', '/db/appointments/:id'], requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const appt = await serverDb.findAppointmentById(id);
    if (!appt) {
      return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
    }

    if (req.user!.role === 'mahasiswa') {
      if (appt.userId !== req.user!.userId) {
        return res.status(403).json({
          error: 'ACCESS_DENIED',
          message: 'Akses ditolak. Anda hanya diperbolehkan membatalkan jadwal milik Anda sendiri.'
        });
      }
    } else if (req.user!.role === 'konselor') {
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
    res.json({ success });
  } catch (err: any) {
    console.error('Error deleting appointment:', err);
    res.status(500).json({ error: 'Gagal menghapus jadwal.' });
  }
});

export default router;
