import { describe, it, expect } from 'vitest';
import { executeBrowserPython, parseAndRenderMatplotlibPlot } from '../../features/coder/services/pyodideRunner';

describe('pyodideRunner - In-Browser Python & Matplotlib Visual Charts', () => {
  it('executes print statements and variable assignments', () => {
    const pyCode = `
      x = 10
      y = 25
      print(x + y)
    `;
    const res = executeBrowserPython(pyCode);
    expect(res.isError).toBe(false);
    expect(res.output).toContain('35');
  });

  it('detects and renders matplotlib plot to SVG', () => {
    const pyCode = `
      import matplotlib.pyplot as plt
      plt.title('Penjualan Bulanan')
      plt.plot([1, 2, 3], [10, 20, 30])
      plt.show()
    `;
    const res = executeBrowserPython(pyCode);
    expect(res.isError).toBe(false);
    expect(res.chartSvg).toBeDefined();
    expect(res.chartSvg).toContain('<svg');
    expect(res.chartTitle).toBe('Penjualan Bulanan');
  });
});
