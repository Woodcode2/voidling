// THE FLOOR IS NOT ONE MATERIAL — BUT FIRST, DOES THE MASK SELECT THE RIGHT PIXELS?
//
// The whole island is one MeshStandardMaterial at roughness 0.97: tarmac, lawn,
// sand, plaza and boardwalk all answer the sun identically. The per-vertex
// aGloss channel cannot help, because the ground is not a prop — it is one plane
// wearing a painted 3072px texture. So the split is derived per pixel from the
// albedo already sampled: desaturated-and-dark is road, green-dominant is grass.
//
// THAT IS A GUESS UNTIL SOMEBODY LOOKS AT IT. A mask that also catches the beach
// or the rooftops would quietly put a road finish on half the world, and the
// resulting frame would look "a bit off" with nothing to point at. So this runs
// in two modes:
//
//   --mask   paint the mask itself: RED where the shader thinks road, GREEN
//            where it thinks grass, black where it leaves the surface alone.
//            Check this FIRST. If the mask is wrong, nothing downstream matters.
//
//   default  sweep the road roughness and photograph the result, so the value
//            is chosen from pictures. 0.97 is the shipped single-material value
//            and is the control; lower is glossier. Somewhere below this reads
//            as WET rather than as sunlit, and where that line falls is a look
//            decision, not a measurement.
//
//   node qa/groundsurf.mjs [port] [roadRoughs] [world] [--mask]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const PORT = process.argv[2] || '4173';
const ROADS = (process.argv[3] || '0.97,0.78,0.62,0.45').split(',').map(Number);
const WORLD = process.argv[4] && !process.argv[4].startsWith('--') ? process.argv[4] : 'maple';
const MASK = process.argv.includes('--mask');
const OUT = 'qa/out/groundsurf';
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log(`  [pageerror] ${e.message.split('\n')[0]}`));
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => {
  try {
    localStorage.clear();
    localStorage.setItem('voidPlayed', '1');
    localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
  } catch { }
});
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show');
}));
await p.evaluate(() => document.getElementById('btnPlay')?.click());
await p.waitForTimeout(1400);
await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`)?.click(), WORLD);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
await p.evaluate(() => {
  const cv = document.querySelector('canvas');
  cv.dispatchEvent(new PointerEvent('pointerdown', {
    pointerId: 1, clientX: innerWidth / 2, clientY: innerHeight / 2, bubbles: true }));
});
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 2.5, null, { timeout: 400000 });
// hide every DOM layer over the canvas — see qa/facewrap.mjs on why #joy alone
// is not enough, and what a held joystick ring cost once
await p.evaluate(() => {
  const cv = document.querySelector('canvas');
  for (const el of Array.from(document.body.children)) {
    if (el !== cv && !el.contains(cv)) el.style.display = 'none';
  }
});
// ── STAND ON THE THING BEING JUDGED ────────────────────────────────────────
// The first sweep was shot wherever the hero had wandered, which on Maple is a
// park: one corner of tarmac in the top-left and the rest lawn. Comparing four
// road finishes across forty pixels of road is not a comparison.
//
// Finding road is easy now that the mask is verified: paint the mask, look for
// a RED pixel on screen, and unproject it onto the ground plane at y = 0. That
// uses only the camera, so it needs no knowledge of how the 3072px bake is
// mapped onto the island's ShapeGeometry — which carries a mirror in it and is
// not worth reverse-engineering for a screenshot.
const spot = await p.evaluate(() => {
  const THREE = window.__THREE, ren = window.__renderer, sc = window.__scene, cam = window.__cam;
  window.__groundSurf(0.97, 0.97, 1);                 // mask on
  const W = Math.floor(ren.domElement.width), H = Math.floor(ren.domElement.height);
  const rt = new THREE.WebGLRenderTarget(W, H);
  const prev = ren.getRenderTarget();
  ren.setRenderTarget(rt); ren.render(sc, cam);
  const buf = new Uint8Array(W * H * 4);
  ren.readRenderTargetPixels(rt, 0, 0, W, H, buf);
  ren.setRenderTarget(prev); rt.dispose();
  window.__groundSurf(0.97, 0.97, 0);                 // mask off
  // strongest red, preferring the lower half of the frame where the ground is
  // nearest the camera and the unprojection is least oblique
  let bx = -1, by = -1, best = -1;
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      const i = (y * W + x) * 4;
      if (buf[i] < 120 || buf[i + 1] > 90) continue;  // red and not green
      const score = buf[i] + y * 0.05;
      if (score > best) { best = score; bx = x; by = y; }
    }
  }
  if (bx < 0) return null;
  // readRenderTargetPixels is bottom-up, so this y is already the GL y
  const ndc = new THREE.Vector3((bx / W) * 2 - 1, (by / H) * 2 - 1, 0.5).unproject(cam);
  const dir = ndc.sub(cam.position).normalize();
  if (Math.abs(dir.y) < 1e-4) return null;
  const t = -cam.position.y / dir.y;                  // hit the y = 0 plane
  if (t <= 0) return null;
  const hit = cam.position.clone().addScaledVector(dir, t);
  window.__warpVoid(hit.x, hit.z);
  return { wx: hit.x, wz: hit.z };
});
console.log(spot ? `  standing on road at (${spot.wx.toFixed(0)}, ${spot.wz.toFixed(0)})`
                 : '  NOTE: no road in the opening frame — shooting where the hero is');
await p.waitForTimeout(900);
// pull the camera up so the shot is about the FLOOR, not about the hero
await p.evaluate(() => window.__setVoidR(7));
await p.waitForTimeout(3400);   // evolution burst — see qa/heroface.mjs

// ── freeze, exactly as qa/facewrap.mjs does, and for the same reason ────────
// Without this the follow camera and the growth spring move between shots and
// every variant is a different frame with the knob as the smallest difference.
await p.evaluate(() => {
  const raw = window.requestAnimationFrame.bind(window);
  window.__pend = null;
  const rawNow = performance.now.bind(performance);
  window.__virt = rawNow();
  performance.now = () => window.__virt;      // animate() takes dt from THREE.Clock
  window.requestAnimationFrame = (cb) => { window.__pend = cb; return 0; };
  raw(() => { });
});
await p.waitForFunction(() => !!window.__pend, null, { timeout: 30000 }).catch(() => { });
// `ms` is how much VIRTUAL time each stepped frame is worth. It defaults to a
// real 1/60 for stepping the world forward — and it must be ZERO for a sweep.
// That is not a detail: with 1/60 per frame and two frames per variant, four
// variants advance the world by 133 ms, and a void at r=7 travels about 145
// units a second. The first road sweep drifted the camera 14.8 units across the
// four shots and reported 90% of pixels changed, which reads as an enormous
// lighting effect and was the CAMERA MOVING. At ms=0 the game still runs a full
// frame — uniforms are picked up, materials rebind, everything draws — and
// nothing anywhere integrates, because every dt is zero.
const step = (n, ms = 1000 / 60) => p.evaluate(([n, ms]) => {
  for (let i = 0; i < n; i++) {
    const cb = window.__pend; if (!cb) return i;
    window.__pend = null; window.__virt += ms; cb(window.__virt);
  }
  return n;
}, [n, ms]);
if (!(await step(1))) { console.log('FAIL — the rAF loop was never captured.'); await b.close(); process.exit(1); }
{
  const t0 = await p.evaluate(() => window.__matchState().t);
  await p.waitForTimeout(600);
  const t1 = await p.evaluate(() => window.__matchState().t);
  if (t1 - t0 > 0.05) {
    console.log(`FAIL — loop still running: clock moved ${(t1 - t0).toFixed(2)}s in 0.6s wall.`);
    await b.close(); process.exit(1);
  }
}

if (MASK) {
  await p.evaluate(() => window.__groundSurf(0.97, 0.97, 1));
  await step(2, 0);
  await p.screenshot({ path: `${OUT}/mask_${WORLD}.png` });
  // …and how much of the visible floor each channel claims, so "it looks about
  // right" is backed by a number
  // ── AND COUNT IT IN TEXTURE SPACE, NOT ON SCREEN ─────────────────────────
  // Two screen-space versions of this number were wrong. The first counted the
  // whole frame and reported "road 21.9%" on a mask whose tarmac was visibly,
  // entirely black — it was reading the purple hero's own red channel off a
  // 500px disc. The second tried to hide everything but the ground and returned
  // 0.0% for both channels on a frame that was plainly half green.
  //
  // Screen space was the wrong space. What the mask selects is a property of
  // the GROUND TEXTURE, so evaluate it there: the same arithmetic as the
  // shader, over the 3072px bake, covering the whole island instead of whatever
  // the camera happens to be pointing at. No lighting, no tone mapping, no
  // other objects, no framing luck.
  const cov = await p.evaluate(() => {
    let tex = null, roadCh = null;
    window.__scene.traverse((o) => {
      const m = o.material;
      if (m && m.userData && m.userData.surfU && m.map) { tex = m.map; roadCh = m.userData.roadCh; }
    });
    if (!tex || !tex.image) return null;
    const cv = tex.image, S = cv.width;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    const px = ctx.getImageData(0, 0, S, S).data;
    const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const STRIDE = 4;   // 3072/4 = 768^2 samples, plenty and fast
    let road = 0, grass = 0, n = 0;
    for (let y = 0; y < S; y += STRIDE) {
      for (let x = 0; x < S; x += STRIDE) {
        const i = (y * S + x) * 4;
        if (px[i + 3] < 8) continue;                  // outside the island silhouette
        const R = lin(px[i]), G = lin(px[i + 1]), B = lin(px[i + 2]);
        const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
        const sat = (mx - mn) / Math.max(mx, 1e-4);
        const grn = G - Math.max(R, B);
        n++;
        if (roadCh) {
          const Y = Math.max(1e-4, 0.2126 * R + 0.7152 * G + 0.0722 * B);
          const d = Math.hypot(R / Y - roadCh[0], G / Y - roadCh[1], B / Y - roadCh[2]);
          if (1 - ss(0.06, 0.22, d) > 0.5) road++;
        }
        if (ss(0.10, 0.24, sat) * ss(0.004, 0.045, grn) > 0.5) grass++;
      }
    }
    return { road: road / Math.max(1, n) * 100, grass: grass / Math.max(1, n) * 100, n, hasRoadCh: !!roadCh };
  });
  console.log(`  mask written: ${OUT}/mask_${WORLD}.png`);
  if (cov) {
    console.log(`  of the island's ground texture (${cov.n.toLocaleString()} samples):`
      + ` road ${cov.road.toFixed(1)}%, grass ${cov.grass.toFixed(1)}%`
      + (cov.hasRoadCh ? '' : '  (road chromaticity not exposed — see __groundSurf)'));
  }
  console.log('  RED must be the tarmac and only the tarmac. GREEN must be lawn.');
  console.log('  Sand, plaza concrete, rooftops and props must be BLACK.');
} else {
  console.log(`  ${WORLD} — sweeping road roughness (0.97 = the shipped single material)`);
  // ── AND REPORT THE DRIFT, EVERY SHOT ───────────────────────────────────────
  // A sweep whose frames are photographed from different places is not a sweep,
  // and it does not announce itself: the pictures still look like the thing you
  // asked for. This ran once with 90% of pixels changing between the first and
  // last variant, which read as an enormous lighting effect and was the CAMERA
  // MOVING. So every shot now prints where the camera was and where the hero
  // was, and anything past a pixel of drift invalidates the comparison.
  let ref = null;
  for (const r of ROADS) {
    await p.evaluate((r) => window.__groundSurf(r, 0.97, 0), r);
    await step(2, 0);   // dt = 0: draw, do not advance
    const where = await p.evaluate(() => {
      const c = window.__cam, v = window.__voidState();
      return { cx: c.position.x, cy: c.position.y, cz: c.position.z, vx: v.x, vz: v.z, vr: v.r };
    });
    if (!ref) ref = where;
    const drift = Math.hypot(where.cx - ref.cx, where.cy - ref.cy, where.cz - ref.cz);
    const name = `road${String(r).replace('.', 'p')}.png`;
    await p.screenshot({ path: `${OUT}/${name}` });
    console.log(`   ${String(r).padStart(5)}  ->  ${name}`
      + `   cam drift ${drift.toFixed(3)}  r=${where.vr.toFixed(2)}`
      + (drift > 0.05 ? '   <-- MOVED, comparison invalid' : ''));
  }
}
await b.close();
