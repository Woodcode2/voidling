// STICK FEEL v3 — the four things v2 could not separate:
//   1. screen-space heading with the PIXEL aspect applied (v2's projection
//      compared NDC deltas on a 430x932 viewport and overstated the error 3x)
//   2. the heading filter measured in INPUT space, so the isometric camera is
//      not in the number
//   3. the same thumb TRAJECTORY IN TIME at 60 Hz and at 120 Hz — the heading
//      filter is per-EVENT, not per-second, so a ProMotion phone is a
//      different controller
//   4. rise / flick at WORLD ENDER size, where the smoothing constant changes
//
//   node qa/_stick3.mjs [port] [world] [radius] [hz]
import { chromium } from 'playwright';
import { bootMatch, PTR } from './_boot.mjs';

const PORT = process.argv[2] || '4267';
const WORLD = process.argv[3] || 'maple';
const RAD = parseFloat(process.argv[4] || '0');
const HZ = parseFloat(process.argv[5] || '60');

const VCLOCK_HZ = (hz) => {
  const P = performance, realNow = P.now.bind(P);
  let virt = realNow(); const STEP = 1000 / hz;
  P.now = () => virt;
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => raf(() => { virt += STEP; cb(virt); });
  const L = []; window.__L = L; window.__F = 0; window.__HZ = hz;
  let px = null, pz = null;
  const jEl = document.getElementById('joy'), nEl = document.getElementById('joyNub');
  const acts = []; window.__at = (f, fn) => acts.push([f, fn]);
  const rec = () => {
    const f = ++window.__F;
    for (const a of acts) if (a[0] === f) { try { a[1](); } catch {} }
    const vs = window.__voidState(), ms = window.__matchState();
    const ax = parseFloat(jEl.style.left) || 0, ay = parseFloat(jEl.style.top) || 0;
    let vx = 0, vz = 0;
    if (px !== null) { vx = (vs.x - px) * hz; vz = (vs.z - pz) * hz; }
    px = vs.x; pz = vs.z;
    L.push({ f, t: ms.t, x: vs.x, z: vs.z, r: vs.r, vx, vz, sp: Math.hypot(vx, vz),
      ax, ay, jx: (parseFloat(nEl.style.left) || 0) - ax, jy: (parseFloat(nEl.style.top) || 0) - ay,
      on: jEl.style.display !== 'none' });
    raf(rec);
  };
  raf(rec);
};

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await bootMatch(b, PORT, WORLD);
await p.evaluate(() => { for (const e of window.__edibles) e.eaten = true; });
if (RAD > 0) await p.evaluate((r) => window.__setVoidR(r), RAD);
await p.evaluate(VCLOCK_HZ, HZ);
await p.evaluate(PTR);
await p.waitForFunction(() => window.__F > 30, null, { timeout: 300000 });

const HOME = await p.evaluate(() => {
  const R = window.__voidState().r;
  const m = Math.min(R * 0.75, 4 + R * 0.15) + 1.2, d45 = m * 0.7071;
  const solid = (x, z) => !!window.__biomeAt(x, z) && !window.__inDeepWater3(x, z, m)
    && [[m, 0], [-m, 0], [0, m], [0, -m], [d45, d45], [-d45, -d45], [d45, -d45], [-d45, d45]]
      .every(([a, c]) => window.__insideIsland3(x + a, z + c));
  let best = null, bd = -1;
  for (let x = -260; x <= 260; x += 10) for (let z = -260; z <= 260; z += 10) {
    if (!solid(x, z)) continue;
    let d = 0; while (d < 140) { d += 5; let ok = true;
      for (let a = 0; a < 12; a++) { const th = a * Math.PI / 6;
        if (!solid(x + Math.cos(th) * d, z + Math.sin(th) * d)) { ok = false; break; } }
      if (!ok) break; }
    if (d > bd) { bd = d; best = [x, z]; }
  }
  return { x: best[0], z: best[1], clear: bd, r: R };
});

