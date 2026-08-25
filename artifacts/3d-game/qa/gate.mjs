// THE RELEASE GATE — the one command that decides whether this build may go live.
//
// WHY THIS EXISTS, AND WHY IT IS NOT JUST A SHELL SCRIPT.
//
// Every probe in this directory prints a verdict and then exits 0. All of them.
// `node qa/smoke.mjs` on a build that cannot boot prints a connection-refused
// stack and still exits 0, which is why FABLE-BRIEF's rule 3 has to say "READ
// the output for the word PASS" — a human is the gate. That works right up until
// the moment somebody is tired, or pipes it through `tail`, or runs it in a
// chain where `&&` sees a zero and carries on. The brief records that exact
// failure: "`| tail -2` in an `&&` chain prints a connection-refused stack and
// still lets the push through, because `tail` exits 0."
//
// So this file does the reading. It runs each probe, matches its stdout against
// a verdict rule declared HERE (next to the probe's name, where it can be
// audited), and turns that into an exit code. The rules are per-probe because
// the probes genuinely disagree about how to say "good": most print
// "  PASS — ...", trackprofile prints "every track in spec", newsstyle prints
// "clean", and postpipe/newsarc already set an exit code.
//
// THE RULE THAT MATTERS MOST: **no verdict found is a FAIL.** A probe that
// crashed, timed out, or was pointed at a dead server prints no verdict line,
// and the single most dangerous thing this file could do is read that silence
// as consent. Silence is failure here. That is the whole reason it exists.
//
//   node qa/gate.mjs                      # the LIVE profile — everything, all five worlds
//   node qa/gate.mjs --profile=push       # the fast pre-push subset
//   node qa/gate.mjs --profile=art        # the look-and-feel subset
//   node qa/gate.mjs --only=smoke,econ    # named steps only
//   node qa/gate.mjs --list               # what would run, and why each is in
//   node qa/gate.mjs --port=4177          # default 4177
//
// Exit 0 only if every required step passed. Anything else is non-zero, and the
// report says which step and what it printed.
import { spawn } from 'node:child_process';
import os from 'node:os';
import { mkdirSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const flag = (n, d) => { const a = args.find(x => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const PORT = flag('port', '4177');
const PROFILE = flag('profile', 'live');
const ONLY = flag('only', '').split(',').filter(Boolean);
const LIST = args.includes('--list');
const WORLDS = ['maple', 'pirate', 'gameday', 'lantern', 'powder'];

// ── VERDICT RULES ────────────────────────────────────────────────────────────
// pf     the house convention: a line of "  PASS — ..." and no "  FAIL — ..."
// exit   the probe already sets its own exit code; trust it
// re     an explicit pass/fail pair, for the probes that speak their own dialect
const pf = { kind: 'pf' };
const exitCode = { kind: 'exit' };
const re = (pass, fail) => ({ kind: 're', pass, fail });

// ── THE SUITE ────────────────────────────────────────────────────────────────
// `why` is not decoration. A gate nobody understands gets deleted the first time
// it is inconvenient, so every step says what it is protecting.
const SUITE = [
  { id: 'typecheck', tier: 'build', profiles: ['push', 'live'], timeout: 300,
    cmd: ['npx', 'tsc', '--noEmit', '-p', 'tsconfig.json'], verdict: exitCode,
    why: 'the build compiles' },

  { id: 'build', tier: 'build', profiles: ['live'], timeout: 600,
    cmd: ['npx', 'vite', 'build'], verdict: exitCode,
    why: 'dist/ is producible from this source, not left over from an older one' },

  ...WORLDS.map(w => ({ id: `smoke:${w}`, tier: 'runs', profiles: w === 'maple' ? ['push', 'live', 'art'] : ['live'],
    timeout: 420, cmd: ['node', 'qa/smoke.mjs', w, PORT], verdict: pf,
    why: `${w} boots, loads every same-origin asset, grows, eats, and makes a sound` })),

  { id: 'traverse', tier: 'runs', profiles: ['live'], timeout: 900,
    cmd: ['node', 'qa/traverse.mjs', PORT, ...WORLDS], verdict: pf,
    why: 'every size of void can still cross every island — growing never severs the map' },

  { id: 'vary', tier: 'runs', profiles: ['live'], timeout: 900,
    cmd: ['node', 'qa/vary.mjs', PORT, ...WORLDS], verdict: pf,
    why: 'match 2 is not a replay of match 1, and match 1 is the tuned baseline' },

  { id: 'econ', tier: 'money', profiles: ['push', 'live'], timeout: 420,
    cmd: ['node', 'qa/econ.mjs', PORT], verdict: pf,
    why: 'the streak cliff stays dead, bounties pay once, and a gem spend never touches the parental gate' },

  { id: 'iapdoc', tier: 'money', profiles: ['push', 'live'], timeout: 60,
    cmd: ['node', 'qa/iapdoc.mjs'], verdict: re(/APPSTORE\.md and the client agree on every/, /^FAIL \(\d+\)|NOT IN THE DOC|NOT REGISTERED/m),
    why: 'APPSTORE.md and the client agree on every product id, price, world count and asset path — the doc is pasted into App Store Connect' },

  { id: 'normals', tier: 'art', profiles: ['push', 'live', 'art'], timeout: 60,
    cmd: ['node', 'qa/normals.mjs'], verdict: pf,
    why: 'every geometry type is classified round or flat, and no unreviewed faceted form has appeared' },

  // The hero's face is the strongest identity asset in the product and the one
  // element that must not vary by level. It varied by 65 points of grin-share
  // before qa/faceparity.mjs existed, and nothing in this gate could see it —
  // because a mood table entry, not face code, was what deleted the smile.
  // push profile runs two worlds (the measured best and worst); live runs all
  // five. See docs/STUDIO-ROUND-2.md.
  { id: 'faceparity', tier: 'art', profiles: ['push', 'art'], timeout: 1800,
    cmd: ['node', 'qa/faceparity.mjs', PORT, 'pirate', 'powder'], verdict: pf,
    why: 'the hero wears the same face in every world, and no mood deletes his grin' },

  { id: 'faceparity:all', tier: 'art', profiles: ['live'], timeout: 4200,
    cmd: ['node', 'qa/faceparity.mjs', PORT, ...WORLDS], verdict: pf,
    why: 'the hero wears the same face in all five worlds, and no mood deletes his grin' },

  // The screen the owner asked about by name — "when people first pick a level,
  // how does the level look at first glance?" — and the one where a single
  // overlooked min-height made every world's name unreadable. Measures rendered
  // ink contrast, so it can see a text halo; a backdrop-only bar could only ever
  // be satisfied by darkening posters that are APPROVED.
  { id: 'pickerfit', tier: 'ui', profiles: ['push', 'live', 'art'], timeout: 300,
    cmd: ['node', 'qa/pickerfit.mjs', PORT], verdict: pf,
    why: 'a six-year-old can read every world name and tagline on the picker, whatever poster is behind it' },

  // The one event the whole difficulty curve is built around. A hunter's bite
  // used to be followed about a second later by the EVOLVED card, the sound,
  // the buzz and a newsroom headline congratulating the child on growing —
  // punishment dressed as a reward, and it inflated every evolve number the
  // game reported about itself. Plays a real match, takes a real bite through
  // the real handler, and checks the form comes back while the ceremony does
  // not. live only: it needs a genuine two-form climb, which is minutes.
  { id: 'evolveonce', tier: 'feel', profiles: ['live'], timeout: 1200,
    cmd: ['node', 'qa/evolveonce.mjs', PORT, 'maple'], verdict: pf,
    why: 'a child who is eaten and climbs back is not congratulated for it, and still gets their form back' },

  // The moment a child plays for. The gesture was a SHRINK for the whole of
  // this game's life — -12.3% at 0.15s against +4.6% at 0.47s — while the HUD
  // card scaled UP. Pure maths on the live expression, so it costs nothing and
  // cannot be fooled by which frame a slow renderer happened to sample.
  { id: 'evolvepop', tier: 'feel', profiles: ['push', 'live', 'art'], timeout: 30,
    cmd: ['node', 'qa/evolvepop.mjs'], verdict: pf,
    why: 'evolving reads as getting BIGGER — the pop dominates the wind-up and lands with the sound' },

  // unlocks.ts calls the locked art "the advertisement for the next one", and
  // the filter was running that advertisement at a fifth of its colour. Opens
  // the picker in the state a real new player is in — two unlocked, three
  // locked — because every other probe here seeds all five and cannot see it.
  { id: 'lockedcards', tier: 'ui', profiles: ['push', 'live', 'art'], timeout: 300,
    cmd: ['node', 'qa/lockedcards.mjs', PORT], verdict: pf,
    why: 'a child can still tell the locked worlds apart — the art keeps selling the next one' },

  // ── THE QUALITY TIER ─────────────────────────────────────────────────────
  // The owner, after playing a build: "Get a team also on quality."
  //
  // The eight studio teams review SURFACES — is this drawn well. Every one of
  // the six things he reported that day was BEHAVIOUR instead: a collision
  // response that accelerates, an effect that fires too often, a word in a
  // string, a family that never reacts to you. Nothing in the gate could see
  // any of them, which is why he found them and it did not.
  //
  // So the ninth team is not a review meeting, it is this tier. Each step is an
  // instrument with a band at BOTH ends, because every one of these can fail in
  // two directions and the owner named both directions himself: too little and
  // nothing changed, too much and it is a shit show for a six-year-old.
  //
  // It runs as its own profile until each instrument has a green reading, then
  // its steps join push and live. A gate step that has never passed is not
  // protection, it is a blocked pipeline — so they are promoted on evidence,
  // one at a time, and this comment records which are still on probation:
  //   · edgespeed    ON PROBATION — last read 1.78x against a 1.35x bar
  //   · rivalnotice  ON PROBATION — last read 0.0/min in maple, gate open 0%
  //   · ringcount    not a gate step yet; it is a census with no bar, and the
  //                  bar has to come from a measured normal minute, not a guess
  //   · skypop       not a gate step yet; same reason
  { id: 'edgespeed', tier: 'quality', profiles: ['quality'], timeout: 2400,
    cmd: ['node', 'qa/edgespeed.mjs', PORT, 'pirate', 'maple'], verdict: pf,
    why: 'the shore stops, turns or bleeds you off — it never launches you (owner item 3)' },

  { id: 'rivalnotice', tier: 'quality', profiles: ['quality'], timeout: 2400,
    cmd: ['node', 'qa/rivalnotice.mjs', PORT, 'maple', 'pirate'], verdict: pf,
    why: 'a bigger void reacts to you often enough to notice and rarely enough not to swarm (owner item 1)' },

  { id: 'safety', tier: 'words', profiles: ['push', 'live'], timeout: 60,
    cmd: ['node', 'scripts/safety-scan.mjs'], verdict: exitCode,
    why: 'no retired vocabulary in any string a child can read — the 4+ rating depends on it' },

  { id: 'privacy', tier: 'money', profiles: ['push', 'live'], timeout: 60,
    cmd: ['node', 'qa/privacy.mjs'], verdict: pf,
    why: 'nothing identifying leaves a six-year-old\'s phone, and the privacy manifest ships and says so' },

  { id: 'iosname', tier: 'money', profiles: ['push', 'live'], timeout: 30,
    cmd: ['node', 'qa/iosname.mjs'], verdict: pf,
    why: 'the iOS home-screen label matches capacitor.config.ts — cap sync never fixes this one' },

  { id: 'questable', tier: 'money', profiles: ['live'], timeout: 1200,
    cmd: ['node', 'qa/questable.mjs', PORT, ...WORLDS], verdict: pf,
    why: 'over a year of draws, no world can show a daily chip a child cannot clear' },

  { id: 'juice', tier: 'feel', profiles: ['live', 'art'], timeout: 420,
    cmd: ['node', 'qa/juice.mjs', PORT], verdict: pf,
    why: 'a bite is answered on at least three channels, not one' },

  { id: 'aftermatch', tier: 'feel', profiles: ['live'], timeout: 420,
    cmd: ['node', 'qa/aftermatch.mjs', PORT], verdict: pf,
    why: 'the menu theme comes home after TIME!, by both ways out' },

  { id: 'uisystem', tier: 'ui', profiles: ['push', 'live', 'art'], timeout: 300,
    cmd: ['node', 'qa/uisystem.mjs', PORT], verdict: pf,
    why: 'every computed font weight is a face that exists and every size is readable' },

  ...WORLDS.map(w => ({ id: `postpipe:${w}`, tier: 'art', profiles: ['live', 'art'], timeout: 420,
    cmd: ['node', 'qa/postpipe.mjs', w, PORT, '--gate'], verdict: exitCode,
    why: `${w} renders through one colour pipeline: composed matches direct, the hero survives, the sky is a dome` })),

  ...WORLDS.map(w => ({ id: `switch:${w}`, tier: 'runs', profiles: ['live'], timeout: 420,
    cmd: ['node', 'qa/switch.mjs', w, PORT], verdict: pf,
    why: `switching to ${w} reloads, lands on the gate, and the tap starts a scored match` })),

  { id: 'newsstyle', tier: 'words', profiles: ['live'], timeout: 120,
    cmd: ['node', 'qa/newsstyle.mjs'], verdict: re(/^clean$/m, /\d+ problem\(s\)/),
    why: 'the newsroom house style holds across every world and every beat' },

  ...WORLDS.map(w => ({ id: `newsarc:${w}`, tier: 'words', profiles: ['live'], timeout: 600,
    cmd: ['node', 'qa/newsarc.mjs'], env: { ARC_WORLD: w }, verdict: exitCode,
    why: `${w} tells a story in order: morning never mentions the void, nothing repeats, a landmark gets named` })),

  { id: 'fresh', tier: 'words', profiles: ['live'], timeout: 300,
    cmd: ['node', 'qa/fresh.mjs', PORT], verdict: pf,
    why: 'the crowd never repeats itself, and never buys freshness by developing favourites' },

  { id: 'joyedge', tier: 'feel', profiles: ['live'], timeout: 420,
    cmd: ['node', 'qa/joyedge.mjs', PORT], verdict: pf,
    why: 'a thumb near the bezel drives the void as far as a thumb in the middle' },

  { id: 'joyrelease', tier: 'feel', profiles: ['live'], timeout: 420,
    cmd: ['node', 'qa/joyrelease.mjs', PORT], verdict: pf,
    why: 'every way a drive can end actually stops the void — lift, backgrounded, hidden, paused' },

  ...WORLDS.map(w => ({ id: `hero:${w}`, tier: 'art', profiles: ['live', 'art'], timeout: 300,
    cmd: ['node', 'qa/hero.mjs', w, PORT], verdict: pf,
    why: `the void is legible in ${w}'s opening frame, not buried behind scenery` })),

  { id: 'trackprofile', tier: 'audio', profiles: ['live'], timeout: 300, optional: 'FFMPEG_BIN',
    cmd: ['node', 'qa/trackprofile.mjs', '--gate'], verdict: exitCode,
    why: 'every shipped track is mastered to the house spec (-16 LUFS, <=-1 dBTP)' },
];

// ── THE SELF-TEST ────────────────────────────────────────────────────────────
// A gate nobody has watched fail is not a gate, it is a green light with no bulb
// behind it. `--selftest` runs three synthetic steps whose right answers are
// known and asserts this file gets all three right — in particular the third,
// which is the one that matters: a probe that CRASHES prints no verdict, and the
// only dangerous mistake this file could make is reading that silence as consent.
const SELFTEST = [
  { id: 'selftest:says-pass', tier: 'selftest', profiles: [], timeout: 30, expect: true,
    cmd: ['node', '-e', "console.log('\\n  PASS — a probe that reached its conclusion\\n')"], verdict: pf,
    why: 'a probe that prints PASS is read as a pass' },
  { id: 'selftest:says-fail', tier: 'selftest', profiles: [], timeout: 30, expect: false,
    cmd: ['node', '-e', "console.log('\\n  FAIL — two channels answered, contract is three\\n')"], verdict: pf,
    why: 'a probe that prints FAIL is read as a fail' },
  { id: 'selftest:crashes', tier: 'selftest', profiles: [], timeout: 30, expect: false,
    cmd: ['node', '-e', "console.error('Error: connect ECONNREFUSED 127.0.0.1:4177'); process.exit(0)"], verdict: pf,
    why: 'a probe that crashes prints no verdict and exits 0 — silence must read as FAIL, never as consent' },
  { id: 'selftest:hangs', tier: 'selftest', profiles: [], timeout: 3, expect: false,
    cmd: ['node', '-e', "setTimeout(() => {}, 60000)"], verdict: pf,
    why: 'a probe that hangs is killed and read as a fail, not left to stall the gate' },
];

const chosen = args.includes('--selftest') ? SELFTEST
  : SUITE.filter(s => (ONLY.length ? ONLY.some(o => s.id === o || s.id.startsWith(o + ':')) : s.profiles.includes(PROFILE)));

if (LIST) {
  console.log(`\n  GATE — profile "${PROFILE}", ${chosen.length} step(s)\n`);
  let tier = '';
  for (const s of chosen) {
    if (s.tier !== tier) { tier = s.tier; console.log(`  ── ${tier.toUpperCase()}`); }
    console.log(`     ${s.id.padEnd(18)} ${s.why}`);
  }
  console.log('');
  process.exit(0);
}

// ── PREFLIGHT ────────────────────────────────────────────────────────────────
// Three ways to gate a build that is not the build you think it is. Each of
// these has cost this project a session.
const pre = [];
const needsBrowser = !args.includes('--selftest') && chosen.some(s => s.cmd[0] === 'node');
if (needsBrowser) {
  const up = await fetch(`http://127.0.0.1:${PORT}/`, { signal: AbortSignal.timeout(4000) })
    .then(r => r.ok).catch(() => false);
  if (!up) pre.push(`no preview server on :${PORT} — every browser probe below would fail for the wrong reason.\n     npx vite preview --port ${PORT} --strictPort`);
}
// Is dist/ actually this source? A gate run against a stale bundle is worse than
// no gate, because it passes.
if (!args.includes('--selftest')) try {
  const newest = (dir) => readdirSync(dir, { withFileTypes: true }).reduce((m, e) => {
    const p = join(dir, e.name);
    return Math.max(m, e.isDirectory() ? newest(p) : statSync(p).mtimeMs);
  }, 0);
  const src = Math.max(newest('src'), statSync('index.html').mtimeMs);
  const dist = statSync('dist/index.html').mtimeMs;
  if (src > dist) pre.push(`dist/ is OLDER than src/ — you would be gating a stale bundle. Run: npx vite build`);
} catch { pre.push('dist/index.html is missing — run: npx vite build'); }

if (pre.length) {
  console.log('\n  GATE ABORTED — preflight\n');
  for (const m of pre) console.log(`   ✗ ${m}`);
  console.log('\n  Nothing was measured. This is not a FAIL of the game.\n');
  process.exit(2);
}

// ── RUN ──────────────────────────────────────────────────────────────────────
const strays = () => new Promise(res => {
  const k = spawn('bash', ['-c', "pkill -f 'chrome-linux/chrome' 2>/dev/null; pkill -f 'pw-browsers/chromium' 2>/dev/null; true"]);
  k.on('close', () => res());
});

const run = (step) => new Promise(res => {
  const t0 = Date.now();
  const c = spawn(step.cmd[0], step.cmd.slice(1), {
    env: { ...process.env, ...(step.env || {}) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '', killed = false;
  const timer = setTimeout(() => { killed = true; c.kill('SIGKILL'); }, step.timeout * 1000);
  c.stdout.on('data', d => { out += d; });
  c.stderr.on('data', d => { out += d; });
  c.on('close', (code) => {
    clearTimeout(timer);
    const ms = Date.now() - t0;
    if (killed) {
      // ── A TIMEOUT IS NOT A FAILING PROBE, AND SAYING SO MATTERS ───────────
      // smoke:maple passes in about 325s against a 420s budget. Run the gate
      // while eighteen studio subagents are competing for four cores and it
      // crosses 420 without anything being wrong with the game — a RED that
      // means "this machine was busy", printed identically to a RED that means
      // "the game is broken". A gate whose reds cannot be told apart is a gate
      // people learn to re-run rather than read, which is the whole failure
      // mode this file exists to prevent.
      //
      // So the load at kill time is recorded next to the verdict. It stays a
      // FAIL — silence is failure, and a probe that did not finish did not
      // reach a conclusion — but the reader is told which kind of red it is
      // and what to do about it.
      let load = '';
      try {
        const [m1] = os.loadavg();
        const n = os.cpus().length || 1;
        load = ` — load ${m1.toFixed(1)} on ${n} core(s)`
          + (m1 > n * 1.5 ? `, i.e. the machine was oversubscribed; re-run this step on a quiet box before believing it` : '');
      } catch { /* loadavg is not available everywhere */ }
      return res({ ...step, ok: false, why_not: `timed out after ${step.timeout}s${load}`, out, ms });
    }
    let ok, why_not = '';
    if (step.verdict.kind === 'exit') {
      ok = code === 0;
      if (!ok) why_not = `exit ${code}`;
    } else if (step.verdict.kind === 'pf') {
      const pass = /^\s*PASS\s*[—-]/m.test(out), fail = /^\s*FAIL\s*[—-]/m.test(out);
      ok = pass && !fail;
      // Silence is failure. A probe that printed neither verdict did not run.
      if (!pass && !fail) why_not = `no verdict printed (exit ${code}) — the probe did not reach its own conclusion`;
      else if (fail) why_not = (out.match(/^\s*FAIL\s*[—-].*$/m) || [''])[0].trim();
    } else {
      const pass = step.verdict.pass.test(out), fail = step.verdict.fail.test(out);
      ok = pass && !fail;
      if (!pass && !fail) why_not = `no verdict printed (exit ${code}) — the probe did not reach its own conclusion`;
      else if (fail) why_not = (out.match(step.verdict.fail) || [''])[0].trim();
    }
    res({ ...step, ok, why_not, out, ms, code });
  });
  c.on('error', (e) => { clearTimeout(timer); res({ ...step, ok: false, why_not: `could not start: ${e.message}`, out, ms: Date.now() - t0 }); });
});

console.log(`\n  GATE — profile "${PROFILE}" — ${chosen.length} step(s) on :${PORT}\n`);
const results = [];
for (const step of chosen) {
  if (step.optional && !process.env[step.optional]) {
    console.log(`   ‑ ${step.id.padEnd(18)} SKIPPED (needs ${step.optional})`);
    results.push({ ...step, skipped: true, ok: true, out: '', ms: 0 });
    continue;
  }
  process.stdout.write(`   · ${step.id.padEnd(18)} `);
  const r = await run(step);
  results.push(r);
  const secs = (r.ms / 1000).toFixed(0).padStart(4);
  console.log(`${r.ok ? 'pass' : 'FAIL'} ${secs}s${r.ok ? '' : '  — ' + r.why_not}`);
  await strays();
}

// ── REPORT ───────────────────────────────────────────────────────────────────
if (args.includes('--selftest')) {
  const wrong = results.filter(r => r.ok !== r.expect);
  console.log('');
  for (const r of results) console.log(`   ${r.ok === r.expect ? 'correct' : 'WRONG  '}  ${r.id.padEnd(22)} expected ${r.expect ? 'pass' : 'FAIL'}, read ${r.ok ? 'pass' : 'FAIL'}`);
  console.log(`\n  ${wrong.length ? `SELFTEST FAIL — this gate misreads ${wrong.length} of ${results.length} known answers and cannot be trusted`
    : `SELFTEST PASS — the gate reads all ${results.length} known answers correctly, silence included`}\n`);
  process.exit(wrong.length ? 1 : 0);
}

const failed = results.filter(r => !r.ok);
const skipped = results.filter(r => r.skipped);
mkdirSync('qa/out/gate', { recursive: true });
const stamp = new Date().toISOString();
const md = [
  `# RELEASE GATE — ${failed.length ? 'FAIL' : 'PASS'}`,
  ``,
  `profile \`${PROFILE}\` · ${results.length} steps · ${failed.length} failed · ${skipped.length} skipped`,
  `· ${stamp}`,
  ``,
  `| step | verdict | secs | what it protects |`,
  `|---|---|---|---|`,
  ...results.map(r => `| \`${r.id}\` | ${r.skipped ? 'skipped' : r.ok ? 'pass' : '**FAIL**'} | ${(r.ms / 1000).toFixed(0)} | ${r.why} |`),
  ``,
  ...(failed.length ? [`## What failed`, ``, ...failed.flatMap(r => [
    `### \`${r.id}\` — ${r.why_not}`, ``, '```', r.out.trim().split('\n').slice(-40).join('\n'), '```', ``,
  ])] : [`Every step reached its own conclusion and that conclusion was pass.`]),
].join('\n');
writeFileSync('qa/out/gate/report.md', md);
writeFileSync('qa/out/gate/report.json', JSON.stringify(
  results.map(({ id, tier, ok, skipped: sk, why, why_not, ms }) => ({ id, tier, ok, skipped: !!sk, why, why_not, ms })), null, 2));

console.log(`\n  ${failed.length ? `GATE FAIL — ${failed.length}/${results.length} step(s): ${failed.map(f => f.id).join(', ')}`
  : `GATE PASS — ${results.length} step(s), every one reached its own conclusion`}`);
console.log(`  report: qa/out/gate/report.md\n`);
process.exit(failed.length ? 1 : 0);
