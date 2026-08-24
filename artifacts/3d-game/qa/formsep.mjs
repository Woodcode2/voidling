// CAN THIS COLOUR SHOW A SHAPE? — the form-separation probe.
//
//   node qa/formsep.mjs [world...]
//
// ── WHY NOT A FLATNESS TEST ───────────────────────────────────────────────
// The obvious probe after "the finale building reads as a flat silhouette" is
// to hunt for large uniform regions in a render. That probe would be wrong
// here, and confidently so: this game is primitive-assembled, untextured, and
// silhouette-first by design — a box face has constant N·L and is SUPPOSED to
// render as one flat colour. Flagging flatness would flag the house style.
//
// The defect is narrower and it is real. It is that two faces of the same prop
// at DIFFERENT angles come out the same colour, so the prop has no form. That
// is the bathhouse roof, whose six tiers carry no separation at all, and it is
// the Game Day truck whose cab-top and body-side are the same flat red.
//
// Whether that happens is decided before any geometry exists: it is a property
// of the ALBEDO and the world's key. So this needs no renderer, no browser and
// no screenshot — grade each palette colour at a lit angle and a shaded one and
// measure how far apart they land. Deterministic, instant, and it cannot be
// fooled by which frame got photographed.
//
// ── THE BAR ──────────────────────────────────────────────────────────────
// CIE76 ΔE between the two. The literature's rule of thumb is ΔE 1 is a just
// noticeable difference under ideal conditions, 2-3 is noticeable in practice,
// and under 1 is the same colour. This is a 4+ game on a phone at arm's length
// with a moving camera, so the bar is not a JND — it is 6, roughly "a child
// can see that this face is not that face".
//
// A colour under the bar is not a bug on its own. A colour under the bar that
// is used on a LARGE, MULTI-ANGLE prop is what makes a building look like a
// hole with piping. So the report names the colour, its worlds and the number;
// the judgement about where it is used stays with the studio.
import { readFileSync, readdirSync } from 'node:fs';
import { grade } from './_zgrade.mjs';

const MIN_DE = 6;
// ── BLACK BY DESIGN IS NOT BLACK BY ACCIDENT ─────────────────────────────
// Some colours are line-work: an eye, a nostril, a pupil, an ink mark on a
// face. They are MEANT to read as a featureless silhouette, they are drawn a
// few pixels across, and asking them to show a lit face and a shaded one is
// asking them to stop being ink. Each one is named with its hex so the
// exemption cannot silently widen to a different colour that happens to reuse
// the name, and each has to earn its line here rather than be assumed.
const INK_BY_DESIGN = new Map([
  ['PET|0x000000', 'the pet silhouette — a few px of solid shape, never a lit surface'],
  ['INK|0x241f2c', 'face and sign line-work'],
  ['LN_INK|0x241c2e', 'Lantern Night line-work'],
  ['BLACK|0x252231', 'named accent black, used as line-work'],
]);
// The two angles. A top-down camera mostly shows up-faces and the near side of
// things, so this is not a hemisphere sweep — it is the two surfaces the player
// actually sees on the same object at the same time.
const LIT = 0.85, SHADED = 0.40;

// Per-world key, from WORLD_LIGHT in prototype3d.ts x the RIG's 1.31 payback.
const KEY = { maple: 1.75, pirate: 1.75, gameday: 2.55, lantern: 0.55, powder: 1.15 };
const RIG = 1.31;
// Which module belongs to which world. mainstreet/island are shared furniture.
// Modules whose props belong to ONE world.
const OWN = {
  maple: ['mainstreet.ts'], pirate: ['luxe.ts'], gameday: ['tailgate.ts'],
  lantern: ['nightmarket.ts'], powder: ['alpine.ts'],
};
// Modules whose props are placed in EVERY world, so their colours have to
// survive the darkest key as well as the brightest.
const SHARED = ['island.ts', 'life.ts', 'curio.ts', 'defense.ts', 'store3d.ts', 'hatgeo.ts'];
// Everything else in src/proto3d that has no palette of its own. Listed so a
// module nobody classified cannot sit there unexamined — which is exactly what
// happened to Pirate Bay on this probe's first run: bay.ts is geometry only,
// it yielded zero colours, and the report said Pirate was clean.
const NO_PALETTE = new Set(['bay.ts', 'palette.ts', 'void3d.ts', 'audio3d.ts', 'fx.ts', 'rivals.ts',
  'bubbles.ts', 'gloss.ts', 'telemetry.ts', 'assets3d.ts', 'hats.ts', 'gameday.ts', 'powder.ts',
  'lantern.ts', 'newsroom.ts', 'newsroom_arc.ts', 'newsroom_react.ts', 'newsroom_gameday.ts',
  'newsroom_lantern.ts', 'newsroom_maple.ts', 'newsroom_powder.ts']);
// A world whose module yields almost nothing has not been EXAMINED, and a
// probe that reports "1 colour cannot show form" over a sample of three is
// giving false comfort about the other forty. The first run of this file found
// three colours in Maple and none at all in Pirate Bay, and said Maple was
// nearly clean.
const MIN_SAMPLE = 8;

