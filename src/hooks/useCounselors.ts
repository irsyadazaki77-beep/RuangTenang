import { useState, useEffect, useCallback } from 'react';
import { Counselor } from '../types';
import { apiClient } from '../lib/apiClient';

export function useCounselors() {
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCounselors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<Counselor[]>('/api/v1/counselors');
      if (!res.success) throw new Error(res.error || 'Gagal memuat data konselor');
      setCounselors(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memuat data konselor');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCounselors();
  }, [fetchCounselors]);

  return { counselors, loading, error, refetch: fetchCounselors };
}

