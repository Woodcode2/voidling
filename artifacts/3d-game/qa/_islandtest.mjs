// insideIsland3 vs the placement test, at the points validateWorld culls.
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177', WORLD = process.argv[3] || 'pirate';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark'); } catch {} let s = 7; Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState && !!window.__insideIsland3, null, { timeout: 400000 });
const rows = await p.evaluate(() => window.__edibles.filter((e) => e.radius >= 7 && e.mesh.visible && e.mesh.parent)
  .map((e) => ({ r: +e.radius.toFixed(1), x: Math.round(e.mesh.position.x), z: Math.round(e.mesh.position.z),
    hx: Math.round(e.home.x), hz: Math.round(e.home.z), afloat: !!e.mesh.userData.afloat,
    insidePos: !!window.__insideIsland3(e.mesh.position.x, e.mesh.position.z), insideHome: !!window.__insideIsland3(e.home.x, e.home.z) })));
await b.close();
console.log(`  ${WORLD}: r>=7 props — insideIsland3 at the mesh position and at e.home (the value validateWorld tests)`);
for (const r of rows) console.log(`    r${String(r.r).padStart(5)} at (${String(r.x).padStart(5)},${String(r.z).padStart(5)})  home (${String(r.hx).padStart(5)},${String(r.hz).padStart(5)})  inside(pos) ${r.insidePos ? 'yes' : 'NO '}  inside(home) ${r.insideHome ? 'yes' : 'NO '}  afloat ${r.afloat ? 'yes' : 'no'}`);
const bad = rows.filter((r) => !r.insideHome && !r.afloat);
console.log(bad.length ? `FAIL — islandtest: ${bad.length} of ${rows.length} landmark(s) sit where insideIsland3 says there is no island; validateWorld's off-island cull retires them at match start` : `PASS — islandtest: every r>=7 prop is inside the island by the same test validateWorld uses`);
if (bad.length) process.exitCode = 1;
