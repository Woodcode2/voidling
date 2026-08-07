// _thumbhuman.mjs — a CHILD'S THUMB, not a perfect driver.
//
// Every steering probe in qa/ pins the finger at a fixed 110 px offset with no
// lag, no tremor, no lift and no overshoot. That driver is a servo, and a servo
// cannot find a control bug: it never re-anchors by accident, never re-grabs,
// never has to reverse from a thumb that has already walked to the edge of its
// own reach. This one has human properties.
//
//   MODE=human   reaction lag 200-400 ms, 3-6 px tremor, finite thumb slew with
//                overshoot + correction, spontaneous lifts and re-grabs, and a
//                thumb that lives in the lower third of the glass.
//   MODE=perfect the existing kit's driver: anchor at a fixed point, finger
//                teleported to anchor+110 px on the target bearing every frame.
//
// ALL human timing runs off __matchState().t (game seconds), never wall clock —
// the software renderer runs the sim at a fraction of real time. render() is
// stubbed because this probe reads state, not pixels.
//
// usage: node qa/_thumbhuman.mjs <world> <port> <human|perfect> [seed]
import { chromium } from 'playwright';

const WORLD = process.argv[2] || 'maple';
const PORT  = process.argv[3] || '4231';
const MODE  = process.argv[4] || 'human';
const SEED  = Number(process.argv[5] || 7);

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
p.setDefaultTimeout(600000);
p.on('pageerror', e => console.log('PAGEERR', e.message));
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 600000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1200);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.3, null, { timeout: 600000 });
await p.evaluate(() => { window.__pinQuality(0); window.__renderer.render = () => {}; });

