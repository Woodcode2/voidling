// BEATTRUTH — every beat that announces something must make it happen.
//
// A beat is a title card, a flash, a sting and a newsroom line, dealt on the
// match clock. Some beats also carry a `cue`, which is the beat's line INTO THE
// WORLD: the parade starts marching, the goat gets loose, the tower thumps.
// The comment above the dispatch calls this "the audit's standing finding:
// beats announced things that weren't happening". The dispatch then handled it
// with a HAND-TYPED WHITELIST OF THREE NAMES:
//
//     if (bt.cue === 'parade' || bt.cue === 'goat' || bt.cue === 'bandfield') life.cue(bt.cue, …)
//
// — so every cue added since silently did nothing, and the standing finding
// came straight back. Measured on the day this was written:
//
//   POWDER PASS   `avalanche`  "AVALANCHE!! the mountain is coming to you" — a
//                 handler exists (life.ts, 22 snowballs riding the piste) and
//                 has NEVER RUN. The loading tip says "when the avalanche
//                 comes, stand in its way. really." It has never come.
//   POWDER PASS   `contest`    no handler at all
//   SKYLARK FIELD `sheep`      no handler at all
//   SKYLARK FIELD `whale`      "THE WHALE IS GOING UP!!" — no handler; the
//                 whale lies there. This is the owner's "not eventful".
//
// Two things are checked, because they fail separately:
//   REACH    the dispatch actually forwards this cue name to life.cue()
//   HANDLE   something in life.ts tests for that name
// A cue that fails either is an ORPHAN: a title card over nothing.
//
// It is STATIC — reads the two source files, no browser — so it costs the gate
// nothing to hold this line every run.
//
//   node qa/beattruth.mjs
import fs from 'node:fs';

const PROTO = fs.readFileSync('src/prototype3d.ts', 'utf8');
const LIFE = fs.readFileSync('src/proto3d/life.ts', 'utf8');

const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const proto = strip(PROTO), life = strip(LIFE);

// ── FROZEN: cues that are known orphans until their mechanic is BUILT ───────
// Not exemptions. Each is a title card over nothing, on the record, with the
// work that closes it named. The freeze can only shrink: a new orphan fails,
// and a frozen cue that gains a handler fails too, so the entry cannot outlive
// its debt. Same rule as qa/placement.baseline.json and qa/roundlod.mjs.
const FROZEN = {
  sheep: 'SKYLARK FIELD — the shepherd-and-dog chase; built in the world 6 rebuild (brief §3E)',
  whale: 'SKYLARK FIELD — the whale stands and lifts; THE mechanic of the rebuild (brief §3B)',
  contest: 'POWDER PASS — the snowman contest has no world-side handler; owed since world 5',
};

// ── every cue any beat carries, attributed to the BEATS table it sits in ────
const cues = [];
{
  const decl = /const ([A-Z_]+BEATS)\b/g;
  const tables = [];
  let m;
  while ((m = decl.exec(proto))) tables.push({ name: m[1], at: m.index });
  const cueRe = /\bcue:\s*'([a-z0-9_.]+)'/g;
  while ((m = cueRe.exec(proto))) {
    let owner = '(unattributed)';
    for (const t of tables) if (t.at < m.index) owner = t.name;
    cues.push({ cue: m[1], owner, line: proto.slice(0, m.index).split('\n').length });
  }
}

// ── REACH: what the dispatch forwards to life.cue ───────────────────────────
// Either a whitelist of literal names on the life.cue(bt.cue …) line, or a
// generic `if (bt.cue)` that forwards everything.
const dispatchLine = proto.split('\n').find((l) => /life\.cue\(\s*bt\.cue/.test(l)) ?? '';
const whitelist = [...dispatchLine.matchAll(/bt\.cue\s*===\s*'([a-z0-9_.]+)'/g)].map(([, c]) => c);
const generic = whitelist.length === 0 && /if\s*\(\s*bt\.cue\s*\)/.test(dispatchLine);
const reaches = (c) => generic || whitelist.includes(c);

// ── HANDLE: names life.ts's cue handlers test for, plus cues prototype3d.ts
//    handles in place (treasure spawns chests, drum starts the thump) ─────────
const lifeHandled = new Set([...life.matchAll(/\b(?:n|name)\s*[!=]==\s*'([a-z0-9_.]+)'/g)].map(([, c]) => c));
const inPlace = new Set([...proto.matchAll(/bt\.cue\s*===\s*'([a-z0-9_.]+)'/g)].map(([, c]) => c)
  .filter((c) => !whitelist.includes(c)));

const rows = cues.map((x) => {
  const handled = lifeHandled.has(x.cue);
  const reach = reaches(x.cue);
  const ok = inPlace.has(x.cue) || (handled && reach);
  const why = ok ? '' : !handled ? 'no handler in life.ts' : !reach ? 'handler exists but the dispatch never forwards it' : '';
  return { ...x, handled, reach, ok, why };
});

console.log(`  ${cues.length} beat cue(s) across ${new Set(cues.map((c) => c.owner)).size} BEATS table(s)`);
console.log(`  dispatch: ${generic ? 'GENERIC — every cue reaches life.cue()' : `WHITELIST [${whitelist.join(', ')}]`}`);
console.log('');
for (const r of rows) {
  const tag = r.ok ? 'ok    ' : FROZEN[r.cue] ? 'FROZEN' : '✗     ';
  console.log(`  ${tag} ${r.owner.padEnd(14)} ${r.cue.padEnd(11)} ${r.ok ? '' : r.why}`);
}

const orphans = rows.filter((r) => !r.ok);
const fresh = orphans.filter((r) => !FROZEN[r.cue]);
const stale = Object.keys(FROZEN).filter((c) => rows.some((r) => r.cue === c && r.ok));
const unknown = Object.keys(FROZEN).filter((c) => !rows.some((r) => r.cue === c));

console.log('');
for (const r of fresh) console.log(`  ✗ ${r.owner} announces '${r.cue}' and nothing happens: ${r.why}`);
for (const c of stale) console.log(`  ✗ FROZEN '${c}' is handled now — delete its entry; a freeze must not outlive its debt`);
for (const c of unknown) console.log(`  ✗ FROZEN '${c}' is no longer a cue anywhere — delete its entry`);
for (const c of Object.keys(FROZEN)) if (!stale.includes(c) && !unknown.includes(c)) console.log(`  OWED  '${c}' — ${FROZEN[c]}`);

const bad = fresh.length + stale.length + unknown.length;
console.log('');
console.log(bad
  ? `FAIL — ${fresh.length} beat(s) put a title card over nothing${stale.length || unknown.length ? `, and ${stale.length + unknown.length} frozen entr${stale.length + unknown.length === 1 ? 'y' : 'ies'} no longer apply` : ''}`
  : `PASS — every beat that announces something makes it happen, with ${Object.keys(FROZEN).length} owed and named above`);
process.exit(bad ? 1 : 0);
