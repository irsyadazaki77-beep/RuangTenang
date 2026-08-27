/**
 * RuangTenang Canonical Data Classification & Privacy Specification
 * Complies with UU Perlindungan Data Pribadi (UU PDP No. 27/2022) & GDPR Principles
 */

export enum DataClassification {
  PUBLIC = 'PUBLIC',                         // Non-sensitive data accessible to any user
  INTERNAL = 'INTERNAL',                     // System operational metadata, counters, non-identifying IDs
  PII = 'PII',                               // Personally Identifiable Information (Name, University, IP)
  SENSITIVE_PII = 'SENSITIVE_PII',           // High-risk PII (NIM, Phone Number, Emergency Contact)
  MENTAL_HEALTH_DATA = 'MENTAL_HEALTH_DATA', // Clinical records, screening scores, crisis indicators, mood logs
  SECURITY_SECRET = 'SECURITY_SECRET',       // Password hashes, session tokens, MFA secrets, encryption keys
}

export interface FieldPrivacyPolicy {
  classification: DataClassification;
  encryptedAtRest: boolean;
  retentionCategory: 'account_lifetime' | 'user_configured' | 'transient' | 'legal_audit';
  purpose: string;
  allowedRoles: Array<'mahasiswa' | 'konselor' | 'admin' | 'system'>;
}

