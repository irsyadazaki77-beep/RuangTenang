# Workspace Performance Baseline

## Measurement context

- Branch: `main`, at `6d4ae9bde2f7470d79e25dcc7ea9d5d30d634233` (`origin/main` matched at audit time).
- The working tree already contained extensive local changes before this phase. Baseline tests and build therefore describe that working tree, not a pristine checkout.
- Browser Performance panel, production deployment, and authenticated data scenarios were not available in this run. A temporary local production preview was measured in Chromium; its timing is reported below and applies only to an empty guest Workspace on this device.
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
- Reconnected the previously unused `useWorkspaceTools` hook and moved tool selection, input validation, client utilities, artifact saves, and AI/revision routing out of `StudentWorkspace.tsx`. The hook captures a matching Canvas text selection for tools that require one and uses a ref lock rather than state updates for its in-flight guard.
- Added hook coverage for AI artifact revisions, text response routing, and persisted client-utility output.

## Baseline and current measurements

| Metric | Before | After | Result |
|---|---:|---:|---|
| Streaming test: 500 one-character chunks | Pass; bounded by `<25` Profiler commits; test body 7.27 s | Pass; same assertion; test body 7.59 s | Harness timing is dominated by simulated delays/JSDOM; not a user-perceived latency benchmark |
| Workspace production chunk | 609.85 kB (115.15 kB gzip) | 391.63 kB (81.75 kB gzip) | −218.22 kB raw, −33.40 kB gzip |
| ArtifactCanvas chunk | Included in Workspace chunk | 141.12 kB (22.79 kB gzip), loaded on Canvas use | Deferred until Canvas opens |
| Compare panel | Included in Workspace chunk | 20.67 kB (5.14 kB gzip), loaded when a comparison exists | Deferred until Compare Mode returns a run |
| File preview | Included in Workspace chunk | 63.36 kB (9.20 kB gzip), loaded when a preview opens | Deferred until file preview is requested |
| Editor input 50 KB | not measured | Playwright `fill` median 1.42 s; one long task 1.25–1.50 s; one-character edit 50–56 ms | Production preview, three fresh local Chromium contexts; `fill` is not a physical clipboard-paste gesture, and a textarea implementation experiment produced no conclusive gain |
| 100/500 persisted messages | not measured | not measured | Synthetic browser stress probe now measures 100/500 mounted messages; persisted-history timing remains unmeasured |
| Empty Workspace mount, before optional-panel split | not measured | FCP 104–132 ms, median 120 ms | Three fresh same-device contexts; not API-backed |
| Empty Workspace mount, after optional-panel split | not measured | FCP 104–168 ms, median 136 ms | Six fresh same-device contexts; timing does not show a consistent improvement |
| Workspace switch, Canvas opening, file preview, Compare, Home | not measured | Canvas opening 419–452 ms; visual editor ready 863–928 ms; Markdown mode switch 59–77 ms | Canvas figures use the local production preview and a 50 KB fixture. Workspace switching, file preview, Compare, and Home walkthrough timing remain unmeasured. |
| JS heap, scroll jitter | not measured | not measured | Browser instrumentation not run |
| Long tasks | not measured | Empty workspace: one task per sample, 68–104 ms before and 70–141 ms after split. Loaded Canvas input: 1.25–1.50 s during 50 KB `fill`. | Local preview only. The Canvas task is severe in this synthetic input flow and needs profiling on a real device. |
| Initial JavaScript resources | not measured | 24 scripts / 432,040 encoded / 1,648,974 decoded before; 23 / 424,296 / 1,606,387 after | About 1.8% fewer encoded bytes; local static preview only |

The existing stream test's `<25` assertion is a guardrail, not an exact commit count. It exercises the streaming hook with a synthetic client and must not be read as a production latency figure.

## Scenarios not measured

Scenarios A–H from the phase brief (empty workspace, 100/500 messages, 10,000-character stream, 50,000-character artifact, Markdown table/code, many files, and three-model Compare) were not all run in a browser. The empty guest Workspace, a timed 10,000-character stream, and a 50 KB Canvas document now have local production-preview measurements below. Message counts and Markdown have synthetic fixtures. Many-file retrieval, three-model Compare, and a production-server/device/network pass still need browser coverage.

## Earlier broad verification snapshot

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

## Current working-tree spot check — 2026-10-17

