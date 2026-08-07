// JUICE A/B — one promotion per browser page, nothing else going on.
//
// Parks the void just under a form threshold, then feeds it SMALL props only
// (radius < 2) so it creeps across the line instead of cascading two rungs in
// one frame. Everything the build emits in the 2.5 s after the card appears is
// counted: shockwave rings, screen-flash frames and alpha, camera shake (2nd
// difference of the camera position — smooth follow is near zero, fx.shake is
// a fresh random offset every frame), haptic pulses and Web Audio voices.
//
// Rendering is stubbed (qa/README trap 1) and the quality ladder is pinned.
import { chromium } from 'playwright';
const PORT = process.argv[3] || '4231';
const WORLD = process.argv[2] || 'maple';

const CASES = [
  // label, park radius, threshold, expected form word
  ['GOBBLER    2.45 -> 2.5', 2.45, 'GOBBLER'],
  ['DEVOURER   3.55 -> 3.6', 3.55, 'DEVOURER'],
  ['COLOSSUS   5.45 -> 5.5', 5.45, 'COLOSSUS'],
  ['WORLD ENDER 7.9 -> 8.0', 7.90, 'WORLD ENDER'],
];

const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader',
    '--autoplay-policy=no-user-gesture-required'],
});

const out = [];
for (const [label, park, word] of CASES) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.error('PAGE ERROR:', e.message));
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => {
    try {
      localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
      localStorage.setItem('voidMute', '0'); localStorage.setItem('voidHaptics', '1');
      localStorage.setItem('voidMotion', '1');
      localStorage.setItem('voidDailyLast', new Date().toDateString());
    } catch { /* private */ }
    const W = window;
    W.__buzz = [];
    Object.defineProperty(navigator, 'vibrate', { configurable: true, writable: true,
      value: function (ms) { W.__buzz.push({ w: performance.now(), ms }); return true; } });
    W.__voices = 0;
    const AP = (window.AudioContext || window.webkitAudioContext).prototype;
    for (const k of ['createOscillator', 'createBufferSource']) {
      const o = AP[k]; AP[k] = function () { W.__voices++; return o.call(this); };
    }
  });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
  await p.evaluate(() => { window.__pinQuality(0); window.__renderer.render = () => {}; });

  await p.evaluate((park) => {
    const W = window;
    W.__ev = []; W.__fr = [];
    W.__rushClock(120);            // mid-match: past the intro, before the finale
    W.__setVoidR(park);
    const rings = [];
    W.__scene.traverse(o => {
      if (o.isMesh && o.geometry?.type === 'RingGeometry' && o.material?.blending === 2
          && Math.abs(o.position.y - 0.15) < 1e-6) rings.push(o);
    });
    let flashEl = null;
    for (const d of document.querySelectorAll('body > div')) {
      const s = d.style;
      if (s.position === 'fixed' && s.zIndex === '4' && s.pointerEvents === 'none' && s.inset === '0px') flashEl = d;
    }
    const wasVis = rings.map(r => r.visible);
    const cam = W.__cam;
    let p1 = null, p2 = null, vPrev = 0, tPrev = null, wPrev = null;
    const watch = ['banner', 'evolve', 'news'];
    const last = {};
    const loop = () => {
      const ms = W.__matchState?.(); if (!ms) { requestAnimationFrame(loop); return; }
      const t = ms.t, w = performance.now();
      for (let i = 0; i < rings.length; i++) {
        if (rings[i].visible && !wasVis[i]) W.__ev.push({ w, k: 'ring',
          maxR: +(rings[i].scale.x / 0.15).toFixed(1), col: rings[i].material.color.getHexString() });
        wasVis[i] = rings[i].visible;
      }
      const fo = flashEl ? Number(flashEl.style.opacity || 0) : 0;
      if (fo > 0.001) W.__ev.push({ w, k: 'flash', a: fo, col: flashEl.style.background });
      const cp = { x: cam.position.x, y: cam.position.y, z: cam.position.z };
      if (p1 && p2) {
        const dd = Math.hypot(cp.x - 2 * p1.x + p2.x, cp.y - 2 * p1.y + p2.y, cp.z - 2 * p1.z + p2.z);
        W.__ev.push({ w, k: 'shake', d: +dd.toFixed(2) });
      }
      p2 = p1; p1 = cp;
      for (const id of watch) {
        const e = document.getElementById(id); if (!e) continue;
        const on = e.classList.contains('show');
        const tx = on ? (e.innerText || '').replace(/\s+/g, ' ').trim() : '';
        const key = on + '|' + tx;
        if (key !== last[id]) { last[id] = key; if (on && tx) W.__ev.push({ w, k: 'dom:' + id, tx: tx.slice(0, 80) }); }
      }
      while (W.__buzz.length) { const q = W.__buzz.shift(); W.__ev.push({ w: q.w, k: 'buzz', ms: q.ms }); }
      const dv = W.__voices - vPrev; vPrev = W.__voices;
      if (dv > 0) W.__ev.push({ w, k: 'voices', n: dv });
      if (tPrev !== null && w > wPrev) W.__fr.push({ w: +w.toFixed(1),
        rate: +((t - tPrev) / ((w - wPrev) / 1000)).toFixed(3), r: +W.__voidState().r.toFixed(3) });
      tPrev = t; wPrev = w;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    // chase SMALL food only, so the void creeps over one threshold
    const cv = document.querySelector('canvas');
    const cx = innerWidth / 2, cy = innerHeight / 2;
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
    W.__go = true;
    const tick = () => {
      if (!W.__go) return;
      const vs = W.__voidState(); let best = null, bd = 1e9;
      for (const e of W.__edibles) {
        if (e.eaten || !e.mesh?.visible || e.radius > 1.6) continue;
        const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
        const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = { dx, dz }; }
      }
      if (best) { const m = Math.hypot(best.dx, best.dz) || 1;
        cv.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
          clientX: cx + (best.dx / m) * 70, clientY: cy + (best.dz / m) * 70, bubbles: true })); }
      setTimeout(tick, 100);
    };
    tick();
  }, park);

  let fired = true;
  try {
    await p.waitForFunction((w) => (document.getElementById('evolve')?.innerText || '').includes(w)
      && document.getElementById('evolve').classList.contains('show'), word, { timeout: 180000 });
  } catch { fired = false; }
  const t0 = await p.evaluate(() => performance.now());
  await p.waitForTimeout(2600);
  await p.evaluate(() => { window.__go = false; });
  const r = await p.evaluate(() => ({ ev: window.__ev, fr: window.__fr, r: window.__voidState().r }));
  out.push({ label, word, fired, t0, ...r });
  await p.close();
}
console.log(JSON.stringify(out));
await b.close();
