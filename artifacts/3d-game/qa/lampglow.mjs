// EVERY LIGHT GLOWS — the lamp census (studio round 4, I-5's second half; gates
// Job 9)
//
//   node qa/lampglow.mjs [port] [world] [--out=dir]
//
// qa/halocensus.mjs asks half of art direction's rule — nothing but a light
// crosses the bloom cut. This asks the other half, in the frame: does every
// light cross it? In lantern_look.png one lantern of the four on the wire had a
// halo, the paper-white one. qa/emitters.mjs answers it for every lamp colour
// in node, off the colours part() bakes; this answers it for the pixels,
// where fog, the edge of a face, and a material the running game swapped in
// all count.
//
// ── THE MEASURE ─────────────────────────────────────────────────────────────
// A LAMP is a mesh on an unlit vertex-coloured MeshBasicMaterial whose colour
// is over 1.05 — PROP_GLOW_MAT's shape, the same test halocensus masks lights
// by — outside the hero. Three renders of the frozen frame, all into float
// targets, none tone mapped:
//   HDR    the scene as RenderPass hands it to bloom (halocensus's frame)
//   ID     every lamp in a flat colour of its own, everything else black —
//          the rest of the scene still drawn, so a lamp behind a roof is hidden
//   SOURCE every lamp in its raw vertex colour, everything else black
// A lamp HALOS when at least half of the pixels the ID render gives it are at
// or over the bloom pass's own threshold in HDR: bloom's high-pass is
// smoothstep(threshold, threshold + 0.01, luminance), so that is the share of
// the lamp that feeds a halo. Lamps under 32 px on screen are counted and not
// judged. And a DETACHED lamp is one whose material is not the one most lamps
// share — the too-big-to-eat grey cloned the lamp's material, and a clone drops
// the onBeforeCompile the luminance floor lives in (prototype3d.ts, the gate).
//
// BARS: at least 90% of judged lamps halo (the studio's number), and no lamp
// is detached.
// REPORTED, NOT BARRED — "red paper must still read as red after ACES": the
// displayed frame (the composer's own output, OutputPass included, read back
// from its write target rather than the canvas, which with
// preserveDrawingBuffer off can return the last composited frame) is sampled
// under each lamp's interior pixels, grouped by the lamp colour's hue, and its
// median displayed hue and saturation are printed beside the source's. A
// person reads that table against the frame.
//
// Keyed on the game's clock (__matchState().t), never on wall time.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const PORT = args[0] || '4177';
const WORLD = args[1] || 'lantern';
const outArg = process.argv.find((a) => a.startsWith('--out='));
const OUT = outArg ? outArg.slice(6) : null;
const MIN_PX = 32, HALO_SHARE = 0.5, HALO_BAR = 0.9;

// EVERY WAY OUT PRINTS A VERDICT (the gate reads silence as a failure, and a
// person reads a stack trace as a crashed tool): an abort is a FAIL line.
let browser = null;
const abort = async (why) => {
  console.log(`FAIL — lampglow ${WORLD} aborted before a verdict: ${why}`);
  try { if (browser) await browser.close(); } catch { }
  process.exit(2);
};
process.on('uncaughtException', (e) => abort(e?.message || String(e)));
process.on('unhandledRejection', (e) => abort(e?.message || String(e)));