- Branch: `codex/fase26-multimodal-intelligence`. This is a separate measurement of the current dirty working tree; it is not a before/after comparison with the earlier `main` snapshot.
- Final `npx vite build --outDir <temporary-directory> --emptyOutDir` passed in 28.68 s after tool-controller extraction. Build output was written under the OS temporary directory; the repository's existing `dist/` output was left untouched. Vite warned about chunks over 500 kB.
- Current Workspace route chunk: `StudentWorkspace` 402.95 kB raw / 82.71 kB gzip. Compared with the immediately preceding build, raw size rose by 0.88 kB while gzip fell by 0.33 kB; compared with the pre-optional-panel build (442.14 / 89.59 kB), it is 39.19 kB raw / 6.88 kB gzip smaller. Canvas editor: 539.00 / 167.31 kB, loaded on demand. Other large chunks in this build include ELK 1,477.33 / 453.68 kB, ExcelJS 938.83 / 270.66 kB, and Mermaid core 648.51 / 157.70 kB.
- Static source size: `StudentWorkspace.tsx` 1,461 lines, `useWorkspaceTools.ts` 148 lines, `ArtifactCanvas.tsx` 1,352 lines, `WorkspaceConversation.tsx` 272 lines, `useWorkspaceStreaming.ts` 386 lines, `useWorkspaceArtifacts.ts` 553 lines, and `contextRetrievalService.ts` 397 lines. Line count indicates coordination complexity; it is not itself a runtime metric.
- The 500-chunk streaming guard, Workspace Home pagination/UI tests, API pagination integration tests, and `npm run typecheck` passed in this pass. The streaming guard is a JSDOM render-count check, not browser latency.
- The Home route now fetches one 100-item summary page at mount. It avoids loading task and plan rows there; later pages are requested only after the user expands the list and asks for more.
- Local production-preview probe (same-device Chromium, empty guest Workspace, fresh browser contexts; run on the code-split build before the guest-draft persistence and tool-controller changes): before optional-panel splitting, three FCP samples were 120, 132, and 104 ms; after splitting, six were 168, 144, 120, 140, 132, and 104 ms. The medians were 120 and 136 ms respectively, so these small samples do not establish a user-visible FCP improvement. After splitting, one long task per sample measured 106, 141, 73, 70, 74, and 72 ms. JavaScript resources fell from 24 / 432,040 encoded / 1,648,974 decoded bytes to 23 / 424,296 / 1,606,387 bytes. The two later changes were build-verified but were not separately timed in Chromium. This is a local static-preview comparison, not API-backed and not representative of production users or devices.
- The production-preview sections below now measure 50 KB automated Canvas input and a timed 10,000-character stream; an in-memory server fixture measures ranking across 800 chunks. A Vite development-browser probe now measures large Compare rendering with paginated rows. Still unmeasured: physical clipboard paste, typing on slower devices, database/decryption cache-miss retrieval CPU and heap, many-file preview, production-bundle Compare, and representative network/device behavior. Synthetic fixtures still do not replace persisted-history or real-device measurements.
- Encrypted Workspace search now scans owner-scoped records in 25-row cursor batches and can continue until each selected category is exhausted. It does not build a plaintext index; repeated scans trade user-triggered time for bounded per-request work.

## Synthetic message history probe — 2026-10-17

- Chromium on the local Windows environment, 1280 × 900 viewport, reduced motion, fresh browser context per sample. The probe mounted the actual `StudentWorkspace` component with a fixed student prop and intercepted API calls with deterministic local fixtures; no database, authentication provider, or AI provider was involved.
- The local E2E server ran in Vite development mode. First-page timing includes module loading; warm figures below omit the initial Vite compilation sample. These timings describe this machine and fixture only, not a production deployment or student device.
- “Messages ready” is measured from navigation start until the requested message rows and, for Markdown, a rendered code block are present. “Scroll” sets the log's `scrollTop` and waits two animation frames; it is not a measured physical scroll gesture or scroll-jank trace. Heap is Chromium's non-standard `performance.memory.usedJSHeapSize` sample at read time.

