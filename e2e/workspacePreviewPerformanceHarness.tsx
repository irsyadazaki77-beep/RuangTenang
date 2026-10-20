import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { WorkspaceFilePreviewModal } from '../src/features/workspace/components/WorkspaceFilePreviewModal';
import '../src/index.css';

const files = Array.from({ length: 8 }, (_, index) => ({
  id: `preview-probe-${index + 1}`,
  filename: `sales-${index + 1}.csv`
}));

declare global {
  interface Window {
    __workspacePreviewLongTasks?: number[];
  }
}

window.__workspacePreviewLongTasks = [];
try {
  new PerformanceObserver(list => {
    window.__workspacePreviewLongTasks?.push(...list.getEntries().map(entry => entry.duration));
  }).observe({ type: 'longtask', buffered: true });
} catch {
  // Long-task entries are optional in browsers that do not expose this API.
}

function WorkspacePreviewProbe() {
  const [attachmentId, setAttachmentId] = useState<string | null>(null);

  return <main className="min-h-screen space-y-2 p-6">
    <h1 className="text-lg font-semibold">Preview delapan lampiran</h1>
    <p className="text-sm text-slate-600">Buka satu file pada satu waktu untuk mengukur pergantian preview.</p>
    <div className="flex flex-wrap gap-2">
      {files.map(file => <button key={file.id} type="button" onClick={() => setAttachmentId(file.id)} className="rounded border px-3 py-2 text-sm">
        Buka {file.filename}
      </button>)}
    </div>
    {attachmentId && <WorkspaceFilePreviewModal attachmentId={attachmentId} onClose={() => setAttachmentId(null)} />}
  </main>;
}

createRoot(document.getElementById('root')!).render(<WorkspacePreviewProbe />);