try {
  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
} catch (e) { await abort(`chromium did not launch: ${e.message}`); }
const p = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.clear(); localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidMute', '1'); localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch { } });
try {
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}&len=60`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 1.5, null, { timeout: 400000 });
} catch (e) { await abort(`the match never reached t 1.5 on :${PORT} (${e.message.split('\n')[0]})`); }
await p.evaluate(() => window.__pinQuality(0));
const t0 = await p.evaluate(() => window.__matchState().t);
try { await p.waitForFunction((t) => (window.__matchState?.().t ?? 0) > t + 0.4, t0, { timeout: 400000 }); }
catch (e) { await abort(`the match clock did not advance 0.4 s after pinning rung 0 (${e.message.split('\n')[0]})`); }

const res = await p.evaluate(({ MIN_PX, HALO_SHARE }) => {
  const T = window.__THREE, r = window.__renderer, c = window.__composer(), scene = window.__scene, cam = window.__cam;
  const bloom = c.passes.find((ps) => typeof ps.strength === 'number' && 'threshold' in ps);
  if (!bloom) return { err: 'no bloom pass on the composer at rung 0' };
  const thr = bloom.threshold;
  const sz = r.getDrawingBufferSize(new T.Vector2()), W = sz.x, H = sz.y;
  const rt = new T.WebGLRenderTarget(W, H, { type: T.FloatType });
  const read = (target) => { const buf = new Float32Array(W * H * 4); r.readRenderTargetPixels(target, 0, 0, W, H, buf); return buf; };
  // the composer's targets are HalfFloat, which WebGL reads back only into a
  // Uint16Array of half floats
  const readAny = (target) => {
    if (target.texture.type !== T.HalfFloatType) return read(target);
    const h = new Uint16Array(W * H * 4); r.readRenderTargetPixels(target, 0, 0, W, H, h);
    const f = new Float32Array(h.length); for (let i = 0; i < h.length; i++) f[i] = T.DataUtils.fromHalfFloat(h[i]);
    return f;
  };
  const hero = window.__voidGroup();
  const inHero = (o) => { for (let q = o; q; q = q.parent) if (q === hero) return true; return false; };
  const isLamp = (o) => o.isMesh && !inHero(o) && !Array.isArray(o.material) && o.material?.isMeshBasicMaterial
    && o.material.vertexColors && Math.max(o.material.color.r, o.material.color.g, o.material.color.b) > 1.05;
  // the lamps, and which material most of them share
  const lamps = [], use = new Map();
  scene.traverse((o) => { if (o.visible && isLamp(o)) { lamps.push(o); use.set(o.material, (use.get(o.material) ?? 0) + 1); } });
  if (!lamps.length) return { err: 'no lamp in the scene (no mesh on an unlit vertex-coloured material over 1.05)' };
  const shared = [...use.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const detached = lamps.filter((o) => o.material !== shared);
  const prevRT = r.getRenderTarget();
  // 1. HDR: the frame as bloom sees it
  r.setRenderTarget(rt); r.clear(); r.render(scene, cam);
  const hdr = read(rt);
  // 2 + 3. ID and SOURCE: every visible mesh swapped for one of two flat
  // materials, everything that is not a mesh hidden, then all put back
  const saved = [], hidden = [];
  const black = new T.MeshBasicMaterial({ color: 0x000000, toneMapped: false, fog: false });
  const idMat = lamps.map((o, i) => new T.MeshBasicMaterial({ color: new T.Color((((i + 1) & 255)) / 255, (((i + 1) >> 8) & 255) / 255, (((i + 1) >> 16) & 255) / 255), toneMapped: false, fog: false }));
  const srcMat = new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false, fog: false });
  const lampIndex = new Map(lamps.map((o, i) => [o, i]));
  // A see-through surface (water, a painted light pool, an overlay) tints a
  // lamp in the real frame and does not hide it, and a mesh that writes no
  // colour draws nothing: both are hidden here rather than drawn as black,
  // or they would hide lamps the HDR frame shows.
  const seeThrough = (m) => (Array.isArray(m) ? m : [m]).some((x) => x && (x.transparent || x.visible === false || x.colorWrite === false));
  scene.traverse((o) => {
    if (!o.visible) return;
    if (o.isMesh && (lampIndex.has(o) || !seeThrough(o.material))) saved.push([o, o.material]);
    else if (o.isMesh || o.isSprite || o.isPoints || o.isLine) { hidden.push(o); o.visible = false; }
  });
  const bg = scene.background, fog = scene.fog;
  let idBuf, srcBuf;
  try {
    scene.background = new T.Color(0, 0, 0); scene.fog = null;
    for (const [o] of saved) o.material = lampIndex.has(o) ? idMat[lampIndex.get(o)] : black;
    r.setRenderTarget(rt); r.clear(); r.render(scene, cam); idBuf = read(rt);
    for (const [o] of saved) o.material = lampIndex.has(o) ? srcMat : black;
    r.setRenderTarget(rt); r.clear(); r.render(scene, cam); srcBuf = read(rt);
  } finally {
    for (const [o, m] of saved) o.material = m;
    for (const o of hidden) o.visible = true;
    scene.background = bg; scene.fog = fog;
  }
  // 4. DISPLAYED: the composer's own output, OutputPass included, kept in its
  // write target instead of going to the screen
  let disp = null;
  if (c.writeBuffer.width !== W || c.writeBuffer.height !== H) return { err: `the composer's targets are ${c.writeBuffer.width}x${c.writeBuffer.height}, the drawing buffer ${W}x${H}` };
  try {
    c.renderToScreen = false;
    c.render(0);
    disp = readAny(c.writeBuffer);
  } finally { c.renderToScreen = true; }
  r.setRenderTarget(prevRT); rt.dispose(); black.dispose(); srcMat.dispose(); idMat.forEach((m) => m.dispose());

  // screen rows run top-down; every read-back runs bottom-up
  const idAt = new Int32Array(W * H).fill(-1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const s = ((H - 1 - y) * W + x) * 4;
    const v = Math.round(idBuf[s] * 255) + (Math.round(idBuf[s + 1] * 255) << 8) + (Math.round(idBuf[s + 2] * 255) << 16);
    if (v > 0 && v <= lamps.length) idAt[y * W + x] = v - 1;
  }
  const lumAt = (buf, s) => 0.2126 * buf[s] + 0.7152 * buf[s + 1] + 0.0722 * buf[s + 2];
  const px = new Int32Array(lamps.length), over = new Int32Array(lamps.length);
  const hsv = (R, G, B) => {
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn;
    let h = 0;
    if (d > 1e-6) h = mx === R ? ((G - B) / d) % 6 : mx === G ? (B - R) / d + 2 : (R - G) / d + 4;
    return { h: (h * 60 + 360) % 360, s: mx > 1e-6 ? d / mx : 0 };
  };
  const enc = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.min(1, v), 1 / 2.4) - 0.055);
  const byHue = new Map();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, id = idAt[i];
    if (id < 0) continue;
    const s = ((H - 1 - y) * W + x) * 4;
    px[id]++;
    if (lumAt(hdr, s) >= thr) over[id]++;
    // interior pixels only for the colour table: all four neighbours the same lamp
    if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
    if (idAt[i - 1] !== id || idAt[i + 1] !== id || idAt[i - W] !== id || idAt[i + W] !== id) continue;
    // the source is linear and the displayed frame sRGB-encoded: hue is not
    // kept by a per-channel curve, so both are compared encoded
    const src = hsv(enc(srcBuf[s]), enc(srcBuf[s + 1]), enc(srcBuf[s + 2]));
    if (src.s < 0.3) continue;
    const key = Math.round(src.h / 4) * 4;
    if (!byHue.has(key)) byHue.set(key, { h: [], s: [], dh: [], ds: [] });
    const out = hsv(disp[s], disp[s + 1], disp[s + 2]);
    const b = byHue.get(key);
    b.h.push(src.h); b.s.push(src.s); b.dh.push(out.h); b.ds.push(out.s);
  }
  const med = (a) => { const s2 = [...a].sort((u, v) => u - v); return s2[s2.length >> 1]; };
  const rows = lamps.map((o, i) => ({ i, px: px[i], share: px[i] ? over[i] / px[i] : 0, detached: o.material !== shared,
    col: `#${o.material.color.getHexString()}`, x: +o.getWorldPosition(new T.Vector3()).x.toFixed(1), z: +o.getWorldPosition(new T.Vector3()).z.toFixed(1) }));
  const judged = rows.filter((q) => q.px >= MIN_PX);
  const hues = [...byHue.entries()].filter(([, b]) => b.h.length >= 200).sort((a, b) => a[0] - b[0])
    .map(([k, b]) => ({ k, n: b.h.length, srcH: +med(b.h).toFixed(1), srcS: +med(b.s).toFixed(2), outH: +med(b.dh).toFixed(1), outS: +med(b.ds).toFixed(2) }));
  // a picture: judged lamps green where over the cut, red where under
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const cx = cv.getContext('2d'), img = cx.createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, s = ((H - 1 - y) * W + x) * 4, o = i * 4;
    const g = Math.min(255, Math.round(Math.pow(Math.min(1, lumAt(hdr, s)), 1 / 2.2) * 110));
    let R = g, G = g, B = g;
    if (idAt[i] >= 0) { if (lumAt(hdr, s) >= thr) { R = 40; G = 230; B = 90; } else { R = 255; G = 40; B = 40; } }
    img.data[o] = R; img.data[o + 1] = G; img.data[o + 2] = B; img.data[o + 3] = 255;
  }
  cx.putImageData(img, 0, 0);
  return { W, H, thr, lampN: lamps.length, sharedN: use.get(shared), detachedN: detached.length,
    detachedCols: [...new Set(detached.map((o) => `#${o.material.color.getHexString()}`))],
    onScreen: rows.filter((q) => q.px > 0).length, judgedN: judged.length,
    haloN: judged.filter((q) => q.share >= HALO_SHARE).length,
    worst: judged.sort((a, b) => a.share - b.share).slice(0, 8), hues, map: cv.toDataURL('image/png') };
}, { MIN_PX, HALO_SHARE }).catch((e) => ({ err: `the page threw: ${e.message.split('\n')[0]}` }));
try { await browser.close(); } catch { }
if (res.err) { console.log(`FAIL — lampglow ${WORLD}: ${res.err}`); process.exit(1); }
if (OUT) { mkdirSync(OUT, { recursive: true }); writeFileSync(`${OUT}/${WORLD}-lamps.png`, Buffer.from(res.map.split(',')[1], 'base64')); }

