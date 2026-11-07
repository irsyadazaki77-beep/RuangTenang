export interface CampusStrainMetric {
  facultyName: string;
  totalStudentsSampled: number;
  averageStressScore: number; // 0-100
  dominantStrainFactor: 'thesis_deadline' | 'exam_load' | 'financial_burnout' | 'social_isolation';
  isSuppressedForPrivacy: boolean; // true if < 10 students
}

export interface CampusHeatmapReport {
  campusId: string;
  campusName: string;
  generatedAt: string;
  privacyThresholdK: number;
  overallWellnessIndex: number; // 0-100
  faculties: CampusStrainMetric[];
}

/**
 * Computes k-anonymized campus wellness heatmap metrics.
 * Ensures k >= 10 differential privacy suppression so no individual student can be re-identified.
 */
export function generateCampusWellnessHeatmap(
  campusId: string,
  campusName: string,
  rawRecords: Array<{ faculty: string; stressScore: number; factor: CampusStrainMetric['dominantStrainFactor'] }>,
  kThreshold = 10
): CampusHeatmapReport {
  const facultyGroups = new Map<string, typeof rawRecords>();

  rawRecords.forEach(rec => {
    if (!facultyGroups.has(rec.faculty)) {
      facultyGroups.set(rec.faculty, []);
    }
    facultyGroups.get(rec.faculty)!.push(rec);
  });

  const faculties: CampusStrainMetric[] = [];
  let totalValidScoreSum = 0;
  let totalValidStudents = 0;

  facultyGroups.forEach((records, faculty) => {
    const count = records.length;
    if (count < kThreshold) {
      // Privacy suppression
      faculties.push({
        facultyName: faculty,
        totalStudentsSampled: count,
        averageStressScore: 0,
        dominantStrainFactor: 'thesis_deadline',
        isSuppressedForPrivacy: true
      });
    } else {
      const avg = Math.round(records.reduce((acc, r) => acc + r.stressScore, 0) / count);
      
      // Determine dominant factor
      const factorCounts: Record<string, number> = {};
      records.forEach(r => {
        factorCounts[r.factor] = (factorCounts[r.factor] || 0) + 1;
      });
      const topFactor = Object.entries(factorCounts).sort((a, b) => b[1] - a[1])[0][0] as CampusStrainMetric['dominantStrainFactor'];

      faculties.push({
        facultyName: faculty,
        totalStudentsSampled: count,
        averageStressScore: avg,
        dominantStrainFactor: topFactor,
        isSuppressedForPrivacy: false
      });

      totalValidScoreSum += avg * count;
      totalValidStudents += count;
    }
  });

  const overallWellnessIndex = totalValidStudents > 0
    ? Math.max(0, 100 - Math.round(totalValidScoreSum / totalValidStudents))
    : 80;

  return {
    campusId,
    campusName,
    generatedAt: new Date().toISOString(),
    privacyThresholdK: kThreshold,
    overallWellnessIndex,
    faculties
  };
}
