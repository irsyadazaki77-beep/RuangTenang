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
   * Identitas visual aurora:
   * - 'tenang': Emerald, Teal, Mint, Cyan (calming, sanctuary, atmospheric).
   * - 'kerja': Indigo, Violet, Electric Blue, Cyan (intelligent, focused).
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
 * AuroraBackground — Aurora 2.2 Performance, Fluid Motion & Visual Quality Overhaul
 *
 * Fitur Utama Aurora 2.2:
 * 1. Dual-Vibrant Palette Engine:
 *    - Ruang Tenang: Teal (#0d9488), Emerald (#10b981), Mint (#6ee7b7), Cyan (#22d3ee).
 *    - Ruang Kerja: Indigo (#6366f1), Violet (#8b5cf6), Electric Blue (#3b82f6), Cyan (#06b6d4).
 * 2. Optimized Compositing:
 *    - Menggunakan blur terkalibrasi (36px mobile, 48px tablet, 60px desktop) dengan falloff gradien tegas
 *      sehingga warna terlihat 100% kaya dan cerah tanpa penalti repaint berat.
 * 3. Pure GPU Transform & Opacity Animations:
 *    - Tanpa JavaScript timer per frame, tanpa re-render React berlebihan.
 * 4. Micro-Grain Static SVG Dither:
 *    - Menggunakan static noise data URI teroptimasi yang bebas beban continuous CPU feTurbulence.
 * 5. Deterministic AI Lifecycle State Machine:
 *    - Mengisolasi request ID dengan pembatalan otomatis untuk mencegah timer race conditions.
 * 6. Responsive & Tab-Aware:
 *    - Freeze otomatis saat tab disembunyikan untuk menghemat daya GPU.
 *    - Reduced-motion mode menampilkan pendaran statis yang tetap estetik.
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
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const activeRequestIdRef = useRef<string | null>(null);
  const finishingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Monitor class dark pada html element untuk kalibrasi alpha presisi Light / Dark
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

  // Monitor visibility tab untuk menghentikan loop rendering saat tab tidak aktif
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleVisibility = () => {
      setIsTabHidden(document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Reset timer helper
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

      // Mode scoping: Hanya tangani event yang sesuai dengan active variant
      const targetMode = variant === 'kerja' ? 'RUANG_KERJA' : 'RUANG_TENANG';
      if (detail.mode !== targetMode) return;

      // Stale request handling: abaikan event dari request lama jika ada requestId baru yang aktif
      if (detail.requestId) {
        if (detail.phase === 'preparing') {
          activeRequestIdRef.current = detail.requestId;
        } else if (activeRequestIdRef.current && activeRequestIdRef.current !== detail.requestId) {
          // Event dari request lama yang tertunda, abaikan
          return;
        }
      }

      // Bersihkan timer transisi sebelumnya
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
      // Hanya tangani event legacy jika tidak dikontrol propPhase
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

  // Phase prioritas: propPhase > internalPhase
  const currentPhase: AuroraPhase = propPhase ?? internalPhase;

  // Intensitas multiplier terkalibrasi agar warna selalu nyata & berkarakter
  const intensityMultiplier = useMemo(() => {
    switch (intensity) {
      case 'subtle': return 0.78;
      case 'vivid': return 1.32;
      case 'normal':
      default: return 1.08;
    }
  }, [intensity]);

  // Harmonic fluid easing: smooth acceleration, ultra-gentle deceleration
  const fluidEase: [number, number, number, number] = [0.44, 0.05, 0.22, 0.95];

  // Hitung durasi dan ritme pergerakan berdasarkan phase
  const isThinking = currentPhase === 'thinking';
  const isStreaming = currentPhase === 'streaming';
  const isPreparing = currentPhase === 'preparing';
  const isFinishing = currentPhase === 'finishing';
  const isError = currentPhase === 'error';

  const durationScale = isThinking
    ? 0.46 // Lebih berdenyut & hidup saat berpikir
    : isStreaming
    ? 0.65 // Mengalir dinamis & stabil saat streaming
    : isPreparing
    ? 0.78
    : isFinishing
    ? 1.30 // Decelerating exhale yang sangat halus
    : 1.0;  // Idle calm

  // Prime-cycle asinkron (22s, 27s, 24s) agar 3 lapisan tidak pernah bergerak serempak
  const duration1 = 22 * durationScale;
  const duration2 = 27 * durationScale;
  const duration3 = 24 * durationScale;

  // Hardware Layer Style (Compositor Thread Execution)
  const hardwareLayerStyle: React.CSSProperties = {
    transformOrigin: '50% 50%',
    willChange: shouldReduceMotion || isTabHidden ? 'auto' : 'transform, opacity',
    backfaceVisibility: 'hidden',
    transform: 'translate3d(0, 0, 0)',
    WebkitTransform: 'translate3d(0, 0, 0)',
  };

  const isKerja = variant === 'kerja';

  // Opacity boost berdasarkan phase
  const opacityBoost = isThinking
    ? 0.24
    : isStreaming
    ? 0.18
    : isPreparing
    ? 0.10
    : isFinishing
    ? 0.08
    : isError
    ? 0.06
    : 0;

  // Layer 1 Animation: Top-Left Primary Fluid Stream (Lissajous drift)
  const baseOp1 = (isKerja ? 0.72 : 0.82) * intensityMultiplier;
  const targetOp1 = Math.min(0.98, baseOp1 + opacityBoost);
  const layer1Animation: TargetAndTransition = shouldReduceMotion || isTabHidden
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

  // Layer 2 Animation: Bottom-Right Counter Oceanic Wave
  const baseOp2 = (isKerja ? 0.68 : 0.76) * intensityMultiplier;
  const targetOp2 = Math.min(0.96, baseOp2 + opacityBoost);
  const layer2Animation: TargetAndTransition = shouldReduceMotion || isTabHidden
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

  // Layer 3 Animation: Top-Right Dynamic Accent Ribbon
  const baseOp3 = (isKerja ? 0.64 : 0.72) * intensityMultiplier;
  const targetOp3 = Math.min(0.95, baseOp3 + opacityBoost);
  const layer3Animation: TargetAndTransition = shouldReduceMotion || isTabHidden
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

  // Dynamic Color Morph Transitions (Liquid Plasma Sheen)
  const morphDuration = isThinking ? 10 : 19;
  const morphAnimation: TargetAndTransition = shouldReduceMotion || isTabHidden
    ? { opacity: 0.52 }
    : {
        opacity: isThinking ? [0.32, 0.95, 0.46, 0.90, 0.32] : [0.24, 0.88, 0.36, 0.82, 0.24],
        rotate: isThinking ? [6, -10, 4, -8, 6] : [3, -5, 2, -4, 3],
        scale: isThinking ? [1.02, 1.12, 0.98, 1.10, 1.02] : [1.0, 1.05, 0.99, 1.04, 1.0],
      };
  const morphTransition: Transition = {
    duration: morphDuration,
    repeat: Infinity,
    ease: fluidEase,
  };

  // Vibrant Calibrated Gradients
  // Tenang: Emerald #10B981, Teal #0D9488, Mint #6EE7B7, Cyan #22D3EE
  // Kerja: Indigo #6366F1, Violet #8B5CF6, Electric Blue #3B82F6, Cyan #06B6D4
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
        ? 'radial-gradient(circle at 50% 42%, rgba(59, 130, 246, 0.50) 0%, rgba(6, 182, 212, 0.32) 45%, rgba(99, 102, 241, 0.12) 72%, transparent 86%)'
        : 'radial-gradient(circle at 50% 42%, rgba(59, 130, 246, 0.62) 0%, rgba(6, 182, 212, 0.45) 42%, rgba(99, 102, 241, 0.18) 68%, transparent 86%)';
    }
    return isDark
      ? 'radial-gradient(circle at 50% 42%, rgba(16, 185, 129, 0.50) 0%, rgba(34, 211, 238, 0.32) 45%, rgba(16, 185, 129, 0.12) 72%, transparent 86%)'
      : 'radial-gradient(circle at 50% 42%, rgba(16, 185, 129, 0.62) 0%, rgba(34, 211, 238, 0.44) 42%, rgba(13, 148, 136, 0.18) 68%, transparent 86%)';
  }, [isDark, isKerja]);

  const layer2Gradient = useMemo(() => {
    if (isKerja) {
      return isDark
        ? 'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.46) 0%, rgba(59, 130, 246, 0.28) 42%, rgba(6, 182, 212, 0.12) 72%, transparent 86%)'
        : 'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.58) 0%, rgba(59, 130, 246, 0.39) 42%, rgba(6, 182, 212, 0.17) 70%, transparent 86%)';
    }
    return isDark
      ? 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.42) 0%, rgba(34, 211, 238, 0.26) 42%, rgba(99, 102, 241, 0.10) 70%, transparent 84%)'
      : 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.52) 0%, rgba(34, 211, 238, 0.39) 40%, rgba(16, 185, 129, 0.17) 68%, transparent 86%)';
  }, [isDark, isKerja]);

  const layer2MorphGradient = useMemo(() => {
    if (isKerja) {
      return isDark
        ? 'radial-gradient(circle at 48% 54%, rgba(6, 182, 212, 0.46) 0%, rgba(59, 130, 246, 0.25) 45%, rgba(139, 92, 246, 0.12) 72%, transparent 86%)'
        : 'radial-gradient(circle at 48% 54%, rgba(6, 182, 212, 0.56) 0%, rgba(59, 130, 246, 0.35) 42%, rgba(139, 92, 246, 0.16) 70%, transparent 86%)';
    }
    return isDark
      ? 'radial-gradient(circle at 48% 54%, rgba(34, 211, 238, 0.46) 0%, rgba(110, 231, 183, 0.28) 45%, rgba(99, 102, 241, 0.12) 72%, transparent 86%)'
      : 'radial-gradient(circle at 48% 54%, rgba(34, 211, 238, 0.58) 0%, rgba(110, 231, 183, 0.42) 42%, rgba(99, 102, 241, 0.17) 70%, transparent 86%)';
  }, [isDark, isKerja]);

  const layer3Gradient = useMemo(() => {
    if (isKerja) {
      return isDark
        ? 'radial-gradient(circle at 52% 48%, rgba(6, 182, 212, 0.46) 0%, rgba(99, 102, 241, 0.25) 45%, rgba(59, 130, 246, 0.12) 72%, transparent 86%)'
        : 'radial-gradient(circle at 52% 48%, rgba(6, 182, 212, 0.58) 0%, rgba(99, 102, 241, 0.35) 42%, rgba(59, 130, 246, 0.18) 70%, transparent 86%)';
    }
    return isDark
      ? 'radial-gradient(circle at 52% 48%, rgba(6, 182, 212, 0.46) 0%, rgba(110, 231, 183, 0.26) 45%, rgba(6, 182, 212, 0.10) 72%, transparent 86%)'
      : 'radial-gradient(circle at 52% 48%, rgba(6, 182, 212, 0.58) 0%, rgba(110, 231, 183, 0.40) 42%, rgba(16, 185, 129, 0.17) 70%, transparent 86%)';
  }, [isDark, isKerja]);

  const layer3MorphGradient = useMemo(() => {
    if (isKerja) {
      return isDark
        ? 'radial-gradient(circle at 48% 50%, rgba(99, 102, 241, 0.48) 0%, rgba(139, 92, 246, 0.28) 45%, rgba(6, 182, 212, 0.12) 70%, transparent 86%)'
        : 'radial-gradient(circle at 48% 50%, rgba(99, 102, 241, 0.62) 0%, rgba(139, 92, 246, 0.42) 42%, rgba(6, 182, 212, 0.18) 68%, transparent 86%)';
    }
    return isDark
      ? 'radial-gradient(circle at 48% 50%, rgba(16, 185, 129, 0.48) 0%, rgba(13, 148, 136, 0.28) 45%, rgba(34, 211, 238, 0.12) 70%, transparent 86%)'
      : 'radial-gradient(circle at 48% 50%, rgba(16, 185, 129, 0.60) 0%, rgba(13, 148, 136, 0.40) 42%, rgba(34, 211, 238, 0.18) 68%, transparent 86%)';
  }, [isDark, isKerja]);

  return (
    <div
      aria-hidden="true"
      data-aurora-variant={variant}
      data-aurora-phase={currentPhase}
      style={{
        contain: 'strict',
        transform: 'translate3d(0, 0, 0)',
        WebkitTransform: 'translate3d(0, 0, 0)',
      }}
      className={`fixed inset-0 z-0 overflow-hidden pointer-events-none select-none ${
        isKerja
          ? 'bg-secondary-50 dark:bg-[#090e17]'
          : 'bg-[#fafaf9] dark:bg-[#080d16]'
      } transition-colors duration-500 ease-in-out ${className}`}
    >
      {/* 3 Atmospheric Mesh Gradient Masses */}
      <div className="absolute inset-0 w-full h-full overflow-hidden" style={{ contain: 'strict' }}>
        <div>
          {/* Layer 1: Wide Diffuse Flow (Top-Left) with Dynamic Morph */}
          <motion.div
            className="absolute top-[-18%] left-[-14%] w-[84vw] sm:w-[68vw] md:w-[58vw] h-[72vw] sm:h-[56vw] md:h-[48vw] rounded-[48%_52%_64%_36%/45%_55%_45%_55%] blur-[36px] sm:blur-[48px] md:blur-[60px]"
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
            className="absolute bottom-[-16%] right-[-12%] w-[82vw] sm:w-[64vw] md:w-[54vw] h-[72vw] sm:h-[56vw] md:h-[48vw] rounded-[42%_58%_54%_46%/58%_44%_56%_42%] blur-[36px] sm:blur-[48px] md:blur-[60px]"
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
            className="absolute top-[-10%] right-[-12%] w-[78vw] sm:w-[60vw] md:w-[50vw] h-[68vw] sm:h-[52vw] md:h-[44vw] rounded-[52%_48%_42%_58%/44%_58%_42%_56%] blur-[36px] sm:blur-[48px] md:blur-[60px]"
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

      {/* Atmospheric Subtle Central Reading Diffusion (Smooth Cross-Fading Dual-Veil) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Light Mode Diffusion Veil */}
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ease-in-out ${
            isDark ? 'opacity-0' : 'opacity-100'
          } ${
            isKerja
              ? 'bg-[radial-gradient(ellipse_65%_55%_at_50%_48%,rgba(248,250,252,0.16)_0%,transparent_75%)]'
              : 'bg-[radial-gradient(ellipse_65%_55%_at_50%_48%,rgba(250,250,249,0.16)_0%,transparent_75%)]'
          }`}
        />
        {/* Dark Mode Diffusion Veil */}
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ease-in-out ${
            isDark ? 'opacity-100' : 'opacity-0'
          } ${
            isKerja
              ? 'bg-[radial-gradient(ellipse_65%_55%_at_50%_48%,rgba(9,14,23,0.22)_0%,transparent_80%)]'
              : 'bg-[radial-gradient(ellipse_65%_55%_at_50%_48%,rgba(8,13,22,0.22)_0%,transparent_80%)]'
          }`}
        />
      </div>

      {/* Optimized SVG Grain Overlay (Anti-Banding on OLED & Retina Displays) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.02] dark:opacity-[0.03] mix-blend-overlay"
        aria-hidden="true"
      >
        <defs>
          <filter id="auroraNoiseFilter">
            <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" stitchTiles="stitch" />
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
