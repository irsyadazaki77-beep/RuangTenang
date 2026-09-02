export type CounselorSpecialtyId =
  | "akademik"
  | "kecemasan"
  | "burnout"
  | "sosial"
  | "mood"
  | "krisis"
  | "lainnya";

export function mapSpecialtiesToIds(specialties: string[]): CounselorSpecialtyId[] {
  const ids: Set<CounselorSpecialtyId> = new Set();
  
  specialties.forEach(spec => {
    const s = spec.toLowerCase();
    if (s.includes('akademik') || s.includes('skripsi') || s.includes('motivasi') || s.includes('belajar')) {
      ids.add('akademik');
    }
    if (s.includes('anxiety') || s.includes('kecemasan') || s.includes('cemas') || s.includes('stress') || s.includes('stres')) {
      ids.add('kecemasan');
    }
    if (s.includes('burnout') || s.includes('lelah')) {
      ids.add('burnout');
    }
    if (s.includes('sosial') || s.includes('relasi') || s.includes('pasangan') || s.includes('identitas')) {
      ids.add('sosial');
    }
    if (s.includes('depresi') || s.includes('mood') || s.includes('bipolar') || s.includes('trauma') || s.includes('tidur')) {
      ids.add('mood');
    }
    if (s.includes('krisis') || s.includes('bunuh diri') || s.includes('self-harm')) {
      ids.add('krisis');
    }
  });

  return Array.from(ids);
}
