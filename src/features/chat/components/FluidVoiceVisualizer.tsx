import React, { useEffect, useRef } from 'react';

export type FluidVisualizerState = 'listening' | 'speaking' | 'processing' | 'idle' | 'muted';

interface FluidVoiceVisualizerProps {
  userVolume?: number; // 0.0 to 1.0
  aiVolume?: number;   // 0.0 to 1.0
  state?: FluidVisualizerState;
  persona?: 'default' | 'examiner_methodology' | 'examiner_theory' | 'empathetic_counselor';
  size?: number; // width/height in px
  className?: string;
}

export const FluidVoiceVisualizer: React.FC<FluidVoiceVisualizerProps> = ({
  userVolume = 0,
  aiVolume = 0,
  state = 'idle',
  persona = 'empathetic_counselor',
  size = 280,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Smooth interpolation values
  const smoothVolRef = useRef(0);
  const animTimeRef = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;
  const userVolRef = useRef(userVolume);
  userVolRef.current = userVolume;
  const aiVolRef = useRef(aiVolume);
  aiVolRef.current = aiVolume;
  const personaRef = useRef(persona);
  personaRef.current = persona;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    const render = () => {
      animTimeRef.current += 0.025;
      const t = animTimeRef.current;
      const currentState = stateRef.current;
      const currentPersona = personaRef.current;

      // Target volume depends on state
      let targetVol: number;
      if (currentState === 'speaking') {
        targetVol = Math.max(0.25, aiVolRef.current);
      } else if (currentState === 'listening') {
        targetVol = Math.max(0.08, userVolRef.current);
      } else if (currentState === 'processing') {
        targetVol = 0.35 + 0.15 * Math.sin(t * 3.5);
      } else {
        targetVol = 0.05;
      }

      // Smooth volume interpolation (low-pass filter)
      smoothVolRef.current += (targetVol - smoothVolRef.current) * 0.12;
      const vol = smoothVolRef.current;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;
      const baseRadius = size * 0.24;

      // Define color themes based on persona & state
      let color1 = 'rgba(20, 184, 166, '; // teal
      let color2 = 'rgba(16, 185, 129, '; // emerald
      let color3 = 'rgba(99, 102, 241, '; // indigo

      if (currentState === 'muted') {
        color1 = 'rgba(100, 116, 139, '; // slate
        color2 = 'rgba(71, 85, 105, ';
        color3 = 'rgba(51, 65, 85, ';
      } else if (currentState === 'processing') {
        color1 = 'rgba(6, 182, 212, '; // cyan
        color2 = 'rgba(59, 130, 246, '; // blue
        color3 = 'rgba(147, 51, 234, '; // purple
      } else if (currentPersona === 'examiner_methodology' || currentPersona === 'examiner_theory') {
        color1 = 'rgba(99, 102, 241, '; // indigo
        color2 = 'rgba(59, 130, 246, '; // sky
        color3 = 'rgba(168, 85, 247, '; // purple
      }

      // 1. Draw outer ambient radiant haze
      const hazeRadius = baseRadius * (1.6 + vol * 0.8);
      const hazeGrad = ctx.createRadialGradient(cx, cy, baseRadius * 0.4, cx, cy, hazeRadius);
      hazeGrad.addColorStop(0, color1 + (currentState === 'muted' ? '0.15)' : '0.25)'));
      hazeGrad.addColorStop(0.6, color2 + (currentState === 'muted' ? '0.06)' : '0.12)'));
      hazeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = hazeGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, hazeRadius, 0, Math.PI * 2);
      ctx.fill();

      // 2. Draw organic morphing fluid spline layers
      const drawFluidLayer = (
        layerRadius: number,
        harmonicCount: number,
        speedMultiplier: number,
        alpha: number,
        rotOffset: number
      ) => {
        ctx.beginPath();
        const steps = 72;
        const angleStep = (Math.PI * 2) / steps;

        for (let i = 0; i <= steps; i++) {
          const theta = i * angleStep;
          const noise1 = Math.sin(theta * harmonicCount + t * speedMultiplier + rotOffset);
          const noise2 = Math.cos(theta * 2.5 - t * speedMultiplier * 0.7);
          const r = layerRadius + (noise1 * 14 + noise2 * 8) * (0.6 + vol * 2.2);

          const px = cx + Math.cos(theta) * r;
          const py = cy + Math.sin(theta) * r;

          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.closePath();

        const grad = ctx.createRadialGradient(cx, cy, layerRadius * 0.2, cx, cy, layerRadius * 1.3);
        grad.addColorStop(0, color2 + `${alpha * 0.9})`);
        grad.addColorStop(0.7, color1 + `${alpha * 0.5})`);
        grad.addColorStop(1, color3 + '0.0)');

        ctx.fillStyle = grad;
        ctx.fill();
      };

      // Draw 3 layered organic harmonic skins
      drawFluidLayer(baseRadius * 1.15, 3, 1.2, 0.4, 0);
      drawFluidLayer(baseRadius * 0.98, 4, 1.8, 0.65, Math.PI / 4);
      drawFluidLayer(baseRadius * 0.82, 5, 2.4, 0.85, Math.PI / 2);

      // 3. Central Core sphere with luminous sheen
      const coreRadius = baseRadius * (0.55 + vol * 0.2);
      const coreGrad = ctx.createRadialGradient(
        cx - coreRadius * 0.25,
        cy - coreRadius * 0.25,
        coreRadius * 0.1,
        cx,
        cy,
        coreRadius
      );
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.35, color2 + '0.9)');
      coreGrad.addColorStop(0.85, color1 + '0.95)');
      coreGrad.addColorStop(1, color3 + '1.0)');

      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.shadowColor = color2 + '0.8)';
      ctx.shadowBlur = 24 * (1 + vol * 1.5);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 4. Orbiting sparkle particles when processing or speaking
      if (currentState === 'processing' || currentState === 'speaking') {
        const particleCount = 6;
        for (let p = 0; p < particleCount; p++) {
          const pAngle = t * 1.5 + (p * (Math.PI * 2)) / particleCount;
          const pDist = baseRadius * 1.35 + Math.sin(t * 3 + p) * 12;
          const px = cx + Math.cos(pAngle) * pDist;
          const py = cy + Math.sin(pAngle) * pDist;

          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#5eead4';
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [size]);

  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="pointer-events-none drop-shadow-2xl"
      />
    </div>
  );
};
