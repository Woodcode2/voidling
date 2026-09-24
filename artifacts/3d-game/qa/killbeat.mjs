// THE KILL BEAT, FOR THE OWNER TO LOOK AT — research governor G8's owner gate.
//
//   node qa/killbeat.mjs [port] [world]
//
// The research governor ruled that the rival-kill beat is shown to the owner
// before it merges, because of his history with the camera: he once measured
// 141 kicks a minute and ordered shake to zero. So everything G8 adds to the
// kill — the freeze, the slow stretch after it, the ray pulse at the kill
// point and the sibling's dizzy pupils — sits behind ?killbeat=1 and is OFF by
// default. This probe is how he decides. It writes two contact sheets:
//
//   qa/out/killbeat/killbeat-on.png    the same kill with ?killbeat=1
//   qa/out/killbeat/killbeat-off.png   …and as the game ships today
//
// Each is fifteen frames on the GAME clock (tClock), 50 ms apart, from 100 ms
// before the kill to 600 ms after it, each labelled with its offset in game
// milliseconds and the share of that frame's time the world was given.
//
// ── HOW THE FRAMES ARE TAKEN ──────────────────────────────────────────────
// Under the software renderer a frame costs seconds of wall, and a screenshot
// taken "every 50 ms" of wall would land on whatever frame happened to be up.
// So the page runs in LOCKSTEP (the qa/timebeat.mjs wrapper): every
// requestAnimationFrame callback is queued, and the probe releases them one
// frame at a time, 60 ms or more of wall apart, so animate() clamps every dt to
// exactly 0.05 s. After each frame the page is photographed, so frame k of the
// sheet IS frame k of the game. The quality ladder is pinned to its top rung
// first — the frame a phone gets — because a ladder that moves mid-sheet would
// change the picture for reasons that have nothing to do with the beat.
//
// The sibling walks in over the two frames before the kill (1.6 and then 1.15
// of his radius from his centre, on the camera's right, both outside the
// family's 0.95 swallow line) and is put at 0.5 on the frame she is eaten, so
// the sheet opens on her approach rather than on an empty lawn. The kill
// itself is rivals.update()'s own, through __rivalBeside. Both sheets eat
// NIBBLES: the family's size and its other seats are the page's own dice
// (rivals.ts reroll(): 3-5 cast, the rest shuffled), and she is the one seat
// every family has, so the two sheets differ by the switch and not by who was
// eaten. Whether her kill is the MARQUEE (the hunter eaten outside her hunt,
// rivals.ts: isHunter && !hunting — 0.16 s with the switch on) or a plain one
// (0.14 s) is the game's own rule at that moment; the run reads it off the
// kill frame (ev.marquee) and prints it, and each sheet's title says it. If
// she cannot be placed in 60 frames the run takes the first free sibling and
// says so.
//
// ONE REAL DRAG FIRST. On Maple the ghost hand (the wordless drag lesson,
// teachDrag) sits over the void until the child's first drag of the match
// (dragDone), and a probe that never steers would photograph it on top of the
// very spot the owner is judging. So the page is given one drag through the
// same pointer events a thumb sends — before the camera settles, so it is not
// in the sheet — and the lesson retires the way it does for a child.
//
// WHAT THE SHEET CANNOT SHOW: the words that rise off the kill ("… DEVOURED!")
// and the growth bar's pop are CSS animations on the WALL clock, and each sheet
// frame costs far more wall time than the 50 ms of game time it shows (the run
// prints how much), so they are gone within a frame or two here and are not to
// scale. The wash, the rings, the sibling, the hero and the ray pulse all run
// on the game's clocks and are.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { enterMatch } from './_enter.mjs';
import { UNLOCK_ALL } from './worlds.mjs';

const die = (e) => { console.log(`\nFAIL — killbeat aborted before a sheet: ${String((e && e.message) || e).split('\n')[0]}`); process.exit(1); };
process.on('uncaughtException', die);
process.on('unhandledRejection', die);

const POS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const PORT = POS[0] || '4177', WORLD = POS[1] || 'maple';
const OUT = new URL('./out/killbeat/', import.meta.url);
mkdirSync(OUT, { recursive: true });
const W = 430, H = 932, CROP_H = 540;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

const LOCK = () => {
  const L = window.__lock = { on: false, q: [], err: null };
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => { if (L.on) { L.q.push(cb); return 0; } return raf(cb); };
  window.__step = async (n = 1, gap = 60) => {
    for (let i = 0; i < n; i++) {
      await new Promise((r) => setTimeout(r, gap));
      const q = L.q; L.q = [];
      const t = performance.now();
      for (const cb of q) { try { cb(t); } catch (e) { L.err = String((e && e.message) || e); } }
    }
  };
};

