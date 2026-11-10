import React, { useEffect, useRef } from 'react';

interface WaveformCanvasProps {
  id: string;
  width?: number;
  height?: number;
  className?: string;
  voiceActive: boolean;
}

export const WaveformCanvas: React.FC<WaveformCanvasProps> = ({
  id,
  width = 460,
  height = 48,
  className = '',
  voiceActive,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const voiceActiveRef = useRef(voiceActive);

  useEffect(() => {
    voiceActiveRef.current = voiceActive;
  }, [voiceActive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let tick = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mid = canvas.height / 2;
      const bars = Math.floor((canvas.width - 20) / 13);
      const mult = voiceActiveRef.current ? 2 : 1;

      for (let i = 0; i < bars; i++) {
        const amp = (Math.abs(Math.sin(tick + i * 0.4)) * 12 + 3) * mult;
        const clampedAmp = Math.min(mid - 2, amp);
        ctx.fillStyle = i % 2 === 0 ? '#FF5500' : '#16A34A';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(10 + i * 13, mid - clampedAmp, 5, clampedAmp * 2, 2.5);
        } else {
          ctx.rect(10 + i * 13, mid - clampedAmp, 5, clampedAmp * 2);
        }
        ctx.fill();
      }
      tick += 0.06;
      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      id={id}
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
    />
  );
};
