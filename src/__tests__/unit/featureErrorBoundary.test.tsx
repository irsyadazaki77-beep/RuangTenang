import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { FeatureErrorBoundary } from '../../components/error/FeatureErrorBoundary';

function BrokenFeature(): never {
  throw new Error('test render failure');
}

describe('feature error boundary', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('contains feature rendering failures and presents a recovery state', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<FeatureErrorBoundary featureName="Workspace"><BrokenFeature /></FeatureErrorBoundary>);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Workspace mengalami kendala')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Coba Lagi' })).toBeInTheDocument();
  });
});
