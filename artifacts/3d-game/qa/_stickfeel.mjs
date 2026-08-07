// HOW DOES THE STICK FEEL — measured, in FRAMES a phone actually renders.
//
//   node qa/_stickfeel.mjs [port] [world]
//
// Everything below is sampled against a VIRTUAL 60 Hz clock (see qa/_boot.mjs)
// because the shipped dt is `min(0.05, delta)` and swiftshader pins every frame
// to that clamp — a 20 Hz machine nobody owns. With performance.now() advanced
// exactly 1/60 s per rAF, dt is 16.667 ms and a frame count here is a frame
// count on the device.
import { chromium } from 'playwright';
import { bootMatch, VCLOCK, PTR } from './_boot.mjs';

const PORT = process.argv[2] || '4267';
const WORLD = process.argv[3] || 'maple';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await bootMatch(b, PORT, WORLD);

// freeze the world: nothing edible, so radius (and therefore camDist, and
// therefore world speed) is constant for the whole measurement
await p.evaluate(() => { for (const e of window.__edibles) e.eaten = true; });
await p.evaluate(VCLOCK);
await p.waitForFunction(() => window.__F > 20, null, { timeout: 300000 });

await p.evaluate(PTR);
const out = await p.evaluate(async () => {
  const CX = Math.round(innerWidth / 2), CY = Math.round(innerHeight * 0.62);
  const F = () => window.__F;
  const waitF = (n) => new Promise(res => window.__at(F() + n, res));
  const R = {};
  const slice = (f0, f1) => window.__L.filter(s => s.f > f0 && s.f <= f1);

  // ── A. RISE: pointerdown at rest, then one move to full deflection ─────────
  down(CX, CY);
  await waitF(20);
  const fA = F();
  window.__at(fA + 1, () => move(CX, CY - 90));   // due "north" on screen, mag 1
  await waitF(90);
  R.rise = slice(fA, fA + 90).map(s => ({ f: s.f - fA - 2, sp: s.sp, hd: Math.atan2(s.vz, s.vx) }));

  // ── B. STEADY STATE: stick heading vs travel heading, 8 compass points ─────
  R.steady = [];
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    const tx = CX + Math.cos(a) * 90, ty = CY + Math.sin(a) * 90;
    // many events so the amplitude-weighted heading filter is fully converged
    const f0 = F();
    for (let k = 1; k <= 12; k++) window.__at(f0 + k, () => move(tx, ty));
    await waitF(100);
    const tail = slice(F() - 25, F());
    const vx = tail.reduce((s, r) => s + r.vx, 0) / tail.length;
    const vz = tail.reduce((s, r) => s + r.vz, 0) / tail.length;
    const last = tail[tail.length - 1];
    R.steady.push({ stick: Math.atan2(last.jy, last.jx) * 180 / Math.PI,
      travel: Math.atan2(vz, vx) * 180 / Math.PI, sp: Math.hypot(vx, vz) });
  }

  // ── C. 180 DEGREE FLICK ────────────────────────────────────────────────────
  // realistic: the thumb sweeps across in N frames, one coalesced move each.
  const flick = async (nEv) => {
    // settle heading north at full deflection
    let f0 = F();
    for (let k = 1; k <= 15; k++) window.__at(f0 + k, () => move(CX, CY - 90));
    await waitF(60);
    const pre = slice(F() - 10, F());
    const pvx = pre.reduce((s, r) => s + r.vx, 0) / pre.length;
    const pvz = pre.reduce((s, r) => s + r.vz, 0) / pre.length;
    const psp = Math.hypot(pvx, pvz);
    f0 = F();
    for (let k = 1; k <= nEv; k++) {
      const u = k / nEv, ang = -Math.PI / 2 + Math.PI * u;   // north -> south, sweeping
      const tx = CX + Math.cos(ang) * 90, ty = CY + Math.sin(ang) * 90;
      window.__at(f0 + k, () => move(tx, ty));
    }
    await waitF(nEv + 120);
    const rows = slice(f0, f0 + nEv + 120);
    // reversal = travel velocity's component along the ORIGINAL heading goes
    // negative; recovery = speed back to 90% of the pre-flick speed
    const ux = pvx / psp, uz = pvz / psp;
    let fRev = null, fRec = null;
    for (const s of rows) {
      const along = s.vx * ux + s.vz * uz;
      if (fRev === null && along < 0) fRev = s.f - f0 - 1;
      if (fRev !== null && fRec === null && -along > 0.9 * psp) fRec = s.f - f0 - 1;
    }
    return { nEv, psp, fRev, fRec, trough: Math.min(...rows.map(s => s.sp)) };
  };
  R.flick = [];
  for (const n of [1, 4, 8, 16]) R.flick.push(await flick(n));

  // ── D. TWELVE RUNGS OF THUMB TRAVEL -> SPEED ───────────────────────────────
  // each rung is ratioed against a full-deflection hold taken seconds later, so
  // any drift in radius/camera distance cancels
  R.rungs = [];
  const holdSpeed = async (px) => {
    const f0 = F();
    for (let k = 1; k <= 10; k++) window.__at(f0 + k, () => move(CX, CY - px));
    await waitF(70);
    const tail = slice(F() - 20, F());
    return { sp: tail.reduce((s, r) => s + r.sp, 0) / tail.length,
      jm: Math.hypot(tail[tail.length - 1].jx, tail[tail.length - 1].jy) / 64,
      r: tail[tail.length - 1].r };
  };
  for (const px of [5, 10, 16, 22, 28, 34, 40, 46, 52, 58, 64, 96]) {
    const a = await holdSpeed(px);
    const full = await holdSpeed(100);
    R.rungs.push({ px, mag: px / 64, drawn: a.jm, sp: a.sp, full: full.sp,
      frac: full.sp > 0 ? a.sp / full.sp : 0, r: a.r });
  }

  // ── E. HOLD-STILL RESIDUAL: redirect in ONE event, then do not move ────────
  // joySet only runs on pointermove. Whatever heading error the amplitude
  // filter leaves behind when the thumb stops is frozen there forever.
  R.residual = [];
  for (const px of [20, 30, 40, 50, 64]) {
    let f0 = F();
    for (let k = 1; k <= 15; k++) window.__at(f0 + k, () => move(CX, CY - px));   // settle north
    await waitF(70);
    f0 = F();
    window.__at(f0 + 1, () => move(CX + px, CY));                                 // ONE event -> east
    await waitF(150);
    const tail = slice(F() - 25, F());
    const vx = tail.reduce((s, r) => s + r.vx, 0) / tail.length;
    const vz = tail.reduce((s, r) => s + r.vz, 0) / tail.length;
    const last = tail[tail.length - 1];
    let e = Math.atan2(vz, vx) * 180 / Math.PI - Math.atan2(last.jy, last.jx) * 180 / Math.PI;
    while (e > 180) e -= 360; while (e < -180) e += 360;
    R.residual.push({ px, mag: +(px / 64).toFixed(3), errDeg: e });
  }
  up(CX, CY);
  return R;
});

