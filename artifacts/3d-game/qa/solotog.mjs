// DOES THE SOLO TOGGLE ACTUALLY DO ANYTHING?
//
// SOLO RUN moved off the menu and into the level picker as a persisted
// toggle. That change touched four things at once — the control, the storage,
// the two startFresh call sites, and the deletion of a handler that used to
// set voidTut as a side effect — so "it compiles and the button lights up" is
// not evidence that a solo match starts.
//
// The observable difference between solo and a normal run is not cosmetic:
// solo is 120s instead of 180s, the rival leaderboard is hidden, and no rivals
// are scheduled. This checks all three, then reloads to prove the setting
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
/** open the picker, read the toggle, optionally flip it, then launch maple */
async function play(flip) {
  await p.click('#btnPlay');
  await p.waitForTimeout(900);
  const before = await p.evaluate(() => document.getElementById('soloTog').classList.contains('on'));
  if (flip) { await p.click('#soloTog'); await p.waitForTimeout(200); }
  const after = await p.evaluate(() => document.getElementById('soloTog').classList.contains('on'));
  await p.click('#worldRow .wCard[data-world="maple"]');
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 600000 });
  await p.evaluate(() => { window.__renderer.render = () => {}; });
  const st = await p.evaluate(() => {
    const m = window.__matchState();
    // matchLen is not exposed, but the countdown is: solo runs 120s against
    // 180, so the clock a few seconds in separates them by a minute.
    return { clock: Math.round(m.clock), rivals: m.rivals.length,
      board: getComputedStyle(document.getElementById('board')).display,
      stored: localStorage.getItem('voidSolo') };
  });
  return { before, after, ...st };
}

await boot();
const off = await play(false);
check('default is rivals-on', off.before === false && off.after === false, `chip on=${off.after}`);
check('normal run is the 3:00 match', off.clock > 150, `clock=${off.clock}s`);
check('normal run schedules rivals', off.rivals > 0, `${off.rivals} rivals`);
check('leaderboard visible in normal run', off.board !== 'none', `board display=${off.board}`);

// flip it on, mid-session
await boot();
const on = await play(true);
check('toggle turns on', on.after === true, `chip on=${on.after}, stored=${on.stored}`);
check('solo run is the 2:00 match', on.clock <= 120, `clock=${on.clock}s`);
check('solo schedules no rivals', on.rivals === 0, `${on.rivals} rivals`);
check('leaderboard hidden in solo', on.board === 'none', `board display=${on.board}`);
check('setting written to storage', on.stored === '1', `voidSolo=${on.stored}`);

// …and the thing the old button could never do: survive a reload
await boot();
const kept = await p.evaluate(() => localStorage.getItem('voidSolo'));
await p.click('#btnPlay'); await p.waitForTimeout(900);
const chip = await p.evaluate(() => document.getElementById('soloTog').classList.contains('on'));
check('survives a reload', kept === '1' && chip === true, `voidSolo=${kept}, chip on=${chip}`);

for (const r of rows) console.log(r);
const allOk = rows.every((r) => r.startsWith('PASS'));
console.log(allOk ? '\nALL PASS' : '\nFAILURES ABOVE');
await b.close();
process.exit(allOk ? 0 : 1);
