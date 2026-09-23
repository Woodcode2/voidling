// DOES THE SOLO TOGGLE ACTUALLY DO ANYTHING?
//
// SOLO RUN moved off the menu and into the level picker as a persisted
// toggle. That change touched four things at once — the control, the storage,
// the two startFresh call sites, and the deletion of a handler that used to
// set voidTut as a side effect — so "it compiles and the button lights up" is
// not evidence that a solo match starts.
//
// The observable difference between solo and a normal run is not cosmetic:
// solo is 120s instead of 180s and no rivals join. The two leaderboard
// assertions were cut 2026-08-29 with the board itself — they hard-dereferenced
// getComputedStyle(#board) and would throw on a null the moment it was deleted.
// are scheduled. This checks both, then reloads to prove the setting
// survived, which is the part the old button never did.
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });

const rows = [];
const check = (name, ok, detail) => rows.push(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(34)} ${detail}`);

async function boot() {
  await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
}
/** open the picker (the world's name is its door since one-tap PLAY), read
 *  the toggle, optionally flip it, then launch maple from its card */
async function viaPicker(flip) {
  await p.click('#worldSwitch');
  await p.waitForTimeout(900);
  const before = await p.evaluate(() => document.getElementById('soloTog').classList.contains('on'));
  if (flip) { await p.click('#soloTog'); await p.waitForTimeout(200); }
  const after = await p.evaluate(() => document.getElementById('soloTog').classList.contains('on'));
  await p.click('#worldRow .wCard[data-world="maple"]');
  return { before, after, ...(await sample()) };
}
/** PLAY on the menu — one tap, no picker. The toggle it must honour was set
 *  in the picker and persisted. */
async function viaPlay() {
  await p.click('#btnPlay');
  return sample();
}
async function sample() {
  // SAMPLE LATE ENOUGH THAT THE ANSWER CAN BE "NO".
  // Rivals join on a stagger — CHOMPZILLA at 7-13s and the rest on later
  // slots — so at t=3s a NORMAL run has nobody joined either, and "solo has no
  // rivals" passes without being able to tell the two modes apart. A test that
  // cannot fail is not evidence. 20s is past the first join slot in every
  // world, so the normal run is now required to show somebody, which is what
  // makes the solo zero mean something.
  await p.evaluate(() => { window.__renderer.render = () => {}; });   // ~9x faster with no draw
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 20, null, { timeout: 900000 });
  return p.evaluate(() => {
    const m = window.__matchState();
    // matchLen is not exposed, but the countdown is: solo runs 120s against
    // 180, so the clock a few seconds in separates them by a minute.
    // JOINED, not roster length. rivals.list is the full cast whether or not
    // anyone is playing — solo suppresses them by never advancing their clock
    // (rivals.update is fed t=0), so `joined` stays false and they are never
    // spawned or drawn. The first version of this test counted the roster and
    // reported a bug that did not exist.
    return { clock: Math.round(m.clock),
      rivals: m.rivals.filter((r) => r.joined).length, roster: m.rivals.length,
      stored: localStorage.getItem('voidSolo') };
  });
}

await boot();
const off = await viaPicker(false);
check('default is rivals-on', off.before === false && off.after === false, `chip on=${off.after}`);
check('normal run is the 3:00 match', off.clock > 150, `clock=${off.clock}s`);
check('normal run lets rivals join', off.rivals > 0, `${off.rivals} joined of ${off.roster}`);

// flip it on, mid-session
await boot();
const on = await viaPicker(true);
check('toggle turns on', on.after === true, `chip on=${on.after}, stored=${on.stored}`);
check('solo run is the 2:00 match', on.clock <= 120, `clock=${on.clock}s`);
check('solo lets none join', on.rivals === 0, `${on.rivals} joined of ${on.roster}`);
check('setting written to storage', on.stored === '1', `voidSolo=${on.stored}`);

// …and the thing the old button could never do: survive a reload
await boot();
const kept = await p.evaluate(() => localStorage.getItem('voidSolo'));
await p.click('#worldSwitch'); await p.waitForTimeout(900);
const chip = await p.evaluate(() => document.getElementById('soloTog').classList.contains('on'));
check('survives a reload', kept === '1' && chip === true, `voidSolo=${kept}, chip on=${chip}`);

// …AND PLAY HONOURS IT. The toggle persists so that a child who wants no
// rivals gets none every time — but PLAY on the menu called startFresh(false),
// so every match started there, and every PLAY AGAIN after it, was a race
// whatever the chip said (verify pass on the pre-merge fixes, logic-4).
await boot();
const play = await viaPlay();
check('PLAY honours BY MYSELF: 2:00', play.clock <= 120, `clock=${play.clock}s`);
check('PLAY honours BY MYSELF: none join', play.rivals === 0, `${play.rivals} joined of ${play.roster}`);

for (const r of rows) console.log(r);
const nBad = rows.filter((r) => !r.startsWith('PASS')).length;
await b.close();
// two literal verdicts for qa/idiomguard.mjs (#2a)
if (nBad) console.log(`\nFAIL — ${nBad} of ${rows.length} check(s)`);
else console.log(`\nPASS — ${rows.length} checks: the toggle works from the picker, persists, and PLAY honours it`);
process.exit(nBad ? 1 : 0);
