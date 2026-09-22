// THE LOOKBOOK — the evidence pack the studio reviews.
//
// docs/STUDIO.md rule 1: no team may report on a surface it has not seen
// rendered. That rule exists because eyes were shipped to every person in this
// game after being "verified" against a crop of a person seen FROM BEHIND, and
// because leaf litter was shipped after being verified against a luminance mean
// while nobody looked at the plaza it was staining.
//
// So this builds the pictures first. It shells out to the probes that already
// know how to take each kind of shot rather than reimplementing them, because a
// second copy of the camera logic is a second thing to drift.
//
//   node qa/lookbook.mjs [port] [worlds...]
//
// Output lands in qa/out/ and is listed at the end with what each image is FOR,
// so a reviewer can be pointed at the two frames that show their own surface
// instead of at a directory.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { ALL_WORLDS } from './worlds.mjs';

const PORT = process.argv[2] || '4177';
const WORLDS = process.argv.slice(3).length ? process.argv.slice(3) : ALL_WORLDS;

// ONE BUDGET FOR ONE SHOT IS NOT ONE BUDGET FOR EIGHTEEN. Every sub-probe got
// the same 600s, and `_dioshot --views` takes eighteen shots across six worlds
// inside it — it was killed mid-run with fourteen written, so powder and
// skylark lost their small and tablet frames and the pack came back incomplete
// without anything saying WHY. A kill now says so, and a caller that knows it
// is asking for many shots asks for the time to take them.
const run = (cmd, args, label, budget = 600000) => new Promise((res) => {
  const t0 = Date.now();
  const c = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '', killed = false;
  const timer = setTimeout(() => { killed = true; c.kill('SIGKILL'); }, budget);
  c.stdout.on('data', (d) => { out += d; });
  c.stderr.on('data', (d) => { out += d; });
  c.on('close', (code) => {
    clearTimeout(timer);
    console.log(`   ${code === 0 ? '·' : '✗'} ${label.padEnd(28)} ${((Date.now() - t0) / 1000).toFixed(0)}s`
      + (killed ? `  KILLED at its ${(budget / 1000).toFixed(0)}s budget — the shots it had not taken yet are the missing ones` : ''));
    res({ code, out });
  });
});

// Strays between shots: a zombie Chromium at 189% starves the next one into a
// timeout, which is a recorded trap in docs/HANDOFF.md.
const strays = () => new Promise((res) => {
  const k = spawn('bash', ['-c', "pkill -f 'chrome-linux/chrome' 2>/dev/null; pkill -f 'pw-browsers/chromium' 2>/dev/null; true"]);
  k.on('close', () => res());
});

mkdirSync('qa/out', { recursive: true });
console.log(`\n  LOOKBOOK — ${WORLDS.length} world(s) on :${PORT}\n`);

// ── A SHOT THAT WAS TAKEN IS NOT A SHOT THAT IS RIGHT ─────────────────────
// This file's verdict was existsSync() and nothing else: a probe could exit
// non-zero, print its own FAIL, and the pack still came back "PASS — every
// surface the studio reviews has a picture of itself", because a picture did
// land on disk. That is exactly what happened to the six play frames. Six
// consecutive runs of qa/shippedlook.mjs photographed a town with no hero in
// it, the ✗ went past in the progress column, and the pack was handed over
// clean. TEAM ART filed a ship blocker off it.
//
// So a non-zero exit is now recorded against the shot it was taking, and it
// fails the pack by name alongside the missing ones. `run` already has the
// code; nothing was reading it.
const bad = [];
const shots = [];
for (const w of WORLDS) {
  const r = await run('node', ['qa/shippedlook.mjs', PORT, w, 'look'], `play frame: ${w}`);
  if (r.code !== 0) bad.push({ path: `qa/out/shippedlook/${w}_look.png`, out: r.out });
  shots.push({ path: `qa/out/shippedlook/${w}_look.png`, world: w,
    shows: 'the shipped canvas at the play camera — STATIC, MOTION, GROUND, LIGHT and HERO all appear here' });
  await strays();
}

await run('node', ['qa/personsheet.mjs', PORT, 'maple'], 'character sheet: maple');
for (const a of ['front', 'threequarter', 'side', 'back'])
  shots.push({ path: `qa/out/person/maple_${a}.png`, world: 'maple',
    shows: `people turned to ${a} — MOTION's silhouettes, poses and faces at the angle they actually fail at` });
await strays();

