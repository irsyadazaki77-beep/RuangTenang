// ==========================================
// AI TELEMETRY & AUDIT TRAIL LOGGING
// ==========================================
export interface AiTelemetryData {
  latencyMs: number;
  promptTokenCount: number;
  responseTokenCount: number;
  crisisFlagDetected: boolean;
  crisisType?: 'self_harm' | 'medical_diagnosis' | 'emergency' | null;
  modelUsed: string;
  requestId: string;
  timestamp: string;
}

export function logAiTelemetry(data: AiTelemetryData) {
  // Strip any PII, only log metric fields
  const safeLogPayload = {
    event: 'AI_COMPANION_METRICS',
    timestamp: data.timestamp,
    latencyMs: data.latencyMs,
    promptTokenCount: data.promptTokenCount,
    responseTokenCount: data.responseTokenCount,
    totalTokens: data.promptTokenCount + data.responseTokenCount,
    crisisFlagDetected: data.crisisFlagDetected,
    crisisType: data.crisisType || null,
    modelUsed: data.modelUsed,
    requestId: data.requestId
  };

  // Log to standard out for telemetry ingestions (Datadog, ELK, etc.)
  console.log(JSON.stringify(safeLogPayload));
}
