import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../database.js';
import { requireAuth, normalizeRole } from '../middleware/auth.js';
import { encryptionService } from '../services/encryptionService.js';
import { generalApiLimiter } from '../middleware/rateLimiters.js';
import { canAccessHealthData, getAssignedStudentUserIds } from '../services/healthDataAuth.js';

const router = Router();

// Admins may manage the platform but do not gain access to clinical records through this portal.
const requireCounselorPortalRole = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
  }
  const role = normalizeRole(req.user.role);
  if (role !== 'konselor' && role !== 'peer_counselor') {
    return res.status(403).json({ success: false, error: 'ACCESS_DENIED' });
  }
  next();
};

/**
 * GET /api/v1/counselor-portal/triage-queue
 * Fetches prioritized triage items from screenings, urgent appointments, and crisis alerts
 * Strictly isolated to authorized counselor care relationships
 */
router.get('/triage-queue', generalApiLimiter, requireAuth, requireCounselorPortalRole, async (req: Request, res: Response) => {
  try {
    const counselorId = req.user!.userId;
    const { status, riskLevel, search } = req.query;

    let allowedStudentIds: string[] = [];
    {
      allowedStudentIds = await getAssignedStudentUserIds(counselorId);
      if (allowedStudentIds.length === 0) {
        return res.json({
          success: true,
          data: [],
          total: 0,
          timestamp: new Date().toISOString()
        });
      }
    }

    const screeningWhere = { userId: { in: allowedStudentIds } };

    const screenings = await prisma.screenings.findMany({
      where: screeningWhere,
      orderBy: [
        { hasSelfHarmRisk: 'desc' },
        { phq9Score: 'desc' },
        { timestamp: 'desc' }
      ],
      take: 50,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            university: true,
            consent: {
              select: {
                consentForCounselorSharing: true
              }
            }
          }
        }
      }
    });

    // Map into unified triage queue items
    const triageItems = screenings.map((s) => {
      const user = s.user;
      const hasConsent = Boolean(user?.consent?.consentForCounselorSharing);
      
      const calculatedRisk = s.riskLevel || (s.hasSelfHarmRisk ? 'Krisis' : s.phq9Score >= 20 ? 'Tinggi' : s.phq9Score >= 15 ? 'Sedang' : 'Rendah');
      let indicators: string[] = [];
      if (s.riskIndicators) {
        try {
          const decrypted = encryptionService.decryptSensitive(s.riskIndicators);
          if (decrypted) {
            indicators = JSON.parse(decrypted);
          }
        } catch {
          // fallback
        }
      }

      if (s.hasSelfHarmRisk && !indicators.includes('Indikasi Resiko Menyakiti Diri')) {
        indicators.unshift('Indikasi Resiko Menyakiti Diri (PHQ-9 Item 9 > 0)');
      }

      return {
        id: `triage-scr-${s.id}`,
        sourceType: 'SCREENING',
        sourceId: s.id,
        userId: user?.id || s.userId || 'anonymous',
        studentName: user?.name ? user.name : 'Mahasiswa',
        studentEmail: user?.email ? user.email : '',
        university: user?.university || 'Tidak tersedia',
        phq9Score: s.phq9Score,
        phq9Severity: s.phq9Severity,
        gad7Score: s.gad7Score,
        gad7Severity: s.gad7Severity,
        hasSelfHarmRisk: s.hasSelfHarmRisk || false,
        riskLevel: calculatedRisk,
        status: s.status || 'Menunggu Penanganan',
        riskIndicators: indicators,
        createdAt: s.timestamp,
        hasConsentForSharing: hasConsent
      };
    });

    // Filter if query provided
    let filtered = triageItems;
    if (status && typeof status === 'string') {
      filtered = filtered.filter(item => item.status.toLowerCase() === status.toLowerCase());
    }
    if (riskLevel && typeof riskLevel === 'string') {
      filtered = filtered.filter(item => item.riskLevel.toLowerCase() === riskLevel.toLowerCase());
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      filtered = filtered.filter(item => item.studentName.toLowerCase().includes(q) || item.university.toLowerCase().includes(q));
    }

    res.json({
      success: true,
      data: filtered,
      total: filtered.length,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Error fetching triage queue:', err);
    res.status(500).json({ success: false, error: 'Gagal mengambil data antrean triase.' });
  }
});

