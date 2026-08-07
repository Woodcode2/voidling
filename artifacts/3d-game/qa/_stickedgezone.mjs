// THE ANCHOR NEAR A SCREEN EDGE.
//
//   node qa/_stickedgezone.mjs [port]
//
// The stick re-anchors only when the finger is pulled past FOLLOW = 1.7 * 64 =
// 108.8 px (prototype3d.ts:1099). Full deflection needs 64 px. So if the first
// touch lands within 64 px of an edge, the thumb can never reach full
// deflection TOWARD that edge, and the base never chases to fix it: the child
// is stuck at partial speed in that direction for as long as the drag lasts.
// This measures the speed they actually get, and how much of the screen sets
// the trap.
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
  const F = () => window.__F;
  const waitF = (n) => new Promise(res => window.__at(F() + n, res));
  const sp = (n = 20) => { const a = window.__L.slice(-n); return a.reduce((s, r) => s + r.sp, 0) / a.length; };
  const CY = Math.round(innerHeight * 0.6);
  const clear = async () => { for (const id of [1, 2, 3]) window.up(10, 10, id); await waitF(140); };
  const rows = [];
  // anchor at x = ax, then drag LEFT as far as the glass allows (clientX >= 0)
  for (const ax of [4, 12, 20, 30, 40, 52, 64, 80, 110]) {
    await clear();
    window.down(ax, CY);
    const f0 = F();
    for (let k = 1; k <= 22; k++) window.__at(f0 + k, () => window.move(0, CY));
    await waitF(80);
    const s = sp();
    const L = window.__L[window.__L.length - 1];
    rows.push({ ax, reach: ax, sp: s, nub: Math.round(Math.hypot(L.jx, L.jy)), anchor: Math.round(L.ax) });
  }
  await clear();
  window.down(215, CY);
  const f1 = F(); for (let k = 1; k <= 22; k++) window.__at(f1 + k, () => window.move(215 - 90, CY));
  await waitF(80);
  const ref = sp();
  await clear();
  return { rows, ref, vp: [innerWidth, innerHeight] };
});

const W = R.vp[0], H = R.vp[1];
console.log(`\n=== ANCHOR NEAR AN EDGE — ${W}x${H} portrait ===`);
console.log(`reference: anchored mid-screen, dragging 90 px left = ${R.ref.toFixed(2)} u/s\n`);
console.log('  anchor x   max reach   nub px   speed     % of full   base re-anchored?');
for (const r of R.rows) {
  console.log(`  ${String(r.ax).padStart(7)}   ${String(r.reach).padStart(9)}   ${String(r.nub).padStart(6)}   ${r.sp.toFixed(2).padStart(6)}   ${(100 * r.sp / R.ref).toFixed(0).padStart(8)}%   ${r.anchor !== r.ax ? 'yes -> ' + r.anchor : 'no'}`);
}
// how much of the screen is a trap for at least one direction
const band = 64;
const trapped = 1 - Math.max(0, (W - 2 * band)) * Math.max(0, (H - 2 * band)) / (W * H);
console.log(`\n  a first touch anywhere in the outer 64 px band cannot reach full deflection`);
console.log(`  toward its nearest edge: ${(100 * trapped).toFixed(0)}% of a ${W}x${H} screen`);
await b.close();
