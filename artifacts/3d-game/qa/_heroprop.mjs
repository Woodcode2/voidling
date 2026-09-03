// Does the establishing shot's subject EXIST in the scene when the shot holds
// on it?  node qa/_heroprop.mjs <port> <world>
// The Pirate cinematographer's blocker: COPY.hero points at the Royal Mariner
// at (127, -115) and the frame at u100 shows sand. This asks the scene.
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177', WORLD = process.argv[3] || 'pirate';
const HERO = { pirate: [(8540 - 6000) * 0.05, (3700 - 6000) * 0.05], gameday: [(5930 - 6000) * 0.05, (3200 - 6000) * 0.05], lantern: [(6280 - 6000) * 0.05, (2500 - 6000) * 0.05], powder: [(6100 - 6000) * 0.05, (2350 - 6000) * 0.05] }[WORLD];
if (!HERO) { console.log(`PASS — heroprop: ${WORLD} has no hero landmark (opens on the void)`); process.exit(0); }
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log(`  [pageerror] ${e.message.split('\n')[0]}`));
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1'); localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder'); } catch {} let s = 7; Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.getElementById('btnPlay')?.click());
await p.waitForTimeout(1200);
await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`)?.click(), WORLD);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
const near = await p.evaluate(([hx, hz]) => {
  const out = [];
  for (const e of window.__edibles) {
    const m = e.mesh, d = Math.hypot(m.position.x - hx, m.position.z - hz);
    if (d > 40) continue;
    out.push({ d: +d.toFixed(1), r: +e.radius.toFixed(2), parent: !!m.parent, vis: m.visible, eaten: !!e.eaten, x: +m.position.x.toFixed(1), z: +m.position.z.toFixed(1), name: m.name || m.userData?.kind || '' });
  }
  return out.sort((a, b) => b.r - a.r).slice(0, 10);
}, HERO);
console.log(`  ${WORLD} hero (${HERO[0].toFixed(1)}, ${HERO[1].toFixed(1)}) — the ten biggest edibles within 40 units, after validateWorld and the settle pass:`);
for (const e of near) console.log(`    r${String(e.r).padStart(6)}  d${String(e.d).padStart(5)}  at (${e.x}, ${e.z})  parent ${e.parent ? 'yes' : 'NO '}  visible ${e.vis ? 'yes' : 'NO '}${e.name ? '  ' + e.name : ''}`);
const big = near.find((e) => e.r >= 8 && e.d <= 4);
await b.close();
console.log(big && big.parent && big.vis
  ? `PASS — heroprop: ${WORLD}'s landmark is in the scene at the hold point (r${big.r}, ${big.d} units off, parented and visible)`
  : `FAIL — heroprop: ${WORLD} holds its establishing shot on (${HERO[0].toFixed(1)}, ${HERO[1].toFixed(1)}) and there is no visible landmark within 4 units — ${big ? `the r${big.r} prop is ${big.parent ? 'parented' : 'DETACHED'} and ${big.vis ? 'visible' : 'HIDDEN'}` : 'nothing that size is there at all'}`);
if (!(big && big.parent && big.vis)) process.exitCode = 1;
