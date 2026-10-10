# Workspace Performance Baseline

## Measurement context

- Branch: `main`, at `6d4ae9bde2f7470d79e25dcc7ea9d5d30d634233` (`origin/main` matched at audit time).
- The working tree already contained extensive local changes before this phase. Baseline tests and build therefore describe that working tree, not a pristine checkout.
- Browser Performance panel, production browser session, and authenticated data scenarios were not available in this run. No browser timing, heap, or long-task figures are inferred.
- Production bundle measurements come from `npm run build` in the same Windows/Node environment. Minified chunk bytes are Vite output and gzip bytes are Vite's reported gzip estimates.

## Static architecture audit

- `StudentWorkspace.tsx` is still the route/session orchestrator. Existing local changes had separated workspace view state and several services/hooks, but stream, artifact, task, compare, file and inspector coordination still converge there.
- `WorkspaceConversation.tsx` kept a memoized array of complete row elements. A changed dependency such as the artifact array or action callback recreated every row. Streaming bubble updates also rerendered the parent conversation.
- `WorkspaceCanvasPane.tsx` imported `ArtifactCanvas` statically, so editor, code execution, and artifact UI code was included in the Workspace chunk even when Canvas was closed.
- `useWorkspaceStreaming.ts` already bounded token UI publication to 50 ms, artifact parsing to 100 ms, guarded callbacks with workspace/request/generation identity, flushed final output, and aborted on workspace change/unmount. This behavior was retained.
- `useWorkspaceArtifacts.ts` already kept local drafts in session storage and serialized saves per artifact with optimistic-concurrency timestamps. This behavior was retained.

## Changes in this pass

- Extracted Plan/Task execution and review actions into `useWorkspaceAgentController`; `StudentWorkspace.tsx` remains an orchestration layer and is 1,365 lines in the current working tree, so deeper separation of stream, compare, and canvas coordination remains follow-up work.
- Moved each persisted conversation message into a memoized row with an explicit prop comparison. Streaming updates leave completed row props stable; message identity changes still update the affected row.
- Lazy-loaded `ArtifactCanvas` at the Canvas pane boundary. Its editor/code/chart/export code is no longer in the Workspace route chunk.
- Lazy-loaded the Compare panel and file preview on demand; the ordinary chat path does not fetch those feature chunks.
- Kept the existing streaming buffers/request guards and artifact draft/save behavior unchanged.

## Baseline and current measurements

| Metric | Before | After | Result |
|---|---:|---:|---|
| Streaming test: 500 one-character chunks | Pass; bounded by `<25` Profiler commits; test body 7.27 s | Pass; same assertion; test body 7.59 s | Harness timing is dominated by simulated delays/JSDOM; not a user-perceived latency benchmark |
| Workspace production chunk | 609.85 kB (115.15 kB gzip) | 391.63 kB (81.75 kB gzip) | −218.22 kB raw, −33.40 kB gzip |
| ArtifactCanvas chunk | Included in Workspace chunk | 141.12 kB (22.79 kB gzip), loaded on Canvas use | Deferred until Canvas opens |
| Compare panel | Included in Workspace chunk | 20.67 kB (5.14 kB gzip), loaded when a comparison exists | Deferred until Compare Mode returns a run |
| File preview | Included in Workspace chunk | 63.36 kB (9.20 kB gzip), loaded when a preview opens | Deferred until file preview is requested |
| Editor typing latency (10/50/250 KB) | not measured | not measured | Browser instrumentation not run |
| 100/500 persisted messages | not measured | not measured | Deterministic render-isolation unit test added; no browser timing |
| Workspace mount/switch, Canvas opening, file preview, Compare, Home | not measured | not measured | Browser walkthrough not run |
| JS heap, long tasks, scroll jitter | not measured | not measured | Browser Performance panel unavailable |

The existing stream test's `<25` assertion is a guardrail, not an exact commit count. It exercises the streaming hook with a synthetic client and must not be read as a production latency figure.

## Scenarios not measured

Scenarios A–H from the phase brief (empty workspace, 100/500 messages, 10,000-character stream, 50,000-character artifact, Markdown table/code, many files, and three-model Compare) were not run in a browser. Browser-only measures remain explicitly `not measured` pending a production-like session with representative data.

## Post-change verification

Final production build completed after the controller extraction and additional lazy boundaries. Workspace, ArtifactCanvas, Compare, and file preview chunks measured 391.63 / 141.12 / 20.67 / 63.36 kB respectively. The following validation was also run:

- `npm run typecheck` — PASS.
- `npm run lint` — PASS; targeted lint after the controller extraction also passed.
- Focused workspace unit tests — PASS: 72 tests across Canvas, UX, streaming performance, agent/task controller, message-row isolation, Compare, tabular preview, Workspace state, and Home. A 29-test rerun covering artifact persistence, Canvas draft recovery, tabular preview, and Compare also passed.
- `npx playwright test e2e/workspaceInteraction.spec.ts --project=chromium` — PASS: 2 tests (Canvas inspector command and responsive widths 360, 390, 768, 1024, 1440).
- `npm run build` — PASS. Vite still reports the existing `vendor-mermaid` chunk at 5,037.84 kB; Mermaid remains dynamically loaded. The final build also warns for chunks above 500 kB.
- `npm run test:unit` — not completed. The runner produced no test summary after about 12 minutes; its worker reached about 3.5 GB RAM, so it was interrupted. Prisma generation first reported Windows `EPERM` on a temporary query-engine rename, then continued with the existing generated client.
- Integration and security suites — not run. No backend code was changed in this pass.
- `npm ci` — skipped because the repository already had installed dependencies; dependency installation was not needed for these checks.

Do not convert test counts or chunk sizes into claims about browser render time.
