import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { UserSession, Counselor } from '../../types';
import { apiClient } from '../../lib/apiClient';
import { clientDb } from '../../lib/clientDb';
import { safeLocalStorage } from '../../lib/storage';
import { getWorkspaceModeFromPath } from '../../features/workspace/utils/workspaceRouting';

interface LocationState {
  selectedCounselor?: Counselor;
}

export function useAppInitialization(user: UserSession | null) {
  const location = useLocation();
  const workspaceMode = getWorkspaceModeFromPath(location.pathname);
  const [selectedCounselor, setSelectedCounselor] = useState<Counselor | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    safeLocalStorage.setItem('ruangtenang_workspace_mode', workspaceMode);
  }, [workspaceMode]);

  useEffect(() => {
    const nextCounselor = (location.state as LocationState | null)?.selectedCounselor;
    if (nextCounselor) setSelectedCounselor(nextCounselor);
  }, [location.state]);

  useEffect(() => {
    let isCancelled = false;
    const checkOnboardingStatus = async () => {
      if (!user?.id || user.role === 'konselor') {
        setShowOnboarding(false);
        return;
      }

      if (safeLocalStorage.getItem(`rt_onboarding_completed_${user.id}`) === 'true') {
        setShowOnboarding(false);
        return;
      }

      try {
        const encryptedRecord = await clientDb.getDecrypted(`onboarding_${user.id}`);
        if (encryptedRecord) {
          const parsed: unknown = JSON.parse(encryptedRecord);
          if (typeof parsed === 'object' && parsed !== null && 'completed' in parsed && parsed.completed === true) {
            safeLocalStorage.setItem(`rt_onboarding_completed_${user.id}`, 'true');
            if (!isCancelled) setShowOnboarding(false);
            return;
          }
        }
      } catch {
        // Continue with the server check when the local cache is unavailable.
      }

      if (user.role !== 'guest') {
        try {
          const response = await apiClient.get<{ completed: boolean; goals?: string[] }>('/api/v1/user/onboarding');
          if (!isCancelled && response.success && response.data?.completed) {
            safeLocalStorage.setItem(`rt_onboarding_completed_${user.id}`, 'true');
            if (Array.isArray(response.data.goals) && response.data.goals.length > 0) {
              safeLocalStorage.setItem(`rt_user_goals_${user.id}`, JSON.stringify(response.data.goals));
            }
            setShowOnboarding(false);
            return;
          }
        } catch {
          // Keep onboarding available when the server cannot be reached.
        }
      }

      if (!isCancelled) setShowOnboarding(true);
    };

    void checkOnboardingStatus();
    return () => { isCancelled = true; };
  }, [user?.id, user?.role]);

  return { workspaceMode, selectedCounselor, setSelectedCounselor, showOnboarding, setShowOnboarding };
}
