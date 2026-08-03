// AUDIT — THE TWO BUGS THAT ONLY EXIST ON THE SECOND MATCH, OR AFTER A PAUSE.
// Both survived every playtest because a playtest is one match, played straight
// through.
//
//   node qa/rematch.mjs [port]
//
// TEST 1 — THE GHOST TRAIN. Maple Falls' commuter train is the only thing in
// the game that rebuilds itself mid-match: six seconds after it is swallowed,
// life.ts constructs a new one. The old group stayed in the edibles array, and
// resetMatch() restores every entry to its remembered home — which for the
// replacement was (0,0,0), because addEdible() snapshots `home` from the
// group's position and it was registered before the rail placed it. Under
// w(v)=(v-6000)*0.05 that is world 6000: the central crossroads. So match two
// opened with a dead four-car locomotive parked in the middle of town.
//
// Measured by forcing the swallow with __setVoidR rather than playing to it —
// the real gate is r>=4.87, about two minutes in — then rematching and counting
// train-sized edibles near the origin.
//
// TEST 2 — THE RIVAL CLOCK. The family was scheduled off `tClock - startT`,
// wall time since the match began, which keeps advancing while the pause sheet
// is up. Everything else in the match runs off the visible countdown. So a
// pause slid the rivals forward relative to the match: the hunt window closed
// early, rivals scheduled during the pause all joined on the resume frame, and
// past ~99s of pause the hunter was stuffed before play resumed.
//
// Measured by reading __matchState().t across a pause. It must not advance.
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click('#worldRow .wCard[data-world="maple"]');
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
await p.evaluate(() => { window.__renderer.render = () => {}; });   // sim at full rate

// ── TEST 2 first: it only needs a pause, and leaves the match intact ─────────
const pauseRes = await p.evaluate(async () => {
  const t0 = window.__matchState().t;
  document.getElementById('btnQuit')?.click();   // the in-match pause control
  const paused = document.getElementById('pause')?.classList.contains('show');
  await new Promise(r => setTimeout(r, 3000));      // 3s of real time, held
  const t1 = window.__matchState().t;
  document.getElementById('pauseResume')?.click();
  return { paused, drift: +(t1 - t0).toFixed(3) };
});

// ── TEST 1: force the train to be eaten, then rematch ────────────────────────
const ghost = await p.evaluate(async () => {
  // IDENTIFY THE TRAIN BY WHAT IT IS, NOT BY ITS SIZE. Maple Falls also holds a
  // static prop of radius exactly 5.4, so a radius test counts two "trains" and
  // the check silently measures the wrong thing. The train is the mover whose
  // group carries the four cars.
  const isTrain = e => e.mesh.userData.mover && e.mesh.children.length === 4
    && Math.abs(e.radius - 5.4) < 0.01;
  const before = window.__edibles.filter(isTrain).length;
  const t = window.__edibles.find(e => isTrain(e) && !e.eaten);
  if (!t) return { error: 'no train found in Maple Falls' };
  const home0 = `(${t.mesh.position.x.toFixed(1)}, ${t.mesh.position.z.toFixed(1)})`;
  // Grow past the edibility gate, then CHASE it — the train runs its rail loop,
  // so a single warp lands on a spot it has already left. One warp is why the
  // first version of this test reported no swallow at all.
  window.__setVoidR(7.5);
  for (let i = 0; i < 120 && !t.eaten && !t.mesh.userData.eaten; i++) {
    window.__warpVoid(t.mesh.position.x, t.mesh.position.z);
    await new Promise(r => setTimeout(r, 80));
  }
  const ate = !!(t.eaten || t.mesh.userData.eaten);
  // the replacement is built 6s of MATCH time after the swallow
  await new Promise(r => setTimeout(r, 9000));
  return {
    before, ate, home0,
    afterEat: window.__edibles.filter(isTrain).length,
    retired: window.__edibles.filter(e => isTrain(e) && e.mesh.userData.retired).length,
  };
});

// rematch and look for a train sitting at the world origin
const after = await p.evaluate(async () => {
  window.__rushClock(0);
  await new Promise(r => setTimeout(r, 5000));       // outro + results
  const again = document.getElementById('btnAgain');
  if (!again) return { error: 'no results screen' };
  again.click();
  await new Promise(r => setTimeout(r, 4000));
  const isTrain = e => e.mesh.userData.mover && e.mesh.children.length === 4
    && Math.abs(e.radius - 5.4) < 0.01;
  const trains = window.__edibles.filter(isTrain);
  const visible = trains.filter(e => e.mesh.visible);
  // a ghost is a visible train parked within a couple of units of the origin
  const atOrigin = visible.filter(e =>
    Math.hypot(e.mesh.position.x, e.mesh.position.z) < 2.5);
  return {
    registered: trains.length,
    visible: visible.length,
    atOrigin: atOrigin.length,
    positions: visible.map(e => `(${e.mesh.position.x.toFixed(1)}, ${e.mesh.position.z.toFixed(1)})`),
  };
});
await b.close();

console.log('\n  REMATCH + PAUSE REGRESSIONS\n');
console.log('  TEST 2 — the rival clock across a pause');
console.log(`     pause sheet opened      : ${pauseRes.paused}`);
console.log(`     match time drift over a 3s real-time pause: ${pauseRes.drift}s`);
console.log('  TEST 1 — the ghost train');
console.log(`     trains registered before the eat : ${ghost.before}  at ${ghost.home0}`);
console.log(`     train actually swallowed         : ${ghost.ate}`);
console.log(`     …after eat + respawn             : ${ghost.afterEat}   (retired: ${ghost.retired})`);
console.log(`     after REMATCH — registered ${after.registered}, visible ${after.visible}, at origin ${after.atOrigin}`);
console.log(`     visible train positions: ${(after.positions || []).join('  ')}`);

const fails = [];
if (!pauseRes.paused) fails.push('pause sheet never opened — test 2 proved nothing');
else if (pauseRes.drift > 0.25) fails.push(`match clock advanced ${pauseRes.drift}s while paused`);
if (ghost.error) fails.push(ghost.error);
else if (!ghost.ate) fails.push("the train was never swallowed — the ghost test proved nothing");
if (after.error) fails.push(after.error);
if (after.atOrigin > 0) fails.push(`${after.atOrigin} ghost train(s) parked at the world origin after a rematch`);
if (after.visible > 1) fails.push(`${after.visible} visible trains after a rematch — expected exactly 1`);
console.log('\n  ' + (fails.length ? 'FAIL\n    ' + fails.join('\n    ') : 'PASS — one train, none at the origin, and the match clock holds through a pause') + '\n');
process.exit(fails.length ? 1 : 0);
