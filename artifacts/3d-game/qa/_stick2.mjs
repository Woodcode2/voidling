// STICK FEEL v2 — same measurements, but in SCREEN space (what the thumb is
// actually pointing at) and with the void warped back to verified-open ground
// before every segment, because v1's last segment drifted into the coastline
// slide and returned a heading that was 35 deg off theory.
//
//   node qa/_stick2.mjs [port] [world] [radius]
//
// Virtual 60 Hz clock — see qa/_boot.mjs.
import { chromium } from 'playwright';
import { bootMatch, VCLOCK, PTR } from './_boot.mjs';

const PORT = process.argv[2] || '4267';
const WORLD = process.argv[3] || 'maple';
const RAD = parseFloat(process.argv[4] || '0');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await bootMatch(b, PORT, WORLD);
await p.evaluate(() => { for (const e of window.__edibles) e.eaten = true; });
if (RAD > 0) await p.evaluate((r) => window.__setVoidR(r), RAD);
await p.evaluate(VCLOCK);
await p.evaluate(PTR);
await p.waitForFunction(() => window.__F > 30, null, { timeout: 300000 });

// the most open ground on this island, at the radius we are testing at
const HOME = await p.evaluate(() => {
  const R = window.__voidState().r;
  const m = Math.min(R * 0.75, 4 + R * 0.15) + 1.2, d45 = m * 0.7071;
  const solid = (x, z) => !!window.__biomeAt(x, z) && !window.__inDeepWater3?.(x, z, m)
    && window.__insideIsland3(x + m, z) && window.__insideIsland3(x - m, z)
    && window.__insideIsland3(x, z + m) && window.__insideIsland3(x, z - m)
    && window.__insideIsland3(x + d45, z + d45) && window.__insideIsland3(x - d45, z - d45)
    && window.__insideIsland3(x + d45, z - d45) && window.__insideIsland3(x - d45, z + d45);
  let best = null, bd = -1;
  for (let x = -260; x <= 260; x += 10) for (let z = -260; z <= 260; z += 10) {
    if (!solid(x, z)) continue;
    let d = 0; while (d < 130) { d += 5; let ok = true;
      for (let a = 0; a < 12; a++) { const th = a * Math.PI / 6;
        if (!solid(x + Math.cos(th) * d, z + Math.sin(th) * d)) { ok = false; break; } }
      if (!ok) break; }
    if (d > bd) { bd = d; best = [x, z]; }
  }
  return { x: best[0], z: best[1], clear: bd, r: R };
});

const out = await p.evaluate(async (HOME) => {
  const CX = Math.round(innerWidth / 2), CY = Math.round(innerHeight * 0.62);
  const F = () => window.__F;
  const waitF = (n) => new Promise(res => window.__at(F() + n, res));
  const slice = (f0, f1) => window.__L.filter(s => s.f > f0 && s.f <= f1);
  const V3 = window.__cam.position.constructor;
  // screen direction of a WORLD velocity, under the camera as it stands now
  const scr = (vx, vz) => {
    const c = window.__cam, o = window.__voidState();
    const a = new V3(o.x, 0, o.z).project(c), b2 = new V3(o.x + vx, 0, o.z + vz).project(c);
    return Math.atan2(-(b2.y - a.y), b2.x - a.x) * 180 / Math.PI;   // +y is up on screen
  };
  const home = async (frames = 150) => {
    window.up(CX, CY);
    window.__warpVoid(HOME.x, HOME.z);
    await waitF(frames);
    window.__warpVoid(HOME.x, HOME.z);
    await waitF(4);
    window.down(CX, CY);
    await waitF(6);
  };
  const R = { home: HOME };

  // ── A. RISE, camera already settled ────────────────────────────────────────
  await home();
  const fA = F();
  window.__at(fA + 1, () => window.move(CX, CY - 90));
  await waitF(120);
  R.rise = slice(fA + 1, fA + 120).map(s => ({ f: s.f - fA - 2, sp: s.sp }));

  // ── B. STEADY STATE in screen space, 16 directions ─────────────────────────
  R.steady = [];
  for (let i = 0; i < 16; i++) {
    await home(90);
    const a = i * Math.PI / 8;
    const tx = CX + Math.cos(a) * 90, ty = CY + Math.sin(a) * 90;
    const f0 = F();
    for (let k = 1; k <= 14; k++) window.__at(f0 + k, () => window.move(tx, ty));
    await waitF(80);
    const tail = slice(F() - 20, F());
    const vx = tail.reduce((s, r) => s + r.vx, 0) / tail.length;
    const vz = tail.reduce((s, r) => s + r.vz, 0) / tail.length;
    const last = tail[tail.length - 1];
    R.steady.push({ stick: Math.atan2(last.jy, last.jx) * 180 / Math.PI,
      travel: scr(vx, vz), sp: Math.hypot(vx, vz) });
  }

  // ── C. 180 FLICK ───────────────────────────────────────────────────────────
  const flick = async (nEv) => {
    await home(90);
    let f0 = F();
    for (let k = 1; k <= 18; k++) window.__at(f0 + k, () => window.move(CX, CY - 90));
    await waitF(90);
    const pre = slice(F() - 8, F());
    const pvx = pre.reduce((s, r) => s + r.vx, 0) / pre.length;
    const pvz = pre.reduce((s, r) => s + r.vz, 0) / pre.length;
    const psp = Math.hypot(pvx, pvz);
    f0 = F();
    for (let k = 1; k <= nEv; k++) {
      const u = k / nEv, ang = -Math.PI / 2 + Math.PI * u;
      const tx = CX + Math.cos(ang) * 90, ty = CY + Math.sin(ang) * 90;
      window.__at(f0 + k, () => window.move(tx, ty));
    }
    await waitF(nEv + 150);
    const rows = slice(f0, f0 + nEv + 150);
    const ux = pvx / psp, uz = pvz / psp;
    let fRev = null, fRec = null;
    for (const s of rows) {
      const al = s.vx * ux + s.vz * uz;
      if (fRev === null && al < 0) fRev = s.f - f0 - 1;
      if (fRev !== null && fRec === null && -al > 0.9 * psp) fRec = s.f - f0 - 1;
    }
    return { nEv, psp, fRev, fRec, trough: Math.min(...rows.map(s => s.sp)),
      end: rows[rows.length - 1].sp };
  };
  R.flick = [];
  for (const n of [1, 4, 8, 16]) R.flick.push(await flick(n));

  // ── E. HOLD-STILL RESIDUAL ─────────────────────────────────────────────────
  R.residual = [];
  for (const px of [16, 24, 32, 40, 48, 56, 64]) {
    await home(90);
    let f0 = F();
    for (let k = 1; k <= 18; k++) window.__at(f0 + k, () => window.move(CX, CY - px));
    await waitF(90);
    f0 = F();
    window.__at(f0 + 1, () => window.move(CX + px, CY));       // ONE coalesced move, 90 deg
    await waitF(200);
    const tail = slice(F() - 20, F());
    const vx = tail.reduce((s, r) => s + r.vx, 0) / tail.length;
    const vz = tail.reduce((s, r) => s + r.vz, 0) / tail.length;
    const last = tail[tail.length - 1];
    let e = scr(vx, vz) - Math.atan2(last.jy, last.jx) * 180 / Math.PI;
    while (e > 180) e -= 360; while (e < -180) e += 360;
    // where the pure amplitude filter says it should land, one event in
    const mag = Math.min(1, px / 64), w = 0.28 + 0.72 * mag * mag;
    const hx = 0 + (1 - 0) * w, hy = -1 + (0 - -1) * w;
    R.residual.push({ px, mag, w, errDeg: e, theory: Math.atan2(hy, hx) * 180 / Math.PI, sp: Math.hypot(vx, vz) });
  }
  window.up(CX, CY);
  return R;
}, HOME);

