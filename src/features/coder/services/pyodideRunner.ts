/**
 * In-Browser Python Data Science & Matplotlib Visual Charts Runner
 * Mendukung simulasi eksekusi Python lokal di browser serta rendering visual grafik matplotlib tanpa instalasi server.
 */

export interface PythonExecutionResult {
  output: string;
  isError: boolean;
  chartSvg?: string;
  chartTitle?: string;
}

export function parseAndRenderMatplotlibPlot(code: string): { chartSvg?: string; chartTitle?: string } {
  if (!code.includes('plt.') && !code.includes('matplotlib')) {
    return {};
  }

  // Extract title if present: plt.title('...')
  const titleMatch = /plt\.title\(['"](.*?)['"]\)/.exec(code);
  const chartTitle = titleMatch ? titleMatch[1] : 'Grafik Visualisasi Data';

  // Extract plot data points: plt.plot([x1, x2], [y1, y2]) or plt.plot([y1, y2])
  const plotMatch = /plt\.(?:plot|bar|scatter)\s*\(\s*(?:\[([\d\s,.-]+)\]\s*,\s*)?\[([\d\s,.-]+)\]/i.exec(code);

  if (plotMatch) {
    const rawX = plotMatch[1];
    const rawY = plotMatch[2];

    const yValues = rawY.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    const xValues = rawX
      ? rawX.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n))
      : yValues.map((_, i) => i + 1);

    if (yValues.length > 0) {
      const isBar = code.includes('plt.bar');
      const minY = Math.min(0, ...yValues);
      const maxY = Math.max(...yValues) || 1;
      const width = 450;
      const height = 220;
      const padding = 40;

      const scaleX = (val: number, idx: number) => {
        if (xValues.length <= 1) return padding + (width - padding * 2) / 2;
        return padding + (idx / (xValues.length - 1)) * (width - padding * 2);
      };

      const scaleY = (val: number) => {
        const range = maxY - minY || 1;
        return height - padding - ((val - minY) / range) * (height - padding * 2);
      };

      let plotElements: string;

      if (isBar) {
        const barWidth = Math.max(12, (width - padding * 2) / (xValues.length * 1.8));
        plotElements = yValues
          .map((y, idx) => {
            const x = scaleX(xValues[idx], idx) - barWidth / 2;
            const yPos = scaleY(y);
            const barHeight = scaleY(0) - yPos;
            return `<rect x="${x}" y="${yPos}" width="${barWidth}" height="${Math.max(2, barHeight)}" fill="#38bdf8" rx="3" />
                    <text x="${x + barWidth / 2}" y="${yPos - 5}" font-size="10" fill="#94a3b8" text-anchor="middle">${y}</text>`;
          })
          .join('\n');
      } else {
        // Line chart
        const points = yValues.map((y, idx) => `${scaleX(xValues[idx], idx)},${scaleY(y)}`).join(' ');
        const circles = yValues
          .map((y, idx) => `<circle cx="${scaleX(xValues[idx], idx)}" cy="${scaleY(y)}" r="4" fill="#38bdf8" stroke="#0284c7" stroke-width="2" />`)
          .join('\n');

        plotElements = `<polyline fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${points}" />\n${circles}`;
      }

      // X and Y axes
      const axes = `
        <line x1="${padding}" y1="${height - padding}" x2="${width - padding / 2}" y2="${height - padding}" stroke="#475569" stroke-width="1.5" />
        <line x1="${padding}" y1="${padding / 2}" x2="${padding}" y2="${height - padding}" stroke="#475569" stroke-width="1.5" />
      `;

      const chartSvg = `
        <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto max-w-lg select-none">
          <rect width="100%" height="100%" fill="#070a13" rx="8" />
          <text x="${width / 2}" y="22" font-size="12" font-weight="bold" fill="#e2e8f0" text-anchor="middle">${chartTitle}</text>
          ${axes}
          ${plotElements}
        </svg>
      `;

      return { chartSvg, chartTitle };
    }
  }

  return {};
}

export function executeBrowserPython(code: string): PythonExecutionResult {
  const outputs: string[] = [];
  const lines = code.split(/\r?\n/);
  const scope: Record<string, any> = {};

  try {
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      // Print function: print(...)
      if (line.startsWith('print(') && line.endsWith(')')) {
        const inner = line.slice(6, -1).trim();
        // String literal
        if ((inner.startsWith("'") && inner.endsWith("'")) || (inner.startsWith('"') && inner.endsWith('"'))) {
          outputs.push(inner.slice(1, -1));
        } else if (scope[inner] !== undefined) {
          outputs.push(String(scope[inner]));
        } else {
          try {
            // Evaluasi ekspresi sederhana
            const evalResult = new Function(...Object.keys(scope), `return (${inner});`)(...Object.values(scope));
            outputs.push(String(evalResult));
          } catch {
            outputs.push(inner);
          }
        }
        continue;
      }

      // Variable assignment: x = ...
      const assignMatch = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.*)$/.exec(line);
      if (assignMatch && !line.includes('==')) {
        const varName = assignMatch[1];
        const expr = assignMatch[2];
        try {
          const evalResult = new Function(...Object.keys(scope), `return (${expr});`)(...Object.values(scope));
          scope[varName] = evalResult;
        } catch {
          scope[varName] = expr;
        }
      }
    }

    const { chartSvg, chartTitle } = parseAndRenderMatplotlibPlot(code);

    if (outputs.length === 0 && !chartSvg) {
      outputs.push('Skrip Python berhasil dieksekusi tanpa error.');
    }

    return {
      output: outputs.join('\n'),
      isError: false,
      chartSvg,
      chartTitle
    };
  } catch (err: any) {
    return {
      output: `PythonTraceback (most recent call last):\n  ${err?.message || String(err)}`,
      isError: true
    };
  }
}
