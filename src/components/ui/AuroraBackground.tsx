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
   * - 'tenang': Emerald, Teal, Mint, Cyan, Indigo (calming, sanctuary, atmospheric).
   * - 'kerja': Indigo, Violet, Electric Blue, Cyan, Emerald accent (intelligent, futuristic, focused).
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
 * AuroraBackground - Unified Aurora Experience 2.0 (Gemini-Inspired Ambient Mesh)
 * 
 * Engine terpadu dengan 2 identitas visual (Ruang Tenang & Ruang Kerja),
 * reaktif terhadap siklus hidup AI nyata (idle -> preparing -> thinking -> streaming -> finishing -> idle).
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

  const activeRequestIdRef = useRef<string | null>(null);
  const finishingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Monitor visibility tab untuk menghemat 100% daya GPU saat tab tidak aktif
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabHidden(document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Tangani prop isStreaming legacy jika propPhase tidak didefinisikan secara langsung
  useEffect(() => {
    if (propPhase !== undefined) return;
    if (propIsStreaming !== undefined) {
      if (propIsStreaming) {
        if (finishingTimerRef.current) clearTimeout(finishingTimerRef.current);
        setInternalPhase('streaming');
      } else {
        setInternalPhase(prev => {
          if (prev === 'streaming' || prev === 'thinking' || prev === 'preparing') {
            if (finishingTimerRef.current) clearTimeout(finishingTimerRef.current);
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
      if (finishingTimerRef.current) {
        clearTimeout(finishingTimerRef.current);
        finishingTimerRef.current = null;
      }
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
        errorTimerRef.current = null;
      }

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
        if (customEvent.detail.isStreaming) {
          if (finishingTimerRef.current) clearTimeout(finishingTimerRef.current);
          setInternalPhase('streaming');
        } else {
          setInternalPhase(prev => {
            if (prev === 'streaming' || prev === 'thinking' || prev === 'preparing') {
              if (finishingTimerRef.current) clearTimeout(finishingTimerRef.current);
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
      if (finishingTimerRef.current) clearTimeout(finishingTimerRef.current);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, [variant]);

  // Phase prioritas: propPhase > internalPhase
  const currentPhase: AuroraPhase = propPhase ?? internalPhase;

  // Intensitas multiplier
  const intensityMultiplier = useMemo(() => {
    switch (intensity) {
      case 'subtle': return 0.75;
      case 'vivid': return 1.25;
      case 'normal':
      default: return 1.0;
    }
  }, [intensity]);

  // Easing organik Gemini
  const organicEase: [number, number, number, number] = [0.4, 0, 0.2, 1];

  // Hitung durasi dan ritme pergerakan berdasarkan phase
  const isThinking = currentPhase === 'thinking';
  const isStreaming = currentPhase === 'streaming';
  const isPreparing = currentPhase === 'preparing';
  const isFinishing = currentPhase === 'finishing';
  const isError = currentPhase === 'error';

  const durationScale = isThinking
    ? 0.65 // Lebih cepat & hidup saat berpikir
    : isStreaming
    ? 0.75 // Dinamis & stabil saat streaming
    : isPreparing
    ? 0.85
    : isFinishing
    ? 1.15 // Perlambatan lembut (exhale)
    : 1.0;  // Siklus idle tenang

  const duration1 = 20 * durationScale;
  const duration2 = 24 * durationScale;
  const duration3 = 22 * durationScale;

  // Hardware Layer Style
  const hardwareLayerStyle: React.CSSProperties = {
    transformOrigin: 'center center',
    willChange: shouldReduceMotion || isTabHidden ? 'auto' : 'transform, opacity',
    backfaceVisibility: 'hidden',
    transform: 'translate3d(0, 0, 0)',
    WebkitTransform: 'translate3d(0, 0, 0)',
  };

  // Palet & Lapisan Visual Berdasarkan Variant
  const isKerja = variant === 'kerja';

  // Opacity boost berdasarkan phase
  const opacityBoost = isThinking
    ? 0.22
    : isStreaming
    ? 0.16
    : isPreparing
    ? 0.08
    : isFinishing
    ? 0.06
    : isError
    ? 0.04
    : 0;

  // Layer 1 Animation
  const baseOp1 = (isKerja ? 0.48 : 0.52) * intensityMultiplier;
  const targetOp1 = Math.min(0.92, baseOp1 + opacityBoost);
  const layer1Animation: TargetAndTransition = shouldReduceMotion || isTabHidden
    ? { opacity: targetOp1 }
    : {
        x: isThinking
          ? ['-6%', '10%', '-8%', '-6%']
          : isStreaming
          ? ['-5%', '7%', '-4%', '-5%']
          : ['-3%', '6%', '-5%', '-3%'],
        y: isThinking
          ? ['-8%', '10%', '-4%', '-8%']
          : isStreaming
          ? ['-5%', '6%', '-3%', '-5%']
          : ['-4%', '5%', '-2%', '-4%'],
        scale: isThinking
          ? [1.02, 1.15, 1.05, 1.02]
          : isStreaming
          ? [1.01, 1.09, 1.02, 1.01]
          : [0.98, 1.04, 0.98, 0.98],
        opacity: [baseOp1, targetOp1, baseOp1 * 0.95, baseOp1],
      };

  const layer1Transition: Transition = {
    duration: duration1,
    repeat: Infinity,
    ease: organicEase,
  };

  // Layer 2 Animation
  const baseOp2 = (isKerja ? 0.46 : 0.45) * intensityMultiplier;
  const targetOp2 = Math.min(0.88, baseOp2 + opacityBoost);
  const layer2Animation: TargetAndTransition = shouldReduceMotion || isTabHidden
    ? { opacity: targetOp2 }
    : {
        x: isThinking
          ? ['8%', '-10%', '7%', '8%']
          : isStreaming
          ? ['6%', '-7%', '5%', '6%']
          : ['4%', '-5%', '4%', '4%'],
        y: isThinking
          ? ['8%', '-10%', '6%', '8%']
          : isStreaming
          ? ['5%', '-7%', '4%', '5%']
          : ['3%', '-5%', '3%', '3%'],
        scale: isThinking
          ? [1.04, 1.18, 1.02, 1.04]
          : isStreaming
          ? [1.02, 1.10, 0.99, 1.02]
          : [0.97, 1.05, 0.96, 0.97],
        opacity: [baseOp2, targetOp2, baseOp2 * 0.92, baseOp2],
      };

  const layer2Transition: Transition = {
    duration: duration2,
    repeat: Infinity,
    ease: organicEase,
  };

  // Layer 3 Animation
  const baseOp3 = (isKerja ? 0.44 : 0.42) * intensityMultiplier;
  const targetOp3 = Math.min(0.85, baseOp3 + opacityBoost);
  const layer3Animation: TargetAndTransition = shouldReduceMotion || isTabHidden
    ? { opacity: targetOp3 }
    : {
        x: isThinking
          ? ['-8%', '8%', '-6%', '-8%']
          : isStreaming
          ? ['-5%', '6%', '-4%', '-5%']
          : ['-3%', '4%', '-3%', '-3%'],
        y: isThinking
          ? ['6%', '-8%', '5%', '6%']
          : isStreaming
          ? ['4%', '-6%', '3%', '4%']
          : ['2%', '-4%', '2%', '2%'],
        scale: isThinking
          ? [0.98, 1.14, 1.04, 0.98]
          : isStreaming
          ? [0.98, 1.08, 1.01, 0.98]
          : [0.96, 1.03, 0.96, 0.96],
        opacity: [baseOp3, targetOp3, baseOp3 * 0.9, baseOp3],
      };

  const layer3Transition: Transition = {
    duration: duration3,
    repeat: Infinity,
    ease: organicEase,
  };

  // Gradient Gradients Definition
  // Tenang: Emerald #10B981, Teal #0D9488, Mint #6EE7B7, Cyan #22D3EE, Indigo #6366F1
  // Kerja: Indigo #6366F1, Violet #8B5CF6, Electric Blue #3B82F6, Cyan #06B6D4, Emerald #10B981
  const layer1Gradient = isKerja
    ? 'radial-gradient(circle at 45% 45%, rgba(99, 102, 241, 0.32) 0%, rgba(139, 92, 246, 0.18) 45%, rgba(59, 130, 246, 0.06) 70%, transparent 85%)'
    : 'radial-gradient(circle at 45% 45%, rgba(13, 148, 136, 0.34) 0%, rgba(16, 185, 129, 0.20) 45%, rgba(13, 148, 136, 0.05) 70%, transparent 85%)';

  const layer2Gradient = isKerja
    ? 'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.26) 0%, rgba(59, 130, 246, 0.16) 45%, rgba(6, 182, 212, 0.05) 72%, transparent 85%)'
    : 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.22) 0%, rgba(129, 140, 248, 0.14) 45%, rgba(99, 102, 241, 0.04) 70%, transparent 80%)';

  const layer3Gradient = isKerja
    ? 'radial-gradient(circle at 55% 55%, rgba(6, 182, 212, 0.26) 0%, rgba(16, 185, 129, 0.12) 48%, rgba(59, 130, 246, 0.04) 75%, transparent 85%)'
    : 'radial-gradient(circle at 55% 55%, rgba(6, 182, 212, 0.25) 0%, rgba(110, 231, 183, 0.14) 48%, rgba(6, 182, 212, 0.04) 70%, transparent 85%)';

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
          ? 'bg-[#f8fafc] dark:bg-[#090e17]'
          : 'bg-[#fafaf9] dark:bg-[#080d16]'
      } transition-colors duration-1000 ${className}`}
    >
      {/* 3 Atmospheric Mesh Gradient Masses */}
      <div className="absolute inset-0 w-full h-full overflow-hidden" style={{ contain: 'strict' }}>
        <div>
          {/* Layer 1: Wide Diffuse Flow (Top-Left) */}
          <motion.div
            className="absolute -top-[22%] -left-[18%] w-[88vw] sm:w-[56vw] h-[88vw] sm:h-[56vw] rounded-full blur-[32px] sm:blur-[48px] md:blur-[60px]"
            style={{
              ...hardwareLayerStyle,
              background: layer1Gradient,
            }}
            animate={layer1Animation}
            transition={layer1Transition}
          />

          {/* Layer 2: Flowing Complementary Wave (Bottom-Right) */}
          <motion.div
            className="absolute -bottom-[18%] -right-[14%] w-[82vw] sm:w-[52vw] h-[82vw] sm:h-[52vw] rounded-full blur-[32px] sm:blur-[48px] md:blur-[60px]"
            style={{
              ...hardwareLayerStyle,
              background: layer2Gradient,
            }}
            animate={layer2Animation}
            transition={layer2Transition}
          />

          {/* Layer 3: Reactive Accent Light (Top-Right / Center-Right) */}
          <motion.div
            className="absolute -top-[12%] -right-[15%] w-[76vw] sm:w-[48vw] h-[76vw] sm:h-[48vw] rounded-full blur-[32px] sm:blur-[48px] md:blur-[60px]"
            style={{
              ...hardwareLayerStyle,
              background: layer3Gradient,
            }}
            animate={layer3Animation}
            transition={layer3Transition}
          />
        </div>
      </div>

      {/* Atmospheric Central Veil & Vignette: Content Reading Clarity */}
      <div 
        className={`absolute inset-0 pointer-events-none transition-colors duration-1000 ${
          isKerja
            ? 'bg-[radial-gradient(ellipse_at_center,_transparent_30%,_rgba(248,250,252,0.6)_85%)] dark:bg-[radial-gradient(ellipse_at_center,_transparent_30%,_rgba(9,14,23,0.72)_90%)]'
            : 'bg-[radial-gradient(ellipse_at_center,_transparent_35%,_rgba(250,250,249,0.55)_85%)] dark:bg-[radial-gradient(ellipse_at_center,_transparent_35%,_rgba(8,13,22,0.68)_90%)]'
        }`}
      />

      {/* Real SVG Grain Overlay (Anti-Banding on OLED & Retina Displays) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.025] dark:opacity-[0.035] mix-blend-overlay"
        aria-hidden="true"
      >
        <defs>
          <filter id="noiseFilter">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <filter id="auroraNoiseFilter">
            <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" stitchTiles="stitch" />
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
