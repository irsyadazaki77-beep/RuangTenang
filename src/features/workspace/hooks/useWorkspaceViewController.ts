import { useCallback, useReducer, useRef } from 'react';
import type { FileSourceReference } from '../../../../shared/contracts/files';
import {
  initialWorkspaceViewState,
  workspaceTabForInspector,
  workspaceViewReducer,
  type WorkspaceInspector
} from './workspaceViewState';

export function useWorkspaceViewController() {
  const [workspaceView, dispatchWorkspaceView] = useReducer(workspaceViewReducer, initialWorkspaceViewState);
  const workspaceViewRef = useRef(workspaceView);
  workspaceViewRef.current = workspaceView;
  const inspectorReturnFocusRef = useRef<HTMLElement | null>(null);

  const rememberInspectorFocus = useCallback(() => {
    if (workspaceViewRef.current.inspector === 'closed') {
      inspectorReturnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
  }, []);

  const openWorkspaceInspector = useCallback((inspector: Exclude<WorkspaceInspector, 'closed'>) => {
    rememberInspectorFocus();
    dispatchWorkspaceView({ type: 'open-inspector', inspector });
  }, [rememberInspectorFocus]);

  const closeWorkspaceInspector = useCallback(() => {
    dispatchWorkspaceView({ type: 'close-inspector' });
    requestAnimationFrame(() => inspectorReturnFocusRef.current?.focus());
  }, []);

  const openWorkspaceSource = useCallback((source: FileSourceReference) => {
    rememberInspectorFocus();
    dispatchWorkspaceView({ type: 'select-source', source });
  }, [rememberInspectorFocus]);

  const openWorkspaceFilePreview = useCallback((attachmentId: string) => {
    rememberInspectorFocus();
    dispatchWorkspaceView({ type: 'preview-attachment', attachmentId });
  }, [rememberInspectorFocus]);

  const isCanvasOpen = workspaceView.inspector === 'canvas';
  const isContextPanelOpen = workspaceView.inspector === 'context' || workspaceView.inspector === 'files' || workspaceView.inspector === 'sources' || workspaceView.inspector === 'memory' || workspaceView.inspector === 'plan';
  const workspaceRightTab: 'context' | 'files' | 'sources' | 'memory' | 'plan' = workspaceView.inspector === 'files' || workspaceView.inspector === 'sources' || workspaceView.inspector === 'memory' || workspaceView.inspector === 'plan' ? workspaceView.inspector : 'context';

  return {
    workspaceView,
    dispatchWorkspaceView,
    isCanvasOpen,
    isContextPanelOpen,
    workspaceRightTab,
    mobileActiveTab: workspaceTabForInspector(workspaceView.inspector),
    previewAttachmentId: workspaceView.previewAttachmentId,
    focusedTaskId: workspaceView.focusedTaskId,
    openWorkspaceInspector,
    closeWorkspaceInspector,
    openWorkspaceSource,
    openWorkspaceFilePreview
  };
}
