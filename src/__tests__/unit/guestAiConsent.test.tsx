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
    const checkbox = screen.getByRole('checkbox', { name: /izinkan ai memproses pesan untuk sesi ini/i });

    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(readGuestAiConsent()).toBe(true);
    expect(window.localStorage.getItem('rt_guest_ai_consent')).toBeNull();

    // After being checked, the notice should disappear from the screen
    expect(screen.queryByRole('checkbox', { name: /izinkan ai memproses pesan untuk sesi ini/i })).toBeNull();
  });

  it('keeps the consent short and puts the full privacy explanation behind a disclosure', () => {
    render(<ConsentHarness />);
    expect(screen.getByText(/pesan dan file konteks yang kamu pilih dikirim/i)).toBeInTheDocument();
    const details = screen.getByText('Pelajari cakupan dan privasi');
    expect(details.closest('details')).not.toHaveAttribute('open');
    fireEvent.click(details);
    expect(screen.getByText(/percakapan tidak dipantau langsung oleh konselor/i)).toBeInTheDocument();
    expect(screen.getByText(/tanpa izin, pesan tidak dikirim ke penyedia ai/i)).toBeInTheDocument();
  });
});
