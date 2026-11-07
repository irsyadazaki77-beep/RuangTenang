import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { VideoConsultationRoom } from '../../features/appointments/VideoConsultationRoom';
import { apiClient } from '../../lib/apiClient';
import '@testing-library/jest-dom';

describe('VideoConsultationRoom', () => {
  let mockReplaceTrack: any;

  beforeAll(() => {
    mockReplaceTrack = vi.fn().mockResolvedValue(undefined);

    class MockRTCPeerConnection {
      addTrack = vi.fn();
      getSenders = vi.fn().mockReturnValue([
        { track: { kind: 'video' }, replaceTrack: mockReplaceTrack },
        { track: { kind: 'audio' }, replaceTrack: vi.fn().mockResolvedValue(undefined) }
      ]);
      createOffer = vi.fn().mockResolvedValue({ type: 'offer', sdp: 'offer-sdp' });
      createAnswer = vi.fn().mockResolvedValue({ type: 'answer', sdp: 'answer-sdp' });
      setLocalDescription = vi.fn().mockResolvedValue(undefined);
      setRemoteDescription = vi.fn().mockResolvedValue(undefined);
      addIceCandidate = vi.fn().mockResolvedValue(undefined);
      close = vi.fn();
      restartIce = vi.fn();
      connectionState = 'connected';
      signalingState = 'stable';
      iceConnectionState = 'connected';
      ontrack: any = null;
      onicecandidate: any = null;
      onconnectionstatechange: any = null;
      oniceconnectionstatechange: any = null;
    }

    (global as any).RTCPeerConnection = MockRTCPeerConnection;
    (global as any).RTCSessionDescription = class {
      type: string;
      sdp: string;
      constructor(init: any) {
        this.type = init?.type || 'offer';
        this.sdp = init?.sdp || '';
      }
    };
    (global as any).RTCIceCandidate = class {
      candidate: string;
      constructor(init: any) {
        this.candidate = init?.candidate || '';
      }
    };

    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [
            { kind: 'video', stop: vi.fn(), enabled: true },
            { kind: 'audio', stop: vi.fn(), enabled: true }
          ],
          getVideoTracks: () => [{ kind: 'video', stop: vi.fn(), enabled: true }],
          getAudioTracks: () => [{ kind: 'audio', stop: vi.fn(), enabled: true }]
        }),
        getDisplayMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ kind: 'video', stop: vi.fn(), onended: null }],
          getVideoTracks: () => [{ kind: 'video', stop: vi.fn(), onended: null }]
        }),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      },
      configurable: true
    });
  });

  beforeEach(() => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url.includes('/room-access')) {
        return { success: true, allowed: true, appointment: mockAppointment };
      }
      if (url.includes('/ice-servers')) {
        return { success: true, iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
      }
      if (url.includes('/room-presence')) {
        return { success: true, data: { statusText: 'Terhubung', participantCount: 2, hasCounselor: true, hasStudent: true } };
      }
      if (url.includes('/in-call-notes')) {
        return { success: true, data: { sharedContent: '', lastUpdatedBy: 'Sistem' } };
      }
      if (url.includes('/webrtc/signals')) {
        return { success: true, signals: [] };
      }
      return { success: true };
    });

    vi.spyOn(apiClient, 'post').mockResolvedValue({ success: true });
    vi.mocked(apiClient.get).mockClear();
    vi.mocked(apiClient.post).mockClear();
  });

  const waitForRoomAuthorization = async () => {
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/api/v1/appointments/apt-123/ice-servers'));
  };

  const mockAppointment: any = {
    id: 'apt-123',
    counselorName: 'Dr. Jane Doe',
    studentName: 'John Smith',
    primaryConcern: 'Stress Test',
    counselorAvatar: 'avatar.png'
  };

  it('renders correctly with given appointment after room authorization', async () => {
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

    await waitForRoomAuthorization();
    expect(screen.getByText('Ruang Konsultasi Video')).toBeInTheDocument();
    expect(screen.getAllByText('Dr. Jane Doe').length).toBeGreaterThanOrEqual(1);
  });

  it('does not request camera or microphone until both room and ICE authorization succeed', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url.includes('/room-access')) return { success: false, status: 403, error: 'ROOM_ACCESS_NOT_APPROVED', message: 'ROOM_ACCESS_NOT_APPROVED' };
      return { success: true, iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    });
    const getUserMedia = navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>;
    getUserMedia.mockClear();

    render(
      <VideoConsultationRoom
        appointment={mockAppointment}
        onClose={vi.fn()}
        onEndCall={vi.fn()}
        userRole="mahasiswa"
      />
    );

    await waitFor(() => expect(screen.getByText(/ROOM_ACCESS_NOT_APPROVED/)).toBeInTheDocument());
    expect(getUserMedia).not.toHaveBeenCalled();
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

    const muteButton = screen.getByTitle(/Mikrofon/i);
    fireEvent.click(muteButton);
    expect(muteButton.className).toContain('text-rose-400');
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

    const videoButton = screen.getByTitle(/Kamera/i);
    fireEvent.click(videoButton);
    expect(videoButton.className).toContain('text-rose-400');
  });

  it('handles a cancelled screen-share request without breaking the call', async () => {
    render(
      <VideoConsultationRoom
        appointment={mockAppointment}
        onClose={vi.fn()}
        onEndCall={vi.fn()}
        userRole="mahasiswa"
      />
    );

    await waitForRoomAuthorization();
    const screenShareBtn = screen.getByTitle(/Berbagi Layar/i);
    (navigator.mediaDevices.getDisplayMedia as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Permission denied by user'));
    fireEvent.click(screenShareBtn);

    await waitFor(() => expect(navigator.mediaDevices.getDisplayMedia).toHaveBeenCalled());

    // Should not throw or crash component
    expect(screen.getByText('Ruang Konsultasi Video')).toBeInTheDocument();
  });

  it('opens and closes collaborative in-call notes panel', () => {
    render(
      <VideoConsultationRoom
        appointment={mockAppointment}
        onClose={vi.fn()}
        onEndCall={vi.fn()}
        userRole="mahasiswa"
      />
    );

    const notesBtn = screen.getByTitle(/Catatan Kolaborasi Sesi/i);
    fireEvent.click(notesBtn);

    expect(screen.getByText(/Catatan Kolaborasi Sesi/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Tulis poin-poin kesepakatan/i)).toBeInTheDocument();
  });

  it('shows counselor notes panel for counselor role after room authorization', async () => {
    render(
      <VideoConsultationRoom
        appointment={mockAppointment}
        onClose={vi.fn()}
        onEndCall={vi.fn()}
        userRole="konselor"
      />
    );

    await waitForRoomAuthorization();
    expect(screen.getByText(/Draft catatan konselor/i)).toBeInTheDocument();
    expect(screen.getByText('Stress Test')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Tulis draft yang nanti dapat dipindahkan ke Catatan SOAP/i)).toBeInTheDocument();
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

    expect(screen.queryByText(/Draft catatan konselor/i)).not.toBeInTheDocument();
  });

  it('calls onEndCall and onClose when End Call button is clicked and confirmed', async () => {
    const handleClose = vi.fn();
    const handleEndCall = vi.fn();
    
    vi.spyOn(window, 'confirm').mockImplementation(() => true);

    render(
      <VideoConsultationRoom
        appointment={mockAppointment}
        onClose={handleClose}
        onEndCall={handleEndCall}
        userRole="konselor"
      />
    );

    await waitForRoomAuthorization();
    const textarea = screen.getByPlaceholderText(/Tulis draft yang nanti dapat dipindahkan ke Catatan SOAP/i);
    fireEvent.change(textarea, { target: { value: 'Patient feels better' } });

    const endCallButton = screen.getByTitle(/Akhiri sesi konsultasi/i);
    fireEvent.click(endCallButton);

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('tidak otomatis disimpan'));
    expect(handleEndCall).toHaveBeenCalledWith('apt-123');
    expect(handleClose).toHaveBeenCalled();
    
    vi.restoreAllMocks();
  });
});
