// SCRATCH — boot phase timeline from the scratch _bt marks. N reps, MIN per
// phase (this box is shared; min is the least-contended sample).
import { chromium } from 'playwright';
const WORLDS = (process.argv[2] || 'maple,pirate,gameday,lantern,powder,skylark').split(',');
const PORT = process.argv[3] || 4188;
const REPS = +(process.argv[4] || 3);
for (const w of WORLDS) {
  const runs = [];
  for (let i = 0; i < REPS; i++) {
    const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox', '--enable-precise-memory-info'] });
    const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
    await p.goto(`http://127.0.0.1:${PORT}/?w=${w}`, { waitUntil: 'commit' });
    await p.waitForFunction(() => window.__bt && window.__bt.some(x => x[0] === 'post-first-render'), null, { timeout: 400000 });
    runs.push(await p.evaluate(() => window.__bt));
    await b.close();
  }
  const names = runs[0].map(r => r[0]);
  console.log(`\n=== ${w.toUpperCase()} — min of ${REPS} ===`);
  console.log('  phase                          min ms   (all reps)');
  for (let i = 1; i < names.length; i++) {
    const ds = runs.map(r => (r[i] ? r[i][1] : NaN) - (r[i-1] ? r[i-1][1] : NaN)).map(Math.round);
    console.log(`  ${(names[i-1] + ' → ' + names[i]).padEnd(46)} ${String(Math.min(...ds)).padStart(6)}   [${ds.join(', ')}]`);
  }
  const tot = runs.map(r => Math.round(r.find(x=>x[0]==='post-createIsland')[1]));
  const fr = runs.map(r => Math.round(r.find(x=>x[0]==='post-first-render')[1]));
  console.log(`  TOTAL nav → island built                       ${Math.min(...tot)}   [${tot.join(', ')}]`);
  console.log(`  TOTAL nav → first frame painted (SWR-inflated) ${Math.min(...fr)}   [${fr.join(', ')}]`);
}
