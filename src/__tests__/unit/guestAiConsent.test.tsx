import React, { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { GuestAiConsentNotice } from '../../components/GuestAiConsentNotice';
import { readGuestAiConsent, writeGuestAiConsent } from '../../lib/guestAiConsent';

function ConsentHarness() {
  const [checked, setChecked] = useState(readGuestAiConsent());
  return <GuestAiConsentNotice checked={checked} onChange={granted => {
    setChecked(granted);
    writeGuestAiConsent(granted);
  }} />;
}

describe('guest AI session consent', () => {
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it('keeps the guest acknowledgement in session storage and hides notice when checked', () => {
    render(<ConsentHarness />);
    const checkbox = screen.getByRole('checkbox', { name: /izinkan pemrosesan pesan oleh ai untuk sesi ini/i });

    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(readGuestAiConsent()).toBe(true);
    expect(window.localStorage.getItem('rt_guest_ai_consent')).toBeNull();

    // After being checked, the notice should disappear from the screen
    expect(screen.queryByRole('checkbox', { name: /izinkan pemrosesan pesan oleh ai untuk sesi ini/i })).toBeNull();
  });
});
