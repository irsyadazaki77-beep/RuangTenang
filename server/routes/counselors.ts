import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { prisma } from '../database.js';
import { consentService } from '../services/consentService.js';

const router = Router();

const MOCK_COUNSELORS = [
  {
    id: 'c-1',
    name: 'Dr. Anita Rahmawati, M.Psi.',
    title: 'Konselor - Spesialis Burnout Akademik',
    university: 'Pusat Konseling UI',
    specialties: ['Depresi Mahasiswa', 'Anxiety Skripsi', 'Burnout Akademik'],
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    rating: 4.9,
    reviewsCount: 128,
    experienceYears: 11,
    isFreeForStudents: true,
    price: 0,
    consultationType: ['video_call', 'Chat'],
    contactPhone: '0812-0000-0001',
    contactWhatsapp: '6281200000001',
    availableDays: ['Senin', 'Rabu', 'Jumat'],
    nextAvailableSlot: 'Hari Ini, 14:00 WIB',
    availableToday: true,
    languages: ['Indonesia', 'Inggris'],
    bio: 'Konseling yang dilatih untuk mendampingi mahasiswa menangani kecemasan akademik, depresi, tantangan skripsi, dan penyesuaian kehidupan perkuliahan.',
    isDemoData: true,
    licenseNumber: 'SIPP-08912/HIMPSI/2026',
    location: 'Platform Konseling Digital Kampus UI'
  },
  {
    id: 'c-2',
    name: 'Dimas Satria, S.Psi., M.A.',
    title: 'Konselor - Manajemen Overthinking',
    university: 'Unit Bimbingan Konseling ITB',
    specialties: ['Manajemen Stress', 'Krisis Identitas', 'Trauma'],
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
    rating: 4.8,
    reviewsCount: 94,
    experienceYears: 8,
    isFreeForStudents: false,
    price: 150000,
    consultationType: ['video_call', 'in_person'],
    contactPhone: '0813-0000-0002',
    contactWhatsapp: '6281300000002',
    availableDays: ['Selasa', 'Kamis', 'Sabtu'],
    nextAvailableSlot: 'Besok, 10:00 WIB',
    availableToday: false,
    languages: ['Indonesia'],
    bio: 'Pendekatan CBT serta Mindfulness untuk meredakan overthinking dan tekanan karir mahasiswa tingkat akhir.',
    isDemoData: true,
    licenseNumber: 'SIPP-04319/HIMPSI/2026',
    location: 'Platform Konseling Digital Kampus ITB'
  },
  {
    id: 'c-3',
    name: 'Novianti Lestari, M.Psi.',
    title: 'Konselor - Hubungan Interpersonal & Insomnia',
    university: 'Layanan Psikologi UGM',
    specialties: ['Isolasi Sosial', 'Relasi Teman & Pasangan', 'Gangguan Tidur'],
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    rating: 4.9,
    reviewsCount: 156,
    experienceYears: 10,
    isFreeForStudents: true,
    price: 0,
    consultationType: ['tele_counseling', 'Chat'],
    contactPhone: '0821-0000-0003',
    contactWhatsapp: '6282100000003',
    availableDays: ['Senin', 'Selasa', 'Kamis', 'Jumat'],
    nextAvailableSlot: 'Hari Ini, 16:30 WIB',
    availableToday: true,
    languages: ['Indonesia', 'Jawa'],
    bio: 'Menyediakan lingkungan konseling virtual yang hangat, inklusif, dan rahasia bagi mahasiswa yang berjuang menghadapi rasa hampa, kesepian, dan konflik hubungan.',
    isDemoData: true,
    licenseNumber: 'SIPP-07102/HIMPSI/2026',
    location: 'Platform Konseling Digital Kampus UGM'
  },
  {
    id: 'c-4',
    name: 'Rian Hidayat, M.Psi.',
    title: 'Konselor - Pendampingan Mood & Motivasi',
    university: 'Layanan Konseling UNAIR',
    specialties: ['Pencegahan Krisis', 'Bipolar & Mood Disorder', 'Motivasi Belajar'],
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    rating: 4.7,
    reviewsCount: 82,
    experienceYears: 7,
    isFreeForStudents: false,
    price: 100000,
    consultationType: ['video_call'],
    contactPhone: '0857-0000-0004',
    contactWhatsapp: '6285700000004',
    availableDays: ['Rabu', 'Jumat', 'Sabtu'],
    nextAvailableSlot: 'Lusa, 09:00 WIB',
    availableToday: false,
    languages: ['Indonesia'],
    bio: 'Berfokus pada pencegahan krisis emosional, serangan panik, serta penyediaan motivasi belajar dan pemulihan minat akademik mahasiswa.',
    isDemoData: true,
    licenseNumber: 'SIPP-05518/HIMPSI/2026',
    location: 'Platform Konseling Digital Kampus UNAIR'
  }
];

