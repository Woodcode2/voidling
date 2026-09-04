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

const run = (cmd, args, label) => new Promise((res) => {
  const t0 = Date.now();
  const c = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  const timer = setTimeout(() => c.kill('SIGKILL'), 600000);
  c.stdout.on('data', (d) => { out += d; });
  c.stderr.on('data', (d) => { out += d; });
  c.on('close', (code) => {
    clearTimeout(timer);
    console.log(`   ${code === 0 ? '·' : '✗'} ${label.padEnd(28)} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
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

const shots = [];
for (const w of WORLDS) {
  await run('node', ['qa/shippedlook.mjs', PORT, w, 'look'], `play frame: ${w}`);
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

const present = shots.filter((s) => existsSync(s.path));
const missing = shots.filter((s) => !existsSync(s.path));
writeFileSync('qa/out/lookbook.json', JSON.stringify({ shots: present, missing: missing.map((m) => m.path) }, null, 2));

console.log(`\n  ${present.length} image(s) for the studio:\n`);
for (const s of present) console.log(`   ${s.path}\n      ${s.shows}`);
if (missing.length) {
  console.log(`\n  ${missing.length} MISSING — a team pointed at one of these would be reviewing nothing:`);
  for (const m of missing) console.log(`   ✗ ${m.path}`);
}
console.log('\n  ' + (missing.length ? `FAIL — ${missing.length} shot(s) did not render`
  : 'PASS — every surface the studio reviews has a picture of itself') + '\n');
