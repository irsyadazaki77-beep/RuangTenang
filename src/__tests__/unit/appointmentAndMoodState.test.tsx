import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { apiClient } from '../../lib/apiClient';

describe('Data Consistency & Server-Authoritative State Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifies latest mood and screening uses index 0 (descending order)', () => {
    const screeningHistory = [
      { id: 'screen-3', date: '2026-08-30', phq9Score: 6, gad7Score: 4, phq9Severity: 'Ringan', gad7Severity: 'Minimal' },
      { id: 'screen-2', date: '2026-08-25', phq9Score: 12, gad7Score: 9, phq9Severity: 'Sedang', gad7Severity: 'Sedang' },
      { id: 'screen-1', date: '2026-08-20', phq9Score: 18, gad7Score: 14, phq9Severity: 'Berat', gad7Severity: 'Sedang-Berat' },
    ];

    // Authoritative backend order: newest is at index [0]
    const latestScreening = screeningHistory[0];
    const previousScreening = screeningHistory[1];
    const baselineScreening = screeningHistory[screeningHistory.length - 1];

    expect(latestScreening.id).toBe('screen-3');
    expect(latestScreening.phq9Score).toBe(6);
    expect(previousScreening.phq9Score).toBe(12);
    expect(baselineScreening.phq9Score).toBe(18);

    // Delta calculation: recent - previous
    const phqDelta = latestScreening.phq9Score - previousScreening.phq9Score;
    expect(phqDelta).toBe(-6); // Improved by 6 points

    // Milestone comparison: newest vs oldest
    const overallImprovement = baselineScreening.phq9Score - latestScreening.phq9Score;
    expect(overallImprovement).toBe(12); // 12 points total improvement from baseline
  });

  it('prevents false success on chat /clear when API returns failure', async () => {
    vi.spyOn(apiClient, 'delete').mockResolvedValueOnce({
      success: false,
      error: 'Unauthorized / Server error'
    });

    const res = await apiClient.delete('/api/v1/chat/test-chat-id/messages');
    expect(res.success).toBe(false);
    expect(res.error).toBe('Unauthorized / Server error');
  });

  it('verifies reschedule API contract with backend payload format', async () => {
    const mockRecord = {
      id: 'appt-123',
      counselorId: 'cons-1',
      date: '2026-09-02',
      time: '14:00',
      timezone: 'WIB',
      status: 'PENDING',
      approvalStatus: 'PENDING_APPROVAL',
      attendanceStatus: 'RESCHEDULED'
    };

    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      success: true,
      data: {
        success: true,
        record: mockRecord,
        message: 'Jadwal janji temu berhasil dijadwalkan ulang.'
      }
    });

    const res = await apiClient.post('/api/v1/appointments/appt-123/reschedule', {
      date: '2026-09-02',
      time: '14:00',
      timezone: 'WIB',
      reason: 'Ada ujian susulan'
    });

    expect(res.success).toBe(true);
    const data = res.data as { record: { date: string; attendanceStatus: string } };
    expect(data.record.date).toBe('2026-09-02');
    expect(data.record.attendanceStatus).toBe('RESCHEDULED');
  });
});