await run('node', ['qa/_dumpbake.mjs', 'maple'], 'ground bake: maple');
shots.push({ path: 'qa/out/bake/maple.png', world: 'maple',
  shows: "the ground texture itself, 3072px — GROUND's whole surface, before any prop stands on it" });
await strays();

// ── THE MENU, WHICH DID NOT EXIST AS A SURFACE WHEN THIS FILE WAS WRITTEN ──
// MENU-BRIEF §6 day 12. The menu was a still splash when this lookbook was
// built; from day 8 it is a live 3D diorama of the world she is on, with day 7's
// ladder over it and day 10's hop and first reveal moving on it. NONE of that
// had a picture of itself, which under docs/STUDIO.md rule 1 — "no team may
// report on a surface it has not seen rendered" — makes the entire menu stream
// un-reviewable at the studio pass. A reviewer pointed at a surface with no
// frame is a reviewer inventing one.
//
// Six worlds, because the stage is DERIVED per world (deriveStage picks the
// azimuth off the island's own scatter) rather than authored — so Maple looking
// right is not evidence about Powder Pass, and day 8 got the framing wrong four
// times, every one of them caught by looking rather than by a number.
await run('node', ['qa/_dioshot.mjs', PORT, '--views'], 'menu diorama: 6 worlds x 3 views', 2400000);
for (const w of ALL_WORLDS) {
  shots.push({ path: `qa/out/dioshot/${w}.png`, world: w,
    shows: `the menu as a child first sees ${w} — STATIC's framing, LIGHT's hour and `
      + `HERO's read at menu size, with the ladder over it` });
  shots.push({ path: `qa/out/dioshot/${w}-small.png`, world: w,
    shows: `${w} at 360px — the width where the ladder panel and PLAY have the least room` });
  shots.push({ path: `qa/out/dioshot/${w}-tablet.png`, world: w,
    shows: `${w} at 834px — the width where a phone layout starts swimming` });
}
await strays();

// the ladder's two moments of motion, and the state it settles into
await run('node', ['qa/_revealshot.mjs', PORT], 'first reveal + pip hop');
for (const [n, what] of [['3-reveal-done', 'the first reveal, arrived — five dots left to right, the void looking down at them'],
  ['4-settled', 'the menu at rest: the ladder still, the ring on her dot, the goal line under it'],
  ['8-hop-settled', 'after a win — the dot she played wearing its tick, the ring hopped to the one she opened']]) {
  shots.push({ path: `qa/out/revealshot/${n}.png`, world: 'maple', shows: what });
}
await strays();

// ── THE END CARD, WIN AND MISS ────────────────────────────────────────────
// The one screen that tells a child how she did, and the one place the pip
// language is 96px instead of 40. Both outcomes, because "NOT YET" is the harder
// of the two to get right and is the one she will see more often.
await run('node', ['qa/_endshot.mjs', PORT, 'maple'], 'end card: win + miss');
shots.push({ path: 'qa/out/endshot/maple-g1-win-phone.png', world: 'maple',
  shows: 'the end card on a win — the headline pip, the row of five, the coins under them' });
shots.push({ path: 'qa/out/endshot/maple-g1-miss-phone.png', world: 'maple',
  shows: 'the end card on a MISS — "NOT YET", the replay arrow, nothing that says failed' });

const present = shots.filter((s) => existsSync(s.path));
const missing = shots.filter((s) => !existsSync(s.path));
writeFileSync('qa/out/lookbook.json', JSON.stringify({ shots: present, missing: missing.map((m) => m.path) }, null, 2));

console.log(`\n  ${present.length} image(s) for the studio:\n`);
for (const s of present) console.log(`   ${s.path}\n      ${s.shows}`);
if (missing.length) {
  console.log(`\n  ${missing.length} MISSING — a team pointed at one of these would be reviewing nothing:`);
  for (const m of missing) console.log(`   ✗ ${m.path}`);
}
if (bad.length) {
  console.log(`\n  ${bad.length} WRONG — the file is there and the probe that took it says it is not the shot:`);
  for (const b of bad) {
    console.log(`   ✗ ${b.path}`);
    // the probe's own last words, which is where the reason is
    for (const line of b.out.trim().split('\n').slice(-4)) console.log(`       ${line.trim()}`);
  }
}
const broke = missing.length + bad.length;
console.log('\n  ' + (broke
  ? `FAIL — ${missing.length} shot(s) did not render, ${bad.length} rendered the wrong thing`
  : 'PASS — every surface the studio reviews has a picture of itself') + '\n');
process.exitCode = broke ? 1 : 0;
