// THE STRAY FIRST TOUCH. Every pixel of a VOIDLING match except a 44x44 quit
// button is live canvas, and prototype3d.ts:1141 gives the joystick to
// WHICHEVER pointer arrives first and refuses every other pointer until that
// one lifts. This measures what a child gets when the first thing to touch the
// glass is not the thumb they intend to steer with.
//
//   node qa/_palm.mjs [port]
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
  const sp = (n = 25) => { const a = window.__L.slice(-n); return a.reduce((s, r) => s + r.sp, 0) / a.length; };
  const drag = async (id, fromX, fromY, toX, toY, pressFirst) => {
    if (pressFirst) window.down(fromX, fromY, id);
    const f0 = F();
    for (let k = 1; k <= 20; k++) window.__at(f0 + k, () => window.move(toX, toY, id));
    await waitF(70);
    return sp(20);
  };
  const clear = async () => { for (const id of [1, 2, 3, 4, 5, 6, 7, 8, 9]) window.up(CX, CY, id); await waitF(150); };
  const out = [];
  // where a real hand rests on a 430x932 portrait phone held two-handed
  const SPOTS = [['bottom-left palm', 26, innerHeight - 22], ['bottom-right palm', innerWidth - 26, innerHeight - 22],
    ['left thumb base', 14, innerHeight - 190], ['centre brush', CX, CY - 260]];
  for (const [name, sx, sy] of SPOTS) {
    await clear();
    window.down(sx, sy, 2);                     // the stray lands FIRST and stays put
    await waitF(20);
    const ring = window.__L[window.__L.length - 1];
    const steer = await drag(3, CX, CY, CX, CY - 90, true);   // the real driving thumb
    // the stray lifts; the driving thumb is still down and still dragging
    window.up(sx, sy, 2);
    const afterLift = await drag(3, CX, CY, CX, CY - 90, false);
    // the child gives up, lifts the driving thumb, re-presses
    window.up(CX, CY - 90, 3); await waitF(40);
    const afterRepress = await drag(4, CX, CY, CX, CY - 90, true);
    window.up(CX, CY - 90, 4);
    out.push({ name, sx, sy, ringAt: [Math.round(ring.ax), Math.round(ring.ay)],
      ringShown: ring.on, steer, afterLift, afterRepress });
  }
  await clear();
  // the reference: nothing stray, one thumb
  const ok = await drag(1, CX, CY, CX, CY - 90, true);
  return { out, ok, vp: [innerWidth, innerHeight] };
});

console.log(`\n=== STRAY FIRST TOUCH — maple, ${R.vp.join('x')} portrait ===`);
console.log(`reference: a clean single-thumb drag steers at ${R.ok.toFixed(2)} u/s\n`);
for (const r of R.out) {
  console.log(`stray touch at ${r.name} (${r.sx},${r.sy})`);
  console.log(`   joystick ring appears under the STRAY, at ${r.ringAt.join(',')} (shown=${r.ringShown})`);
  console.log(`   driving thumb drags 90 px      : ${r.steer.toFixed(2)} u/s`);
  console.log(`   stray lifts, thumb keeps dragging: ${r.afterLift.toFixed(2)} u/s`);
  console.log(`   thumb lifts and re-presses     : ${r.afterRepress.toFixed(2)} u/s\n`);
}
await b.close();
