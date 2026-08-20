// PROBE — hat vs eyes, screen-space, from the real play camera, at 5 radii.
// For every hat: project every geometry vertex, normalize against the void's
// disc (centre=0, silhouette top=+1), compare against the projected eye discs.
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const PORT = '4177';
const OUT = '/tmp/claude-0/-home-user-voidling/1f93d8f7-3ff2-5559-8b0b-a74b62b39437/scratchpad';
const RADII = [27, 17, 8, 3, 0.9];
const HATS = ['party','chef','cowboy','bobble','flower','wizard','tricorn','viking','space','propeller','crown','tycoon','horn'];

let b, p;
const boot = async () => {
  b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
p.on('pageerror', e => console.log('PAGEERROR', String(e).slice(0, 200)));
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });

await p.goto(`http://127.0.0.1:${PORT}/?w=maple&len=600`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
// the tap gate may gain .show a beat after __voidState exists — wait for it
await p.waitForTimeout(1500);
for (let i = 0; i < 20; i++) {
  const state = await p.evaluate(() => ({
    gate: !!document.querySelector('#tapGate.show'),
    play: !!document.getElementById('btnPlay')?.offsetParent }));
  if (state.gate) { await p.evaluate(() => document.getElementById('tapGate')?.click()); await p.waitForTimeout(500); }
  if (state.play) break;
  await p.waitForTimeout(1000);
}
await p.evaluate(() => document.getElementById('btnPlay')?.click());
await p.waitForTimeout(1400);
await p.evaluate(() => {
  const c = document.querySelector('#worldRow .wCard[data-world="maple"]')
    || document.querySelector('#worldRow .wCard[data-world]');
  c?.click();
});
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
await p.evaluate(() => window.__pinQuality(3));

  return p;
};
await boot();

// ── the measurement, run in page ─────────────────────────────────────────────
const MEASURE = `(hatId) => {
  const THREE = window.__THREE, cam = window.__cam, g = window.__voidGroup();
  cam.updateMatrixWorld(); g.updateWorldMatrix(true, true);
  const C = g.position.clone();
  const bob = g.children[0];               // first child added: the bob group
  const dispR = bob.scale.x;               // dispR * lat (lat within ~1.6% of 1)
  const camToC = C.clone().sub(cam.position);
  const d = camToC.length();
  const vHat = cam.position.clone().sub(C).normalize();   // centre -> camera
  const up = new THREE.Vector3(0, 1, 0);
  const uHat = up.clone().addScaledVector(vHat, -up.dot(vHat)).normalize();
  const ca = Math.min(1, dispR / d), sa = Math.sqrt(Math.max(0, 1 - ca * ca));
  const pTop = C.clone().addScaledVector(vHat, dispR * ca).addScaledVector(uHat, dispR * sa);
  const W = innerWidth, H = innerHeight;
  const toPx = (v) => { const q = v.clone().project(cam);
    return { x: (q.x * 0.5 + 0.5) * W, y: (-q.y * 0.5 + 0.5) * H }; };
  const cPx = toPx(C), topPx = toPx(pTop);
  const scale = cPx.y - topPx.y;           // px per normalized unit; top=+1
  const norm = (px) => ({ x: (px.x - cPx.x) / scale, y: (cPx.y - px.y) / scale });

  // elevation of the camera above the void centre, as animate() computes it
  const cdx = cam.position.x - C.x, cdy = cam.position.y - C.y, cdz = cam.position.z - C.z;
  const elev = Math.atan2(cdy, Math.hypot(cdx, cdz) || 1e-4);

  // ── EYES: project every vertex of both white sclera discs ──────────────
  const eyes = [];
  g.traverse((o) => { if (o.name === 'sclera') eyes.push(o); });
  const tmp = new THREE.Vector3();
  const eyeInfo = eyes.map((sc) => {
    const white = sc.children.find((c) => c.renderOrder === 2);
    const att = white.geometry.getAttribute('position');
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, camD = 0;
    for (let i = 0; i < att.count; i++) {
      tmp.fromBufferAttribute(att, i).applyMatrix4(white.matrixWorld);
      camD += tmp.distanceTo(cam.position);
      const n = norm(toPx(tmp));
      x0 = Math.min(x0, n.x); x1 = Math.max(x1, n.x);
      y0 = Math.min(y0, n.y); y1 = Math.max(y1, n.y);
    }
    camD /= att.count;
    return { x0, x1, y0, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2,
      rx: (x1 - x0) / 2, ry: (y1 - y0) / 2, camD,
      lid: sc.scale.y / (sc.scale.x || 1) };
  });

  const out = { dispR, camD: d, elev, eyes: eyeInfo, W, H,
    cPx, scale, discTopPx: topPx };
  if (!hatId) return out;

  // ── HAT: project every geometry vertex of every mesh under hat:<id> ────
  const hat = g.getObjectByName('hat:' + hatId);
  if (!hat || !hat.visible) return Object.assign(out, { hatMissing: true });
  let hx0 = 1e9, hx1 = -1e9, hy0 = 1e9, hy1 = -1e9, nVert = 0;
  let frontMinY = 1e9;                     // lowest screen point on the near side
  let frontMinYdepth = 0;
  const cover = [0, 0];                    // verts inside each eye's ellipse, in front
  let coverMinY = 1e9, coverMaxY = -1e9;
  hat.traverse((m) => {
    if (!m.isMesh || !m.visible) return;
    const att = m.geometry.getAttribute('position');
    for (let i = 0; i < att.count; i++) {
      tmp.fromBufferAttribute(att, i).applyMatrix4(m.matrixWorld);
      const front = tmp.clone().sub(C).dot(vHat);   // + toward camera
      const camDv = tmp.distanceTo(cam.position);
      const n = norm(toPx(tmp)); nVert++;
      hx0 = Math.min(hx0, n.x); hx1 = Math.max(hx1, n.x);
      hy0 = Math.min(hy0, n.y); hy1 = Math.max(hy1, n.y);
      if (front > 0 && n.y < frontMinY) { frontMinY = n.y; frontMinYdepth = front / dispR; }
      eyeInfo.forEach((e, k) => {
        const dx = (n.x - e.cx) / (e.rx || 1e-6), dy = (n.y - e.cy) / (e.ry || 1e-6);
        if (dx * dx + dy * dy <= 1 && camDv < e.camD) {
          cover[k]++; coverMinY = Math.min(coverMinY, n.y); coverMaxY = Math.max(coverMaxY, n.y);
        }
      });
    }
  });
  // hat transform as applied this frame
  const dressScale = hat.parent.scale.x;
  return Object.assign(out, {
    hat: { id: hatId, nVert, x0: hx0, x1: hx1, y0: hy0, y1: hy1,
      frontMinY, frontMinYdepth,
      cover, coverMinY, coverMaxY,
      leanApplied: -hat.rotation.x, rotZ: hat.rotation.z,
      selfScale: hat.scale.x, dressScale, effScale: hat.scale.x * dressScale,
      posY: hat.position.y, posZ: hat.position.z } });
}`;

