import { calculatePhq9Severity, calculateGad7Severity } from '../../shared/clinical/scoring.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { prisma } from '../database';
import { encryptionService } from './encryptionService';

export interface ReportMetrics {
  dateRange: string;
  completedAppointments: number;
  totalScreenings: number;
  selfHarmRiskScreenings: number;
  minimumGroupSize?: number;
}

export interface RectorateReportRow {
  category: string;
  value: string;
  details: string;
}

const DEFAULT_MINIMUM_GROUP_SIZE = 5;

export interface ScreeningTrendEvaluation {
  phqAnalysis: string;
  gadAnalysis: string;
  overallSummary: string;
}

export function evaluateScreeningTrends(
  latest: { phq9Score: number; gad7Score: number },
  previous?: { phq9Score: number; gad7Score: number } | null
): ScreeningTrendEvaluation {
  const phqSev = calculatePhq9Severity(latest.phq9Score);
  const gadSev = calculateGad7Severity(latest.gad7Score);

  if (!previous) {
    return {
      phqAnalysis: `Skor awal tercatat (${latest.phq9Score}/27, derajat: ${phqSev}). Belum ada data skrining pembanding untuk analisis tren depresi.`,
      gadAnalysis: `Skor awal tercatat (${latest.gad7Score}/21, derajat: ${gadSev}). Belum ada data skrining pembanding untuk analisis tren kecemasan.`,
      overallSummary: 'Evaluasi baseline/pertama kali; belum tersedia data pembanding historis untuk menentukan arah perubahan klinis.'
    };
  }

  const phqDiff = latest.phq9Score - previous.phq9Score;
  const gadDiff = latest.gad7Score - previous.gad7Score;
  const prevPhqSev = calculatePhq9Severity(previous.phq9Score);
  const prevGadSev = calculateGad7Severity(previous.gad7Score);

  const phqSign = phqDiff > 0 ? `+${phqDiff}` : `${phqDiff}`;
  const gadSign = gadDiff > 0 ? `+${gadDiff}` : `${gadDiff}`;

  let phqAnalysis: string;
  if (phqDiff < 0) {
    phqAnalysis = `Skor depresi menunjukkan penurunan (${phqSign} poin: ${previous.phq9Score} [${prevPhqSev}] -> ${latest.phq9Score} [${phqSev}]).`;
  } else if (phqDiff > 0) {
    phqAnalysis = `Skor depresi menunjukkan peningkatan (${phqSign} poin: ${previous.phq9Score} [${prevPhqSev}] -> ${latest.phq9Score} [${phqSev}]).`;
  } else {
    phqAnalysis = `Skor depresi stabil tanpa perubahan (${latest.phq9Score}/27 [${phqSev}]).`;
  }

  let gadAnalysis: string;
  if (gadDiff < 0) {
    gadAnalysis = `Skor kecemasan menunjukkan penurunan (${gadSign} poin: ${previous.gad7Score} [${prevGadSev}] -> ${latest.gad7Score} [${gadSev}]).`;
  } else if (gadDiff > 0) {
    gadAnalysis = `Skor kecemasan menunjukkan peningkatan (${gadSign} poin: ${previous.gad7Score} [${prevGadSev}] -> ${latest.gad7Score} [${gadSev}]).`;
  } else {
    gadAnalysis = `Skor kecemasan stabil tanpa perubahan (${latest.gad7Score}/21 [${gadSev}]).`;
  }

  let overallSummary: string;
  if (phqDiff < 0 && gadDiff < 0) {
    overallSummary = 'Kedua indikator (depresi dan kecemasan) menunjukkan penurunan skor secara searah dibanding evaluasi sebelumnya.';
  } else if (phqDiff > 0 && gadDiff > 0) {
    overallSummary = 'Kedua indikator (depresi dan kecemasan) menunjukkan peningkatan skor secara searah; disarankan konsultasi dan pendampingan profesional.';
  } else if (phqDiff === 0 && gadDiff === 0) {
    overallSummary = 'Skor depresi dan kecemasan tetap stabil tanpa perubahan dibanding evaluasi sebelumnya.';
  } else if (phqDiff < 0 && gadDiff > 0) {
    overallSummary = 'Dinamika berlawanan arah: skor depresi menurun sementara skor kecemasan meningkat. Perlu evaluasi terpisah oleh konselor profesional.';
  } else if (phqDiff > 0 && gadDiff < 0) {
    overallSummary = 'Dinamika berlawanan arah: skor depresi meningkat sementara skor kecemasan menurun. Perlu evaluasi terpisah oleh konselor profesional.';
  } else if (phqDiff < 0 && gadDiff === 0) {
    overallSummary = 'Skor depresi menunjukkan penurunan, sementara skor kecemasan stabil.';
  } else if (phqDiff > 0 && gadDiff === 0) {
    overallSummary = 'Skor depresi menunjukkan peningkatan, sementara skor kecemasan stabil.';
  } else if (phqDiff === 0 && gadDiff < 0) {
    overallSummary = 'Skor kecemasan menunjukkan penurunan, sementara skor depresi stabil.';
  } else {
    overallSummary = 'Skor kecemasan menunjukkan peningkatan, sementara skor depresi stabil.';
  }

  return { phqAnalysis, gadAnalysis, overallSummary };
}

