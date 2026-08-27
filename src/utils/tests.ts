import { analyzeMessageSentiment } from '../lib/crisisDetector';
import { calculatePhq9Severity, calculateGad7Severity, computeScreeningSummary } from './scoring';
import { appointmentBookingSchema, chatInputSchema } from '../lib/validationSchemas';

export interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

/**
 * Suite of Automated Unit Tests for RuangTenang Platform
 */
export function runAutomatedTests(): TestResult[] {
  const results: TestResult[] = [];

  // 1. Test Crisis Detector - Acute Crisis Keywords
  try {
    const acuteRes = analyzeMessageSentiment('Saya merasa ingin bunuh diri dan capek hidup');
    const passed = acuteRes.severity === 'crisis' && acuteRes.escalationPath === 'human_escalation';
    results.push({
      name: 'Crisis Detector: Deteksi Krisis Akut',
      passed,
      message: passed ? 'Berhasil mendeteksi krisis akut dan jalur eskalasi manusia' : `Gagal: ${JSON.stringify(acuteRes)}`
    });
  } catch (err: any) {
    results.push({ name: 'Crisis Detector: Deteksi Krisis Akut', passed: false, message: err.message });
  }

  // 2. Test Crisis Detector - Negation Handling
  try {
    const negatedRes = analyzeMessageSentiment('Saya sedih tapi tidak ingin bunuh diri');
    const passed = negatedRes.isNegated && negatedRes.severity === 'distress';
    results.push({
      name: 'Crisis Detector: Penanganan Negasi',
      passed,
      message: passed ? 'Berhasil mengenali negasi sehingga tidak salah memicu alarm krisis' : `Gagal: ${JSON.stringify(negatedRes)}`
    });
  } catch (err: any) {
    results.push({ name: 'Crisis Detector: Penanganan Negasi', passed: false, message: err.message });
  }

  // 3. Test PHQ-9 & GAD-7 Scoring Engine
  try {
    const phqMinimal = calculatePhq9Severity(3);
    const phqBerat = calculatePhq9Severity(18);
    const gadSedang = calculateGad7Severity(12);
    const summary = computeScreeningSummary(18, 12);

    const passed = phqMinimal === 'Minimal' && phqBerat === 'Berat' && gadSedang === 'Sedang' && summary.phqSeverity === 'Berat';
    results.push({
      name: 'Scoring Engine: Skala PHQ-9 & GAD-7',
      passed,
      message: passed ? 'Perhitungan skor dan kategori keparahan akurat' : 'Gagal dalam kalkulasi skor'
    });
  } catch (err: any) {
    results.push({ name: 'Scoring Engine: Skala PHQ-9 & GAD-7', passed: false, message: err.message });
  }

  // 4. Test Zod Validation Schema - Valid Booking
  try {
    const validBooking = {
      studentName: 'Ahmad Fauzi',
      studentNIM: '2106123456',
      studentEmail: 'fauzi@ui.ac.id',
      studentPhone: '081234567890',
      date: '2026-08-10',
      timeSlot: '14:00',
      timezone: 'WIB',
      mode: 'video_call',
      primaryConcern: 'Kecemasan akademik menjelang sidang skripsi',
    };

    const parseRes = appointmentBookingSchema.safeParse(validBooking);
    results.push({
      name: 'Form Validation: Zod Validasi Jadwal Konseling',
      passed: parseRes.success,
      message: parseRes.success ? 'Berhasil memvalidasi skema jadwal yang valid' : 'Gagal memvalidasi data jadwal valid'
    });
  } catch (err: any) {
    results.push({ name: 'Form Validation: Zod Validasi Jadwal Konseling', passed: false, message: err.message });
  }

  // 5. Test Zod Validation Schema - Invalid Email
  try {
    const invalidBooking = {
      studentName: 'Ahmad Fauzi',
      studentNIM: '2106123456',
      studentEmail: 'email-salah-format',
      studentPhone: '0812',
      date: '2026-08-10',
      timeSlot: '14:00',
      timezone: 'WIB',
      mode: 'video_call',
      primaryConcern: 'Pendek',
    };

    const parseRes = appointmentBookingSchema.safeParse(invalidBooking);
    results.push({
      name: 'Form Validation: Penolakan Format Email/Telepon Salah',
      passed: !parseRes.success,
      message: !parseRes.success ? 'Berhasil menolak email dan nomor HP yang tidak valid' : 'Gagal menolak data tidak valid'
    });
  } catch (err: any) {
    results.push({ name: 'Form Validation: Penolakan Format Email/Telepon Salah', passed: false, message: err.message });
  }

  return results;
}
