// DOES THE HERO CAST A SHADOW, OR STAND IN A SPOTLIGHT?
//
//   node qa/_contact.mjs [world] [r] [dpr]
//
// The contact disc and the bright "lip" ring are the only things grounding the
// void (void3d.ts:425-463). Judging them from a portrait is impossible for two
// reasons this probe removes:
//   * fx.ring() fires an ADDITIVE white ground ring on every absorb and lives
//     0.6 s (fx.ts:53-74). At this harness's measured 0.02x real time that is
//     30 s of wall clock, so a portrait taken 3 s after a screenshot wait has
//     one or two frozen eat-rings sitting on the ground around the hero. They
//     are what the pale annulus in qa-out/portrait/*.png actually is.
//   * whatever is left has to be compared against the SAME ground with the
//     hero absent, or "darker" has no referent.
// So: hide every additive fx ring, shoot the hero, then hide the hero, his
// contact disc and his lip and shoot the identical frame. The difference is
// the grounding, and nothing else.
import { chromium } from 'playwright';
import fs from 'node:fs';

const WORLD = process.argv[2] || 'maple';
const R = Number(process.argv[3] || 1.4);
const DPR = Number(process.argv[4] || 2);
fs.mkdirSync('qa-out/family', { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: DPR });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch { /* private mode */ } });
await p.goto(`http://127.0.0.1:4177/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show')
  .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
const tap = async (sel) => { await p.waitForSelector(sel, { timeout: 300000 });
  await p.evaluate((s) => document.querySelector(s).click(), sel); };
await tap('#btnPlay'); await p.waitForTimeout(2500);
await tap(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 8, null, { timeout: 2400000 });
await p.addStyleTag({ content: '#news,#hud,#stageBar,.vb,.vf,#btnHome,#coins{opacity:0!important}' });
await p.evaluate((rr) => window.__setVoidR(rr), R);
// wait on the CAMERA, never on a wall clock — see qa/_rivalface.mjs
await p.waitForFunction(() => {
  const c = window.__cam, v = window.__voidState();
  const d = Math.hypot(c.position.x - v.x, c.position.z - v.z);
  const ok = window.__cp !== undefined && Math.abs(d - window.__cp) < 0.04;
  window.__cp = d; return ok;
}, null, { timeout: 900000 });

const info = await p.evaluate(() => {
  const THREE = window.__THREE, cam = window.__cam, v = window.__voidState();
  window.__hidden = [];
  window.__hideRings = () => window.__scene.traverse((o) => {
    if (o.isMesh && o.material?.blending === THREE.AdditiveBlending
        && o.geometry?.type === 'RingGeometry' && o.visible) { o.visible = false; window.__hidden.push(o); }
  });
  window.__hideRings();
  // the hero's own three ground/body pieces, found by what they are
  window.__hero = [];
  window.__scene.traverse((o) => {
    if (o.isMesh && o.material?.uniforms?.uAbyss
        && (o.geometry.parameters?.widthSegments ?? 0) >= 90) window.__hero.push(o.parent.parent);
    if (o.isMesh && o.geometry?.type === 'CircleGeometry' && o.renderOrder === -2) window.__hero.push(o);
    if (o.isMesh && o.geometry?.type === 'RingGeometry' && o.renderOrder === -1) window.__hero.push(o);
  });
  const sp = new THREE.Vector3(v.x, 0, v.z).project(cam);
  const px = (sp.x * 0.5 + 0.5) * window.innerWidth, py = (-sp.y * 0.5 + 0.5) * window.innerHeight;
  return { r: v.r, hero: window.__hero.length, px, py,
    camD: cam.position.distanceTo(new THREE.Vector3(v.x, 0, v.z)) };
});
console.log(`r=${info.r} camD=${info.camD.toFixed(1)}  hero pieces found=${info.hero}  ground point at css (${info.px.toFixed(0)},${info.py.toFixed(0)})`);
await p.screenshot({ path: `qa-out/family/${WORLD}-contact-on.png` });
await p.evaluate(() => { window.__hideRings(); window.__hero.forEach((o) => { o.visible = false; }); });
await p.waitForTimeout(2500);
await p.evaluate(() => window.__hideRings());
await p.screenshot({ path: `qa-out/family/${WORLD}-contact-off.png` });
await b.close();

// ── the difference, along a horizontal line through his feet ────────────────
const b2 = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const q = await b2.newPage();
const load = (f) => `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`;
const prof = await q.evaluate(async ([a, c, cy]) => {
  const dec = async (u) => { const im = new Image(); im.src = u; await im.decode();
    const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height;
    cv.getContext('2d').drawImage(im, 0, 0);
    return cv.getContext('2d').getImageData(0, 0, im.width, im.height); };
  const A = await dec(a), C = await dec(c);
  const y = Math.round(cy * (A.height / 932));
  const lum = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
  const out = [];
  for (let x = 0; x < A.width; x += Math.max(1, Math.round(A.width / 100))) {
    const i = (y * A.width + x) * 4;
    out.push([x, +lum(A.data, i).toFixed(1), +lum(C.data, i).toFixed(1)]);
  }
  return { w: A.width, y, out };
}, [load(`qa-out/family/${WORLD}-contact-on.png`), load(`qa-out/family/${WORLD}-contact-off.png`), info.py]);
console.log(`\nscanline through his feet (y=${prof.y} of ${prof.w}-wide frame)`);
console.log('x,withHero,groundAlone,ratio  (<1 = he darkens the ground, >1 = he brightens it)');
for (const [x, a, c] of prof.out) console.log(`${x},${a},${c},${c > 1 ? (a / c).toFixed(3) : 'n/a'}`);
await b2.close();
