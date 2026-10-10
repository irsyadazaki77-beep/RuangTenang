export type AuthLifecyclePhase =
  | 'initializing'
  | 'authenticated'
  | 'refreshing'
  | 'logging_out'
  | 'unauthenticated'
  | 'switching_account';

export interface AuthSessionSnapshot {
  phase: AuthLifecyclePhase;
  userId: string | null;
  role: string | null;
  generation: number;
}

let currentSnapshot: AuthSessionSnapshot = {
  phase: 'initializing',
  userId: null,
  role: null,
  generation: 0,
};

export function transitionAuthSession(
  phase: AuthLifecyclePhase,
  user?: { id: string; role: string } | null,
): AuthSessionSnapshot {
  const userId = user?.id ?? null;
  const role = user?.role ?? null;
  const changed = phase !== currentSnapshot.phase || userId !== currentSnapshot.userId || role !== currentSnapshot.role;
  currentSnapshot = {
    phase,
    userId,
    role,
    generation: currentSnapshot.generation + (changed || phase === 'switching_account' || phase === 'logging_out' ? 1 : 0),
  };
  return currentSnapshot;
}

export function getAuthSessionSnapshot(): AuthSessionSnapshot {
  return currentSnapshot;
}

export function isCurrentAuthenticatedSession(snapshot: Pick<AuthSessionSnapshot, 'userId' | 'generation'>): boolean {
  return currentSnapshot.phase === 'authenticated'
    && currentSnapshot.userId !== null
    && currentSnapshot.userId === snapshot.userId
    && currentSnapshot.generation === snapshot.generation;
}

export function getStableAuthenticatedSession(expectedUserId?: string): AuthSessionSnapshot {
  const snapshot = getAuthSessionSnapshot();
  if (snapshot.phase !== 'authenticated' || !snapshot.userId || snapshot.userId === 'guest') {
    throw new Error('OFFLINE_AUTH_REQUIRED');
  }
  if (expectedUserId && expectedUserId !== snapshot.userId) {
    throw new Error('OFFLINE_ACCOUNT_CHANGED');
  }
  return snapshot;
}

export function getStableStudentSession(expectedUserId?: string): AuthSessionSnapshot {
  const snapshot = getStableAuthenticatedSession(expectedUserId);
  if (snapshot.role !== 'mahasiswa') throw new Error('OFFLINE_ROLE_NOT_SUPPORTED');
  return snapshot;
}
