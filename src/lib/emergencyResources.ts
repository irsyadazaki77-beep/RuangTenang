export const EMERGENCY_RESOURCES_CONFIG = {
  version: '1.0.0',
  lastVerifiedAt: '2026-08-22',
  nextReviewDate: '2026-12-01',
  geographicScope: 'Indonesia (Nasional)'
};

export interface ProductionEmergencyContact {
  id: string;
  name: string;
  type: string;
  phone: string;
  url: string;
  description: string;
  available247: boolean;
  source: string;
  sourceUrl: string;
  verifiedAt: string;
  reviewDueAt: string;
  availabilityStatus: 'ACTIVE' | 'INACTIVE' | 'UNVERIFIED';
  geographicScope: string;
}

export const EMERGENCY_CONTACTS: ProductionEmergencyContact[] = [
  {
    id: 'kemenkes_sejiwa',
    name: 'Kemenkes Sejiwa (119 ext 8)',
    type: 'Layanan Psikologi Krisis Nasional',
    phone: '119 ext 8',
    url: 'tel:119',
    description: 'Hotline nasional resmi bebas pulsa untuk layanan darurat kesehatan jiwa masyarakat.',
    available247: true,
    source: 'Kementerian Kesehatan RI',
    sourceUrl: 'https://sehatnegeriku.kemkes.go.id/',
    verifiedAt: '2026-08-01',
    reviewDueAt: '2026-12-01',
    availabilityStatus: 'ACTIVE',
    geographicScope: 'Nasional'
  },
  {
    id: 'lisa',
    name: 'LISA (Layanan Integrasi Sehat Jiwa)',
    type: 'Hotline Krisis',
    phone: '08113855472',
    url: 'tel:08113855472',
    description: 'Layanan integrasi kesehatan jiwa dan dukungan psikososial krisis 24 jam.',
    available247: true,
    source: 'Love Inside All (LISA) Foundation',
    sourceUrl: 'https://www.loveinsideall.org/',
    verifiedAt: '2026-08-01',
    reviewDueAt: '2026-12-01',
    availabilityStatus: 'ACTIVE',
    geographicScope: 'Nasional'
  }
];

export const DEMO_DEVELOPMENT_CONTACTS = [
  {
    id: 'hotline_kampus_fallback',
    name: 'Hotline Darurat Kampus (Demo)',
    type: 'Tim Pendampingan Mahasiswa',
    phone: '0811-2222-999',
    url: 'tel:08112222999',
    description: 'Tim Satgas pencegahan dan penanganan krisis kampus (Simulasi/Internal).',
    available247: true,
    source: 'Kebijakan Internal Universitas',
    availabilityStatus: 'UNVERIFIED',
    isVerifiedProduction: false
  }
];

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
    catatanVerifikasi: 'Terverifikasi Kemenkes RI',
    sourceUrl: 'https://sehatnegeriku.kemkes.go.id/',
    verifiedAt: '2026-08-01',
    reviewDueAt: '2026-12-01',
    availabilityStatus: 'ACTIVE',
    geographicScope: 'Nasional',
    isVerifiedProduction: true
  },
  {
    id: 'hl-lisa',
    name: 'LISA Helpline',
    number: '0811-3855-472',
    desc: 'Layanan Dukungan Kesehatan Mental dan Pencegahan Bunuh Diri',
    type: 'Nirlaba / NGO',
    badge: '24/7 Inklusif',
    jamOperasional: '24 Jam',
    wilayahLayanan: 'Nasional',
    tanggalPembaruan: '2026-08-01',
    catatanVerifikasi: 'Terverifikasi',
    sourceUrl: 'https://www.loveinsideall.org/',
    verifiedAt: '2026-08-01',
    reviewDueAt: '2026-12-01',
    availabilityStatus: 'ACTIVE',
    geographicScope: 'Nasional',
    isVerifiedProduction: true
  }
];

export const UNVERIFIED_DEMO_HELPLINES: VerifiedHelpline[] = [
  {
    id: 'hl-kampus',
    name: 'Satgas Krisis Universitas (Tim Pendampingan)',
    number: '0811-2222-999',
    desc: 'Layanan Darurat Kampus untuk mahasiswa aktif',
    type: 'Institusi Pendidikan',
    badge: 'Demo / Unverified',
    jamOperasional: 'Simulasi/Internal',
    wilayahLayanan: 'Lingkungan Kampus & Sekitarnya',
    tanggalPembaruan: '2026-08-15',
    catatanVerifikasi: 'Belum Terverifikasi (Data Demo)',
    availabilityStatus: 'UNVERIFIED',
    isVerifiedProduction: false
  }
];
