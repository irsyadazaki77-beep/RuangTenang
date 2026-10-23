import { EventEmitter } from 'node:events';
import { describe, expect, it } from 'vitest';
import { timeoutMiddleware } from '../../apiV1Helpers.js';

function setup() {
  const req = Object.assign(new EventEmitter(), { originalUrl: '/api/v1/chat', url: '/api/v1/chat', complete: true });
  const res = Object.assign(new EventEmitter(), { writableEnded: false, headersSent: false });
  timeoutMiddleware()(req as any, res as any, () => undefined);
  return { req, res, signal: (req as any).abortSignal as AbortSignal };
}

describe('AI HTTP cancellation', () => {
  it('keeps generating when the POST body has finished', () => {
    const { req, res, signal } = setup();
    req.emit('close');
    expect(signal.aborted).toBe(false);
    res.writableEnded = true;
    res.emit('finish');
    res.emit('close');
    expect(signal.aborted).toBe(false);
  });

  it('cancels inference when the response socket closes early', () => {
    const { res, signal } = setup();
    res.emit('close');
    expect(signal.aborted).toBe(true);
  });

  it('cancels inference when the incoming request is aborted', () => {
    const { req, signal } = setup();
    req.emit('aborted');
    expect(signal.aborted).toBe(true);
  });
});
