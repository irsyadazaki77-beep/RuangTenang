import type { FileSourceReference } from '../../../../shared/contracts/files';
import type { WorkspaceTab } from '../types';

export type WorkspaceInspector = 'closed' | 'canvas' | 'context' | 'files' | 'sources' | 'plan';

export interface WorkspaceViewState {
  inspector: WorkspaceInspector;
  selectedSource: FileSourceReference | null;
  previewAttachmentId: string | null;
  focusedTaskId: string | null;
}

export type WorkspaceViewAction =
  | { type: 'open-inspector'; inspector: Exclude<WorkspaceInspector, 'closed'> }
  | { type: 'close-inspector' }
  | { type: 'select-source'; source: FileSourceReference }
  | { type: 'clear-source-preview' }
  | { type: 'preview-attachment'; attachmentId: string }
  | { type: 'close-file-preview' }
  | { type: 'focus-task'; taskId: string | null }
  | { type: 'reset-workspace-view' };

export const initialWorkspaceViewState: WorkspaceViewState = {
  inspector: 'closed',
  selectedSource: null,
  previewAttachmentId: null,
  focusedTaskId: null
};

export function workspaceViewReducer(state: WorkspaceViewState, action: WorkspaceViewAction): WorkspaceViewState {
  switch (action.type) {
    case 'open-inspector':
      return { ...state, inspector: action.inspector, previewAttachmentId: null };
    case 'close-inspector':
      return { ...state, inspector: 'closed', previewAttachmentId: null };
    case 'select-source':
      return { ...state, inspector: 'sources', selectedSource: action.source, previewAttachmentId: null };
    case 'clear-source-preview':
      return { ...state, selectedSource: null };
    case 'preview-attachment':
      return { ...state, previewAttachmentId: action.attachmentId };
    case 'close-file-preview':
      return { ...state, previewAttachmentId: null };
    case 'focus-task':
      return { ...state, focusedTaskId: action.taskId };
    case 'reset-workspace-view':
      return initialWorkspaceViewState;
    default:
      return state;
  }
}

export function workspaceTabForInspector(inspector: WorkspaceInspector): WorkspaceTab {
  if (inspector === 'canvas') return 'canvas';
  if (inspector === 'sources') return 'sources';
  if (inspector === 'closed') return 'chat';
  return 'context';
}
