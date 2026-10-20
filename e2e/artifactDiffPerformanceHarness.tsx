import React, { useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ArtifactDiffViewer } from '../src/features/workspace/components/ArtifactDiffViewer';
import type { ArtifactVersionRecord, WorkspaceArtifact } from '../src/features/workspace/types';
import '../src/index.css';

declare global {
  interface Window {
    __artifactDiffStartedAt?: number;
    __artifactDiffReady?: boolean;
    __artifactDiffLongTasks?: number[];
  }
}

const previousLines: string[] = [];
const currentLines: string[] = [];
for (let index = 0; index < 1_200; index += 1) {
  previousLines.push(`Bagian ${index}`, `Isi lama ${index}`);
  currentLines.push(`Bagian ${index}`, `Isi baru ${index}`);
}

const previousContent = previousLines.join('\n');
const currentContent = currentLines.join('\n');
const previousVersion: ArtifactVersionRecord = {
  id: 'diff-probe-version-1',
  artifactId: 'diff-probe-artifact',
  version: 1,
  title: 'Versi awal',
  content: previousContent,
  createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString()
};
const artifact: WorkspaceArtifact = {
  id: 'diff-probe-artifact',
  title: 'Perbandingan dokumen besar',
  type: 'DOCUMENT',
  content: currentContent,
  version: 2,
  versions: [previousVersion],
  updatedAt: new Date('2026-01-02T00:00:00.000Z').toISOString()
};

window.__artifactDiffStartedAt = performance.now();
window.__artifactDiffLongTasks = [];
try {
  new PerformanceObserver(list => {
    window.__artifactDiffLongTasks?.push(...list.getEntries().map(entry => entry.duration));
  }).observe({ type: 'longtask', buffered: true });
} catch {
  // Long-task entries are optional in browsers that do not expose this API.
}

function ArtifactDiffProbe() {
  useLayoutEffect(() => {
    window.__artifactDiffReady = true;
    document.body.dataset.diffRows = String(document.querySelectorAll('div.flex.items-start.gap-2').length);
    document.body.dataset.diffRenderMs = String(performance.now() - (window.__artifactDiffStartedAt || 0));
  }, []);

  return <main className="h-screen p-4">
    <ArtifactDiffViewer currentArtifact={artifact} baseVersion={previousVersion} />
  </main>;
}

createRoot(document.getElementById('root')!).render(<ArtifactDiffProbe />);
