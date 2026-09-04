// ── SKYLARK FIELD'S GEOMETRY, CHECKED ───────────────────────────────────────
//
//   node qa/airfield.mjs
//
// A land module is the one file in a world nobody can eyeball. Every other
// surface gets photographed; a polygon and three polylines get READ, and a
// number that is wrong by twenty degrees looks exactly like a number that is
// right. So this reads src/proto3d/skylark.ts and checks the claims it makes
// about itself.
//
// It exists because the design that arrived had three defects a reader found
// and nobody would have seen in a screenshot:
//   · 03/21 was drawn at a true 023 and 09/27 at a true 103. A runway
//     designator IS its heading divided by ten — it is painted on the threshold
//     in the biggest numerals in the world — so two of the three were lying
//     about themselves.
//   · three of the six thresholds sat off the island, in open space.
//   · the perimeter track was specified as a closed loop, and gameday.ts
//     records what happens when one is not closed: a 609-unit hole due east of
//     its bowl, because distToPath does not join the last point to the first.
//
// No browser, no port, no build. Reads the source, does the arithmetic.
import fs from 'node:fs';

const src = fs.readFileSync(new URL('../src/proto3d/skylark.ts', import.meta.url), 'utf8');
const arr = (name) => {
  const m = new RegExp(`export const ${name}(?::[^=]*)?\\s*=\\s*\\[([\\s\\S]*?)\\];`, 'm').exec(src);
  if (!m) throw new Error(`airfield: no ${name} in skylark.ts`);
  return [...m[1].matchAll(/\[\s*(-?\d+)\s*,\s*(-?\d+)\s*\]/g)].map(([, x, y]) => [Number(x), Number(y)]);
};
const num = (name) => {
  const m = new RegExp(`export const ${name}\\s*=\\s*(\\d+)`).exec(src);
  if (!m) throw new Error(`airfield: no ${name}`);
  return Number(m[1]);
};

const LAND = arr('SK_LAND');
const PERIMETER = arr('PERIMETER');
const SPAWN = (() => { const m = /export const SK_SPAWN: Pt = \[(\d+), (\d+)\]/.exec(src); return [Number(m[1]), Number(m[2])]; })();
const LAUNCH = (() => { const m = /export const LAUNCH = \{ cx: (\d+), cy: (\d+), rx: (\d+), ry: (\d+) \}/.exec(src); return { cx: +m[1], cy: +m[2], rx: +m[3], ry: +m[4] }; })();
const RWY = [['03/21', arr('RWY03'), num('RWY03_HALF')], ['09/27', arr('RWY09'), num('RWY09_HALF')], ['15/33', arr('RWY15'), num('RWY15_HALF')]];

const inside = (px, py, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) c = !c; } return c; };
const dEdge = (px, py, P) => { let m = Infinity; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [x1, y1] = P[j], [x2, y2] = P[i]; const dx = x2 - x1, dy = y2 - y1; const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy || 1))); m = Math.min(m, Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))); } return m; };
const clear = (x, y) => (inside(x, y, LAND) ? 1 : -1) * dEdge(x, y, LAND);
const hdg = (a, b) => (Math.atan2(b[0] - a[0], -(b[1] - a[1])) * 180 / Math.PI + 360) % 360;

