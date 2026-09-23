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
// THE MEASURE (v2). A pixel glows when its LINEAR luminance crosses the bloom
// pass's threshold — that is the whole of UnrealBloomPass's high-pass
// (smoothstep(threshold, threshold + 0.01, luminance(texel))). So the probe
// renders the frame exactly as RenderPass hands it to bloom — linear, into a
// float target, no tone map — and reads every pixel's luminance. Then it draws
// a MASK of only the things that ARE lights (the glow material, anything with a
// lit emissive, the hero and his rig) on black, dilated 2 px for edge AA.
// A SOURCE is a pixel at or over the threshold. One on the mask is a light
// doing its job; one off it is paint, snow, metal or skin being lit like a lamp.
//
// WHY NOT v1. v1 measured the RESULT: pixels bloom raised by 3+ L*, and any
// more than 16 px from a light counted against the frame. On Lantern that
// condemned the lights themselves — a lit table's haze reaches ~200 px at
// strength 0.5, radius 0.42, and all 405 "hot" cells were that haze (frames in
// the 2026-09-23 cross-world run) — and on Gameday, Powder and Skylark bloom
// lifted nothing, so v1 could only say "nothing measured" where the honest
// answer is "nothing crosses". Measuring the SOURCES asks the style's actual
// question — what is lit past the threshold — and has an answer on every world.
//
// BAR (unchanged in size, now on sources): no 32x32 cell holds 40 or more
// source pixels off the lights. Maple's white planters are hundreds each.
// REPORTED, not barred: each world's diffuse ceiling (the 99.9th percentile of
// luminance off the lights), the lights' own median, and what the worst cells
// are — a ray from the camera through the brightest source in each.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const PORT = args[0] || '4177';
const WORLD = args[1] || 'maple';
const outArg = process.argv.find((a) => a.startsWith('--out='));
const OUT = outArg ? outArg.slice(6) : null;
const CELL = 32, CELL_BAR = 40, DILATE = 2;

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

