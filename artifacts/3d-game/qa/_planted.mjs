// REQUESTED vs DELIVERED. Every plant()/drop() line in island.ts names a
// district, a count and a radius. The census says what is actually standing
// there. A pass that silently places zero props is invisible in play and
// invisible in code — it is only visible as a diff.
import { readFileSync } from 'fs';
const C = JSON.parse(readFileSync('qa-out/content.json', 'utf8'));
const src = readFileSync('src/proto3d/island.ts', 'utf8').split('\n');
// gameday and lantern both use plant(district, n, clear, r, maker, ...)
const RE = /^\s*plant(?:Land)?\('([a-z]+)',\s*(\d+),\s*(\d+),\s*([\d.]+),\s*([A-Za-z0-9_.()=> ]+?)(?:,|\))/;
// biomeAt renames, island.ts Biome union vs the module's own district ids
const RENAME = { gameday: { plaza: 'gate', campus: 'quad', woods: 'treeline' },
  lantern: { bridge: 'moonbridge', garden: 'nightgarden', gate: 'torii' } };
const worlds = { gameday: [4215, 4520], lantern: [3900, 4215] };
for (const [w, [a, b]] of Object.entries(worlds)) {
  console.log(`\n══ ${w.toUpperCase()} — plant() passes, requested vs standing ══`);
  // measured: count per (district, radius) rounded to 2dp
  const got = {};
  for (const e of C[w].es) { const k = `${e.d}|${e.r}`; got[k] = (got[k] || 0) + 1; }
  let missTot = 0, reqTot = 0;
  for (let i = a; i < b; i++) {
    const m = RE.exec(src[i]);
    if (!m) continue;
    const [, dist, n, clear, r, maker] = m;
    const d = RENAME[w][dist] ?? dist;
    const k = `${d}|${+r}`;
    const have = got[k] ?? 0;
    reqTot += +n;
    const pct = (have / +n * 100);
    const flag = have === 0 ? '  ***ZERO PLACED***' : pct < 60 ? `  <-- only ${pct.toFixed(0)}%` : '';
    if (have === 0 || pct < 60) missTot += (+n - have);
    if (flag) console.log(`  island.ts:${i + 1}  ${dist.padEnd(10)} r=${String(r).padEnd(5)} clear=${String(clear).padEnd(4)} ${maker.trim().padEnd(22)} asked ${String(n).padStart(4)}, standing ${String(have).padStart(4)}${flag}`);
  }
  console.log(`  (only under-delivering passes shown; radii shared by two passes read as the sum)`);
}
