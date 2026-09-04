// WHICH PASS EATS THE LANDMARKS? Count the big props before the match, after
// __validateWorld(), and after __settle() — the two boot passes that can retire
// a prop.  node qa/_bigprops.mjs <port> <world>
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177', WORLD = process.argv[3] || 'pirate';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
p.on('pageerror', (e) => console.log(`  [pageerror] ${e.message.split('\n')[0]}`));
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1'); localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark'); } catch {} let s = 7; Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
const big = () => p.evaluate(() => window.__edibles.filter((e) => e.radius >= 7 && e.mesh.visible && e.mesh.parent).map((e) => `r${e.radius.toFixed(1)}@${Math.round(e.mesh.position.x)},${Math.round(e.mesh.position.z)}`).sort());
const a = await big();
const v = await p.evaluate(() => window.__validateWorld?.() ?? 'no hook');
const bset = await big();
const s = await p.evaluate(() => window.__settle?.() ?? 'no hook');
const c = await big();
await b.close();
const gone = (x, y) => x.filter((e) => !y.includes(e));
console.log(`  ${WORLD}: big props (r>=7, visible, parented) built ${a.length} → after __validateWorld() ${bset.length} → after __settle() ${c.length}`);
if (gone(a, bset).length) console.log(`    validateWorld retired: ${gone(a, bset).join('  ')}`);
if (gone(bset, c).length) console.log(`    settle retired:       ${gone(bset, c).join('  ')}`);
console.log(`    settle returned: ${JSON.stringify(s)}`);
console.log(gone(a, c).length ? `FAIL — bigprops: ${WORLD} loses ${gone(a, c).length} landmark(s) at match start: ${gone(a, c).join('  ')}` : `PASS — bigprops: ${WORLD} keeps every r>=7 prop through the boot passes`);
if (gone(a, c).length) process.exitCode = 1;
