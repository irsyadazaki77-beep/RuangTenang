# Fase 1 Release Readiness Report

## Verdict: NOT VERIFIED — NOT A PRODUCTION CANDIDATE

Fase 1 changes are implemented, but the full required quality gate has not passed. Do not label this revision production ready.

## Findings and changes

- Groq and OpenRouter adapters are present in the working tree; API-key gating, normalized provider errors, invalid-response handling, timeout/abort behavior, and safe logging are covered by the adapters and focused tests.
- The server AI model registry now supplies runtime availability to `/api/v1/chat/models`; the frontend filters unavailable and tier-disallowed models and falls back when a saved model disappears.
- Citation results come only from validated Crossref metadata. No curated paper list or fabricated fallback remains; unverified references cannot be inserted as verified.
- Paraphrasing now reports locally measurable text characteristics and carries a similarity-check disclaimer; no plagiarism reduction percentage is shown.
- Mermaid uses strict mode and sanitized SVG output. Chat and counselor UI/API metadata no longer claim end-to-end encryption.
- New extracted text, document chunks, and uploaded files are encrypted at rest with the configured AES-GCM service; legacy plaintext rows remain readable for compatibility. Existing on-disk files and legacy rows are not automatically re-encrypted by this code change.
- Session/login IP values are masked for user-facing history and keyed hashes support correlation. Existing retention behavior remains bounded by the existing cleanup policy.
- Local deterministic crisis severity cannot be downgraded by the AI classifier for an active local crisis.

## Required quality gate (2026-10-02)

| Gate | Result |
|---|---|
| Clean install (`npm ci`) | FAILED: Windows `EPERM` while replacing locked native binaries under `node_modules`. A later `npm install --ignore-scripts --no-audit --no-fund` restored tools, but does not count as a clean install. |
| Typecheck | BLOCKED/FAILED: Prisma Client generation could not fetch `schema-engine.exe.gz.sha256` from `binaries.prisma.sh`; `tsc` then reported missing generated Prisma exports and a dependent inferred type error. |
| Lint | PASS: exit 0, 284 warnings, 0 errors. |
| Unit | BLOCKED: `npm run test:unit` stopped before Vitest because Prisma Client generation could not reach `binaries.prisma.sh`. Focused direct Vitest regression run passed: 18 tests across 6 files. |
| Integration | BLOCKED: Prisma generation failed before Vitest started. |
| Security | BLOCKED: Prisma generation failed before the full security suite. The focused direct regression run included security tests. |
| Production build | PASS: `npm run build:production` completed; frontend and server bundle emitted. Mermaid remains a large chunk warning. |
| E2E | FAIL: 77 passed, 25 failed. Failures include route/status expectation mismatches, navigation timeouts, an injection expectation, and onboarding overlay interactions. |

## Remaining release checks

- Restore access to the Prisma engine host, regenerate both clients, then rerun clean install, typecheck, unit, integration, and security gates.
- Resolve the 25 E2E failures and rerun the full E2E suite.
- Apply and rehearse migration `20261002000000_encrypt_document_storage` against isolated PostgreSQL; verify legacy data and encryption-key rotation/recovery.
- Existing plaintext attachment files and plaintext database records require an explicit migration/retention plan; compatibility reads do not encrypt historical data automatically.
- Complete the production, privacy, clinical, backup/restore, and manual accessibility checks in [`RELEASE_CHECKLIST.md`](../RELEASE_CHECKLIST.md).
