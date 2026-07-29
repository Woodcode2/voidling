// Static sweep: no player-facing string may contain the retired vocabulary.
import { readFileSync } from 'fs';
const FILES = ['src/prototype3d.ts','src/proto3d/rivals.ts','src/proto3d/life.ts',
  'src/proto3d/newsroom.ts','src/proto3d/newsroom_maple.ts','index.html'];
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
let bad = 0;
for (const f of FILES) {
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((l, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(l)) return;   // comments are not player-facing
    for (const [why, re] of BAD) {
      if (re.test(l)) { console.log(`  ${why.padEnd(22)} ${f}:${i + 1}  ${l.trim().slice(0, 96)}`); bad++; }
    }
  });
}
console.log(bad === 0 ? '\nCLEAN — no retired vocabulary in any player-facing string.' : `\n${bad} REMAINING`);
