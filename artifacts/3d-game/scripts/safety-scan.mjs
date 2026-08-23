// Static sweep: no player-facing string may contain the retired vocabulary.
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
// ── THE FILE LIST WENT STALE FOR THE THIRD TIME, SO THERE ISN'T ONE ─────────
//
// The note that used to sit here said it best about its own predecessor: "a
// scanner with a stale file list reports CLEAN about the files it was told
// about, which is the most reassuring way to be wrong." It then listed eleven
// files by hand — and by the time POWDER PASS and the reactive newsroom
// shipped it was blind again. Verified: the hand list covered 11 of 146
// candidate files, and a live hit sat in one it could not see —
// newsroom_react.ts, whose pirate.limbo pool fires eight seconds after the
// limbo beat in world two.
//
// So it walks the tree instead. A file cannot be forgotten if nobody has to
// remember it.
//
// RETIRED, and reported rather than hidden: src/game/engine.ts, src/game/world.ts
// and everything under src/ui|components are the 2D game and the React shell.
// They are NOT in the bundle — vite's rollup input is index.html alone, and
// `grep "happy hour" dist/assets/main-*.js` returns nothing while the strings
// are plainly in world.ts. Hits there are printed as NOTES and do not fail the
// run, because failing on copy that cannot reach a child is how a gate gets
// switched off. If the shell is ever revived, the notes are already there.
const RETIRED = /^src\/(ui|components|pages|hooks)\/|^src\/(App|main)\.tsx$|^src\/game\/(engine|world)\.ts$/;
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  const p = join(d, e.name);
  return e.isDirectory() ? walk(p) : (/\.(ts|tsx|html)$/.test(e.name) ? [p] : []);
});
const FILES = [...walk('src'), 'index.html'];
// A FLOOR, so a bad glob or a moved directory cannot quietly shrink the sweep
// back to the state this rewrite exists to fix.
const FLOOR = 60;
if (FILES.length < FLOOR) {
  console.log(`\nSCAN ABORTED — resolved only ${FILES.length} files, floor is ${FLOOR}.`);
  console.log('Something moved. This is not a CLEAN result.');
  process.exit(2);
}
const BAD = [
  ['alcohol', /\b(happy hour|tiki bar|rum|champagne|the good drink|adults pool|swim-up bar)\b/i],
  ['gambling', /\bhigh roller\b/i],
  ['adultery idiom', /\bhome wrecker\b/i],
  ['eating shame', /\bglutton\b/i],
  ['real politics', /\b(recall vote|the landslide|fake news|recount|poll number|her polls|democracy|ballot box)\b/i],
  ['predation at the player', /(MAIN COURSE|run, darling\. RUN|brace yourself, SNACK|is DINNER|EAT HER)/],
  ['crying-baby tip', /BITSY cries when eaten/i],
  ['worse than a bear', /no— WORSE/i],
  ['secret from an adult', /do NOT tell my aunt/i],
  ['fight invite', /outside\. talk it out/i],
  ['child removed', /took two children|for two more children/i],
  ['missing child', /lost child at/i],
  ['adult jargon', /\b(HOA|recused|oat milk|pay grade|my agent said|my lawyer)\b/],
];
let bad = 0, noted = 0;
for (const f of FILES) {
  const retired = RETIRED.test(f);
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((l, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(l)) return;   // comments are not player-facing
    // …and a trailing comment on a code line is not player-facing either. This
    // is why audio3d.ts:49 read as an alcohol hit: `// authored match beat
    // (happy hour / dance party)` is a note to an engineer, not a headline.
    const code = l.split('//')[0];
    for (const [why, re] of BAD) {
      if (re.test(code)) {
        console.log(`  ${retired ? 'note ' : 'HIT  '} ${why.padEnd(22)} ${f}:${i + 1}  ${l.trim().slice(0, 90)}`);
        if (retired) noted++; else bad++;
      }
    }
  });
}
if (noted) console.log(`\n${noted} note(s) in the retired 2D game / React shell — not in the bundle, not a failure.`);
console.log(bad === 0
  ? `\nCLEAN — no retired vocabulary in any player-facing string (${FILES.length} files swept).`
  : `\n${bad} REMAINING`);
// EXIT NON-ZERO ON A HIT. This only ever printed, so `npm run safety` succeeded
// whatever it found — a gate that cannot fail is a report, and reports get
// skimmed. Now it can sit in front of an archive.
process.exit(bad === 0 ? 0 : 1);
