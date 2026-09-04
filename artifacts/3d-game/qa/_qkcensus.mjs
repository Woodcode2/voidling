// What kinds does each world actually tag its props with? (userData.qk)
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const w of process.argv.slice(3)) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark'); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${w}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  const c = await p.evaluate(() => { const m = {}; for (const e of window.__edibles) { const k = e.mesh.userData?.qk || '(none)'; m[k] = (m[k] || 0) + 1; } return m; });
  console.log(`  ${w}: ${Object.entries(c).sort((a, d) => d[1] - a[1]).map(([k, n]) => `${k} ${n}`).join('  ')}`);
  await p.close();
}
await b.close();
