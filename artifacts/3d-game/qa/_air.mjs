// DEAD AIR AND PILE-UPS IN THE FIRST NINETY SECONDS.
//
//   node qa/_first90.mjs <world>   # writes qa-out/first90/<world>.json
//   node qa/_air.mjs <world>
//
// Reads the show/hide transitions _first90.mjs recorded for the five things
// that can speak to a child mid-match — the guide pill, the beat banner, the
// news card, the evolve card and the title card — and reconstructs, per
// persona, (a) the longest stretch where NOTHING is on screen and (b) every
// moment two or more of them start inside the same two seconds.
import { readFileSync } from 'fs';
const WORLD = process.argv[2] || 'maple';
const d = JSON.parse(readFileSync(`./qa-out/first90/${WORLD}.json`, 'utf8'));
const CH = ['guide', 'banner', 'news', 'evolvecard', 'titlecard'];

for (const [persona, o] of Object.entries(d)) {
  // spans: a channel is OCCUPIED from a non-hidden value until the next '(hidden)'
  const spans = [];
  for (const ch of CH) {
    const ev = o.EV.filter((e) => e.kind === ch);
    let open = null;
    for (const e of ev) {
      const hidden = e.v === '(hidden)' || e.v === '';
      if (!hidden) { if (open === null) open = e.t; }
      else if (open !== null) { spans.push({ ch, a: open, b: e.t }); open = null; }
    }
    if (open !== null) spans.push({ ch, a: open, b: 95 });
  }
  spans.sort((x, y) => x.a - y.a);
  // union
  const merged = [];
  for (const s of spans) {
    const last = merged[merged.length - 1];
    if (last && s.a <= last.b) last.b = Math.max(last.b, s.b);
    else merged.push({ a: s.a, b: s.b });
  }
  // gaps within 0..90
  const gaps = [];
  let cur = 0;
  for (const m of merged) { if (m.a > cur) gaps.push([cur, Math.min(m.a, 90)]); cur = Math.max(cur, m.b); if (cur >= 90) break; }
  if (cur < 90) gaps.push([cur, 90]);
  const g2 = gaps.filter((g) => g[1] > g[0]).sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]));
  const occ = merged.reduce((s, m) => s + Math.max(0, Math.min(90, m.b) - Math.min(90, m.a)), 0);

  // pile-ups: two channels STARTING within 2.0s of each other
  const starts = spans.filter((s) => s.a <= 90).map((s) => ({ ch: s.ch, t: s.a }));
  const piles = [];
  for (let i = 0; i < starts.length; i++) {
    const grp = [starts[i]];
    for (let j = i + 1; j < starts.length && starts[j].t - starts[i].t <= 2.0; j++) grp.push(starts[j]);
    if (grp.length > 1) { piles.push(grp); i += grp.length - 1; }
  }

  console.log(`\n═══ ${WORLD.toUpperCase()} / ${persona.toUpperCase()} — first 90 match-seconds ═══`);
  console.log(`  something is on screen for ${occ.toFixed(1)}s of 90 (${(occ / 90 * 100).toFixed(0)}%)`);
  console.log(`  longest SILENT stretches:`);
  for (const g of g2.slice(0, 4)) console.log(`     ${(g[1] - g[0]).toFixed(1)}s   t=${g[0].toFixed(1)} -> ${g[1].toFixed(1)}`);
  console.log(`  PILE-UPS (two+ messages starting inside 2s): ${piles.length}`);
  for (const g of piles) console.log(`     t=${g[0].t.toFixed(2)}  ${g.map((x) => x.ch).join(' + ')}`);
}
