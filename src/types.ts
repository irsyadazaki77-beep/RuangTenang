export type MessageRole = "user" | "assistant" | "system";

export type UserRole = "guest" | "mahasiswa" | "konselor" | "admin";

export type SubscriptionTier = "Free" | "Pro" | "Developer";

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tier: SubscriptionTier;
  usageStats: {
    chatMessagesSent: number;
    appointmentsBooked: number;
  };
  university?: string;
  token?: string;
  isDemo?: boolean;
}

export const TIER_LIMITS = {
  Free: {
    chatMessages: 20,
    appointments: 2,
  },
  Pro: {
    chatMessages: 50,
    appointments: 5,
  },
  Developer: {
    chatMessages: Infinity,
    appointments: Infinity,
  },
};

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  isCrisisAlert?: boolean;
  sentimentScore?: "normal" | "distress" | "crisis";
  requiresSafetyQuestion?: boolean;
  status?: "sending" | "saved_local" | "synced" | "error";
}

export interface Counselor {
  id: string;
  name: string;
  title: string;
  university: string;
  specialties: string[];
  avatar: string;
  rating: number;
  reviewsCount: number;
  experienceYears: number;
  isFreeForStudents: boolean;
  price?: number;
  consultationType: ("video_call" | "tele_counseling" | "Chat" | "in_person")[];
  contactPhone: string;
  contactWhatsapp: string;
  availableDays: string[];
  nextAvailableSlot: string;
  availableToday?: boolean;
  languages?: string[];
  bio: string;
  isDemoData: boolean;
  licenseNumber: string;
  location: string;
}

export interface VerifiedHelpline {
  id: string;
  name: string;
  number: string;
  desc: string;
  type: string;
  badge: string;
  jamOperasional: string;
  wilayahLayanan: string;
  tanggalPembaruan: string;
  catatanVerifikasi: string;
  sourceUrl?: string;
  verifiedAt?: string;
  reviewDueAt?: string;
  availabilityStatus?: 'ACTIVE' | 'INACTIVE' | 'UNVERIFIED';
  geographicScope?: string;
  isVerifiedProduction?: boolean;
}

export interface Appointment {
  id: string;
  counselorId: string;
  counselorName: string;
  counselorTitle: string;
  counselorAvatar: string;
  studentName: string;
  studentNIM?: string;
  studentEmail: string;
  studentPhone: string;
  date: string;
  timeSlot: string;
  timezone?: "WIB" | "WITA" | "WIT";
  mode: "video_call" | "tele_counseling";
  primaryConcern: string;
  status:
    | "Menunggu Konfirmasi"
    | "Konfirmasi"
    | "Berjalan"
    | "Selesai"
    | "Dibatalkan"
    | "Ditolak";
  approvalStatus?: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  attendanceStatus?:
    "SCHEDULED" | "ATTENDED" | "NO_SHOW" | "CANCELLED" | "RESCHEDULED";
  meetingLink?: string;
  notes?: string;
  reminderEnabled: boolean;
  reminderMinutesBefore: number;
  createdAt: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  whatsapp: string;
  hasConsent: boolean;
  consentDate?: string;
}

export interface SafetyPlan {
  warningSigns: string[];
  copingStrategies: string[];
  safeContacts: { name: string; phone: string }[];
  professionalHelplines: { name: string; phone: string }[];
  safeEnvironmentSteps: string[];
}

export interface RiskAlert {
  id: string;
  sessionId: string;
  studentAlias: string;
  university: string;
  riskLevel: "Tinggi" | "Sedang" | "Rendah";
  triggers: string[];
  detectedAt: string;
  status: "Menunggu Penanganan" | "Sedang Ditangani" | "Selesai";
  phq9Score?: number;
  gad7Score?: number;
}

export interface AnalyticsMetric {
  totalSessionsThisMonth: number;
  activeStudentsThisWeek: number;
  highRiskCount: number;
  averagePhq9Score: number;
  averageGad7Score: number;
  screeningDistribution: {
    minimal: number; // 0-4
    mild: number; // 5-9
    moderate: number; // 10-14
    severe: number; // 15+
  };
  stressorsBreakdown: { category: string; percentage: number; count: number }[];
  monthlyTrend: { month: string; sessions: number; highRiskCases: number }[];
}

export interface ScreeningResult {
  phq9: {
    score: number;
    severity: "Minimal" | "Ringan" | "Sedang" | "Sedang-Berat" | "Berat";
    date: string;
    item9Score?: number;
    hasSelfHarmRisk?: boolean;
  };
  gad7: {
    score: number;
    severity: "Minimal" | "Ringan" | "Sedang" | "Berat";
    date: string;
  };
  riskIndicators?: {
    item9Score: number;
    hasSelfHarmRisk: boolean;
    immediateDanger?: boolean;
    planOrIntent?: boolean;
    contactedTrustedPerson?: boolean;
    riskCategory: "KRISIS_SANGAT_TINGGI" | "RISIKO_MENYAKITI_DIRI" | "STANDAR";
    flaggedAt: string;
  };
  completedAt?: string;
}

