/**
 * Data Studio & Academic Chart Engine for RuangKerja / RuangTenang
 * Provides tabular data parsing, statistical computations, academic Bab 4 narrative synthesis,
 * and high-resolution SVG/PNG rendering.
 */

export type ChartType = 'bar' | 'line' | 'scatter' | 'pie' | 'area';
export type AcademicColorPalette = 'navy' | 'emerald' | 'indigo' | 'monochrome' | 'sunset';

export interface DataRow {
  [key: string]: string | number;
}

export interface ParsedDataset {
  columns: string[];
  numericColumns: string[];
  categoricalColumns: string[];
  rows: DataRow[];
}

export interface DescriptiveStats {
  count: number;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  range: number;
  sum: number;
}

export interface ChartConfig {
  title: string;
  figureNumber: string; // e.g. "Gambar 4.1"
  chartType: ChartType;
  xColumn: string;
  yColumn: string;
  palette: AcademicColorPalette;
  xLabel: string;
  yLabel: string;
  unit?: string;
  researchContext?: string;
}

export const PALETTES: Record<AcademicColorPalette, { name: string; primary: string; secondary: string; fills: string[] }> = {
  navy: {
    name: 'Oxford Academic Navy',
    primary: '#1e3a8a',
    secondary: '#3b82f6',
    fills: ['#1e3a8a', '#2563eb', '#60a5fa', '#93c5fd', '#bfdbfe']
  },
  emerald: {
    name: 'Emerald Scientific',
    primary: '#047857',
    secondary: '#10b981',
    fills: ['#065f46', '#059669', '#10b981', '#34d399', '#a7f3d0']
  },
  indigo: {
    name: 'Deep Indigo Informatics',
    primary: '#4338ca',
    secondary: '#6366f1',
    fills: ['#3730a3', '#4f46e5', '#6366f1', '#818cf8', '#c7d2fe']
  },
  monochrome: {
    name: 'Formal Thesis Grayscale',
    primary: '#1e293b',
    secondary: '#475569',
    fills: ['#0f172a', '#334155', '#64748b', '#94a3b8', '#cbd5e1']
  },
  sunset: {
    name: 'Social Empirical Warmth',
    primary: '#b45309',
    secondary: '#f59e0b',
    fills: ['#92400e', '#d97706', '#f59e0b', '#fbbf24', '#fde68a']
  }
};

/**
 * Parses raw CSV, TSV, or Markdown tables into a structured dataset
 */
export function parseDataToDataset(rawInput: string): ParsedDataset {
  const lines = rawInput.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return { columns: [], numericColumns: [], categoricalColumns: [], rows: [] };
  }

  // Detect Markdown table format: | Col1 | Col2 |
  if (lines[0].includes('|')) {
    const cleanLines = lines.filter(l => !/^[|\s-:]+$/.test(l));
    const headerLine = cleanLines[0];
    const columns = headerLine
      .split('|')
      .map(c => c.trim())
      .filter(Boolean);

    const rows: DataRow[] = [];
    for (let i = 1; i < cleanLines.length; i++) {
      const parts = cleanLines[i].split('|').map(c => c.trim()).filter(Boolean);
      if (parts.length === 0) continue;
      const row: DataRow = {};
      columns.forEach((col, idx) => {
        const val = parts[idx] ?? '';
        const num = Number(val);
        row[col] = !isNaN(num) && val !== '' ? num : val;
      });
      rows.push(row);
    }

    return classifyColumns(columns, rows);
  }

  // Detect CSV / TSV format
  const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
  const columns = lines[0].split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
  const rows: DataRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (parts.length === 0 || (parts.length === 1 && parts[0] === '')) continue;
    const row: DataRow = {};
    columns.forEach((col, idx) => {
      const val = parts[idx] ?? '';
      const num = Number(val);
      row[col] = !isNaN(num) && val !== '' ? num : val;
    });
    rows.push(row);
  }

  return classifyColumns(columns, rows);
}

function classifyColumns(columns: string[], rows: DataRow[]): ParsedDataset {
  const numericColumns: string[] = [];
  const categoricalColumns: string[] = [];

  for (const col of columns) {
    let numericCount = 0;
    let totalCount = 0;
    for (const r of rows) {
      if (r[col] !== undefined && r[col] !== null && r[col] !== '') {
        totalCount++;
        if (typeof r[col] === 'number') numericCount++;
      }
    }
    if (totalCount > 0 && numericCount / totalCount >= 0.7) {
      numericColumns.push(col);
    } else {
      categoricalColumns.push(col);
    }
  }

  return { columns, numericColumns, categoricalColumns, rows };
}

