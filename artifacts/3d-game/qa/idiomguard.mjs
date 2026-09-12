// ── THE FOUR WAYS A PROBE IN THIS DIRECTORY LIES ────────────────────────────
//
// MENU-BRIEF §6 day 11. Static: it reads files, runs no browser, and takes under
// a second. It exists because every rule it enforces was learned by losing a day
// to it, and a lesson that lives only in a commit message is a lesson the next
// probe author will not have read.
//
// GUARD 1 · THE DEAD RITUAL. Until day 7, PLAY opened the world picker and a
// second click on a card started the match. From day 7 PLAY PLAYS. That made the
// second click land on a card inside a closed overlay, and Playwright waits
// thirty seconds for something invisible and then throws — in 339 files. A
// second, quieter version of the same ritual clicked PLAY and then waited for a
// card to APPEAR, with no click at all (22 files, two of them gate steps;
// pickerfit's step timed out at 300s against a 27s baseline). Both are now
// qa/_enter.mjs, which handles the same-world case and the real-switch case
// separately because they were always two different intentions spelled the same
// way.
//
// GUARD 2 · SILENCE IS FAILURE. gate.mjs judges a step by scanning its whole
// stdout for "PASS —" and "FAIL —" (:583-587). A probe that prints neither is
// read as a pass; a probe that prints six PASS lines and then throws on bar
// seven is ALSO read as a pass, because `pass && !fail` over the whole output
// does not care where the tokens fell. So every registered probe must be able to
// print both, and must install the two handlers that turn a throw into a verdict
// rather than into silence.
//
// GUARD 3 · THE CALENDAR TRAP, which is three hours old at the time of writing
// and is exactly the kind of thing this file is for. #daily used to rise
// full-screen whenever voidDailyLast !== today, so 383 of the 613 files in here
// seed it — every author who did not had their first click eaten and added the
// seed rather than asking why. The card is gone from that path now, but the
// day's coins are CLAIMED SILENTLY on the first finish of the day, which means a
// probe that finishes a match without seeding the key gets 90-300 coins it did
// not ask for. Any probe that finishes a match AND asserts on the wallet must
// say which side of midnight it is on.
//
// GUARD 4 · A REGISTERED FILE THAT IS NOT THERE. gate.mjs names its probes by
// path; a rename lands as "cannot find module", which is a crash, which prints
// no verdict, which guard 2 covers only for files that exist.
//
//   node qa/idiomguard.mjs
import { readFileSync, readdirSync } from 'node:fs';

const t0 = Date.now();
const bad = [];
let bars = 0;
const ok = (m) => { bars++; console.log(`  ok   ${m}`); };
const no = (m) => { bars++; bad.push(m); console.log(`  BAD  ${m}`); };

process.on('uncaughtException', (e) => {
  console.log(`\nFAIL — idiomguard threw: ${String(e && e.message || e).split('\n')[0]}`); process.exit(1); });

const FILES = readdirSync('qa').filter((f) => f.endsWith('.mjs') && f !== 'idiomguard.mjs');
const read = (f) => { try { return readFileSync(`qa/${f}`, 'utf8'); } catch { return ''; } };
const src = new Map(FILES.map((f) => [f, read(f)]));

/** Which files the gate actually runs, and under which profiles. Parsed from the
 *  registry rather than listed here, so a probe added to the gate is guarded on
 *  the day it is added and not on the day somebody remembers this file. */
