// THE BOOT SWEEP MUST BE IDEMPOTENT — AND IT IS NOT.
//
// prototype3d.ts settleFootprints() runs once, at the first validateWorld(),
// and retires every prop that has vanished inside another. Run it a SECOND
// time over the world it just finished and it must retire nothing: it has
// already seen every pair, and removing props can only ever remove containers,
// which un-buries things rather than burying them.
//
// So a second pass that still finds something is not a new defect appearing —
// it is proof that the FIRST pass had a hole and walked past that exact pair.
// That is worth a bar of its own, because the alternative is what happened on
// Pirate Bay: a shell inside a tower at (57.5,230.5) that qa/placement.mjs
// reports as `inside`, that a re-run of the sweep's own algorithm puts in the
// dead set, and that the boot run leaves standing. Without this probe the only
// evidence was a hand-written replica in a scratch directory.
//
// WHAT IT READS. window.__settleAgain() — a QA-only hook that runs the REAL
// settleFootprints() again and returns what it would retire, WITHOUT applying
// it. Deliberately not a re-implementation: qa/placement.mjs already carries
// one replica of this geometry and keeping a second in sync is a bug factory.
// A replica that drifts reports failures the game does not have.
//
//   node qa/settle.mjs [world|all] [port]
//   SEED=7 node qa/settle.mjs all 4177      # as the gate runs it
//
// BARS
//   S1  a second settle retires nothing, on every world
//   S2  the hook exists — a silent absence must not read as a pass
//
// S1 IS EXPECTED TO FAIL ON PIRATE TODAY. That is the point: the residue is
// recorded as a failing bar with a named prop rather than a sentence in a
// commit message. Lower it to a ceiling only with the owner, never by widening
// the bar.

import { chromium } from 'playwright';

const WORLDS = ['maple', 'pirate', 'gameday', 'lantern', 'powder', 'skylark'];
const argv = process.argv.slice(2);
const pos = argv.filter((a) => !a.startsWith('--'));
const WHICH = pos[0] && pos[0] !== 'all' ? [pos[0]] : WORLDS;
const PORT = pos[1] || pos[0] || '4177';
const SEED = process.env.SEED ? Number(process.env.SEED) : null;

for (const w of WHICH) {
  if (!WORLDS.includes(w)) {
    console.log(`settle.mjs: unknown world "${w}" — one of ${WORLDS.join(', ')} or "all"`);
    process.exit(2);
  }
}

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'],
});

let anyFail = false;
let sawHook = false;

for (const wid of WHICH) {
  const page = await browser.newPage();
  // the same seeding the rest of qa uses, so a failure here is reproducible
  // rather than a story about a seed
  if (SEED !== null) {
    await page.addInitScript((seed) => {
      let a = (seed >>> 0) + 0x6D2B79F5;
      Math.random = () => {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }, SEED);
  }
  await page.addInitScript(() => {
    try {
      localStorage.clear();
      localStorage.setItem('voidPlayed', '1');
      localStorage.setItem('voidTut', '1');
      localStorage.setItem('voidDailyLast', new Date().toDateString());
      localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
    } catch { /* private mode */ }
  });

  const t0 = Date.now();
  await page.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  // the world a child plays is the world AFTER the boot sweep
  await page.evaluate(() => window.__validateWorld?.());

  const res = await page.evaluate(() => {
    if (typeof window.__settleAgain !== 'function') return { missing: true };
    // READ THE BOOT STAT FIRST. settleFootprints() writes settleStat as it
    // runs, so asking __settle() after the second pass reports the SECOND
    // pass's numbers and quietly loses what the boot sweep actually did.
    const stat = window.__settle?.();
    const props = window.__edibles.length;
    const again = window.__settleAgain();
    return { missing: false, props, stat, again };
  });
  await page.close();

  if (res.missing) {
    console.log(`  ${wid.padEnd(9)} __settleAgain() is not exposed — cannot check`);
    anyFail = true;
    continue;
  }
  sawHook = true;

  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  const n = res.again.length;
  const first = res.stat ? `${res.stat.inside} inside + ${res.stat.through} through in ${res.stat.ms}ms over ${res.stat.feet} footprints` : 'no boot stat';
  console.log(`  ${wid.padEnd(9)} ${String(res.props).padStart(5)} props  boot: ${first}  second pass would retire ${n}  ${n ? 'S1 FAIL' : 'S1 ok'}  (${secs}s)`);
  for (const d of res.again.slice(0, 6)) console.log(`      ${d}`);
  if (n) anyFail = true;
}

await browser.close();

if (!sawHook) {
  // S2: an absent hook returns nothing, and nothing must never read as a pass
  console.log('FAIL — settle: __settleAgain() was not found on any world; this probe measured nothing');
  process.exit(1);
}
console.log(anyFail
  ? 'FAIL — settle: the boot sweep is not idempotent — a second pass still finds props inside solids, so the first pass walked past them'
  : 'settle: ok — a second pass over every settled world retires nothing');
process.exit(anyFail ? 1 : 0);