const WHO = 'NIBBLES';
async function shoot(on) {
  const prefer = WHO;
  const label = on ? 'on' : 'off';
  const p = await b.newPage({ viewport: { width: W, height: H } });
  p.on('pageerror', (e) => console.log(`PAGEERR ${label} ` + String(e).slice(0, 160)));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(LOCK);
  await p.addInitScript((u) => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidFirstNom', '1'); localStorage.setItem('voidMute', '1');
    localStorage.setItem('voidMotion', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked', u);
  } catch { /* private mode */ } }, UNLOCK_ALL);
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}${on ? '&killbeat=1' : ''}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  const hooks = await p.evaluate(() => ['__juiceState', '__rivalBeside', '__rivalFace', '__setVoidR', '__pinQuality', '__matchState']
    .filter((k) => typeof window[k] !== 'function'));
  if (hooks.length) die(new Error(`this build has no ${hooks.join(', ')}`));
  // drawing off until the sheet starts: the boot, the menu and the descent
  // cost minutes of software rendering and none of them is in the picture
  await p.evaluate(() => {
    window.__realRender = window.__renderer.render.bind(window.__renderer);
    window.__renderer.render = () => { };
  });
  await enterMatch(p, WORLD);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 900000, polling: 250 });
  await p.evaluate(() => { window.__pinQuality(0); window.__setVoidR(3); });
  // one real drag (see ONE REAL DRAG FIRST above): down at the centre, out past
  // the stick's dead zone, up — joySet() marks dragDone on the way out
  await p.evaluate(() => {
    const cv = window.__renderer.domElement, cx = innerWidth / 2, cy = innerHeight / 2;
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 7, clientX: cx, clientY: cy, bubbles: true }));
    dispatchEvent(new PointerEvent('pointermove', { pointerId: 7, clientX: cx + 110, clientY: cy, bubbles: true }));
    dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, clientX: cx + 110, clientY: cy, bubbles: true }));
  });
  await p.evaluate(() => new Promise((res) => {
    window.__lock.on = true;
    const w = () => (window.__lock.q.length ? res() : setTimeout(w, 20));
    w();
  }));
  // settle the camera on r 3 (it eases toward the size law's distance)
  await p.evaluate(() => window.__step(40));
  // NIBBLES (walked in if she has not joined yet), otherwise the first free
  // sibling, walked in if need be
  let who = null;
  for (const name of [prefer, undefined]) {
    for (let i = 0; i < 60 && !who; i++) {
      who = await p.evaluate((nm) => window.__rivalBeside(nm, 2.4, 0.6), name);
      if (!who) await p.evaluate(() => window.__step(1));
    }
    if (who) break;
  }
  if (!who) die(new Error('no sibling could be walked in'));
  const hand = await p.evaluate(() => document.getElementById('hand')?.classList.contains('show') ?? false);
  if (hand) die(new Error('the ghost hand is still up after a real drag — the sheet would show it over the kill'));
  await p.evaluate(() => { window.__renderer.render = window.__realRender; });
  await p.evaluate(() => window.__step(2));   // two drawn frames before the first shot, so the canvas is current

  const state = () => p.evaluate((nm) => {
    const j = window.__juiceState(), ms = window.__matchState();
    const v = window.__voidPos();
    const s = new window.__THREE.Vector3(v.x, v.y, v.z).project(window.__cam);
    return { tc: ms.tClock, ev: ms.ev.eaten, mq: ms.ev.marquee, stop: j.stop, wk: j.worldK, slow: j.slow ?? null,
      face: window.__rivalFace(nm), vy: (-s.y * 0.5 + 0.5) * innerHeight, err: window.__lock.err };
  }, who.name);
  const frames = [];
  const wall0 = Date.now();
  // ONE crop for the whole sheet, centred on where he stands in the first
  // frame, so the frames line up and any camera drift shows as drift
  let cropY = null;
  const shot = async (st) => {
    if (cropY === null) cropY = Math.round(Math.min(H - CROP_H, Math.max(0, st.vy - CROP_H * 0.5)));
    const y = cropY;
    const png = await p.screenshot({ clip: { x: 0, y, width: W, height: CROP_H } });
    frames.push({ ...st, png: png.toString('base64') });
  };
  // the approach: two frames outside the swallow line
  for (const d of [1.6, 1.15]) {
    await p.evaluate(([nm, dd]) => window.__rivalBeside(nm, dd, 0.6), [who.name, d]);
    await p.evaluate(() => window.__step(1));
    await shot(await state());
  }
  // the kill
  let kill = null;
  for (let i = 0; i < 4 && !kill; i++) {
    const before = await state();
    await p.evaluate((nm) => window.__rivalBeside(nm, 0.5, 0.6), who.name);
    await p.evaluate(() => window.__step(1));
    const st = await state();
    if (st.ev > before.ev) kill = { ...st, marquee: st.mq > before.mq };
    await shot(st);
  }
  if (!kill) die(new Error(`${who.name} was put inside the swallow line four times and never eaten`));
  for (let i = 0; i < 12; i++) {
    await p.evaluate(() => window.__step(1));
    await shot(await state());
  }
  const wallPer = (Date.now() - wall0) / Math.max(1, frames.length);
  const err = await p.evaluate(() => window.__lock.err);
  await p.close();
  // keep -100 .. +600 on the game clock, around the kill frame
  const keep = frames.filter((f) => f.tc - kill.tc >= -0.1 - 1e-6 && f.tc - kill.tc <= 0.6 + 1e-6);
  return { on, who, kill, frames: keep, err, wallPer, prefer };
}