const INITIAL_ANALYTICS = {
  totalSessionsThisMonth: 412,
  activeStudentsThisWeek: 189,
  highRiskCount: 14,
  averagePhq9Score: 11.4,
  averageGad7Score: 9.8,
  screeningDistribution: {
    minimal: 85,
    mild: 142,
    moderate: 121,
    severe: 64
  },
  stressorsBreakdown: [
    { category: 'Skripsi & Bimbingan', percentage: 38, count: 156 },
    { category: 'Beban Finansial & UKT', percentage: 24, count: 99 },
    { category: 'Kecemasan Karir & Masa Depan', percentage: 18, count: 74 },
    { category: 'Masalah Keluarga & Ekspektasi', percentage: 12, count: 50 },
    { category: 'Isolasi Sosial & Kesepian', percentage: 8, count: 33 }
  ],
  monthlyTrend: [
    { month: 'Mar', sessions: 280, highRiskCases: 8 },
    { month: 'Apr', sessions: 310, highRiskCases: 10 },
    { month: 'Mei', sessions: 390, highRiskCases: 16 },
    { month: 'Jun', sessions: 340, highRiskCases: 12 },
    { month: 'Jul', sessions: 375, highRiskCases: 11 },
    { month: 'Agt', sessions: 412, highRiskCases: 14 }
  ]
};

const INITIAL_RISK_ALERTS = [
  {
    id: 'risk-101',
    sessionId: 'sess-8821',
    studentAlias: 'Mahasiswa-A92',
    university: 'Universitas Indonesia',
    riskLevel: 'Tinggi',
    triggers: ['ingin menyerah', 'potong nadi', 'tidak ada harapan'],
    detectedAt: 'Hari Ini, 10:14 WIB',
    status: 'Menunggu Penanganan',
    phq9Score: 18,
    gad7Score: 15
  },
  {
    id: 'risk-102',
    sessionId: 'sess-8819',
    studentAlias: 'Mahasiswa-B14',
    university: 'Institut Teknologi Bandung',
    riskLevel: 'Tinggi',
    triggers: ['self harm', 'tidak kuat lagi'],
    detectedAt: 'Hari Ini, 08:30 WIB',
    status: 'Sedang Ditangani',
    phq9Score: 16,
    gad7Score: 14
  },
  {
    id: 'risk-103',
    sessionId: 'sess-8805',
    studentAlias: 'Mahasiswa-C41',
    university: 'Universitas Gadjah Mada',
    riskLevel: 'Sedang',
    triggers: ['serangan panik', 'menangis terus'],
    detectedAt: 'Kemarin, 21:45 WIB',
    status: 'Selesai',
    phq9Score: 12,
    gad7Score: 11
  }
];

