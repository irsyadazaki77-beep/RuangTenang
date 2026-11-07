import { describe, expect, it } from 'vitest';
import { runCouncilDebate, COUNCIL_MEMBERS } from '../../services/agent/agentCouncilDebateService.js';

describe('Autonomous Academic Council Debate Service', () => {
  it('has three distinct academic personas configured', () => {
    expect(COUNCIL_MEMBERS).toHaveLength(3);
    const ids = COUNCIL_MEMBERS.map(m => m.id);
    expect(ids).toContain('supervisor');
    expect(ids).toContain('methodologist');
    expect(ids).toContain('integrity');
  });

  it('runs multi-turn simulated council debate and generates consensus and action items', async () => {
    const result = await runCouncilDebate(
      'Analisis Pengaruh Beban Belajar terhadap Kesejahteraan Mental Mahasiswa',
      'Bab 1 s/d 3'
    );

    expect(result.turns.length).toBeGreaterThanOrEqual(3);
    expect(result.consensus).toBeTruthy();
    expect(result.verdict).toBe('REVISION_MINOR');
    expect(result.revisionActionItems.length).toBeGreaterThanOrEqual(3);
    expect(result.confidenceScore).toBeGreaterThan(80);

    // Verify all personas participated
    const personaIdsInTurns = result.turns.map(t => t.personaId);
    expect(personaIdsInTurns).toContain('supervisor');
    expect(personaIdsInTurns).toContain('methodologist');
    expect(personaIdsInTurns).toContain('integrity');
  });
});
