// WHAT FACE IS THE HERO ACTUALLY WEARING, FOR HOW LONG?
//
//   node qa/_mood.mjs [world] [dpr]
//
// The mood engine has eight states (void3d.ts:756-768) but the game asks for
// exactly one per frame, and the resolution order at prototype3d.ts:4217 puts
// `scared` ABOVE `frenzy` and `hungry` — so a rival 16 units away that is 15%
// bigger silences every happy face in the table. Nobody has measured which
// faces a real three-minute match contains.
//
// There is no mood getter, so this reads the engine's OUTPUT off the face
// meshes, found by their geometry (no source change, no rebuild):
//   brows   PlaneGeometry(0.32, 0.09)  opacity = mp.brow  (0 ONLY in cruise)
//   sweat   PlaneGeometry(0.30, 0.30)  opacity = mp.sweat (scared / hurt only)
//   zzz     PlaneGeometry(1.15, 1.15)  opacity = mp.zzz   (sleepy only)
// Those are the pixels the child sees, whatever the state machine calls them.
import { chromium } from 'playwright';

const WORLD = process.argv[2] || 'maple';
const DPR = Number(process.argv[3] || 1);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: DPR });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch { /* private mode */ } });
await p.goto(`http://127.0.0.1:4177/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show')
  .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 900000 });

await p.evaluate(() => {
  const near = (a, x) => Math.abs(a - x) < 0.001;
  let brow = null, sweat = null, zzz = null;
  window.__scene.traverse((o) => {
    const pm = o.geometry?.parameters;
    if (!o.isMesh || !pm || pm.width === undefined) return;
    if (near(pm.width, 0.32) && near(pm.height, 0.09)) brow = o.material;
    if (near(pm.width, 0.30) && near(pm.height, 0.30)) sweat = o.material;
    if (near(pm.width, 1.15) && near(pm.height, 1.15)) zzz = o.material;
  });
  window.__mood = { found: { brow: !!brow, sweat: !!sweat, zzz: !!zzz },
    n: 0, cruise: 0, sweating: 0, sleepy: 0, last: -1, series: [] };
  const tick = () => {
    const st = window.__matchState?.();
    const M = window.__mood;
    if (st && st.t > 1 && st.t < 179 && brow) {
      M.n++;
      if (brow.opacity < 0.15) M.cruise++;           // blank face
      if (sweat && sweat.opacity > 0.5) M.sweating++;
      if (zzz && zzz.opacity > 0.35) M.sleepy++;
      if (st.t - M.last >= 10) {
        M.last = st.t;
        M.series.push([+st.t.toFixed(0), +brow.opacity.toFixed(2),
          +(sweat ? sweat.opacity : -1).toFixed(2), +(zzz ? zzz.opacity : -1).toFixed(2)]);
      }
    }
    requestAnimationFrame(tick);
  };
  tick();
});

await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 176, null, { timeout: 3000000 });
const M = await p.evaluate(() => window.__mood);
console.log(`parts found: ${JSON.stringify(M.found)}   frames sampled: ${M.n}`);
if (M.n) {
  const pct = (k) => `${((M[k] / M.n) * 100).toFixed(1)}%`;
  console.log(`CRUISE (brows off, blank): ${pct('cruise')}`);
  console.log(`SWEATING (scared/hurt):    ${pct('sweating')}`);
  console.log(`SLEEPY (zzz):              ${pct('sleepy')}`);
  console.log('t,brow,sweat,zzz');
  for (const r of M.series) console.log(r.join(','));
}
await b.close();
