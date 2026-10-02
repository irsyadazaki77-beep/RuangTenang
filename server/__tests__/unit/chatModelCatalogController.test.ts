import { describe, expect, it, vi } from 'vitest';
import { ChatController } from '../../controllers/chatController.js';

describe('GET /chat/models controller contract', () => {
  it('returns a safe, unique, tier-aware public catalog', () => {
    const json = vi.fn();
    ChatController.getModels({ user: { tier: 'Free' } } as never, { json } as never);
    const payload = json.mock.calls[0][0] as { defaultModel: string; models: Array<Record<string, unknown>> };
    const ids = payload.models.map(model => model.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(payload.defaultModel).toBeTruthy();
    expect(payload.models.find(model => model.id === 'gemini-3.1-pro-preview')?.selectable).toBe(false);
    expect(payload.models.every(model => !('providerModelId' in model) && !('apiKey' in model))).toBe(true);
  });
});