// -------------------------------------------------------------
// Core Domain Additions (Triase, Progress, Program, Monitoring, etc.)
// -------------------------------------------------------------

export type TriageCategory = "Ringan" | "Prioritas" | "Krisis";

export interface TriageResult {
  category: TriageCategory;
  title: string;
  description: string;
  badgeColor: string;
  recommendedActions: string[];
  carePathway: "SELF_CARE" | "COUNSELOR_BOOKING" | "EMERGENCY_HOTLINE";
  evaluatedAt: string;
}

export interface ProgressTrendPoint {
  id: string;
  date: string;
  phq9Score: number;
  gad7Score: number;
  moodLevel: "Sangat Baik" | "Baik" | "Netral" | "Stres" | "Sangat Stres";
  triageCategory: TriageCategory;
  notes?: string;
}

export interface ProgramStep {
  id: string;
  title: string;
  description: string;
  type: "reflection" | "cbt" | "grounding" | "checklist";
  durationMinutes: number;
  completed: boolean;
}

export interface StructuredProgram {
  id: string;
  title: string;
  category:
    | "Manajemen Stres"
    | "Pemulihan Burnout"
    | "Kecemasan Ujian/Skripsi"
    | "Regulasi Emosi";
  description: string;
  targetAudience: string;
  steps: ProgramStep[];
  completedStepsCount: number;
  totalStepsCount: number;
  badge: string;
}

export interface CounselorSummaryConsent {
  studentId: string;
  counselorId?: string;
  consentGranted: boolean;
  shareScreeningTrends: boolean;
  shareProgramProgress: boolean;
  sharePrimaryConcern: boolean;
  grantedAt?: string;
}

export interface SystemTelemetry {
  apiLatencyMs: number;
  geminiStatus: "HEALTHY" | "DEGRADED" | "FALLBACK";
  databaseStatus: "HEALTHY" | "WARNING";
  sosFailureCount: number;
  sosSuccessCount: number;
  notificationQueueCount: number;
  notificationFailedCount: number;
  lastCheckedAt: string;
}

export interface TelemetryLog {
  id: string;
  timestamp: string;
  service:
    "SOS Gateway" | "Gemini AI API" | "Database Sync" | "Notification Engine";
  status: "SUCCESS" | "WARNING" | "FAILED";
  latencyMs: number;
  details: string;
  retryAttempt?: number;
}

export interface UsabilityFeedback {
  id: string;
  role: "mahasiswa" | "konselor";
  scenarioName: string;
  susScores: number[]; // 10 questions System Usability Scale
  overallSusScore: number;
  taskCompletionStatus: {
    taskName: string;
    success: boolean;
    timeSeconds: number;
  }[];
  comments: string;
  submittedAt: string;
}

export interface AIGovernanceTestCase {
  id: string;
  category:
    | "Ancaman Bunuh Diri"
    | "Permintaan Diagnosis Medis"
    | "Prompt Injection"
    | "Bocoran PII"
    | "Bahasa Tidak Etis";
  prompt: string;
  expectedBehavior: string;
  safetyRuleId: string;
  lastTestedStatus: "PASSED" | "FAILED" | "PENDING";
  actualAIResponse?: string;
  evaluatedAt?: string;
}

export interface MultiCampusMetrics {
  campusCode: string;
  campusName: string;
  city: string;
  totalStudentsMonitored: number;
  activeSessionsThisMonth: number;
  riskDistribution: {
    ringanPercentage: number;
    prioritasPercentage: number;
    krisisPercentage: number;
  };
  topFacultyStressors: { faculty: string; stressPercentage: number }[];
  anonymizedTrend: { month: string; avgPhq9: number; avgGad7: number }[];
}

export interface SessionReminderConfig {
  appointmentId: string;
  channels: ("EMAIL" | "SMS" | "WHATSAPP")[];
  notifyAt24h: boolean;
  notifyAt1h: boolean;
  notifyAt15m: boolean;
  lastSentAt?: string;
  status: "SCHEDULED" | "DISPATCHED" | "FAILED";
}

export interface SOSDispatchStatus {
  success: boolean;
  dispatchId: string;
  status:
    | "SENT"
    | "SIMULATED"
    | "FAILED"
    | "PENDING"
    | "SENT_TO_SERVER"
    | "DELIVERED_SIMULATED"
    | "DIRECT_CALL_ONLY"
    | "GUEST_DIRECT_CALL_ONLY";
  timestamp: string;
  recipientName?: string;
  recipientPhone?: string;
  hasUserConsent: boolean;
  message: string;
}

export interface HistoricalScore {
  id: string;
  date: string;
  phq9: number;
  gad7: number;
  label: string;
  triage: TriageCategory;
}

export interface MoodLog {
  id: string;
  date: string; // YYYY-MM-DD
  mood: number; // 1-5
  emotions: string[];
  notes: string;
  sleepHours: number;
  sleepQuality: "Nyenyak" | "Kurang Nyenyak" | "Insomnia";
}
