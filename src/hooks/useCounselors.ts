import { useState, useCallback, useLayoutEffect, useRef } from 'react';
import { Counselor } from '../types';
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';

export function useCounselors() {
  const { user, loading: authLoading, sessionGeneration } = useAuth();
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const authScope = `${user?.id || 'anonymous'}:${user?.role || 'none'}:${user?.campusId || 'unassigned'}:${sessionGeneration}`;

  const fetchCounselors = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
      const query = new URLSearchParams({ timeZone });
      const res = await apiClient.get<Counselor[]>(`/api/v1/counselors?${query}`, { signal });
      if (signal?.aborted) return;
      if (!res.success) throw new Error(res.error || 'Gagal memuat data konselor');
      setCounselors(res.data || []);
    } catch (err: any) {
      if (signal?.aborted) return;
      setError(err.message || 'Terjadi kesalahan saat memuat data konselor');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useLayoutEffect(() => {
    requestRef.current?.abort();
    setCounselors([]);
    setError(null);
    setLoading(true);
    if (authLoading) return () => requestRef.current?.abort();

    const controller = new AbortController();
    requestRef.current = controller;
    void fetchCounselors(controller.signal);
    return () => {
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, [authScope, authLoading, fetchCounselors]);

  const refetch = useCallback(() => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    void fetchCounselors(controller.signal).finally(() => {
      if (requestRef.current === controller) requestRef.current = null;
    });
  }, [fetchCounselors]);

  return { counselors, loading, error, refetch };
}

