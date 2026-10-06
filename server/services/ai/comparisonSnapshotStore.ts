import { createHash } from 'node:crypto';
import type { WorkspaceContextSnapshot } from '../../../shared/contracts/files.js';

export interface WorkspaceComparisonSnapshot {
  snapshotId: string;
  comparisonId: string;
  workspaceId?: string;
  localWorkspaceId?: string;
  prompt: string;
  selectedText?: string;
  systemInstruction: string;
  recentHistory: Array<{ role: 'user' | 'model'; content: string }>;
  documentContext?: WorkspaceContextSnapshot;
  canvasContext?: { artifactId?: string; title: string; version?: number; content: string };
  preset?: { id?: string; taskCategory?: string; responseStyle?: string; latencyPreference?: string; qualityPreference?: string };
  createdAt: string;
  contextFingerprint: string;
  selectedModelIds: string[];
};

interface Entry { userId: string; snapshot: WorkspaceComparisonSnapshot; expiresAt: number; }
const TTL_MS = 20 * 60 * 1000;
const MAX_SNAPSHOTS = 500;
const entries = new Map<string, Entry>();

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach(item => deepFreeze(item));
  }
  return value;
}

function cleanup(now = Date.now()) {
  for (const [id, entry] of entries) if (entry.expiresAt <= now) entries.delete(id);
  while (entries.size >= MAX_SNAPSHOTS) entries.delete(entries.keys().next().value!);
}

export function storeComparisonSnapshot(userId: string, input: WorkspaceComparisonSnapshot): WorkspaceComparisonSnapshot {
  cleanup();
  const copy = structuredClone(input);
  const fingerprintSource = {
    prompt: copy.prompt,
    localWorkspaceId: copy.localWorkspaceId,
    selectedText: copy.selectedText,
    systemInstruction: copy.systemInstruction,
    recentHistory: copy.recentHistory,
    documentContext: copy.documentContext,
    canvasContext: copy.canvasContext,
    preset: copy.preset,
    selectedModelIds: copy.selectedModelIds
  };
  const snapshot = deepFreeze({
    ...copy,
    contextFingerprint: createHash('sha256').update(stableJson(fingerprintSource)).digest('hex')
  });
  entries.set(snapshot.snapshotId, { userId, snapshot, expiresAt: Date.now() + TTL_MS });
  return snapshot;
}

export type SnapshotLookup = { status: 'found'; snapshot: WorkspaceComparisonSnapshot } | { status: 'expired' } | { status: 'forbidden' };
export function getComparisonSnapshot(snapshotId: string, userId: string): SnapshotLookup {
  cleanup();
  const entry = entries.get(snapshotId);
  if (!entry) return { status: 'expired' };
  if (entry.userId !== userId) return { status: 'forbidden' };
  return { status: 'found', snapshot: entry.snapshot };
}

export function hasComparisonSnapshot(comparisonId: string, userId: string): boolean {
  cleanup();
  return [...entries.values()].some(entry => entry.userId === userId && entry.snapshot.comparisonId === comparisonId);
}

export function __clearComparisonSnapshotsForTests() { entries.clear(); }
