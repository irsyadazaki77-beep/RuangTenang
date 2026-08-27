const fs = require('fs');

const resourcesContent = fs.readFileSync('src/lib/emergencyResources.ts', 'utf-8');
if (!resourcesContent.includes('VERIFIED_HELPLINES')) {
  const verifiedHelplines = `
import { VerifiedHelpline } from '../types';

export const VERIFIED_HELPLINES: VerifiedHelpline[] = [
  {
    id: 'hl-kemenkes',
    name: 'Layanan Kesehatan Jiwa Kemenkes (Sehat Jiwa)',
    number: '119 (Tekan 8)',
    desc: 'Hotline Resmi Bebas Pulsa 24 Jam Kementerian Kesehatan Republik Indonesia',
    type: 'Pemerintah',
    badge: '24/7 Resmi',
    jamOperasional: '24 Jam Nonstop (Senin - Minggu)',
    wilayahLayanan: 'Nasional (Seluruh Wilayah Indonesia)',
    tanggalPembaruan: '2026-08-01',
    catatanVerifikasi: 'Terverifikasi Kemenkes RI'
  },
  {
    id: 'hl-lisa',
    name: 'LISA Helpline',
    number: '0811-3855-472',
    desc: 'Layanan Dukungan Kesehatan Mental',
    type: 'Nirlaba / NGO',
    badge: '24/7 Inklusif',
    jamOperasional: '24 Jam',
    wilayahLayanan: 'Nasional',
    tanggalPembaruan: '2026-08-01',
    catatanVerifikasi: 'Terverifikasi'
  },
  {
    id: 'hl-kampus',
    name: 'Satgas Krisis Universitas (Tim Pendampingan)',
    number: '0811-2222-999',
    desc: 'Layanan Darurat Kampus untuk mahasiswa aktif',
    type: 'Institusi Pendidikan',
    badge: 'Khusus Mahasiswa',
    jamOperasional: '24 Jam Nonstop (Senin - Minggu)',
    wilayahLayanan: 'Lingkungan Kampus & Sekitarnya',
    tanggalPembaruan: '2026-08-15',
    catatanVerifikasi: 'Verifikasi via SK Rektor No.102/2026'
  }
];
`;
  fs.appendFileSync('src/lib/emergencyResources.ts', verifiedHelplines);
}

let crisisContent = fs.readFileSync('src/lib/crisisDetector.ts', 'utf-8');
crisisContent = crisisContent.replace(
  /export const VERIFIED_HELPLINES: VerifiedHelpline\[\] = \[[\s\S]*?\];/,
  `import { VERIFIED_HELPLINES } from './emergencyResources';`
);
// Make sure VerifiedHelpline is not imported twice if already in emergencyResources
// Actually, it doesn't matter too much but wait, crisisContent imports VerifiedHelpline.
// The replacement above replaces the array with the import. But wait, `import` statements must be at the top level! 
// Let's do it cleanly.

