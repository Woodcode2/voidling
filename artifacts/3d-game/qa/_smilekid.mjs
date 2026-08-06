// REFUTATION PROBE — does the hero's smile actually switch off during play?
//
// Finds the real smile group and the real maw group by geometry signature
// inside window.__scene, then samples visible/scale over a driven match,
// stamped against __matchState().t. Renders are left ON for a slice so the
// mood engine and the per-frame update loop run exactly as shipped.
import { chromium } from 'playwright';
import fs from 'node:fs';
const WORLD = process.argv[2] || 'maple';
const SECS = Number(process.argv[3] || 90);

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto(`http://127.0.0.1:4177/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });

const found = await p.evaluate(() => {
  let smile = null, maw = null;
  window.__scene.traverse((o) => {
    const g = o.geometry && o.geometry.parameters;
    if (!g) return;
    // smile lip: CircleGeometry(0.165, 40, 0, PI)
    if (Math.abs(g.radius - 0.165) < 1e-6 && Math.abs((g.thetaLength ?? 0) - Math.PI) < 1e-6) smile = o.parent;
    // maw dark: CircleGeometry(0.2, 56) sitting at y=-0.3 in the face group
    if (Math.abs(g.radius - 0.2) < 1e-6 && g.segments === 56 && o.parent && Math.abs(o.parent.position.y + 0.3) < 1e-6) maw = o.parent;
  });
  window.__smileG = smile; window.__mawG = maw;
  return { smile: !!smile, maw: !!maw, smileKids: smile ? smile.children.length : -1,
           mawKids: maw ? maw.children.length : -1 };
});
console.log('rig found:', JSON.stringify(found));

await p.evaluate((secs) => {
  window.__S = [];
  const t0 = window.__matchState().t;
  const id = setInterval(() => {
    const ms = window.__matchState(); const vs = window.__voidState();
    window.__S.push({ t: +ms.t.toFixed(2), r: +vs.r.toFixed(2),
      vis: !!window.__smileG.visible, mo: +window.__mawG.scale.x.toFixed(4) });
    if (ms.t - t0 > secs) clearInterval(id);
  }, 60);
  // SLOPPY autopilot: a seven-year-old, not a solver — re-aims every ~1.1s, and
  // one aim in three is a random heading. Models the long approach windows a
  // real child spends with food in the well and nothing yet eaten.
  const cv = document.querySelector('canvas');
  const cx = innerWidth / 2, cy = innerHeight / 2;
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
  let aim = { dx: 1, dz: 0 }, nextAim = 0, seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const tick = () => {
    const now = performance.now();
    if (now > nextAim) {
      nextAim = now + 900 + rnd() * 500;
      const vs = window.__voidState(); let best = null, bd = 1e9;
      for (const e of window.__edibles) {
        if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
        const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
        const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = { dx, dz }; }
      }
      if (rnd() < 0.34 || !best) { const a = rnd() * 6.283; aim = { dx: Math.cos(a), dz: Math.sin(a) }; }
      else aim = best;
    }
    const m = Math.hypot(aim.dx, aim.dz) || 1;
    dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
      clientX: cx + aim.dx / m * 110, clientY: cy + aim.dz / m * 110, bubbles: true }));
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}, SECS);

await p.waitForFunction((secs) => {
  const s = window.__S; return s.length && s[s.length - 1].t - s[0].t > secs - 0.5;
}, SECS, { timeout: 1800000 });

const S = await p.evaluate(() => window.__S);
const span = S[S.length - 1].t - S[0].t;
// sample weights: each sample covers the match-time gap to the next one
let hid = 0, tot = 0, runs = [], cur = 0;
for (let i = 1; i < S.length; i++) {
  const w = S[i].t - S[i - 1].t; if (w <= 0 || w > 3) continue;
  tot += w;
  if (!S[i].vis) { hid += w; cur += w; }
  else { if (cur > 0) runs.push(cur); cur = 0; }
}
if (cur > 0) runs.push(cur);
runs.sort((a, b) => b - a);
const moVals = S.map(s => s.mo).sort((a, b) => a - b);
const q = (f) => moVals[Math.floor(f * (moVals.length - 1))];
console.log(`\n══ ${WORLD.toUpperCase()} ══ ${S.length} samples over ${span.toFixed(1)}s match time`);
console.log(`SMILE HIDDEN: ${(hid / tot * 100).toFixed(1)}% of match time  (${runs.length} separate hides)`);
console.log(`  hide runs (s): ${runs.slice(0, 12).map(x => x.toFixed(2)).join(' ')}`);
console.log(`  longest ${((runs[0] ?? 0)).toFixed(2)}s   median ${((runs[Math.floor(runs.length / 2)] ?? 0)).toFixed(2)}s`);
console.log(`  mo percentiles: p10 ${q(0.1).toFixed(3)}  p50 ${q(0.5).toFixed(3)}  p90 ${q(0.9).toFixed(3)}  max ${moVals[moVals.length-1].toFixed(3)}`);
const near = S.filter(s => s.mo >= 0.24 && s.mo < 0.25).length;
console.log(`  samples parked in [0.24,0.25) — just under the cut: ${near} (${(near/S.length*100).toFixed(1)}%)`);
const at26 = S.filter(s => s.mo >= 0.255 && s.mo <= 0.265).length;
console.log(`  samples parked at the hungry target 0.26: ${at26} (${(at26/S.length*100).toFixed(1)}%)`);

// ── THE COUNTERFACTUAL ────────────────────────────────────────────────────
// Time the smile is off ONLY because of the hungry mood's 0.26 target, i.e.
// the band the proposed fix would hand back. Everything above ~0.30 is the
// chomp envelope, where hiding the smile is the intended behaviour.
let band = 0, chomp = 0, bandRuns = [], bcur = 0;
for (let i = 1; i < S.length; i++) {
  const w = S[i].t - S[i - 1].t; if (w <= 0 || w > 3) continue;
  if (S[i].mo >= 0.25 && S[i].mo < 0.30) { band += w; bcur += w; }
  else { if (bcur > 0) bandRuns.push(bcur); bcur = 0; if (S[i].mo >= 0.30) chomp += w; }
}
if (bcur > 0) bandRuns.push(bcur);
bandRuns.sort((a, b2) => b2 - a);
console.log(`\n  ATTRIBUTION over ${tot.toFixed(1)}s:`);
console.log(`    hidden by the CHOMP envelope (mo >= 0.30): ${(chomp / tot * 100).toFixed(1)}%`);
console.log(`    hidden ONLY by the hungry target (0.25 <= mo < 0.30): ${(band / tot * 100).toFixed(1)}%`);
console.log(`    that band's runs (s): ${bandRuns.slice(0, 10).map(x => x.toFixed(2)).join(' ')}  longest ${(bandRuns[0] ?? 0).toFixed(2)}`);
fs.writeFileSync(`qa-out/smilekid-${WORLD}.json`, JSON.stringify(S));
await b.close();
