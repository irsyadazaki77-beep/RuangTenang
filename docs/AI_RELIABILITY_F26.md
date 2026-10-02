# F26: AI reliability policy

## Audit before implementation

- Main Chat and Workspace both enter `aiSafetyService.runUnifiedPipeline`, which calls `aiRequestService`; AI tools also call that shared service or the Gemini compatibility facade in `aiModelRouter`.
- Provider adapters existed for Gemini, DeepSeek, Groq, and OpenRouter, but each had its own 25 second non-stream timeout and 60 second stream timeout. The browser added a 12 second first-chunk guard, a 25 second read timeout, and up to two extra POST retries.
- Gemini used a separate router with up to three primary attempts plus a fallback. Other providers fell through to Gemini after any error. Streaming followed another policy and eventually substituted a local response. This could hide model identity and exceeded a bounded shared policy.
- The old router circuit state was global across Gemini requests rather than per provider. Provider errors included raw response bodies in thrown messages and logs. Comparison already passed `comparisonMode`, which can preserve exact candidate identity.
- Smart routing already supplied bounded canonical candidate IDs and the registry enforced model tiers. Registry capability metadata currently distinguishes chat/streaming/reasoning; it does not describe documents, tools, or structured output.

## Shared policy

`server/services/ai/aiReliabilityService.ts` owns timeout values, bounded retries, exponential backoff with jitter, error categories, per-provider circuits, stream guards, and provider health. Defaults: connect 20s, first token 45s, stream idle 30s, total stream 120s, one retry (two attempts), 500ms base backoff capped at 4s. Environment overrides use `AI_CONNECT_TIMEOUT_MS`, `AI_FIRST_TOKEN_TIMEOUT_MS`, `AI_STREAM_IDLE_TIMEOUT_MS`, `AI_TOTAL_REQUEST_TIMEOUT_MS`, `AI_MAX_RETRIES`, `AI_RETRY_BASE_DELAY_MS`, `AI_RETRY_MAX_DELAY_MS`, and `AI_FALLBACK_ENABLED`; invalid/out-of-range values fall back to defaults.

Fallback uses at most two canonical candidates after the primary, only for Auto routing, eligible transient failures, matching tier and declared capability. Attachment fallbacks are limited to Gemini because the other adapters are text-only. Comparison and explicitly selected models never switch identity. Partial output is never continued by another model.

Each provider has a four-failure rolling threshold over one minute, a 30 second open cooldown, and one half-open probe. Quota exhaustion opens that provider for five minutes; user abort, validation, safety, auth, and model selection errors do not count. The public model catalog can mark a provider temporarily unavailable without exposing keys or provider error details.

Streaming failures preserve already emitted content and append a short interruption marker. A failure before any token returns a safe, category-based message. The browser no longer retries the stream POST automatically or imposes shorter local stream timeouts.

## Deployment limitation

Circuit and health state are in-memory per Node process. They are not shared across workers, serverless instances, or restarts. No shared store or background provider probes are configured. Metrics remain in the repository's existing in-process metrics service.
