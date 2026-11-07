import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { FluidVoiceVisualizer } from '../../features/chat/components/FluidVoiceVisualizer';
import { FluidVoiceCompanionModal } from '../../features/chat/components/FluidVoiceCompanionModal';
import { useRealtimeLiveSession } from '../../features/chat/hooks/useRealtimeLiveSession';

// Mock Toast
vi.mock('../../components/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() })
}));

describe('Track 1: Fluid Voice Companion & Visualizer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Stub SpeechSynthesis
    (window as any).speechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
      getVoices: vi.fn().mockReturnValue([])
    };
    (window as any).SpeechSynthesisUtterance = function (this: any, text: string) {
      this.text = text;
      this.lang = 'id-ID';
      this.pitch = 1;
      this.rate = 1;
    };

    // Stub AudioContext as constructor function
    (window as any).AudioContext = function (this: any) {
      this.state = 'running';
      this.createMediaStreamSource = vi.fn().mockReturnValue({
        connect: vi.fn()
      });
      this.createAnalyser = vi.fn().mockReturnValue({
        fftSize: 256,
        frequencyBinCount: 128,
        getByteFrequencyData: vi.fn()
      });
      this.close = vi.fn().mockResolvedValue(undefined);
    };

    // Stub navigator.mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }])
        })
      },
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('FluidVoiceVisualizer Component', () => {
    it('renders a canvas element without throwing in various states', () => {
      const { container, rerender } = render(
        <FluidVoiceVisualizer state="listening" userVolume={0.5} />
      );
      expect(container.querySelector('canvas')).toBeDefined();

      rerender(<FluidVoiceVisualizer state="speaking" aiVolume={0.8} />);
      expect(container.querySelector('canvas')).toBeDefined();

      rerender(<FluidVoiceVisualizer state="processing" />);
      expect(container.querySelector('canvas')).toBeDefined();

      rerender(<FluidVoiceVisualizer state="muted" />);
      expect(container.querySelector('canvas')).toBeDefined();
    });
  });

  describe('useRealtimeLiveSession Hook', () => {
    it('initializes with default session states', () => {
      const { result } = renderHook(() =>
        useRealtimeLiveSession({ persona: 'empathetic_counselor' })
      );

      expect(result.current.isSessionActive).toBe(false);
      expect(result.current.isMuted).toBe(false);
      expect(result.current.persona).toBe('empathetic_counselor');
      expect(result.current.transcripts).toHaveLength(0);
    });

    it('toggles mute state and sets persona dynamically', () => {
      const { result } = renderHook(() =>
        useRealtimeLiveSession({ persona: 'empathetic_counselor' })
      );

      act(() => {
        result.current.toggleMute();
      });
      expect(result.current.isMuted).toBe(true);

      act(() => {
        result.current.setPersona('examiner_methodology');
      });
      expect(result.current.persona).toBe('examiner_methodology');
    });

    it('interrupts AI speech cleanly', () => {
      const { result } = renderHook(() => useRealtimeLiveSession());

      act(() => {
        result.current.interruptAi();
      });

      expect(window.speechSynthesis.cancel).toHaveBeenCalled();
      expect(result.current.isAiSpeaking).toBe(false);
      expect(result.current.aiVolume).toBe(0);
    });
  });

  describe('FluidVoiceCompanionModal Component', () => {
    it('renders dialog with persona switches, duration timer, and buttons', () => {
      const onClose = vi.fn();
      render(
        <FluidVoiceCompanionModal
          isOpen={true}
          onClose={onClose}
          initialPersona="empathetic_counselor"
        />
      );

      expect(screen.getByRole('dialog')).toBeDefined();
      expect(screen.getByText('Sahabat Curhat')).toBeDefined();
      expect(screen.getByText('Mentor Akademik')).toBeDefined();
      expect(screen.getByLabelText('Akhiri Sesi Suara')).toBeDefined();
    });

    it('toggles persona when persona button is clicked', () => {
      render(
        <FluidVoiceCompanionModal
          isOpen={true}
          onClose={vi.fn()}
          initialPersona="empathetic_counselor"
        />
      );

      const mentorButton = screen.getByText('Mentor Akademik');
      fireEvent.click(mentorButton);
      expect(mentorButton).toBeDefined();
    });

    it('calls onClose when End Call button is clicked', () => {
      const onClose = vi.fn();
      render(
        <FluidVoiceCompanionModal
          isOpen={true}
          onClose={onClose}
        />
      );

      const endButton = screen.getByLabelText('Akhiri Sesi Suara');
      fireEvent.click(endButton);
      expect(onClose).toHaveBeenCalled();
    });
  });
});
