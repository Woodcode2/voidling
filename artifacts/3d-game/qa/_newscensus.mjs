// ── THE NEWSROOM'S CORPUS, COUNTED ──────────────────────────────────────────
//
//   node qa/_newscensus.mjs src/proto3d          # the shipped corpus
//   node qa/_newscensus.mjs /some/older/checkout # any other snapshot
//
// One method, runnable over BOTH snapshots, so a before number and an after
// number are the same measurement. It exists because the first census of this
// stream walked a list of POOL NAMES, and Maple Falls and Game Day keep their
// district pools in separate named consts that BY_DIST only references — so
// that census undercounted the two biggest worlds by two thirds and would have
// flattered the two thin ones by comparison.
// ONE METHOD, BOTH SNAPSHOTS. Every distinct single-quoted string literal of 25
// characters or more containing a space, anywhere in the world's newsroom
// module, MINUS the two *_VOICE_* records — those are crowd chatter above
// people's heads, not the paper. Comments are skipped, so an apostrophe in
// prose cannot swallow a pool. Maple and Game Day keep their district pools in
// separate named consts that BY_DIST only references, which is why a
// pool-name-walking census undercounts them by two thirds; this one does not
// care how a pool is assembled.
import fs from 'node:fs';
const F = { maple: 'newsroom_maple.ts', pirate: 'newsroom.ts', gameday: 'newsroom_gameday.ts',
  lantern: 'newsroom_lantern.ts', powder: 'newsroom_powder.ts' };
function spanOf(src, name) {
  const m = new RegExp(`^(?:export )?const ${name}(?::[^=]*)?\\s*=\\s*`, 'm').exec(src);
  if (!m) return null;
  let i = m.index + m[0].length, depth = 0, inStr = false, esc = false;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === "'") inStr = false; continue; }
    if (c === "'") { inStr = true; continue; }
    if (c === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); if (i < 0) i = src.length; continue; }
    if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') { if (--depth === 0) { i++; break; } }
  }
  return [m.index, i];
}
function strs(b) {
  const out = [];
  for (let i = 0; i < b.length; i++) {
    if (b[i] === '/' && b[i + 1] === '/') { i = b.indexOf('\n', i); if (i < 0) break; continue; }
    if (b[i] !== "'") continue;
    let s = '';
    for (i++; i < b.length && b[i] !== "'"; i++) s += b[i] === '\\' ? b[++i] : b[i];
    out.push(s);
  }
  return out;
}
const rows = [];
for (const [w, f] of Object.entries(F)) {
  const path = `${process.argv[2]}/${f}`;
  if (!fs.existsSync(path)) continue;
  let src = fs.readFileSync(path, 'utf8');
  for (const n of ['MAPLE_VOICE_AMBIENT', 'MAPLE_VOICE_PANIC', 'GAMEDAY_VOICE_AMBIENT',
    'GAMEDAY_VOICE_PANIC', 'PIRATE_VOICE_AMBIENT', 'PIRATE_VOICE_PANIC',
    'LANTERN_VOICE_AMBIENT', 'LANTERN_VOICE_PANIC', 'POWDER_VOICE_AMBIENT', 'POWDER_VOICE_PANIC']) {
    const sp = spanOf(src, n);
    if (sp) src = src.slice(0, sp[0]) + ' '.repeat(sp[1] - sp[0]) + src.slice(sp[1]);
  }
  const seen = new Set(strs(src).filter((s) => s.length >= 25 && s.includes(' ')));
  const q = [...seen].filter((s) => s.includes('?')).length;
  const has = (n) => !!spanOf(src, n);
  rows.push([w, seen.size, q, ((100 * q) / seen.size).toFixed(1),
    has('MEAL_HOUSE') ? 'yes' : 'NONE', has('LIVE') ? 'yes' : 'NONE']);
}
console.log('#  world     lines   with "?"     %    per-meal   LIVE');
for (const r of rows) console.log(`#  ${r[0].padEnd(9)} ${String(r[1]).padStart(4)}     ${String(r[2]).padStart(4)}    ${String(r[3]).padStart(4)}    ${r[4].padEnd(7)}    ${r[5]}`);
