import React, { memo, useState, useEffect, useRef, useMemo } from 'react';
import { motion, useReducedMotion, type TargetAndTransition, type Transition } from 'motion/react';
import {
  AURORA_ACTIVITY_EVENT,
  AURORA_STREAMING_EVENT,
  type AuroraActivityEvent,
  type AuroraPhase,
  type AuroraStreamingEventDetail,
} from '../../lib/auroraEvents';

export type AuroraVariant = 'tenang' | 'kerja';
export type AuroraIntensity = 'subtle' | 'normal' | 'vivid';
export type { AuroraPhase };

export interface AuroraBackgroundProps {
  /**
   * Identitas visual aurora (Gemini Standard):
   * - 'tenang': Emerald, Teal, Mint, Cyan (calm celestial sanctuary).
   * - 'kerja': Indigo, Violet, Electric Blue, Cyan (Gemini Advanced intelligence).
   */
  variant?: AuroraVariant;
  /**
   * Lifecycle phase aktivitas AI secara eksplisit.
   */
  phase?: AuroraPhase;
  /**
   * Kompatibilitas mundur dengan prop boolean streaming.
   */
  isStreaming?: boolean;
  /**
   * Tingkat intensitas pendaran visual.
   */
  intensity?: AuroraIntensity;
  /**
   * Custom CSS class name opsional pada wrapper canvas.
   */
  className?: string;
  /**
   * Konten anak opsional jika ingin menggunakan komponen sebagai wrapper langsung.
   */
  children?: React.ReactNode;
}

/**
 * AuroraBackground — Gemini Celestial Ambient Light System (v4.0).
 *
 * Fitur Utama Gemini-Grade:
 * 1. Dual-Spectrum Celestial Meshes:
 *    - Ruang Tenang: Teal (#0D9488), Emerald (#10B981), Mint (#6EE7B7), Cyan (#22D3EE).
 *    - Ruang Kerja: Indigo (#6366F1), Violet (#8B5CF6), Electric Blue (#3B82F6), Cyber Cyan (#06B6D4).
 * 2. Harmonic Fluid Easing: Sirkulasi organik asinkron (22s, 27s, 24s) meniru gelombang kosmik Gemini.
 * 3. Reactive AI Lifecycle:
 *    - Thinking: Radiansi berkondensasi lembut dengan akselerasi halus.
 *    - Streaming: Aliran cahaya dinamis selaras dengan pembentukan respons.
 *    - Finishing: Exhale transisi perlahan (1800ms) kembali ke ketenangan idle.
 * 4. Micro-Film Anti-Banding: Sub-pixel noise filter untuk gradien mulus bebas banding di layar OLED/Retina.
 * 5. Full Accessibility & Battery-Friendly: Otomatis jeda saat mengetik, tab disembunyikan, atau reduced motion.
 */
