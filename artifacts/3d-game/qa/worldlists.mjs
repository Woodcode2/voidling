// WORLDLISTS — no probe gets to believe in a game with fewer worlds than exist.
//
// THE FAILURE THIS EXISTS TO STOP, which already happened twice:
//
//   * When POWDER PASS landed as world 5, twenty-one probes kept a four-world
//     list. They ran, they passed, and none of them ever opened world 5. That
//     rot sat in the tree for a whole round and nothing anywhere noticed.
//   * When SKYLARK FIELD landed as world 6, qa/gate.mjs:46 still read
//     ['maple','pirate','gameday','lantern','powder'] — and EVERY per-world
//     step the gate fans out reads that line: smoke, traverse, vary,
//     faceparity, questable, postpipe, switch, newsarc, hero. The push gate
//     would have run twenty-three green steps, not one of which had loaded the
//     world being shipped, and printed PASS.
//
// A gate that does not know how many worlds the game has is not a gate; it is
// a decoration. Deriving the list in gate.mjs fixes today. This fixes the next
// one: it reads every .mjs in qa/ and fails if any hand-typed world list is
// missing a world the game can render.
//
// It is STATIC — no browser, no port, under a second — so it costs the gate
// nothing to hold this line on every run.
//
//   node qa/worldlists.mjs
import fs from 'node:fs';
import { ALL_WORLDS } from './worlds.mjs';

const ALL = new Set(ALL_WORLDS);

// PROBES THAT ARE TESTING THE LOCK ITSELF legitimately hold a partial list —
// a probe that checks locked cards look right cannot unlock everything first.
// Each is named with the reason, so the exemption is a decision on the record
// rather than a hole. Anything not on this list must know all six.
const LOCK_TESTS = {
  'lockedcards.mjs': 'checks the LOCKED cards still sell the next world — must leave worlds locked',
  'unlocks.mjs': 'tests the unlock ladder itself, one world at a time',
  '_lockab.mjs': 'A/B of the locked-card art',
  '_lockshot.mjs': 'screenshots each lock state, takes its list as an argument',
};

// A world list in this tree looks like one of two things: the unlock string in
// localStorage, or an array literal of world ids. Both are matched by shape,
// not by remembering where they are — a new probe is covered the day it lands.
const UNLOCK_RE = /voidUnlocked['"]\s*,\s*['"]([a-z0-9,]+)['"]/g;
const ARRAY_RE = /\[\s*'maple'(?:\s*,\s*'[a-z0-9]+')*\s*\]/g;

const findings = [];
let scanned = 0, lists = 0;

for (const f of fs.readdirSync('qa').sort()) {
  if (!f.endsWith('.mjs')) continue;
  if (f === 'worlds.mjs' || f === 'worldlists.mjs') continue;
  const src = fs.readFileSync(`qa/${f}`, 'utf8');
  scanned++;
  const exempt = LOCK_TESTS[f];

  for (const [, val] of src.matchAll(UNLOCK_RE)) {
    lists++;
    if (exempt) continue;
    const have = new Set(val.split(',').filter(Boolean));
    const missing = ALL_WORLDS.filter((w) => !have.has(w));
    if (missing.length) findings.push({ f, kind: 'unlock', got: val, missing });
  }

  for (const lit of src.match(ARRAY_RE) ?? []) {
    lists++;
    if (exempt) continue;
    const ids = [...lit.matchAll(/'([a-z0-9]+)'/g)].map(([, w]) => w);
    // A DELIBERATE SUBSET IS NOT ROT. Two worlds named on purpose ("compare
    // maple against gameday") is a choice; a list that is all-but-the-newest is
    // the rot. So a literal is only judged when it is trying to be the whole
    // set — every id in it is a real world AND it holds most of them.
    const real = ids.every((w) => ALL.has(w));
    if (!real || ids.length < ALL_WORLDS.length - 2) continue;
    const missing = ALL_WORLDS.filter((w) => !ids.includes(w));
    if (missing.length) findings.push({ f, kind: 'array', got: lit, missing });
  }
}

console.log(`the game renders ${ALL_WORLDS.length} worlds: ${ALL_WORLDS.join(', ')}`);
console.log(`scanned ${scanned} probe files, ${lists} world lists`);
for (const [f, why] of Object.entries(LOCK_TESTS)) {
  if (fs.existsSync(`qa/${f}`)) console.log(`  exempt  ${f.padEnd(18)} ${why}`);
}
for (const x of findings) {
  console.log(`  STALE   ${x.f} (${x.kind}) missing ${x.missing.join(',')}  -> ${x.got.slice(0, 70)}`);
}

console.log('');
console.log(findings.length
  ? `FAIL — ${findings.length} probe list(s) do not know every world; they would run green without ever loading ${[...new Set(findings.flatMap((x) => x.missing))].join(', ')}`
  : `PASS — every probe list in qa/ knows all ${ALL_WORLDS.length} worlds`);
process.exit(findings.length ? 1 : 0);
