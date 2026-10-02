import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SettingsSectionNav } from '../../features/settings/components/SettingsSectionNav';

describe('SettingsSectionNav', () => {
  it('selects a setting section through the shared desktop and mobile navigation', () => {
    let activeTab: Parameters<typeof SettingsSectionNav>[0]['activeTab'] = 'akun';
    const onSelect = (tab: typeof activeTab) => { activeTab = tab; };
    const { rerender } = render(<SettingsSectionNav activeTab={activeTab} showMobileDetail={false} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'Preferensi AI' }));
    expect(activeTab).toBe('ai');
    rerender(<SettingsSectionNav activeTab={activeTab} showMobileDetail onSelect={onSelect} />);
    expect(screen.getByRole('button', { name: 'Preferensi AI' })).toHaveAttribute('aria-current', 'page');
  });
});
