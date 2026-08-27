import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export interface ReportMetrics {
  totalSessions: number;
  crisisRatio: string;
  mostCommonConcern: string;
  dateRange: string;
}

export async function generateRectorateReport(metrics: ReportMetrics): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const reportsDir = path.join(process.cwd(), 'reports');
      
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const fileName = `Laporan_Rektorat_${Date.now()}.pdf`;
      const filePath = path.join(reportsDir, fileName);
      const writeStream = fs.createWriteStream(filePath);
      
      doc.pipe(writeStream);

      // Header
      doc.fontSize(20).text('Laporan Anonim Konseling Kampus', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text('Aplikasi RuangTenang Kampus', { align: 'center' });
      doc.moveDown(2);

      // Metrik
      doc.fontSize(14).text('Ringkasan Metrik', { underline: true });
      doc.moveDown();
      
      doc.fontSize(12)
         .text(`Periode Laporan: ${metrics.dateRange}`)
         .text(`Total Sesi Konseling: ${metrics.totalSessions}`)
         .text(`Rasio Krisis Darurat: ${metrics.crisisRatio}`)
         .text(`Keluhan Utama (Paling Sering): ${metrics.mostCommonConcern}`);
      
      doc.moveDown(2);

      // Keterangan
      doc.fontSize(10).fillColor('gray').text('Laporan ini di-generate secara anonim untuk menjaga kerahasiaan data mahasiswa, sesuai dengan standar perlindungan data kampus. Hanya memuat metrik agregat untuk keperluan rektorat.');

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
