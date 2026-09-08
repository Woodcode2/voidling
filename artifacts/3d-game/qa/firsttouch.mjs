// qa/firsttouch.mjs — THE FIRST TOUCH, WHICH THE PLAYER SPENDS TWICE.
//
//   node qa/firsttouch.mjs [port] [world ...]
//
// The owner, on the shipped build: "when you click okay it's still weird
// sometimes where like you have to put your finger in the screen then it goes
// from center screen to the void."
//
// Two defects stacked, and this measures both.
//
// ONE — THE INVISIBLE SHIELD. #loadScr is dismissed by ANIMATING OPACITY to 0
// (prototype3d.ts:6390-6391) while keeping `display: flex; inset: 0;
// z-index: 60`, and `.show` — the class that sets display — is not removed for
// another 480 ms (:6393). The rule carries no `pointer-events` of its own
// (index.html:1292), and opacity 0 does not stop hit-testing. Meanwhile the
// match ARMS at the start of that fade, because coverRelease runs `then?.()`
// synchronously (:6401). So for up to half a second the world is live and
// visible and the first touch lands on a transparent sheet of glass. The
// pointerdown that starts the match is bound to renderer.domElement
// (:3347) — not to window — so a touch the shield eats is simply gone.
// The child taps, nothing happens, and taps again. That is "you have to put
// your finger in the screen".
//
// Measured the way a finger measures it: elementFromPoint at the middle of the
// screen. No game hook, no instrumentation, no faith — just what is under the
// thumb, sampled from the moment the world exists.
//
// TWO — THE CUT. startMatch sets introT = DESCENT_LEN (:6301) and the
// establishing-shot offset goes from exactly 0 (:10377, the pre-touch frame)
// to its FULL value on the very next frame, because q saturates at 1 for the
// first quarter of the move (:10373) and camFollow.lerp runs at factor 1
// (:10445). The camera teleports to the world's hero landmark and then travels
// back over 0.9 s with the stick damped to nothing (:9480). That is "it goes
// from center screen to the void". MAPLE declares hero: null (:1501) and takes
// no cut at all, which is why the owner says "sometimes".
//
// So this drives the real sequence — menu, world card, wait, ONE touch — and
// watches the camera across it, frame by frame.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { assertFreshDist } from './_freshdist.mjs';