export const AuroraBackground: React.FC<AuroraBackgroundProps> = memo(({
  variant = 'tenang',
  phase: propPhase,
  isStreaming: propIsStreaming,
  intensity = 'normal',
  className = '',
  children,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [internalPhase, setInternalPhase] = useState<AuroraPhase>('idle');
  const [isTabHidden, setIsTabHidden] = useState(false);
  const [isUserEditing, setIsUserEditing] = useState(false);
  const [isLowPowerDevice] = useState(() => {
    if (typeof navigator === 'undefined') return false;
    const hardware = navigator as Navigator & { deviceMemory?: number };
    return (hardware.deviceMemory !== undefined && hardware.deviceMemory <= 4)
      || (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4);
  });
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const activeRequestIdRef = useRef<string | null>(null);
  const finishingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const parallaxGroupRef = useRef<HTMLDivElement | null>(null);
  const cursorSpotlightRef = useRef<HTMLDivElement | null>(null);

  // Monitor class dark pada html element untuk kalibrasi presisi Light / Dark
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const updateTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Jeda gerakan saat pengguna aktif menulis di input/textarea untuk menjaga fokus konsentrasi
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const isEditable = (target: EventTarget | null) => target instanceof HTMLElement
      && Boolean(target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'));
    const onFocusIn = (event: FocusEvent) => setIsUserEditing(isEditable(event.target));
    const onFocusOut = () => requestAnimationFrame(() => setIsUserEditing(isEditable(document.activeElement)));
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  // Monitor visibility tab untuk menghemat CPU/GPU saat browser berpindah tab
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleVisibility = () => {
      setIsTabHidden(document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Interactive Cursor Aura & 3D Parallax Inertia (Zero-Rerender 60fps Lerp Loop)
  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    if (shouldReduceMotion || isTabHidden || isLowPowerDevice) return;

    let rafId: number | null = null;
    let targetNx = 0.5;
    let targetNy = 0.42;
    let currentNx = 0.5;
    let currentNy = 0.42;

    const tick = () => {
      const dx = targetNx - currentNx;
      const dy = targetNy - currentNy;
      currentNx += dx * 0.065;
      currentNy += dy * 0.065;

      const vw = window.innerWidth || 1280;
      const vh = window.innerHeight || 800;

      if (cursorSpotlightRef.current) {
        const spotX = currentNx * vw - 320;
        const spotY = currentNy * vh - 320;
        cursorSpotlightRef.current.style.transform = `translate3d(${spotX.toFixed(1)}px, ${spotY.toFixed(1)}px, 0)`;
      }

      if (parallaxGroupRef.current) {
        const px = (currentNx - 0.5) * -28;
        const py = (currentNy - 0.5) * -24;
        parallaxGroupRef.current.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0)`;
      }

      if (Math.abs(dx) > 0.0006 || Math.abs(dy) > 0.0006) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const vw = window.innerWidth || 1280;
      const vh = window.innerHeight || 800;
      targetNx = Math.max(0, Math.min(1, e.clientX / vw));
      targetNy = Math.max(0, Math.min(1, e.clientY / vh));
      if (rafId === null) {
        rafId = requestAnimationFrame(tick);
      }
    };

    document.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [shouldReduceMotion, isTabHidden, isLowPowerDevice]);

  const clearPendingTimers = () => {
    if (finishingTimerRef.current) {
      clearTimeout(finishingTimerRef.current);
      finishingTimerRef.current = null;
    }
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
  };

  // Tangani prop isStreaming legacy jika propPhase tidak didefinisikan secara langsung
  useEffect(() => {
    if (propPhase !== undefined) return;
    if (propIsStreaming !== undefined) {
      clearPendingTimers();
      if (propIsStreaming) {
        setInternalPhase('streaming');
      } else {
        setInternalPhase(prev => {
          if (prev === 'streaming' || prev === 'thinking' || prev === 'preparing') {
            finishingTimerRef.current = setTimeout(() => {
              setInternalPhase('idle');
            }, 1800);
            return 'finishing';
          }
          return 'idle';
        });
      }
    }
  }, [propIsStreaming, propPhase]);

  // Dengarkan custom events: rt-aurora-activity (scoped by variant) & rt-aurora-streaming (legacy)
  useEffect(() => {
    const handleActivity = (e: Event) => {
      const customEvent = e as CustomEvent<AuroraActivityEvent>;
      const detail = customEvent.detail;
      if (!detail || !detail.mode || !detail.phase) return;

      const targetMode = variant === 'kerja' ? 'RUANG_KERJA' : 'RUANG_TENANG';
      if (detail.mode !== targetMode) return;

      if (detail.requestId) {
        if (detail.phase === 'preparing') {
          activeRequestIdRef.current = detail.requestId;
        } else if (activeRequestIdRef.current && activeRequestIdRef.current !== detail.requestId) {
          return;
        }
      }

      clearPendingTimers();

      if (detail.phase === 'finishing') {
        setInternalPhase('finishing');
        finishingTimerRef.current = setTimeout(() => {
          setInternalPhase('idle');
          activeRequestIdRef.current = null;
        }, 1800);
      } else if (detail.phase === 'error') {
        setInternalPhase('error');
        errorTimerRef.current = setTimeout(() => {
          setInternalPhase('idle');
          activeRequestIdRef.current = null;
        }, 1200);
      } else {
        setInternalPhase(detail.phase);
        if (detail.phase === 'idle') {
          activeRequestIdRef.current = null;
        }
      }
    };

    const handleLegacyStreaming = (e: Event) => {
      const customEvent = e as CustomEvent<AuroraStreamingEventDetail>;
      if (customEvent.detail && typeof customEvent.detail.isStreaming === 'boolean') {
        clearPendingTimers();
        if (customEvent.detail.isStreaming) {
          setInternalPhase('streaming');
        } else {
          setInternalPhase(prev => {
            if (prev === 'streaming' || prev === 'thinking' || prev === 'preparing') {
              finishingTimerRef.current = setTimeout(() => {
                setInternalPhase('idle');
              }, 1800);
              return 'finishing';
            }
            return 'idle';
          });
        }
      }
    };

    window.addEventListener(AURORA_ACTIVITY_EVENT, handleActivity);
    window.addEventListener(AURORA_STREAMING_EVENT, handleLegacyStreaming);

    return () => {
      window.removeEventListener(AURORA_ACTIVITY_EVENT, handleActivity);
      window.removeEventListener(AURORA_STREAMING_EVENT, handleLegacyStreaming);
      clearPendingTimers();
    };
  }, [variant]);

  const currentPhase: AuroraPhase = propPhase ?? internalPhase;

  // Intensitas multiplier terkalibrasi agar warna selalu nyata & berkarakter
  const intensityMultiplier = useMemo(() => {
    switch (intensity) {
      case 'subtle': return 0.50;
      case 'vivid': return 0.85;
      case 'normal':
      default: return 0.68;
    }
  }, [intensity]);

  // Harmonic Gemini fluid easing
  const fluidEase: [number, number, number, number] = [0.44, 0.05, 0.22, 0.95];

  const isThinking = currentPhase === 'thinking';
  const isStreaming = currentPhase === 'streaming';
  const isPreparing = currentPhase === 'preparing';
  const isFinishing = currentPhase === 'finishing';
  const isError = currentPhase === 'error';

  const durationScale = isThinking
    ? 0.75
    : isStreaming
    ? 0.85
    : isPreparing
    ? 0.78
    : isFinishing
    ? 1.30
    : 1.0;

  // Prime-cycle asinkron (22s, 27s, 24s)
  const duration1 = 22 * durationScale;
  const duration2 = 27 * durationScale;
  const duration3 = 24 * durationScale;

  const shouldPauseMotion = shouldReduceMotion || isTabHidden || isUserEditing || isLowPowerDevice;
  const hardwareLayerStyle: React.CSSProperties = {
    transformOrigin: '50% 50%',
    willChange: shouldPauseMotion ? 'auto' : 'transform, opacity',
    backfaceVisibility: 'hidden',
    transform: 'translate3d(0, 0, 0)',
    WebkitTransform: 'translate3d(0, 0, 0)',
  };

  const isKerja = variant === 'kerja';

  const opacityBoost = isThinking
    ? 0.12
    : isStreaming
    ? 0.09
    : isPreparing
    ? 0.06
    : isFinishing
    ? 0.04
    : isError
    ? 0.02
    : 0;

  // Layer 1: Top-Left Primary Fluid Mass
  const baseOp1 = (isKerja ? 0.54 : 0.58) * intensityMultiplier;
  const targetOp1 = Math.min(0.72, baseOp1 + opacityBoost);
  const layer1Animation: TargetAndTransition = shouldPauseMotion
    ? { opacity: targetOp1 }
    : {
        x: isThinking
          ? ['-6%', '14%', '2%', '-10%', '-6%']
          : isStreaming
          ? ['-4%', '9%', '0%', '-6%', '-4%']
          : ['-3%', '6%', '-1%', '-4%', '-3%'],
        y: isThinking
          ? ['-7%', '7%', '14%', '-4%', '-7%']
          : isStreaming
          ? ['-5%', '5%', '8%', '-3%', '-5%']
          : ['-3%', '3%', '5%', '-2%', '-3%'],
        rotate: isThinking
          ? [-8, 14, -6, 16, -8]
          : isStreaming
          ? [-5, 9, -3, 10, -5]
          : [-3, 6, -2, 7, -3],
        scale: isThinking
          ? [1.02, 1.22, 1.06, 1.18, 1.02]
          : isStreaming
          ? [1.01, 1.12, 1.03, 1.10, 1.01]
          : [0.98, 1.06, 1.01, 1.05, 0.98],
        opacity: [baseOp1, targetOp1, baseOp1 * 0.96, targetOp1 * 0.98, baseOp1],
      };

  const layer1Transition: Transition = {
    duration: duration1,
    repeat: Infinity,
    ease: fluidEase,
  };

  // Layer 2: Bottom-Right Counter Wave
  const baseOp2 = (isKerja ? 0.48 : 0.52) * intensityMultiplier;
  const targetOp2 = Math.min(0.66, baseOp2 + opacityBoost);
  const layer2Animation: TargetAndTransition = shouldPauseMotion
    ? { opacity: targetOp2 }
    : {
        x: isThinking
          ? ['10%', '-12%', '5%', '-8%', '10%']
          : isStreaming
          ? ['7%', '-8%', '3%', '-5%', '7%']
          : ['4%', '-5%', '2%', '-3%', '4%'],
        y: isThinking
          ? ['8%', '-10%', '12%', '-6%', '8%']
          : isStreaming
          ? ['5%', '-7%', '7%', '-4%', '5%']
          : ['3%', '-4%', '4%', '-2%', '3%'],
        rotate: isThinking
          ? [12, -14, 7, -10, 12]
          : isStreaming
          ? [7, -9, 4, -7, 7]
          : [4, -6, 2, -4, 4],
        scale: isThinking
          ? [1.04, 1.24, 1.05, 1.19, 1.04]
          : isStreaming
          ? [1.02, 1.14, 1.01, 1.11, 1.02]
          : [0.97, 1.07, 0.99, 1.05, 0.97],
        opacity: [baseOp2, targetOp2, baseOp2 * 0.94, targetOp2 * 0.96, baseOp2],
      };

  const layer2Transition: Transition = {
    duration: duration2,
    repeat: Infinity,
    ease: fluidEase,
  };

  // Layer 3: Top-Right / Center Ambient Ribbon
  const baseOp3 = (isKerja ? 0.42 : 0.46) * intensityMultiplier;
  const targetOp3 = Math.min(0.62, baseOp3 + opacityBoost);
  const layer3Animation: TargetAndTransition = shouldPauseMotion
    ? { opacity: targetOp3 }
    : {
        x: isThinking
          ? ['-10%', '9%', '-5%', '12%', '-10%']
          : isStreaming
          ? ['-6%', '6%', '-3%', '8%', '-6%']
          : ['-4%', '4%', '-2%', '5%', '-4%'],
        y: isThinking
          ? ['9%', '-10%', '5%', '-12%', '9%']
          : isStreaming
          ? ['5%', '-6%', '3%', '-8%', '5%']
          : ['3%', '-4%', '2%', '-5%', '3%'],
        rotate: isThinking
          ? [-12, 11, -8, 14, -12]
          : isStreaming
          ? [-7, 6, -4, 9, -7]
          : [-5, 4, -2, 6, -5],
        scale: isThinking
          ? [0.99, 1.20, 1.03, 1.17, 0.99]
          : isStreaming
          ? [0.98, 1.11, 1.01, 1.09, 0.98]
          : [0.96, 1.05, 0.99, 1.04, 0.96],
        opacity: [baseOp3, targetOp3, baseOp3 * 0.93, targetOp3 * 0.95, baseOp3],
      };

  const layer3Transition: Transition = {
    duration: duration3,
    repeat: Infinity,
    ease: fluidEase,
  };

  // Dynamic Color Morph Transitions
  const morphDuration = isThinking ? 9 : 18;
  const morphAnimation: TargetAndTransition = shouldPauseMotion
    ? { opacity: 0.52 }
    : {
        opacity: isThinking ? [0.35, 0.95, 0.48, 0.92, 0.35] : [0.25, 0.88, 0.38, 0.84, 0.25],
        rotate: isThinking ? [6, -10, 4, -8, 6] : [3, -5, 2, -4, 3],
        scale: isThinking ? [1.02, 1.14, 0.98, 1.12, 1.02] : [1.0, 1.06, 0.99, 1.05, 1.0],
      };
  const morphTransition: Transition = {
    duration: morphDuration,
    repeat: Infinity,
    ease: fluidEase,
  };

  // Google Gemini-Grade Calibrated Gradients
  // Tenang (Emerald, Teal, Mint, Cyan):
  const layer1Gradient = useMemo(() => {
    if (isKerja) {
      return isDark
        ? 'radial-gradient(circle at 46% 46%, rgba(99, 102, 241, 0.52) 0%, rgba(139, 92, 246, 0.32) 42%, rgba(59, 130, 246, 0.14) 70%, transparent 86%)'
        : 'radial-gradient(circle at 46% 46%, rgba(99, 102, 241, 0.68) 0%, rgba(139, 92, 246, 0.44) 40%, rgba(59, 130, 246, 0.20) 68%, transparent 86%)';
    }
    return isDark
      ? 'radial-gradient(circle at 46% 46%, rgba(13, 148, 136, 0.52) 0%, rgba(16, 185, 129, 0.32) 42%, rgba(13, 148, 136, 0.12) 70%, transparent 86%)'
      : 'radial-gradient(circle at 46% 46%, rgba(13, 148, 136, 0.68) 0%, rgba(16, 185, 129, 0.46) 38%, rgba(110, 231, 183, 0.22) 66%, transparent 86%)';
  }, [isDark, isKerja]);

  const layer1MorphGradient = useMemo(() => {
    if (isKerja) {
      return isDark
        ? 'radial-gradient(circle at 50% 42%, rgba(59, 130, 246, 0.52) 0%, rgba(6, 182, 212, 0.34) 45%, rgba(99, 102, 241, 0.14) 72%, transparent 88%)'
        : 'radial-gradient(circle at 50% 42%, rgba(59, 130, 246, 0.64) 0%, rgba(6, 182, 212, 0.46) 42%, rgba(99, 102, 241, 0.20) 68%, transparent 88%)';
    }
    return isDark
      ? 'radial-gradient(circle at 50% 42%, rgba(16, 185, 129, 0.52) 0%, rgba(34, 211, 238, 0.34) 45%, rgba(16, 185, 129, 0.14) 72%, transparent 88%)'
      : 'radial-gradient(circle at 50% 42%, rgba(16, 185, 129, 0.64) 0%, rgba(34, 211, 238, 0.46) 42%, rgba(13, 148, 136, 0.20) 68%, transparent 88%)';
  }, [isDark, isKerja]);

  const layer2Gradient = useMemo(() => {
    if (isKerja) {
      return isDark
        ? 'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.48) 0%, rgba(59, 130, 246, 0.30) 42%, rgba(6, 182, 212, 0.14) 72%, transparent 88%)'
        : 'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.60) 0%, rgba(59, 130, 246, 0.42) 42%, rgba(6, 182, 212, 0.18) 70%, transparent 88%)';
    }
    return isDark
      ? 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.44) 0%, rgba(34, 211, 238, 0.28) 42%, rgba(99, 102, 241, 0.12) 70%, transparent 86%)'
      : 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.54) 0%, rgba(34, 211, 238, 0.42) 40%, rgba(16, 185, 129, 0.18) 68%, transparent 88%)';
  }, [isDark, isKerja]);

  const layer2MorphGradient = useMemo(() => {
    if (isKerja) {
      return isDark
        ? 'radial-gradient(circle at 48% 54%, rgba(6, 182, 212, 0.48) 0%, rgba(59, 130, 246, 0.28) 45%, rgba(139, 92, 246, 0.14) 72%, transparent 88%)'
        : 'radial-gradient(circle at 48% 54%, rgba(6, 182, 212, 0.58) 0%, rgba(59, 130, 246, 0.38) 42%, rgba(139, 92, 246, 0.18) 70%, transparent 88%)';
    }
    return isDark
      ? 'radial-gradient(circle at 48% 54%, rgba(34, 211, 238, 0.48) 0%, rgba(110, 231, 183, 0.30) 45%, rgba(99, 102, 241, 0.14) 72%, transparent 88%)'
      : 'radial-gradient(circle at 48% 54%, rgba(34, 211, 238, 0.60) 0%, rgba(110, 231, 183, 0.44) 42%, rgba(99, 102, 241, 0.18) 70%, transparent 88%)';
  }, [isDark, isKerja]);

  const layer3Gradient = useMemo(() => {
    if (isKerja) {
      return isDark
        ? 'radial-gradient(circle at 52% 48%, rgba(6, 182, 212, 0.48) 0%, rgba(99, 102, 241, 0.28) 45%, rgba(59, 130, 246, 0.14) 72%, transparent 88%)'
        : 'radial-gradient(circle at 52% 48%, rgba(6, 182, 212, 0.60) 0%, rgba(99, 102, 241, 0.38) 42%, rgba(59, 130, 246, 0.20) 70%, transparent 88%)';
    }
    return isDark
      ? 'radial-gradient(circle at 52% 48%, rgba(6, 182, 212, 0.48) 0%, rgba(110, 231, 183, 0.28) 45%, rgba(6, 182, 212, 0.12) 72%, transparent 88%)'
      : 'radial-gradient(circle at 52% 48%, rgba(6, 182, 212, 0.60) 0%, rgba(110, 231, 183, 0.42) 42%, rgba(16, 185, 129, 0.18) 70%, transparent 88%)';
  }, [isDark, isKerja]);

  const layer3MorphGradient = useMemo(() => {
    if (isKerja) {
      return isDark
        ? 'radial-gradient(circle at 48% 50%, rgba(99, 102, 241, 0.50) 0%, rgba(139, 92, 246, 0.30) 45%, rgba(6, 182, 212, 0.14) 70%, transparent 88%)'
        : 'radial-gradient(circle at 48% 50%, rgba(99, 102, 241, 0.64) 0%, rgba(139, 92, 246, 0.44) 42%, rgba(6, 182, 212, 0.20) 68%, transparent 88%)';
    }
    return isDark
      ? 'radial-gradient(circle at 48% 50%, rgba(16, 185, 129, 0.50) 0%, rgba(13, 148, 136, 0.30) 45%, rgba(34, 211, 238, 0.14) 70%, transparent 88%)'
      : 'radial-gradient(circle at 48% 50%, rgba(16, 185, 129, 0.62) 0%, rgba(13, 148, 136, 0.42) 42%, rgba(34, 211, 238, 0.20) 68%, transparent 88%)';
  }, [isDark, isKerja]);

  return (
    <div
      aria-hidden="true"
      data-aurora-variant={variant}
      data-aurora-phase={currentPhase}
      data-aurora-paused={shouldPauseMotion}
      style={{
        contain: 'strict',
        transform: 'translate3d(0, 0, 0)',
        WebkitTransform: 'translate3d(0, 0, 0)',
      }}
      className={`fixed inset-0 z-0 overflow-hidden pointer-events-none select-none bg-[var(--rt-page)] transition-colors duration-200 ease-in-out ${className}`}
    >
      {/* Google Gemini Top Coronal Horizon (Radiant Header Spill) */}
      <div
        className={`absolute -top-16 inset-x-0 h-44 pointer-events-none transition-opacity duration-700 ease-out ${
          isThinking
            ? 'opacity-85 scale-y-110'
            : isStreaming
            ? 'opacity-75'
            : 'opacity-40'
        } ${
          isKerja
            ? 'bg-[radial-gradient(ellipse_70%_100%_at_50%_0%,rgba(99,102,241,0.22)_0%,rgba(6,182,212,0.12)_45%,transparent_80%)]'
            : 'bg-[radial-gradient(ellipse_70%_100%_at_50%_0%,rgba(13,148,136,0.22)_0%,rgba(34,211,238,0.12)_45%,transparent_80%)]'
        }`}
      />

      {/* 3 Atmospheric Mesh Gradient Masses */}
      <div className="absolute inset-0 w-full h-full overflow-hidden opacity-[0.58] dark:opacity-45" style={{ contain: 'strict' }}>
        <div ref={parallaxGroupRef} className="w-full h-full will-change-transform">
          {/* Layer 1: Wide Diffuse Flow (Top-Left) with Dynamic Morph */}
          <motion.div
            className="absolute top-[-20%] left-[-16%] w-[88vw] sm:w-[72vw] md:w-[62vw] h-[76vw] sm:h-[60vw] md:h-[52vw] rounded-[48%_52%_64%_36%/45%_55%_45%_55%] blur-[32px] sm:blur-[44px] md:blur-[56px]"
            style={{
              ...hardwareLayerStyle,
              background: layer1Gradient,
              mixBlendMode: isDark ? 'screen' : 'normal',
              transition: 'background 0.5s ease-in-out, mix-blend-mode 0.5s ease-in-out',
            }}
            animate={layer1Animation}
            transition={layer1Transition}
          >
            <motion.div
              className="absolute inset-0 rounded-[48%_52%_64%_36%/45%_55%_45%_55%]"
              style={{
                background: layer1MorphGradient,
                transform: 'translate3d(0, 0, 0)',
                transition: 'background 0.5s ease-in-out',
              }}
              animate={morphAnimation}
              transition={morphTransition}
            />
          </motion.div>

          {/* Layer 2: Flowing Complementary Wave (Bottom-Right) with Dynamic Morph */}
          <motion.div
            className="absolute bottom-[-18%] right-[-14%] w-[86vw] sm:w-[68vw] md:w-[58vw] h-[76vw] sm:h-[60vw] md:h-[52vw] rounded-[42%_58%_54%_46%/58%_44%_56%_42%] blur-[32px] sm:blur-[44px] md:blur-[56px]"
            style={{
              ...hardwareLayerStyle,
              background: layer2Gradient,
              mixBlendMode: isDark ? 'screen' : 'normal',
              transition: 'background 0.5s ease-in-out, mix-blend-mode 0.5s ease-in-out',
            }}
            animate={layer2Animation}
            transition={layer2Transition}
          >
            <motion.div
              className="absolute inset-0 rounded-[42%_58%_54%_46%/58%_44%_56%_42%]"
              style={{
                background: layer2MorphGradient,
                transform: 'translate3d(0, 0, 0)',
                transition: 'background 0.5s ease-in-out',
              }}
              animate={morphAnimation}
              transition={{
                ...morphTransition,
                delay: 4,
              }}
            />
          </motion.div>

          {/* Layer 3: Reactive Accent Light (Top-Right / Center-Right) with Dynamic Morph */}
          <motion.div
            className="absolute top-[-12%] right-[-14%] w-[82vw] sm:w-[64vw] md:w-[54vw] h-[72vw] sm:h-[56vw] md:h-[48vw] rounded-[52%_48%_42%_58%/44%_58%_42%_56%] blur-[32px] sm:blur-[44px] md:blur-[56px]"
            style={{
              ...hardwareLayerStyle,
              background: layer3Gradient,
              mixBlendMode: isDark ? 'screen' : 'normal',
              transition: 'background 0.5s ease-in-out, mix-blend-mode 0.5s ease-in-out',
            }}
            animate={layer3Animation}
            transition={layer3Transition}
          >
            <motion.div
              className="absolute inset-0 rounded-[52%_48%_42%_58%/44%_58%_42%_56%]"
              style={{
                background: layer3MorphGradient,
                transform: 'translate3d(0, 0, 0)',
                transition: 'background 0.5s ease-in-out',
              }}
              animate={morphAnimation}
              transition={{
                ...morphTransition,
                delay: 8,
              }}
            />
          </motion.div>
        </div>
      </div>

      {/* Interactive Celestial Layer: Cursor Spotlight, Typing Luminescence & Mindfulness Breathing Wave */}
      <div className="absolute top-0 right-0 bottom-0 left-0 pointer-events-none overflow-hidden">
        {/* 1. Cursor-Following Spotlight Orb (Smooth 60fps Inertia) */}
        <div
          ref={cursorSpotlightRef}
          data-aurora-cursor-spotlight="true"
          style={{
            width: '640px',
            height: '640px',
            transform: 'translate3d(calc(50vw - 320px), calc(42vh - 320px), 0)',
            willChange: shouldPauseMotion ? 'auto' : 'transform',
            background: isKerja
              ? isDark
                ? 'radial-gradient(circle, rgba(99, 102, 241, 0.16) 0%, rgba(139, 92, 246, 0.08) 42%, transparent 72%)'
                : 'radial-gradient(circle, rgba(99, 102, 241, 0.20) 0%, rgba(59, 130, 246, 0.09) 42%, transparent 72%)'
              : isDark
              ? 'radial-gradient(circle, rgba(20, 184, 166, 0.16) 0%, rgba(16, 185, 129, 0.08) 42%, transparent 72%)'
              : 'radial-gradient(circle, rgba(13, 148, 136, 0.20) 0%, rgba(45, 212, 191, 0.10) 42%, transparent 72%)',
          }}
          className="absolute top-0 left-0 rounded-full blur-[40px] transition-opacity duration-500 opacity-85 dark:opacity-75"
        />

        {/* 2. Typing & Active Composer Luminescence Halo */}
        <div
          data-aurora-typing-halo={isUserEditing || isThinking || isStreaming ? 'active' : 'idle'}
          style={{
            background: isKerja
              ? isDark
                ? 'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(99, 102, 241, 0.24) 0%, rgba(139, 92, 246, 0.11) 48%, transparent 78%)'
                : 'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(99, 102, 241, 0.26) 0%, rgba(6, 182, 212, 0.12) 48%, transparent 78%)'
              : isDark
              ? 'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(13, 148, 136, 0.24) 0%, rgba(16, 185, 129, 0.11) 48%, transparent 78%)'
              : 'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(13, 148, 136, 0.26) 0%, rgba(45, 212, 191, 0.12) 48%, transparent 78%)',
          }}
          className={`absolute bottom-[4%] left-1/2 -translate-x-1/2 w-[min(92vw,54rem)] h-[19rem] rounded-full blur-[44px] transition-all duration-700 ease-out ${
            isUserEditing || isThinking || isStreaming
              ? 'opacity-90 scale-105'
              : 'opacity-25 scale-95'
          }`}
        />

        {/* 3. Organic Mindfulness Breathing Pulse (5.8s Inhale / Exhale Cadence) */}
        <motion.div
          data-aurora-breathing-wave="true"
          style={{
            background: isKerja
              ? 'radial-gradient(circle, rgba(99, 102, 241, 0.14) 0%, rgba(6, 182, 212, 0.06) 50%, transparent 75%)'
              : 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(20, 184, 166, 0.07) 50%, transparent 75%)',
          }}
          animate={
            shouldPauseMotion
              ? { opacity: 0.22, scale: 1 }
              : {
                  scale: [0.94, 1.07, 0.94],
                  opacity: [0.18, 0.38, 0.18],
                }
          }
          transition={{
            duration: isKerja ? 6.4 : 5.6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(78vw,44rem)] h-[min(78vw,44rem)] rounded-full blur-[52px]"
        />
      </div>

      {/* Atmospheric Subtle Central Reading Diffusion (Smooth Cross-Fading Dual-Veil) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Light Mode Diffusion Veil */}
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ease-in-out ${
            isDark ? 'opacity-0' : 'opacity-100'
          } ${
            isKerja
              ? 'bg-[radial-gradient(ellipse_65%_55%_at_50%_48%,rgba(248,250,252,0.12)_0%,transparent_75%)]'
              : 'bg-[radial-gradient(ellipse_65%_55%_at_50%_48%,rgba(250,250,249,0.12)_0%,transparent_75%)]'
          }`}
        />
        {/* Dark Mode Diffusion Veil */}
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ease-in-out ${
            isDark ? 'opacity-100' : 'opacity-0'
          } ${
            isKerja
              ? 'bg-[radial-gradient(ellipse_65%_55%_at_50%_48%,rgba(9,14,23,0.18)_0%,transparent_80%)]'
              : 'bg-[radial-gradient(ellipse_65%_55%_at_50%_48%,rgba(8,13,22,0.18)_0%,transparent_80%)]'
          }`}
        />
      </div>

      {/* Optimized SVG Grain Overlay (Anti-Banding on OLED & Retina Displays) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.025] dark:opacity-[0.035] mix-blend-overlay"
        aria-hidden="true"
      >
        <defs>
          <filter id="auroraNoiseFilter">
            <feTurbulence type="fractalNoise" baseFrequency="0.80" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" />
          </filter>
        </defs>
        <rect width="100%" height="100%" filter="url(#auroraNoiseFilter)" />
      </svg>

      {children}
    </div>
  );
});

AuroraBackground.displayName = 'AuroraBackground';

export default AuroraBackground;