export const SCHEMA_DATA_CLASSIFICATION: Record<string, Record<string, FieldPrivacyPolicy>> = {
  Users: {
    id: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'account_lifetime', purpose: 'Primary subject identifier', allowedRoles: ['mahasiswa', 'konselor', 'admin', 'system'] },
    name: { classification: DataClassification.PII, encryptedAtRest: false, retentionCategory: 'account_lifetime', purpose: 'User greeting & identification', allowedRoles: ['mahasiswa', 'konselor', 'admin', 'system'] },
    email: { classification: DataClassification.PII, encryptedAtRest: false, retentionCategory: 'account_lifetime', purpose: 'Account authentication & notifications', allowedRoles: ['mahasiswa', 'admin', 'system'] },
    passwordHash: { classification: DataClassification.SECURITY_SECRET, encryptedAtRest: true, retentionCategory: 'account_lifetime', purpose: 'Bcrypt credentials verification', allowedRoles: ['system'] },
    role: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'account_lifetime', purpose: 'Role-based access control', allowedRoles: ['mahasiswa', 'konselor', 'admin', 'system'] },
    tier: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'account_lifetime', purpose: 'Subscription tier level', allowedRoles: ['mahasiswa', 'admin', 'system'] },
    university: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'account_lifetime', purpose: 'Campus institutional affinity', allowedRoles: ['mahasiswa', 'konselor', 'admin', 'system'] },
    emailVerified: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'account_lifetime', purpose: 'Email verification status', allowedRoles: ['mahasiswa', 'admin', 'system'] },
    emailVerificationCode: { classification: DataClassification.SECURITY_SECRET, encryptedAtRest: true, retentionCategory: 'transient', purpose: 'Hashed email OTP', allowedRoles: ['system'] },
    passwordResetToken: { classification: DataClassification.SECURITY_SECRET, encryptedAtRest: true, retentionCategory: 'transient', purpose: 'Hashed password reset credential', allowedRoles: ['system'] },
    failedLoginAttempts: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'transient', purpose: 'Brute-force mitigation tracking', allowedRoles: ['system'] },
    lockUntil: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'transient', purpose: 'Temporary account lockout window', allowedRoles: ['system'] },
    mfaEnabled: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'account_lifetime', purpose: '2FA activation state', allowedRoles: ['mahasiswa', 'konselor', 'admin', 'system'] },
    mfaCode: { classification: DataClassification.SECURITY_SECRET, encryptedAtRest: true, retentionCategory: 'transient', purpose: 'Hashed 2FA OTP verification code', allowedRoles: ['system'] },
    mfaToken: { classification: DataClassification.SECURITY_SECRET, encryptedAtRest: true, retentionCategory: 'transient', purpose: 'Hashed 2FA challenge identifier', allowedRoles: ['system'] },
  },

  Appointments: {
    id: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'user_configured', purpose: 'Appointment identifier', allowedRoles: ['mahasiswa', 'konselor', 'admin', 'system'] },
    counselorId: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'user_configured', purpose: 'Assigned counselor link', allowedRoles: ['mahasiswa', 'konselor', 'admin', 'system'] },
    counselorName: { classification: DataClassification.PUBLIC, encryptedAtRest: false, retentionCategory: 'user_configured', purpose: 'Display counselor identity', allowedRoles: ['mahasiswa', 'konselor', 'admin', 'system'] },
    date: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'user_configured', purpose: 'Scheduled session date', allowedRoles: ['mahasiswa', 'konselor', 'admin', 'system'] },
    time: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'user_configured', purpose: 'Scheduled session time', allowedRoles: ['mahasiswa', 'konselor', 'admin', 'system'] },
    timezone: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'user_configured', purpose: 'Timezone standardization', allowedRoles: ['mahasiswa', 'konselor', 'admin', 'system'] },
    notes: { classification: DataClassification.MENTAL_HEALTH_DATA, encryptedAtRest: true, retentionCategory: 'user_configured', purpose: 'Consultation intake clinical notes', allowedRoles: ['mahasiswa', 'konselor', 'system'] },
    status: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'user_configured', purpose: 'Booking workflow status', allowedRoles: ['mahasiswa', 'konselor', 'admin', 'system'] },
    approvalStatus: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'user_configured', purpose: 'Counselor triage approval', allowedRoles: ['mahasiswa', 'konselor', 'admin', 'system'] },
    attendanceStatus: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'user_configured', purpose: 'Session attendance tracking', allowedRoles: ['mahasiswa', 'konselor', 'admin', 'system'] },
    meetingLink: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'user_configured', purpose: 'Virtual video call room URL', allowedRoles: ['mahasiswa', 'konselor', 'system'] },
    mode: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'user_configured', purpose: 'Counseling mode (Virtual/Offline)', allowedRoles: ['mahasiswa', 'konselor', 'admin', 'system'] },
    userId: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'user_configured', purpose: 'Student account link', allowedRoles: ['mahasiswa', 'konselor', 'admin', 'system'] },
    studentName: { classification: DataClassification.PII, encryptedAtRest: false, retentionCategory: 'user_configured', purpose: 'Student display name for counselor', allowedRoles: ['mahasiswa', 'konselor', 'system'] },
    studentNIM: { classification: DataClassification.SENSITIVE_PII, encryptedAtRest: true, retentionCategory: 'user_configured', purpose: 'Encrypted academic student ID', allowedRoles: ['mahasiswa', 'konselor', 'system'] },
    studentEmail: { classification: DataClassification.SENSITIVE_PII, encryptedAtRest: true, retentionCategory: 'user_configured', purpose: 'Encrypted student contact email', allowedRoles: ['mahasiswa', 'konselor', 'system'] },
  },

  Screenings: {
    id: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'user_configured', purpose: 'Screening evaluation ID', allowedRoles: ['mahasiswa', 'konselor', 'system'] },
    phq9Score: { classification: DataClassification.MENTAL_HEALTH_DATA, encryptedAtRest: false, retentionCategory: 'user_configured', purpose: 'Aggregated depression metric for triage', allowedRoles: ['mahasiswa', 'konselor', 'system'] },
    gad7Score: { classification: DataClassification.MENTAL_HEALTH_DATA, encryptedAtRest: false, retentionCategory: 'user_configured', purpose: 'Aggregated anxiety metric for triage', allowedRoles: ['mahasiswa', 'konselor', 'system'] },
    phq9Severity: { classification: DataClassification.MENTAL_HEALTH_DATA, encryptedAtRest: false, retentionCategory: 'user_configured', purpose: 'Depression clinical severity tier', allowedRoles: ['mahasiswa', 'konselor', 'system'] },
    gad7Severity: { classification: DataClassification.MENTAL_HEALTH_DATA, encryptedAtRest: false, retentionCategory: 'user_configured', purpose: 'Anxiety clinical severity tier', allowedRoles: ['mahasiswa', 'konselor', 'system'] },
    item9Score: { classification: DataClassification.MENTAL_HEALTH_DATA, encryptedAtRest: false, retentionCategory: 'user_configured', purpose: 'Self-harm indicator triage value', allowedRoles: ['mahasiswa', 'konselor', 'system'] },
    hasSelfHarmRisk: { classification: DataClassification.MENTAL_HEALTH_DATA, encryptedAtRest: false, retentionCategory: 'user_configured', purpose: 'Emergency trigger indicator', allowedRoles: ['mahasiswa', 'konselor', 'system'] },
    riskLevel: { classification: DataClassification.MENTAL_HEALTH_DATA, encryptedAtRest: false, retentionCategory: 'user_configured', purpose: 'Overall urgency classification', allowedRoles: ['mahasiswa', 'konselor', 'system'] },
    riskIndicators: { classification: DataClassification.MENTAL_HEALTH_DATA, encryptedAtRest: true, retentionCategory: 'user_configured', purpose: 'Encrypted textual clinical indicators', allowedRoles: ['mahasiswa', 'konselor', 'system'] },
    status: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'user_configured', purpose: 'Clinical handling status', allowedRoles: ['mahasiswa', 'konselor', 'system'] },
    userId: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'user_configured', purpose: 'Student account link', allowedRoles: ['mahasiswa', 'konselor', 'system'] },
  },

  EmergencyContacts: {
    userId: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'account_lifetime', purpose: 'User relationship link', allowedRoles: ['mahasiswa', 'system'] },
    name: { classification: DataClassification.PII, encryptedAtRest: true, retentionCategory: 'account_lifetime', purpose: 'Encrypted emergency contact name', allowedRoles: ['mahasiswa', 'system'] },
    relationship: { classification: DataClassification.PII, encryptedAtRest: true, retentionCategory: 'account_lifetime', purpose: 'Encrypted relationship type', allowedRoles: ['mahasiswa', 'system'] },
    phone: { classification: DataClassification.SENSITIVE_PII, encryptedAtRest: true, retentionCategory: 'account_lifetime', purpose: 'Encrypted emergency phone number', allowedRoles: ['mahasiswa', 'system'] },
    whatsapp: { classification: DataClassification.SENSITIVE_PII, encryptedAtRest: true, retentionCategory: 'account_lifetime', purpose: 'Encrypted emergency WhatsApp', allowedRoles: ['mahasiswa', 'system'] },
    hasConsent: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'account_lifetime', purpose: 'Emergency dispatch consent', allowedRoles: ['mahasiswa', 'system'] },
  },

  MoodLogs: {
    id: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'user_configured', purpose: 'Mood entry ID', allowedRoles: ['mahasiswa', 'system'] },
    userId: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'user_configured', purpose: 'User account link', allowedRoles: ['mahasiswa', 'system'] },
    mood: { classification: DataClassification.MENTAL_HEALTH_DATA, encryptedAtRest: false, retentionCategory: 'user_configured', purpose: 'Primary mood category', allowedRoles: ['mahasiswa', 'system'] },
    notes: { classification: DataClassification.MENTAL_HEALTH_DATA, encryptedAtRest: true, retentionCategory: 'user_configured', purpose: 'Encrypted reflective journal notes', allowedRoles: ['mahasiswa', 'system'] },
    intensity: { classification: DataClassification.MENTAL_HEALTH_DATA, encryptedAtRest: false, retentionCategory: 'user_configured', purpose: 'Subjective intensity 1-10', allowedRoles: ['mahasiswa', 'system'] },
    factors: { classification: DataClassification.MENTAL_HEALTH_DATA, encryptedAtRest: true, retentionCategory: 'user_configured', purpose: 'Encrypted mood trigger factors', allowedRoles: ['mahasiswa', 'system'] },
  },

  Chats: {
    id: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'user_configured', purpose: 'Conversation thread ID', allowedRoles: ['mahasiswa', 'system'] },
    userId: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'user_configured', purpose: 'User account link', allowedRoles: ['mahasiswa', 'system'] },
    title: { classification: DataClassification.MENTAL_HEALTH_DATA, encryptedAtRest: true, retentionCategory: 'user_configured', purpose: 'Encrypted thread title', allowedRoles: ['mahasiswa', 'system'] },
  },

  ChatMessages: {
    id: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'user_configured', purpose: 'Message identifier', allowedRoles: ['mahasiswa', 'system'] },
    chatId: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'user_configured', purpose: 'Chat parent thread link', allowedRoles: ['mahasiswa', 'system'] },
    role: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'user_configured', purpose: 'Speaker role (user/assistant)', allowedRoles: ['mahasiswa', 'system'] },
    content: { classification: DataClassification.MENTAL_HEALTH_DATA, encryptedAtRest: true, retentionCategory: 'user_configured', purpose: 'Encrypted conversation message content', allowedRoles: ['mahasiswa', 'system'] },
  },

  UserMemories: {
    id: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'user_configured', purpose: 'Memory identifier', allowedRoles: ['mahasiswa', 'system'] },
    userId: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'user_configured', purpose: 'User account link', allowedRoles: ['mahasiswa', 'system'] },
    content: { classification: DataClassification.MENTAL_HEALTH_DATA, encryptedAtRest: true, retentionCategory: 'user_configured', purpose: 'Encrypted personalized AI context memory', allowedRoles: ['mahasiswa', 'system'] },
  },

  AuditLogs: {
    id: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'legal_audit', purpose: 'Audit event identifier', allowedRoles: ['admin', 'system'] },
    action: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'legal_audit', purpose: 'Action classification tag', allowedRoles: ['admin', 'system'] },
    details: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'legal_audit', purpose: 'Sanitized non-PII description', allowedRoles: ['admin', 'system'] },
    ipHash: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'legal_audit', purpose: 'Pseudonymized SHA-256 IP hash', allowedRoles: ['admin', 'system'] },
    userRole: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'legal_audit', purpose: 'Role at time of audit event', allowedRoles: ['admin', 'system'] },
  },

  DataErasureRequests: {
    id: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'legal_audit', purpose: 'GDPR/PDP Erasure request ID', allowedRoles: ['admin', 'system'] },
    userId: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'legal_audit', purpose: 'Pseudonymized subject ID', allowedRoles: ['admin', 'system'] },
    userEmail: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'legal_audit', purpose: 'Hashed verification identifier', allowedRoles: ['admin', 'system'] },
    status: { classification: DataClassification.INTERNAL, encryptedAtRest: false, retentionCategory: 'legal_audit', purpose: 'Erasure execution state', allowedRoles: ['admin', 'system'] },
  },
};

export const DATA_CLASSIFICATION = SCHEMA_DATA_CLASSIFICATION;

