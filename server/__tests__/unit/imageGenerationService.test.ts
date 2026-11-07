import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateAndSanitizeToolCall } from '../../services/ai/aiToolSchemas.js';
import { getAgentToolDefinition } from '../../services/agent/agentToolRegistry.js';
import { imageGenerationService } from '../../services/imageGenerationService.js';

describe('Image Generation Integration & Tool Validation', () => {
  it('validates a correct generate_image tool call payload', () => {
    const raw = {
      tool_call: 'generate_image',
      parameters: {
        prompt: 'A futuristic university library with glowing holographic study pods',
        width: 1024,
        height: 1024,
        reason: 'Menghasilkan ilustrasi'
      }
    };
    const res = validateAndSanitizeToolCall(raw);
    expect(res.isValid).toBe(true);
    expect(res.toolCall).toBe('generate_image');
    expect(res.parameters?.prompt).toBe(raw.parameters.prompt);
  });

  it('rejects a generate_image tool call with missing or empty prompt', () => {
    const raw = {
      tool_call: 'generate_image',
      parameters: {
        prompt: ''
      }
    };
    const res = validateAndSanitizeToolCall(raw);
    expect(res.isValid).toBe(false);
  });

  it('registers generate_image in AGENT_TOOL_REGISTRY for multi-step agent tasks', () => {
    const def = getAgentToolDefinition('generate_image');
    expect(def).toBeDefined();
    expect(def?.id).toBe('generate_image');
    expect(def?.allowedTaskTypes).toContain('writing');
    expect(def?.allowedTaskTypes).toContain('research');
  });

  it('validates image generation caching hash and path sanitization', () => {
    // Check path traversal defense
    expect(imageGenerationService.getImagePath('../etc/passwd')).toBeNull();
    expect(imageGenerationService.getImagePath('invalid-id-not-hex')).toBeNull();
  });

  it('translates Indonesian keywords and appends style descriptors in enhancePrompt', () => {
    const raw = 'Ilustrasi mahasiswa di perpustakaan berdiskusi kecerdasan buatan';
    const enhanced = imageGenerationService.enhancePrompt(raw, 'vector_infographic');
    expect(enhanced).toContain('college students');
    expect(enhanced).toContain('library');
    expect(enhanced).toContain('artificial intelligence');
    expect(enhanced).toContain('vector flat infographic');
  });
});
