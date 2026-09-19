// DO THE WALKING PEOPLE READ AS FORMS, OR AS FLAT SHAPES?
//
//   node qa/people.mjs [port] [world]
//
// The owner, on his own recording: "You can see the people in game as like
// Lego. Hole's people look way more realistic."
//
// THE SPLIT THIS MEASURES. src/proto3d/island.ts part() has baked a
// normal-keyed skylight into every PROP's albedo since commit 1c80de6, whose
// message opens with the owner's words on hole.io: "The detail in the 3d
// models. Nothing looks blocky." Faces that look up get the sky, faces that
// look sideways get less, undersides get least. src/proto3d/life.ts builds its
// walking people through its own pc(), which is not part() — and pc() flooded
// ONE hex across every vertex of every part. So a head, a sleeve and the top of
// a shoe all came out at the same value and only the key light separated them.
// The static townsfolk in mainstreet.ts import part and got the bake; the
// movers never did.
//
// THE STATISTIC: DISTINCT COLOUR VALUES vs DISTINCT COLOUR DIRECTIONS.
// A "direction" is a colour triple divided by its own largest channel, which is
// invariant under the skylight's scalar multiply — shading a colour changes its
// VALUE and not its DIRECTION. So:
//
//   flat fill   -> values == directions   (every vertex of a part is one hex)
//   shaded fill -> values >> directions   (one hex, many values along the normal)
//
// That is an arithmetic fingerprint rather than a threshold, and it cannot be
// satisfied by simply using more colours: adding a hex raises BOTH counts.
//
// It reads the colour attribute through its raw array and normalises by the max
// channel, so it does not care whether the attribute is Float32 or normalized
// Uint16 — which is exactly what the fix changes underneath it.
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
const WORLD = process.argv[3] || 'maple';
/** a shaded mesh must carry at least this many values per direction */
const RATIO = 3.0;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => {
  try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
  } catch {}
  // a fixed world, so the census is the same census every run
  let s = 7;
  Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
});
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState && !!window.__edibles, null, { timeout: 400000 });
await p.waitForTimeout(3000);

const census = await p.evaluate(() => {
  const movers = window.__edibles.filter(e => e.mesh && e.mesh.userData && e.mesh.userData.limbs);
  const meshes = [];
  for (const e of movers.slice(0, 6)) {
    e.mesh.traverse(o => { if (o.isMesh && o.geometry && o.geometry.getAttribute('color')) meshes.push(o); });
  }
  const rows = [];
  for (const m of meshes.slice(0, 24)) {
    const a = m.geometry.getAttribute('color');
    const arr = a.array;
    const vals = new Set(), dirs = new Set();
    const n = a.count;
    for (let i = 0; i < n; i++) {
      const r = arr[i * 3], g = arr[i * 3 + 1], bl = arr[i * 3 + 2];
      vals.add(`${r}|${g}|${bl}`);
      const mx = Math.max(r, g, bl) || 1;
      // three decimals: enough to separate two real hues, coarse enough that
      // rounding in the attribute does not invent a direction
      dirs.add(`${(r / mx).toFixed(3)}|${(g / mx).toFixed(3)}|${(bl / mx).toFixed(3)}`);
    }
    rows.push({ kind: arr.constructor.name, normalized: !!a.normalized,
      tris: m.geometry.getAttribute('position').count / 3, vals: vals.size, dirs: dirs.size });
  }
  return { movers: movers.length, rows };
});
await b.close();

if (!census.rows.length) { console.log(`FAIL — no mover meshes with a colour attribute were found on ${WORLD}`); process.exit(1); }
console.log(`${WORLD}: ${census.movers} movers on the island, ${census.rows.length} meshes sampled`);
console.log('  attribute            tris   values   directions   values/direction');
let worst = Infinity;
for (const r of census.rows.slice(0, 10)) {
  const ratio = r.vals / Math.max(1, r.dirs);
  if (ratio < worst) worst = ratio;
  console.log(`  ${(r.kind + (r.normalized ? ' norm' : '')).padEnd(18)} ${String(r.tris).padStart(6)} ${String(r.vals).padStart(8)} ${String(r.dirs).padStart(12)} ${ratio.toFixed(2).padStart(18)}`);
}
const ratios = census.rows.map(r => r.vals / Math.max(1, r.dirs));
worst = Math.min(...ratios);
const mean = ratios.reduce((a, c) => a + c, 0) / ratios.length;
console.log('');
console.log(`  worst mesh ${worst.toFixed(2)} values per direction, mean ${mean.toFixed(2)} (bar ${RATIO})`);
if (worst < RATIO) {
  console.log(`\nFAIL — a mover mesh carries ${worst.toFixed(2)} colour values per colour direction. At 1.00 that is`);
  console.log('       one flat hex flooded across the part: the skylight every prop has carried since');
  console.log('       1c80de6 never reached the walking crowd.');
  process.exit(1);
}
console.log(`\nPASS — every sampled mover mesh carries at least ${RATIO} colour values per direction, so the crowd is shaded along the normal rather than flooded with one hex`);
