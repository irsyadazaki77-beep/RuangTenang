# RuangKerja Interaction Model

## Primary flow

RuangKerja opens on conversation with model selection set to Auto. Users add files or select Canvas context only when needed. Assistant responses can be copied or sent to Canvas; creating a new Canvas artifact persists it through the existing artifact service, while replacing or appending to an existing artifact requires an explicit selection.

## View state and ownership

`workspaceViewReducer` owns the single active inspector (`closed`, `canvas`, `context`, `files`, `sources`, or `plan`), selected citation preview, file preview, and focused task. Workspace route changes reset that view state and its transient context selections. Artifact identity/content stays in the existing artifact hook, and conversation messages stay in the persistence/streaming hooks; these domain stores remain separate so opening a panel does not remount the conversation or editor.

Metadata, messages, artifacts, attachments, source results, task panel drafts, and composer drafts are scoped to the active chat/workspace identity. Composer drafts are kept in session storage under the current user and workspace key, cleared when sent, and never included in a request until the user sends them. Async loads are aborted or ignored when their workspace is no longer active. File context checkboxes are enabled only for ready attachments. The composer summary reports the selected context sent with the next request.

## Navigation and commands

The global command palette keeps its existing Ctrl/Cmd+K entry point. Workspace commands dispatch typed events handled by the active Workspace and are exposed only on an active Workspace route. The palette is not opened by the shortcut while focus is inside a text editor. Commands that would leave an active Workspace are not offered in that route-specific command list.

The inspector tabs are the shared navigation entry for context, files, sources, and plans. Citation clicks open an excerpt and only the parser-provided location; file previews and plans use the same workspace identity. Escape closes the active inspector unless a modal/dialog owns Escape first.

## Responsive behavior

At desktop widths, conversation and inspector/Canvas use the existing split layout. Canvas remains a full-screen editor on narrow screens. Sources use a bottom sheet over the conversation; Files, Context, and Plan occupy the available mobile workspace pane. The existing header controls switch between chat, Canvas, and the shared panel.

## Honest state and limits

File status comes from upload/processing state and server attachment status. Canvas saves use the existing persistence status and expected-version checks. A local draft is not described as server-saved. The plan view displays persisted task state; actual generation/execution still depends on configured server/model services and is not simulated by the UI.

The repository has no browser workflow test that exercises real provider-backed AI generation, uploaded-document parsing, citation retrieval, server-side plan execution, and persisted artifact reopening end-to-end. Component and integration checks can validate navigation/state contracts, but those external workflows require a configured test backend and provider credentials before they can be reported as end-to-end verified.
