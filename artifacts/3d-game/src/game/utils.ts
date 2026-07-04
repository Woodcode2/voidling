export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function dist(x1: number, y1: number, x2: number, y2: number) {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

// v7 §11: XP needed to advance FROM level n to n+1.
export function xpForLevel(n: number) {
  return 500 + n * 250;
}

// Shortest-path angle interpolation
export function lerpAngle(a: number, b: number, t: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

// Mulberry32 seeded PRNG
export function prng(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash;
}

export function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function easeOutBack(x: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

// radius <-> area helpers (growth is area-based so it feels fair)
export function addAreaToRadius(radius: number, addedArea: number) {
  const area = Math.PI * radius * radius + addedArea;
  return Math.sqrt(area / Math.PI);
}

// v7 §1: anti-snowball growth. Mass gained is scaled by (base / current)^0.5 so
// small voids grow fast and giants crawl, then radius is hard-capped. At the cap
// absorbs still score but add no size (caller keeps score separate).
export function growRadius(current: number, addedArea: number, base: number, cap: number) {
  if (current >= cap) return cap;
  const factor = Math.sqrt(base / Math.max(base, current));
  return Math.min(cap, addAreaToRadius(current, addedArea * factor));
}
