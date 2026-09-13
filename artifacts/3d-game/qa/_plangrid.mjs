// DOES THE BIOME PLAN REACH THE SCENE — the deterministic version.
//
// The first attempt at this counted heads in the crowd, which cannot work: the
// island re-rolls its prop scatter and its crowd placement every load, so the
// same build gave 81 and 91 on two runs and a one-sample comparison across builds
// says nothing at all. (That is the same trap the day-9 cost table records: single
// runs of one build came back 233, 269 and 274 draw calls.)
//
// So it reads the PLAN, which is fixed: __biomeAt at each of the 36 block centres,
// against island.ts's MAPLE_PLAN verbatim. If planGrid() ever returns the wrong
// world's plan — or an empty one — the grid printed here stops matching.
//
//   node qa/_plangrid.mjs [port] [world]
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177';
const WORLD = process.argv[3] || 'maple';
const MAPLE_PLAN = [
  ['forest','forest','forest','farm','forest','forest'],
  ['fair','fair','fair','farm','farm','farm'],
  ['strip','cozy','downtown','plaza','park','park'],
  ['strip','cozy','downtown','downtown','campus','campus'],
  ['strip','cozy','cozy','cozy','campus','campus'],
  ['beach','beach','beach','beach','beach','beach'],
];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
p.on('pageerror', (e) => console.log('  [pageerror] ' + e.message.split('\n')[0]));
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try { localStorage.clear();
  localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1'); localStorage.setItem('voidMute','1');
  localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern,powder,skylark');
} catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}&manual=1`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__menuState && window.__menuState().menuMode, null, { timeout: 420000 });
await p.waitForTimeout(3000);
const grid = await p.evaluate(() => {
  const SCALE = 0.05, CX = 6000, w = (v) => (v - CX) * SCALE;
  const bc = (g) => 925 + 1710 * g + 800;
  const out = [];
  for (let gy = 0; gy < 6; gy++) {
    const row = [];
    for (let gx = 0; gx < 6; gx++) row.push(window.__biomeAt(w(bc(gx)), w(bc(gy))));
    out.push(row);
  }
  return out;
});
await b.close();
for (const r of grid) console.log('  ' + r.map((c) => String(c).padEnd(9)).join(''));
if (WORLD !== 'maple') { console.log(`\n(${WORLD} has its own plan — printed, not judged)`); process.exit(0); }
// ONLY THE CELLS THAT ARE ON LAND. biomeAt returns null off the coastline, and
// the island is a BLOB on a square grid, so the four corner block centres are in
// the sea by construction. The first run of this probe called those four a FAIL
// and it was the probe that was wrong, not the code — the expectation is derived
// here from island.ts's own silhouette maths rather than asserted from a square.
const ISLAND_CTRL = [
  [980,3200],[580,5900],[1000,8900],[2100,10950],[4500,11550],
  [6600,11650],[8300,11350],[9800,10150],[11400,8700],[11550,6200],
  [11050,3750],[9350,400],[6000,150],[2600,500]];
const sil = (steps = 12) => { const P = ISLAND_CTRL, n = P.length, out = [];
  for (let i = 0; i < n; i++) { const p0 = P[i], p1 = P[(i+1)%n], p2 = P[(i+2)%n];
    const m0 = [(p0[0]+p1[0])/2, (p0[1]+p1[1])/2], m1 = [(p1[0]+p2[0])/2, (p1[1]+p2[1])/2];
    for (let s = 0; s < steps; s++) { const t = s/steps, it = 1-t;
      out.push([it*it*m0[0] + 2*it*t*p1[0] + t*t*m1[0],
                it*it*m0[1] + 2*it*t*p1[1] + t*t*m1[1]]); } }
  return out; };
const SIL = sil();
const onLand = (x, y) => { let c = false;
  for (let i = 0, j = SIL.length - 1; i < SIL.length; j = i++) {
    const [xi, yi] = SIL[i], [xj, yj] = SIL[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; }
  return c; };
const bcw = (g) => 925 + 1710 * g + 800;

const wrong = [], sea = [];
for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 6; gx++) {
  const land = onLand(bcw(gx), bcw(gy));
  if (!land) {
    sea.push(`(${gx},${gy})`);
    // off the coast, a biome is the WRONG answer — a named district in the sea is
    // how the ferris wheel ended up offshore in the first place
    if (grid[gy][gx] !== null) wrong.push(`(${gx},${gy}) is in the SEA but reports "${grid[gy][gx]}"`);
    continue;
  }
  if (grid[gy][gx] !== MAPLE_PLAN[gy][gx]) wrong.push(`(${gx},${gy}) ${grid[gy][gx]} != ${MAPLE_PLAN[gy][gx]}`);
}
console.log(`\n${36 - sea.length} of 36 block centres are on land; ${sea.length} in the sea: ${sea.join(' ')}`);
console.log(wrong.length
  ? `FAIL — ${wrong.length} cell(s) disagree: ${wrong.slice(0, 6).join(', ')}`
  : `PASS — every on-land block centre reports the biome MAPLE_PLAN assigns it, and every off-coast one reports none`);
process.exit(wrong.length ? 1 : 0);
