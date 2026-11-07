import { describe, it, expect } from 'vitest';
import {
  parseDataToDataset,
  calculateDescriptiveStats,
  generateStatisticalNarrative,
  generateSvgChart,
  compileChartToCanvasArtifact,
  ChartConfig
} from '../../features/workspace/utils/dataStudioChartEngine';

describe('Data Studio & Academic Chart Engine', () => {
  const sampleCsv = `Kategori, Nilai_Performa, Waktu_ms
Sampel A, 80, 120
Sampel B, 85, 110
Sampel C, 90, 105
Sampel D, 95, 95`;

  const sampleMarkdownTable = `| Model | Akurasi | F1_Score |
| :--- | :--- | :--- |
| Naive Bayes | 78.5 | 0.77 |
| Random Forest | 88.2 | 0.86 |
| SVM RBF | 92.4 | 0.91 |`;

  describe('parseDataToDataset', () => {
    it('parses CSV input and identifies column types accurately', () => {
      const dataset = parseDataToDataset(sampleCsv);
      expect(dataset.columns).toEqual(['Kategori', 'Nilai_Performa', 'Waktu_ms']);
      expect(dataset.numericColumns).toContain('Nilai_Performa');
      expect(dataset.numericColumns).toContain('Waktu_ms');
      expect(dataset.categoricalColumns).toContain('Kategori');
      expect(dataset.rows).toHaveLength(4);
      expect(dataset.rows[0]['Nilai_Performa']).toBe(80);
    });

    it('parses Markdown table input seamlessly', () => {
      const dataset = parseDataToDataset(sampleMarkdownTable);
      expect(dataset.columns).toEqual(['Model', 'Akurasi', 'F1_Score']);
      expect(dataset.rows).toHaveLength(3);
      expect(dataset.rows[1]['Model']).toBe('Random Forest');
      expect(dataset.rows[1]['Akurasi']).toBe(88.2);
    });

    it('handles empty input gracefully', () => {
      const dataset = parseDataToDataset('');
      expect(dataset.columns).toHaveLength(0);
      expect(dataset.rows).toHaveLength(0);
    });
  });

  describe('calculateDescriptiveStats', () => {
    it('calculates mean, median, min, max, range, and standard deviation', () => {
      const values = [10, 20, 30, 40, 50];
      const stats = calculateDescriptiveStats(values);
      expect(stats.count).toBe(5);
      expect(stats.mean).toBe(30);
      expect(stats.median).toBe(30);
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(50);
      expect(stats.range).toBe(40);
      expect(stats.stdDev).toBeGreaterThan(14);
    });

    it('handles empty or single item arrays', () => {
      expect(calculateDescriptiveStats([]).count).toBe(0);
      const single = calculateDescriptiveStats([42]);
      expect(single.count).toBe(1);
      expect(single.mean).toBe(42);
      expect(single.stdDev).toBe(0);
    });
  });

  describe('generateStatisticalNarrative & compileChartToCanvasArtifact', () => {
    it('generates academic Bab 4 descriptive narrative with thesis guidelines', () => {
      const dataset = parseDataToDataset(sampleCsv);
      const config: ChartConfig = {
        title: 'Evaluasi Nilai Performa',
        figureNumber: 'Gambar 4.2',
        chartType: 'bar',
        xColumn: 'Kategori',
        yColumn: 'Nilai_Performa',
        palette: 'emerald',
        xLabel: 'Kategori Sampel',
        yLabel: 'Nilai Performa',
        unit: '%',
        researchContext: 'Klasifikasi Anomali Jaringan'
      };

      const narrative = generateStatisticalNarrative(dataset, config);
      expect(narrative).toContain('Gambar 4.2');
      expect(narrative).toContain('Evaluasi Nilai Performa');
      expect(narrative).toContain('Klasifikasi Anomali Jaringan');
      expect(narrative).toContain('Ukuran Sampel ($N$)');
      expect(narrative).toContain('Rata-rata (*Mean* / $\\mu$)');
      expect(narrative).toContain('Standar Deviasi ($\\sigma$)');
      expect(narrative).toContain('Bab IV');
    });

    it('creates SVG chart with valid SVG tags and axis labels', () => {
      const dataset = parseDataToDataset(sampleCsv);
      const config: ChartConfig = {
        title: 'Evaluasi Nilai Performa',
        figureNumber: 'Gambar 4.2',
        chartType: 'bar',
        xColumn: 'Kategori',
        yColumn: 'Nilai_Performa',
        palette: 'navy',
        xLabel: 'Kategori Sampel',
        yLabel: 'Nilai Performa',
        unit: '%'
      };

      const svg = generateSvgChart(dataset, config);
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('Gambar 4.2: Evaluasi Nilai Performa');
      expect(svg).toContain('Nilai Performa (%)');
    });

    it('compiles full canvas artifact with figure and narrative tags', () => {
      const dataset = parseDataToDataset(sampleCsv);
      const config: ChartConfig = {
        title: 'Grafik Garis',
        figureNumber: 'Gambar 4.3',
        chartType: 'line',
        xColumn: 'Kategori',
        yColumn: 'Nilai_Performa',
        palette: 'indigo',
        xLabel: 'Kategori',
        yLabel: 'Nilai'
      };

      const svg = generateSvgChart(dataset, config);
      const artifact = compileChartToCanvasArtifact(dataset, config, svg);
      expect(artifact).toContain('<!-- academic-chart:start');
      expect(artifact).toContain('Gambar 4.3: Grafik Garis');
      expect(artifact).toContain('<!-- academic-chart:end -->');
    });
  });
});
