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
    id: 'kemenkes_sejiwa',
    name: 'Kemenkes Sejiwa (119 ext 8)',
    type: 'Layanan Psikologi Krisis Nasional',
    phone: '119 ext 8',
    url: 'tel:119',
    description: 'Hotline nasional resmi bebas pulsa untuk layanan darurat kesehatan jiwa masyarakat dari Kementerian Kesehatan RI.',
    source: 'Kementerian Kesehatan Republik Indonesia',
    sourceUrl: 'https://sehatnegeriku.kemkes.go.id/',
    verifiedAt: '2026-08-01',
    reviewDueAt: '2026-12-01',
    channelAvailability: 'Saluran telepon dapat dihubungi 24 jam setiap hari',
    humanResponseAvailability: 'Respons konselor psikolog profesional bergantung pada ketersediaan petugas aktif di call center Kemenkes',
    geographicScope: 'Nasional (Seluruh Indonesia)',
    verificationStatus: 'VERIFIED',
    isOfficialService: true,
    isVerifiedProduction: true
  },
  {
    id: 'lisa_helpline',
    name: 'LISA (Layanan Integrasi Sehat Jiwa)',
    type: 'Hotline Pencegahan Krisis Jiwa & Bunuh Diri',
    phone: '0811-3855-472',
    url: 'tel:08113855472',
    description: 'Layanan integrasi pencegahan bunuh diri dan pendampingan psikososial krisis.',
    source: 'Love Inside All (LISA) Foundation',
    sourceUrl: 'https://www.loveinsideall.org/',
    verifiedAt: '2026-08-01',
    reviewDueAt: '2026-12-01',
    channelAvailability: 'Hotline telepon dan pesan WhatsApp aktif 24 jam',
    humanResponseAvailability: 'Waktu tunggu respons relawan dan konselor terlatih bergantung pada antrean krisis',
    geographicScope: 'Nasional (Seluruh Indonesia)',
    verificationStatus: 'VERIFIED',
    isOfficialService: false,
    isVerifiedProduction: true
  },
  {
    id: 'igd_hospital_general',
    name: 'Instalasi Gawat Darurat (IGD) RS Terdekat',
    type: 'Layanan Darurat Medis & Psikiatri',
    phone: '118 / 119',
    url: 'tel:118',
    description: 'Penanganan kedaruratan fisik, psikologis, dan psikiatri langsung di rumah sakit umum / rumah sakit jiwa terdekat.',
    source: 'Sistem Layanan Medis Darurat Nasional (SPGDT)',
    sourceUrl: 'https://kemkes.go.id/',
    verifiedAt: '2026-08-01',
    reviewDueAt: '2026-12-01',
    channelAvailability: 'Buka 24 jam setiap hari untuk kedaruratan langsung',
    humanResponseAvailability: 'Dokter jaga dan tim medis bertugas di lokasi IGD secara langsung',
    geographicScope: 'Lokal / Terdekat',
    verificationStatus: 'VERIFIED',
    isOfficialService: true,
    isVerifiedProduction: true
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
