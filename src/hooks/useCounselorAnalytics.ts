import { useState, useEffect } from 'react';
import { AnalyticsMetric, RiskAlert } from '../types';
import { apiClient } from '../lib/apiClient';

export function useCounselorAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsMetric | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<AnalyticsMetric>('/api/v1/counselors/analytics')
      .then(res => {
        if (res.success && res.data) {
          setAnalytics(res.data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { analytics, loading };
}

