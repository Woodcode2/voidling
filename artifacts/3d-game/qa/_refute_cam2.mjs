// THE MONEY SHOT. At each radius: photograph the hero the way portrait.mjs
// does (fixed 2600ms wall wait after __setVoidR), then wait on SIMULATION time
// until the camera has genuinely converged, and photograph again. Print camD
// and the hero's on-screen pixel radius for both, plus the law's value.
//
// Also tests the finding's proposed fix — "poll |cam - void| until it stops
// changing by more than 0.04" — against the sim-time wait, because a software
// renderer that stalls for a poll interval fakes a settle.
import { chromium } from 'playwright';
import fs from 'node:fs';

const WORLD = process.argv[2] || 'maple';
const RS = process.argv.slice(3).map(Number).filter((n) => n > 0);
const radii = RS.length ? RS : [3, 12];
const SIMWAIT = 6;   // seconds of MATCH time: ~10 time constants of 1/1.6s
fs.mkdirSync('qa-out/refute', { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch { /* private mode */ } });
await p.goto(`http://127.0.0.1:4177/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show')
  .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
const tap = async (sel) => {
  await p.waitForSelector(sel, { timeout: 300000 });
  await p.evaluate((s) => document.querySelector(s).click(), sel);
};
await tap('#btnPlay'); await p.waitForTimeout(2500);
await tap(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 5, null, { timeout: 1800000 });
await p.addStyleTag({ content: '#news,#hud,#stageBar,.vb,.vf,#btnHome,#coins,#rank{opacity:0!important}' });

const probe = () => p.evaluate(() => {
  const c = window.__cam, v = window.__voidState();
  const camD = Math.hypot(c.position.x - v.x, c.position.y, c.position.z - v.z);
  const H = window.innerHeight, k = 2 * Math.tan(c.fov * Math.PI / 360);
  return { camD: +camD.toFixed(1), pxR: +((H / (camD * k)) * v.r).toFixed(1),
    t: +window.__matchState().t.toFixed(3), r: +v.r.toFixed(3) };
});
const law = (R) => Math.min(340, Math.max(26, 38 * Math.pow(R / 0.9, 0.82)));
const S = 620;
const clip = { x: (430 - S / 3) / 2, y: 932 / 2 - S / 6 - 40, width: S / 3, height: S / 3 };

for (const r of radii) {
  await p.evaluate((rr) => window.__setVoidR(rr), r);
  const at0 = await probe();

  // (a) exactly what portrait.mjs does
  await p.waitForTimeout(2600);
  const fixed = await probe();
  await p.screenshot({ path: `qa-out/refute/${WORLD}-r${r}-FIXEDWAIT.png`, clip });

  // (b) the finding's proposed fix: poll until |Δ camD| < 0.04
  let prev = fixed.camD, pollN = 0, pollRes = fixed;
  for (let i = 0; i < 60; i++) {
    await p.waitForTimeout(1200); pollN++;
    const s = await probe();
    if (Math.abs(s.camD - prev) < 0.04) { pollRes = s; break; }
    prev = s.camD; pollRes = s;
  }

  // (c) the honest wait: SIMULATION time
  const tEnd = at0.t + SIMWAIT;
  await p.waitForFunction((te) => window.__matchState().t >= te, tEnd, { timeout: 1800000, polling: 1000 });
  const settled = await probe();
  await p.screenshot({ path: `qa-out/refute/${WORLD}-r${r}-SETTLED.png`, clip });

  console.log(`\nr=${r}  (voidling.radius actually ${settled.r})   law says camD ${law(r).toFixed(1)}`);
  console.log(`  at __setVoidR      camD ${String(at0.camD).padStart(6)}  pxR ${String(at0.pxR).padStart(6)}  matchT ${at0.t}`);
  console.log(`  portrait.mjs shot  camD ${String(fixed.camD).padStart(6)}  pxR ${String(fixed.pxR).padStart(6)}  matchT ${fixed.t}   (${(fixed.t - at0.t).toFixed(3)}s of sim in a 2.6s wall wait)`);
  console.log(`  "poll until <0.04" camD ${String(pollRes.camD).padStart(6)}  pxR ${String(pollRes.pxR).padStart(6)}  matchT ${pollRes.t}   (declared settled after ${pollN} polls)`);
  console.log(`  SIM-TIME settled   camD ${String(settled.camD).padStart(6)}  pxR ${String(settled.pxR).padStart(6)}  matchT ${settled.t}`);
  console.log(`  => the fixed-wait portrait shows the void ${(settled.camD / fixed.camD).toFixed(2)}x LARGER than settled play` +
    `  (pxR ${fixed.pxR} vs ${settled.pxR}; crop is ${clip.width.toFixed(0)} CSS px wide)`);
}
await b.close();