const out = await p.evaluate(async (HOME) => {
  const CX = Math.round(innerWidth / 2), CY = Math.round(innerHeight * 0.62);
  const HZ = window.__HZ;
  const F = () => window.__F;
  const waitF = (n) => new Promise(res => window.__at(F() + n, res));
  const slice = (f0, f1) => window.__L.filter(s => s.f > f0 && s.f <= f1);
  const V3 = window.__cam.position.constructor;
  // SCREEN direction of a world velocity, in PIXELS (NDC scaled by the viewport)
  const scr = (vx, vz) => { const c = window.__cam, o = window.__voidState();
    const a = new V3(o.x, 0, o.z).project(c), q = new V3(o.x + vx, 0, o.z + vz).project(c);
    return Math.atan2(-(q.y - a.y) * innerHeight, (q.x - a.x) * innerWidth) * 180 / Math.PI; };
  // INPUT-space direction: undo the camera basis the movement code applies, so
  // what is left is the joystick's own heading
  const inp = (vx, vz) => {
    const co = window.__cam.position.clone().sub(new V3(window.__voidState().x, 0, window.__voidState().z));
    const fx = -co.x, fz = -co.z, fl = Math.hypot(fx, fz);
    const Fx = fx / fl, Fz = fz / fl, Rx = -Fz, Rz = Fx;
    return Math.atan2(-(vx * Fx + vz * Fz), vx * Rx + vz * Rz) * 180 / Math.PI;  // screen-y is +down
  };
  const home = async (n = 130) => {
    window.up(CX, CY); window.__warpVoid(HOME.x, HOME.z); await waitF(n);
    window.__warpVoid(HOME.x, HOME.z); await waitF(3);
    window.down(CX, CY); await waitF(5);
  };
  const mean = (a, k) => a.reduce((s, r) => s + r[k], 0) / a.length;
  const R = { hz: HZ, home: HOME };

  // ── 1+2. STEADY STATE, screen space AND input space ───────────────────────
  R.steady = [];
  for (let i = 0; i < 12; i++) {
    await home(90);
    const a = i * Math.PI / 6;
    const tx = CX + Math.cos(a) * 90, ty = CY + Math.sin(a) * 90;
    const f0 = F(); for (let k = 1; k <= 16; k++) window.__at(f0 + k, () => window.move(tx, ty));
    await waitF(80);
    const t2 = slice(F() - 18, F());
    const vx = mean(t2, 'vx'), vz = mean(t2, 'vz'), last = t2[t2.length - 1];
    R.steady.push({ stick: Math.atan2(last.jy, last.jx) * 180 / Math.PI,
      screen: scr(vx, vz), input: inp(vx, vz), sp: Math.hypot(vx, vz) });
  }

  // ── 3. A REAL ARC, TIMED. 180 deg swept in 250 ms, then the thumb STOPS ────
  // identical wall-clock trajectory at whatever refresh this page is pinned to
  R.arc = [];
  for (const magPx of [24, 40, 64]) {
    for (const ms of [150, 250, 400]) {
      await home(90);
      let f0 = F();
      for (let k = 1; k <= 20; k++) window.__at(f0 + k, () => window.move(CX, CY - magPx));
      await waitF(80);
      const nEv = Math.max(1, Math.round(ms / 1000 * HZ));
      f0 = F();
      for (let k = 1; k <= nEv; k++) {
        const u = k / nEv, ang = -Math.PI / 2 + Math.PI * u;
        const tx = CX + Math.cos(ang) * magPx, ty = CY + Math.sin(ang) * magPx;
        window.__at(f0 + k, () => window.move(tx, ty));
      }
      await waitF(nEv + Math.round(HZ * 2.5));      // 2.5 s of holding perfectly still
      const t2 = slice(F() - 18, F());
      const last = t2[t2.length - 1];
      let e = inp(mean(t2, 'vx'), mean(t2, 'vz')) - Math.atan2(last.jy, last.jx) * 180 / Math.PI;
      while (e > 180) e -= 360; while (e < -180) e += 360;
      R.arc.push({ magPx, ms, nEv, errDeg: e });
    }
  }

  // ── 4. RISE and FLICK at this radius ──────────────────────────────────────
  await home();
  let f0 = F();
  window.__at(f0 + 1, () => window.move(CX, CY - 90));
  await waitF(Math.round(HZ * 2.5));
  const rise = slice(f0 + 1, f0 + Math.round(HZ * 2.5)).map(s => ({ f: s.f - f0 - 2, sp: s.sp }));
  const term = Math.max(...rise.map(s => s.sp));
  R.rise = { term, f50: rise.find(s => s.sp >= 0.5 * term)?.f, f90: rise.find(s => s.sp >= 0.9 * term)?.f,
    f0: rise.find(s => s.sp > 0.001)?.f };
  R.flick = [];
  for (const ms of [30, 150, 300]) {
    await home(90);
    f0 = F(); for (let k = 1; k <= 20; k++) window.__at(f0 + k, () => window.move(CX, CY - 90));
    await waitF(Math.round(HZ * 1.5));
    const pre = slice(F() - 8, F());
    const pvx = mean(pre, 'vx'), pvz = mean(pre, 'vz'), psp = Math.hypot(pvx, pvz);
    const nEv = Math.max(1, Math.round(ms / 1000 * HZ));
    f0 = F();
    for (let k = 1; k <= nEv; k++) { const u = k / nEv, ang = -Math.PI / 2 + Math.PI * u;
      window.__at(f0 + k, () => window.move(CX + Math.cos(ang) * 90, CY + Math.sin(ang) * 90)); }
    await waitF(nEv + Math.round(HZ * 2));
    const rows = slice(f0, f0 + nEv + Math.round(HZ * 2));
    const ux = pvx / psp, uz = pvz / psp;
    let fRev = null, fRec = null;
    for (const s of rows) { const al = s.vx * ux + s.vz * uz;
      if (fRev === null && al < 0) fRev = s.f - f0 - 1;
      if (fRev !== null && fRec === null && -al > 0.9 * psp) fRec = s.f - f0 - 1; }
    R.flick.push({ ms, nEv, psp, fRev, fRec, msRev: fRev === null ? null : fRev / HZ * 1000,
      msRec: fRec === null ? null : fRec / HZ * 1000, trough: Math.min(...rows.map(s => s.sp)) });
  }

  // ── 5. PALM FIRST: a resting finger lands before the driving thumb ─────────
  window.up(CX, CY); await waitF(120);
  window.down(60, innerHeight - 40, 7);              // palm / resting finger, bottom-left
  await waitF(20);
  window.down(CX, CY, 8);                            // the DRIVING thumb
  f0 = F(); for (let k = 1; k <= 20; k++) window.__at(f0 + k, () => window.move(CX, CY - 90, 8));
  await waitF(Math.round(HZ * 1.2));
  R.palm = { drivingThumbSpeed: mean(slice(F() - 20, F()), 'sp'),
    ringAt: [Math.round(window.__L[window.__L.length - 1].ax), Math.round(window.__L[window.__L.length - 1].ay)] };
  window.up(60, innerHeight - 40, 7);
  f0 = F(); for (let k = 1; k <= 20; k++) window.__at(f0 + k, () => window.move(CX, CY - 90, 8));
  await waitF(Math.round(HZ * 1.2));
  R.palm.afterPalmLifts = mean(slice(F() - 20, F()), 'sp');
  window.up(CX, CY - 90, 8); await waitF(120);

  // ── 6. HOW FAR THE VOID TRAVELS WHILE THE PAUSE SHEET IS UP ───────────────
  await home();
  f0 = F(); for (let k = 1; k <= 20; k++) window.__at(f0 + k, () => window.move(CX, CY - 90));
  await waitF(Math.round(HZ * 1.5));
  const p0 = window.__L[window.__L.length - 1];
  document.getElementById('btnQuit').click();
  const shown = document.getElementById('pause').classList.contains('show');
  const tA = window.__matchState().t;
  await waitF(Math.round(HZ * 10));                  // ten seconds on the pause sheet
  const p1 = window.__L[window.__L.length - 1];
  R.pausedTravel = { shown, dist: Math.hypot(p1.x - p0.x, p1.z - p0.z),
    clockAdvanced: window.__matchState().t - tA, secs: 10 };
  document.getElementById('pauseResume').click();
  window.up(CX, CY - 90);
  return R;
}, HOME);