export function buildRectorateReportRows(metrics: ReportMetrics): RectorateReportRow[] {
  const minimum = metrics.minimumGroupSize ?? DEFAULT_MINIMUM_GROUP_SIZE;
  const totalScreenings = Math.max(0, metrics.totalScreenings);
  const riskScreenings = Math.min(totalScreenings, Math.max(0, metrics.selfHarmRiskScreenings));
  const nonRiskScreenings = totalScreenings - riskScreenings;
  const isCountReportable = (value: number) => value >= minimum;
  const safeCount = (value: number) => isCountReportable(value) ? String(value) : `Disembunyikan (n < ${minimum})`;
  const riskCanBeReported = totalScreenings >= minimum && riskScreenings >= minimum && nonRiskScreenings >= minimum;
  const riskValue = riskCanBeReported
    ? `${riskScreenings} dari ${totalScreenings} (${(riskScreenings / totalScreenings * 100).toFixed(1)}%)`
    : `Disembunyikan (kelompok minimum ${minimum})`;

  return [
    { category: 'Periode laporan', value: metrics.dateRange, details: 'Rentang data yang dihitung.' },
    {
      category: 'Janji temu selesai', value: safeCount(metrics.completedAppointments),
      details: isCountReportable(metrics.completedAppointments)
        ? 'Jumlah janji temu berstatus COMPLETED berdasarkan jadwal pada periode laporan.'
        : `Jumlah janji temu berada di bawah ambang pelaporan ${minimum} dan disembunyikan.`
    },
    {
      category: 'Jumlah screening', value: safeCount(totalScreenings),
      details: isCountReportable(totalScreenings)
        ? 'Jumlah rekam screening pada periode laporan.'
        : `Jumlah screening berada di bawah ambang pelaporan ${minimum} dan disembunyikan.`
    },
    {
      category: 'Screening dengan indikator risiko menyakiti diri', value: riskValue,
      details: riskCanBeReported
        ? `Pembilang ${riskScreenings}; penyebut ${totalScreenings}; dihitung dari hasSelfHarmRisk = true. Ini adalah indikator tercatat, bukan diagnosis.`
        : `Disembunyikan karena sel agregat harus memenuhi minimum ${minimum}; tidak ditafsirkan sebagai tidak ada risiko.`
    },
    {
      category: 'Keluhan dominan', value: 'Data tidak tersedia',
      details: 'Skema saat ini tidak menyimpan kategori keluhan terstruktur untuk agregasi yang dapat dipertanggungjawabkan.'
    },
    {
      category: 'Tren dan perubahan skor klinis', value: 'Data tidak tersedia',
      details: 'Tidak dihitung: data saat ini belum menyediakan kohort dan pasangan pengukuran yang diperlukan untuk perbandingan ini.'
    },
    {
      category: 'Privasi agregat', value: `Sel dengan n < ${minimum} disembunyikan`,
      details: 'Ekspor ini tidak memuat nama, email, NIM, catatan, atau baris sumber. Penyaringan agregat mengurangi paparan, tetapi bukan jaminan anonimitas atau penilaian risiko identifikasi ulang.'
    }
  ];
}