| Fixture | Messages | Warm messages-ready | Maximum long task | Heap sample | Programmatic scroll |
|---|---:|---:|---:|---:|---:|
| Short plain text | 10 | 425 ms (2 warm samples) | 74 ms median | 23 MB | 38 ms median |
| Short plain text | 50 | 416 ms median (3 samples) | 65 ms median | 25 MB | 29 ms median |
| Short plain text | 100 | 455 ms median (2 samples) | 74 ms median | 27 MB | 29 ms median |
| Short plain text | 500 | 688 ms (1 sample) | 209 ms | 34 MB | 42 ms |
| Markdown heading, list, table, and code | 50 | 728 ms median of 2 warm samples | 68 ms median | 30 MB | 28 ms median |
| Markdown heading, list, table, and code | 500 | 1,484 ms median (3 samples) | 189 ms median | 48 MB median (45–62 MB) | 38 ms median |

The 100/500-row fixtures deliberately returned more records than the requested `limit=50`, so they stress the renderer and Markdown path; they do not represent the current server response path. The browser probe found that Workspace fetched only the first 50 messages and discarded the server's `nextCursor`, which made older history unreachable. This pass adds explicit cursor-based “Muat pesan sebelumnya” loading and keeps the existing message's viewport position after prepending a page. The UI continues to hold loaded rows in the DOM. The paged 500-message probe below now shows a reason to profile a virtualized or on-demand Markdown prototype, while preserving the tested cursor and scroll behavior.

The cursor-history production build passed in 36.57 seconds. The Workspace route chunk measured 405.94 kB raw / 83.41 kB gzip, up 2.99 / 0.70 kB from the immediately preceding 402.95 / 82.71 kB build; that small increase includes the explicit older-history control and its pagination state. The build output stayed under the OS temporary directory and did not replace the repository's existing `dist/`.

## Production-build history preview probe — 2026-10-17

- The production bundle was built to a temporary directory and served with Vite preview. Chromium ran on the same Windows machine at 1280 × 900 with reduced motion. Five fresh contexts loaded the actual `StudentWorkspace` history fixture; API requests were intercepted and returned deterministic local data. This measures the production client bundle and UI work, not deployed-server, authentication, network, or AI-provider time.
- First Contentful Paint: 196–276 ms, median 204 ms. The first 50 message rows were ready 254–334 ms after navigation, median 258 ms. Clicking “Muat pesan sebelumnya” and rendering the next 10 rows took 151–196 ms, median 155 ms.
- Long-task durations observed: 61–100 ms, median about 66 ms. Chromium heap samples were 15.2–17.1 MB. Encoded JavaScript resources totaled 374,811 bytes in this fixture.
- The cursor and scroll-anchor Playwright scenario passed 1/1 against the production preview. It verifies the older-page cursor, 60 rendered rows, and preservation of the current row's viewport position.
- These measurements support keeping the 50-row page and explicit older-history loading for the tested flow. They do not establish a global optimum: the sample excludes real service latency and student devices, and the 500-message stress fixture remains a different, oversized renderer test. Virtualization should be reconsidered if real-device traces or longer conversations show sustained jank.

## Production-build paged Markdown stress probe — 2026-10-17

- Chromium production preview on the same local Windows machine, viewport 1280 × 900, reduced motion, three fresh contexts. The fixture returned 50 messages per cursor page, starting with messages 450–499, then loading nine older pages until all 500 messages were present. Each assistant message included a heading, list, table, link, and code block. API responses were intercepted locally, so these timings measure client rendering and browser work after an immediate fixture response, not server or network latency.
- The temporary production build completed in 37.68 s; the `StudentWorkspace` route chunk was 405.87 kB raw / 83.33 kB gzip. Both the build and preview output stayed under the OS temporary directory; the repository's existing `dist/` was left untouched.
- First 50 Markdown messages were ready in 584–631 ms, median 589 ms. Adding the next nine pages and reaching 500 messages took 4,468–4,664 ms total, median 4,541 ms, after the first page was ready. The measured click-to-render time for the page taking the count from 450 to 500 was 703–889 ms (median 878 ms); the preceding page, 400 to 450, took 898–1,090 ms (median 974 ms).
- Maximum long task in each context was 264, 299, and 333 ms (median 299 ms). Chromium heap samples were 91.7–97.4 MB. A programmatic scroll-to-bottom followed by two animation frames took 23–45 ms, median 39 ms; this is not a physical scroll-jank trace. Encoded JavaScript was 374,811 bytes in all three runs.
- This points to cumulative DOM/layout or reconciliation cost as a performance risk once many Markdown rows are resident, even though the 50+10 flow is fast. The probe does not isolate the exact cause, and all 500 messages are deliberately Markdown-heavy. A follow-up should profile and prototype viewport virtualization or on-demand Markdown rendering, then repeat cursor, variable-height anchor, jump-to-message, active-streaming, and reduced-device tests before adopting it.

