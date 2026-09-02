const fs = require('fs');
let file = fs.readFileSync('src/features/counselors/CounselorDirectory.tsx', 'utf8');

file = file.replace(
  `  const CONCERN_CATEGORIES = [
    { id: "Semua", label: "Semua" },
    { id: "akademik", label: "Kendala Akademik & Skripsi" },
    { id: "kecemasan", label: "Kecemasan & Burnout" },
    { id: "sosial", label: "Hubungan & Sosial Kampus" },
    { id: "mood", label: "Suasana Hati & Depresi" },
  ];`,
  `  const CONCERN_CATEGORIES: { id: string; label: string; specialtyIds: CounselorSpecialtyId[] }[] = [
    { id: "Semua", label: "Semua", specialtyIds: [] },
    { id: "akademik", label: "Kendala Akademik & Skripsi", specialtyIds: ["akademik"] },
    { id: "kecemasan", label: "Kecemasan & Burnout", specialtyIds: ["kecemasan", "burnout"] },
    { id: "sosial", label: "Hubungan & Sosial Kampus", specialtyIds: ["sosial"] },
    { id: "mood", label: "Suasana Hati & Depresi", specialtyIds: ["mood", "krisis"] },
  ];`
);

file = file.replace(
  `    const matchesConcern =
      selectedConcern === "Semua" ||
      c.specialties.some((s) =>
        s.toLowerCase().includes((selectedConcernCategory?.label || "").toLowerCase()),
      );`,
  `    const cSpecialtyIds = mapSpecialtiesToIds(c.specialties);
    const matchesConcern =
      selectedConcern === "Semua" ||
      !selectedConcernCategory ||
      selectedConcernCategory.specialtyIds.some(id => cSpecialtyIds.includes(id));`
);

fs.writeFileSync('src/features/counselors/CounselorDirectory.tsx', file);
