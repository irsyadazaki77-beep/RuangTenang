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

  // Siklus durasi lambat & tenang (18s - 25s)
  const duration1 = activeStreaming ? 18 * 0.8 : 20; // 16s vs 20s
  const duration2 = activeStreaming ? 22 * 0.8 : 24; // 17.6s vs 24s
  const duration3 = activeStreaming ? 25 * 0.8 : 25; // 20s vs 25s

  // GPU Hardware Layer Style
  const hardwareLayerStyle: React.CSSProperties = {
    transformOrigin: 'center center',
    willChange: 'transform, opacity',
    backfaceVisibility: 'hidden',
    transform: 'translate3d(0, 0, 0)',
    WebkitTransform: 'translate3d(0, 0, 0)',
  };

  // Mesh 1: Soft Sanctuary Teal/Emerald (Top Left)
  const layer1Animation: TargetAndTransition = shouldReduceMotion
    ? { opacity: activeStreaming ? 0.7 : 0.55 }
    : {
        x: ['-4%', '8%', '-6%', '-4%'],
        y: ['-6%', '8%', '-3%', '-6%'],
        scale: activeStreaming ? [1.02, 1.12, 1.04, 1.02] : [1, 1.06, 0.98, 1],
        opacity: activeStreaming ? [0.72, 0.85, 0.74, 0.72] : [0.55, 0.65, 0.52, 0.55],
      };

  const layer1Transition: Transition = {
    duration: duration1,
    repeat: Infinity,
    ease: organicEase,
  };

  // Mesh 2: Electric Indigo / Serenity Slate (Bottom Right)
  const layer2Animation: TargetAndTransition = shouldReduceMotion
    ? { opacity: activeStreaming ? 0.65 : 0.5 }
    : {
        x: ['6%', '-8%', '5%', '6%'],
        y: ['6%', '-8%', '4%', '6%'],
        scale: activeStreaming ? [1.04, 1.14, 0.98, 1.04] : [1, 1.08, 0.96, 1],
        opacity: activeStreaming ? [0.68, 0.8, 0.64, 0.68] : [0.5, 0.6, 0.46, 0.5],
      };

  const layer2Transition: Transition = {
    duration: duration2,
    repeat: Infinity,
    ease: organicEase,
  };

  // Mesh 3: Soft Cyan & Mint Ambient (Top Right / Center)
  const layer3Animation: TargetAndTransition = shouldReduceMotion
    ? { opacity: activeStreaming ? 0.6 : 0.45 }
    : {
        x: ['5%', '-6%', '4%', '5%'],
        y: ['-5%', '6%', '-4%', '-5%'],
        scale: activeStreaming ? [1, 1.1, 1.02, 1] : [0.96, 1.05, 0.96, 0.96],
        opacity: activeStreaming ? [0.62, 0.75, 0.58, 0.62] : [0.45, 0.55, 0.42, 0.45],
      };

  const layer3Transition: Transition = {
    duration: duration3,
    repeat: Infinity,
    ease: organicEase,
  };

  return (
    <div
      aria-hidden="true"
      style={{
        contain: 'strict',
        transform: 'translate3d(0, 0, 0)',
        WebkitTransform: 'translate3d(0, 0, 0)',
      }}
      className={`fixed inset-0 z-0 overflow-hidden pointer-events-none select-none bg-[#fafaf9] dark:bg-[#080d16] transition-colors duration-700 ${className}`}
    >
      {/* 3 GPU-Accelerated Mesh Gradient Ellipses */}
      <div className="absolute inset-0 w-full h-full overflow-hidden" style={{ contain: 'strict' }}>
        {/* Layer 1: Emerald / Teal Sanctuary (#0d9488 / #10b981) */}
        <motion.div
          className="absolute -top-[20%] -left-[15%] w-[80vw] sm:w-[50vw] h-[80vw] sm:h-[50vw] rounded-full blur-[32px] sm:blur-[48px] md:blur-[56px]"
          style={{
            ...hardwareLayerStyle,
            background: 'radial-gradient(circle at center, rgba(13, 148, 136, 0.30) 0%, rgba(16, 185, 129, 0.16) 50%, rgba(13, 148, 136, 0.04) 70%, transparent 80%)',
          }}
          animate={layer1Animation}
          transition={layer1Transition}
        />

        {/* Layer 2: Electric Indigo & Minimalist Slate (#6366f1) */}
        <motion.div
          className="absolute -bottom-[15%] -right-[10%] w-[75vw] sm:w-[46vw] h-[75vw] sm:h-[46vw] rounded-full blur-[32px] sm:blur-[48px] md:blur-[56px]"
          style={{
            ...hardwareLayerStyle,
            background: 'radial-gradient(circle at center, rgba(99, 102, 241, 0.20) 0%, rgba(129, 140, 248, 0.12) 45%, rgba(99, 102, 241, 0.03) 70%, transparent 75%)',
          }}
          animate={layer2Animation}
          transition={layer2Transition}
        />

        {/* Layer 3: Luminous Cyan & Mint Wave (#06b6d4 / #38bdf8) */}
        <motion.div
          className="absolute -top-[10%] -right-[12%] w-[70vw] sm:w-[44vw] h-[70vw] sm:h-[44vw] rounded-full blur-[32px] sm:blur-[48px] md:blur-[56px]"
          style={{
            ...hardwareLayerStyle,
            background: 'radial-gradient(circle at center, rgba(6, 182, 212, 0.22) 0%, rgba(56, 189, 248, 0.10) 50%, rgba(6, 182, 212, 0.03) 70%, transparent 80%)',
          }}
          animate={layer3Animation}
          transition={layer3Transition}
        />
      </div>

      {/* Subtle Central Ambient Glow */}
      <div 
        className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_transparent_35%,_rgba(250,250,249,0.5)_85%)] dark:bg-[radial-gradient(ellipse_at_center,_transparent_35%,_rgba(8,13,22,0.65)_90%)] transition-colors duration-700" 
      />

      {children}
    </div>
  );
});

AuroraBackground.displayName = 'AuroraBackground';

export default AuroraBackground;
