// THE SATURATED-ALBEDO CENSUS — which authored colours cannot shade?
//
// Game Day's crimson (tailgate.ts CRIM, round 4) taught the rule: below a LINEAR
// secondary/dominant channel ratio of about 0.08 the pipeline (ACES + the gamut
// guard) drives the weak channel to nothing and the surface renders as a flat
// blob with no lit side and no shadow side. Game Day was found by complaint;
// this finds the rest by search. It reads every 0xRRGGBB / '#rrggbb' literal
// in src/proto3d and src/prototype3d.ts, converts sRGB -> linear, and lists the
// saturated ones (dominant channel > 0.25 linear) whose SECOND channel sits
// under the bar — a pure hue with nothing for the shading to move. Source census only: the render check (luminance range
// across the surface in a canvas frame) is the second half, done on the worst.
//   node qa/albedo.mjs [bar=0.08] [--all]        exit 1 if any offender
import fs from 'fs';
import path from 'path';
const BAR = Number(process.argv[2] || 0.08), ALL = process.argv.includes('--all');
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const files = ['src/prototype3d.ts', ...fs.readdirSync('src/proto3d').filter((f) => f.endsWith('.ts')).map((f) => 'src/proto3d/' + f)];
const seen = new Map();
for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((ln, i) => {
    if (/^\s*\/\//.test(ln)) return;   // a colour in a comment is not a colour on a prop
    for (const m of ln.matchAll(/0x([0-9a-fA-F]{6})\b|'#([0-9a-fA-F]{6})'|"#([0-9a-fA-F]{6})"/g)) {
      const hex = (m[1] || m[2] || m[3]).toLowerCase();
      const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
      const L = [lin(r), lin(g), lin(b)], mx = Math.max(...L);
      if (mx < 0.25) continue;                           // dark colours shade by value, not by hue
      // THE SECOND channel against the first — not the weakest. A yellow with no
      // blue shades fine (red and green carry the form together); a red whose
      // green AND blue are both near zero cannot. Game Day's crimson failed on
      // its second channel, and that is the number the rule is about.
      const srt = [...L].sort((a, b) => b - a);
      const ratio = srt[1] / srt[0];
      const key = hex; const e = seen.get(key) || { hex, ratio, sites: [] }; e.sites.push(`${path.basename(f)}:${i + 1}`); seen.set(key, e);
    }
  });
}
const rows = [...seen.values()].sort((a, b) => a.ratio - b.ratio);
const bad = rows.filter((e) => e.ratio < BAR);
console.log(`  ${rows.length} distinct saturated colours (dominant > 0.25 linear) at ${rows.reduce((n, e) => n + e.sites.length, 0)} sites; bar ${BAR}`);
console.log('  hex      second/dominant   sites');
for (const e of (ALL ? rows : bad)) console.log(`  #${e.hex}  ${e.ratio.toFixed(3).padStart(6)}            ${e.sites.length} ${e.sites.slice(0, 4).join(' ')}${e.sites.length > 4 ? ' …' : ''}`);
console.log(bad.length ? `FAIL — albedo: ${bad.length} colour(s) under the ${BAR} bar cannot shade` : `PASS — albedo: every saturated colour keeps its secondary channels above ${BAR}`);
process.exit(bad.length ? 1 : 0);