let bad = 0;
const ok = (cond, msg) => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${msg}`); if (!cond) bad++; };

console.log(`SKYLARK FIELD — ${LAND.length}-point coast, ${PERIMETER.length}-point perimeter`);
const xs = LAND.map((p) => p[0]), ys = LAND.map((p) => p[1]);
console.log(`  ${Math.max(...xs) - Math.min(...xs)} x ${Math.max(...ys) - Math.min(...ys)} world units\n`);

console.log('A. every designator is the truth about its own bearing');
const MARGIN = 150;
for (const [name, pts, half] of RWY) {
  const [a, b] = [pts[0], pts[pts.length - 1]];
  const h = hdg(a, b);
  const want = Number(name.split('/')[0]), wantRec = Number(name.split('/')[1]);
  const got = Math.round(h / 10) % 36 || 36, rec = Math.round(((h + 180) % 360) / 10) % 36 || 36;
  ok(got === want && rec === wantRec,
    `${name} is drawn at ${h.toFixed(1)}°, which reads ${String(got).padStart(2, '0')}/${String(rec).padStart(2, '0')}`);
  // and the whole strip, both edges, every 100 units, stays on the island
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, px = -uy, py = ux;
  let worst = Infinity, at = null;
  for (let s = 0; s <= L; s += 100) {
    for (const o of [-half, 0, half]) {
      const p = [a[0] + ux * s + px * o, a[1] + uy * s + py * o];
      const c = clear(p[0], p[1]);
      if (c < worst) { worst = c; at = p.map(Math.round); }
    }
  }
  ok(worst >= MARGIN, `${name}'s ${half * 2}-wide strip stays on the island — worst clearance ${worst.toFixed(0)} at (${at})`);
}

console.log('\nB. the perimeter track is a ring, not an arc');
const first = PERIMETER[0], last = PERIMETER[PERIMETER.length - 1];
ok(first[0] === last[0] && first[1] === last[1],
  `it closes: first ${JSON.stringify(first)} === last ${JSON.stringify(last)}`);
const off = PERIMETER.filter(([x, y]) => !inside(x, y, LAND));
ok(off.length === 0, `all ${PERIMETER.length} points are on the island${off.length ? ` — ${off.length} are not, e.g. (${off[0]})` : ''}`);
const halfP = num('PERIMETER_HALF');
const tight = PERIMETER.filter(([x, y]) => clear(x, y) < halfP);
ok(tight.length === 0, `the ${halfP * 2}-wide track never hangs off the coast${tight.length ? ` — ${tight.length} point(s) do, e.g. (${tight[0]})` : ''}`);

console.log('\nC. the launch circle is where the runways actually cross');
const X = (p, q, r, s) => { const a1 = q[1] - p[1], b1 = p[0] - q[0], c1 = a1 * p[0] + b1 * p[1]; const a2 = s[1] - r[1], b2 = r[0] - s[0], c2 = a2 * r[0] + b2 * r[1]; const d = a1 * b2 - a2 * b1; return d === 0 ? null : [(b2 * c1 - b1 * c2) / d, (a1 * c2 - a2 * c1) / d]; };
const cross = X(RWY[0][1][0], RWY[0][1][1], RWY[2][1][0], RWY[2][1][1]);
const dCross = Math.hypot(cross[0] - LAUNCH.cx, cross[1] - LAUNCH.cy);
ok(dCross <= 60, `it sits ${dCross.toFixed(0)} units from the 03/21 x 15/33 crossing at (${cross.map(Math.round)})`);
ok(clear(LAUNCH.cx, LAUNCH.cy) >= LAUNCH.rx, `the whole ${LAUNCH.rx * 2}-wide circle is on the island`);

console.log('\nD. the spawn is somewhere a child can actually stand');
ok(inside(SPAWN[0], SPAWN[1], LAND), `it is on the island (${SPAWN})`);
ok(clear(SPAWN[0], SPAWN[1]) > 300, `it is ${clear(SPAWN[0], SPAWN[1]).toFixed(0)} from the coast, not teetering on the rim`);
const onRwy = RWY.some(([, pts, half]) => { const [a, b] = [pts[0], pts[pts.length - 1]]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const t = Math.max(0, Math.min(1, ((SPAWN[0] - a[0]) * (b[0] - a[0]) + (SPAWN[1] - a[1]) * (b[1] - a[1])) / (L * L))); return Math.hypot(SPAWN[0] - (a[0] + t * (b[0] - a[0])), SPAWN[1] - (a[1] + t * (b[1] - a[1]))) <= half; });
ok(!onRwy, 'it is on the grass, not in the middle of a runway');

