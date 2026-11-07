import { describe, it, expect } from 'vitest';
import { codingErgonomicsService } from '../../features/coder/services/codingErgonomicsService';

describe('codingErgonomicsService', () => {
  it('tracks error occurrences and increments frustration score', () => {
    codingErgonomicsService.recordBreakTaken(); // reset baseline
    const initial = codingErgonomicsService.getState();
    expect(initial.consecutiveErrorCount).toBe(0);

    codingErgonomicsService.recordError('Syntax error at line 5');
    codingErgonomicsService.recordError('TypeError undefined');
    codingErgonomicsService.recordError('ReferenceError');

    const state = codingErgonomicsService.getState();
    expect(state.consecutiveErrorCount).toBe(3);
    expect(state.frustrationScore).toBeGreaterThanOrEqual(45);
  });

  it('reduces consecutive error count on successful compile/run', () => {
    codingErgonomicsService.recordSuccess();
    const state = codingErgonomicsService.getState();
    expect(state.consecutiveErrorCount).toBe(2);
  });

  it('resets eye strain timer and break timestamp when break taken', () => {
    codingErgonomicsService.recordBreakTaken();
    const state = codingErgonomicsService.getState();
    expect(state.consecutiveErrorCount).toBe(0);
    expect(state.eyeStrainTimerSeconds).toBe(1200);
    expect(state.stressLevel).toBe('calm');
  });
});
