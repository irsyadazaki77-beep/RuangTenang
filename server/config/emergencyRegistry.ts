/**
 * Canonical Verified Emergency Resources Registry
 * Single Source of Truth for Emergency Hotlines & Crisis Resources
 */

export interface VerifiedEmergencyResource {
  id: string;
  name: string;
  type: string;
  phone: string;
  url: string;
  description: string;
  source: string;
  sourceUrl: string;
  verifiedAt: string;
  reviewDueAt: string;
  channelAvailability: string;
  humanResponseAvailability: string;
  geographicScope: string;
  verificationStatus: 'VERIFIED' | 'UNDER_REVIEW' | 'DEMO_UNVERIFIED';
  isOfficialService: boolean;
  isVerifiedProduction: boolean;
}

export const VERIFIED_EMERGENCY_REGISTRY: VerifiedEmergencyResource[] = [
  {
    id: 'kemenkes_healing119',
    name: 'Healing119 (Kementerian Kesehatan RI)',
    type: 'Layanan Dukungan Psikologis Awal & Krisis Nasional',
    phone: '119 ext 8',
    url: 'https://www.healing119.id/',
    description: 'Hotline nasional resmi bebas pulsa untuk dukungan psikologis awal dari Kementerian Kesehatan RI via telepon 119 ekstensi 8 atau web healing119.id. Periksa situs resmi untuk jam operasional terbaru.',
    source: 'Kementerian Kesehatan Republik Indonesia',
    sourceUrl: 'https://kesprimkom.kemkes.go.id/assets/uploads/contents/others/FAQ_Cegah_Bunuh_Diri%2C_Dukung_Kesehatan_Jiwa__Kenali_Layanan_Healing119.id.pdf',
    verifiedAt: '2026-10-21',
    reviewDueAt: '2027-01-21',
    channelAvailability: 'Periksa situs resmi healing119.id untuk jadwal operasional terbaru; antrean dapat penuh.',
    humanResponseAvailability: 'Konselor terlatih Kemenkes RI sesuai jam operasional aktif',
    geographicScope: 'Nasional (Seluruh Indonesia)',
    verificationStatus: 'VERIFIED',
    isOfficialService: true,
    isVerifiedProduction: true
  },
  {
    id: 'igd_hospital_general',
    name: 'Instalasi Gawat Darurat (IGD) RS Terdekat',
    type: 'Layanan Darurat Medis & Psikiatri',
    phone: '118 / 119',
    url: 'tel:119',
    description: 'Penanganan kedaruratan fisik, psikologis, dan psikiatri langsung di rumah sakit umum / rumah sakit jiwa terdekat.',
    source: 'Sistem Penanggulangan Gawat Darurat Terpadu (SPGDT)',
    sourceUrl: 'https://kemkes.go.id/',
    verifiedAt: '2026-10-21',
    reviewDueAt: '2027-01-21',
    channelAvailability: 'Buka 24 jam setiap hari untuk kedaruratan langsung di fasilitas kesehatan',
    humanResponseAvailability: 'Dokter jaga dan tim medis bertugas di lokasi IGD secara langsung',
    geographicScope: 'Lokal / Terdekat',
    verificationStatus: 'VERIFIED',
    isOfficialService: true,
    isVerifiedProduction: true
  }
];

export const UNVERIFIED_COMMUNITY_RESOURCES: VerifiedEmergencyResource[] = [
  {
    id: 'lisa_helpline',
    name: 'LISA Helpline (Love Inside All)',
    type: 'Inisiatif Komunitas Pencegahan Krisis',
    phone: '0811-3855-472',
    url: 'https://www.loveinsideall.org/',
    description: 'Inisiatif komunitas non-pemerintah untuk pendampingan pencegahan bunuh diri. Jam operasional dan ketersediaan relawan dapat berubah sewaktu-waktu.',
    source: 'Love Inside All Foundation',
    sourceUrl: 'https://www.loveinsideall.org/',
    verifiedAt: '2026-10-21',
    reviewDueAt: '2027-01-21',
    channelAvailability: 'Hubungi via WhatsApp/telepon; ketersediaan tidak dijamin 24 jam',
    humanResponseAvailability: 'Relawan pendamping terlatih sesuai ketersediaan',
    geographicScope: 'Nasional',
    verificationStatus: 'UNDER_REVIEW',
    isOfficialService: false,
    isVerifiedProduction: false
  }
];

export const DEMO_CAMPUS_EMERGENCY_RESOURCES: VerifiedEmergencyResource[] = [
  {
    id: 'hotline_kampus_demo',
    name: 'Satgas Krisis Universitas (Simulasi Kampus)',
    type: 'Tim Pendampingan Mahasiswa Kampus',
    phone: '0811-2222-999',
    url: 'tel:08112222999',
    description: 'Tim Satgas pencegahan krisis dan bimbingan konseling kampus (Data simulasi internal lingkungan kampus).',
    source: 'Pusat Konseling Universitas (Simulasi)',
    sourceUrl: 'https://kampus.ac.id/konseling',
    verifiedAt: '2026-08-15',
    reviewDueAt: '2026-10-01',
    channelAvailability: 'Jam kerja akademik kampus (Senin - Jumat, 08.00 - 16.00 WIB)',
    humanResponseAvailability: 'Konselor pendamping mahasiswa bertugas pada jam kerja',
    geographicScope: 'Internal Kampus',
    verificationStatus: 'DEMO_UNVERIFIED',
    isOfficialService: false,
    isVerifiedProduction: false
  }
];

export function getVerifiedEmergencyContacts(): VerifiedEmergencyResource[] {
  return VERIFIED_EMERGENCY_REGISTRY.filter(r => r.verificationStatus === 'VERIFIED');
}

export function formatEmergencyContactsForAiPrompt(): string {
  const verified = getVerifiedEmergencyContacts();
  return verified.map(c => `- **${c.name}:** ${c.phone} (${c.type}, Sumber: ${c.source})`).join('\n');
}
