// GLOW MEANS A LIGHT — the halo census (studio round 4, I-5; gates Job 5)
//
//   node qa/halocensus.mjs [port] [world] [--out=dir]
//
// The style's rule, as art direction stated it: "glow means a light source —
// window, lamp, lantern, flame, neon — and every light source glows. Paint,
// snow, metal and skin never cross the bloom threshold." In Maple's first
// frame two cream planters wear a white halo beside the tutorial hand (the
// lawn's luminance climbs 0.545 → 0.651 toward the rim), so they read as lamps.
//
// THE MEASURE, on one settled frame at rung 0, three renders read back in the
// same task:
//   A  the composer as shipped (bloom at its shipped strength)
//   B  the composer with bloom strength 0 — the same frame, no glow
//   M  a MASK: only the things that ARE lights drawn (the glow material,
//      anything with a lit emissive, the hero and his rig), on black
// A pixel is LIFTED when bloom raises its L* by 3 or more (A − B). A lifted
// pixel within 16 px of the mask is a light doing its job. One farther away is
// a halo on something that is not a light.
//
// BAR: no 32x32 cell off the lights' neighbourhood holds 40 or more lifted
// pixels — a planter's 4-16 px ring is hundreds. Stated before the fix; the
// before run is on the build that ships the planters.
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const PORT = args[0] || '4177';
const WORLD = args[1] || 'maple';
const outArg = process.argv.find((a) => a.startsWith('--out='));
const OUT = outArg ? outArg.slice(6) : null;
const CELL = 32, CELL_BAR = 40, LIFT = 3, NEAR = 16;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.clear(); localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidMute', '1'); localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch { } });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}&len=60`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 1.5, null, { timeout: 400000 });
await p.evaluate(() => window.__pinQuality(0));
const t0 = await p.evaluate(() => window.__matchState().t);
await p.waitForFunction((t) => (window.__matchState?.().t ?? 0) > t + 0.4, t0, { timeout: 400000 }).catch(() => { });

const shots = await p.evaluate(() => {
  const r = window.__renderer, c = window.__composer(), scene = window.__scene, cam = window.__cam;
  const bloom = c.passes.find((ps) => typeof ps.strength === 'number' && 'threshold' in ps);
  if (!bloom) return { err: 'no bloom pass on the composer' };
  const s0 = bloom.strength;
  c.render();
  const A = r.domElement.toDataURL('image/png');
  bloom.strength = 0; c.render();
  const B = r.domElement.toDataURL('image/png');
  bloom.strength = s0;
  // the mask: only lights, on black
  const hero = window.__voidGroup();
  const inHero = (o) => { for (let a = o; a; a = a.parent) if (a === hero) return true; return false; };
  const isLight = (o) => {
    if (inHero(o)) return true;
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    return ms.some((m) => m && ((m.isMeshBasicMaterial && m.color && Math.max(m.color.r, m.color.g, m.color.b) > 1.05)
      || (m.emissive && (m.emissiveIntensity ?? 1) > 0 && Math.max(m.emissive.r, m.emissive.g, m.emissive.b) > 0.02)));
  };
  const hidden = [];
  scene.traverse((o) => { if ((o.isMesh || o.isSprite || o.isPoints || o.isLine) && o.visible && !isLight(o)) { hidden.push(o); o.visible = false; } });
  const bg = scene.background, fog = scene.fog;
  scene.background = new window.__THREE.Color(0, 0, 0); scene.fog = null;
  r.setRenderTarget(null); r.render(scene, cam);
  const M = r.domElement.toDataURL('image/png');
  scene.background = bg; scene.fog = fog;
  for (const o of hidden) o.visible = true;
  return { A, B, M, strength: s0, threshold: bloom.threshold, lights: 0 };
});
await b.close();
if (shots.err) { console.log(`FAIL — ${shots.err}`); process.exit(1); }
const dec = (u) => PNG.sync.read(Buffer.from(u.split(',')[1], 'base64'));
const A = dec(shots.A), B = dec(shots.B), M = dec(shots.M);
if (OUT) { mkdirSync(OUT, { recursive: true }); for (const [k, v] of [['bloom', shots.A], ['nobloom', shots.B], ['lights', shots.M]])
  writeFileSync(`${OUT}/${WORLD}-${k}.png`, Buffer.from(v.split(',')[1], 'base64')); }
const W = A.width, H = A.height;

// L* from sRGB
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const Lstar = (d, k) => { const y = 0.2126 * lin(d[k]) + 0.7152 * lin(d[k + 1]) + 0.0722 * lin(d[k + 2]);
  return y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y; };
// the lights' neighbourhood: mask pixels dilated by NEAR px (separable box max)
const lit = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) { const k = i * 4; if (M.data[k] + M.data[k + 1] + M.data[k + 2] > 24) lit[i] = 1; }
const rowD = new Uint8Array(W * H), near = new Uint8Array(W * H);
for (let y = 0; y < H; y++) { let last = -1e9; for (let x = 0; x < W; x++) { if (lit[y * W + x]) last = x; if (x - last <= NEAR) rowD[y * W + x] = 1; }
  last = 1e9; for (let x = W - 1; x >= 0; x--) { if (lit[y * W + x]) last = x; if (last - x <= NEAR) rowD[y * W + x] = 1; } }
for (let x = 0; x < W; x++) { let last = -1e9; for (let y = 0; y < H; y++) { if (rowD[y * W + x]) last = y; if (y - last <= NEAR) near[y * W + x] = 1; }
  last = 1e9; for (let y = H - 1; y >= 0; y--) { if (rowD[y * W + x]) last = y; if (last - y <= NEAR) near[y * W + x] = 1; } }

let liftedNear = 0, liftedFar = 0;
const cells = new Map();
for (let i = 0; i < W * H; i++) {
  const k = i * 4;
  if (Lstar(A.data, k) - Lstar(B.data, k) < LIFT) continue;
  if (near[i]) { liftedNear++; continue; }
  liftedFar++;
  const x = i % W, y = (i / W) | 0, key = `${Math.floor(x / CELL) * CELL},${Math.floor(y / CELL) * CELL}`;
  cells.set(key, (cells.get(key) ?? 0) + 1);
}
const hot = [...cells.entries()].filter(([, n]) => n >= CELL_BAR).sort((a, b2) => b2[1] - a[1]);

console.log(`\n  HALO CENSUS — ${WORLD}, rung 0, ${W}x${H}, bloom strength ${shots.strength} threshold ${shots.threshold}, on :${PORT}\n`);
console.log(`  ·    pixels bloom lifts by ${LIFT}+ L*: ${liftedNear + liftedFar} — ${liftedNear} beside a light, ${liftedFar} away from every light`);
console.log(`  ·    ${CELL}px cells away from the lights holding ${CELL_BAR}+ lifted pixels: ${hot.length}${hot.length ? ` — ${hot.slice(0, 8).map(([k, n]) => `${n} at (${k})`).join(', ')}` : ''}`);
if (OUT) console.log(`  ·    frames written to ${OUT}/`);
if (liftedNear + liftedFar === 0) { console.log('\nFAIL — bloom lifted nothing at all; the renders did not differ, so nothing was measured'); process.exit(1); }
if (hot.length) {
  console.log(`\nFAIL — ${hot.length} cell(s) glow away from any light: paint, snow or metal is crossing the bloom threshold`);
  process.exit(1);
}
console.log('\nPASS — every halo in the frame sits beside a light');