console.log(`\n  LAMP CENSUS — ${WORLD}, rung 0, ${res.W}x${res.H}, bloom threshold ${res.thr.toFixed(3)} (linear), on :${PORT}\n`);
console.log(`  ·    ${res.lampN} lamp meshes in the scene: ${res.sharedN} on the shared glow material, ${res.detachedN} on another${res.detachedN ? ` (colours ${res.detachedCols.join(', ')})` : ''}`);
console.log(`  ·    ${res.onScreen} on screen, ${res.judgedN} with ${MIN_PX}+ px; ${res.haloN} of them have half or more of their pixels at or over the cut`);
for (const w of res.worst) console.log(`  ·      least: ${(100 * w.share).toFixed(0)}% of ${w.px} px over the cut — lamp at (${w.x}, ${w.z}), material ${w.col}${w.detached ? ' DETACHED' : ''}`);
if (res.hues.length) {
  console.log('  ·    displayed colour under lamp interiors, by the lamp colour\'s hue (reported, not barred):');
  for (const h of res.hues) console.log(`  ·      source hue ${String(h.srcH).padStart(5)} sat ${h.srcS.toFixed(2)}  ->  shown hue ${String(h.outH).padStart(5)} sat ${h.outS.toFixed(2)}   (${h.n} px)`);
}
if (OUT) console.log(`  ·    lamp map written to ${OUT}/${WORLD}-lamps.png (green: over the cut, red: under)`);
let failed = 0;
if (!res.judgedN) { console.log(`\nFAIL — no lamp covers ${MIN_PX} px in the ${WORLD} spawn frame; nothing was measured`); process.exit(1); }
const share = res.haloN / res.judgedN;
if (share >= HALO_BAR) console.log(`\nPASS — ${res.haloN} of ${res.judgedN} on-screen lamps halo (${(100 * share).toFixed(0)}%, bar ${100 * HALO_BAR}%)`);
else { console.log(`\nFAIL — only ${res.haloN} of ${res.judgedN} on-screen lamps halo (${(100 * share).toFixed(0)}%, bar ${100 * HALO_BAR}%): a light that does not cross the cut reads as paint`); failed++; }
if (!res.detachedN) console.log('PASS — every lamp is on the shared glow material');
else { console.log(`FAIL — ${res.detachedN} lamp(s) on a material that is not the shared one: a clone drops the luminance floor's onBeforeCompile`); failed++; }
process.exit(failed ? 1 : 0);