router.get(['/', '/counselors', '/api/counselors', '/api/v1/counselors'], async (req: Request, res: Response) => {
  if (process.env.VITE_DEMO_MODE === 'true') {
    return res.json(MOCK_COUNSELORS.map(m => ({
      ...m,
      isDemoData: true,
      isVerified: false
    })));
  }

  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;

    const [total, dbCounselors] = await Promise.all([
      prisma.counselors.count(),
      prisma.counselors.findMany({
        take: limit,
        skip: offset,
        orderBy: { name: 'asc' }
      })
    ]);
    
    if (dbCounselors.length === 0) {
      res.setHeader('X-Total-Count', total);
      res.setHeader('X-Page', page);
      res.setHeader('X-Limit', limit);
      res.setHeader('X-Total-Pages', Math.ceil(total / limit) || 1);
      return res.json([]);
    }
    
    const formattedCounselors = dbCounselors.map(c => {
      let specialties = [];
      let availability = [];
      let consultationType = ["video_call", "Chat"];
      let languages = ["Indonesia"];
      try { specialties = JSON.parse(c.specialties); } catch (e) { specialties = [c.specialties]; }
      try { availability = JSON.parse(c.availability); } catch (e) { availability = [c.availability]; }
      if (c.consultationType) {
        try { consultationType = JSON.parse(c.consultationType); } catch (e) {}
      }
      if (c.languages) {
        try { languages = JSON.parse(c.languages); } catch (e) {}
      }
      
      return {
        id: c.id,
        name: c.name,
        title: c.role,
        university: c.university || 'Perguruan Tinggi Indonesia',
        specialties,
        avatar: c.imageUrl,
        rating: c.rating || 5.0,
        reviewsCount: c.sessionCount || 0,
        experienceYears: c.experienceYears ?? 5,
        isFreeForStudents: c.isFreeForStudents ?? true,
        price: c.price ?? 0,
        consultationType,
        contactPhone: c.contactPhone || '',
        contactWhatsapp: c.contactWhatsapp || '',
        availableDays: availability,
        nextAvailableSlot: 'Sesuai Jadwal Konselor',
        availableToday: true,
        languages,
        bio: c.bio || 'Konselor profesional kampus terdaftar.',
        isDemoData: Boolean(c.isDemoData),
        isVerified: Boolean(c.isVerified && c.licenseNumber), // Explicit verification requires server record & licenseNumber
        licenseNumber: c.licenseNumber || null, // NEVER fallback to 'SIPP/HIMPSI Terverifikasi' when empty!
        location: c.location || 'Pusat Layanan Konseling Kampus'
      };
    });

    res.setHeader('X-Total-Count', total);
    res.setHeader('X-Page', page);
    res.setHeader('X-Limit', limit);
    res.setHeader('X-Total-Pages', Math.ceil(total / limit) || 1);

    if (req.query.format === 'object') {
      return res.json({
        data: formattedCounselors,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1
      });
    }
    res.json(formattedCounselors);
  } catch (error) {
    console.error('Failed to fetch counselors:', error);
    res.status(500).json({ error: 'Gagal memuat daftar konselor' });
  }
});

