// THE FORTY-EIGHT PROMPTS, GENERATED FROM ONE STYLE STRING.
//
//   node scripts/sticker-prompts.mjs            # all 48, numbered
//   node scripts/sticker-prompts.mjs maple      # one world
//   node scripts/sticker-prompts.mjs --json     # machine-readable
//
// The whole risk in commissioning 48 cards is DRIFT: generated one at a time
// they come back as forty-eight different illustrators, and a set that does
// not match looks worse in a grid than no art at all — emoji are at least
// consistent with each other. So the style is written ONCE below and every
// prompt is style + subject, mechanically. Nobody hand-writes a prompt, which
// means nobody can hand-drift one.
//
// The subject strings live on the stickers themselves (`art`), deliberately
// plain and with no style words in them: "a triangular deli sandwich on a
// small white diner plate", not "a delicious sandwich". The name is the joke;
// the art field is the object.
import fs from 'node:fs';

const SRC = new URL('../src/game/stickers.ts', import.meta.url);
const src = fs.readFileSync(SRC, 'utf8');

// pull the entries out of the TS without compiling it — one regex, one shape
const ENTRY = /\{ id: '([^']+)', world: '([^']+)', name: '((?:[^'\\]|\\.)*)', where: '((?:[^'\\]|\\.)*)', biome: '([^']+)',\s*\n\s*hint: '((?:[^'\\]|\\.)*)', tier: '([^']+)',\s*\n\s*art: '((?:[^'\\]|\\.)*)'/g;
const all = [...src.matchAll(ENTRY)].map((m) => ({
  id: m[1], world: m[2], name: m[3].replace(/\\'/g, "'"), where: m[4].replace(/\\'/g, "'"),
  tier: m[7], art: m[8].replace(/\\'/g, "'"),
}));
if (all.length !== 48) {
  console.error(`parsed ${all.length} stickers, expected 48 — the entry shape in stickers.ts moved`);
  process.exit(1);
}

// ── THE LOCKED STYLE. Changing one word here re-commissions the whole set, so
// it is written to be changed deliberately and never casually. Every clause
// exists to stop a specific way a grid of 48 falls apart:
//   "single object, centred"    — no scenes; a scene card next to an object
//                                 card is the loudest possible mismatch
//   "matte clay, soft bevels"   — matches the game's own props, and it is a
//                                 finish a generator holds steady
//   "key light upper-left"      — a page of twelve must not read as twelve
//                                 different times of day
//   "soft shadow directly under" — everything stands on the same floor
//   "plain flat background"     — the card supplies its colour, not the art
//   "no text, no faces"         — the void is the only thing in this product
//                                 with a face, and text would need localising
const STYLE = [
  'Children\'s game sticker illustration.',
  'A single object, centred, complete, filling most of the frame.',
  'Soft 3D toy render: matte clay surfaces, gentle rounded bevels, chunky simple forms.',
  'Warm key light from the upper left, cool soft bounce from the lower right.',
  'A soft round contact shadow directly beneath the object.',
  'Plain flat pale background, no scenery, no horizon, no props other than the subject.',
  'Bright saturated friendly colours. Clean crisp edges. No text, no letters, no numbers.',
  'No faces, no eyes, no characters. Nothing frightening.',
].join(' ');

const promptFor = (s) => `${STYLE} The object is ${s.art}.`;

const args = process.argv.slice(2);
const json = args.includes('--json');
const world = args.find((a) => !a.startsWith('--'));
const list = world ? all.filter((s) => s.world === world) : all;

if (json) {
  console.log(JSON.stringify(list.map((s) => ({ id: s.id, prompt: promptFor(s) })), null, 2));
} else {
  console.log(`── ${list.length} prompts · style locked in scripts/sticker-prompts.mjs\n`);
  list.forEach((s, i) => {
    console.log(`${String(i + 1).padStart(2)}. ${s.id}  [${s.tier}]  ${s.name}`);
    console.log(`    ${promptFor(s)}\n`);
  });
}