const f = (n, d = 2) => (n === null || n === undefined ? ' n/a' : n.toFixed(d));
console.log(`\n=== ${WORLD} — virtual 60 Hz, radius frozen ===\n`);

console.log('A. RISE from rest, one move to full deflection (frame 0 = first frame that could see it)');
const rise = out.rise;
const term = rise[rise.length - 1].sp;
const at = (frac) => { const r = rise.find(s => s.sp >= frac * term); return r ? r.f : null; };
console.log(`   terminal speed ${f(term)} u/s`);
console.log(`   first frame with ANY motion : ${rise.find(s => s.sp > 0.001)?.f}`);
console.log(`   10% / 50% / 90% / 95%       : ${at(0.1)} / ${at(0.5)} / ${at(0.9)} / ${at(0.95)} frames`);
console.log(`   speed at frame 0,1,2,3,5    : ${[0, 1, 2, 3, 5].map(i => f(rise.find(s => s.f === i)?.sp ?? 0, 1)).join(', ')} u/s`);

console.log('\nB. STEADY-STATE heading error (stick heading vs travel heading, 8 directions)');
let worst = 0;
for (const s of out.steady) {
  let e = s.travel - s.stick; while (e > 180) e -= 360; while (e < -180) e += 360;
  worst = Math.max(worst, Math.abs(e));
  console.log(`   stick ${f(s.stick, 1).padStart(7)}deg -> travel ${f(s.travel, 1).padStart(7)}deg   err ${f(e, 2).padStart(7)}deg   speed ${f(s.sp, 1)}`);
}
console.log(`   worst steady-state error: ${f(worst, 2)} deg`);

console.log('\nC. 180-DEGREE FLICK (frames from the flick to a reversed / recovered travel vector)');
for (const r of out.flick) {
  console.log(`   sweep over ${String(r.nEv).padStart(2)} frame(s): reversed at frame ${String(r.fRev).padStart(3)}, back to 90% at frame ${String(r.fRec).padStart(3)}` +
    `   (pre ${f(r.psp, 1)} u/s, trough ${f(r.trough, 2)} u/s)`);
}

console.log('\nD. THUMB TRAVEL -> SPEED, twelve rungs (frac = speed / full-deflection speed)');
console.log('    px   mag   drawn-nub   speed   full   frac    ideal   delta');
for (const r of out.rungs) {
  const ideal = Math.max(0, Math.min(1, (Math.min(1, r.mag) - 0.156) / 0.844));
  console.log(`   ${String(r.px).padStart(3)}  ${f(r.mag, 3)}   ${f(r.drawn, 3)}   ${f(r.sp, 2).padStart(6)}  ${f(r.full, 2).padStart(6)}  ${f(r.frac, 3)}   ${f(ideal, 3)}   ${f(r.frac - ideal, 3).padStart(6)}`);
}

console.log('\nE. HOLD-STILL RESIDUAL: redirect 90deg in ONE coalesced move, then hold perfectly still');
for (const r of out.residual) console.log(`   deflection ${String(r.px).padStart(3)} px (mag ${f(r.mag, 2)}): travel is ${f(Math.abs(r.errDeg), 1)} deg off the stick, permanently`);

await b.close();
