import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { ScreeningTrend } from '../../features/mood/ScreeningTrend';

function TrapTestComponent({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const containerRef = useFocusTrap<HTMLDivElement>({ isOpen, onClose });
  if (!isOpen) return null;
  return (
    <div ref={containerRef} role="dialog" aria-modal="true" tabIndex={-1}>
      <button>First</button>
      <input placeholder="Middle" />
      <button>Last</button>
    </div>
  );
}

describe('Audit Tahap 1 - Focus Trap & Accessibility', () => {
  it('calls onClose when Escape key is pressed inside active modal', () => {
    const handleClose = vi.fn();
    render(<TrapTestComponent isOpen={true} onClose={handleClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

describe('Audit Tahap 1 - F01 Screening Empty State Representation', () => {
  it('renders explicit empty state when screenHistory is empty and does not claim 0 score or Minimal category', () => {
    const badge = { bg: 'bg-slate-50', dot: 'bg-slate-400', desc: 'Belum ada hasil skrining' };
    render(
      <ScreeningTrend
        screenHistory={[]}
        moodLogs={[]}
        currentPhq9={null}
        currentGad7={null}
        currentTriage={null}
        triageStyle={badge}
        onNavigateToPrograms={vi.fn()}
        onNavigateToSchedule={vi.fn()}
        onClearHistory={vi.fn()}
        getTriageBadge={() => badge}
      />
    );

    // PHQ-9 & GAD-7 should display dashes (—), not 0
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(2);

    // Should display 'Belum ada hasil skrining', not Minimal
    const emptyLabels = screen.getAllByText('Belum ada hasil skrining');
    expect(emptyLabels.length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('Kategori: Minimal')).toBeNull();

    // Recommendation card should state 'Belum Ada Hasil Skrining'
    expect(screen.getByText('Belum Ada Hasil Skrining')).toBeDefined();
    expect(screen.getByText(/Lakukan skrining mandiri pertama Anda/i)).toBeDefined();
  });

  it('renders valid 0 score and Minimal category when screening test was actually taken with score 0', () => {
    const badge = { bg: 'bg-teal-50', dot: 'bg-teal-500', desc: 'Kondisi relatif stabil' };
    render(
      <ScreeningTrend
        screenHistory={[
          { id: 'sc-1', date: '2026-10-18', phq9: 0, gad7: 0, triage: 'Ringan', label: 'Skrining Rutin' }
        ]}
        moodLogs={[]}
        currentPhq9={0}
        currentGad7={0}
        currentTriage={'Ringan'}
        triageStyle={badge}
        onNavigateToPrograms={vi.fn()}
        onNavigateToSchedule={vi.fn()}
        onClearHistory={vi.fn()}
        getTriageBadge={() => badge}
      />
    );

    // Valid 0 score displayed with max denominator
    expect(screen.getByText('/ 27')).toBeDefined();
    expect(screen.getByText('/ 21')).toBeDefined();

    // Valid 0 score should correctly show Minimal category
    const minimalCategories = screen.getAllByText('Minimal');
    expect(minimalCategories.length).toBe(2);
    expect(screen.getByText('Program Mandiri & Relaksasi')).toBeDefined();
  });
});