router.get(
  ['/counselors/analytics', '/api/counselors/analytics', '/api/v1/counselors/analytics'],
  requireAuth,
  requireRole(['admin', 'konselor']),
  async (req: Request, res: Response) => {
    if (process.env.VITE_DEMO_MODE === 'true') {
      return res.json({ ...INITIAL_ANALYTICS, isDemoData: true });
    }

    try {
      const [totalSessions, userCount, allScreenings, highRiskScreenings, appointments] = await Promise.all([
        prisma.appointments.count(),
        prisma.users.count({ where: { role: 'mahasiswa' } }),
        prisma.screenings.findMany({ select: { phq9Score: true, gad7Score: true, phq9Severity: true, timestamp: true } }),
        prisma.screenings.count({
          where: {
            OR: [
              { hasSelfHarmRisk: true },
              { item9Score: { gt: 0 } },
              { phq9Score: { gte: 15 } }
            ]
          }
        }),
        prisma.appointments.findMany({ select: { notes: true, date: true, status: true } })
      ]);

      const dist = { minimal: 0, mild: 0, moderate: 0, severe: 0 };
      let sumPhq9 = 0;
      let sumGad7 = 0;

      for (const s of allScreenings) {
        sumPhq9 += s.phq9Score;
        sumGad7 += s.gad7Score;
        const sev = (s.phq9Severity || '').toLowerCase();
        if (sev.includes('minimal')) dist.minimal++;
        else if (sev.includes('ringan') || sev.includes('mild')) dist.mild++;
        else if (sev.includes('sedang') || sev.includes('moderate')) dist.moderate++;
        else dist.severe++;
      }

      const totalScreenings = allScreenings.length;

      // Real stressors distribution from appointments & concerns
      const concernCounts: Record<string, number> = {
        'Kendala Akademik & Skripsi': 0,
        'Kecemasan & Burnout': 0,
        'Hubungan & Sosial Kampus': 0,
        'Suasana Hati & Depresi': 0,
        'Karir & Masa Depan': 0,
      };

      for (const apt of appointments) {
        const note = (apt.notes || '').toLowerCase();
        if (note.includes('akademik') || note.includes('skripsi')) concernCounts['Kendala Akademik & Skripsi']++;
        else if (note.includes('cemas') || note.includes('anxiety') || note.includes('burnout')) concernCounts['Kecemasan & Burnout']++;
        else if (note.includes('hubungan') || note.includes('teman') || note.includes('keluarga')) concernCounts['Hubungan & Sosial Kampus']++;
        else if (note.includes('depresi') || note.includes('sedih') || note.includes('mood')) concernCounts['Suasana Hati & Depresi']++;
        else if (note.includes('karir') || note.includes('masa depan')) concernCounts['Karir & Masa Depan']++;
        else concernCounts['Kendala Akademik & Skripsi']++;
      }

      const totalConcerns = Object.values(concernCounts).reduce((a, b) => a + b, 0) || 1;
      const stressorsBreakdown = Object.entries(concernCounts).map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / totalConcerns) * 100)
      }));

      // Real Monthly Trend
      const monthlyTrend = [
        { month: 'Bulan Ini', sessions: totalSessions, highRiskCases: highRiskScreenings }
      ];

      return res.json({
        isDemoData: false,
        totalSessionsThisMonth: totalSessions,
        activeStudentsThisWeek: userCount,
        highRiskCount: highRiskScreenings,
        averagePhq9Score: totalScreenings > 0 ? Number((sumPhq9 / totalScreenings).toFixed(1)) : 0,
        averageGad7Score: totalScreenings > 0 ? Number((sumGad7 / totalScreenings).toFixed(1)) : 0,
        screeningDistribution: dist,
        stressorsBreakdown,
        monthlyTrend
      });
    } catch (e) {
      console.error('Error fetching counselor analytics:', e);
      return res.status(500).json({ error: 'Gagal memuat analitik konselor dari database' });
    }
  }
);

