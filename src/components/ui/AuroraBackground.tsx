import React, { memo, useState, useEffect } from 'react';
import { motion, useReducedMotion, type TargetAndTransition, type Transition } from 'motion/react';

export interface AuroraBackgroundProps {
  /**
   * Status saat AI streaming teks, untuk efek pendaran yang lebih dinamis & reaktif.
   */
  isStreaming?: boolean;
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
 * AuroraBackground - Google Gemini "Sanctuary" Ambient Aurora Mesh
 * 
 * Karakteristik Arsitektur & Visual:
 * 1. Root canvas fixed inset-0 z-0 pointer-events-none select-none.
 * 2. Deep Midnight Base: #080d16 (Deep Midnight Obsidian) / #f8fafc (Light).
 * 3. 4 GPU-Accelerated Radial Mesh Gradients:
 *    - Pendaran 1 (Teal/Emerald): rgba(13, 148, 136, 0.38) & rgba(16, 185, 129, 0.22)
 *    - Pendaran 2 (Electric Cyan): rgba(6, 182, 212, 0.32)
 *    - Pendaran 3 (Gemini Indigo/Violet Magic touch): rgba(99, 102, 241, 0.24)
 *    - Pendaran 4 (Luminous Sky Mint): rgba(56, 189, 248, 0.18)
 * 4. Koordinat translate3d, will-change: transform, dan kurva asinkron organik cubic-bezier(0.4, 0, 0.2, 1) durasi 18s - 26s.
 * 5. Reaktivitas Streaming: percepat pergerakan aurora ~25% (durasi * 0.75) dan naikkan pendaran (opacity +15%), lalu transisi lembut kembali ke calm breathing.
 * 6. Optimasi Mobile: Pada layar mobile (@media max-width 768px), radius blur dibatasi maksimal blur(60px) untuk menjaga 60-120 FPS tanpa panas GPU.
 * 7. Layer noise SVG ultra-halus (opacity 0.02) untuk mencegah color banding pada monitor OLED & Retina.
 * 8. Mematuhi preferensi aksesibilitas prefers-reduced-motion.
 */
export const AuroraBackground: React.FC<AuroraBackgroundProps> = memo(({
  isStreaming: propIsStreaming = false,
  className = '',
  children,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [eventIsStreaming, setEventIsStreaming] = useState(false);

  // Dengarkan custom event rt-aurora-streaming agar komponen dapat bereaksi secara decoupled
  useEffect(() => {
    const handleStreamingEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ isStreaming: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.isStreaming === 'boolean') {
        setEventIsStreaming(customEvent.detail.isStreaming);
      }
    };

    window.addEventListener('rt-aurora-streaming', handleStreamingEvent);
    return () => window.removeEventListener('rt-aurora-streaming', handleStreamingEvent);
  }, []);

  const activeStreaming = propIsStreaming || eventIsStreaming;

  // Organik cubic-bezier easing [0.4, 0, 0.2, 1]
  const organicEase: [number, number, number, number] = [0.4, 0, 0.2, 1];

  // Siklus durasi asinkron (18s - 26s). Saat streaming aktif, pergerakan dipercepat ~25% (durasi * 0.75)
  const duration1 = activeStreaming ? 18 * 0.75 : 18; // 13.5s vs 18s
  const duration2 = activeStreaming ? 22 * 0.75 : 22; // 16.5s vs 22s
  const duration3 = activeStreaming ? 24 * 0.75 : 24; // 18.0s vs 24s
  const duration4 = activeStreaming ? 26 * 0.75 : 26; // 19.5s vs 26s

  // GPU Hardware Layer Style dengan 3D transform acceleration (zero CPU re-rasterization)
  const hardwareLayerStyle: React.CSSProperties = {
    transformOrigin: 'center center',
    willChange: 'transform, opacity',
    backfaceVisibility: 'hidden',
    transform: 'translate3d(0, 0, 0)',
    WebkitTransform: 'translate3d(0, 0, 0)',
  };

  // Trajectory 1: Pendaran 1 (Teal/Emerald) - Top-Left Mesh Flow
  const layer1Animation: TargetAndTransition = shouldReduceMotion
    ? { opacity: activeStreaming ? 0.85 : 0.7 }
    : {
        x: ['-6%', '14%', '-10%', '-6%'],
        y: ['-10%', '12%', '-4%', '-10%'],
        scale: activeStreaming ? [1.02, 1.25, 1.08, 1.02] : [1, 1.15, 0.95, 1],
        rotate: [0, 45, 90, 0],
        opacity: activeStreaming ? [0.85, 0.98, 0.88, 0.85] : [0.7, 0.82, 0.68, 0.7],
      };

  const layer1Transition: Transition = {
    duration: duration1,
    repeat: Infinity,
    ease: organicEase,
  };

  // Trajectory 2: Pendaran 2 (Electric Cyan) - Top-Right Mesh Wave
  const layer2Animation: TargetAndTransition = shouldReduceMotion
    ? { opacity: activeStreaming ? 0.8 : 0.65 }
    : {
        x: ['8%', '-12%', '8%', '8%'],
        y: ['-8%', '14%', '-10%', '-8%'],
        scale: activeStreaming ? [1.08, 0.95, 1.22, 1.08] : [1.02, 0.92, 1.12, 1.02],
        rotate: [0, -40, -85, 0],
        opacity: activeStreaming ? [0.8, 0.95, 0.78, 0.8] : [0.65, 0.78, 0.62, 0.65],
      };

  const layer2Transition: Transition = {
    duration: duration2,
    repeat: Infinity,
    ease: organicEase,
  };

  // Trajectory 3: Pendaran 3 (Gemini Indigo/Violet Magic touch) - Bottom-Right Mesh
  const layer3Animation: TargetAndTransition = shouldReduceMotion
    ? { opacity: activeStreaming ? 0.75 : 0.6 }
    : {
        x: ['12%', '-10%', '14%', '12%'],
        y: ['10%', '-12%', '8%', '10%'],
        scale: activeStreaming ? [1.08, 1.28, 0.98, 1.08] : [1, 1.18, 0.92, 1],
        rotate: [0, -55, -110, 0],
        opacity: activeStreaming ? [0.75, 0.9, 0.7, 0.75] : [0.6, 0.75, 0.55, 0.6],
      };

  const layer3Transition: Transition = {
    duration: duration3,
    repeat: Infinity,
    ease: organicEase,
  };

  // Trajectory 4: Pendaran 4 (Luminous Sky Mint) - Bottom-Left Mesh
  const layer4Animation: TargetAndTransition = shouldReduceMotion
    ? { opacity: activeStreaming ? 0.72 : 0.55 }
    : {
        x: ['-10%', '16%', '-14%', '-10%'],
        y: ['12%', '-10%', '15%', '12%'],
        scale: activeStreaming ? [1, 1.28, 1.05, 1] : [0.95, 1.15, 0.96, 0.95],
        rotate: [0, 65, 125, 0],
        opacity: activeStreaming ? [0.72, 0.88, 0.68, 0.72] : [0.55, 0.7, 0.5, 0.55],
      };

  const layer4Transition: Transition = {
    duration: duration4,
    repeat: Infinity,
    ease: organicEase,
  };

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-0 overflow-hidden pointer-events-none select-none bg-[#f8fafc] dark:bg-[#080d16] transition-colors duration-700 ${className}`}
    >
      {/* 4 Gemini Ambient Aurora GPU Radial Mesh Layers */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        
        {/* Layer 1: Pendaran 1 (Teal/Emerald) - rgba(13, 148, 136, 0.38) & rgba(16, 185, 129, 0.22) */}
        <motion.div
          className="absolute -top-[20%] -left-[15%] w-[85vw] sm:w-[55vw] h-[85vw] sm:h-[55vw] rounded-full blur-[42px] md:blur-[60px]"
          style={{
            ...hardwareLayerStyle,
            background: 'radial-gradient(circle at center, rgba(13, 148, 136, 0.38) 0%, rgba(16, 185, 129, 0.22) 48%, rgba(13, 148, 136, 0.08) 70%, transparent 80%)',
          }}
          animate={layer1Animation}
          transition={layer1Transition}
        />

        {/* Layer 2: Pendaran 2 (Electric Cyan) - rgba(6, 182, 212, 0.32) */}
        <motion.div
          className="absolute -top-[15%] -right-[15%] w-[80vw] sm:w-[50vw] h-[80vw] sm:h-[50vw] rounded-full blur-[42px] md:blur-[60px]"
          style={{
            ...hardwareLayerStyle,
            background: 'radial-gradient(circle at center, rgba(6, 182, 212, 0.32) 0%, rgba(6, 182, 212, 0.18) 50%, rgba(6, 182, 212, 0.06) 70%, transparent 80%)',
          }}
          animate={layer2Animation}
          transition={layer2Transition}
        />

        {/* Layer 3: Pendaran 3 (Gemini Indigo/Violet Magic touch) - rgba(99, 102, 241, 0.24) */}
        <motion.div
          className="absolute -bottom-[15%] -right-[10%] w-[75vw] sm:w-[48vw] h-[75vw] sm:h-[48vw] rounded-full blur-[42px] md:blur-[60px]"
          style={{
            ...hardwareLayerStyle,
            background: 'radial-gradient(circle at center, rgba(99, 102, 241, 0.24) 0%, rgba(129, 140, 248, 0.16) 45%, rgba(99, 102, 241, 0.05) 70%, transparent 75%)',
          }}
          animate={layer3Animation}
          transition={layer3Transition}
        />

        {/* Layer 4: Pendaran 4 (Luminous Sky Mint) - rgba(56, 189, 248, 0.18) & rgba(16, 185, 129, 0.15) */}
        <motion.div
          className="absolute -bottom-[20%] -left-[10%] w-[90vw] sm:w-[60vw] h-[90vw] sm:h-[60vw] rounded-full blur-[42px] md:blur-[60px]"
          style={{
            ...hardwareLayerStyle,
            background: 'radial-gradient(circle at center, rgba(56, 189, 248, 0.18) 0%, rgba(16, 185, 129, 0.15) 45%, rgba(56, 189, 248, 0.05) 68%, transparent 80%)',
          }}
          animate={layer4Animation}
          transition={layer4Transition}
        />
      </div>

      {/* Subtle Central Ambient Glow */}
      <div 
        className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_transparent_30%,_rgba(248,250,252,0.4)_85%)] dark:bg-[radial-gradient(ellipse_at_center,_transparent_30%,_rgba(8,13,22,0.65)_90%)] transition-colors duration-700" 
      />

      {/* Fine Noise Grain ultra-halus (opacity 0.02) untuk mencegah color banding pada monitor OLED & Retina */}
      <svg 
        className="absolute inset-0 w-full h-full opacity-[0.02] dark:opacity-[0.02] pointer-events-none mix-blend-overlay"
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="gemini-aurora-grain">
          <feTurbulence 
            type="fractalNoise" 
            baseFrequency="0.8" 
            numOctaves="3" 
            stitchTiles="stitch" 
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#gemini-aurora-grain)" />
      </svg>

      {children}
    </div>
  );
});

AuroraBackground.displayName = 'AuroraBackground';

export default AuroraBackground;