console.log('\nE. every district is on the island');
const regions = [...src.matchAll(/\{ id: '([a-z]+)', name: '([^']+)', density: ([\d.]+),\s*poly: (\[[\s\S]*?\]) \}/g)];
for (const [, id, name, , polyTxt] of regions) {
  if (polyTxt.includes('SK_LAND')) { console.log(`  ok   ${id.padEnd(11)} ${name} is the whole island by design`); continue; }
  const P = [...polyTxt.matchAll(/\[\s*(-?\d+)\s*,\s*(-?\d+)\s*\]/g)].map(([, x, y]) => [Number(x), Number(y)]);
  const outp = P.filter(([x, y]) => !inside(x, y, LAND));
  ok(outp.length === 0, `${id.padEnd(11)} ${name} — ${P.length} points${outp.length ? `, ${outp.length} off the island e.g. (${outp[0]})` : ', all on the island'}`);
}

// ── F. A DISTRICT MUST HAVE SOMEWHERE TO PUT ANYTHING ──────────────────────
// Section E proves a district is ON the island. It says nothing about whether
// anything can STAND in it, and that gap shipped a nearly empty world: the
// runways are 1,000 wide and scatter is kept 30 clear of them, the perimeter
// track is 400 wide, and the launch circle is 2,200 across — so a district
// drawn without checking against all of that can be 85% exclusion zone and
// still pass every other test here.
//
// It did. The first launch field was 15% placeable and its authored grid
// walked 143 nodes to find FOUR legal ones: a hero district holding four
// balloons, on a world whose whole promise is ninety.
console.log('\nF. every district has room for the things it is supposed to hold');
const dPath = (px, py, P) => { let m = Infinity; for (let i = 1; i < P.length; i++) { const [x1, y1] = P[i - 1], [x2, y2] = P[i]; const dx = x2 - x1, dy = y2 - y1; const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy || 1))); m = Math.min(m, Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))); } return m; };
const placeable = (x, y, clear = 30) => {
  if (!inside(x, y, LAND)) return false;
  if (((x - LAUNCH.cx) / LAUNCH.rx) ** 2 + ((y - LAUNCH.cy) / LAUNCH.ry) ** 2 <= 1) return false;
  for (const [, pts, half] of RWY) if (dPath(x, y, pts) < half + clear) return false;
  if (dPath(x, y, PERIMETER) < halfP + clear) return false;
  return true;
};
/** how much room each district needs, in sampled cells at a 25-unit grid.
 *  `circle` is exempt: it IS an exclusion zone — the whale's precinct is
 *  authored inside it and nothing is ever scattered there. */
const ROOM = { launchfield: [0.55, 2000], arrivals: [0.45, 700], tower: [0.35, 500],
  hangars: [0.35, 300], breakfast: [0.35, 300], meadow: [0.20, 2000] };
for (const [, id, name, , polyTxt] of regions) {
  if (id === 'circle') { console.log(`  ok   ${id.padEnd(11)} ${name} is an exclusion zone by design — authored, never scattered`); continue; }
  const want = ROOM[id];
  if (!want) continue;
  const P = polyTxt.includes('SK_LAND') ? LAND
    : [...polyTxt.matchAll(/\[\s*(-?\d+)\s*,\s*(-?\d+)\s*\]/g)].map(([, x, y]) => [Number(x), Number(y)]);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of P) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  let inP = 0, free = 0;
  for (let x = minX; x <= maxX; x += 25) for (let y = minY; y <= maxY; y += 25) {
    if (!inside(x, y, P)) continue; inP++;
    if (placeable(x, y)) free++;
  }
  const frac = free / Math.max(1, inP);
  ok(frac >= want[0] && free >= want[1],
    `${id.padEnd(11)} ${String(free).padStart(5)} of ${String(inP).padStart(5)} cells free (${(frac * 100).toFixed(0)}%, needs ${(want[0] * 100).toFixed(0)}% and ${want[1]})`);
}

console.log(bad
  ? `\nFAIL — airfield: ${bad} thing(s) SKYLARK FIELD claims about itself are not true`
  : `\nPASS — airfield: every runway means its own number, the ring closes, and nothing is drawn off the island`);
if (bad) process.exitCode = 1;
