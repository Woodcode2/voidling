// Nail down the four edge cases that came back "driving itself", with the
// joystick's own visible state (the ring's display flag IS joy.active, and the
// nub offset IS the deflection) logged next to the void's speed frame by frame.
//
//   node qa/_stickdiag.mjs [port] [case]
import { chromium } from 'playwright';
import { bootMatch, VCLOCK, PTR } from './_boot.mjs';

const PORT = process.argv[2] || '4267';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await bootMatch(b, PORT, 'maple');
await p.evaluate(() => { for (const e of window.__edibles) e.eaten = true; });
await p.evaluate(VCLOCK);
await p.evaluate(PTR);
await p.waitForFunction(() => window.__F > 30, null, { timeout: 300000 });

const R = await p.evaluate(async () => {
  const CX = Math.round(innerWidth / 2), CY = Math.round(innerHeight * 0.62);
  const F = () => window.__F;
  const waitF = (n) => new Promise(res => window.__at(F() + n, res));
  const tail = (n) => window.__L.slice(-n).map(s => ({ f: s.f, sp: +s.sp.toFixed(2),
    on: s.on, jx: Math.round(s.jx), jy: Math.round(s.jy), ax: Math.round(s.ax), ay: Math.round(s.ay) }));
  const sp = (n = 25) => { const a = window.__L.slice(-n); return a.reduce((s, r) => s + r.sp, 0) / a.length; };
  const drive = async () => {
    window.up(CX, CY); window.up(CX, CY, 2); await waitF(150);
    window.down(CX, CY);
    const f0 = F(); for (let k = 1; k <= 18; k++) window.__at(f0 + k, () => window.move(CX, CY - 90));
    await waitF(80); return sp();
  };
  const R = {};

  // ── TWO FINGERS ────────────────────────────────────────────────────────────
  R.two = {};
  R.two.pre = await drive();
  window.down(CX - 120, CY + 40, 2);
  await waitF(30); R.two.bothDown = sp();
  window.up(CX, CY - 90, 1);
  await waitF(90); R.two.afterFirstLifts = sp(); R.two.snapA = tail(4);
  const f0 = F(); for (let k = 1; k <= 18; k++) window.__at(f0 + k, () => window.move(CX - 120, CY - 60, 2));
  await waitF(80); R.two.f2Drags = sp(); R.two.snapB = tail(4);
  // and the second finger's own pointerdown, now that the first is gone —
  // does a child who swapped thumbs have to lift AND retap?
  window.up(CX - 120, CY - 60, 2); await waitF(150);
  window.down(CX - 120, CY - 60, 2);
  const f1 = F(); for (let k = 1; k <= 18; k++) window.__at(f1 + k, () => window.move(CX - 120, CY - 150, 2));
  await waitF(80); R.two.f2Fresh = sp();
  window.up(CX - 120, CY - 150, 2); await waitF(150);

  // ── PAUSE ──────────────────────────────────────────────────────────────────
  R.pause = {};
  R.pause.pre = await drive();
  window.up(CX, CY - 90); await waitF(3);                 // finger comes OFF first
  document.getElementById('btnQuit').click();             // opens the pause sheet
  R.pause.sheet = document.getElementById('pause').className;
  await waitF(60); R.pause.whilePausedFingerOff = sp(40);
  R.pause.tSame = window.__L[window.__L.length - 1].t - window.__L[window.__L.length - 40].t;
  document.getElementById('pauseResume').click(); await waitF(150);

  // pause with the finger still DOWN
  R.pause.pre2 = await drive();
  document.getElementById('btnQuit').click();
  await waitF(60); R.pause.whilePausedFingerOn = sp(40); R.pause.snap = tail(3);
  document.getElementById('pauseResume').click(); await waitF(30);
  R.pause.afterResumeFingerStillOn = sp(25);
  window.up(CX, CY - 90); await waitF(150);

  // ── BLUR, finger still down (desktop tab-switch / iOS interruption) ───────
  R.blur = {};
  R.blur.pre = await drive();
  window.dispatchEvent(new Event('blur'));
  await waitF(120);
  R.blur.after = sp(60); R.blur.snap = tail(3);
  window.up(CX, CY - 90); await waitF(150);

  // ── ORIENTATION: the anchor is in client px of the OLD viewport ───────────
  R.rot = {};
  R.rot.pre = await drive();
  R.rot.before = tail(1)[0];
  R.rot.vpBefore = [innerWidth, innerHeight];
  return R;
});