const res = await p.evaluate(({ CELL, DILATE }) => {
  const T = window.__THREE, r = window.__renderer, c = window.__composer(), scene = window.__scene, cam = window.__cam;
  const bloom = c.passes.find((ps) => typeof ps.strength === 'number' && 'threshold' in ps);
  if (!bloom) return { err: 'no bloom pass on the composer' };
  const thr = bloom.threshold;
  const sz = r.getDrawingBufferSize(new T.Vector2()), W = sz.x, H = sz.y;
  const rt = new T.WebGLRenderTarget(W, H, { type: T.FloatType });
  const read = () => { const buf = new Float32Array(W * H * 4); r.readRenderTargetPixels(rt, 0, 0, W, H, buf); return buf; };
  // 1. the frame as RenderPass hands it to bloom: linear, no tone map
  const prevRT = r.getRenderTarget();
  r.setRenderTarget(rt); r.clear(); r.render(scene, cam);
  const hdr = read();
  // 2. the lights, alone, on black
  const hero = window.__voidGroup();
  const inHero = (o) => { for (let q = o; q; q = q.parent) if (q === hero) return true; return false; };
  const isLight = (o) => {
    if (inHero(o)) return true;
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    return ms.some((m) => m && ((m.isMeshBasicMaterial && m.color && Math.max(m.color.r, m.color.g, m.color.b) > 1.05)
      || (m.emissive && (m.emissiveIntensity ?? 1) > 0 && Math.max(m.emissive.r, m.emissive.g, m.emissive.b) > 0.02)));
  };
  const hidden = [];
  scene.traverse((o) => { if ((o.isMesh || o.isSprite || o.isPoints || o.isLine) && o.visible && !isLight(o)) { hidden.push(o); o.visible = false; } });
  const bg = scene.background, fog = scene.fog;
  scene.background = new T.Color(0, 0, 0); scene.fog = null;
  r.setRenderTarget(rt); r.clear(); r.render(scene, cam);
  const lm = read();
  scene.background = bg; scene.fog = fog;
  for (const o of hidden) o.visible = true;
  r.setRenderTarget(prevRT); rt.dispose();
  // screen rows run top-down; the read-back runs bottom-up
  const lum = new Float32Array(W * H), lit = new Uint8Array(W * H);
  let finite = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const src = ((H - 1 - y) * W + x) * 4, i = y * W + x;
    const L = 0.2126 * hdr[src] + 0.7152 * hdr[src + 1] + 0.0722 * hdr[src + 2];
    lum[i] = L; if (Number.isFinite(L) && L > 0) finite++;
    if (lm[src] + lm[src + 1] + lm[src + 2] > 0.02) lit[i] = 1;
  }
  // dilate the mask a couple of pixels: the light's own anti-aliased rim
  const near = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!lit[y * W + x]) continue;
    for (let dy = -DILATE; dy <= DILATE; dy++) for (let dx = -DILATE; dx <= DILATE; dx++) {
      const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < H && xx >= 0 && xx < W) near[yy * W + xx] = 1;
    }
  }
  const cells = new Map(); let onLight = 0, offLight = 0;
  const offL = [], litL = [];
  for (let i = 0; i < W * H; i++) {
    const L = lum[i];
    if (near[i]) { if (lit[i]) litL.push(L); } else offL.push(L);
    if (!(L >= thr)) continue;
    if (near[i]) { onLight++; continue; }
    offLight++;
    const x = i % W, y = (i / W) | 0, key = `${Math.floor(x / CELL) * CELL},${Math.floor(y / CELL) * CELL}`;
    const cur = cells.get(key) ?? { n: 0, best: 0, bx: 0, by: 0 };
    cur.n++; if (L > cur.best) { cur.best = L; cur.bx = x; cur.by = y; }
    cells.set(key, cur);
  }
  const pct = (arr, q) => { if (!arr.length) return 0; const s2 = Float32Array.from(arr).sort(); return s2[Math.min(s2.length - 1, Math.floor(q * s2.length))]; };
  // what is it? a ray through the brightest source of each of the worst cells
  const ray = new T.Raycaster();
  const hot = [...cells.entries()].sort((p1, p2) => p2[1].n - p1[1].n);
  const named = hot.slice(0, 8).map(([k, v]) => {
    ray.setFromCamera(new T.Vector2((v.bx + 0.5) / W * 2 - 1, -((v.by + 0.5) / H * 2 - 1)), cam);
    const hit = ray.intersectObjects(scene.children, true).find((h) => h.object.visible && (h.object.isMesh || h.object.isInstancedMesh));
    let what = 'nothing hit';
    if (hit) {
      const o = hit.object; const m = Array.isArray(o.material) ? o.material[0] : o.material;
      const chain = [];
      for (let q = o; q && chain.length < 3 && q !== scene; q = q.parent) {
        const tag = q.name || q.userData?.qk || q.userData?.kind || q.userData?.prop;
        if (tag) chain.push(String(tag));
      }
      const col = m?.color ? `#${m.color.getHexString()}` : '?';
      const surf = m && 'roughness' in m ? ` rough ${m.roughness.toFixed(2)} metal ${m.metalness.toFixed(2)}` : '';
      what = `${chain.join('<') || o.type} — ${o.geometry?.type ?? '?'} ${m?.type ?? ''} ${col}${surf}${o.isInstancedMesh ? ' (instanced)' : ''}`;
    }
    return { cell: k, n: v.n, L: +v.best.toFixed(3), what };
  });
  // a picture: sources on lights green, off them red, over a dim copy of the frame
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const cx = cv.getContext('2d'), img = cx.createImageData(W, H);
  for (let i = 0; i < W * H; i++) {
    const g = Math.min(255, Math.round(Math.pow(Math.min(1, lum[i]), 1 / 2.2) * 110));
    let R = g, G = g, B = g;
    if (lum[i] >= thr) { if (near[i]) { R = 40; G = 230; B = 90; } else { R = 255; G = 40; B = 40; } }
    else if (lit[i]) { B = Math.min(255, g + 90); }
    img.data[i * 4] = R; img.data[i * 4 + 1] = G; img.data[i * 4 + 2] = B; img.data[i * 4 + 3] = 255;
  }
  cx.putImageData(img, 0, 0);
  return { W, H, thr, strength: bloom.strength, finite, onLight, offLight,
    hotCells: hot.filter(([, v]) => v.n >= 40).length, cells: hot.slice(0, 12).map(([k, v]) => [k, v.n]),
    named, ceiling: +pct(offL, 0.999).toFixed(3), offMax: +pct(offL, 1).toFixed(3),
    litMed: +pct(litL, 0.5).toFixed(3), litP90: +pct(litL, 0.9).toFixed(3), litN: litL.length,
    map: cv.toDataURL('image/png') };
}, { CELL, DILATE });
await b.close();
if (res.err) { console.log(`FAIL — ${res.err}`); process.exit(1); }
if (OUT) { mkdirSync(OUT, { recursive: true }); writeFileSync(`${OUT}/${WORLD}-sources.png`, Buffer.from(res.map.split(',')[1], 'base64')); }

console.log(`\n  HALO CENSUS — ${WORLD}, rung 0, ${res.W}x${res.H}, bloom strength ${res.strength} threshold ${res.thr} (linear), on :${PORT}\n`);
console.log(`  ·    pixels at or over the threshold: ${res.onLight + res.offLight} — ${res.onLight} on a light, ${res.offLight} off every light`);
console.log(`  ·    diffuse ceiling off the lights: ${res.ceiling} (99.9th pct), brightest ${res.offMax};  the lights: median ${res.litMed}, 90th pct ${res.litP90} over ${res.litN} px`);
console.log(`  ·    ${CELL}px cells off the lights holding ${CELL_BAR}+ sources: ${res.hotCells}${res.cells.length ? ` — worst ${res.cells.slice(0, 6).map(([k, n]) => `${n} at (${k})`).join(', ')}` : ''}`);
for (const n of res.named.filter((x) => x.n >= CELL_BAR)) console.log(`  ·      ${n.n} at (${n.cell}), L ${n.L}: ${n.what}`);
if (OUT) console.log(`  ·    source map written to ${OUT}/${WORLD}-sources.png (red: off a light, green: on one)`);
if (res.finite === 0) { console.log('\nFAIL — the linear read-back is empty; nothing was measured'); process.exit(1); }
if (res.hotCells) {
  console.log(`\nFAIL — ${res.hotCells} cell(s) cross the bloom threshold off any light: paint, snow or metal is lit like a lamp`);
  process.exit(1);
}
console.log(`\nPASS — nothing but a light crosses the bloom threshold (${res.offLight} stray px, no cell of ${CELL_BAR}+)`);