const srgb2lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const f = (t) => t > 0.008856 ? Math.cbrt(t) : (7.787 * t) + 16 / 116;
/** sRGB 0-255 triple to CIE Lab (D65). */
function lab([r, g, b]) {
  const R = srgb2lin(r), G = srgb2lin(g), B = srgb2lin(b);
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const Y = (R * 0.2126 + G * 0.7152 + B * 0.0722);
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
const dE = (a, b) => { const p = lab(a), q = lab(b);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };

const WORLDS = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(KEY);

const rows = [];
for (const w of WORLDS) {
  const key = KEY[w] * RIG;
  for (const mod of [...(OWN[w] || []), ...SHARED]) {
    let src = '';
    try { src = readFileSync(`src/proto3d/${mod}`, 'utf8'); } catch { continue; }
    // `const NAME = 0xRRGGBB;` — the palette declarations every world module opens with
    // Indentation allowed on purpose: the bathhouse ROOF — the colour that
    // started this whole finding — is declared INSIDE its factory at
    // nightmarket.ts:419, and an anchored ^const missed exactly it.
    // Comma-separated declarations too: mainstreet.ts opens with
    // `const CREAM = 0xf6f0e2, WHITE = 0xfdfaf2, BONE = 0xe8e0cc;` and a
    // one-per-statement pattern saw three colours in the whole world.
    for (const m of src.matchAll(/\b([A-Z][A-Z0-9_]{2,})\s*=\s*(0x[0-9a-fA-F]{6})\b/g)) {
      const [, name, hex] = m;
      const h = parseInt(hex, 16);
      const a = grade(h, key * LIT), b = grade(h, key * SHADED);
      if (rows.some((r) => r.w === w && r.name === name && r.hex === hex)) continue;
      rows.push({ w, mod, name, hex, lit: a, shaded: b, de: dE(a, b) });
    }
  }
}

if (!rows.length) { console.log('FAIL — no palette constants found; the module layout must have changed'); process.exit(1); }
const claimed = new Set([...Object.values(OWN).flat(), ...SHARED, ...NO_PALETTE]);
const unclassified = [];
for (const f of readdirSync('src/proto3d')) {
  if (!f.endsWith('.ts') || claimed.has(f)) continue;
  const n = [...readFileSync(`src/proto3d/${f}`, 'utf8')
    .matchAll(/\b[A-Z][A-Z0-9_]{2,}\s*=\s*0x[0-9a-fA-F]{6}\b/g)].length;
  if (n >= MIN_SAMPLE) unclassified.push(`${f} (${n} colours)`);
}
if (unclassified.length) {
  console.log('');
  for (const u of unclassified) {
    console.log(`  · src/proto3d/${u} carries a palette and is in neither OWN, SHARED nor `
      + `NO_PALETTE. Nothing has looked at it, and a clean run means nothing until it is placed`);
  }
  console.log(`\nFAIL — ${unclassified.length} module(s) with palettes are unclassified`);
  process.exit(1);
}
const thin = WORLDS.filter((w) => (rows.filter((r) => r.w === w).length) < MIN_SAMPLE);

const exempt = (r) => INK_BY_DESIGN.has(`${r.name}|${r.hex.toLowerCase()}`);
const bad = rows.filter((r) => r.de < MIN_DE && !exempt(r)).sort((a, b) => a.de - b.de);
const byWorld = {};
for (const r of rows) (byWorld[r.w] ||= []).push(r);

console.log('');
for (const [w, rs] of Object.entries(byWorld)) {
  const under = rs.filter((r) => r.de < MIN_DE && !exempt(r));
  console.log(`  ${w.padEnd(9)} ${String(rs.length).padStart(3)} palette colours, `
    + `${String(under.length).padStart(2)} cannot show form (ΔE < ${MIN_DE})`
    + (under.length ? `  — ${under.slice(0, 6).map((r) => r.name).join(', ')}` : ''));
}
console.log('');
if (thin.length) {
  for (const w of thin) {
    console.log(`  · ${w}: only ${rows.filter((r) => r.w === w).length} palette colours found in `
      + `${[...(OWN[w] || []), ...SHARED].join(', ')}. That world is not being examined, `
      + `and a clean result for it means nothing`);
  }
  console.log(`\nFAIL — ${thin.length} world(s) yielded too small a sample to judge`);
  process.exit(1);
}
if (bad.length) {
  for (const r of bad.slice(0, 14)) {
    console.log(`  · ${r.w}/${r.name} ${r.hex}: a lit face renders rgb(${r.lit.join(',')}) and a shaded `
      + `face rgb(${r.shaded.join(',')}) — ΔE ${r.de.toFixed(1)} against a bar of ${MIN_DE}. `
      + `Any prop painted this colour has no form: its top and its side are the same colour`);
  }
  if (bad.length > 14) console.log(`  … and ${bad.length - 14} more`);
  console.log(`\nFAIL — ${bad.length} palette colour(s) cannot show a shape under their own world's key`);
  process.exit(1);
}
console.log(`PASS — every palette colour outside the ${INK_BY_DESIGN.size} exempted as line-work `
  + `separates a lit face from a shaded one `
  + `by at least ΔE ${MIN_DE} (worst ${Math.min(...rows.map((r) => r.de)).toFixed(1)})`);
