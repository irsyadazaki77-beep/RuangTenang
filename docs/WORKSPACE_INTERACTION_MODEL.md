# RuangKerja Interaction Model

## Primary flow

RuangKerja opens on conversation with model selection set to Auto. The four starter actions for document analysis, writing, code review, and research use the same prompts on the RuangKerja home and a fresh conversation; additional academic templates remain available from the secondary actions. Users add files or select Canvas context only when needed. Assistant responses can be copied or sent to Canvas; creating a new Canvas artifact persists it through the existing artifact service, while replacing or appending to an existing artifact requires an explicit selection.

## View state and ownership

`workspaceViewReducer` owns the single active inspector (`closed`, `canvas`, `context`, `files`, `sources`, `memory`, or `plan`), selected citation preview, file preview, and focused task. Workspace route changes reset that view state and its transient context selections. Artifact identity/content stays in the existing artifact hook, and conversation messages stay in the persistence/streaming hooks; these domain stores remain separate so opening a panel does not remount the conversation or editor.

Metadata, messages, artifacts, attachments, source results, task panel drafts, and composer drafts are scoped to the active chat/workspace identity. Composer drafts are kept in session storage under the current user and workspace key, cleared when sent, and never included in a request until the user sends them. Async loads are aborted or ignored when their workspace is no longer active. File context checkboxes are enabled only for ready attachments. The composer summary reports the selected context sent with the next request.

Workspace tool selection, input validation, client utility execution, and routing to chat or document revision are owned by `useWorkspaceTools`. Tool output that changes a Canvas artifact goes through the same artifact save/version path; selection text is included only when its artifact identity matches the selected target.

## Navigation and commands

The global command palette keeps its existing Ctrl/Cmd+K entry point. Workspace commands dispatch typed events handled by the active Workspace and are exposed only on an active Workspace route. The palette is not opened by the shortcut while focus is inside a text editor. Commands that would leave an active Workspace are not offered in that route-specific command list.

The inspector tabs are the shared navigation entry for context, files, sources, memory, and plans. Switching tabs preserves the selected source and Memory form state while the workspace remains mounted; opening a different inspector tab closes any file preview. Citation clicks open an excerpt and only the parser-provided location; file previews and plans use the same workspace identity. The composer keeps its model, context, and AI-options controls compact on narrow screens while retaining full accessible labels. Its context control opens the inspector, and the AI-options dialog repeats the additional context that will accompany the next message. Escape closes the active inspector unless a modal/dialog owns Escape first.

## Responsive behavior

At desktop widths, conversation and inspector/Canvas use the existing split layout. Canvas remains a full-screen editor on narrow screens. Sources use a bottom sheet over the conversation; Files, Context, Memory, and Plan occupy the available mobile workspace pane. The existing header controls switch between chat, Canvas, and the shared panel. On narrow composer widths, file attach, model profile, context, AI options, and send remain separate tappable controls; model and context descriptions remain available to assistive technology.

## Honest state and limits

File status comes from upload/processing state and server attachment status. Canvas saves use the existing persistence status and expected-version checks. A local draft is not described as server-saved. The plan view displays persisted task state; actual generation/execution still depends on configured server/model services and is not simulated by the UI.

Browser coverage includes a deterministic streamed-response flow that sends a guest answer to Canvas, verifies its local-only status, and reopens it in the same browser session. This does not verify a real provider, authenticated server persistence, uploaded-document parsing through AI, citation retrieval, or server-side plan execution; those workflows still require a configured test backend and provider credentials before they can be reported as end-to-end verified.
