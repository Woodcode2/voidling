// shared boot for the input-latency probes: get into a live match on `world`,
// rendering stubbed, quality pinned, and a VIRTUAL 60 Hz clock installed so
// frame counts mean what they mean on a phone rather than what the software
// renderer's 3 fps makes them mean.
export async function bootMatch(b, port, world = 'maple', vp = { width: 430, height: 932 }) {
  const p = await b.newPage({ viewport: vp, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:${port}/?w=${world}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${world}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
  await p.evaluate(() => { window.__renderer.render = () => {}; window.__pinQuality(0); });
  return p;
}

// Installs a virtual 60 Hz clock and a per-frame recorder.
//
// WHY: three's Clock reads performance.now(), and the game clamps dt to 0.05.
// Under swiftshader a real frame is 200-900 ms, so every frame in this
// environment advances the sim by the 0.05 clamp — a 20 Hz phone that does not
// exist. Every velocity filter here is `v += (target-v) * min(1, dt*A)`, whose
// per-FRAME response depends on dt, so a frame count sampled at 20 Hz is not
// the frame count a child gets at 60. Standing in front of performance.now and
// advancing it exactly 1/60 s per rAF callback makes dt exactly 16.667 ms, so
// the frame numbers below are the numbers on the phone.
export const VCLOCK = () => {
  const P = performance, realNow = P.now.bind(P);
  let virt = realNow();
  const STEP = 1000 / 60;
  P.now = () => virt;
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => raf(() => { virt += STEP; cb(virt); });
  window.__vnow = () => virt;
  // per-frame recorder — runs at the END of the frame via a rAF chain that is
  // installed after the game's, so it sees the position the game just wrote.
  const L = [];
  window.__L = L;
  window.__F = 0;
  let px = null, pz = null;
  const jEl = document.getElementById('joy'), nEl = document.getElementById('joyNub');
  const acts = [];
  window.__at = (f, fn) => acts.push([f, fn]);
  const rec = () => {
    const f = ++window.__F;
    for (const a of acts) if (a[0] === f) { try { a[1](); } catch (e) { L.push({ err: String(e) }); } }
    const vs = window.__voidState(); const ms = window.__matchState();
    const ax = parseFloat(jEl.style.left) || 0, ay = parseFloat(jEl.style.top) || 0;
    const nx = parseFloat(nEl.style.left) || 0, ny = parseFloat(nEl.style.top) || 0;
    let vx = 0, vz = 0;
    if (px !== null) { vx = (vs.x - px) * 60; vz = (vs.z - pz) * 60; }
    px = vs.x; pz = vs.z;
    L.push({ f, t: ms.t, x: vs.x, z: vs.z, r: vs.r, vx, vz, sp: Math.hypot(vx, vz),
      ax, ay, jx: nx - ax, jy: ny - ay, on: jEl.style.display !== 'none' });
    raf(rec);
  };
  raf(rec);
};

// synthetic pointer helpers — dispatched IN PAGE so they land on an exact frame
// synthetic pointer helpers — installed on window so a probe can call them from
// inside an rAF callback and land the event on an exact frame.
export const PTR = () => {
  const CV = document.querySelector('canvas');
  const ev = (ty, x, y, id, extra) => new PointerEvent(ty, Object.assign({
    pointerId: id, clientX: x, clientY: y, bubbles: true, cancelable: true,
    pointerType: 'touch', isPrimary: id === 1 }, extra));
  window.down = (x, y, id = 1, tgt = null) => (tgt || CV).dispatchEvent(ev('pointerdown', x, y, id, { buttons: 1 }));
  window.move = (x, y, id = 1) => window.dispatchEvent(ev('pointermove', x, y, id, { buttons: 1 }));
  window.up = (x, y, id = 1) => window.dispatchEvent(ev('pointerup', x, y, id, { buttons: 0 }));
  window.cancel = (x, y, id = 1) => window.dispatchEvent(ev('pointercancel', x, y, id, {}));
};
