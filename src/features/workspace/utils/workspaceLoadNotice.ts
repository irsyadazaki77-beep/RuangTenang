type ErrorToast = (message: string, type?: 'error') => void;

const reportedWorkspaceLoadFailures = new Set<string>();

/** Keep two parallel initial loaders from producing two stacked error toasts. */
export function showWorkspaceLoadFailureOnce(loadAttemptId: string | undefined, showToast: ErrorToast) {
  if (loadAttemptId) {
    if (reportedWorkspaceLoadFailures.has(loadAttemptId)) return;
    reportedWorkspaceLoadFailures.add(loadAttemptId);

    // Keep the module-level guard bounded when users switch through many chats.
    if (reportedWorkspaceLoadFailures.size > 50) {
      const oldestAttempt = reportedWorkspaceLoadFailures.values().next().value;
      if (oldestAttempt) reportedWorkspaceLoadFailures.delete(oldestAttempt);
    }
  }

  showToast('Sebagian data Workspace gagal dimuat. Periksa koneksi lalu coba lagi.', 'error');
}
