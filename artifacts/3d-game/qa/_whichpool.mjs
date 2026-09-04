// ── WHICH POOL DID EACH AIRED CARD COME FROM? ───────────────────────────────
//
//   node qa/_whichpool.mjs qa/out/newsfeed                 # the run just made
//   node qa/_whichpool.mjs docs/crews/round-5/newsroom-data # the recorded one
//
// qa/newsfeed.mjs records the SEQUENCE; this attributes each card in it back to
// the pool it was drawn from, by matching the aired headline against every
// template in the world's newsroom module with the {tokens} turned into
// wildcards. It exists because "the new pools reach air" is a claim, and a
// claim about a feed should be checkable off the feed.
//
// Lantern Night and Powder Pass only. The other three worlds keep their
// district pools in separate named consts, which this walker does not follow —
// see qa/_newscensus.mjs, which does.
// Which POOL did each aired card come from? Templates are matched with the
// tokens turned into wildcards, so a filled line still finds its template.
import fs from 'node:fs';
const DIR = 'src/proto3d/';
function declSpan(src, name) {
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
  return src.slice(m.index, i);
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
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rx = (t) => new RegExp('^' + t.split(/\{[A-Z]\}/).map(esc).join('.{0,34}?'));
const POOLS = ['SIGN_ON', 'MORNING', 'SIGN_OFF', 'LIVE', 'MEAL_HOUSE', 'MEAL_CAR', 'MEAL_BIG', 'MEAL_SMALL',
  'T0_GENERAL', 'T1_GENERAL', 'T2_GENERAL', 'T0_BY_DIST', 'T1_BY_DIST', 'T2_BY_DIST'];
for (const [world, file, feed] of [
  ['lantern', 'newsroom_lantern.ts', process.argv[2]],
  ['powder', 'newsroom_powder.ts', process.argv[2]]]) {
  const src = fs.readFileSync(DIR + file, 'utf8');
  const table = [];
  for (const n of POOLS) { const b = declSpan(src, n); if (b) for (const l of strs(b)) table.push([n.replace(/^T\d_/, ''), l]); }
  const path = `${feed}/${world}.json`;
  if (!fs.existsSync(path)) { console.log('no feed', path); continue; }
  const rec = JSON.parse(fs.readFileSync(path, 'utf8'));
  const tally = {};
  const unmatched = [];
  for (const f of rec.feed) {
    const hit = table.find(([, t]) => rx(t).test(f.head) || t.startsWith(f.head.replace(/…$/, '')));
    const k = hit ? hit[0] : 'UNMATCHED';
    tally[k] = (tally[k] || 0) + 1;
    if (!hit) unmatched.push(f.head);
  }
  console.log(`${world.padEnd(8)} ${rec.feed.length} cards  ` +
    Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join('  '));
  for (const u of unmatched.slice(0, 4)) console.log('    ? ' + u);
}
