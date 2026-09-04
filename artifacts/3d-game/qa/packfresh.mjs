// IS THE EVIDENCE PACK A PHOTOGRAPH OF THE BUILD WE ARE SHIPPING?
//
//   node qa/packfresh.mjs
//
// Two consecutive studio rounds were spent on a build that no longer existed.
//
// Round one: the pack was 38 hours and 21 art commits behind HEAD. The mascot
// wore a small round gasp in four worlds and a wide grin in the fifth, because
// e1f3d20 ("One hundredth of a unit was deleting the hero's smile") landed
// three and a half hours AFTER the photographs. Eight teams read those frames
// and one skeptic noticed.
//
// Round two: told to reshoot, I ran qa/shippedlook.mjs with its default tag —
// 'run' — which wrote <world>_run.png beside the <world>_look.png the brief
// points teams at, and left the stale set in place. TEAM STATIC opened its
// review by cropping a flower mound out of maple_look.png at 8x, correctly
// identifying it as a faceted icosahedron, and coming within one paragraph of
// filing a blocker on a defect fixed 85 minutes after that photograph. Its own
// words: "I was one paragraph from filing it as a live blocker."
//
// docs/STUDIO.md rule 1 — no team may report on a surface it has not seen
// rendered — cannot see this failure, because from inside a team the pack looks
// like evidence. So the check has to sit outside the teams.
//
// THE RULE: every frame in the canonical pack must be newer than every source
// file it could be a photograph of. Not "recent"; NEWER. A pack shot before the
// last art commit is a picture of something else.
import { readdirSync, readFileSync, statSync } from 'fs';
import { createHash } from 'crypto';
import { join } from 'path';
import { ALL_WORLDS } from './worlds.mjs';

const WORLDS = ALL_WORLDS;
const PACK = 'qa/out/shippedlook';

// ── WHY A DIGEST AND NOT A TIMESTAMP ──────────────────────────────────────
// The first version compared file mtimes, and I defeated it with `touch` in
// the same minute I wrote it. It also could not see an uncommitted edit, which
// is most of what changes during a working session — exactly the window in
// which somebody reshoots, keeps working, and hands out the pack.
//
// This hashes every .ts/.tsx under src/ and compares it to the digest each
// frame recorded when it was taken. It cannot be bumped, it cannot be faked by
// saving a file, and it answers the only question worth asking: is this
// picture a photograph of THIS source?
const digest = () => {
  const h = createHash('sha256');
  let n = 0;
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
      const q = join(d, e.name);
      if (e.isDirectory()) { walk(q); continue; }
      if (!/\.(ts|tsx)$/.test(e.name)) continue;
      h.update(e.name); h.update(readFileSync(q)); n++;
    }
  };
  walk('src');
  return { d: h.digest('hex').slice(0, 16), n };
};

const { d: now, n } = digest();
if (n < 20) { console.log(`ABORTED — hashed only ${n} source files. Something moved; not a clean result.`); process.exit(2); }

console.log(`\n  PACK FRESHNESS — ${n} source files hash to ${now}\n`);
const bad = [];
for (const w of WORLDS) {
  // The stamp is two fields now: <source digest> <sha256 of the PNG itself>.
  // The one-field version was defeated without anyone lying: a container
  // restart reverted the untracked frames to an August 23 snapshot while the
  // committed stamps survived, and this probe said PASS over pixels three
  // days stale. Both halves must hold — the stamp names THIS source, and the
  // frame on disk is THE frame the stamp was written beside.
  let stamp = null, imgHash = null;
  try { imgHash = createHash('sha256').update(readFileSync(join(PACK, `${w}_look.png`))).digest('hex').slice(0, 16); } catch { /* reported */ }
  try { stamp = readFileSync(join(PACK, `${w}_look.src`), 'utf8').trim(); } catch { /* reported */ }
  const parts = stamp ? stamp.split(/\s+/) : [];
  const srcPart = parts[0] ?? null, imgPart = parts[1] ?? null;
  const ok = imgHash !== null && srcPart === now && imgPart === imgHash;
  if (!ok) bad.push(w);
  const why = imgHash === null ? 'NO FRAME'
    : stamp === null ? 'unstamped'
    : srcPart !== now ? `${srcPart}  != ${now}  STALE SOURCE`
    : imgPart === null ? 'one-field stamp — predates the image-hash check'
    : imgPart !== imgHash ? 'stamp/image MISMATCH — the frame on disk is not the frame that was stamped'
    : srcPart;
  console.log(`    ${w.padEnd(9)} ${why}`);
}
console.log('');
if (bad.length) {
  console.log(`FAIL — ${bad.length} of ${WORLDS.length} frame(s) are not photographs of this source.`);
  console.log('  Reshoot: for w in maple pirate gameday lantern powder; do node qa/shippedlook.mjs 4177 $w; done');
  process.exit(1);
}
console.log('PASS — every frame in the pack is a photograph of exactly this source.');
