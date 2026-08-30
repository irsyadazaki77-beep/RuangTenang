import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { VideoConsultationRoom } from '../../features/appointments/VideoConsultationRoom';
import '@testing-library/jest-dom';

describe('VideoConsultationRoom', () => {
  beforeAll(() => {
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }]
        }),
      },
    });
  });

  const mockAppointment: any = {
    id: 'apt-123',
    counselorName: 'Dr. Jane Doe',
    studentName: 'John Smith',
    primaryConcern: 'Stress Test',
    counselorAvatar: 'avatar.png'
  };

  it('renders correctly with given appointment', () => {
    const handleClose = vi.fn();
    const handleEndCall = vi.fn();

    render(
      <VideoConsultationRoom
        appointment={mockAppointment}
        onClose={handleClose}
        onEndCall={handleEndCall}
        userRole="mahasiswa"
      />
    );

    // Verify UI elements
    expect(screen.getByText('Sesi Terenkripsi End-to-End')).toBeInTheDocument();
    expect(screen.getByText('ID: apt-123')).toBeInTheDocument();
    expect(screen.getByText('Dr. Jane Doe')).toBeInTheDocument();
  });

  it('toggles microphone mute state', () => {
    const handleClose = vi.fn();
    const handleEndCall = vi.fn();

    render(
      <VideoConsultationRoom
        appointment={mockAppointment}
        onClose={handleClose}
        onEndCall={handleEndCall}
        userRole="mahasiswa"
      />
    );

    // Default state: not muted, there's a Mic icon and clicking it toggles it.
    const muteButton = screen.getAllByRole('button')[0]; // First button is usually Mic
    fireEvent.click(muteButton);
    // After clicking, the MicOff icon should be rendered, but we just check if it doesn't crash 
    // and state updates. We can verify if "MicOff" SVG is present (we could test classes).
    expect(muteButton.className).toContain('text-rose-500');
  });

  it('toggles video state', () => {
    const handleClose = vi.fn();
    const handleEndCall = vi.fn();

    render(
      <VideoConsultationRoom
        appointment={mockAppointment}
        onClose={handleClose}
        onEndCall={handleEndCall}
        userRole="mahasiswa"
      />
    );

    const videoButton = screen.getAllByRole('button')[1]; // Second button is Video
    fireEvent.click(videoButton);
    expect(videoButton.className).toContain('text-rose-500');
  });

  it('shows counselor notes panel for counselor role', () => {
    render(
      <VideoConsultationRoom
        appointment={mockAppointment}
        onClose={vi.fn()}
        onEndCall={vi.fn()}
        userRole="konselor"
      />
    );

    // Assert side panel is visible
    expect(screen.getByText('Catatan Klinis (Privat)')).toBeInTheDocument();
    expect(screen.getByText('Stress Test')).toBeInTheDocument(); // Primary concern
    expect(screen.getByPlaceholderText(/Ketik catatan medis/i)).toBeInTheDocument();
  });

  it('does not show counselor notes panel for student role', () => {
    render(
      <VideoConsultationRoom
        appointment={mockAppointment}
        onClose={vi.fn()}
        onEndCall={vi.fn()}
        userRole="mahasiswa"
      />
    );

    expect(screen.queryByText('Catatan Klinis (Privat)')).not.toBeInTheDocument();
  });

  it('calls onEndCall and onClose when End Call button is clicked and confirmed', () => {
    const handleClose = vi.fn();
    const handleEndCall = vi.fn();
    
    // Mock window.confirm to return true
    vi.spyOn(window, 'confirm').mockImplementation(() => true);

    render(
      <VideoConsultationRoom
        appointment={mockAppointment}
        onClose={handleClose}
        onEndCall={handleEndCall}
        userRole="konselor"
      />
    );

    // Type some notes
    const textarea = screen.getByPlaceholderText(/Ketik catatan medis/i);
    fireEvent.change(textarea, { target: { value: 'Patient feels better' } });

    // End call button is the third one
    const endCallButton = screen.getByTitle('Akhiri Panggilan');
    fireEvent.click(endCallButton);

    expect(handleEndCall).toHaveBeenCalledWith('apt-123', 'Patient feels better');
    expect(handleClose).toHaveBeenCalled();
    
    vi.restoreAllMocks();
  });
});
