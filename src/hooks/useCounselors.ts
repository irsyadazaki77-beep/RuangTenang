import { useState, useEffect } from 'react';
import { Counselor } from '../types';
import { apiClient } from '../lib/apiClient';

export function useCounselors() {
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<Counselor[]>('/api/v1/counselors')
      .then(res => {
        if (!res.success) throw new Error(res.error || 'Gagal memuat data konselor');
        setCounselors(res.data || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { counselors, loading, error };
}

