function boundedInteger(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  }
  return value;
}

/** Validated at process startup; limits apply to one foreground task execution. */
export const AGENT_EXECUTION_LIMITS = Object.freeze({
  maxSteps: boundedInteger('WORKSPACE_AGENT_MAX_STEPS', 8, 1, 12),
  maxToolCalls: boundedInteger('WORKSPACE_AGENT_MAX_TOOL_CALLS', 6, 0, 12),
  maxDurationMs: boundedInteger('WORKSPACE_AGENT_MAX_DURATION_MS', 90_000, 5_000, 120_000),
  maxInputTokens: boundedInteger('WORKSPACE_AGENT_MAX_INPUT_TOKENS', 12_000, 1_000, 32_000),
  maxTotalTokens: boundedInteger('WORKSPACE_AGENT_MAX_TOTAL_TOKENS', 16_000, 2_000, 40_000),
  maxOutputTokens: boundedInteger('WORKSPACE_AGENT_MAX_OUTPUT_TOKENS', 900, 128, 2_000),
  maxToolOutputChars: boundedInteger('WORKSPACE_AGENT_MAX_TOOL_OUTPUT_CHARS', 12_000, 1_000, 30_000),
  modelCallTimeoutMs: boundedInteger('WORKSPACE_AGENT_MODEL_TIMEOUT_MS', 45_000, 5_000, 90_000)
});

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
