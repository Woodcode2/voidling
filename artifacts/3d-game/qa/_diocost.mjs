// ── WHAT THE DIORAMA COSTS, IN A UNIT THAT IS REAL ──────────────────────────
//
// Day 9 halved the menu frame and that saving may not be given back, so the
// diorama needs an honest number before it can ship. There was none, and the two
// ways of getting it wrong are both already recorded in this suite:
//
//   1. docs/DIORAMA-BRIEF.md §11.4 — an early cost table priced the menu as ONE
//      direct renderer.render(). That call carries no shadow pass
//      (shadowMap.autoUpdate is false) and no composer: about 54% of the frame.
//   2. §14.4 — __menuState().drawCalls reads 1 on every world, and not through
//      sampling error: the max over 40 frames is still 1. On a rung carrying
//      bloom the composer makes ~15 renderer.render() calls per animation frame
//      and info.autoReset resets the counters inside every one, so a naive read
//      returns the cost of the LAST post pass.
//
// I reported (2) as a new finding. It is not: qa/menucost.mjs's header has said
// it since day 1, and that probe already solves it — autoReset off, animate()'s
// own frame count as the unit, both shadow parities sampled. The instrument
// existed and I did not look for it before saying none did.
//
// So this borrows menucost's method verbatim and changes only the axis: instead
// of A/B-ing day 9's savings with __menuOptim, it A/Bs the diorama with __dio,
// ON ONE PAGE LOAD. That last part is the whole design — the island re-rolls its
// prop scatter and its stage azimuth every load, so two loads are two different
// worlds and single runs of ONE build have come back 233, 269 and 274 calls a
// frame. Any difference smaller than that spread, taken across loads, is a claim
// about the scatter.
//
//   node qa/_diocost.mjs [port] [world]
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
const WORLDS = process.argv[3] ? [process.argv[3]] : ['maple', 'pirate', 'gameday', 'lantern', 'powder', 'skylark'];
const FRAMES = 30;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

/** Wait for N of animate()'s OWN frames — not rAFs, not renders. The menu skips
 *  the DRAW on alternate frames, so a per-frame read lands half the time on a
 *  frame with no render in it; and the composer makes many renders per frame. */
const waitFrames = async (p, n) => p.evaluate((want) => new Promise((res) => {
  const f0 = window.__frameInfo().animFrames;
  const tick = () => {
    const d = window.__frameInfo().animFrames - f0;
    if (d >= want) return res(d);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}), n);

const sample = async (p, frames) => {
  await p.evaluate(() => { window.__renderer.info.autoReset = false; window.__renderer.info.reset(); });
  const got = await waitFrames(p, frames);
  const r = await p.evaluate(() => { const f = window.__frameInfo();
    return { calls: f.calls, tris: f.tris, shadows: f.shadows, bloom: f.bloom }; });
  await p.evaluate(() => { window.__renderer.info.autoReset = true; });
  const n = Math.max(1, got);
  return { calls: Math.round(r.calls / n), tris: Math.round(r.tris / n), frames: n,
    shadows: r.shadows, bloom: r.bloom };
};

const rows = [];
try {
for (const w of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => console.log(`  [pageerror ${w}] ` + e.message.split('\n')[0]));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try { localStorage.clear();
    localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1'); localStorage.setItem('voidMute','1');
    localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern,powder,skylark'); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${w}&manual=1`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__menuState && window.__menuState().menuMode, null, { timeout: 420000 });
  if (!(await p.evaluate(() => typeof window.__dio === 'function'))) {
    console.log(`  ${w}: __dio is missing — the diorama cannot be isolated on one load`);
    await p.close(); continue;
  }
  await p.waitForTimeout(20000);   // the GLB landmarks, before anything is counted

  // OFF FIRST, then ON, then OFF AGAIN. The third sample is the control on the
  // control: if it does not come back near the first, the page drifted under the
  // measurement and the middle number means nothing.
  await p.evaluate(() => window.__dio(false));
  await p.waitForTimeout(3000);
  const off1 = await sample(p, FRAMES);
  await p.evaluate(() => window.__dio(true));
  await p.waitForTimeout(3000);
  const on = await sample(p, FRAMES);
  await p.evaluate(() => window.__dio(false));
  await p.waitForTimeout(3000);
  const off2 = await sample(p, FRAMES);

  const drift = off1.calls ? Math.abs(off2.calls - off1.calls) / off1.calls : 1;
  rows.push({ w, off1, on, off2, drift });
  console.log(`  ${w.padEnd(8)} off ${String(off1.calls).padStart(4)} -> dio ${String(on.calls).padStart(4)} -> off ${String(off2.calls).padStart(4)} calls/frame   (${(on.calls / Math.max(1, off1.calls)).toFixed(2)}x)   drift ${(drift * 100).toFixed(1)}%   frames ${off1.frames}/${on.frames}/${off2.frames}`);
  await p.close();
}
} finally { await b.close(); }

console.log('\nworld      menu   diorama   ratio   tris menu -> diorama      control drift');
let shaky = 0;
for (const r of rows) {
  if (r.drift > 0.10) shaky++;
  console.log(`${r.w.padEnd(9)} ${String(r.off1.calls).padStart(5)} ${String(r.on.calls).padStart(9)}   ${(r.on.calls / Math.max(1, r.off1.calls)).toFixed(2)}x   ${String(r.off1.tris).padStart(8)} -> ${String(r.on.tris).padStart(8)}   ${(r.drift * 100).toFixed(1)}%${r.drift > 0.10 ? '  <-- UNSTABLE, do not quote this row' : ''}`);
}
if (rows.length) {
  const ok = rows.filter((r) => r.drift <= 0.10);
  if (ok.length) {
    const mean = ok.reduce((s, r) => s + r.on.calls / Math.max(1, r.off1.calls), 0) / ok.length;
    console.log(`\nthe diorama frame costs ${mean.toFixed(2)}x today's menu frame, over ${ok.length} stable world(s)`);
  }
  console.log(shaky ? `${shaky} world(s) drifted more than 10% between the two control samples` : 'every control sample returned within 10%');
}