export async function loadRectorateReportMetrics(now = new Date()): Promise<ReportMetrics> {
  const periodEnd = new Date(now);
  const periodStart = new Date(now);
  periodStart.setUTCDate(periodStart.getUTCDate() - 30);
  const range = { gte: periodStart, lte: periodEnd };
  const [completedAppointments, totalScreenings, selfHarmRiskScreenings] = await Promise.all([
    prisma.appointments.count({ where: { status: 'COMPLETED', scheduledAt: range } }),
    prisma.screenings.count({ where: { timestamp: range } }),
    prisma.screenings.count({ where: { timestamp: range, hasSelfHarmRisk: true } })
  ]);

  return {
    dateRange: `${periodStart.toISOString().slice(0, 10)} – ${periodEnd.toISOString().slice(0, 10)}`,
    completedAppointments,
    totalScreenings,
    selfHarmRiskScreenings,
    minimumGroupSize: DEFAULT_MINIMUM_GROUP_SIZE
  };
}

export async function generateRectorateReport(metrics: ReportMetrics): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const reportsDir = path.join(process.cwd(), 'reports');
      
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const fileName = `Laporan_Rektorat_Agregat_${Date.now()}.pdf`;
      const filePath = path.join(reportsDir, fileName);
      const writeStream = fs.createWriteStream(filePath);
      
      doc.pipe(writeStream);

      const rows = buildRectorateReportRows(metrics);

      // Header
      doc.fontSize(22).fillColor('#0f172a').font('Helvetica-Bold').text('Laporan Layanan Kesehatan Mental Kampus', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#64748b').font('Helvetica').text(`Periode: ${metrics.dateRange}`, { align: 'center' });
      doc.moveDown(2);

      doc.fontSize(16).fillColor('#0f172a').font('Helvetica-Bold').text('Ringkasan metrik');
      doc.moveDown(0.7);
      for (const row of rows.slice(1, 6)) {
        doc.fontSize(11).fillColor('#0f172a').font('Helvetica-Bold').text(row.category);
        doc.fontSize(11).fillColor('#334155').font('Helvetica').text(row.value);
        doc.fontSize(9).fillColor('#64748b').text(row.details, { width: 495 });
        doc.moveDown(0.8);
      }

      doc.moveDown(0.5);
      const privacyRow = rows[6];
      doc.fontSize(10).fillColor('#475569').font('Helvetica-Bold').text(privacyRow.value);
      doc.fontSize(9).font('Helvetica').text(privacyRow.details, { width: 495 });

      doc.end();

      writeStream.on('finish', () => {
        resolve(filePath);
      });
      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}

export async function generateStudentProgressPdf(userId: string, studentName: string, chatId?: string): Promise<Buffer> {
  return generateCounselingResumePdf(userId, studentName, chatId);
}

