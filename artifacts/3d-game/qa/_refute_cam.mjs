// REFUTATION PROBE for the "hero probes photograph a camera that has not
// arrived" finding. Measures, per radius:
//   - the harness's real-time ratio while the wait is happening
//   - camD immediately after __setVoidR, after the probes' own fixed wait,
//     and once actually settled
//   - the law's settled value, for comparison
// and separately asks whether any .vb/.vf bubble overlaps portrait.mjs's crop.
import { chromium } from 'playwright';

const WORLD = process.argv[2] || 'maple';
const WAIT = Number(process.argv[3] || 2600);
const RS = process.argv.slice(4).map(Number).filter((n) => n > 0);
const radii = RS.length ? RS : [3, 7, 12];

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch { /* private mode */ } });
const t0 = Date.now();
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
console.log(`entered match after ${((Date.now() - t0) / 1000).toFixed(0)}s wall`);

const probe = () => p.evaluate(() => {
  const c = window.__cam, v = window.__voidState();
  const camD = Math.hypot(c.position.x - v.x, c.position.y - 0, c.position.z - v.z);
  return { camD: +camD.toFixed(1), t: +(window.__matchState().t).toFixed(3), r: +v.r.toFixed(2) };
});
const law = (R) => Math.min(340, Math.max(26, 38 * Math.pow(R / 0.9, 0.82)));

for (const r of radii) {
  const w0 = Date.now();
  const before = await probe();
  await p.evaluate((rr) => window.__setVoidR(rr), r);
  const at0 = await probe();
  await p.waitForTimeout(WAIT);
  const atWait = await probe();
  // now poll until the camera stops moving by more than 0.04 units
  let prev = atWait.camD, settled = atWait, polls = 0;
  for (let i = 0; i < 400; i++) {
    await p.waitForTimeout(1500);
    const s = await probe(); polls++;
    if (Math.abs(s.camD - prev) < 0.04) { settled = s; break; }
    prev = s.camD; settled = s;
  }
  const dtSim = atWait.t - at0.t, dtWall = (Date.now() - w0) / 1000;
  console.log(`r=${String(r).padStart(4)}  law=${law(r).toFixed(1)}` +
    `  camD before=${before.camD}  after ${WAIT}ms wait=${atWait.camD}` +
    `  settled=${settled.camD} (after ${polls} extra polls, matchT ${settled.t})`);
  console.log(`        sim time spent in the ${WAIT}ms wait = ${dtSim.toFixed(3)}s` +
    `  => ratio ${(dtSim / (WAIT / 1000)).toFixed(4)}x realtime` +
    `  |  convergence achieved ${(100 * (atWait.camD - at0.camD) / Math.max(1e-6, law(r) - at0.camD)).toFixed(1)}%` +
    `  |  apparent size error ${(law(r) / atWait.camD).toFixed(2)}x too big`);
}

// ── do bubbles land on the subject? ─────────────────────────────────────────
const S = 620;
const crop = { x: (430 - S / 3) / 2, y: 932 / 2 - S / 6 - 40, w: S / 3, h: S / 3 };
console.log(`\nportrait crop rect (CSS px): x ${crop.x.toFixed(0)}..${(crop.x + crop.w).toFixed(0)}  y ${crop.y.toFixed(0)}..${(crop.y + crop.h).toFixed(0)}`);
let hits = 0, seen = 0, samples = 0;
for (let i = 0; i < 40; i++) {
  await p.waitForTimeout(1500);
  const res = await p.evaluate((c) => {
    const els = [...document.querySelectorAll('.vb,.vf')];
    const vis = els.filter((e) => {
      const st = getComputedStyle(e);
      return st.display !== 'none' && st.visibility !== 'hidden' && +st.opacity > 0.05;
    });
    const over = vis.filter((e) => {
      const r = e.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      return r.right > c.x && r.left < c.x + c.w && r.bottom > c.y && r.top < c.y + c.h;
    }).map((e) => { const r = e.getBoundingClientRect(); return { cls: e.className, x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), txt: (e.textContent || '').slice(0, 24) }; });
    return { nAll: els.length, nVis: vis.length, over };
  }, crop);
  samples++; seen += res.nVis; hits += res.over.length;
  if (res.over.length) console.log(`  sample ${i}: ${res.over.length} bubble(s) INSIDE the portrait crop  ${JSON.stringify(res.over)}`);
}
console.log(`\nbubbles: ${samples} samples, ${seen} visible-bubble sightings, ${hits} of them inside the crop`);
await b.close();
