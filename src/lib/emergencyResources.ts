export const EMERGENCY_RESOURCES_CONFIG = {
  version: '1.0.0',
  lastVerifiedAt: '2026-10-01',
  nextReviewDate: '2027-01-01',
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
    name: 'Healing119 (Kementerian Kesehatan)',
    type: 'Dukungan psikologis awal',
    phone: '119 ext 8',
    url: 'https://www.healing119.id/',
    description: 'Dukungan psikologis awal gratis melalui telepon 119 ekstensi 8 atau chat dari situs resmi. Layanan dapat penuh antrean; jika Anda dalam bahaya atau tidak tersambung, cari bantuan di fasilitas kesehatan terdekat.',
    available247: true,
    source: 'Kementerian Kesehatan RI',
    sourceUrl: 'https://kesprimkom.kemkes.go.id/assets/uploads/contents/others/FAQ_Cegah_Bunuh_Diri%2C_Dukung_Kesehatan_Jiwa__Kenali_Layanan_Healing119.id.pdf',
    verifiedAt: '2026-10-01',
    reviewDueAt: '2027-01-01',
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
    name: 'Healing119 (Kementerian Kesehatan)',
    number: '119 ext. 8',
    url: 'https://www.healing119.id/',
    desc: 'Dukungan psikologis awal gratis, bukan terapi jangka panjang. Jika belum tersambung, antrean mungkin penuh; bila darurat, cari fasilitas kesehatan terdekat.',
    type: 'Pemerintah',
    badge: 'Resmi Kemenkes',
    jamOperasional: '24 jam; antrean dapat penuh',
    wilayahLayanan: 'Nasional (Seluruh Wilayah Indonesia)',
    tanggalPembaruan: '2026-10-01',
    catatanVerifikasi: 'Informasi kanal dan layanan diperiksa pada FAQ resmi Kemenkes; ketersediaan konselor langsung tidak dijamin.',
    sourceUrl: 'https://kesprimkom.kemkes.go.id/assets/uploads/contents/others/FAQ_Cegah_Bunuh_Diri%2C_Dukung_Kesehatan_Jiwa__Kenali_Layanan_Healing119.id.pdf',
    verifiedAt: '2026-10-01',
    reviewDueAt: '2027-01-01',
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