const PORT = Number(process.argv[2] || 4177);
const ARGW = process.argv.slice(3).filter((a) => !a.startsWith('--'));
const WORLDS = ARGW.length ? ARGW : ['maple', 'pirate', 'gameday', 'lantern', 'powder', 'skylark'];
// ── AND THE PATH A NEW PLAYER TAKES, WHICH EVERY PROBE HERE SKIPS ──────────
// --fresh clears localStorage entirely instead of seeding it. That is not a
// detail: prototype3d.ts:6115 reads `!localStorage.getItem('voidPlayed')` and
// on a first launch SKIPS THE MENU ALTOGETHER — splash straight into the game
// with in-game guidance, hole.io's onboarding. So the seeded path this file
// measured first (voidPlayed=1, voidTut=1) is the returning player's, and the
// one the owner is most likely describing — a tutorial card with a button on
// it, "when you click okay" — is the one nothing has ever walked.
const FRESH = process.argv.includes('--fresh');
const OUT = 'qa-out/firsttouch';
mkdirSync(OUT, { recursive: true });
assertFreshDist('qa/firsttouch.mjs');

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const rows = [];
for (const world of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  p.setDefaultTimeout(400000);
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript((fresh) => { try { localStorage.clear();
    if (fresh) return;   // a brand-new install: no flags at all
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark'); } catch { } }, FRESH);
  await p.goto(`http://127.0.0.1:${PORT}/?w=${world}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });

  // ── the real path a child takes, not a shortcut ──────────────────────────
  // Both existing joystick probes strip the daily/gift cards by removing their
  // .show class in the page and then wait for the match clock to pass 4 before
  // touching anything. Neither ever produces a FIRST touch, and neither ever
  // dismisses anything — which is why neither has ever seen this.
  // ── DISMISS THE DIALOG, DO NOT DELETE IT ─────────────────────────────────
  // The owner's words are "when you click OKAY it's still weird". Every probe
  // in this directory — joyedge, joyrelease, _worldshots, and the first version
  // of this one — strips the daily and gift cards by removing their `.show`
  // class in the page, which is not what a player does and skips whatever the
  // dismissal itself leaves behind. This one clicks the button.
  if (FRESH) {
    // no menu on this path: the game starts itself. Dismiss whatever card is up
    // by clicking its button, then fall through to the same touch measurement.
    for (const btn of ['#dailyClaim', '#gift', '#setClose', '#bookClose']) {
      try { if (await p.locator(btn).isVisible({ timeout: 500 })) { await p.click(btn, { timeout: 3000 }); await p.waitForTimeout(500); } } catch { }
    }
  }
  for (const [card, btn] of FRESH ? [] : [['daily', '#dailyClaim'], ['gift', '#gift']]) {
    const up = await p.evaluate((c) => !!document.getElementById(c)?.classList.contains('show'), card);
    if (!up) continue;
    try { await p.click(btn, { timeout: 4000 }); } catch { /* card up, button not hittable — itself a finding */ }
    await p.waitForTimeout(600);
  }
  const dialogsLeft = await p.evaluate(() => [...document.querySelectorAll('.show')]
    .filter((e) => ['daily', 'gift'].includes(e.id)).map((e) => e.id));
  if (!FRESH) { await p.click('#btnPlay'); await p.waitForTimeout(1400); }

  // watch what is under the thumb from the instant the card is clicked
  await p.evaluate(() => {
    const W = window;
    W.__ft = { samples: [], cam: [], t0: performance.now() };
    const cx = Math.round(window.innerWidth / 2), cy = Math.round(window.innerHeight / 2);
    // BY IDENTITY. The first version compared the hit element's tag against
    // 'canvas' while building the tag as '#' + el.id when an id exists — and
    // the renderer's canvas is #gameCanvas, so the probe reported the GAME as
    // the thing blocking the game, on every world, for ten seconds. A probe
    // that indicts the surface it is testing has not tested anything.
    const CANVAS = document.querySelector('canvas');
    W.__ftTimer = setInterval(() => {
      const el = document.elementFromPoint(cx, cy);
      W.__ft.samples.push({
        t: performance.now() - W.__ft.t0,
        tag: el ? (el.id ? '#' + el.id : el.tagName.toLowerCase()) : 'none',
        clear: !!(el && CANVAS && (el === CANVAS || CANVAS.contains(el) || el.contains(CANVAS))),
        // ── "LIVE" IS ARMED, NOT "THE WORLD OBJECT EXISTS" ──────────────────
        // The first version called it live as soon as __voidState was defined,
        // which is true while the picker is still on screen and the island is
        // building behind it — so it reported the WORLD PICKER as blocking the
        // game for a second and a half, which is the picker doing its job.
        // The state that matters is ARMED AND NOT STARTED: the game is waiting
        // for a first touch. __matchState() has carried `armed` all along
        // (prototype3d.ts:2269, added in round 7 for exactly this kind of
        // question) and I wrote a probe around not having it.
        live: !!(W.__matchState && W.__matchState().armed && W.__matchState().t <= 0),
      });
    }, 25);
    // and the camera, every frame, so a one-frame cut cannot hide between samples
    const tick = () => {
      if (W.__cam) {
        // the full state at every frame, so the biggest jump can be EXPLAINED
        // rather than guessed at. Three theories died to guesswork before this
        // line existed: the descent ease (capped at 11 units/frame), the
        // authored arc (starts exactly at DESCENT_START, so it cannot step),
        // and the hero pan (maple declares hero: null and jumps anyway).
        const m = W.__matchState ? W.__matchState() : null;
        const v = W.__voidState ? W.__voidState() : null;
        W.__ft.cam.push({ t: performance.now() - W.__ft.t0,
          x: W.__cam.position.x, y: W.__cam.position.y, z: W.__cam.position.z,
          mt: m ? m.t : -1, armed: m ? !!m.armed : false, introT: m ? m.introT : -1,
          vx: v ? v.x : 0, vz: v ? v.z : 0, vr: v ? v.r : 0 });
      }
      W.__ftRaf = requestAnimationFrame(tick);
    };
    tick();
  });
  if (!FRESH) await p.click(`#worldRow .wCard[data-world="${world}"]`);

  // ── TAP WHEN A CHILD TAPS ────────────────────────────────────────────────
  // The first version waited six seconds and then touched, which is long after
  // the 480 ms shield has torn itself down — so it proved only that a patient
  // adult can start the game. The shield is a first-touch bug and it has to be
  // measured on the first touch: the moment the island is on screen, which is
  // the moment a child's thumb arrives.
  await p.waitForFunction(() => !!window.__matchState && window.__matchState().armed, null, { timeout: 400000 });
  await p.waitForTimeout(60);
  const beforeTouch = await p.evaluate(() => window.__ft.cam.length);
  await p.mouse.move(215, 466); await p.mouse.down(); await p.waitForTimeout(120); await p.mouse.up();
  const firstTapTook = await p.evaluate(() => (window.__matchState ? window.__matchState().t : -1));
  await p.waitForTimeout(2600);
  // …and if that one was eaten, how many more does it cost? A child taps again.
  let taps = 1;
  while (taps < 4 && !(await p.evaluate(() => window.__matchState().t > 0))) {
    await p.mouse.move(215, 466); await p.mouse.down(); await p.waitForTimeout(120); await p.mouse.up();
    await p.waitForTimeout(700); taps++;
  }
  await p.waitForTimeout(1800);

  const r = await p.evaluate((cut) => {
    const W = window; clearInterval(W.__ftTimer); cancelAnimationFrame(W.__ftRaf);
    const s = W.__ft.samples;
    // THE SHIELD: the longest run where the world was live but the middle of
    // the screen did not hit-test to the canvas.
    let worst = 0, run = 0, tag = '';
    for (let i = 1; i < s.length; i++) {
      const blocked = s[i].live && !s[i].clear;
      if (blocked) { run += s[i].t - s[i - 1].t; if (run > worst) { worst = run; tag = s[i].tag; } }
      else run = 0;
    }
    // THE CUT: the largest single-frame camera move, before the touch and after
    const cam = W.__ft.cam;
    // ── A DELTA ACROSS A STARVED FRAME IS NOT A JUMP ────────────────────────
    // This reported 128 units on maple and 244 on gameday and I nearly filed
    // both as camera cuts. The two "consecutive" samples were 4442 ms and
    // 3809 ms apart: under swiftshader the world build blocks the main thread,
    // rAF does not fire, and the whole arm-tap-descent sequence lands between
    // two samples. That is the renderer being slow, not the camera cutting.
    // Only pairs a real frame apart can be evidence of a one-frame move.
    const MAXGAP = 120;   // ms; anything longer is a stall, not a frame
    const jump = (a, b2) => {
      let mx = 0, at = 0, gapped = 0;
      for (let i = Math.max(1, a); i < Math.min(cam.length, b2); i++) {
        if (cam[i].t - cam[i - 1].t > MAXGAP) { gapped++; continue; }
        const d = Math.hypot(cam[i].x - cam[i - 1].x, cam[i].y - cam[i - 1].y, cam[i].z - cam[i - 1].z);
        if (d > mx) { mx = d; at = cam[i].t; }
      }
      return { mx, at, gapped };
    };
    // the settled second before the tap, against the 1.2 s descent after it —
    // "everything before" swept up the world build and reported 300-unit moves
    // that are the camera being PLACED, not a cut
    const at = (ms) => { for (let i = 0; i < cam.length; i++) if (cam[i].t >= ms) return i; return cam.length; };
    const tapT = cam[Math.min(cut, cam.length - 1)] ? cam[Math.min(cut, cam.length - 1)].t : 0;
    const idle = jump(at(tapT - 1000), cut), after = jump(cut, at(tapT + 1400));
    // and the two frames either side of the worst post-tap move, verbatim
    let ctx = null;
    for (let i = Math.max(1, cut); i < Math.min(cam.length, at(tapT + 1400)); i++) {
      const d = Math.hypot(cam[i].x - cam[i - 1].x, cam[i].y - cam[i - 1].y, cam[i].z - cam[i - 1].z);
      if (cam[i].t - cam[i - 1].t > 120) continue;
      if (d === after.mx) { ctx = { before: cam[i - 1], after: cam[i] }; break; }
    }
    return { blockedMs: worst, blockedBy: tag, samples: s.length,
      frames: cam.length, idleJump: idle.mx, cutJump: after.mx, cutAt: after.at, ctx,
      stalls: after.gapped,
      tapAt: tapT, started: cam.length ? cam[cam.length - 1].mt > 0 : false };
  }, beforeTouch);
  rows.push({ world, taps, firstTapTook, dialogsLeft, ...r });
  await p.close();
}
await b.close();

console.log(`\nTHE FIRST TOUCH — one tap, ${FRESH ? 'on a BRAND-NEW INSTALL (no menu: the game starts itself)' : 'on the real menu path'}\n`);
console.log('world        live but thumb blocked        taps needed   biggest camera move: settled -> after the tap');
for (const r of rows)
  console.log(`${r.world.padEnd(11)} ${(r.blockedMs.toFixed(0) + ' ms').padStart(8)} by ${(r.blockedBy || '—').padEnd(11)}`
    + `  ${String(r.taps).padStart(6)}        ${r.idleJump.toFixed(2).padStart(7)} -> ${r.cutJump.toFixed(1).padStart(7)} units`
    + `   (${r.stalls} stall${r.stalls === 1 ? '' : 's'} skipped)`);
console.log('\n  the frame the camera jumps on, either side:');
for (const r of rows) {
  if (!r.ctx) { console.log(`    ${r.world.padEnd(10)} (no jump captured)`); continue; }
  const f = (c) => `pos(${c.x.toFixed(0)},${c.y.toFixed(0)},${c.z.toFixed(0)})`
    + ` void(${c.vx.toFixed(0)},${c.vz.toFixed(0)}) r=${c.vr.toFixed(2)}`
    + ` armed=${c.armed ? 1 : 0} t=${c.mt.toFixed(2)} introT=${Number(c.introT).toFixed(2)}`;
  console.log(`    ${r.world.padEnd(10)} at ${r.ctx.after.t.toFixed(0)} ms, ${(r.ctx.after.t - r.ctx.before.t).toFixed(0)} ms apart`);
  console.log(`      before  ${f(r.ctx.before)}`);
  console.log(`      after   ${f(r.ctx.after)}`);
}
writeFileSync(`${OUT}/firsttouch.json`, JSON.stringify(rows, null, 2));

// ── T1 IS A BAR. T2 IS A NUMBER UNTIL IT HAS BEEN LOOKED AT ────────────────
// A tap that reaches nothing is unambiguously broken and needs no threshold to
// argue about: if the world is live, the middle of the screen is the game.
// The camera cut is a judgement — a fast establishing pan is a legitimate
// choice and a teleport is not — so it prints, and its bar waits for the six
// numbers and an eye on the frames, the same order qa/food.mjs used.
let fail = 0;
console.log('');
for (const r of rows) {
  const ok = r.blockedMs <= 0 && r.started && r.taps === 1;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.world.padEnd(9)} T1  the first touch reaches the game`
    + `   ${r.blockedMs > 0 ? `blocked ${r.blockedMs.toFixed(0)} ms by ${r.blockedBy}` : 'clear'}`
    + `${r.taps > 1 ? `, took ${r.taps} taps` : ''}`
    + `${r.started ? '' : ', AND THE MATCH NEVER STARTED'}`);
}
console.log(`\n${rows.length - fail}/${rows.length}`);
process.exit(fail ? 1 : 0);