## Scroll-anchor implementation comparison — 2026-10-17

- To avoid basing reader position on the entire conversation's `scrollHeight`, older-page prepend now records the first existing message row's viewport top and restores that same row after the page is inserted. A Workspace UX test also simulates Markdown content below the anchor expanding during the update; the anchor remains in place, where a whole-container height delta would overcorrect.
- The production 500-message cursor probe was repeated with the same browser, fixture, and explicit scroll-to-top before each page. Across three contexts, median time for nine page loads was 4.541 s before and 4.470 s after. Median of each context's longest task was 299 ms before and 287 ms after; the worst observed task increased from 333 to 356 ms. Heap medians were both 91.7 MB, first-page-ready medians were 589 and 568 ms, and encoded JavaScript increased by 25 bytes.
- These samples overlap and do not establish a runtime improvement. Keep the direct-row anchor behavior for correctness during unrelated content reflow; evaluate it separately from the still-needed virtualization/on-demand rendering prototype.

## Production-preview stream probe — 2026-10-17

- The actual `StudentWorkspace` was served from a temporary Vite production build in three fresh Chromium contexts at 1280 × 900 with reduced motion. A local proxy returned 100 SSE events at 10 ms intervals with 100 characters each. This is a deterministic client-side stream fixture; it does not include AI-provider latency or deployed server/network behavior.
- All 10,000 characters appeared in the assistant row. Transport duration was 1,551–1,565 ms; the first visible text appeared after 177–204 ms; complete rendered text appeared after 1,631–1,719 ms. Each context's maximum observed long task was 70 ms. Heap samples were 14.3–16.1 MB, and the MutationObserver counted 39 mutation batches.
- These samples show that the tested stream reached the DOM in incremental batches with a short first-visible-text delay. They do not establish stream behavior under provider buffering, real network jitter, slower devices, or concurrent file/Canvas work.

## Production-preview Canvas 50 KB probe — 2026-10-17

- The actual `ArtifactCanvas`/Tiptap editor was measured in three fresh local Chromium contexts at 1280 × 900 using a 50,000-character Markdown artifact and deterministic API fixtures. Preview readiness after opening Canvas was 419–452 ms (median 447 ms), visual-editor readiness 863–928 ms (median 908 ms), and switching to Markdown 59–77 ms (median 73 ms). Heap samples after interaction were 16.1–18.2 MB.
- Replacing the textarea content through Playwright `fill` took 1,337–1,570 ms (median 1,419 ms) and produced a 1,252–1,497 ms long task in each context. A one-character edit took 50–56 ms, with no long task. No artifact-save request was observed during the measured window; the probe did not blur or manually save. `fill` sets up an automated input stress case, not a physical paste gesture.
- As a control, a plain browser page with a 50 KB textarea and no React/app bundle took 1,026–1,037 ms (median 1,026 ms) to complete the same Playwright `fill` plus two animation frames, and reported no long tasks. The Canvas run took 1,337–1,570 ms and reported a 1,252–1,497 ms long task. This suggests additional application work, but the control does not by itself isolate the exact task source or equate automated `fill` with real clipboard paste.
- A candidate implementation changed the Markdown textarea from controlled `value` to `defaultValue`, held the draft in refs, and published parent updates in a transition. In three contexts the 50 KB `fill` took 1,316–1,421 ms (median 1,401 ms) and long tasks were 1,223–1,325 ms; one-character edits were 88–118 ms. These ranges overlap the controlled baseline, while key-edit results were slower in the candidate sample. No reliable performance gain was established, so the candidate code was reverted. Existing autosave, draft recovery, and Canvas tests passed before and after the experiment.
- The Canvas component updates parent `editableContent` state on every Markdown input and rerenders its broader component tree; the control comparison suggests this work may contribute substantially. Profile real controlled keystrokes and clipboard paste separately with CPU throttling, then prototype an editor-local draft boundary or lighter text editor. Any change must prove current-content semantics for manual save, delayed autosave, draft recovery, mode changes, selection-based actions, and conflict handling before adoption.
- The production build used for the controlled baseline completed in 47.06 s. Its Workspace route chunk was 406.54 kB raw / 83.40 kB gzip, and Canvas editor chunk was 539.00 kB / 167.30 kB gzip. Build and preview output remained under the OS temporary directory. Vite reported its existing warning for chunks above 500 kB.

