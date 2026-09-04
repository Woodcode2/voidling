// CAN A VOID OF EVERY SIZE STILL CROSS ITS OWN ISLAND?
//
//   node qa/traverse.mjs [port] [world ...]
//
// The genre's one promise is that growing makes the world stop mattering, and
// the containment rule broke it: the coast margin (how much of the body must
// stay on land) OUTGREW the authored walkways, so at VOID TITAN Pirate Bay's
// main path severed at the bay-mouth isthmus — 15.0 units of land against a
// rule demanding 18.5. The tuning comment said "a big one is allowed to span",
// and it had been verified against Maple's corridors and never Pirate's.
//
// This gate asks the game its own rule (window.__solidAt — the exact predicate
// the hero moves by, not a replica that drifts) and measures CONNECTIVITY:
// flood-fill the walkable cells from the spawn at each radius and compare the
// reachable area against the small-void baseline. A severed isthmus shows up
// as the reachable fraction collapsing at exactly the radius that cuts it.
//
//   THE INVARIANT: every cell the rule calls WALKABLE at radius r must be
//   REACHABLE from the spawn at radius r. A severed isthmus leaves the far
//   side fully walkable and fully unreachable, so severance shows up directly
//   as reachable/walkable dropping — a shrinking walkable BAND (the small
//   void's float-guard) does not, because unwalkable cells leave both counts.
//   FAIL below 97%: the first version of this gate compared against the
//   radius-1 AREA instead and passed the exact broken rule the owner hit,
//   because the severed resort side was only ~15% of the island.
import { chromium } from 'playwright';
import { ALL_WORLDS } from './worlds.mjs';

const PORT = process.argv[2] || '4177';
const args = process.argv.slice(3);
const WORLDS = args.length ? args : ALL_WORLDS;
const RADII = [1, 4, 8, 16, 27];

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
let bad = 0;
for (const w of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 } });
  try {
    await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
    await p.addInitScript(() => { try {
      localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
      localStorage.setItem('voidMute', '1');
      localStorage.setItem('voidDailyLast', new Date().toDateString());
      localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
    } catch { /* private */ } });
    await p.goto(`http://127.0.0.1:${PORT}/?w=${w}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
    await p.waitForFunction(() => !!window.__voidState && !!window.__solidAt, null, { timeout: 400000 });
    const rows = await p.evaluate((radii) => {
      const sp = window.__spawn();
      const STEP = 3;            // 3-unit grid: fine enough to see a 6u corridor
      const HALF = 260;          // covers every island's bounding box
      const key = (i, j) => i * 4096 + j;
      const out = [];
      for (const r of radii) {
        // every walkable cell in the box, for the denominator
        let solidN = 0;
        for (let i = -Math.floor(HALF / STEP); i <= HALF / STEP; i++) {
          for (let j = -Math.floor(HALF / STEP); j <= HALF / STEP; j++) {
            if (window.__solidAt(i * STEP, j * STEP, r)) solidN++;
          }
        }
        // flood fill from the spawn cell over cells the game calls solid at r
        const seen = new Set();
        const q = [];
        const si = Math.round(sp.x / STEP), sj = Math.round(sp.z / STEP);
        // the spawn itself must be walkable at every size; hunt a nearby cell
        // if the exact spawn cell fails at this radius
        outer:
        for (let d = 0; d < 6; d++) {
          for (let di = -d; di <= d; di++) for (let dj = -d; dj <= d; dj++) {
            if (window.__solidAt((si + di) * STEP, (sj + dj) * STEP, r)) {
              q.push([si + di, sj + dj]); seen.add(key(si + di, sj + dj)); break outer;
            }
          }
        }
        while (q.length) {
          const [i, j] = q.pop();
          for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const ni = i + di, nj = j + dj;
            if (Math.abs(ni * STEP) > HALF || Math.abs(nj * STEP) > HALF) continue;
            const k = key(ni, nj);
            if (seen.has(k)) continue;
            if (window.__solidAt(ni * STEP, nj * STEP, r)) { seen.add(k); q.push([ni, nj]); }
          }
        }
        out.push({ r, cells: seen.size, solidN });
      }
      return out;
    }, RADII);
    const line = rows.map((x) => `r${x.r} ${x.cells}/${x.solidN} (${Math.round(100 * x.cells / (x.solidN || 1))}%)`).join('  ');
    const worst = Math.min(...rows.map((x) => x.cells / (x.solidN || 1)));
    const ok = worst >= 0.97;
    if (!ok) bad++;
    console.log(`  ${w.padEnd(8)} ${line}   ${ok ? 'ok' : '← the map severs as the void grows'}`);
  } catch (e) {
    bad++; console.log(`  ${w.padEnd(8)} COULD NOT MEASURE — ${String(e).split('\n')[0].slice(0, 90)}`);
  } finally { await p.close().catch(() => {}); }
}
await b.close();
console.log('\n  ' + (bad ? `FAIL — ${bad} world(s) where growing severs the map` : 'PASS — every size of void can cross every island') + '\n');
process.exit(bad ? 1 : 0);
