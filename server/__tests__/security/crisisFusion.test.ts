import { describe, expect, it } from 'vitest';
import { fuseCrisisSeverity } from '../../services/ai/crisisSeverityFusion.js';

describe('conservative crisis severity fusion', () => {
  it('never lets AI downgrade a locally detected active self-harm crisis', () => {
    expect(fuseCrisisSeverity('crisis', 'normal', true, false)).toMatchObject({ severity: 'crisis', isCrisis: true, preserveLocalCrisis: true });
  });

  it('preserves a verified local negation and a past-event distress classification', () => {
    expect(fuseCrisisSeverity('distress', 'normal', false, true)).toMatchObject({ severity: 'distress', isNegated: true, isCrisis: false });
    expect(fuseCrisisSeverity('distress', 'normal', false, false).severity).toBe('distress');
  });

  it('does not mark a third-party crisis as the user’s active crisis', () => {
    expect(fuseCrisisSeverity('crisis', 'distress', false, false)).toMatchObject({ severity: 'crisis', thirdPartyOnly: true, isCrisis: false });
  });

  it('allows AI to raise ambiguous distress but never lowers the deterministic severity', () => {
    expect(fuseCrisisSeverity('distress', 'crisis', false, false)).toMatchObject({ severity: 'crisis', isCrisis: true });
    expect(fuseCrisisSeverity('distress', 'normal', false, false).severity).toBe('distress');
  });
});
