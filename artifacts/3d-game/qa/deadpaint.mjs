// qa/deadpaint.mjs — A COLOUR NOBODY READS IS A LANDMINE, NOT A PALETTE ENTRY.
//
//   node qa/deadpaint.mjs
//
// No browser, no port, no build. Three times in this project a measured,
// reasoned, committed colour fix has failed to reach a single pixel, and every
// one of them had the same shape: an authoritative-looking table that nothing
// paints from.
//
//   biomeColor    a full ground table, live for ONE of six worlds. A round's
//                 work on Game Day's tarmac went into a dead row.
//   GD_FLOOR.lot  the same fix, in the copy that does paint — which is how the
//                 first one was finally caught, by accident.
//   palette.ts    meadow, park, forest and sand desaturated with the arithmetic
//                 written down, and about sixty CSS literals painting over the
//                 result. The town square the match opens on rendered its
//                 pre-desaturation green for a whole round.
//
// The cost is not the wasted work. It is that the next person to edit that
// entry — reasonably, having read its comment — gets no pixels and no error,
// and has to discover the whole story again from scratch.
//
// So: every key of every exported colour table must be READ by something. That
// includes palette.ts itself outside the key's own definition — VOID feeds
// VOID_COL a few lines down, and a key consumed by a derived table in the same
// file is read, not dead. Not "must be correct" — this probe has no
// opinion about colour — just read by something, so that editing it does
// something. An entry that fails this either gets wired to the thing it
// describes or gets deleted; both are better than a comment that lies.
//
// DYNAMIC ACCESS IS REPORTED, NOT ASSUMED. `WORLD[k]` or a destructure can read
// a key without naming it, so this prints the files that index a table
// dynamically and says which keys it therefore cannot rule on, instead of
// quietly passing everything in that table.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const PALETTE = 'src/proto3d/palette.ts';
const ROOTS = ['src', 'qa', 'scripts'];
const src = readFileSync(PALETTE, 'utf8');

// the exported colour tables and their top-level keys
const tables = {};
for (const m of src.matchAll(/export const (\w+)\s*=\s*\{([\s\S]*?)\n\};/g)) {
  const keys = [...m[2].matchAll(/^ {2}(\w+):/gm)].map((k) => k[1]);
  // SKINS and the like are arrays of records, not colour tables — a table is a
  // flat object of named colours, so require at least three keys and no `id`
  if (keys.length >= 3 && !keys.includes('id')) tables[m[1]] = keys;
}

const files = [];
const walk = (d) => {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    // palette.ts defines them; this probe TALKS about them (its own comments
    // name WORLD[k]) and would otherwise report itself as a consumer
    if (/\.(ts|mjs|js)$/.test(p) && !p.endsWith('palette.ts') && !p.endsWith('deadpaint.mjs')) files.push(p);
  }
};
for (const r of ROOTS) { try { walk(r); } catch { /* a root that does not exist here */ } }

// ── A MENTION IN A COMMENT IS NOT A READ ──────────────────────────────────
// The first version searched raw file text, and a probe whose whole purpose is
// to catch colours that paint nothing was itself fooled by prose about
// colours. PROPS.person — eight colours, seven of which had just been rewritten
// in the same commit — matched exactly one line in the repository:
//   qa/_palette.mjs:103   // FACADE-ONLY for the towers. PROPS.car and
//                         // PROPS.person share four hexes
// a comment, in a file that never imports the palette. The probe printed
// 41/41 read and I had edited a dead table believing the probe.
// So comments come out first. Block comments, line comments, and the leading
// `*` of a jsdoc continuation, in that order.
const decomment = (t) => t
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');
const blobs = files.map((f) => [f, decomment(readFileSync(f, 'utf8'))]);
// palette.ts counts as a consumer of its own keys — VOID_COL is built from
// VOID a few lines below it, and that is a read. No blanking is needed to keep
// definitions out of it: a definition line is `  abyss:`, never `VOID.abyss`,
// so searching for the qualified name cannot match the thing that declares it.
blobs.push([PALETTE, decomment(src)]);
const dynamic = {};       // table -> files that index it by a computed key
for (const [f, b] of blobs)
  for (const t of Object.keys(tables))
    if (new RegExp(`\\b${t}\\s*\\[`).test(b)) (dynamic[t] ||= []).push(f);

let dead = 0, total = 0;
const rows = [];
for (const [t, keys] of Object.entries(tables)) {
  for (const k of keys) {
    total++;
    const named = new RegExp(`\\b${t}\\.${k}\\b`);
    // a destructure of this table that names the key
    const destr = new RegExp(`\\{[^}]*\\b${k}\\b[^}]*\\}\\s*=\\s*${t}\\b`);
    const hit = blobs.find(([, b]) => named.test(b) || destr.test(b));
    if (hit) continue;
    if (dynamic[t]) { rows.push(['?', t, k, `only ${t}[…] — ${dynamic[t].length} file(s) index it dynamically`]); continue; }
    dead++; rows.push(['x', t, k, 'read by nothing, anywhere']);
  }
}

console.log(`\nDEAD PAINT — ${total} colours across ${Object.keys(tables).length} tables in ${PALETTE}\n`);
for (const [mark, t, k, why] of rows)
  console.log(`  ${mark === 'x' ? 'DEAD ' : 'maybe'}  ${(t + '.' + k).padEnd(24)} ${why}`);
if (!rows.length) console.log('  every colour is read by something.');
for (const [t, fs] of Object.entries(dynamic))
  console.log(`\n  ${t} is indexed dynamically by: ${fs.join(', ')}`);
console.log(`\n${total - dead}/${total} read`);
process.exit(dead ? 1 : 0);
