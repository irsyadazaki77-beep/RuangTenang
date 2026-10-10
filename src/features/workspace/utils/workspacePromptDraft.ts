const WORKSPACE_PROMPT_DRAFT_PREFIX = 'ruangkerja:prompt-draft:';

function promptDraftKey(workspaceIdentity: string): string {
  return `${WORKSPACE_PROMPT_DRAFT_PREFIX}${encodeURIComponent(workspaceIdentity)}`;
}

export function readWorkspacePromptDraft(storage: Pick<Storage, 'getItem'> | null, workspaceIdentity: string): string {
  try { return storage?.getItem(promptDraftKey(workspaceIdentity)) || ''; } catch { return ''; }
}

export function writeWorkspacePromptDraft(storage: Pick<Storage, 'setItem' | 'removeItem'> | null, workspaceIdentity: string, draft: string): void {
  try {
    const key = promptDraftKey(workspaceIdentity);
    if (draft) storage?.setItem(key, draft.slice(0, 2000));
    else storage?.removeItem(key);
  } catch {
    // The composer stays usable when session storage is blocked or full.
  }
}