// the rotation has to be a real viewport change, so do it from the harness
await p.setViewportSize({ width: 932, height: 430 });
const ROT = await p.evaluate(async () => {
  const F = () => window.__F;
  const waitF = (n) => new Promise(res => window.__at(F() + n, res));
  const sp = (n = 25) => { const a = window.__L.slice(-n); return a.reduce((s, r) => s + r.sp, 0) / a.length; };
  await waitF(30);
  const a = window.__L[window.__L.length - 1];
  const out = { vp: [innerWidth, innerHeight], anchor: [Math.round(a.ax), Math.round(a.ay)],
    ringOffscreen: a.ax < 0 || a.ay < 0 || a.ax > innerWidth || a.ay > innerHeight,
    speedRightAfter: sp() };
  // the finger has NOT moved on the glass. In landscape the same physical spot
  // is at transposed client coords; deliver the very next move there.
  const V3 = window.__cam.position.constructor;
  const scr = (vx, vz) => { const c = window.__cam, o = window.__voidState();
    const p0 = new V3(o.x, 0, o.z).project(c), p1 = new V3(o.x + vx, 0, o.z + vz).project(c);
    return Math.atan2(-(p1.y - p0.y) * innerHeight, (p1.x - p0.x) * innerWidth) * 180 / Math.PI; };
  const pre = window.__L.slice(-12);
  out.headingBefore = scr(pre.reduce((s, r) => s + r.vx, 0), pre.reduce((s, r) => s + r.vz, 0));
  window.move(842, 215 - 90);   // "same physical spot", transposed
  await waitF(60);
  const b2 = window.__L[window.__L.length - 1];
  out.anchorAfterMove = [Math.round(b2.ax), Math.round(b2.ay)];
  out.jumped = Math.hypot(b2.ax - a.ax, b2.ay - a.ay);
  const post = window.__L.slice(-12);
  out.headingAfter = scr(post.reduce((s, r) => s + r.vx, 0), post.reduce((s, r) => s + r.vz, 0));
  out.speedAfter = sp();
  return out;
});

console.log('\n── TWO FINGERS ────────────────────────────────────────────────');
console.log(`  driving on finger 1                : ${R.two.pre.toFixed(2)} u/s`);
console.log(`  finger 2 lands (finger 1 still on) : ${R.two.bothDown.toFixed(2)} u/s   (anchor must NOT be stolen)`);
console.log(`  finger 1 lifts, finger 2 stays on  : ${R.two.afterFirstLifts.toFixed(2)} u/s  ring=${R.two.snapA[0].on}`);
console.log(`  finger 2 now DRAGS 110 px          : ${R.two.f2Drags.toFixed(2)} u/s  ring=${R.two.snapB[0].on} nub=${R.two.snapB[0].jx},${R.two.snapB[0].jy}`);
console.log(`  finger 2 lifts and re-presses      : ${R.two.f2Fresh.toFixed(2)} u/s`);

console.log('\n── PAUSE SHEET ────────────────────────────────────────────────');
console.log(`  pause element class after tap      : "${R.pause.sheet}"`);
console.log(`  speed while paused, finger OFF     : ${R.pause.whilePausedFingerOff.toFixed(2)} u/s   (match clock advanced ${R.pause.tSame.toFixed(3)} s over 40 frames)`);
console.log(`  speed while paused, finger ON      : ${R.pause.whilePausedFingerOn.toFixed(2)} u/s  ring=${R.pause.snap[0].on}`);
console.log(`  speed right after RESUME, finger ON: ${R.pause.afterResumeFingerStillOn.toFixed(2)} u/s`);

console.log('\n── WINDOW BLUR WITH THE FINGER DOWN ───────────────────────────');
console.log(`  before ${R.blur.pre.toFixed(2)} u/s -> after blur ${R.blur.after.toFixed(2)} u/s  ring still shown=${R.blur.snap[0].on}`);

console.log('\n── ORIENTATION CHANGE HELD MID-DRAG ───────────────────────────');
console.log(`  viewport ${R.rot.vpBefore.join('x')} -> ${ROT.vp.join('x')}`);
console.log(`  joystick anchor left where it was  : ${ROT.anchor.join(',')}  offscreen=${ROT.ringOffscreen}`);
console.log(`  speed immediately after the rotate : ${ROT.speedRightAfter.toFixed(2)} u/s`);
console.log(`  next move from the SAME physical spot re-anchors the base by ${ROT.jumped.toFixed(0)} px -> ${ROT.anchorAfterMove.join(',')}`);
console.log(`  screen heading ${ROT.headingBefore.toFixed(1)} deg -> ${ROT.headingAfter.toFixed(1)} deg   speed ${ROT.speedAfter.toFixed(2)} u/s`);
await b.close();