/**
 * Calculates descriptive statistical metrics
 */
export function calculateDescriptiveStats(values: number[]): DescriptiveStats {
  const nums = values.filter(v => typeof v === 'number' && !isNaN(v)).sort((a, b) => a - b);
  const count = nums.length;
  if (count === 0) {
    return { count: 0, mean: 0, median: 0, stdDev: 0, min: 0, max: 0, range: 0, sum: 0 };
  }

  const sum = nums.reduce((acc, v) => acc + v, 0);
  const mean = sum / count;

  let median: number;
  if (count % 2 === 0) {
    median = (nums[count / 2 - 1] + nums[count / 2]) / 2;
  } else {
    median = nums[Math.floor(count / 2)];
  }

  const variance = nums.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / count;
  const stdDev = Math.sqrt(variance);
  const min = nums[0];
  const max = nums[count - 1];
  const range = max - min;

  return {
    count,
    mean: Number(mean.toFixed(2)),
    median: Number(median.toFixed(2)),
    stdDev: Number(stdDev.toFixed(2)),
    min,
    max,
    range: Number(range.toFixed(2)),
    sum: Number(sum.toFixed(2))
  };
}

/**
 * Synthesizes formal academic Bab 4 descriptive and statistical narrative
 */
export function generateStatisticalNarrative(
  dataset: ParsedDataset,
  config: ChartConfig
): string {
  const yValues = dataset.rows
    .map(r => Number(r[config.yColumn]))
    .filter(v => !isNaN(v));

  const stats = calculateDescriptiveStats(yValues);
  const unitStr = config.unit ? ` ${config.unit}` : '';
  const contextPrefix = config.researchContext
    ? ` dalam konteks penelitian mengenai *${config.researchContext}*`
    : '';

  // Determine trend / variation
  let trendDescription = '';
  if (yValues.length >= 2) {
    const first = yValues[0];
    const last = yValues[yValues.length - 1];
    const diff = last - first;
    const pctChange = first !== 0 ? ((diff / Math.abs(first)) * 100).toFixed(1) : '0';
    if (diff > 0) {
      trendDescription = `Secara keseluruhan, data menunjukkan tren kenaikan (*upward trend*) sebesar ${pctChange}% dari sampel awal (${first}${unitStr}) hingga sampel akhir (${last}${unitStr}).`;
    } else if (diff < 0) {
      trendDescription = `Secara keseluruhan, data menunjukkan tren penurunan (*downward trend*) sebesar ${Math.abs(Number(pctChange))}% dari sampel awal (${first}${unitStr}) hingga sampel akhir (${last}${unitStr}).`;
    } else {
      trendDescription = `Secara keseluruhan, nilai data menunjukkan stabilitas yang konsisten antara observasi awal dan akhir pada angka ${first}${unitStr}.`;
    }
  }

  // Find peak and lowest labels
  let peakLabel = '';
  let lowestLabel = '';
  for (const r of dataset.rows) {
    if (Number(r[config.yColumn]) === stats.max && !peakLabel) {
      peakLabel = String(r[config.xColumn] ?? '');
    }
    if (Number(r[config.yColumn]) === stats.min && !lowestLabel) {
      lowestLabel = String(r[config.xColumn] ?? '');
    }
  }

  return `### Pembahasan Data Penelitian (${config.figureNumber})

#### 1. Deskripsi Distribusi Data
Berdasarkan data observasi empiris${contextPrefix} yang divisualisasikan pada **${config.figureNumber}: ${config.title}**, diperoleh gambaran komputasi statistik deskriptif terhadap variabel **${config.yLabel || config.yColumn}** dengan ukuran sampel $N = ${stats.count}$.

Tabel ringkasan metrik statistik deskriptif disajikan sebagai berikut:

| Parameter Statistik | Nilai Pengukuran | Keterangan Akademis |
| :--- | :--- | :--- |
| **Ukuran Sampel ($N$)** | ${stats.count} Observasi | Jumlah titik data pengujian |
| **Rata-rata (*Mean* / $\\mu$)** | ${stats.mean}${unitStr} | Nilai tendensi sentral utama |
| **Median ($Q_2$)** | ${stats.median}${unitStr} | Titik tengah distribusi data |
| **Standar Deviasi ($\\sigma$)** | ${stats.stdDev}${unitStr} | Tingkat dispersi / persebaran data |
| **Nilai Maksimum** | ${stats.max}${unitStr} | Dicapai pada kategori *${peakLabel}* |
| **Nilai Minimum** | ${stats.min}${unitStr} | Dicapai pada kategori *${lowestLabel}* |
| **Rentang (*Range*)** | ${stats.range}${unitStr} | Selisih ekstrem data maksimum-minimum |

#### 2. Interpretasi Hasil & Implikasi Pembahasan (Bab IV)
1. **Analisis Pemusatan & Sebaran Data:** Nilai rata-rata hitung (*mean*) sebesar ${stats.mean}${unitStr} dan nilai median sebesar ${stats.median}${unitStr} menunjukkan distribusi data yang ${Math.abs(stats.mean - stats.median) <= stats.stdDev * 0.5 ? 'cenderung simetris dan mendekati kurva normal' : 'mengalami sedikit kemiringan (*skewness*)'}. Standar deviasi sebesar ${stats.stdDev}${unitStr} mengindikasikan variabilitas data yang terkendali antar observasi.
2. **Puncak Tertinggi & Terendah:** Puncak nilai tertinggi tercatat pada kategori **"${peakLabel}"** dengan angka ${stats.max}${unitStr}, sedangkan capaian terendah berada pada kategori **"${lowestLabel}"** senilai ${stats.min}${unitStr}.
3. **Dinamika Pola Data:** ${trendDescription}
4. **Kesimpulan Terhadap Hipotesis:** Temuan ini memperkuat validitas metodologi yang dirumuskan pada Bab III, di mana variabilitas indikator empiris berada dalam batas toleransi dan membuktikan adanya pengaruh nyata parameter uji terhadap performa sistem penelitian.
`;
}

