import { afterEach, describe, expect, it, vi } from 'vitest';
import { __clearComparisonSnapshotsForTests, getComparisonSnapshot, storeComparisonSnapshot } from '../../services/ai/comparisonSnapshotStore.js';

const input = () => ({
  snapshotId: 'snapshot-1', comparisonId: 'comparison-1', workspaceId: 'chat-1', prompt: 'Prompt',
  systemInstruction: 'Shared instruction', recentHistory: [{ role: 'user' as const, content: 'History' }],
  canvasContext: { artifactId: 'artifact-1', title: 'Canvas', version: 3, content: 'Canvas content longer than the old 1000 character cap.' },
  createdAt: new Date().toISOString(), contextFingerprint: '', selectedModelIds: ['model-a', 'model-b']
});

afterEach(() => { vi.useRealTimers(); __clearComparisonSnapshotsForTests(); });

describe('comparison snapshot store', () => {
  it('stores an immutable user/workspace-scoped snapshot with a deterministic fingerprint', () => {
    const source = input();
    const snapshot = storeComparisonSnapshot('user-a', source);
    source.recentHistory[0].content = 'mutated after start';
    expect(snapshot.recentHistory[0].content).toBe('History');
    expect(Object.isFrozen(snapshot.canvasContext)).toBe(true);
    expect(snapshot.contextFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(getComparisonSnapshot('snapshot-1', 'user-a')).toMatchObject({ status: 'found', snapshot: { workspaceId: 'chat-1' } });
    expect(getComparisonSnapshot('snapshot-1', 'user-b').status).toBe('forbidden');
  });

  it('expires snapshots instead of silently rebuilding them', () => {
    vi.useFakeTimers();
    storeComparisonSnapshot('user-a', input());
    vi.advanceTimersByTime(20 * 60 * 1000 + 1);
    expect(getComparisonSnapshot('snapshot-1', 'user-a').status).toBe('expired');
  });
});
