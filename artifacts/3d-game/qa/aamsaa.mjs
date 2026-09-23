// DO THE BEST RUNGS HAVE SMOOTH EDGES? — the anti-aliasing probe.
//
//   node qa/aamsaa.mjs [port]
//
// The renderer is created with `antialias: true`, and that flag only governs
// drawing STRAIGHT to the screen. Rungs 0 and 1 of the quality ladder turn bloom
// on, which routes every frame through EffectComposer — and three's composer
// builds its default render target with NO multisampling (EffectComposer.js:
// `new WebGLRenderTarget(w, h, { type: HalfFloatType })`, samples 0). Rungs 2+
// have bloom off, draw direct, and keep their AA.
//
// So the ladder is inverted on edges: the two BEST rungs — the ones a good phone
// actually runs, and the ones a store screenshot is taken on — are the only ones
// with staircased edges. Found by the 2026-09-23 research governor (G10).
//
// TWO BARS
//   (a) the composer's scene target is multisampled: renderTarget1.samples > 0
//       (it reads 0 today)
//   (b) the edges a child sees are smooth: on a real rung-0 frame, the share of
//       strong-edge pixels that sit BETWEEN their two plateaus. A hard staircase
//       puts almost every edge pixel on one side or the other; a resolved MSAA
//       edge blends. Bar 0.35, the governor's number, set before either run.
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const PORT = process.argv[2] || '4177';
const OUT = process.argv[3] || 'qa/out/aamsaa.png';
let bad = 0, bars = 0;
const ok = (m) => { bars++; console.log(`  ok   ${m}`); };
const no = (m) => { bars++; bad++; console.log(`  BAD  ${m}`); };

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.clear(); localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidMute', '1'); localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch { } });
await p.goto(`http://127.0.0.1:${PORT}/?w=maple&len=60`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 1.5, null, { timeout: 400000 });
await p.evaluate(() => {
  window.__pinQuality(0);
  const cv = document.querySelector('canvas');
  for (const el of Array.from(document.body.children)) if (el !== cv && !el.contains(cv)) el.style.display = 'none';
});
// frames, not milliseconds (GOVERNOR.md rule 4): let rung 0 and its composer settle
const t0 = await p.evaluate(() => window.__matchState().t);
await p.waitForFunction((t) => (window.__matchState?.().t ?? 0) > t + 0.4, t0, { timeout: 400000 }).catch(() => { });
const info = await p.evaluate(() => {
  const q = window.__quality();
  const c = window.__composer?.();
  return { rung: q.level, pr: q.pr, bloom: !!c, samples: c?.renderTarget1?.samples ?? -1,
    maxSamples: window.__renderer?.capabilities?.maxSamples ?? -1 };
});
// ── (a') WHAT THE SCENE IS DRAWN INTO, ON EVERY FRAME ──────────────────────
// Bar (a) read renderTarget1.samples once, and passed a composer whose
// RenderPass drew into the 0-sample target on every other frame: the targets
// swap after each render (OutputPass needsSwap), and RenderPass draws into
// whichever one is readBuffer at the time. Found by the studio governor from
// three's source, 2026-09-23. This wraps composer.render and records
// readBuffer.samples as each of six consecutive frames begins — the target
// the scene is about to be drawn into.
const seen = await p.evaluate(() => new Promise((res) => {
  const c = window.__composer?.();
  if (!c) { res(null); return; }
  const out = [], real = c.render.bind(c);
  c.render = (dt) => { out.push(c.readBuffer?.samples ?? -1); return real(dt); };
  const wait = () => { if (out.length >= 6) { c.render = real; res(out.slice(0, 6)); } else requestAnimationFrame(wait); };
  requestAnimationFrame(wait);
}));
await p.screenshot({ path: OUT });
// ── THE REFERENCE: the same frame drawn DIRECT, through the canvas's own AA ──
// Bar (b) was the governor's number, set before any run. The first reading
// after the fix was 29.6% and missed it, so the question became whether ANY
// path on this hardware reaches 35%. This answers it on every run: the scene
// drawn straight to the antialias:true canvas and read back in the same task,
// next to the composer's own frame read the same way. Measured 2026-09-23:
// direct 32.9%, composer 29.6% — the native path misses the bar too.
const ref = await p.evaluate(() => {
  const r = window.__renderer, c = window.__composer();
  r.setRenderTarget(null); r.render(window.__scene, window.__cam);
  const direct = r.domElement.toDataURL('image/png');
  c.render();
  return { direct, comp: r.domElement.toDataURL('image/png') };
}).catch(() => null);
await b.close();

// ── edge coverage, from the PNG — the pixels as shipped ─────────────────────
const coverage = (img) => {
  const W = img.width, H = img.height, D = img.data;
  const L = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) L[i] = (0.2126 * D[i * 4] + 0.7152 * D[i * 4 + 1] + 0.0722 * D[i * 4 + 2]) / 255;
  let edges = 0, partial = 0;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    let mn = 1, mx = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const v = L[(y + dy) * W + x + dx]; if (v < mn) mn = v; if (v > mx) mx = v;
    }
    if (mx - mn < 0.25) continue;            // not a strong edge
    edges++;
    const f = (L[y * W + x] - mn) / (mx - mn);
    if (f > 0.15 && f < 0.85) partial++;     // sits between its plateaus: a blended edge
  }
  return { edges, partial, cover: edges ? partial / edges : 0 };
};
const { edges, partial, cover } = coverage(PNG.sync.read((await import('fs')).readFileSync(OUT)));
const fromUrl = (u) => coverage(PNG.sync.read(Buffer.from(u.split(',')[1], 'base64')));
const refD = ref ? fromUrl(ref.direct) : null, refC = ref ? fromUrl(ref.comp) : null;

console.log(`\n  ANTI-ALIASING — rung ${info.rung} (pr ${info.pr}, bloom ${info.bloom ? 'on' : 'off'})\n`);
console.log(`  ·    composer scene target samples: ${info.samples}   (device max ${info.maxSamples})`);
console.log(`  ·    strong-edge pixels: ${edges}   blended between their plateaus: ${partial}   = ${(cover * 100).toFixed(1)}%`);
if (refD && refC) console.log(`  ·    same frame read back: direct to the AA canvas ${(refD.cover * 100).toFixed(1)}%, `
  + `through the composer ${(refC.cover * 100).toFixed(1)}% — the hardware's own AA is the ceiling MSAA can reach`);
console.log(`  ·    scene target samples on six consecutive frames: ${seen ? seen.join(', ') : 'no composer'}`);
if (info.rung !== 0 || !info.bloom) no(`could not reach rung 0 with bloom on (rung ${info.rung}, bloom ${info.bloom}) — cannot answer`);
else if (!seen || seen.some((n) => n < 2)) no(`(a') the scene is drawn into a target without multisampling on ${seen ? seen.filter((n) => n < 2).length : '?'} of 6 frames — the edges shimmer between smooth and stepped`);
else ok(`(a') every one of six consecutive frames draws the scene into a multisampled target (${seen.join(', ')})`);
if (edges < 2000) no(`(b) only ${edges} strong-edge pixels on the frame — too few to judge, cannot answer`);
else if (cover < 0.35) no(`(b) ${(cover * 100).toFixed(1)}% of edge pixels are blended — the edges are a staircase (bar 35%)`);
else ok(`(b) ${(cover * 100).toFixed(1)}% of edge pixels are blended between their plateaus (bar 35%)`);
console.log(`\n${bad ? 'FAIL' : 'PASS'} — ${bad ? `${bad} of ${bars}` : bars} bar(s)   frame: ${OUT}`);
process.exit(bad ? 1 : 0);