/**
 * Generates clean, crisp SVG vector markup for high-quality embedding
 */
export function generateSvgChart(
  dataset: ParsedDataset,
  config: ChartConfig,
  width = 680,
  height = 360
): string {
  const palette = PALETTES[config.palette] || PALETTES.navy;
  const padding = { top: 40, right: 30, bottom: 65, left: 65 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const data = dataset.rows.map(r => ({
    label: String(r[config.xColumn] ?? ''),
    val: Number(r[config.yColumn]) || 0
  })).slice(0, 15); // Max 15 bars/points for clarity

  if (data.length === 0) {
    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f8fafc"/>
      <text x="50%" y="50%" font-family="sans-serif" font-size="14" fill="#94a3b8" text-anchor="middle">Data tidak tersedia untuk visualisasi</text>
    </svg>`;
  }

  const maxVal = Math.max(1, ...data.map(d => d.val));
  const minVal = Math.min(0, ...data.map(d => d.val));
  const valRange = maxVal - minVal || 1;

  let contentSvg = '';

  // Background Gridlines & Y-axis labels
  const gridTicks = 5;
  for (let i = 0; i <= gridTicks; i++) {
    const ratio = i / gridTicks;
    const yPos = padding.top + innerH * (1 - ratio);
    const tickVal = (minVal + valRange * ratio).toFixed(1);

    contentSvg += `
      <line x1="${padding.left}" y1="${yPos}" x2="${width - padding.right}" y2="${yPos}" stroke="#e2e8f0" stroke-dasharray="3,3" stroke-width="1"/>
      <text x="${padding.left - 8}" y="${yPos + 4}" font-family="sans-serif" font-size="10" fill="#64748b" text-anchor="end">${tickVal}</text>
    `;
  }

  // Render by Chart Type
  if (config.chartType === 'bar') {
    const barWidth = Math.max(16, (innerW / data.length) * 0.65);
    const barGap = innerW / data.length;

    data.forEach((d, idx) => {
      const x = padding.left + idx * barGap + (barGap - barWidth) / 2;
      const barH = (d.val / maxVal) * innerH;
      const y = padding.top + innerH - barH;
      const color = palette.fills[idx % palette.fills.length];

      contentSvg += `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" fill="${color}" rx="3" ry="3"/>
        <text x="${x + barWidth / 2}" y="${y - 6}" font-family="sans-serif" font-size="9.5" font-weight="600" fill="${palette.primary}" text-anchor="middle">${d.val}</text>
        <text x="${x + barWidth / 2}" y="${height - padding.bottom + 18}" font-family="sans-serif" font-size="9.5" fill="#475569" text-anchor="middle" transform="rotate(-25, ${x + barWidth / 2}, ${height - padding.bottom + 18})">${d.label.slice(0, 12)}</text>
      `;
    });
  } else if (config.chartType === 'line' || config.chartType === 'area') {
    const points = data.map((d, idx) => {
      const x = padding.left + (idx / Math.max(1, data.length - 1)) * innerW;
      const y = padding.top + innerH - (d.val / maxVal) * innerH;
      return { x, y, ...d };
    });

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    if (config.chartType === 'area') {
      const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${(padding.top + innerH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padding.top + innerH).toFixed(1)} Z`;
      contentSvg += `<path d="${areaD}" fill="${palette.primary}" fill-opacity="0.15"/>`;
    }

    contentSvg += `<path d="${pathD}" fill="none" stroke="${palette.primary}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;

    points.forEach((p) => {
      contentSvg += `
        <circle cx="${p.x}" cy="${p.y}" r="4" fill="#ffffff" stroke="${palette.primary}" stroke-width="2"/>
        <text x="${p.x}" y="${p.y - 8}" font-family="sans-serif" font-size="9.5" font-weight="600" fill="${palette.primary}" text-anchor="middle">${p.val}</text>
        <text x="${p.x}" y="${height - padding.bottom + 18}" font-family="sans-serif" font-size="9" fill="#475569" text-anchor="middle">${p.label.slice(0, 10)}</text>
      `;
    });
  } else if (config.chartType === 'scatter') {
    data.forEach((d, idx) => {
      const x = padding.left + (idx / Math.max(1, data.length - 1)) * innerW;
      const y = padding.top + innerH - (d.val / maxVal) * innerH;

      contentSvg += `
        <circle cx="${x}" cy="${y}" r="6" fill="${palette.primary}" fill-opacity="0.75" stroke="#ffffff" stroke-width="1.5"/>
        <text x="${x}" y="${y - 8}" font-family="sans-serif" font-size="9" fill="${palette.primary}" text-anchor="middle">${d.val}</text>
        <text x="${x}" y="${height - padding.bottom + 18}" font-family="sans-serif" font-size="9" fill="#475569" text-anchor="middle">${d.label.slice(0, 10)}</text>
      `;
    });
  } else if (config.chartType === 'pie') {
    const total = data.reduce((acc, d) => acc + d.val, 0) || 1;
    const cx = width / 2;
    const cy = height / 2 + 5;
    const radius = Math.min(innerW, innerH) / 2.2;
    let currentAngle = -Math.PI / 2;

    data.forEach((d, idx) => {
      const sliceAngle = (d.val / total) * (2 * Math.PI);
      const nextAngle = currentAngle + sliceAngle;
      const x1 = cx + radius * Math.cos(currentAngle);
      const y1 = cy + radius * Math.sin(currentAngle);
      const x2 = cx + radius * Math.cos(nextAngle);
      const y2 = cy + radius * Math.sin(nextAngle);
      const largeArc = sliceAngle > Math.PI ? 1 : 0;
      const color = palette.fills[idx % palette.fills.length];

      contentSvg += `
        <path d="M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${color}" stroke="#ffffff" stroke-width="1.5"/>
      `;
      currentAngle = nextAngle;
    });
  }

  // Axes base lines
  contentSvg += `
    <line x1="${padding.left}" y1="${padding.top + innerH}" x2="${width - padding.right}" y2="${padding.top + innerH}" stroke="#94a3b8" stroke-width="1.5"/>
    <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + innerH}" stroke="#94a3b8" stroke-width="1.5"/>
  `;

  // Title and Axis Labels
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#ffffff" rx="8"/>
    <text x="${width / 2}" y="22" font-family="sans-serif" font-size="13" font-weight="700" fill="#1e293b" text-anchor="middle">${config.figureNumber}: ${config.title}</text>
    <text x="${width / 2}" y="${height - 10}" font-family="sans-serif" font-size="10.5" font-weight="600" fill="#475569" text-anchor="middle">${config.xLabel || config.xColumn}</text>
    <text x="18" y="${height / 2}" font-family="sans-serif" font-size="10.5" font-weight="600" fill="#475569" text-anchor="middle" transform="rotate(-90, 18, ${height / 2})">${config.yLabel || config.yColumn}${config.unit ? ` (${config.unit})` : ''}</text>
    ${contentSvg}
  </svg>`;
}

/**
 * Compiles the complete Markdown artifact containing Figure embed, Data Table, and Bab 4 Narrative
 */
export function compileChartToCanvasArtifact(
  dataset: ParsedDataset,
  config: ChartConfig,
  svgContent: string
): string {
  const narrative = generateStatisticalNarrative(dataset, config);

  return `\n\n---\n\n## ${config.figureNumber}: ${config.title}\n\n` +
    `<!-- academic-chart:start type="${config.chartType}" x="${config.xColumn}" y="${config.yColumn}" -->\n` +
    `<div align="center">\n\n${svgContent}\n\n*${config.figureNumber}: ${config.title} (Sumber: Hasil Olah Data Penelitian)*\n</div>\n` +
    `<!-- academic-chart:end -->\n\n` +
    narrative + `\n\n---\n`;
}
