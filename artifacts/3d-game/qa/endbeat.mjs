// THE END BEAT — nothing talks over the whistle, and leaving means leaving
//
//   node qa/endbeat.mjs [port] [world]
//
// The verify pass on the pre-merge fixes (logic-2 / audio-4) found the hole the
// outro gate left: the goal check runs near the top of animate(), BEFORE the
// eat loop, so the bite that meets a goal is captured while outroT is still 0.
// If that bite is a tenth link it plays its crown — a triad, a duck, a float
// and a buzz — and the whistle blows one frame later on top of it. And
// (logic-1 / logic-3) the outro's clock ran on under the pause sheet, so a
// pause inside it ran endMatch behind the modal; LEAVE THE MATCH from there did
// not stop the outro either, so the results card could land on the menu.
//
// Drive, on the game's own clock:
//   A  a dot-1 match; a chain built to 9 links (or 19…); the score set one
//      point under the goal and the tenth link eaten in the same task — the
//      bite that wins is the bite that crowns.
//   B  a dot-1 match; the goal met; the pause button inside the outro; LEAVE
//      THE MATCH (two taps); then 3 s of tClock.
//   C  a dot-1 match; the goal met; the pause button inside the outro; 3 s of
//      tClock under the sheet; then KEEP PLAYING.
// Bars:
//   (a) A: no nomCrown between the winning bite and 0.6 s after the whistle
//   (b) A: the whistle did blow
//   (c) B: 3 s after leaving, the menu is up and the results card is not
//   (d) B: no finale() after the tap that left
//   (e) C: 3 s under the sheet and the results card has not come up behind it
//   (f) C: after KEEP PLAYING the end still arrives — the outro was held, not lost
import { chromium } from 'playwright';
const POS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const PORT = POS[0] || '4177', WORLD = POS[1] || 'maple';
const die = (m) => { console.log(`FAIL — ${m}`); process.exit(1); };
process.on('unhandledRejection', (e) => die(`rejected: ${(e && e.message) || e}`));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

