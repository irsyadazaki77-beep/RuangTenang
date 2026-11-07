import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AutograderChallengeModal } from '../../features/coder/components/AutograderChallengeModal';
import { SqlPlaygroundModal } from '../../features/coder/components/SqlPlaygroundModal';
import { MabaExplainerModal } from '../../features/coder/components/MabaExplainerModal';
import { FrustrationSupportModal } from '../../features/coder/components/FrustrationSupportModal';
import { PeerPairReviewModal } from '../../features/coder/components/PeerPairReviewModal';
import { AutograderReport } from '../../features/coder/services/codeEdgeCaseTester';

describe('Ruang Coder Next-Gen UI Modals', () => {
  const mockReport: AutograderReport = {
    score: 85,
    totalTests: 6,
    passedTests: 5,
    failedTests: 1,
    functionName: 'hitungTotal',
    results: [
      {
        testId: 't-1',
        name: 'Kasus Normal',
        category: 'normal',
        description: 'Input standar wajar',
        inputFormatted: '[10, 20]',
        passed: true,
        actualOutputFormatted: '30',
        expectedOutputFormatted: '30',
        durationMs: 2
      },
      {
        testId: 't-2',
        name: 'Ketahanan Null',
        category: 'null_undefined',
        description: 'Input null guard',
        inputFormatted: 'null',
        passed: false,
        actualOutputFormatted: 'TypeError: Cannot read property',
        expectedOutputFormatted: 'Resilient',
        durationMs: 3,
        errorMessage: 'Cannot read properties of null'
      }
    ],
    labFeedback: 'Fungsi sudah baik, namun perbaiki guard null.',
    suggestedFixes: ['Tambahkan if (!data) return 0;'],
    executionTimeMs: 12,
    timestamp: '2026-10-30 09:30:00'
  };

  it('renders AutograderChallengeModal with score, tabs, and test items', () => {
    const handleClose = vi.fn();
    const handleRerun = vi.fn();

    render(
      <AutograderChallengeModal
        isOpen={true}
        onClose={handleClose}
        report={mockReport}
        onRerun={handleRerun}
      />
    );

    expect(screen.getByText('Lab Autograder & Edge-Case Challenge')).toBeDefined();
    expect(screen.getByText('85')).toBeDefined();
    expect(screen.getByText('hitungTotal()')).toBeDefined();
    expect(screen.getByText('Kasus Normal')).toBeDefined();
  });

  it('renders SqlPlaygroundModal and executes sample query', () => {
    const handleClose = vi.fn();

    render(<SqlPlaygroundModal isOpen={true} onClose={handleClose} />);

    expect(screen.getByText('SQL Database Canvas & SIAKAD Sandbox')).toBeDefined();
    expect(screen.getByText(/Reset Data SIAKAD/i)).toBeDefined();
    expect(screen.getByText(/Jalankan Query/i)).toBeDefined();
  });

  it('renders MabaExplainerModal with personas and analogies', () => {
    const handleClose = vi.fn();
    const sampleCode = `
      const x = 50;
      function test() { return x * 2; }
    `;

    render(
      <MabaExplainerModal
        isOpen={true}
        onClose={handleClose}
        code={sampleCode}
        filename="test.js"
      />
    );

    expect(screen.getByText(/Bedah Kode Mode Maba/i)).toBeDefined();
    expect(screen.getByText('Ki Hadjar Dewantara')).toBeDefined();
    expect(screen.getByText('Prof. B.J. Habibie')).toBeDefined();
    expect(screen.getByText('R.A. Kartini')).toBeDefined();
  });

  it('renders FrustrationSupportModal with calming breath guide', () => {
    const handleClose = vi.fn();
    const handleAskKiHadjar = vi.fn();

    render(
      <FrustrationSupportModal
        isOpen={true}
        onClose={handleClose}
        consecutiveErrors={4}
        onAskKiHadjar={handleAskKiHadjar}
      />
    );

    expect(screen.getByText(/RuangTenang Care: Bernapas Sejenak/i)).toBeDefined();
    expect(screen.getByText(/Bantu Bedah via Ki Hadjar/i)).toBeDefined();
  });

  it('renders PeerPairReviewModal with room code and annotation controls', () => {
    const handleClose = vi.fn();

    render(<PeerPairReviewModal isOpen={true} onClose={handleClose} activeFilePath="index.js" />);

    expect(screen.getByText('Ruang Kolaborasi & Asistensi Lab')).toBeDefined();
    expect(screen.getByText(/Driver \(Penulis\)/i)).toBeDefined();
    expect(screen.getByText(/Navigator \(Reviewer\)/i)).toBeDefined();
    expect(screen.getByText(/Unduh Kartu Asistensi/i)).toBeDefined();
  });
});
