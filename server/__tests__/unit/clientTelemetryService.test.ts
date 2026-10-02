import { describe, expect, it } from 'vitest';
import { clientDebugSchema, sanitizeTelemetryUrl } from '../../services/clientTelemetryService.js';

describe('client error telemetry contract', () => {
  it.each([
    {
      type: 'onerror',
      message: 'Script error',
      source: 'https://app.example/assets/main.js',
      lineno: 12,
      colno: 4,
      stack: 'Error: Script error',
      url: 'https://app.example/mood?token=private#section'
    },
    {
      type: 'unhandledrejection',
      message: 'Request failed',
      stack: 'Error: Request failed',
      url: 'https://app.example/workspace?draft=private'
    }
  ])('accepts browser $type payloads', payload => {
    expect(clientDebugSchema.safeParse(payload).success).toBe(true);
  });

  it('rejects unknown properties to keep the telemetry contract explicit', () => {
    expect(clientDebugSchema.safeParse({ message: 'failure', href: '/mood' }).success).toBe(false);
  });

  it('removes query strings and fragments before recording the page URL', () => {
    expect(sanitizeTelemetryUrl('https://app.example/mood?token=private#section'))
      .toBe('https://app.example/mood');
  });
});
