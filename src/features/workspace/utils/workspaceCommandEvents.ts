export type WorkspaceCommandId = 'open-canvas' | 'open-files' | 'open-sources' | 'open-plan' | 'new-document' | 'compare-models';

export const WORKSPACE_COMMAND_EVENT = 'ruangtenang:workspace-command';

export function dispatchWorkspaceCommand(commandId: WorkspaceCommandId) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<WorkspaceCommandId>(WORKSPACE_COMMAND_EVENT, { detail: commandId }));
}