async function open() {
  const p = await b.newPage({ viewport: { width: 430, height: 932 } });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try { localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1'); localStorage.setItem('voidFirstNom', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}&g=1&len=60`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 600000 });
  const ok = await p.evaluate(() => ({ calls: typeof window.__audioCalls === 'function', combo: typeof window.__matchState().combo === 'number',
    goal: window.__goalState?.() }));
  if (!ok.calls) die('__audioCalls is missing — this build cannot say what it played');
  if (!ok.combo) die('__matchState().combo is missing — this build has no chain');
  if (!ok.goal || ok.goal.n !== 1) die(`?g=1 did not make a dot-1 level match (goal ${JSON.stringify(ok.goal)})`);
  return p;
}

let bad = 0;
const bar = (ok, id, msg) => { console.log(`  ${ok ? 'ok  ' : 'BAD '} (${id}) ${msg}`); if (!ok) bad++; };
console.log(`\n  END BEAT — ${WORLD} on :${PORT}\n`);

{ // ── A: the bite that wins is the bite that crowns ──
  const p = await open();
  const eat = await p.evaluate(() => window.__levelSpec().eat);
  // build the chain to one short of a crown, a bite at a time on the game clock
  let combo = 0;
  for (let i = 0; i < 40 && combo % 10 !== 9; i++) {
    const t = await p.evaluate(() => window.__matchState().t);
    await p.waitForFunction((x) => window.__matchState().t >= x, t + 0.12, { timeout: 600000, polling: 100 });
    combo = await p.evaluate(() => { window.__eatNearest(0.1); return window.__matchState().combo; });
  }
  if (combo % 10 !== 9) die(`could not build the chain to a crown's eve (reached ${combo})`);
  // one point under the goal, and the crowning bite, in one task: capture runs
  // before the next frame's goal check, exactly as a real bite does
  const shot = await p.evaluate((e) => {
    window.__setScore(e - 1);
    const tc = window.__matchState().tClock;
    const hit = window.__eatNearest(0.1);
    return { tc, hit: !!hit, combo: window.__matchState().combo, score: window.__matchState().score };
  }, eat);
  if (!shot.hit) die('no prop in reach for the winning bite');
  await p.waitForFunction(() => window.__goalState()?.met, null, { timeout: 600000, polling: 100 });
  const tw = await p.evaluate(() => window.__matchState().tClock);
  await p.waitForFunction((t) => window.__matchState().tClock > t + 0.7, tw, { timeout: 600000, polling: 200 });
  const calls = (await p.evaluate(() => window.__audioCalls())).filter((c) => c.t >= shot.tc - 0.01);
  await p.close();
  const whistle = calls.find((c) => c.id === 'whistle');
  const until = (whistle ? whistle.t : tw) + 0.6;
  const crowns = calls.filter((c) => c.id === 'nomCrown' && c.t <= until);
  console.log(`  ·    A: chain ${shot.combo} on the winning bite at tClock ${shot.tc.toFixed(2)}; calls after it: ${calls.filter((c) => c.t <= until).map((c) => c.id).join(' ') || 'none'}`);
  bar(!crowns.length, 'a', crowns.length ? `the winning bite crowned the chain (${crowns.length} nomCrown) and the whistle blew ${whistle ? `${((whistle.w - crowns[0].w) * 1000).toFixed(0)} ms` : ''} after it — two celebrations on one beat`
    : 'no crown on the bite that won: the whistle has the beat to itself');
  bar(!!whistle, 'b', whistle ? 'the whistle blew' : 'no whistle — the end did not open through the goal door');
}

{ // ── B: pause inside the outro, then leave ──
  const p = await open();
  const eat = await p.evaluate(() => window.__levelSpec().eat);
  await p.evaluate((e) => window.__setScore(e + 1), eat);
  await p.waitForFunction(() => window.__goalState()?.met, null, { timeout: 600000, polling: 50 });
  const inOutro = await p.evaluate(() => {
    const endUp = document.getElementById('end')?.classList.contains('show');
    document.getElementById('btnQuit').click();
    return { endUp, paused: document.getElementById('pause')?.classList.contains('show') };
  });
  if (inOutro.endUp) die('the results card was already up when the pause was taken — the outro was missed, nothing tested');
  if (!inOutro.paused) die('the pause sheet did not come up inside the outro — cannot test a pause there');
  const tq = await p.evaluate(() => {
    const q = document.getElementById('pauseQuit'); q.click(); q.click();
    return window.__matchState().tClock;
  });
  const wq = await p.evaluate(() => performance.now() / 1000);
  await p.waitForFunction((t) => window.__matchState().tClock > t + 3, tq, { timeout: 900000, polling: 250 });
  const after = await p.evaluate((w) => ({
    end: !!document.getElementById('end')?.classList.contains('show'),
    menu: document.body.classList.contains('menu'),
    finale: (window.__audioCalls() ?? []).filter((c) => c.id === 'finale' && (c.w ?? 0) >= w).length,
  }), wq);
  await p.close();
  console.log(`  ·    B: paused inside the outro, left; 3 s later menu ${after.menu ? 'up' : 'down'}, results card ${after.end ? 'UP' : 'down'}, finale calls ${after.finale}`);
  bar(after.menu && !after.end, 'c', after.end ? 'the results card came up after she left — the outro ran out on the menu'
    : after.menu ? 'she left, and the menu is what she sees' : 'the menu is not up after leaving');
  bar(!after.finale, 'd', after.finale ? `${after.finale} finale() after the tap that left — the end's fanfare played on the menu` : 'no finale after leaving');
}
{ // ── C: a pause inside the outro holds it ──
  const p = await open();
  const eat = await p.evaluate(() => window.__levelSpec().eat);
  await p.evaluate((e) => window.__setScore(e + 1), eat);
  await p.waitForFunction(() => window.__goalState()?.met, null, { timeout: 600000, polling: 50 });
  const tp = await p.evaluate(() => {
    if (document.getElementById('end')?.classList.contains('show')) return null;
    document.getElementById('btnQuit').click();
    return document.getElementById('pause')?.classList.contains('show') ? window.__matchState().tClock : null;
  });
  if (tp == null) die('could not take a pause inside the outro — nothing tested');
  await p.waitForFunction((t) => window.__matchState().tClock > t + 3, tp, { timeout: 900000, polling: 250 });
  const held = await p.evaluate(() => ({ end: !!document.getElementById('end')?.classList.contains('show'),
    sheet: !!document.getElementById('pause')?.classList.contains('show') }));
  await p.evaluate(() => document.getElementById('pauseResume').click());
  const tr = await p.evaluate(() => window.__matchState().tClock);
  const arrived = await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 900000, polling: 250 })
    .then(() => true, () => false);
  const ta = await p.evaluate(() => window.__matchState().tClock);
  await p.close();
  console.log(`  ·    C: 3 s under the sheet (still up: ${held.sheet}): results card ${held.end ? 'UP behind it' : 'down'}; after KEEP PLAYING the card ${arrived ? `came up ${(ta - tr).toFixed(2)} s later` : 'never came'}`);
  bar(!held.end, 'e', held.end ? 'the outro ran out under the pause sheet: endMatch, the finale and the confetti behind a modal' : 'the outro held under the sheet');
  bar(arrived, 'f', arrived ? 'and the end still arrives once she is back' : 'the end never arrived after the pause');
}
await b.close();
if (bad) console.log(`\nFAIL — ${bad} of 6 bar(s)`);
else console.log('\nPASS — 6 bar(s): the whistle owns the end, a pause holds it, and leaving means leaving');
process.exit(bad ? 1 : 0);
