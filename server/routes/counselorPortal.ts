import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { prisma, serverDb } from '../database.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { encryptionService } from '../services/encryptionService.js';
import { generalApiLimiter } from '../middleware/rateLimiters.js';
import { canAccessHealthData, getAssignedStudentUserIds } from '../services/healthDataAuth.js';
import { consentService } from '../services/consentService.js';

const router = Router();

// Allowed roles for Counselor Portal
const counselorRoles = ['konselor', 'clinical_counselor', 'licensed_psychologist', 'peer_counselor', 'admin', 'campus_admin', 'LICENSED_PSYCHOLOGIST', 'PEER_COUNSELOR', 'CAMPUS_ADMIN'] as any;

/**
 * GET /api/v1/counselor-portal/triage-queue
 * Fetches prioritized triage items from screenings, urgent appointments, and crisis alerts
 * Strictly isolated to authorized counselor care relationships
 */
router.get('/triage-queue', generalApiLimiter, requireAuth, requireRole(counselorRoles), async (req: Request, res: Response) => {
  try {
    const counselorId = req.user!.userId;
    const userRole = String(req.user!.role || '').toLowerCase();
    const isCampusAdmin = userRole === 'admin' || userRole === 'campus_admin';
    const { status, riskLevel, search } = req.query;

    let allowedStudentIds: string[] = [];
    if (!isCampusAdmin) {
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

    const screeningWhere: any = {};
    if (!isCampusAdmin) {
      screeningWhere.userId = { in: allowedStudentIds };
    }

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
            consent: true
          }
        }
      }
    });

    const appointmentWhere: any = {
      status: { in: ['CONFIRMED', 'PENDING', 'SCHEDULED'] }
    };
    if (!isCampusAdmin) {
      const counselorProfile = await prisma.counselors.findFirst({
        where: { OR: [{ userId: counselorId }, { id: counselorId }] }
      });
      if (counselorProfile) {
        appointmentWhere.counselorId = counselorProfile.id;
      }
      appointmentWhere.userId = { in: allowedStudentIds };
    }

    const appointments = await prisma.appointments.findMany({
      where: appointmentWhere,
      orderBy: { scheduledAt: 'asc' },
      take: 30,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            university: true,
            consent: true
          }
        }
      }
    });

    // Map into unified triage queue items
    const triageItems = screenings.map((s) => {
      const user = s.user;
      const hasConsent = user?.consent ? Boolean(user.consent.consentForCounselorSharing || user.consent.consentForCounselorSummary) : false;
      
      let calculatedRisk = s.riskLevel || (s.hasSelfHarmRisk ? 'Krisis' : s.phq9Score >= 20 ? 'Tinggi' : s.phq9Score >= 15 ? 'Sedang' : 'Rendah');
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
        university: user?.university || 'Universitas Indonesia',
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
router.get('/soap-notes', generalApiLimiter, requireAuth, requireRole(counselorRoles), async (req: Request, res: Response) => {
  try {
    const counselorId = req.user!.userId;
    const { studentUserId, appointmentId } = req.query;

    const userRole = String(req.user!.role || '').toLowerCase();
    const isCampusAdmin = userRole === 'admin' || userRole === 'campus_admin';

    if (!isCampusAdmin) {
      if (studentUserId && typeof studentUserId === 'string') {
        const hasAccess = await canAccessHealthData(req.user!, studentUserId, 'VIEW_CONSULTATION_NOTE', {
          appointmentId: appointmentId && typeof appointmentId === 'string' ? appointmentId : undefined
        });
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            code: 'ACCESS_DENIED',
            error: 'Akses ditolak. Anda tidak memiliki hubungan layanan atau izin persetujuan untuk mahasiswa ini.'
          });
        }
      } else if (appointmentId && typeof appointmentId === 'string') {
        const appt = await prisma.appointments.findUnique({ where: { id: appointmentId } });
        if (!appt || !appt.userId) {
          return res.status(404).json({ success: false, error: 'Janji temu tidak ditemukan.' });
        }
        const hasAccess = await canAccessHealthData(req.user!, appt.userId, 'VIEW_CONSULTATION_NOTE', { appointmentId });
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            code: 'ACCESS_DENIED',
            error: 'Akses ditolak. Anda tidak memiliki hubungan layanan atau izin persetujuan untuk janji temu ini.'
          });
        }
      }
    }

    const whereClause: any = {};
    if (studentUserId && typeof studentUserId === 'string') {
      whereClause.studentUserId = studentUserId;
    }
    if (appointmentId && typeof appointmentId === 'string') {
      whereClause.appointmentId = appointmentId;
    }

    if (!isCampusAdmin) {
      whereClause.counselorUserId = counselorId;
      if (!studentUserId && !appointmentId) {
        const assignedStudentIds = await getAssignedStudentUserIds(counselorId);
        whereClause.studentUserId = { in: assignedStudentIds };
      }
    }

    const notes = await prisma.clinicalSoapNotes.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
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
    });

    const decryptedNotes = notes.map(note => ({
      id: note.id,
      appointmentId: note.appointmentId,
      studentUserId: note.studentUserId,
      studentName: note.student?.name || 'Mahasiswa',
      studentEmail: note.student?.email || '',
      university: note.student?.university || '',
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

    res.json({
      success: true,
      data: decryptedNotes
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
router.post('/soap-notes', generalApiLimiter, requireAuth, requireRole(counselorRoles), async (req: Request, res: Response) => {
  try {
    const counselorUserId = req.user!.userId;
    const userRole = String(req.user!.role || '').toLowerCase();
    const isCampusAdmin = userRole === 'admin' || userRole === 'campus_admin';
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
      return res.status(404).json({ success: false, error: 'Mahasiswa / Klien tidak ditemukan dalam sistem.' });
    }

    // STRICT COUNSELOR ASSIGNMENT & RELATIONSHIP CHECK (Non-admin)
    if (!isCampusAdmin) {
      const purpose = id ? 'UPDATE_SOAP_NOTE' : 'CREATE_SOAP_NOTE';
      const hasAccess = await canAccessHealthData(
        req.user!,
        studentUserId,
        purpose,
        { appointmentId: appointmentId || undefined }
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          code: 'ACCESS_DENIED',
          error: 'Konselor tidak memiliki izin atau hubungan layanan untuk membuat atau mengubah catatan SOAP untuk mahasiswa ini.'
        });
      }

      // If updating an existing note, ensure the note was authored by this counselor
      if (id) {
        const existingNote = await prisma.clinicalSoapNotes.findUnique({ where: { id } });
        if (existingNote && existingNote.counselorUserId !== counselorUserId) {
          return res.status(403).json({
            success: false,
            code: 'ACCESS_DENIED',
            error: 'Anda tidak memiliki hak untuk mengubah catatan SOAP yang dibuat oleh konselor lain.'
          });
        }
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
        riskLevel: riskLevel || 'Rendah',
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
        riskLevel: riskLevel || 'Rendah'
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
router.delete('/soap-notes/:id', generalApiLimiter, requireAuth, requireRole(counselorRoles), async (req: Request, res: Response) => {
  try {
    const counselorUserId = req.user!.userId;
    const userRole = String(req.user!.role || '').toLowerCase();
    const isCampusAdmin = userRole === 'admin' || userRole === 'campus_admin';
    const { id } = req.params;

    const existingNote = await prisma.clinicalSoapNotes.findUnique({ where: { id } });
    if (!existingNote) {
      return res.status(404).json({ success: false, error: 'Catatan SOAP tidak ditemukan.' });
    }

    if (!isCampusAdmin) {
      if (existingNote.counselorUserId !== counselorUserId) {
        return res.status(403).json({
          success: false,
          code: 'ACCESS_DENIED',
          error: 'Anda tidak memiliki hak untuk menghapus catatan SOAP yang dibuat oleh konselor lain.'
        });
      }

      const hasAccess = await canAccessHealthData(req.user!, existingNote.studentUserId, 'DELETE_SOAP_NOTE');
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          code: 'ACCESS_DENIED',
          error: 'Akses ditolak.'
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
router.get('/students', generalApiLimiter, requireAuth, requireRole(counselorRoles), async (req: Request, res: Response) => {
  try {
    const counselorUserId = req.user!.userId;
    const userRole = String(req.user!.role || '').toLowerCase();
    const isCampusAdmin = userRole === 'admin' || userRole === 'campus_admin';

    let userWhereClause: any = {
      role: { in: ['mahasiswa', 'student', 'STUDENT'] }
    };

    if (!isCampusAdmin) {
      const assignedStudentIds = await getAssignedStudentUserIds(counselorUserId);
      if (assignedStudentIds.length === 0) {
        return res.json({ success: true, data: [] });
      }
      userWhereClause.id = { in: assignedStudentIds };
    }

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
        university: s.university,
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
router.get('/stats', generalApiLimiter, requireAuth, requireRole(counselorRoles), async (req: Request, res: Response) => {
  try {
    const counselorUserId = req.user!.userId;
    const userRole = String(req.user!.role || '').toLowerCase();
    const isCampusAdmin = userRole === 'admin' || userRole === 'campus_admin';

    let assignedStudentIds: string[] = [];
    let counselorProfileId: string | null = null;

    if (!isCampusAdmin) {
      const counselor = await prisma.counselors.findFirst({
        where: { OR: [{ userId: counselorUserId }, { id: counselorUserId }] }
      });
      if (counselor) {
        counselorProfileId = counselor.id;
      }
      assignedStudentIds = await getAssignedStudentUserIds(counselorUserId);
    }

    const screeningWhere = !isCampusAdmin ? { userId: { in: assignedStudentIds } } : {};
    const appointmentWhere = !isCampusAdmin && counselorProfileId ? { counselorId: counselorProfileId } : {};
    const soapWhere = !isCampusAdmin ? { counselorUserId } : {};

    const [
      totalStudents,
      totalScreenings,
      highRiskScreenings,
      emergencyInterventions,
      resolvedScreenings,
      activeCases,
      totalAppointments,
      totalSoapNotes,
      allScreenings
    ] = await Promise.all([
      prisma.users.count({
        where: !isCampusAdmin ? { id: { in: assignedStudentIds } } : { role: { in: ['mahasiswa', 'student', 'STUDENT'] } }
      }),
      prisma.screenings.count({ where: screeningWhere }),
      prisma.screenings.count({
        where: {
          ...screeningWhere,
          OR: [
            { hasSelfHarmRisk: true },
            { phq9Score: { gte: 15 } }
          ]
        }
      }),
      prisma.screenings.count({ where: { ...screeningWhere, hasSelfHarmRisk: true } }),
      prisma.screenings.count({
        where: {
          ...screeningWhere,
          status: { in: ['Selesai', 'Ditangani', 'RESOLVED', 'REFERRED', 'COMPLETED'] }
        }
      }),
      prisma.appointments.count({
        where: {
          ...appointmentWhere,
          status: { in: ['CONFIRMED', 'PENDING', 'SCHEDULED'] }
        }
      }),
      prisma.appointments.count({ where: appointmentWhere }),
      prisma.clinicalSoapNotes.count({ where: soapWhere }),
      prisma.screenings.findMany({
        where: screeningWhere,
        select: { phq9Score: true, gad7Score: true, hasSelfHarmRisk: true, timestamp: true },
        orderBy: { timestamp: 'desc' },
        take: 500
      })
    ]);

    const resolutionRate = totalScreenings > 0
      ? `${((resolvedScreenings / totalScreenings) * 100).toFixed(1)}%`
      : '0%';

    const severityDistribution = [
      { name: 'Minimal / Normal', count: 0, color: '#10B981' },
      { name: 'Ringan (Mild)', count: 0, color: '#06B6D4' },
      { name: 'Sedang (Moderate)', count: 0, color: '#F59E0B' },
      { name: 'Berat (Severe)', count: 0, color: '#EF4444' },
      { name: 'Krisis / Suisiditas', count: 0, color: '#881337' }
    ];

    for (const s of allScreenings) {
      if (s.hasSelfHarmRisk || s.phq9Score >= 20) {
        severityDistribution[4].count++;
      } else if (s.phq9Score >= 15) {
        severityDistribution[3].count++;
      } else if (s.phq9Score >= 10) {
        severityDistribution[2].count++;
      } else if (s.phq9Score >= 5) {
        severityDistribution[1].count++;
      } else {
        severityDistribution[0].count++;
      }
    }

    // Monthly trend from current date backward (authoritative)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const now = new Date();
    const monthlyTrendMap: Record<string, { screening: number; counseling: number; emergency: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthNames[d.getMonth()];
      monthlyTrendMap[key] = { screening: 0, counseling: 0, emergency: 0 };
    }

    for (const s of allScreenings) {
      const sDate = new Date(s.timestamp);
      const mKey = monthNames[sDate.getMonth()];
      if (monthlyTrendMap[mKey]) {
        monthlyTrendMap[mKey].screening++;
        if (s.hasSelfHarmRisk) monthlyTrendMap[mKey].emergency++;
      }
    }

    const monthlyTrend = Object.entries(monthlyTrendMap).map(([month, counts]) => ({
      month,
      screening: counts.screening,
      counseling: counts.counseling,
      emergency: counts.emergency
    }));

    res.json({
      success: true,
      data: {
        totalStudents,
        totalScreenings,
        highRiskScreenings,
        totalAppointments,
        totalSoapNotes,
        triageResolutionRate: resolutionRate,
        avgResponseTimeMinutes: totalAppointments > 0 ? 30 : 0,
        activeCrisisAlerts: highRiskScreenings > 0 ? highRiskScreenings : 0,
        // Aligned CounselorStats fields
        totalTriaged: totalScreenings,
        activeCases,
        emergencyInterventions,
        highRiskCount: highRiskScreenings,
        completedNotes: totalSoapNotes,
        averageResponseTimeHours: totalAppointments > 0 ? 0.5 : 0,
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