export async function generateCounselingResumePdf(userId: string, studentName: string, chatId?: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => reject(err));

        // Fetch user data
        const user = await (prisma as any).users.findUnique({
          where: { id: userId }
        });

        // Fetch screenings
        const screenings = await (prisma as any).screenings.findMany({
          where: { userId },
          orderBy: { timestamp: 'desc' }
        });
        
        const latestScreening = screenings.length > 0 ? screenings[0] : null;
        const previousScreening = screenings.length > 1 ? screenings[1] : null;

        // Fetch 30-day mood logs
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const moodLogs = (prisma as any).moodLogs?.findMany
          ? await (prisma as any).moodLogs.findMany({
              where: {
                userId,
                timestamp: { gte: thirtyDaysAgo }
              },
              orderBy: { timestamp: 'desc' }
            })
          : [];

        // Compute mood metrics
        const moodCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let totalMoodScore = 0;
        const recentReflectionNotes: string[] = [];

        moodLogs.forEach((m: any) => {
          const score = parseInt(m.mood, 10);
          if (score >= 1 && score <= 5) {
            moodCounts[score] = (moodCounts[score] || 0) + 1;
            totalMoodScore += score;
          }
          if (m.notes) {
            const dec = encryptionService.decryptSensitive(m.notes);
            if (dec && dec.trim()) {
              recentReflectionNotes.push(dec.trim());
            }
          }
        });

        const totalMoodEntries = moodLogs.length;
        const averageMoodScore = totalMoodEntries > 0 ? (totalMoodScore / totalMoodEntries).toFixed(1) : '—';

        // Fetch session summary if chatId provided or latest summary
        let sessionSummary: any = null;
        try {
          let chat: any = null;
          if (chatId) {
            chat = await prisma.chats.findUnique({
              where: { id: chatId }
            });
          }
          if (!chat) {
            chat = await prisma.chats.findFirst({
              where: { userId, NOT: { summary: null } },
              orderBy: { updatedAt: 'desc' }
            });
          }
          if (!chat) {
            chat = await prisma.chats.findFirst({
              where: { userId },
              orderBy: { updatedAt: 'desc' }
            });
          }

          if (chat && chat.summary) {
            sessionSummary = JSON.parse(chat.summary);
          }
        } catch (err) {
          console.warn('[REPORT GENERATOR] Error fetching/parsing chat summary:', err);
        }

        // --- HEADER ---
        doc.fontSize(18).fillColor('#0f172a').font('Helvetica-Bold').text('RuangTenang - Laporan Perkembangan Kesehatan Mental', { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(10).fillColor('#0d9488').font('Helvetica-Bold').text('Rekapitulasi 30 Hari Mood, Evaluasi Klinis PHQ-9 & GAD-7, dan Refleksi Konseling', { align: 'center' });
        doc.moveDown(1.2);

        // --- INFORMASI PENGGUNA ---
        doc.rect(50, doc.y, 495, 42).fill('#f8fafc').stroke('#e2e8f0');
        doc.fillColor('#334155').fontSize(9.5).font('Helvetica-Bold').text(`Nama Mahasiswa: ${studentName || user?.name || 'Anonim'}`, 60, doc.y - 32);
        doc.font('Helvetica').text(`Tanggal Unduh: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}`);
        doc.text(`Afiliasi Kampus: ${user?.university ? user.university : 'Pengguna Mandiri RuangTenang'}`);
        doc.moveDown(1.5);

        // --- BAGIAN 1: REKAPITULASI MOOD 30 HARI ---
        doc.fontSize(12).fillColor('#0f172a').font('Helvetica-Bold').text('1. Rekapitulasi Suasana Hati 30 Hari (Mood Tracker)');
        doc.moveDown(0.4);

        if (totalMoodEntries > 0) {
          doc.fontSize(9.5).fillColor('#334155').font('Helvetica')
             .text(`• Total Entri Check-in: ${totalMoodEntries} catatan (Rata-rata Skor: ${averageMoodScore} / 5.0)`)
             .text(`• Distribusi Perasaan: Sangat Baik: ${moodCounts[5]} | Baik: ${moodCounts[4]} | Netral: ${moodCounts[3]} | Buruk: ${moodCounts[2]} | Sangat Buruk: ${moodCounts[1]}`);
        } else {
          doc.fontSize(9.5).fillColor('#475569').font('Helvetica')
             .text('Belum ada log suasana hati dalam 30 hari terakhir. Mahasiswa disarankan melakukan check-in harian di User Progress.');
        }
        doc.moveDown(1.2);

        // --- BAGIAN 2: EVALUASI SKRINING TERKINI & ANALISIS TREN ---
        doc.fontSize(12).fillColor('#0f172a').font('Helvetica-Bold').text('2. Riwayat & Analisis Tren Skrining Klinis (PHQ-9 & GAD-7)');
        doc.moveDown(0.4);

        if (latestScreening) {
          const phqScore = latestScreening.phq9Score;
          const gadScore = latestScreening.gad7Score;
          const phqSeverity = calculatePhq9Severity(phqScore);
          const gadSeverity = calculateGad7Severity(gadScore);

          const trends = evaluateScreeningTrends(
            { phq9Score: latestScreening.phq9Score, gad7Score: latestScreening.gad7Score },
            previousScreening ? { phq9Score: previousScreening.phq9Score, gad7Score: previousScreening.gad7Score } : null
          );

          doc.fontSize(9.5).fillColor('#334155').font('Helvetica')
             .text(`• Tanggal Evaluasi Terakhir: ${new Date(latestScreening.timestamp).toLocaleDateString('id-ID', { dateStyle: 'medium' })}`)
             .text(`• Skor Depresi (PHQ-9): ${phqScore} / 27 (${phqSeverity}) | Skor Kecemasan (GAD-7): ${gadScore} / 21 (${gadSeverity})`)
             .text(`• Analisis PHQ-9: ${trends.phqAnalysis}`)
             .text(`• Analisis GAD-7: ${trends.gadAnalysis}`)
             .text(`• Ringkasan Perubahan: ${trends.overallSummary}`)
             .text(`• Status Triase Sistem: ${latestScreening.triageLevel || 'Manajemen Stres Mandiri & Konseling Berkala'}`);
        } else {
          doc.fontSize(9.5).fillColor('#475569').font('Helvetica')
             .text('Belum ada evaluasi klinis tersimpan. Mahasiswa dianjurkan mengisi skrining PHQ-9/GAD-7.');
        }
        doc.moveDown(1.2);

        // --- BAGIAN 3: RINGKASAN REFLEKSI & KONSULTASI AI ---
        doc.fontSize(12).fillColor('#0f172a').font('Helvetica-Bold').text('3. Catatan Refleksi Mandiri & Bahan Konseling');
        doc.moveDown(0.4);

        if (recentReflectionNotes.length > 0) {
          doc.fontSize(9.5).fillColor('#334155').font('Helvetica-Bold').text('Catatan Log Refleksi Mahasiswa Terbaru:');
          recentReflectionNotes.slice(0, 3).forEach(note => {
            doc.font('Helvetica').text(`"• ${note}"`);
          });
          doc.moveDown(0.5);
        }

        if (sessionSummary) {
          doc.fontSize(9.5).fillColor('#334155').font('Helvetica-Bold').text('Fokus Isu Utama dari Sesi AI:');
          doc.font('Helvetica').text(sessionSummary.masalahUtama || 'Pengelolaan stres dan beban perkuliahan.');
        } else {
          doc.fontSize(9.5).fillColor('#475569').font('Helvetica')
             .text('• Masalah Utama: Pengelolaan stres akademik, kecemasan ujian, dan ritme istirahat.');
        }
        doc.moveDown(1.5);

        // --- RUANG CATATAN RUJUKAN PROFESIONAL ---
        doc.fontSize(11).fillColor('#0f172a').font('Helvetica-Bold').text('4. Catatan Verifikasi Konselor Kampus / Psikolog');
        doc.moveDown(0.4);
        const startY = doc.y;
        for (let i = 0; i < 3; i++) {
          doc.moveTo(50, startY + (i * 18)).lineTo(545, startY + (i * 18)).lineWidth(0.8).strokeColor('#cbd5e1').stroke();
        }

        doc.moveDown(2.5);

        // --- FOOTER DISCLAIMER MEDIS RESMI ---
        const footerY = 730;
        doc.rect(50, footerY, 495, 50).fill('#fef2f2').stroke('#fecaca');
        doc.fontSize(9).fillColor('#991b1b').font('Helvetica-Bold').text('DISCLAIMER MEDIS RESMI:', 60, footerY + 8);
        doc.font('Helvetica').fontSize(8.5).fillColor('#7f1d1d')
           .text('Dokumen ini bukan diagnosis klinis resmi. Dibuat untuk mempermudah rujukan ke tenaga profesional (psikolog/psikiatri) serta bahan refleksi perkembangan kesehatan mental pribadi.', 60, footerY + 22, { width: 475 });

        doc.end();
      } catch (err) {
        reject(err);
      }
    })();
  });
}

export async function generateRectorateExcel(metrics: ReportMetrics): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'RuangTenang Kampus';
  workbook.lastModifiedBy = 'Sistem Otomatis';
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet('Laporan Agregat', {
    pageSetup: { paperSize: 9, orientation: 'landscape' }
  });

  // Column Setup
  sheet.columns = [
    { header: 'Kategori', key: 'kategori', width: 30 },
    { header: 'Nilai / Metrik', key: 'nilai', width: 40 },
    { header: 'Keterangan Tambahan', key: 'ket', width: 40 },
  ];

  // Header styling
  sheet.getRow(1).font = { name: 'Arial', family: 4, size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  for (const row of buildRectorateReportRows(metrics)) {
    sheet.addRow({ kategori: row.category, nilai: row.value, ket: row.details });
  }

  const reportsDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const fileName = `Laporan_Rektorat_Visual_${Date.now()}.xlsx`;
  const filePath = path.join(reportsDir, fileName);
  
  await workbook.xlsx.writeFile(filePath);
  return filePath;
}
