import { describe, it, expect } from 'vitest';
import { generateMabaExplanation } from '../../features/coder/services/codeMabaExplainer';

describe('codeMabaExplainer', () => {
  it('generates line-by-line breakdown with analogies for campus learners', () => {
    const code = `
      const targetIpk = 3.8;
      function evaluasiKelulusan(ipk) {
        if (ipk >= 3.5) {
          console.log("Cumlaude");
        }
      }
    `;
    const report = generateMabaExplanation(code, 'evaluasi.js');
    expect(report.summary).toBeDefined();
    expect(report.primaryAnalogy).toBeDefined();
    expect(report.breakdown.length).toBeGreaterThan(0);
    expect(report.personas.length).toBe(3);

    const categories = report.breakdown.map(b => b.category);
    expect(categories).toContain('variable');
    expect(categories).toContain('function');
    expect(categories).toContain('condition');
  });

  it('includes commentary from Ki Hadjar, Pak Habibie, and Bu Kartini', () => {
    const report = generateMabaExplanation('const x = 100;', 'main.js');
    const ids = report.personas.map(p => p.personaId);
    expect(ids).toContain('kihadjar');
    expect(ids).toContain('habibie');
    expect(ids).toContain('kartini');
  });

  it('tracks variable state changes across execution steps', () => {
    const code = `
      let saldo = 50000;
      let biayaKantin = 15000;
    `;
    const report = generateMabaExplanation(code, 'kantin.js');
    expect(report.variableTrace.length).toBeGreaterThanOrEqual(2);
    expect(report.variableTrace[0].variables).toBeDefined();
  });
});