await p.evaluate(({ MODE, SEED }) => {
  // ---- deterministic RNG so a run can be repeated -------------------------
  let s = SEED >>> 0 || 1;
  const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  const rr = (a, b) => a + (b - a) * rnd();

  const cv = document.querySelector('canvas');
  const joyEl = document.getElementById('joy');
  const W = innerWidth, H = innerHeight;

  // The thumb lives in the lower third, right-hand side (the pad of a right
  // thumb on a 430x932 phone held one-handed). PERFECT keeps the kit's centre.
  const HOME = MODE === 'perfect' ? { x: W / 2, y: H / 2 } : { x: W * 0.70, y: H * 0.80 };

  const st = {
    down: false, id: 1,
    tx: HOME.x, ty: HOME.y,             // where the thumb pad actually is
    vx: 0, vy: 0,                       // thumb velocity (px per game-second)
    ox: HOME.x, oy: HOME.y,             // ORIGIN: where this grip was planted.
                                        // The child's own proprioceptive frame.
    wantX: 0, wantY: -1,                // committed intent (screen unit vec)
    nextDecide: 0, nextLift: 6, liftUntil: -1,
    reach: 105,
  };

  const down = (x, y) => { st.down = true;
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: st.id, clientX: x, clientY: y, bubbles: true, isPrimary: true })); };
  const move = (x, y) => dispatchEvent(new PointerEvent('pointermove', { pointerId: st.id, clientX: x, clientY: y, bubbles: true, isPrimary: true }));
  const up   = (x, y) => { st.down = false;
    dispatchEvent(new PointerEvent('pointerup', { pointerId: st.id, clientX: x, clientY: y, bubbles: true, isPrimary: true })); };

  // ---- what the child WANTS: nearest edible they can swallow --------------
  const wantWorld = () => {
    const vs = window.__voidState(); let best = null, bd = 1e9;
    for (const e of window.__edibles) {
      if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
      const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z, d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = { dx, dz }; }
    }
    return best;
  };

  // world (x,z) -> the game's OWN screen basis: it builds fwd from camOffset
  // and right from fwd, so recovering camOffset from camera-minus-void gives
  // the identical frame without re-deriving anything.
  const basis = () => {
    const vs = window.__voidState(), c = window.__cam.position;
    let ox = c.x - vs.x, oz = c.z - vs.z; const l = Math.hypot(ox, oz) || 1;
    const fx = -ox / l, fz = -oz / l;         // fwd
    return { fx, fz, rx: -fz, rz: fx };       // right = (-fwd.z, fwd.x)
  };
  const toScreen = (wx, wz) => { const B = basis();
    // game: tvx = right.x*inX - fwd.x*inY ; invert it
    return { x: wx * B.rx + wz * B.rz, y: -(wx * B.fx + wz * B.fz) }; };

  // ---- accumulators -------------------------------------------------------
  const A = { n: 0, gt: 0,               // samples, gripped game-time
    sumSpd: 0, sumSpdG: 0, tMoving: 0,
    errStick: [], errPlayer: [], errAnchor: [], errIntent: [],
    binsStick: new Array(19).fill(0), binsPlayer: new Array(19).fill(0),
    tWrongS: 0, tWrongP: 0, tWrong45: 0, tWrong90: 0, tWrongP45: 0, tWrongP90: 0,
    tDead: 0, tSubFull: 0, drift: [], magSum: 0, magN: 0,
    lifts: 0, regrabs: [], regrabCur: null, downAt: -1,
    dist: 0, lastX: null, lastZ: null, tGripDead: 0,
  };
  let prev = null, lastT = 0;

  const tick = () => {
    const ms = window.__matchState(); const t = ms.t;
    if (t <= 0) { requestAnimationFrame(tick); return; }
    const dt = Math.max(0, Math.min(0.5, t - lastT)); lastT = t;
    const vs = window.__voidState();
    const wantW = wantWorld();
    const wantS = wantW ? (() => { const s2 = toScreen(wantW.dx, wantW.dz);
      const m = Math.hypot(s2.x, s2.y) || 1; return { x: s2.x / m, y: s2.y / m }; })() : null;

    if (MODE === 'perfect') {
      if (!st.down) down(HOME.x, HOME.y);
      if (wantS) move(HOME.x + wantS.x * 110, HOME.y + wantS.y * 110);
      st.tx = HOME.x + (wantS ? wantS.x * 110 : 0); st.ty = HOME.y + (wantS ? wantS.y * 110 : 0);
      st.ox = HOME.x; st.oy = HOME.y; st.wantX = wantS ? wantS.x : 0; st.wantY = wantS ? wantS.y : 0;
    } else {
      // ---------- HUMAN ----------
      // reaction lag: the child only re-commits to a bearing every 200-400 ms
      if (t >= st.nextDecide) {
        st.nextDecide = t + rr(0.20, 0.40);
        if (wantS) {
          // overshoot: a child aims PAST the bearing, then corrects. +-14 deg.
          const a = Math.atan2(wantS.y, wantS.x) + rr(-0.25, 0.25);
          st.wantX = Math.cos(a); st.wantY = Math.sin(a);
        }
        st.reach = rr(92, 122);
      }
      // spontaneous lift + re-grab (thumb re-seat)
      if (st.liftUntil > 0 && t > st.liftUntil) {
        st.liftUntil = -1;
        st.ox = HOME.x + rr(-22, 22); st.oy = HOME.y + rr(-22, 22);
        st.tx = st.ox; st.ty = st.oy; st.vx = st.vy = 0;
        down(st.tx, st.ty); A.downAt = t; A.regrabCur = { t0: t, aim: { x: st.wantX, y: st.wantY } };
      }
      if (st.liftUntil < 0 && t > st.nextLift && st.down) {
        st.nextLift = t + rr(7, 15); st.liftUntil = t + rr(0.12, 0.26);
        A.lifts++; up(st.tx, st.ty);
      }
      if (!st.down && st.liftUntil < 0) {   // first plant
        st.ox = HOME.x; st.oy = HOME.y; st.tx = st.ox; st.ty = st.oy;
        down(st.tx, st.ty); A.downAt = t;
      }
      if (st.down) {
        // the thumb aims for ORIGIN + intent*reach — its own frame, not the
        // game's hidden anchor, because the child cannot see the anchor move.
        const gx = st.ox + st.wantX * st.reach, gy = st.oy + st.wantY * st.reach;
        // 2nd-order thumb: spring toward the goal, lightly damped => overshoot
        const K = 190, C = 20;   // per game-second
        st.vx += ((gx - st.tx) * K - st.vx * C) * dt;
        st.vy += ((gy - st.ty) * K - st.vy * C) * dt;
        const sp = Math.hypot(st.vx, st.vy), CAP = 1400;   // px/s: thumb top speed
        if (sp > CAP) { st.vx *= CAP / sp; st.vy *= CAP / sp; }
        st.tx += st.vx * dt; st.ty += st.vy * dt;
        // tremor 3-6 px
        const trem = rr(3, 6), ta = rnd() * Math.PI * 2;
        let px = st.tx + Math.cos(ta) * trem, py = st.ty + Math.sin(ta) * trem;
        // the glass has edges; a real thumb cannot leave it
        px = Math.max(6, Math.min(W - 6, px)); py = Math.max(6, Math.min(H - 6, py));
        st.tx = px; st.ty = py;
        move(px, py);
      }
    }

    // ---------- measurement ----------
    if (prev) {
      const wvx = (vs.x - prev.x) / (dt || 1e-6), wvz = (vs.z - prev.z) / (dt || 1e-6);
      const spd = Math.hypot(wvx, wvz);
      A.n++; A.sumSpd += spd * dt; A.dist += Math.hypot(vs.x - prev.x, vs.z - prev.z);
      const gripped = st.down && joyEl.style.display === 'block';
      if (gripped) {
        A.gt += dt; A.sumSpdG += spd * dt;
        const ax = parseFloat(joyEl.style.left), ay = parseFloat(joyEl.style.top);
        const sx = st.tx - ax, sy = st.ty - ay, sm = Math.hypot(sx, sy);
        const ox = st.tx - st.ox, oy = st.ty - st.oy, om = Math.hypot(ox, oy);
        const mag = Math.min(1, sm / 64);
        A.magSum += mag * dt; A.magN += dt;
        if (mag <= 0.156) A.tDead += dt;          // below the game's deadzone
        else if (mag < 1) A.tSubFull += dt;
        A.drift.push(Math.hypot(ax - st.ox, ay - st.oy));
        if (spd > 0.5 && sm > 1) {
          const av = toScreen(wvx, wvz); const am = Math.hypot(av.x, av.y) || 1;
          const adx = av.x / am, ady = av.y / am;
          A.tMoving += dt;
          const ang = (ux, uy, m2) => m2 < 1e-6 ? null
            : Math.acos(Math.max(-1, Math.min(1, adx * ux / m2 + ady * uy / m2))) * 180 / Math.PI;
          const eS = ang(sx, sy, sm);              // vs what the STICK reads
          const eP = ang(ox, oy, om);              // vs what the CHILD aimed
          const eI = wantS ? Math.acos(Math.max(-1, Math.min(1, adx * wantS.x + ady * wantS.y))) * 180 / Math.PI : null;
          // pure re-anchor error: stick frame vs child frame
          const eA = (sm > 1e-6 && om > 1e-6)
            ? Math.acos(Math.max(-1, Math.min(1, (sx * ox + sy * oy) / (sm * om)))) * 180 / Math.PI : null;
          if (eS != null) { A.errStick.push(eS); A.binsStick[Math.min(18, Math.floor(eS / 10))] += dt;
            if (eS > 45) A.tWrong45 += dt; if (eS > 90) A.tWrong90 += dt; }
          if (eP != null) { A.errPlayer.push(eP); A.binsPlayer[Math.min(18, Math.floor(eP / 10))] += dt;
            if (eP > 45) A.tWrongP45 += dt; if (eP > 90) A.tWrongP90 += dt; }
          if (eA != null) A.errAnchor.push(eA);
          if (eI != null) A.errIntent.push(eI);
          // re-grab recovery: time from plant until travel is within 30 deg of
          // the child's aim AND the void is actually moving
          if (A.regrabCur && eP != null && eP < 30 && spd > 6) {
            A.regrabs.push(+(t - A.regrabCur.t0).toFixed(3)); A.regrabCur = null;
          }
        } else if (gripped) { A.tGripDead += dt; }
      }
    }
    prev = { x: vs.x, z: vs.z, t };
    if (t < 178) requestAnimationFrame(tick);
    else { window.__DONE = true; }
  };
  requestAnimationFrame(tick);

  window.__grab = () => {
    const q = a => { if (!a.length) return null; const c = [...a].sort((x, y) => x - y);
      return { n: a.length, p50: +c[c.length >> 1].toFixed(1),
        p90: +c[Math.floor(c.length * 0.9)].toFixed(1), max: +c[c.length - 1].toFixed(1),
        mean: +(a.reduce((s2, v) => s2 + v, 0) / a.length).toFixed(1) }; };
    const ms = window.__matchState();
    return { t: +ms.t.toFixed(1), score: ms.score, r: +ms.r.toFixed(2),
      samples: A.n, grippedT: +A.gt.toFixed(1), dist: +A.dist.toFixed(0),
      meanSpdGrip: +(A.sumSpdG / (A.gt || 1)).toFixed(2),
      meanMag: +(A.magSum / (A.magN || 1)).toFixed(3),
      pctDeadzone: +(100 * A.tDead / (A.gt || 1)).toFixed(1),
      pctSubFull: +(100 * A.tSubFull / (A.gt || 1)).toFixed(1),
      pctStalledWhileGripping: +(100 * A.tGripDead / (A.gt || 1)).toFixed(1),
      errStick: q(A.errStick), errPlayer: q(A.errPlayer),
      errAnchor: q(A.errAnchor), errIntent: q(A.errIntent),
      pctWrong45_stick: +(100 * A.tWrong45 / (A.tMoving || 1)).toFixed(1),
      pctWrong90_stick: +(100 * A.tWrong90 / (A.tMoving || 1)).toFixed(1),
      pctWrong45_player: +(100 * A.tWrongP45 / (A.tMoving || 1)).toFixed(1),
      pctWrong90_player: +(100 * A.tWrongP90 / (A.tMoving || 1)).toFixed(1),
      anchorDrift: q(A.drift), lifts: A.lifts,
      regrabs: A.regrabs, regrabQ: q(A.regrabs),
      binsStick: A.binsStick.map(v => +v.toFixed(1)),
      binsPlayer: A.binsPlayer.map(v => +v.toFixed(1)),
    };
  };
}, { MODE, SEED });

await p.waitForFunction(() => window.__DONE === true || (window.__matchState?.().t ?? 0) >= 178,
  null, { timeout: 900000 });
const out = await p.evaluate(() => window.__grab());
console.log(JSON.stringify({ world: WORLD, mode: MODE, seed: SEED, ...out }));
await b.close();