const gate = readFileSync('qa/gate.mjs', 'utf8');
const registered = new Map();
// PARSED PER STEP, NOT BY ONE BIG PATTERN — and then CHECKED. The first version
// walked the whole file with a single regex whose gaps were `[^}]*?`, and four
// steps (placement, rng, settle, newsfeed) carry `env: { SEED: '7' }` between
// cmd and verdict. The brace stopped the gap dead and those four were dropped in
// silence: the guard reported "all 52 registered probe files exist" over a
// registry of 59. A guard that quietly skips rows is a guard that lies about the
// rows it did read, so the count is now asserted against the number of `id:`
// keys in the file and a mismatch is a failure in its own right.
const seen = new Set();
const chunks = gate.split(/\{\s*id:\s*/).slice(1);
for (const c of chunks) {
  const id = (c.match(/^[`'"]([^`'"]+)[`'"]/) || [])[1];
  if (!id) continue;
  seen.add(id);
  const body = c.slice(0, c.search(/\n\s*\{\s*id:|\n\];/) + 1 || undefined);
  const file = (body.match(/'qa\/([A-Za-z0-9_.-]+\.mjs)'/) || [])[1];
  const verdict = (body.match(/verdict:\s*([A-Za-z]+)/) || [])[1] || '?';
  const profiles = ((body.match(/profiles:\s*\[([^\]]*)\]/) || [])[1] || '')
    .replace(/['\s]/g, '').split(',').filter(Boolean);
  // NOT every step runs a probe FILE. typecheck runs tsc, build runs vite, and
  // the selftest:* steps are the gate proving to itself that it can still tell a
  // pass from a crash (`node -e`). Those are seen and deliberately unregistered;
  // the guards below are about probe files, so only files land in `registered`.
  if (file) registered.set(id, { file, verdict, profiles });
}

// ═══ GUARD 0 · THIS FILE CAN READ THE REGISTRY IT IS GUARDING ══════════════
// Every guard below is only as true as this parse. Template-literal ids
// (`newsarc:${w}`) are generated per world and carry no literal file, so they
// are counted out rather than demanded.
{
  // NAMED, NOT COUNTED. A count mismatch says a row was lost; it does not say
  // which, and "58 of 59" sent me looking through the whole registry by hand.
  // SEEN, not registered: the question is whether the PARSER reached every step,
  // which is different from whether every step names a probe file. Asking the
  // second question reported typecheck, build, safety and the four selftests as
  // losses — they are steps that run tsc, vite and `node -e` by design.
  const ids = [...gate.matchAll(/\{\s*id:\s*[`'"]([^`'"]+)[`'"]/g)].map((m) => m[1]);
  const lost = ids.filter((id) => !seen.has(id));
  const fileless = ids.filter((id) => seen.has(id) && !registered.has(id));
  if (!lost.length) ok(`#0 the registry parsed whole: all ${ids.length} step(s) read, `
    + `${registered.size} of them running a probe file (${fileless.length} run a tool directly)`);
  else no(`#0 the registry did NOT parse whole — every guard below is silently blind to `
    + `${lost.length} step(s): ${lost.join(', ')}`);
}

// ═══ GUARD 4 · EVERY REGISTERED PROBE EXISTS ═══════════════════════════════
{
  const missing = [...registered].filter(([, r]) => !src.has(r.file));
  if (!missing.length) ok(`#4 all ${registered.size} registered probe files exist`);
  else no(`#4 the gate names ${missing.length} file(s) that are not there — a rename lands as `
    + `"cannot find module", which prints no verdict at all: `
    + missing.map(([id, r]) => `${id} → qa/${r.file}`).join(', '));
}

// ═══ GUARD 1 · THE DEAD RITUAL ═════════════════════════════════════════════
{
  const PLAY = /\.click\(\s*['"`]#btnPlay['"`]/;
  const CARD = /\.click\(\s*[`'"][^`'"]*\.wCard\[data-world/;
  const WAIT_CARD = /waitForSelector\(\s*[`'"][^`'"]*#worldRow[^`'"]*\.wCard/;
  const offenders = [];
  for (const [f, s] of src) {
    if (f.startsWith('_enter')) continue;          // the helper IS the fix
    if (!PLAY.test(s)) continue;
    // the two clicks have to be in the same file AND the card click must come
    // after PLAY; a file that only ever clicks a card is doing a real switch
    const iPlay = s.search(PLAY);
    const iCard = s.search(CARD);
    const iWait = s.search(WAIT_CARD);
    if (iCard > iPlay) offenders.push(`${f} (PLAY then a world card — use enterMatch())`);
    else if (iWait > iPlay) offenders.push(`${f} (PLAY then waits for the picker — use openPicker())`);
  }
  // A BAR FOR THE GATE'S OWN FILES, A REPORT FOR THE REST. The gate protects the
  // gate: a registered probe using the dead ritual is a step that will time out,
  // and that is a failure now. The 20-odd `_`-prefixed diagnostics are one-off
  // instruments nobody runs unattended — broken, and worth counting so the number
  // can only go down, but failing the whole suite over a scratch file is how a
  // guard gets switched off.
  const reg = new Set([...registered.values()].map((r) => r.file));
  const inGate = offenders.filter((o) => reg.has(o.split(' ')[0]));
  const scratch = offenders.filter((o) => !reg.has(o.split(' ')[0]));
  if (!inGate.length) ok(`#1 no REGISTERED probe still opens the picker with PLAY (${src.size} files read)`);
  else no(`#1 ${inGate.length} registered probe(s) still use the pre-day-7 ritual, which waits 30s for an `
    + `invisible card and then throws: ${inGate.join('; ')}`);
  if (scratch.length) {
    console.log(`  ·    #1b ${scratch.length} unregistered diagnostic(s) still use it (REPORT — they are `
      + `one-off instruments, but the next person to run one loses half an hour): `
      + `${scratch.slice(0, 6).map((o) => o.split(' ')[0]).join(', ')}`
      + (scratch.length > 6 ? ` …and ${scratch.length - 6} more` : ''));
  }
}

// ═══ GUARD 2 · EVERY REGISTERED PROBE CAN REACH A VERDICT ══════════════════
// ONLY THE `pf` STEPS. The gate has three ways of judging a step — `pf` scans
// stdout for the two tokens, `exitCode` reads the exit status, and `re(pass,
// fail)` matches a pair of patterns a step chose for itself. The first version
// of this guard applied the token rule to all of them and reported nine broken
// probes, of which every one was fine: iapdoc is judged by regex, opening by
// exit code. A guard that fails for the wrong reason is worse than no guard,
// because somebody will spend an afternoon on its finding.
{
  const mute = [], unguarded = [];
  for (const [id, r] of registered) {
    const s = src.get(r.file);
    if (s === undefined) continue;                 // guard 4 owns that case
    if (r.verdict !== 'pf') continue;              // judged another way, by choice
    if (!/PASS\s+—/.test(s) || !/FAIL\s+—/.test(s)) mute.push(`${id} (qa/${r.file})`);
    // a throw must become a FAIL line, not silence: gate.mjs reads `pass && !fail`
    // over the whole stdout, so a probe that dies after printing a PASS is a pass
    if (!/uncaughtException/.test(s) || !/unhandledRejection/.test(s)) {
      unguarded.push(`${id} (qa/${r.file})`);
    }
  }
  const pfN = [...registered.values()].filter((r) => r.verdict === 'pf').length;
  if (!mute.length) ok(`#2a every pf-judged probe can print both verdicts (${pfN} of ${registered.size} steps)`);
  else no(`#2a ${mute.length} registered probe(s) cannot print one of the two verdict tokens, so the `
    + `gate reads them as PASS whatever they do: ${mute.slice(0, 10).join(', ')}`
    + (mute.length > 10 ? ` …and ${mute.length - 10} more` : ''));
  // REPORTED, NOT BARRED — for now. Most of this suite predates the rule and a
  // bar that fails on 30 historical files on the day it is written is a bar
  // somebody switches off. Printed every run so the number can only go down,
  // and armed as a bar once it reaches zero.
  console.log(`  ·    #2b ${unguarded.length} of ${pfN} pf-judged probe(s) do not turn a `
    + `throw into a FAIL line (REPORT, not a bar — see the note)`
    + (unguarded.length ? `: ${unguarded.slice(0, 6).join(', ')}${unguarded.length > 6 ? ' …' : ''}` : ''));
}

// ═══ GUARD 3 · WHICH SIDE OF MIDNIGHT ══════════════════════════════════════
{
  // finishes a match AND reads the wallet, but never says what day it is
  const ENDS = /#end\.show|__matchState\(\)\.(?:ended|over)|btnAgain|btnHome/;
  const WALLET = /voidCoins|voidGems|addCoins/;
  const SEED = /voidDailyLast/;
  const exposed = [];
  for (const [f, s] of src) {
    if (!ENDS.test(s) || !WALLET.test(s) || SEED.test(s)) continue;
    exposed.push(f);
  }
  if (!exposed.length) {
    ok(`#3 every probe that finishes a match and reads the wallet says which side of midnight it is on`);
  } else {
    no(`#3 ${exposed.length} probe(s) finish a match and assert on coins without seeding voidDailyLast — `
      + `the day's calendar is now claimed SILENTLY on the first finish of the day, so their wallets `
      + `carry 90-300 coins nobody asked for: ${exposed.slice(0, 8).join(', ')}`
      + (exposed.length > 8 ? ` …and ${exposed.length - 8} more` : ''));
  }
}

const secs = ((Date.now() - t0) / 1000).toFixed(1);
if (bad.length) {
  console.log('');
  for (const m of bad) console.log(`  · ${m}`);
  console.log(`\nFAIL — ${bad.length} of ${bars} guard(s) [${secs}s]`);
  process.exit(1);
}
console.log(`\nPASS — ${bars} guards over ${src.size} probe files [${secs}s]`);
