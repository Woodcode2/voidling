// REFUTE — "PIRATE BAY's opening is half as dense as the other three worlds".
// The rhythm probe counted `eatable` as a WHOLE-WORLD inventory. What a child
// experiences in the first twenty seconds is the neighbourhood around the fixed
// spawn, and the void moves at 16 u/s at START_R. So: count swallowable props
// in rings around the AUTHORED spawn, at the two radii that matter (START_R,
// and the ~1.25 the finding quotes for t=15s), per world.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'] });
const WORLDS = (process.argv[2] || 'maple,pirate,gameday,lantern').split(',');
const RINGS = [40, 60, 80, 120, 160, 240, 9999];
console.log('EAT_RATIO=1.11  START_R=0.9  void speed at start = 16 u/s (camDist 50)\n');
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try { localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:4177/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  const r = await p.evaluate((RINGS) => {
    const sp = window.__spawn();
    const out = {};
    for (const R of [0.9, 1.25, 1.6, 2.5]) {
      const gate = R * 1.11;
      const counts = RINGS.map(() => 0);
      // legal ground inside each ring, Monte Carlo, so density is comparable
      for (const e of window.__edibles) {
        const m = e.mesh; if (!m || e.eaten) continue;
        if ((e.radius || 0) > gate) continue;
        const d = Math.hypot(m.position.x - sp.x, m.position.z - sp.z);
        for (let i = 0; i < RINGS.length; i++) if (d < RINGS[i]) { counts[i]++; break; }
      }
      // cumulative
      let acc = 0; const cum = counts.map(c => (acc += c));
      out['R' + R] = cum;
    }
    // legal-ground area inside each ring, so we can quote per-100u²
    const area = RINGS.map(() => 0);
    const N = 200000, S = 560;
    for (let i = 0; i < N; i++) {
      const x = (Math.random() - 0.5) * S + sp.x * 0, z = (Math.random() - 0.5) * S;
      if (!window.__biomeAt(x, z)) continue;
      const d = Math.hypot(x - sp.x, z - sp.z);
      for (let k = 0; k < RINGS.length; k++) if (d < RINGS[k]) { area[k]++; break; }
    }
    const cell = (S * S) / N; let aa = 0; const acum = area.map(c => (aa += c * cell));
    return { sp, out, acum, total: window.__edibles.length };
  }, RINGS);
  console.log(`══ ${wid.toUpperCase()} ══ spawn (${r.sp.x.toFixed(0)}, ${r.sp.z.toFixed(0)})  ${r.total} edibles`);
  console.log('   ring     ' + RINGS.map(x => String(x === 9999 ? 'ALL' : x).padStart(7)).join(''));
  console.log('   ground u²' + r.acum.map(a => a.toFixed(0).padStart(7)).join(''));
  for (const k of Object.keys(r.out)) {
    console.log(`   ${k.padEnd(6)}cum` + r.out[k].map(x => String(x).padStart(7)).join(''));
    console.log(`     per100u²` + r.out[k].map((x, i) => (r.acum[i] > 0 ? (x / r.acum[i] * 100).toFixed(2) : '-').padStart(7)).join(''));
  }
  console.log('');
  await p.close();
}
await b.close();
