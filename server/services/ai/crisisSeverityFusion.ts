export type CrisisSeverity = 'normal' | 'distress' | 'crisis';

export function fuseCrisisSeverity(
  localSeverity: CrisisSeverity,
  aiSeverity: CrisisSeverity,
  localIsCrisis: boolean,
  localIsNegated: boolean
) {
  const rank: Record<CrisisSeverity, number> = { normal: 0, distress: 1, crisis: 2 };
  const preserveLocalCrisis = localSeverity === 'crisis' && localIsCrisis && !localIsNegated;
  const severity = preserveLocalCrisis || rank[localSeverity] > rank[aiSeverity] ? localSeverity : aiSeverity;
  const thirdPartyOnly = localSeverity === 'crisis' && !localIsCrisis;
  return {
    severity,
    preserveLocalCrisis,
    thirdPartyOnly,
    isNegated: preserveLocalCrisis ? false : localIsNegated,
    isCrisis: !thirdPartyOnly && severity === 'crisis' && !localIsNegated
  };
}