const results = [];
const remaining = [...RADII];
let crashes = 0;
while (remaining.length) {
  const r = remaining[0];
  try {
    await runRadius(r);
    remaining.shift();
    writeFileSync(`${OUT}/hatprobe.json`, JSON.stringify(results, null, 1));
  } catch (e) {
    console.log('CRASH at r=' + r + ': ' + String(e).slice(0, 160));
    if (++crashes > 6) throw e;
    try { await b.close(); } catch {}
    await boot();
  }
}

async function runRadius(r) {
  await p.evaluate((rr) => window.__setVoidR(rr), r);
  // settle: camera distance within 3% of its converged value (computed from
  // the same formulas the game uses: targetDist prototype3d.ts:8067, camOffset
  // :8110, lift = 0.9*dispR void3d.ts:1744) and dispR within 10% of r.
  await p.waitForFunction((rr) => {
    // frozenR does NOT stop eating growth (prototype3d.ts:7622 gates only the
    // law clamps) — at r=27 the void devours the district and r runs away, so
    // re-pin on every poll
    if (Math.abs(window.__voidState().r - rr) > 0.05 * rr) window.__setVoidR(rr);
    const g = window.__voidGroup(); const cam = window.__cam;
    const s = Math.min(1, Math.max(0, (rr - 2.5) / 5.5));
    const ox = 0.62 + (0.45 - 0.62) * s, oy = 0.92 + (1.4 - 0.92) * s;
    const n = Math.hypot(ox, oy, ox), oh = Math.hypot(ox, ox) / n, oyn = oy / n;
    const T = Math.min(340, Math.max(26, 38 * Math.pow(rr / 0.9, 0.82)));
    const dp = Math.hypot(oh * T, oyn * T - 0.9 * rr);
    const d = cam.position.distanceTo(g.position);
    const dispR = g.children[0].scale.x;
    return Math.abs(d - dp) / dp < 0.03 && Math.abs(dispR - rr) / rr < 0.10;
  }, r, { timeout: 900000, polling: 2000 });

  // bare-void baseline (eyes only)
  const bare = await p.evaluate(`(${MEASURE})(null)`);
  results.push({ r, hat: null, m: bare });
  console.log(`r=${r} settled: dispR=${bare.dispR.toFixed(2)} camD=${bare.camD.toFixed(1)} elev=${(bare.elev*180/Math.PI).toFixed(1)}deg eyes cy=${bare.eyes.map(e=>e.cy.toFixed(3)).join('/')}`);

  for (const h of HATS) {
    await p.evaluate((id) => window.__setHat(id), h);
    await p.evaluate((id) => new Promise((res) => {   // >=2 frames + lids open
      let n = 0;
      const tick = () => {
        n++;
        const g = window.__voidGroup();
        const hat = g.getObjectByName('hat:' + id);
        const sc = []; g.traverse((o) => { if (o.name === 'sclera') sc.push(o); });
        const ok = hat && hat.visible && hat.rotation.x !== 0 && sc.length === 2
          && sc.every((s) => s.scale.y > 0.8 * (s.scale.x || 1));
        if ((ok && n >= 2) || n > 80) res(null); else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }), h);
    const m = await p.evaluate(`(${MEASURE})(${JSON.stringify(h)})`);
    results.push({ r, hat: h, m });
    const hm = m.hat;
    console.log(`  ${h.padEnd(10)} bboxY[${hm.y0.toFixed(2)},${hm.y1.toFixed(2)}] frontMinY=${hm.frontMinY.toFixed(3)} cover=${hm.cover.join('+')} lean=${hm.leanApplied.toFixed(3)} eff=${hm.effScale.toFixed(3)}`);
    if (h === 'party') {
      const cx = m.cPx.x, cy = m.cPx.y, s = m.scale;
      const clip = { x: Math.max(0, cx - 2.6 * s), y: Math.max(0, cy - 3.4 * s),
        width: Math.min(430, 5.2 * s), height: Math.min(932, 5.4 * s) };
      await p.screenshot({ path: `${OUT}/party_r${String(r).replace('.', '_')}.png`, clip });
      await p.screenshot({ path: `${OUT}/party_r${String(r).replace('.', '_')}_full.png` });
    }
  }
  await p.evaluate(() => window.__setHat(null));
}
writeFileSync(`${OUT}/hatprobe.json`, JSON.stringify(results, null, 1));
await b.close();
console.log('DONE');