/**
 * GET /api/v1/counselor-portal/soap-notes
 * Returns decrypted clinical SOAP notes for authorized counselor with relationship verification
 */
router.get('/soap-notes', generalApiLimiter, requireAuth, requireCounselorPortalRole, async (req: Request, res: Response) => {
  try {
    const counselorId = req.user!.userId;
    const { studentUserId, appointmentId } = req.query;

    {
      if (studentUserId && typeof studentUserId === 'string') {
        const hasAccess = await canAccessHealthData(req.user!, studentUserId, 'VIEW_CONSULTATION_NOTE', {
          appointmentId: appointmentId && typeof appointmentId === 'string' ? appointmentId : undefined,
          requireCounselorAssignment: true
        });
        if (!hasAccess) {
          return res.status(404).json({
            success: false,
            error: 'Data tidak ditemukan atau akses tidak tersedia.'
          });
        }
      } else if (appointmentId && typeof appointmentId === 'string') {
        const appt = await prisma.appointments.findUnique({ where: { id: appointmentId } });
        if (!appt || !appt.userId) {
          return res.status(404).json({ success: false, error: 'Data tidak ditemukan atau akses tidak tersedia.' });
        }
        const hasAccess = await canAccessHealthData(req.user!, appt.userId, 'VIEW_CONSULTATION_NOTE', { appointmentId, requireCounselorAssignment: true });
        if (!hasAccess) {
          return res.status(404).json({
            success: false,
            error: 'Data tidak ditemukan atau akses tidak tersedia.'
          });
        }
      }
    }

    const whereClause: { studentUserId?: string | { in: string[] }; appointmentId?: string; counselorUserId?: string } = {};
    if (studentUserId && typeof studentUserId === 'string') {
      whereClause.studentUserId = studentUserId;
    }
    if (appointmentId && typeof appointmentId === 'string') {
      whereClause.appointmentId = appointmentId;
    }

    {
      whereClause.counselorUserId = counselorId;
      if (!studentUserId && !appointmentId) {
        const assignedStudentIds = await getAssignedStudentUserIds(counselorId);
        whereClause.studentUserId = { in: assignedStudentIds };
      }
    }

    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '50'), 10) || 50));
    const skip = (page - 1) * limit;

    const [total, notes] = await Promise.all([
      prisma.clinicalSoapNotes.count({ where: whereClause }),
      prisma.clinicalSoapNotes.findMany({
        where: whereClause,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              university: true
            }
          },
          counselor: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        }
      })
    ]);

    const decryptedNotes = notes.map(note => ({
      id: note.id,
      appointmentId: note.appointmentId,
      studentUserId: note.studentUserId,
      studentName: note.student?.name || 'Mahasiswa',
      studentEmail: note.student?.email || '',
      university: note.student?.university || 'Tidak tersedia',
      counselorUserId: note.counselorUserId,
      counselorName: note.counselor?.name || 'Konselor',
      subjective: encryptionService.decryptSensitive(note.subjective) || note.subjective,
      objective: encryptionService.decryptSensitive(note.objective) || note.objective,
      assessment: encryptionService.decryptSensitive(note.assessment) || note.assessment,
      plan: encryptionService.decryptSensitive(note.plan) || note.plan,
      summary: note.summary ? (encryptionService.decryptSensitive(note.summary) || note.summary) : '',
      riskLevel: note.riskLevel,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      isEncryptedEndToEnd: true
    }));

    if (notes.length > 0) {
      await prisma.staffAccessLogs.createMany({
        data: notes.map(note => ({
          id: `audit-soap-read-${crypto.randomBytes(12).toString('hex')}`,
          staffUserId: counselorId,
          staffName: req.user!.name || 'Konselor',
          staffRole: req.user!.role,
          targetUserId: note.studentUserId,
          accessType: 'VIEW_CLINICAL_SOAP_NOTE',
          purpose: 'Akses catatan klinis SOAP yang telah diotorisasi'
        }))
      });
    }

    res.json({
      success: true,
      data: decryptedNotes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err: any) {
    console.error('Error fetching SOAP notes:', err);
    res.status(500).json({ success: false, error: 'Gagal mengambil data catatan klinis SOAP.' });
  }
});