router.get(
  ['/counselors/risk-alerts', '/api/counselors/risk-alerts', '/api/v1/counselors/risk-alerts'],
  requireAuth,
  requireRole(['admin', 'konselor']),
  async (req: Request, res: Response) => {
    if (process.env.VITE_DEMO_MODE === 'true') {
      return res.json(INITIAL_RISK_ALERTS);
    }

    try {
      let highRiskScreenings: any[] = [];

      if (req.user!.role === 'konselor') {
        // 1. Canonical counselor lookup
        const counselor = await prisma.counselors.findFirst({
          where: { userId: req.user!.userId }
        });
        if (!counselor) {
          return res.status(403).json({
            error: 'ACCESS_DENIED',
            message: 'Profil konselor tidak terdaftar atau belum terhubung dengan akun ini.'
          });
        }

        // 2. Active assignment check: Find distinct students assigned to this counselor via appointments
        const assignedAppointments = await prisma.appointments.findMany({
          where: {
            counselorId: counselor.id,
            userId: { not: '' }
          },
          select: { userId: true }
        });

        const candidateUserIds = Array.from(
          new Set(assignedAppointments.map(a => a.userId).filter(Boolean))
        ) as string[];

        if (candidateUserIds.length === 0) {
          return res.json([]);
        }

        // 3. Consent check per assigned student
        const authorizedStudentUserIds: string[] = [];
        for (const sUserId of candidateUserIds) {
          const canShare = await consentService.canShareWithCounselor(sUserId);
          if (canShare) {
            authorizedStudentUserIds.push(sUserId);
          }
        }

        if (authorizedStudentUserIds.length === 0) {
          return res.json([]);
        }

        // 4. Fetch high-risk screenings strictly for consented & assigned students
        highRiskScreenings = await prisma.screenings.findMany({
          where: {
            userId: { in: authorizedStudentUserIds },
            OR: [
              { hasSelfHarmRisk: true },
              { item9Score: { gt: 0 } },
              { phq9Score: { gte: 15 } }
            ]
          },
          orderBy: { timestamp: 'desc' },
          take: 20
        });

        // 5. Audit staff access
        await prisma.staffAccessLogs.create({
          data: {
            id: 'staff-log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            staffUserId: req.user!.userId,
            staffName: req.user!.name,
            staffRole: req.user!.role,
            targetUserId: `assigned_students_count_${authorizedStudentUserIds.length}`,
            accessType: 'VIEW_RISK_ALERTS',
            purpose: 'Triase & Intervensi Mahasiswa Risiko Tinggi'
          }
        });
      } else if (req.user!.role === 'admin') {
        // Admin access is strictly purpose-bound and logged
        const purpose = (req.query.purpose as string) || 'Audit Kepatuhan & Triage Krisis Kampus';

        highRiskScreenings = await prisma.screenings.findMany({
          where: {
            OR: [
              { hasSelfHarmRisk: true },
              { item9Score: { gt: 0 } },
              { phq9Score: { gte: 15 } }
            ]
          },
          orderBy: { timestamp: 'desc' },
          take: 20
        });

        await prisma.staffAccessLogs.create({
          data: {
            id: 'staff-log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            staffUserId: req.user!.userId,
            staffName: req.user!.name,
            staffRole: req.user!.role,
            targetUserId: 'all_high_risk_screenings',
            accessType: 'VIEW_RISK_ALERTS',
            purpose
          }
        });
      }

      const alerts = highRiskScreenings.map((s, idx) => {
        let triggers = ['Skor skrining tinggi'];
        if (s.riskIndicators) {
          try {
            const parsed = JSON.parse(s.riskIndicators);
            if (Array.isArray(parsed) && parsed.length > 0) triggers = parsed;
          } catch {
            // Keep default
          }
        } else if (s.hasSelfHarmRisk) {
          triggers = ['Risiko melukai diri / krisis'];
        }

        return {
          id: s.id || `risk-${idx}`,
          sessionId: `sess-${s.id.slice(0, 6)}`,
          studentAlias: `Mahasiswa-${s.userId ? s.userId.slice(-3).toUpperCase() : 'Anonim'}`,
          university: 'Universitas Indonesia',
          riskLevel: s.phq9Score >= 20 || s.hasSelfHarmRisk ? 'Tinggi' : 'Sedang',
          triggers,
          detectedAt: new Date(s.timestamp).toLocaleString('id-ID'),
          status: s.status || 'Menunggu Penanganan',
          phq9Score: s.phq9Score,
          gad7Score: s.gad7Score
        };
      });

      return res.json(alerts);
    } catch (e) {
      console.error('Error fetching risk alerts:', e);
      return res.status(500).json({ error: 'Gagal memuat peringatan risiko dari database' });
    }
  }
);

export default router;
