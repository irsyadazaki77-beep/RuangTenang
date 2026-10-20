import { expect, test } from '@playwright/test';
import type { TabularDataset } from '../shared/contracts/tabular';
import type { WorkspaceTabularOverviewDto } from '../src/features/workspace/services/workspaceApiService';

const fileCount = 8;
const columns = Array.from({ length: 12 }, (_, index) => ({
  name: `column_${index + 1}`,
  originalName: `column_${index + 1}`,
  inferredType: index === 0 ? 'string' as const : 'integer' as const,
  nullable: false,
  uniqueCount: 10_000,
  missingCount: 0,
  sampleValues: index === 0 ? ['Item 0', 'Item 1'] : [1, 2],
  ...(index === 0 ? { topValues: [{ value: 'Item 0', count: 1 }] } : { min: 1, max: 10_000, mean: 5000, median: 5000 })
}));

function createOverview(attachmentId: string, filename: string): WorkspaceTabularOverviewDto {
  const dataset: TabularDataset = {
    id: `${attachmentId}:Data`, workspaceId: 'preview-probe-workspace', sourceFileId: attachmentId,
    name: filename, sheetName: 'Data', version: `${attachmentId}-checksum`, rowCount: 10_000, columnCount: columns.length,
    columns, sheets: [{ name: 'Data', rowCount: 10_000, columnCount: columns.length, empty: false }],
    activeSheet: 'Data', profileScope: 'complete',
    quality: { missingCellCount: 0, missingCellPercent: 0, duplicateRowCount: 0, emptyColumnCount: 0, inconsistentColumns: [], repeatedHeaderRows: 0, potentialOutlierCells: 0 },
    createdAt: '2026-10-17T00:00:00.000Z'
  };
  const rows = Array.from({ length: 25 }, (_, rowIndex) => Object.fromEntries(columns.map((column, columnIndex) => [
    column.name,
    columnIndex === 0 ? `Item ${rowIndex}` : rowIndex + columnIndex
  ])));
  return { dataset, preview: { sheetName: 'Data', columns: columns.map(column => column.name), rows, offset: 0, limit: 25, rowCount: 10_000 } };
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] || 0;
}

test('previews eight tabular attachments without duplicate profile and first-page loads', async ({ browser }) => {
  const sampleMetrics: Array<{ fileReadyMs: number[]; maxLongTaskMs: number; mountedRows: number }> = [];

  for (let sample = 0; sample < 3; sample += 1) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const observedRequests: string[] = [];
    await page.route('**/api/v1/chat/attachments/**', async route => {
      const url = new URL(route.request().url());
      observedRequests.push(`${route.request().method()} ${url.pathname}${url.search}`);
      const attachmentMatch = url.pathname.match(/\/attachments\/([^/]+)\/(preview|dataset\/overview|dataset|dataset\/preview)$/);
      if (!attachmentMatch) return route.fulfill({ status: 404, json: { success: false, message: 'Not found' } });
      const attachmentId = decodeURIComponent(attachmentMatch[1]);
      const attachmentIdParts = attachmentId.split('-');
      const filename = `sales-${attachmentIdParts[attachmentIdParts.length - 1]}.csv`;
      await new Promise(resolve => setTimeout(resolve, 15));

      if (attachmentMatch[2] === 'preview') {
        return route.fulfill({ json: { success: true, data: { id: attachmentId, filename, mimeType: 'text/csv', fileKind: 'csv', size: 240_000, chunkCount: 100, previewText: '' } } });
      }
      if (attachmentMatch[2] === 'dataset/overview') {
        return route.fulfill({ json: { success: true, data: createOverview(attachmentId, filename) } });
      }
      return route.fulfill({ status: 500, json: { success: false, message: 'Duplicate load path should not be used' } });
    });

    await page.goto('/e2e/workspace-preview-performance.html', { waitUntil: 'domcontentloaded' });
    const fileReadyMs: number[] = [];
    for (let fileIndex = 1; fileIndex <= fileCount; fileIndex += 1) {
      const startedAt = await page.evaluate(() => performance.now());
      await page.getByRole('button', { name: `Buka sales-${fileIndex}.csv` }).click();
      await expect(page.getByRole('heading', { name: `sales-${fileIndex}.csv` })).toBeVisible();
      await expect(page.locator('tbody tr')).toHaveCount(25);
      fileReadyMs.push(await page.evaluate(startedAt => performance.now() - startedAt, startedAt));
      await page.getByRole('button', { name: 'Tutup preview' }).click();
    }
    await page.waitForTimeout(100);

    const metrics = await page.evaluate(() => ({
      maxLongTaskMs: Math.max(0, ...(window as Window & { __workspacePreviewLongTasks?: number[] }).__workspacePreviewLongTasks || []),
      mountedRows: document.querySelectorAll('tbody tr').length
    }));
    sampleMetrics.push({ fileReadyMs, ...metrics });

    const metadataLoads = observedRequests.filter(value => value.endsWith('/preview'));
    const overviewLoads = observedRequests.filter(value => value.includes('/dataset/overview'));
    expect(metadataLoads).toHaveLength(fileCount);
    expect(overviewLoads).toHaveLength(fileCount);
    expect(observedRequests.filter(value => /\/dataset(?:\?|$)|\/dataset\/preview/.test(value))).toHaveLength(0);
    expect(metrics.mountedRows).toBe(0);
    await context.close();
  }

  const allReadyTimes = sampleMetrics.flatMap(sample => sample.fileReadyMs);
  console.info(`Workspace preview browser probe (3 contexts × 8 files; 15 ms per mock response): ${JSON.stringify({ medianReadyMs: median(allReadyTimes), maxReadyMs: Math.max(...allReadyTimes), sampleMetrics })}`);
});