const f = (n, d = 2) => (n === null || n === undefined ? 'n/a' : (+n).toFixed(d));
console.log(`\n=== ${WORLD}  r=${f(HOME.r, 2)}  ${out.hz} Hz  open ground (${HOME.x},${HOME.z}) clear ${HOME.clear}u ===`);

console.log('\n1+2. STEADY STATE — thumb angle vs travel, in SCREEN pixels and in INPUT space');
console.log('     thumb    screen    err      input     err');
let wS = 0, wI = 0;
for (const s of out.steady) {
  const n = (x) => { while (x > 180) x -= 360; while (x < -180) x += 360; return x; };
  const eS = n(s.screen - s.stick), eI = n(s.input - s.stick);
  if (Math.abs(eS) > Math.abs(wS)) wS = eS;
  if (Math.abs(eI) > Math.abs(wI)) wI = eI;
  console.log(`   ${f(s.stick, 1).padStart(7)}  ${f(s.screen, 1).padStart(7)}  ${f(eS, 2).padStart(7)}  ${f(s.input, 1).padStart(7)}  ${f(eI, 2).padStart(7)}`);
}
console.log(`   worst screen-space error ${f(wS, 2)} deg | worst input-space error ${f(wI, 2)} deg`);

console.log('\n3. A TIMED 180 ARC, THEN THE THUMB HOLDS STILL FOR 2.5 s — leftover heading error');
console.log('   deflection   sweep      events   permanent error');
for (const a of out.arc) console.log(`   ${String(a.magPx).padStart(3)} px      ${String(a.ms).padStart(3)} ms     ${String(a.nEv).padStart(3)}      ${f(a.errDeg, 1).padStart(7)} deg`);

