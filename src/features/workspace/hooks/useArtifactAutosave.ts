import { useCallback, useEffect, useRef } from 'react';

type CanvasViewMode = 'preview' | 'edit' | 'raw' | 'diff';

interface UseArtifactAutosaveOptions {
  content: string;
  title: string;
  viewMode: CanvasViewMode;
  lastSavedContentRef: { current: string };
  onDirty: () => void;
  disabled?: boolean;
  save: (content: string, title: string) => Promise<boolean>;
  delayMs?: number;
}

export function useArtifactAutosave({
  content,
  title,
  viewMode,
  lastSavedContentRef,
  onDirty,
  disabled = false,
  save,
  delayMs = 800
}: UseArtifactAutosaveOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelScheduledSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => {
    if (disabled || viewMode !== 'edit' || content === lastSavedContentRef.current) {
      cancelScheduledSave();
      return;
    }
    onDirty();
    cancelScheduledSave();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void save(content, title);
    }, delayMs);
    return cancelScheduledSave;
  }, [cancelScheduledSave, content, delayMs, disabled, lastSavedContentRef, onDirty, save, title, viewMode]);

  useEffect(() => cancelScheduledSave, [cancelScheduledSave]);

  return { cancelScheduledSave };
}
