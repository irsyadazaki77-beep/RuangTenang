import { describe, it, expect } from 'vitest';
import { serverDb } from '../database.js';

describe('Server Database Contract & Availability Tests', () => {
  it('serverDb.ping() returns true with real SQL query execution', async () => {
    const isAlive = await serverDb.ping();
    expect(isAlive).toBe(true);
  });

  it('serverDb contract provides findAppointmentById', async () => {
    expect(typeof serverDb.findAppointmentById).toBe('function');
    const result = await serverDb.findAppointmentById('non-existent-id');
    expect(result).toBeNull();
  });

  it('serverDb contract provides findScreeningById', async () => {
    expect(typeof serverDb.findScreeningById).toBe('function');
    const result = await serverDb.findScreeningById('non-existent-id');
    expect(result).toBeNull();
  });

  it('serverDb contract provides usability feedback methods', async () => {
    expect(typeof serverDb.addUsabilityFeedback).toBe('function');
    expect(typeof serverDb.getUsabilityFeedbacks).toBe('function');

    const added = await serverDb.addUsabilityFeedback({
      role: 'mahasiswa',
      scenarioName: 'Test Usability Contract',
      susScores: [5, 4, 5, 4, 5, 4, 5, 4, 5, 4],
      overallSusScore: 90,
      comments: 'Clean contract test'
    });

    expect(added).toBeDefined();
    expect(added.scenarioName).toBe('Test Usability Contract');

    const list = await serverDb.getUsabilityFeedbacks();
    expect(list.some(f => f.scenarioName === 'Test Usability Contract')).toBe(true);
  });
});