console.log(`\n4. RISE: first motion frame ${out.rise.f0}, 50% at ${out.rise.f50}, 90% at ${out.rise.f90} frames (${f(out.rise.f90 / out.hz * 1000, 0)} ms), terminal ${f(out.rise.term)} u/s`);
console.log('   FLICK (180 deg):');
for (const r of out.flick) console.log(`     swept in ${String(r.ms).padStart(3)} ms: reversed ${f(r.msRev, 0).padStart(4)} ms, 90% recovered ${f(r.msRec, 0).padStart(4)} ms, trough ${f(r.trough)} of ${f(r.psp)} u/s`);

console.log(`\n5. PALM FIRST — a resting finger lands before the driving thumb`);
console.log(`   driving thumb, palm still down : ${f(out.palm.drivingThumbSpeed)} u/s (ring anchored at ${out.palm.ringAt.join(',')})`);
console.log(`   after the palm lifts, same drag: ${f(out.palm.afterPalmLifts)} u/s`);

console.log(`\n6. PAUSE SHEET UP for ${out.pausedTravel.secs} s with the thumb still on the glass`);
console.log(`   sheet shown=${out.pausedTravel.shown}; void travelled ${f(out.pausedTravel.dist, 1)} world units; match clock advanced ${f(out.pausedTravel.clockAdvanced, 3)} s`);
await b.close();
