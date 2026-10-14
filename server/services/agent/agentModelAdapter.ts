import { aiRequestService } from '../ai/aiRequestService.js';
import { AiModelError, getModelDefinition, resolveAiModel } from '../ai/aiModelRegistry.js';
import { isAiProfile, isKerjaProfile, type ModelTier } from '../../../shared/aiModelContract.js';
import { smartModelRouter } from '../ai/smartModelRouter.js';
import { z } from 'zod';
import type { AgentDecision } from './agentContracts.js';
import { AgentDecisionSchema } from './agentContracts.js';
import { AGENT_SYSTEM_INSTRUCTION } from './agentContextBuilder.js';
import { AGENT_EXECUTION_LIMITS, estimateTokens } from './agentExecutionPolicy.js';
import { getAgentToolDefinition } from './agentToolRegistry.js';

export class AgentModelError extends Error {
  constructor(public readonly code: string, message = code) { super(message); this.name = 'AgentModelError'; }
}

export interface AgentModelDecisionInput {
  userId: string;
  userTier: string;
  requestedModelId: string;
  prompt: string;
  allowedToolIds: ReadonlySet<string>;
  abortSignal: AbortSignal;
  maxOutputTokens?: number;
}

export interface AgentModelDecisionOutput {
  decision: AgentDecision;
  rawOutput: string;
  modelId: string;
}

function getAllowedToolDescriptors(allowedToolIds: ReadonlySet<string>) {
  return [...allowedToolIds].map(id => {
    const tool = getAgentToolDefinition(id);
    if (!tool) throw new AgentModelError('AGENT_TOOL_REGISTRY_INVALID');
    return { id: tool.id, description: tool.description, inputSchema: z.toJSONSchema(tool.inputSchema) };
  });
}

export function estimateAgentDecisionInputTokens(prompt: string, allowedToolIds: ReadonlySet<string>): number {
  return estimateTokens(JSON.stringify({ allowedTools: getAllowedToolDescriptors(allowedToolIds), turnContext: prompt }) + AGENT_SYSTEM_INSTRUCTION);
}

export async function requestAgentDecision(input: AgentModelDecisionInput): Promise<AgentModelDecisionOutput> {
  let model;
  let routingDecision;
  const profileRequest = isAiProfile(input.requestedModelId);
  try {
    if (profileRequest) {
      if (!isKerjaProfile(input.requestedModelId)) throw new AgentModelError('AGENT_MODEL_UNAVAILABLE');
      routingDecision = smartModelRouter.routeProfile(input.requestedModelId, {
        workspaceMode: true,
        userTier: input.userTier as ModelTier,
        taskCategory: 'structured_reasoning',
        requestedCapabilities: ['chat']
      }, input.prompt);
      model = getModelDefinition(routingDecision.selectedModelId);
    } else {
      model = resolveAiModel(input.requestedModelId, input.userTier);
    }
  }
  catch (error) {
    if (error instanceof AiModelError) throw new AgentModelError('AGENT_MODEL_UNAVAILABLE', 'Model yang dipilih tidak tersedia untuk akun ini.');
    throw new AgentModelError('AGENT_MODEL_UNAVAILABLE', 'Model yang dipilih tidak tersedia untuk Agent.');
  }
  if (!model.capabilities.includes('chat')) throw new AgentModelError('AGENT_MODEL_UNSUPPORTED', 'Model ini tidak mendukung chat untuk Agent.');
  if (!getModelDefinition(model.id)) throw new AgentModelError('AGENT_MODEL_UNSUPPORTED');

  const allowedTools = getAllowedToolDescriptors(input.allowedToolIds);
  const prompt = JSON.stringify({
    allowedTools,
    turnContext: input.prompt,
    responseContract: 'Return exactly one JSON object. Use type=tool for one allowed tool call, or type=final when complete.'
  });
  const response = await aiRequestService.generateChatResponse({
    userId: input.userId,
    userTier: input.userTier,
    requestedModelId: model.id,
    prompt,
    systemInstruction: AGENT_SYSTEM_INSTRUCTION,
    abortSignal: input.abortSignal,
    ...(routingDecision ? { routingDecision, comparisonMode: false } : { comparisonMode: true }),
    responseFormat: 'json',
    maxOutputTokens: Math.min(input.maxOutputTokens || AGENT_EXECUTION_LIMITS.maxOutputTokens, AGENT_EXECUTION_LIMITS.maxOutputTokens)
  });
  if (response.isFallback) throw new AgentModelError('AGENT_MODEL_UNAVAILABLE', 'Provider tidak mengembalikan respons Agent yang dapat digunakan.');
  let parsed: unknown;
  try { parsed = JSON.parse(response.text); }
  catch { throw new AgentModelError('AGENT_DECISION_INVALID', 'Respons model tidak mengikuti kontrak JSON Agent.'); }
  const validation = AgentDecisionSchema.safeParse(parsed);
  if (!validation.success) throw new AgentModelError('AGENT_DECISION_INVALID', 'Respons model tidak mengikuti schema keputusan Agent.');
  return { decision: validation.data, rawOutput: response.text, modelId: response.modelUsed };
}
