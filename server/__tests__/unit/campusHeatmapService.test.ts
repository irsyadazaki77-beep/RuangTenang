import { describe, expect, it } from 'vitest';
import { generateCampusWellnessHeatmap } from '../../services/campus/campusHeatmapService.js';

describe('Campus Heatmap Intelligence Service (Privacy & K-Anonymity)', () => {
  it('suppresses faculty metrics when sample count is less than k threshold', () => {
    const records = [
      { faculty: 'Fakultas Kedokteran', stressScore: 75, factor: 'exam_load' as const },
      { faculty: 'Fakultas Kedokteran', stressScore: 80, factor: 'exam_load' as const }
    ];

    const report = generateCampusWellnessHeatmap('cmp_1', 'Universitas Indonesia', records, 10);
    expect(report.faculties).toHaveLength(1);
    expect(report.faculties[0].isSuppressedForPrivacy).toBe(true);
    expect(report.faculties[0].averageStressScore).toBe(0);
  });

  it('calculates average score and dominant factor when count meets k threshold', () => {
    const records = Array.from({ length: 15 }, (_, i) => ({
      faculty: 'Fakultas Ilmu Komputer',
      stressScore: i % 2 === 0 ? 60 : 70,
      factor: 'thesis_deadline' as const
    }));

    const report = generateCampusWellnessHeatmap('cmp_1', 'Universitas Indonesia', records, 10);
    expect(report.faculties).toHaveLength(1);
    expect(report.faculties[0].isSuppressedForPrivacy).toBe(false);
    expect(report.faculties[0].averageStressScore).toBe(65);
    expect(report.faculties[0].dominantStrainFactor).toBe('thesis_deadline');
    expect(report.overallWellnessIndex).toBe(35); // 100 - 65
  });
});