## Compare versi artefak besar — 2026-10-17

- `computeLineDiff` sebelumnya membentuk matriks LCS penuh dengan `(baris lama + 1) × (baris baru + 1)` sel. Implementasi baru memangkas prefix dan suffix identik, mempertahankan anchor berupa baris unik yang urutannya sama di kedua versi, dan menjalankan DP exact hanya pada wilayah lokal dengan paling banyak 250.000 sel. Wilayah besar yang tidak memiliki anchor dibatasi menjadi penghapusan lalu penambahan; baris berulang dapat memiliki beberapa alignment sah, sehingga hasil juga ditandai sebagai perkiraan. `ArtifactDiffViewer` menjelaskan batas tersebut di antarmuka.
- Microbenchmark Node membandingkan implementasi lama dan baru pada fixture terkontrol 2.400 baris untuk tiap versi, berisi 1.200 baris bagian yang identik dan 1.200 baris isi yang berubah. Tiga durasi implementasi lama: 43,70–72,56 ms, median 59,05 ms. Implementasi baru: 3,21–4,09 ms, median 3,22 ms; semua hasil pada fixture ini tetap exact dan mempertahankan jumlah perubahan yang sama. Perbandingan waktu ini mengukur fungsi diff saja, bukan React, layout, maupun ribuan baris DOM.
- Tes mencakup line number dan edit lokal, rekonstruksi kedua sumber pada input deterministik, anchor pada diff besar yang tetap exact, serta fallback bounded dan pemberitahuan UI ketika exact comparison melewati anggaran. Performa Compare pada bundle production dan perangkat yang lebih lemah tetap perlu diukur.
- Vite production build setelah bounded diff dan pagination ini lulus dengan output sementara; route `StudentWorkspace` 406,81 kB / 83,48 kB gzip dan editor Canvas tetap 539,00 kB / 167,31 kB gzip. Vite tetap memberi peringatan untuk chunk dependensi lain di atas 500 kB. Ukuran ini tidak dipakai sebagai pengganti pengukuran Compare di browser.

## Compare versi besar di browser — 2026-10-17

- Probe mengimpor `ArtifactDiffViewer` produksi ke harness browser E2E, memakai dua versi masing-masing 2.400 baris dengan 1.200 anchor bagian sama dan 3.600 perubahan diff. Vite dev berjalan lokal, viewport 1280 × 900, dan setiap sampel memakai konteks Chromium baru. Harness mengukur durasi commit sampai `useLayoutEffect`, jumlah baris DOM yang dipasang, serta entri long task; probe tiga sampel dijalankan dari `playwright.diff-probe.config.ts` tanpa API atau database.
- Sebelum pagination, semua 3.600 baris dipasang bersamaan. Durasi commit 107,2–121,9 ms, median 108,1 ms; long task maksimum per konteks 145–214 ms, median 151 ms.
- Sesudah pagination dan shortcut perubahan ditambahkan, halaman awal tetap memasang 250 baris. Dalam tiga konteks Chromium Vite dev, durasi commit 31,0–57,8 ms (median 42,7 ms) dan long task maksimum 0–81 ms (median 58 ms). E2E memastikan halaman terakhir memuat 100 perubahan terakhir; tes unit juga memastikan lompatan melintasi bagian sama menuju perubahan berikutnya.
- Dibanding probe tanpa pagination, median commit turun dari 108,1 ms menjadi 42,7 ms dan median long task maksimum dari 151 ms menjadi 58 ms pada fixture ini. Pagination memang membatasi jumlah DOM sekaligus; navigasi halaman dan shortcut perubahan mempertahankan akses ke keseluruhan diff. Probe ini Vite dev, bukan build production, dan belum mengukur perangkat lemah; jangan menganggap angka sebagai ambang rilis.
- Build Vite production setelah pagination lulus ke direktori sementara. Route Workspace berukuran 406,81 kB raw / 83,48 kB gzip; chunk editor Canvas tetap 539,00 kB / 167,31 kB gzip dan lazy-loaded. Peringatan ukuran chunk yang ada tetap muncul.

