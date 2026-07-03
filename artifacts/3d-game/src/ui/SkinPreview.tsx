import { useEffect, useRef } from 'react';
import { CONFIG } from '../game/config';
import { drawVoidling } from '../game/voidling';

// A small self-animating canvas that renders a voidling wearing a given skin.
// Reuses the exact in-game renderer so shop previews match gameplay.
export function SkinPreview({ skinId, size, glow = 0.5 }: { skinId: string; size: number; glow?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.floor(size * dpr);
    canvas.height = Math.floor(size * dpr);

    const skin = CONFIG.SKINS.find((s) => s.id === skinId) || CONFIG.SKINS[0];
    const start = performance.now();
    let last = start;
    let acc = 0;
    let raf = 0;
    let blinkTimer = 1500 + Math.random() * 2000;
    let blinkVal = 0;
    let lookX = 0, lookY = 0, targetLX = 0, targetLY = 0, lookTimer = 0;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(50, now - last);
      last = now;
      acc += dt;
      if (acc < 33) return; // throttle to ~30fps (idle animation)
      acc = 0;
      const t = now - start;

      blinkTimer -= dt;
      if (blinkTimer <= 0) {
        blinkVal = Math.min(1, blinkVal + dt / 60);
        if (blinkVal >= 1) blinkTimer = 2200 + Math.random() * 2200;
      } else if (blinkVal > 0) {
        blinkVal = Math.max(0, blinkVal - dt / 60);
      }
      lookTimer -= dt;
      if (lookTimer <= 0) {
        targetLX = (Math.random() * 2 - 1) * 0.7;
        targetLY = (Math.random() * 2 - 1) * 0.5;
        lookTimer = 900 + Math.random() * 1300;
      }
      lookX += (targetLX - lookX) * 0.08;
      lookY += (targetLY - lookY) * 0.08;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      const r = size * 0.3;
      const bob = Math.sin(t / 680) * size * 0.02;
      drawVoidling(ctx, size / 2, size / 2 + bob, {
        r,
        skin,
        t,
        lookX,
        lookY,
        open: 0,
        chomp: 0,
        blink: blinkVal,
        wobbleX: 1 + Math.sin(t / 520) * 0.02,
        wobbleY: 1 - Math.sin(t / 520) * 0.02,
        lean: Math.sin(t / 1300) * 0.05,
        glow,
        breathe: 1 + Math.sin(t / 900) * 0.02,
      });
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [skinId, size, glow]);

  return <canvas ref={ref} style={{ width: size, height: size }} />;
}