/**
 * POST /api/v1/counselor-portal/soap-notes
 * Creates or updates an AES-256-GCM encrypted SOAP note with strict counselor assignment & authorization
 */
router.post('/soap-notes', generalApiLimiter, requireAuth, requireCounselorPortalRole, async (req: Request, res: Response) => {
  try {
    const counselorUserId = req.user!.userId;
    const { id, appointmentId, studentUserId, subjective, objective, assessment, plan, summary, riskLevel } = req.body;

    if (!studentUserId) {
      return res.status(400).json({ success: false, error: 'studentUserId wajib diisi.' });
    }

    if (!subjective || !objective || !assessment || !plan) {
      return res.status(400).json({
        success: false,
        error: 'Seluruh komponen SOAP (Subjective, Objective, Assessment, Plan) wajib diisi secara lengkap.'
      });
    }

    // Verify student exists
    const student = await prisma.users.findUnique({ where: { id: studentUserId } });
    if (!student) {
      return res.status(404).json({ success: false, error: 'Data tidak ditemukan atau akses tidak tersedia.' });
    }

    // Strict counselor assignment and consent check applies to every portal role.
    {
      const purpose = id ? 'UPDATE_SOAP_NOTE' : 'CREATE_SOAP_NOTE';
      const hasAccess = await canAccessHealthData(
        req.user!,
        studentUserId,
        purpose,
        { appointmentId: appointmentId || undefined, requireCounselorAssignment: true }
      );

      if (!hasAccess) {
        return res.status(404).json({
          success: false,
          error: 'Data tidak ditemukan atau akses tidak tersedia.'
        });
      }

      // If updating an existing note, ensure the note was authored by this counselor
      if (id) {
        const existingNote = await prisma.clinicalSoapNotes.findUnique({ where: { id } });
        if (existingNote && (existingNote.counselorUserId !== counselorUserId || existingNote.studentUserId !== studentUserId)) {
          return res.status(404).json({
            success: false,
            error: 'Data tidak ditemukan atau akses tidak tersedia.'
          });
        }
        if (!existingNote) return res.status(404).json({ success: false, error: 'Data tidak ditemukan atau akses tidak tersedia.' });
      }
    }

    // Encrypt each clinical section with AES-256-GCM
    const encSubjective = encryptionService.encryptRequiredSensitive(subjective);
    const encObjective = encryptionService.encryptRequiredSensitive(objective);
    const encAssessment = encryptionService.encryptRequiredSensitive(assessment);
    const encPlan = encryptionService.encryptRequiredSensitive(plan);
    const encSummary = summary ? encryptionService.encryptSensitive(summary) : null;

    const noteId = id || `soap-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const upserted = await prisma.clinicalSoapNotes.upsert({
      where: { id: noteId },
      update: {
        appointmentId: appointmentId || undefined,
        subjective: encSubjective,
        objective: encObjective,
        assessment: encAssessment,
        plan: encPlan,
        summary: encSummary,
        riskLevel: riskLevel || 'Tidak dinilai',
        updatedAt: new Date()
      },
      create: {
        id: noteId,
        appointmentId: appointmentId || undefined,
        studentUserId,
        counselorUserId,
        subjective: encSubjective,
        objective: encObjective,
        assessment: encAssessment,
        plan: encPlan,
        summary: encSummary,
        riskLevel: riskLevel || 'Tidak dinilai'
      }
    });

    // Record audit log for HIPAA / UU PDP Compliance
    await prisma.staffAccessLogs.create({
      data: {
        id: `audit-soap-${Date.now()}`,
        staffUserId: counselorUserId,
        staffName: req.user!.name || 'Konselor Kampus',
        staffRole: req.user!.role,
        targetUserId: studentUserId,
        accessType: id ? 'UPDATE_CLINICAL_SOAP_NOTE' : 'CREATE_CLINICAL_SOAP_NOTE',
        purpose: 'Pencatatan Rekam Medis Klinis Konseling Mahasiswa (SOAP Standard)'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Catatan klinis SOAP berhasil disimpan dengan enkripsi AES-256-GCM.',
      data: {
        id: upserted.id,
        studentUserId: upserted.studentUserId,
        counselorUserId: upserted.counselorUserId,
        riskLevel: upserted.riskLevel,
        createdAt: upserted.createdAt,
        updatedAt: upserted.updatedAt
      }
    });
  } catch (err: any) {
    console.error('Error saving SOAP note:', err);
    res.status(500).json({ success: false, error: 'Gagal menyimpan catatan klinis SOAP.' });
  }
});

/**
 * DELETE /api/v1/counselor-portal/soap-notes/:id
 * Deletes a SOAP note with strict authorization
 */
router.delete('/soap-notes/:id', generalApiLimiter, requireAuth, requireCounselorPortalRole, async (req: Request, res: Response) => {
  try {
    const counselorUserId = req.user!.userId;
    const { id } = req.params;

    const existingNote = await prisma.clinicalSoapNotes.findUnique({ where: { id } });
    if (!existingNote) {
      return res.status(404).json({ success: false, error: 'Data tidak ditemukan atau akses tidak tersedia.' });
    }

    {
      if (existingNote.counselorUserId !== counselorUserId) {
        return res.status(404).json({
          success: false,
          error: 'Data tidak ditemukan atau akses tidak tersedia.'
        });
      }

      const hasAccess = await canAccessHealthData(req.user!, existingNote.studentUserId, 'DELETE_SOAP_NOTE', { requireCounselorAssignment: true });
      if (!hasAccess) {
        return res.status(404).json({
          success: false,
          error: 'Data tidak ditemukan atau akses tidak tersedia.'
        });
      }
    }

    await prisma.clinicalSoapNotes.delete({ where: { id } });

    await prisma.staffAccessLogs.create({
      data: {
        id: `audit-soap-del-${Date.now()}`,
        staffUserId: counselorUserId,
        staffName: req.user!.name || 'Konselor Kampus',
        staffRole: req.user!.role,
        targetUserId: existingNote.studentUserId,
        accessType: 'DELETE_CLINICAL_SOAP_NOTE',
        purpose: 'Penghapusan Catatan Rekam Medis Klinis SOAP'
      }
    });

    res.json({ success: true, message: 'Catatan SOAP berhasil dihapus.' });
  } catch (err: any) {
    console.error('Error deleting SOAP note:', err);
    res.status(500).json({ success: false, error: 'Gagal menghapus catatan SOAP.' });
  }
});

/**
 * GET /api/v1/counselor-portal/students
 * Lists students registered for counseling assigned to the requesting counselor
 */
router.get('/students', generalApiLimiter, requireAuth, requireCounselorPortalRole, async (req: Request, res: Response) => {
  try {
    const counselorUserId = req.user!.userId;
    const userWhereClause: { role: { in: string[] }; id?: { in: string[] } } = {
      role: { in: ['mahasiswa', 'student', 'STUDENT'] }
    };

    {
      const assignedStudentIds = await getAssignedStudentUserIds(counselorUserId);
      if (assignedStudentIds.length === 0) {
        return res.json({ success: true, data: [] });
      }
      userWhereClause.id = { in: assignedStudentIds };
    }

    const counselorProfile = await prisma.counselors.findFirst({
      where: { OR: [{ userId: counselorUserId }, { id: counselorUserId }] },
      select: { id: true }
    });
    if (!counselorProfile) return res.json({ success: true, data: [] });

    const students = await prisma.users.findMany({
      where: userWhereClause,
      select: {
        id: true,
        name: true,
        email: true,
        university: true,
        createdAt: true,
        screenings: {
          take: 1,
          orderBy: { timestamp: 'desc' },
          select: {
            phq9Score: true,
            gad7Score: true,
            hasSelfHarmRisk: true,
            riskLevel: true,
            timestamp: true
          }
        },
        appointments: {
          where: { counselorId: counselorProfile.id },
          take: 1,
          orderBy: { scheduledAt: 'desc' },
          select: {
            id: true,
            scheduledAt: true,
            status: true,
            mode: true
          }
        },
        consent: {
          select: {
            consentForCounselorSharing: true
          }
        }
      },
      take: 50
    });

    const formatted = students.map(s => {
      const latestScreening = s.screenings[0] || null;
      const latestAppt = s.appointments[0] || null;
      return {
        id: s.id,
        name: s.name,
        email: s.email,
        university: s.university || 'Tidak tersedia',
        joinedAt: s.createdAt,
        latestScreening,
        latestAppointment: latestAppt,
        consentGranted: s.consent?.consentForCounselorSharing ?? false
      };
    });

    res.json({
      success: true,
      data: formatted
    });
  } catch (err: any) {
    console.error('Error fetching student list:', err);
    res.status(500).json({ success: false, error: 'Gagal mengambil data daftar mahasiswa.' });
  }
});

/**
 * GET /api/v1/counselor-portal/stats
 * Overview metrics for campus counseling center
 */
router.get('/stats', generalApiLimiter, requireAuth, requireCounselorPortalRole, async (req: Request, res: Response) => {
  try {
    const counselorUserId = req.user!.userId;
    let assignedStudentIds: string[] = [];
    let counselorProfileId: string | null = null;

    {
      const counselor = await prisma.counselors.findFirst({
        where: { OR: [{ userId: counselorUserId }, { id: counselorUserId }] }
      });
      if (counselor) {
        counselorProfileId = counselor.id;
      }
      assignedStudentIds = await getAssignedStudentUserIds(counselorUserId);
    }

    const screeningWhere = { userId: { in: assignedStudentIds } };
    const appointmentWhere = counselorProfileId
      ? { counselorId: counselorProfileId, userId: { in: assignedStudentIds } }
      : { counselorId: '__none__', userId: { in: assignedStudentIds } };
    const soapWhere = { counselorUserId, studentUserId: { in: assignedStudentIds } };

    // Response time calculation based on real timestamps:
    // Defined as: elapsed time from student appointment request (createdAt) to counselor confirmation / completion action.
    // For confirmed/completed appointments, the response event timestamp is tracked via clinicalSoapNotes (when consultation note was documented)
    // or appointment status confirmation / slot update. If no appointments have reached confirmed/completed state with valid response times,
    // response time is null (unavailable), never a fake 30-min or 0.5-hr fallback.
    const respondedAppointments = await prisma.appointments.findMany({
      where: {
        ...appointmentWhere,
        status: { in: ['CONFIRMED', 'COMPLETED', 'ATTENDED'] }
      },
      select: {
        id: true,
        createdAt: true,
        slot: {
          select: {
            scheduledAt: true
          }
        }
      },
      take: 200
    });

    let avgResponseTimeMinutes: number | null = null;
    let averageResponseTimeHours: number | null = null;

    if (respondedAppointments.length > 0) {
      // Find matching audit logs or SOAP note creation timestamps representing counselor action
      const apptIds = respondedAppointments.map(a => a.id);
      const [soapNotesForAppts, auditLogsForAppts] = await Promise.all([
        prisma.clinicalSoapNotes.findMany({
          where: { appointmentId: { in: apptIds } },
          select: { appointmentId: true, createdAt: true }
        }),
        prisma.auditLogs.findMany({
          where: {
            action: { in: ['UPDATE_APPOINTMENT', 'CREATE_SOAP_NOTE', 'CONFIRM_APPOINTMENT'] }
          },
          select: { details: true, timestamp: true },
          take: 500
        })
      ]);

      const soapMap = new Map<string, Date>();
      for (const note of soapNotesForAppts) {
        if (note.appointmentId) soapMap.set(note.appointmentId, note.createdAt);
      }

      const diffsMinutes: number[] = [];
      for (const appt of respondedAppointments) {
        let actionTime: Date | null = soapMap.get(appt.id) || null;
        if (!actionTime) {
          // Check audit log for this appointment ID
          const matchingAudit = auditLogsForAppts.find(l => l.details && l.details.includes(appt.id));
          if (matchingAudit) {
            actionTime = matchingAudit.timestamp;
          }
        }

        if (actionTime && actionTime.getTime() >= appt.createdAt.getTime()) {
          const diffMs = actionTime.getTime() - appt.createdAt.getTime();
          diffsMinutes.push(Math.round(diffMs / 60000));
        }
      }

      if (diffsMinutes.length > 0) {
        const sum = diffsMinutes.reduce((a, b) => a + b, 0);
        const avgMin = Math.round(sum / diffsMinutes.length);
        avgResponseTimeMinutes = avgMin;
        averageResponseTimeHours = parseFloat((avgMin / 60).toFixed(1));
      }
    }

    // 1. Basic Counts using DB aggregations without take: 500 limits
    const [
      totalStudents,
      totalScreenings,
      highRiskScreenings,
      highRiskSoapNotes,
      resolvedScreenings,
      activeCases,
      totalAppointments,
      totalSoapNotes
    ] = await Promise.all([
      prisma.users.count({
        where: { id: { in: assignedStudentIds } }
      }),
      prisma.screenings.count({ where: screeningWhere }),
      // High-risk: PHQ-9 >= 20 OR hasSelfHarmRisk: true (Single mutually exclusive count to avoid double-counting)
      prisma.screenings.count({
        where: {
          ...screeningWhere,
          OR: [
            { hasSelfHarmRisk: true },
            { phq9Score: { gte: 20 } }
          ]
        }
      }),
      // A risk-classified SOAP note does not prove an intervention occurred.
      prisma.clinicalSoapNotes.count({
        where: {
          ...soapWhere,
          riskLevel: { in: ['CRISIS', 'HIGH', 'Krisis', 'Tinggi'] }
        }
      }),
      prisma.screenings.count({
        where: {
          ...screeningWhere,
          status: { in: ['Selesai', 'Ditangani', 'RESOLVED', 'REFERRED', 'COMPLETED', 'Selesai Penanganan'] }
        }
      }),
      prisma.appointments.count({
        where: {
          ...appointmentWhere,
          status: { in: ['CONFIRMED', 'PENDING', 'SCHEDULED', 'IN_PROGRESS'] }
        }
      }),
      prisma.appointments.count({ where: appointmentWhere }),
      prisma.clinicalSoapNotes.count({ where: soapWhere })
    ]);

    // Denominator & Numerator for triage resolution rate
    const resolutionRate = totalScreenings > 0
      ? `${((resolvedScreenings / totalScreenings) * 100).toFixed(1)}%`
      : '0%';

    // 2. Full-database severity distribution (PHQ-9 + Self-Harm Flag) without take: 500 cap
    // Mutually exclusive severity bands based on standard PHQ-9 clinical thresholds:
    // Krisis / Suisiditas: hasSelfHarmRisk = true OR phq9Score >= 20
    // Berat (Severe): phq9Score 15-19 without self-harm
    // Sedang (Moderate): phq9Score 10-14 without self-harm
    // Ringan (Mild): phq9Score 5-9 without self-harm
    // Minimal / Normal: phq9Score 0-4 without self-harm
    const [krisisCount, beratCount, sedangCount, ringanCount, minimalCount] = await Promise.all([
      prisma.screenings.count({
        where: {
          ...screeningWhere,
          OR: [
            { hasSelfHarmRisk: true },
            { phq9Score: { gte: 20 } }
          ]
        }
      }),
      prisma.screenings.count({
        where: {
          ...screeningWhere,
          hasSelfHarmRisk: false,
          phq9Score: { gte: 15, lt: 20 }
        }
      }),
      prisma.screenings.count({
        where: {
          ...screeningWhere,
          hasSelfHarmRisk: false,
          phq9Score: { gte: 10, lt: 15 }
        }
      }),
      prisma.screenings.count({
        where: {
          ...screeningWhere,
          hasSelfHarmRisk: false,
          phq9Score: { gte: 5, lt: 10 }
        }
      }),
      prisma.screenings.count({
        where: {
          ...screeningWhere,
          hasSelfHarmRisk: false,
          phq9Score: { lt: 5 }
        }
      })
    ]);

    const severityDistribution = [
      { name: 'Minimal / Normal', count: minimalCount, color: '#10B981' },
      { name: 'Ringan (Mild)', count: ringanCount, color: '#06B6D4' },
      { name: 'Sedang (Moderate)', count: sedangCount, color: '#F59E0B' },
      { name: 'Berat (Severe)', count: beratCount, color: '#EF4444' },
      { name: 'Krisis / Suisiditas', count: krisisCount, color: '#881337' }
    ];

    // 3. Genuine Monthly Trend across explicit UTC month boundaries (handles year boundaries seamlessly)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const now = new Date();
    const trendBuckets: Array<{
      monthLabel: string;
      startDate: Date;
      endDate: Date;
    }> = [];

    for (let i = 5; i >= 0; i--) {
      const year = now.getFullYear();
      const month = now.getMonth() - i;
      // Start of month (UTC boundary)
      const startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
      // End of month (UTC boundary: first millisecond of next month)
      const endDate = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));
      
      const labelMonth = monthNames[startDate.getUTCMonth()];
      const labelYear = String(startDate.getUTCFullYear()).slice(-2);
      trendBuckets.push({
        monthLabel: `${labelMonth} '${labelYear}`,
        startDate,
        endDate
      });
    }

    const monthlyTrend = await Promise.all(
      trendBuckets.map(async ({ monthLabel, startDate, endDate }) => {
          const [screeningCount, apptCount, highRiskSoapNoteCount] = await Promise.all([
          prisma.screenings.count({
            where: {
              ...screeningWhere,
              timestamp: { gte: startDate, lt: endDate }
            }
          }),
          prisma.appointments.count({
            where: {
              ...appointmentWhere,
              scheduledAt: { gte: startDate, lt: endDate },
              status: { notIn: ['CANCELLED', 'REJECTED'] }
            }
          }),
          prisma.clinicalSoapNotes.count({
            where: {
              ...soapWhere,
              createdAt: { gte: startDate, lt: endDate },
              riskLevel: { in: ['CRISIS', 'HIGH', 'Krisis', 'Tinggi'] }
            }
          })
        ]);

        return {
          month: monthLabel,
          screening: screeningCount,
          counseling: apptCount,
          highRiskSoapNotes: highRiskSoapNoteCount
        };
      })
    );

    res.json({
      success: true,
      data: {
        totalStudents,
        totalScreenings,
        highRiskScreenings,
        totalAppointments,
        totalSoapNotes,
        triageResolutionRate: resolutionRate,
        avgResponseTimeMinutes,
        activeCrisisAlerts: highRiskScreenings,
        // Aligned CounselorStats fields
        totalTriaged: totalScreenings,
        activeCases,
        highRiskSoapNotes,
        highRiskCount: highRiskScreenings,
        completedNotes: totalSoapNotes,
        averageResponseTimeHours,
        severityDistribution,
        monthlyTrend
      }
    });
  } catch (err: any) {
    console.error('Error fetching counselor stats:', err);
    res.status(500).json({ success: false, error: 'Gagal mengambil data statistik konseling.' });
  }
});

export default router;
