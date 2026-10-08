import { z } from 'zod';

export const DatasetColumnTypeSchema = z.enum(['string', 'number', 'integer', 'date', 'boolean', 'currency', 'percentage', 'unknown']);
export type DatasetColumnType = z.infer<typeof DatasetColumnTypeSchema>;

export interface DatasetColumn {
  name: string;
  originalName: string;
  inferredType: DatasetColumnType;
  nullable: boolean;
  uniqueCount: number;
  missingCount: number;
  sampleValues: unknown[];
  min?: number | string;
  max?: number | string;
  mean?: number;
  median?: number;
  topValues?: Array<{ value: string; count: number }>;
  potentialOutlierCount?: number;
  earliest?: string;
  latest?: string;
  semantic?: { value: string; confidence: 'inferred' };
  inferredName?: boolean;
}

export interface TabularSheetSummary {
  name: string;
  rowCount: number;
  columnCount: number;
  empty: boolean;
}

export interface TabularDataset {
  id: string;
  workspaceId: string;
  sourceFileId: string;
  name: string;
  sheetName?: string;
  version: string;
  rowCount: number;
  columnCount: number;
  columns: DatasetColumn[];
  sheets: TabularSheetSummary[];
  activeSheet: string;
  profileScope: 'complete';
  quality: { missingCellCount: number; missingCellPercent: number; duplicateRowCount: number; emptyColumnCount: number; inconsistentColumns: string[]; repeatedHeaderRows: number; potentialOutlierCells: number };
  createdAt: string;
}

export const TabularAggregationSchema = z.enum(['count', 'sum', 'mean', 'median', 'min', 'max', 'distinct_count']);
export const TabularFilterSchema = z.object({
  column: z.string().min(1).max(255),
  operation: z.enum(['equals', 'not_equals', 'greater_than', 'less_than', 'between', 'contains', 'is_empty', 'is_not_empty']),
  value: z.unknown().optional(),
  valueTo: z.unknown().optional()
}).strict();
export const TabularAnalysisRequestSchema = z.object({
  sheetName: z.string().max(255).optional(),
  groupBy: z.string().max(255).optional(),
  dateBucket: z.enum(['day', 'month', 'quarter', 'year']).optional(),
  column: z.string().max(255).optional(),
  aggregation: TabularAggregationSchema,
  filters: z.array(TabularFilterSchema).max(10).default([]),
  limit: z.number().int().min(1).max(500).default(100)
}).strict();
export type TabularAnalysisRequest = z.infer<typeof TabularAnalysisRequestSchema>;

const DataTransformationSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('remove_empty_rows') }).strict(),
  z.object({ type: z.literal('remove_duplicates'), columns: z.array(z.string().min(1).max(255)).max(30).optional() }).strict(),
  z.object({ type: z.literal('fill_missing'), column: z.string().min(1).max(255), strategy: z.enum(['mean', 'median', 'mode', 'custom']), customValue: z.unknown().optional() }).strict(),
  z.object({ type: z.literal('normalize_date'), column: z.string().min(1).max(255), dateOrder: z.enum(['dmy', 'mdy', 'ymd']) }).strict(),
  z.object({ type: z.literal('normalize_number'), column: z.string().min(1).max(255), decimalSeparator: z.enum(['comma', 'dot']) }).strict()
]);

export const TabularTransformRequestSchema = z.object({
  sheetName: z.string().max(255).optional(),
  operations: z.array(DataTransformationSchema).min(1).max(10),
  expectedVersion: z.string().min(1).max(128)
}).strict();
export type DataTransformation = z.infer<typeof DataTransformationSchema>;
export type TabularTransformRequest = z.infer<typeof TabularTransformRequestSchema>;

export interface TabularTransformPreview {
  sourceFileId: string;
  sourceVersion: string;
  sheetName: string;
  operations: DataTransformation[];
  sourceRowCount: number;
  resultRowCount: number;
  rowsRemoved: number;
  cellsChanged: number;
  previewRows: Array<Record<string, unknown>>;
  summary: Array<{ operation: DataTransformation['type']; affected: number; message: string }>;
}

export interface TabularAnalysisResult {
  datasetId: string;
  datasetVersion: string;
  sheetName: string;
  operations: TabularAnalysisRequest;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  matchedRowCount: number;
  truncated: boolean;
  provenance: { sourceFileId: string; filename: string; checksum: string; sheetName: string; computedAt: string };
}
