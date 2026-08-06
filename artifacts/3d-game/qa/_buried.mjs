// Is any curio hidden INSIDE something? placeStickers() rejection-samples on
// district, land and deep water only — it never asks whether the ground is
// already taken, unlike every other placer in island.ts (spotOpen / claimSpot).
// A gem inside a brick hall is a sticker a child can never find.
import { readFileSync } from 'fs';
const C = JSON.parse(readFileSync('qa-out/content.json', 'utf8'));
for (const w of Object.keys(C)) {
  const es = C[w].es;
  const cur = es.filter((e) => e.st);
  const solid = es.filter((e) => !e.st && !e.mv && e.r >= 1.2);
  const hits = [];
  for (const c of cur) {
    let worst = null;
    for (const s of solid) {
      const d = Math.hypot(c.x - s.x, c.z - s.z);
      // the prop's visual half-width runs ~1.6-2.6x its eat radius (island.ts
      // :4300). Use 1.6x, the conservative end, and call it buried when the
      // gem's own centre is inside that footprint.
      if (d < s.r * 1.6 && (!worst || d / (s.r * 1.6) < worst.f)) worst = { d: +d.toFixed(1), r: s.r, f: d / (s.r * 1.6) };
    }
    if (worst) hits.push({ id: c.st, ...worst });
  }
  console.log(`${w.padEnd(8)} ${hits.length}/${cur.length} curios sit inside another prop's footprint (1.6x eat radius)`);
  for (const h of hits) console.log(`    ${h.id.padEnd(18)} ${h.d}u from an r=${h.r} prop`);
}
