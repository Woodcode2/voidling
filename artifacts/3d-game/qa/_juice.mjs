// JUICE TIMELINE — what actually fires, per event, measured not asserted.
//
// Instruments the SHIPPED bundle's observable feedback surface:
//   HAPTICS  navigator.vibrate (the web path buzz() takes; Capacitor is not
//            native in a browser, so every buzz() lands here)
//   AUDIO    AudioContext node constructions per 100 ms — a "voice density"
//            trace. A sound that schedules 12 oscillators is a bigger sound
//            than one that schedules 2.
//   RINGS    the 12 pooled shockwave meshes in fx.ts, watched for the
//            invisible->visible edge, with their maxR (mesh.scale at k=1).
//   FLASH    the fixed full-screen div fx.ts appends (z-index 4), opacity
//            sampled every frame.
//   SHAKE    second difference of the camera position. Smooth camera motion
//            has a near-zero second difference; fx.shake adds a fresh random
//            offset every frame, so |p[n]-2p[n-1]+p[n-2]| IS the shake.
//   BANNERS  #banner / #evolve / #news innerText on every change, with the
//            wall-clock span the .show animation covers.
//
// Everything is stamped with __matchState().t. Rendering is stubbed so the sim
// runs at its proper rate (qa/README trap 1).
import { chromium } from 'playwright';
const PORT = process.argv[3] || '4231';
const WORLD = process.argv[2] || 'maple';
const SECS = Number(process.argv[4] || 182);

const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader',
    '--autoplay-policy=no-user-gesture-required'],
});
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
p.on('pageerror', e => console.log('PAGE ERROR:', e.message));
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));

await p.addInitScript(() => {
  try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidMute', '0'); localStorage.setItem('voidHaptics', '1');
    localStorage.setItem('voidMotion', '1');           // motion ON: measure the full kit
    localStorage.setItem('voidDailyLast', new Date().toDateString());
  } catch { /* private */ }
  const W = window;
  W.__buzz = [];
  // navigator.vibrate — the web haptics path. Defined before the bundle reads
  // `'vibrate' in navigator`, and it returns true so nothing changes shape.
  Object.defineProperty(navigator, 'vibrate', {
    configurable: true, writable: true,
    value: function (ms) { W.__buzz.push({ w: performance.now(), ms }); return true; },
  });
  // audio voice density
  W.__voices = 0; W.__vlog = [];
  const AP = (window.AudioContext || window.webkitAudioContext).prototype;
  for (const k of ['createOscillator', 'createBufferSource']) {
    const o = AP[k];
    AP[k] = function () { W.__voices++; return o.call(this); };
  }
});

await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show');
}));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
await p.evaluate(() => { window.__pinQuality(0); window.__renderer.render = () => {}; });

await p.evaluate(() => {
  const W = window;
  W.__ev = [];                 // the event log
  W.__frames = [];             // per-frame samples
  const S = () => (W.__matchState?.().t ?? 0);
  // ── find the fx ring pool: 12 RingGeometry meshes, additive, y=0.15 ──────
  const rings = [];
  W.__scene.traverse(o => {
    if (o.isMesh && o.geometry?.type === 'RingGeometry' && o.material?.blending === 2
        && Math.abs(o.position.y - 0.15) < 1e-6) rings.push(o);
  });
  W.__ringN = rings.length;
  const wasVis = rings.map(r => r.visible);
  // ── the flash overlay: fixed, inset 0, z-index 4, pointer-events none ────
  let flashEl = null;
  for (const d of document.querySelectorAll('body > div')) {
    const s = d.style;
    if (s.position === 'fixed' && s.zIndex === '4' && s.pointerEvents === 'none' && s.inset === '0px') flashEl = d;
  }
  W.__hasFlash = !!flashEl;
  // ── banners ──────────────────────────────────────────────────────────────
  const watch = ['banner', 'evolve', 'news', 'guide'];
  const last = {};
  // ── shake: second difference of the camera position ──────────────────────
  const cam = W.__cam;
  let p1 = null, p2 = null;
  let vPrev = 0, bPrev = 0;
  const loop = () => {
    const t = S();
    // rings
    for (let i = 0; i < rings.length; i++) {
      if (rings[i].visible && !wasVis[i]) {
        W.__ev.push({ t: +t.toFixed(2), w: performance.now(), k: 'ring',
          maxR: +(rings[i].scale.x / 0.15).toFixed(1), col: rings[i].material.color.getHexString() });
      }
      wasVis[i] = rings[i].visible;
    }
    // flash
    const fo = flashEl ? Number(flashEl.style.opacity || 0) : 0;
    if (fo > 0.001) W.__ev.push({ t: +t.toFixed(2), w: performance.now(), k: 'flash', a: fo, col: flashEl.style.background });
    // shake
    const cp = { x: cam.position.x, y: cam.position.y, z: cam.position.z };
    if (p1 && p2) {
      const d = Math.hypot(cp.x - 2 * p1.x + p2.x, cp.y - 2 * p1.y + p2.y, cp.z - 2 * p1.z + p2.z);
      if (d > 0.25) W.__ev.push({ t: +t.toFixed(2), w: performance.now(), k: 'shake', d: +d.toFixed(2) });
    }
    p2 = p1; p1 = cp;
    // banners
    for (const id of watch) {
      const e = document.getElementById(id); if (!e) continue;
      const on = e.classList.contains('show');
      const tx = on ? (e.innerText || '').replace(/\s+/g, ' ').trim() : '';
      const key = on + '|' + tx;
      if (key !== last[id]) {
        last[id] = key;
        if (on && tx) W.__ev.push({ t: +t.toFixed(2), w: performance.now(), k: 'dom:' + id, tx: tx.slice(0, 90) });
      }
    }
    // haptics + voices, resolved to match time
    while (W.__buzz.length) {
      const q = W.__buzz.shift();
      W.__ev.push({ t: +t.toFixed(2), w: q.w, k: 'buzz', ms: q.ms });
    }
    const dv = W.__voices - vPrev; vPrev = W.__voices;
    if (dv > 0) W.__ev.push({ t: +t.toFixed(2), w: performance.now(), k: 'voices', n: dv });
    W.__frames.push({ t: +t.toFixed(2), w: +performance.now().toFixed(1), r: +W.__voidState().r.toFixed(3) });
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  // drive at the nearest edible — a competent seven-year-old
  const cv = document.querySelector('canvas');
  const cx = innerWidth / 2, cy = innerHeight / 2;
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
  const tick = () => {
    const vs = W.__voidState(); let best = null, bd = 1e9;
    for (const e of W.__edibles) {
      if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
      const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
      const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = { dx, dz }; }
    }
    if (best) {
      const m = Math.hypot(best.dx, best.dz) || 1;
      cv.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
        clientX: cx + (best.dx / m) * 70, clientY: cy + (best.dz / m) * 70, bubbles: true }));
    }
    setTimeout(tick, 120);
  };
  tick();
});

await p.waitForFunction((s) => (window.__matchState?.().t ?? 0) > s
  || document.getElementById('end')?.classList.contains('show'), SECS, { timeout: 900000 });
await p.waitForTimeout(3000);

const out = await p.evaluate(() => ({
  ev: window.__ev, ringN: window.__ringN, hasFlash: window.__hasFlash,
  frames: window.__frames.filter((_, i) => i % 20 === 0),
  ms: window.__matchState(),
}));
console.log(JSON.stringify({ world: WORLD, ...out }));
await b.close();
