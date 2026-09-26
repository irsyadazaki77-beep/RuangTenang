export type RiskLevel = 'MILD' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type TriageStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REFERRED';

export interface TriageItem {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  university?: string;
  phq9Score?: number;
  phq9Severity?: string;
  gad7Score?: number;
  gad7Severity?: string;
  suicideRisk?: boolean;
  riskLevel: RiskLevel;
  status: TriageStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  notes?: string;
  createdAt: string;
  appointmentId?: string;
}

export interface SoapNote {
  id: string;
  studentId: string;
  studentName?: string;
  counselorId?: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRISIS';
  summary?: string;
  referralTarget?: string;
  followUpDate?: string;
  isEncrypted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CounselorStats {
  totalTriaged: number;
  activeCases: number;
  emergencyInterventions: number;
  highRiskCount: number;
  completedNotes: number;
  averageResponseTimeHours: number;
  severityDistribution?: Array<{ name: string; count: number; color?: string }>;
  monthlyTrend?: Array<{ month: string; screening: number; counseling: number; emergency: number }>;
}