const f = (n, d = 2) => (n === null || n === undefined ? 'n/a' : n.toFixed(d));
console.log(`\n=== ${WORLD} r=${f(HOME.r, 2)} — open ground (${HOME.x},${HOME.z}) clear for ${HOME.clear}u ===\n`);

const rise = out.rise, term = Math.max(...rise.map(s => s.sp));
const at = (fr) => rise.find(s => s.sp >= fr * term)?.f;
console.log('A. RISE from rest to full deflection');
console.log(`   terminal ${f(term)} u/s; frames to 10/50/63/90/95%: ${at(0.1)} / ${at(0.5)} / ${at(0.63)} / ${at(0.9)} / ${at(0.95)}`);
console.log(`   -> 90% in ${at(0.9)} frames = ${f(at(0.9) / 60 * 1000, 0)} ms at 60 fps`);
console.log(`   speed frames 0-6: ${[0, 1, 2, 3, 4, 5, 6].map(i => f(rise.find(s => s.f === i)?.sp ?? 0, 2)).join(' ')}`);

console.log('\nB. SCREEN-SPACE heading error: thumb angle vs the direction the void travels ON SCREEN');
let worst = 0, wAt = 0;
for (const s of out.steady) {
  let e = s.travel - s.stick; while (e > 180) e -= 360; while (e < -180) e += 360;
  if (Math.abs(e) > Math.abs(worst)) { worst = e; wAt = s.stick; }
  console.log(`   thumb ${f(s.stick, 1).padStart(7)}  ->  screen travel ${f(s.travel, 1).padStart(7)}   err ${f(e, 2).padStart(7)} deg   speed ${f(s.sp, 2)}`);
}
console.log(`   worst: ${f(worst, 2)} deg at thumb ${f(wAt, 0)} deg`);

console.log('\nC. 180-DEGREE FLICK');
for (const r of out.flick) console.log(`   sweep over ${String(r.nEv).padStart(2)} frame(s): reversed at ${String(r.fRev).padStart(3)}, 90% recovered at ${String(r.fRec).padStart(3)} frames (${f((r.fRec ?? 0) / 60 * 1000, 0)} ms)  trough ${f(r.trough, 2)} of ${f(r.psp, 2)} u/s`);

console.log('\nE. HOLD-STILL RESIDUAL — 90 deg redirect in ONE coalesced move, then the thumb stops');
for (const r of out.residual) {
  console.log(`   ${String(r.px).padStart(3)} px (mag ${f(r.mag, 2)}, w=${f(r.w, 3)}): measured err ${f(r.errDeg, 1).padStart(6)} deg | filter theory ${f(r.theory, 1).padStart(6)} deg off | speed ${f(r.sp, 2)}`);
}
await b.close();