## Pergantian attachment di modal preview — 2026-10-17

- Audit menemukan modal yang sama dapat menerima `attachmentId` baru setelah pengguna memilih file lain. Effect memuat preview inti memang membersihkan sebagian data dan membatalkan fetch awal, tetapi state tab, kontrol transformasi, dan hasil preview transformasi lain tetap hidup di instance React yang sama.
- Konten modal sekarang di-render dengan key `attachmentId`. Pergantian file membuat state panel yang baru, dan cleanup effect berjalan untuk attachment sebelumnya. Tes regresi berpindah dari `first.csv` dengan hasil transformasi aktif ke `second.csv`, memastikan kembali ke tab Data dan ringkasan transformasi lama tidak tertinggal.
- Jalur awal CSV/XLSX sebelumnya meminta metadata preview, profil sheet, dan halaman tabel pertama secara terpisah. Endpoint `/dataset/overview` kini mengembalikan profil lengkap serta 25 baris pertama dari satu load/decrypt/parse; perpindahan sheet memakai endpoint yang sama. Halaman berikutnya tetap memakai endpoint preview yang dibatasi.
- Verifikasi lokal: route overview 3/3 lulus (satu file load dan parse, halaman dibatasi 25 baris, buffer dihapus, sheet tidak dikenal ditolak, ownership gagal tertutup); unit API dan modal 6/6 lulus; IDOR route aktual 1/1 lulus. ESLint lulus. Production build lulus dalam 13m38s di folder sementara. Route Workspace tetap 406,81 kB / 83,48 kB gzip; editor Canvas 539,00 kB / 167,31 kB gzip. Peringatan chunk dependensi besar tetap ada.
- Probe browser tiga konteks × delapan file memakai respons API sintetis dengan delay tetap 15 ms belum menghasilkan metrik: Vite dev server tidak siap dalam batas 60 detik. Karena itu, latency multi-file dan perangkat lambat tetap belum terukur. Typecheck terbaru masih berjalan setelah pengulangan serial; hasilnya belum boleh dianggap lulus.

## File-context retrieval capacity audit — 2026-10-17

- Static limits allow eight active Workspace attachments, 5 MiB per uploaded file, 500,000 extracted characters per document, 100 chunks per document, 2,000 nominal characters per chunk, 2,500 context tokens, and eight selected context chunks. `chunkingService` previously checked `maxChunksPerDocument` only after finishing each source block; the text adapter can return one large block, and the sentence-splitting loop could continue creating chunks past the intended cap. A guard now stops that inner loop and the final flush at 100. A regression test uses one roughly 464 KB block and asserts exactly the configured maximum. When this cap truncates the index, upload metadata and the response now include the existing “Ekstraksi parsial” warning state.
- The general prompt scanner deliberately treats messages above 5,000 characters as suspicious. Workspace text uploads also called that prompt-sized API before extraction, so an ordinary `.txt` document above 5 KB was rejected even though the file pipeline allowed 500,000 extracted characters. A document-specific scan now checks 4,096-character windows with 512 characters of overlap up to the extraction cap and uses the same injection signatures. The prompt guard remains unchanged; larger files are left for the extractor to reject with its size-limit error. A 464 KB integration upload now completes with exactly 100 chunks and an explicit partial-index warning; a unit case detects an injection crossing a scan-window boundary.
- Retrieval loads every chunk for the chosen attachments from Prisma before lexical ranking. It decrypts all returned encrypted chunks in memory, tokenizes and normalizes their content for BM25, then selects at most eight chunks / 2,500 tokens for the prompt. With the 100-chunk cap, an eight-file request can rank up to 800 chunks per cache miss; this is bounded but still holds and processes substantially more text than is sent to the model.
- An in-memory service probe with 8 × 100 × 2,000-character chunks completed in 25 ms and added 8.92 MB of Node heap, selecting five chunks. Prisma, decryption, PII sanitization, and prompt-injection scanning were mocked, so the result only measures local ranking/selection on this machine. Database latency, real decryption, PII/injection scans, concurrent requests, and production cache-miss behavior remain unmeasured.
- The request-scoped retrieval cache includes query, source versions, file IDs, token/chunk budgets, and section filters, with a 10-minute TTL and up to 200 entries. A cold miss still loads and ranks all chunks. Production profiling should measure cold and warm retrieval separately and check cache memory under concurrent users.