function sheetHtml(run) {
  const title = (run.on ? 'THE KILL BEAT — ?killbeat=1 (switch ON)' : 'THE KILL BEAT — as the game ships (switch OFF)')
    + (run.kill.marquee ? ' · the marquee kill' : ' · a plain kill');
  const cells = run.frames.map((f) => {
    const ms = Math.round((f.tc - run.kill.tc) * 1000);
    const tag = ms === 0 ? 'the kill' : f.stop > 0 ? 'freeze' : f.slow !== null && f.slow < 1 ? 'slow' : '';
    return `<figure><img src="data:image/png;base64,${f.png}"><figcaption><b>${ms > 0 ? '+' : ''}${ms} ms</b>`
      + `<span>world ${f.wk.toFixed(2)}${tag ? ` · ${tag}` : ''}</span></figcaption></figure>`;
  }).join('');
  return `<!doctype html><html><head><style>
    body{margin:0;padding:18px;background:#15121f;color:#f3eefe;font:14px/1.35 system-ui,sans-serif;width:1340px}
    h1{font-size:22px;margin:0 0 4px}p{margin:0 0 12px;color:#bdb4d6;max-width:1300px}
    .g{display:grid;grid-template-columns:repeat(5,258px);gap:10px}
    figure{margin:0;background:#221d33;border-radius:8px;overflow:hidden}
    img{display:block;width:258px;height:${Math.round(CROP_H * 258 / W)}px}
    figcaption{display:flex;justify-content:space-between;padding:5px 8px;font-size:13px}
    figcaption span{color:#bdb4d6}
  </style></head><body>
    <h1>${title}</h1>
    <p>${WORLD}, ${run.who.name} (r ${run.who.r.toFixed(2)}) eaten beside the void at r ${run.who.R.toFixed(2)} by the family's own swallow rule.
    Frames are 50 ms apart on the GAME clock (tClock), 100 ms before the kill to 600 ms after it. "world" is the share of
    that frame's time the world was given (1 = normal speed; the hero and the steering are not slowed). The rising words
    and the growth bar run on the wall clock and are not to scale here.</p>
    <div class="g">${cells}</div></body></html>`;
}

const runs = [];
for (const on of [true, false]) {
  console.log(`  shooting the kill with the switch ${on ? 'ON' : 'OFF'}…`);
  runs.push(await shoot(on));
}
const sp = await b.newPage({ viewport: { width: 1376, height: 800 } });
for (const run of runs) {
  await sp.setContent(sheetHtml(run), { waitUntil: 'load' });
  const png = await sp.screenshot({ fullPage: true });
  const file = new URL(`killbeat-${run.on ? 'on' : 'off'}.png`, OUT);
  writeFileSync(file, png);
  const ms = run.frames.map((f) => Math.round((f.tc - run.kill.tc) * 1000));
  console.log(`  ${run.on ? 'ON ' : 'OFF'}: ${run.who.name} eaten (${run.kill.marquee ? 'the marquee kill' : 'a plain kill'}, freeze ${run.kill.stop.toFixed(3)} s on the kill frame); ${run.frames.length} frames, ${ms[0]} to +${ms[ms.length - 1]} ms; `
    + `world ${run.frames.map((f) => f.wk.toFixed(2)).join(' ')}${run.err ? `; a frame callback threw: ${run.err}` : ''}`);
  console.log(`       ${Math.round(run.wallPer)} ms of wall per 50 ms sheet frame`
    + `${run.prefer !== run.who.name ? ` (${run.prefer} could not be placed in 60 frames, so ${run.who.name} was eaten instead)` : ''}`);
  console.log(`       wrote ${file.pathname}`);
}
await b.close();
const ok = runs.every((r) => r.frames.length === 15);
console.log(ok ? `\nPASS — two contact sheets of the kill, fifteen game-clock frames each, in qa/out/killbeat/ for the owner`
  : `\nFAIL — a sheet does not hold fifteen frames from -100 to +600 ms (${runs.map((r) => r.frames.length).join(', ')})`);
process.exit(ok ? 0 : 1);
