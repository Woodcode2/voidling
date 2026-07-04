import { useEffect, useRef, useState } from 'react';
import { CONFIG } from '../game/config';
import { audio } from '../game/audio';

// VOIDLING v5 §7 — URL-flag (?debug=1) live tuning overlay.
// Mutates CONFIG in place (the engine reads CONFIG every frame) + a COPY CONFIG
// button. No UI link anywhere; ships harmlessly in prod.

type Field = {
  key: keyof typeof CONFIG;
  label: string;
  min: number;
  max: number;
  step: number;
  apply?: (v: number) => void;
};

const FIELDS: Field[] = [
  { key: 'CAM_VIEW_BASE', label: 'cam view base', min: 400, max: 1100, step: 10 },
  { key: 'CAM_VIEW_GROWTH', label: 'cam view growth', min: 0, max: 30, step: 0.5 },
  { key: 'CAM_POS_LERP', label: 'cam pos lerp', min: 0.02, max: 0.4, step: 0.005 },
  { key: 'CAM_ZOOM_LERP', label: 'cam zoom lerp', min: 0.01, max: 0.2, step: 0.005 },
  { key: 'CAM_LOOKAHEAD', label: 'lookahead px', min: 0, max: 200, step: 5 },
  { key: 'CAM_LOOKAHEAD_LERP', label: 'lookahead lerp', min: 0.01, max: 0.3, step: 0.005 },
  { key: 'MOVE_ACCEL', label: 'accel', min: 600, max: 5000, step: 50 },
  { key: 'MOVE_MAX_SPEED', label: 'max speed', min: 120, max: 700, step: 10 },
  { key: 'MOVE_DECEL', label: 'release friction', min: 400, max: 5000, step: 50 },
  { key: 'CAPTURE_RADIUS_MULT', label: 'suction radius ×', min: 1, max: 3, step: 0.05 },
  { key: 'SUCTION_MAX_SPEED', label: 'pull speed', min: 200, max: 1400, step: 20 },
  { key: 'MUSIC_GAIN', label: 'music gain', min: 0, max: 1, step: 0.01, apply: (v) => audio.setMusicGain(v) },
  { key: 'SFX_GAIN', label: 'sfx gain', min: 0, max: 2, step: 0.01, apply: (v) => audio.setSfxGain(v) },
  { key: 'DENSITY_MULT', label: 'density × (next round)', min: 0.5, max: 2, step: 0.05 },
];

export function DebugPanel() {
  const [open, setOpen] = useState(true);
  const [, force] = useState(0);
  const [fps, setFps] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let frames = 0;
    let acc = 0;
    const loop = (now: number) => {
      frames++;
      acc += now - last;
      last = now;
      if (acc >= 500) {
        setFps(Math.round((frames * 1000) / acc));
        frames = 0;
        acc = 0;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const copyConfig = () => {
    const out: Record<string, number> = {};
    for (const f of FIELDS) out[f.key as string] = CONFIG[f.key] as unknown as number;
    navigator.clipboard?.writeText(JSON.stringify(out, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }).catch(() => {});
  };

  return (
    <div className="vd-debug">
      <div className="vd-debug-head">
        <span>DEBUG · {fps} fps</span>
        <button className="vd-debug-toggle" onClick={() => setOpen((o) => !o)}>{open ? '–' : '+'}</button>
      </div>
      {open && (
        <div className="vd-debug-body">
          {FIELDS.map((f) => {
            const val = CONFIG[f.key] as unknown as number;
            return (
              <label key={f.key as string} className="vd-debug-row">
                <span className="vd-debug-label">{f.label}</span>
                <input
                  type="range"
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  value={val}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    (CONFIG as unknown as Record<string, number>)[f.key as string] = v;
                    f.apply?.(v);
                    force((n) => n + 1);
                  }}
                />
                <span className="vd-debug-val">{val.toFixed(f.step < 1 ? 2 : 0)}</span>
              </label>
            );
          })}
          <button className="vd-debug-copy" onClick={copyConfig}>{copied ? 'COPIED!' : 'COPY CONFIG'}</button>
        </div>
      )}
    </div>
  );
}
