// Follow-ups: (a) do curios land in the district their clue names?
// (b) what is off the district map? (c) where are the dead size rungs?
import { readFileSync } from 'fs';
const C = JSON.parse(readFileSync('qa-out/content.json', 'utf8'));
const src = readFileSync('src/game/stickers.ts', 'utf8');
const re = /\{ id: '([^']+)', world: '([^']+)', name: '((?:[^'\\]|\\.)*)', where: '((?:[^'\\]|\\.)*)', biome: '([^']+)',[\s\S]*?tier: '([^']+)'/g;
const ST = {}; let m;
while ((m = re.exec(src))) ST[m[1]] = { w: m[2], name: m[3], where: m[4], biome: m[5], tier: m[6] };
// biome -> district folds, transcribed from prototype3d.ts:1838 / 1849
const MAPLE_DIST = { cozy: 'burb', fancy: 'burb', burb: 'burb', downtown: 'mainst', mainst: 'mainst',
  plaza: 'civic', civic: 'civic', fair: 'fair', park: 'fair', forest: 'woods', woods: 'woods', camp: 'woods',
  beach: 'lake', lake: 'lake', farm: 'farm', campus: 'school', school: 'school', strip: 'strip' };
const GD_DIST = { bowl: 'bowl', gate: 'plaza', plaza: 'plaza', lot: 'lot', rvpark: 'rvpark',
  greek: 'greek', quad: 'campus', campus: 'campus', practice: 'practice', treeline: 'woods', woods: 'woods' };
const fold = (w, b) => (w === 'maple' ? MAPLE_DIST[b] ?? b : w === 'gameday' ? GD_DIST[b] ?? b : b);

console.log('══ CURIO PLACEMENT vs THE CLUE ══');
let bad = 0, tot = 0;
for (const w of Object.keys(C)) {
  const want = Object.entries(ST).filter(([, s]) => s.w === w).map(([id]) => id);
  const got = new Map(C[w].es.filter((e) => e.st).map((e) => [e.st, e]));
  for (const id of want) {
    tot++;
    const e = got.get(id);
    if (!e) { console.log(`  MISSING   ${w} ${id}`); bad++; continue; }
    const d = fold(w, e.d);
    if (d !== ST[id].biome) { console.log(`  WRONG DIST ${w} ${id}: clue says "${ST[id].where}" (${ST[id].biome}) but it is in ${e.d}->${d} at (${e.x},${e.z})`); bad++; }
  }
}
console.log(`  ${tot - bad}/${tot} curios in the district their clue names`);

console.log('\n══ EDIBLES OFF THE DISTRICT MAP ══');
for (const w of Object.keys(C)) {
  const off = C[w].es.filter((e) => e.d === 'off' || e.d === 'null');
  if (!off.length) { console.log(`  ${w}: none`); continue; }
  console.log(`  ${w}: ${off.length} — ` + off.sort((a, b) => b.r - a.r).map((e) => `r${e.r}(${e.x},${e.z})`).join(' '));
}

console.log('\n══ DEAD RUNGS: the longest stretch of match with no NEW size class ══');
const EAT = 1.11;
function lawCap(el, pace = 1, L = 180) {
  const s = Math.max(0, el - L * 0.66) / (L * 0.34);
  const warm = Math.min(1, el / 25);
  const k = (1 - warm) + warm * (0.60 + 0.40 * pace);
  return Math.min(12, 0.9 + (0.022 * Math.min(el, 30) + 0.025 * el) * k + s * s * (2.8 + 2.6 * pace));
}
for (const w of Object.keys(C)) {
  // for each second, how many DISTINCT prop sizes have just come into range,
  // and what is the largest thing still out of reach
  const sizes = [...new Set(C[w].es.map((e) => e.r))].sort((a, b) => a - b);
  let prevOut = null, spans = [], runStart = null;
  for (let t = 0; t <= 180; t++) {
    const cap = lawCap(t) * EAT;
    const out = sizes.filter((s) => s > cap);
    const nextUp = out.length ? out[0] : null;
    if (out.length === 0) { if (runStart === null) runStart = t; }
    prevOut = nextUp;
  }
  const capAt = (t) => lawCap(t) * EAT;
  const maxR = Math.max(...sizes);
  // when does EVERY prop in this world become edible?
  let allEdible = 999;
  for (let t = 0; t <= 180; t++) if (capAt(t) >= maxR) { allEdible = t; break; }
  // longest gap between consecutive newly-unlocked sizes, in seconds, after t=60
  let events = [];
  for (const s of sizes) { let t = 0; while (t <= 180 && capAt(t) < s) t++; if (t <= 180) events.push({ s, t }); }
  events.sort((a, b) => a.t - b.t);
  let worst = { from: 0, to: 0, n: 0 };
  let last = 0;
  for (const ev of events) { if (ev.t - last > worst.to - worst.from) worst = { from: last, to: ev.t, n: ev.s }; last = ev.t; }
  if (180 - last > worst.to - worst.from) worst = { from: last, to: 180, n: null };
  console.log(`  ${w.padEnd(8)} biggest prop r=${maxR}  → EVERYTHING edible from t=${allEdible === 999 ? 'never' : allEdible + 's'}` +
    `  (${allEdible === 999 ? '' : (180 - allEdible) + 's of match left with no new size class)'}`);
  console.log(`           longest stretch with nothing new unlocking: t=${worst.from}..${worst.to} (${worst.to - worst.from}s)` +
    (worst.n ? ` then r=${worst.n} arrives` : ' — runs out the clock'));
  // how many props unlock in the last 40s
  const c140 = capAt(140);
  console.log(`           props still uneaten-class at t=140 (r>${c140.toFixed(2)}): ${C[w].es.filter((e) => e.r > c140).length}`);
}
