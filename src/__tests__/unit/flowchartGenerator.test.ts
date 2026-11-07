import { describe, it, expect } from 'vitest';
import { generateCodeFlowchart } from '../../features/coder/services/flowchartGenerator';

describe('flowchartGenerator - Code Logic Visualizer', () => {
  it('generates a Mermaid flowchart string for function and conditional branching', () => {
    const code = `
      function checkGrade(score) {
        if (score >= 80) {
          return 'A';
        }
        return 'B';
      }
    `;
    const chart = generateCodeFlowchart(code, 'grade.js');

    expect(chart).toContain('flowchart TD');
    expect(chart).toContain('Start([Mulai Eksekusi])');
    expect(chart).toContain('Fungsi: checkGrade()');
    expect(chart).toContain('score >= 80');
    expect(chart).toContain('Finish([Selesai])');
  });

  it('handles empty code safely', () => {
    const chart = generateCodeFlowchart('', 'empty.js');
    expect(chart).toContain('flowchart TD');
    expect(chart).toContain('Berkas Kosong');
  });
});
