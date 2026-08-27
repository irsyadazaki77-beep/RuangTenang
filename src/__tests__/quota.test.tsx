import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AiQuotaBadge } from '../components/AiQuotaBadge';

describe('AiQuotaBadge Component Tests', () => {
  it('renders remaining message quota badge after loading', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ dailyUsage: 5, dailyLimit: 25, userTier: 'Free' })
    });

    render(<AiQuotaBadge />);

    await waitFor(() => {
      expect(screen.getByText(/20/i)).toBeInTheDocument();
      expect(screen.getByText(/Pesan/i)).toBeInTheDocument();
    });
  });
});
