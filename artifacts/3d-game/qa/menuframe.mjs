// WHAT DOES THE MENU'S FRAME COST, AND WHAT WOULD THE DIORAMA'S COST?
//
// Day 1 of the menu stream (docs/MENU-BRIEF.md §2.8.1, §6 day 1). It is a
// measurement, not a pixel: nothing about the menu may be authored until this
// table exists.
//
// THE QUESTION. The plan's first draft said the living menu "costs nothing —
// the scene is already drawn behind the curtain". Half of that is true: the
// render loop has no gate on `started`, `paused` or `body.menu`, so the island
// really is rendered every frame behind the opaque menu today. What is NOT
// true is that it is the same FRAME. What renders now is the spawn shot —
// PLAY_DIST 29 along camOffset (0.62, 0.92, 0.62), pitched about 46 degrees
// down, frustum into the ground a few dozen units ahead. The diorama wants a
// low camera looking ALONG the plateau. Same scene, different frustum, and a
// frustum is what a draw call is. Nobody has ever measured either one.
//
// So this probe prints them side by side, per world, per quality rung:
//
//   TODAY   the shipped menu frame, no override at all — the probe changes
//           nothing and photographs what the child already gets.
//   STAGE   the same POINT with the diorama's camera (22 units out, eye 9,
//           looking 2 units above the ground), swept through 360 degrees.
//           Position held, only the frustum changed: the delta is the answer.
//   HERO    a second stage 40 units off the world's authored hero landmark,
//           the framing §2.3 actually wants, found on the live island.
//   MATCH   the other half of the comparison, and the reason it is here: the
//           only draw-call numbers this project has ever quoted are "4,694
//           calls / 1.40M tris in the opening against 1,241 / 355k in settled
//           play" (prototype3d.ts:10613 — the one place it is written down,
//           and no probe in qa/ has ever taken it). Every menu bar downstream
//           (§2.8.2, §2.8.3) is a RATIO against that pair, so it is re-taken
//           here the same way as everything else: the intro's establishing
//           shot, settled play, and settled play at r=12, which is the pair
//           the draw-call bar will actually be set against.
//
// HOW IT IS READ, AND WHY EACH PRECAUTION IS HERE. Every one of these is a
// mistake this project has already paid for once.
//
//   • info.autoReset is turned OFF. It defaults ON, which resets the counters
//     inside every renderer.render() call — and on rung 0 the frame goes
//     through the bloom composer, whose quad passes EACH call render(). So
//     the number left behind after a composed frame is the last post pass,
//     not the scene. Whether the 4,694 / 1.40M figure at prototype3d.ts:10613
//     was read that way cannot be established — the run behind it is not in
//     qa/ — so this probe re-takes it rather than inheriting it.
//   • Two CONSECUTIVE frames per sample, both printed, max of the pair taken.
//     The shadow map re-renders on alternate frames (`shadowFrame++ & 1`), so
//     a single frame is a coin toss between two different bills.
//   • Exactly one ANIMATION frame per sample, and the proof is structural:
//     the reset and the read sit in consecutive rAF callbacks, and whichever
//     side of animate() ours lands on, exactly one animate() runs between
//     them — if ours runs first in frame N it is frame N's animate, if second
//     it is frame N+1's. Either way the counters hold one frame.
//     The `passes` column is renderer.info.render.frame's own delta, i.e. how
//     many times that one frame called renderer.render(): 1 when the frame
//     goes straight to the canvas, and one per composer pass on the rungs
//     that carry bloom. It is printed rather than assumed — reading it as 1
//     on a composed frame is the exact mistake autoReset made.
//   • ONE PAGE PER RUNG. __pinQuality(3) latches qShadowLatch one-way for the
//     session and straddles a 1,677 ms shader rebuild; a 0-then-3 sweep on one
//     page reads a rung nobody chose. The pin is installed by addInitScript as
//     a SETTER on window.__pinQuality, so it fires on the module's own
//     Object.assign(window, _dbgStore) — the statement immediately before the
//     first animate() — and the pin is genuinely in before frame 1.
//   • The rung is READ BACK from __quality() and printed on every row. A pin
//     that did not take is worse than no pin.
//   • The first --discard frames after the pin are thrown away, so the shader
//     rebuild and the composer's first allocation are outside every sample.
//   • Frame times come from _dbg.__frameTimes(), an always-on ring of the last
//     600 WALL deltas. They are SANDBOX numbers under swiftshader and every
//     row says so. A device number comes off a device (§2.8.4, day 15).
//
// WHAT IT FAILS ON. This is a REPORT step: it has no opinion about whether the
// diorama is affordable, because the bar for that (§2.8.2, §2.8.3) cannot be
// set before the numbers exist. It fails when the MEASUREMENT is not
// trustworthy — a hook missing, autoReset back on, a rung that did not take, a
// sample that did not span exactly one frame, a frame that drew nothing. A
// probe that cannot stand behind its own numbers must not print them quietly.
//
//   node qa/menuframe.mjs [world|all] [port] [--rungs=0,3] [--az=30]
//                         [--discard=120] [--frames=60] [--stages=today,stage,hero]
import { chromium } from 'playwright';
// the world list and the unlock string come from the ONE registry (worlds.mjs
// parses island.ts's WorldId union) — a probe with its own copy of the world
// list is how the gate once went green on a world nobody had opened.
import { ALL_WORLDS, UNLOCK_ALL } from './worlds.mjs';

const WORLDS = ALL_WORLDS;
const flag = (name, dflt) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : dflt;
};
const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const WORLD_ARG = positional[0] || 'all';
const PORT = positional[1] || '4177';
const worlds = WORLD_ARG === 'all' ? WORLDS : [WORLD_ARG];
const RUNGS = flag('rungs', '0,3').split(',').map(Number);
const AZ_STEP = Number(flag('az', '30'));
const DISCARD = Number(flag('discard', '120'));
const FT_N = Number(flag('frames', '60'));
const STAGES = flag('stages', 'today,stage,hero,match').split(',');
const MENU_DIST = Number(flag('dist', '22'));
const MENU_EYE = Number(flag('eye', '9'));
const HERO_BACK = Number(flag('heroback', '40'));

for (const w of worlds) if (!WORLDS.includes(w)) { console.log(`\nFAIL — unknown world "${w}"`); process.exit(1); }

const bad = [];           // measurement faults — these fail the probe
const note = (m) => { bad.push(m); console.log(`  BAD  ${m}`); };
const rows = [];
const t0 = Date.now();

process.on('uncaughtException', (e) => { console.log(`\nFAIL — threw: ${e.message.split('\n')[0]}`); process.exit(1); });
process.on('unhandledRejection', (e) => { console.log(`\nFAIL — rejected: ${String(e && e.message || e).split('\n')[0]}`); process.exit(1); });

const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  // the house flags, exactly — a probe that launches Chromium differently from
  // every other probe is measuring a different browser.
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'],
});

// ── the page, with the rung pinned before the first frame ──────────────────
const open = async (world, rung) => {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  p.on('pageerror', (e) => console.log(`  [pageerror] ${e.message.split('\n')[0]}`));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(({ rung, unlockAll }) => {
    try {
      localStorage.clear();
      // a played profile, so the MENU is what we are looking at — not the
      // first-launch auto-play — and the calendar is not in front of it.
      localStorage.setItem('voidPlayed', '1');
      localStorage.setItem('voidTut', '1');
      localStorage.setItem('voidDailyLast', new Date().toDateString());
      localStorage.setItem('voidUnlocked', unlockAll);
    } catch { }
    // PIN BEFORE FRAME 1. The module ends with
    //   _dbgLive = true; Object.assign(window, _dbgStore); animate();
    // and Object.assign goes through [[Set]] — so a setter here fires on the
    // statement before the first frame, which is the only moment a pin can be
    // installed "before any frame" without editing the game.
    const arm = (name, run) => Object.defineProperty(window, name, {
      configurable: true,
      get() { return undefined; },
      set(v) {
        Object.defineProperty(window, name, { value: v, configurable: true, writable: true });
        try { run(v); } catch (e) { window.__armErr = String(e); }
      },
    });
    arm('__pinQuality', (fn) => { fn(rung); window.__pinnedBeforeFirstFrame = true; });
    // the boot prefix, anchored on performance.timeOrigin: the moment the
    // module's own top-level awaits are done and the debug API goes live.
    arm('__voidState', () => { window.__bootReadyAt = performance.now(); });
  }, { rung, unlockAll: UNLOCK_ALL });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${world}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 420000 });
  // THROW ON A MISSING HOOK, do not wait for it. A probe that cannot find what
  // it measures must say so in seconds, not time out in seven minutes and read
  // as "still running" (GOVERNOR.md rule 4, and the silence-is-failure rule).
  const missing = await p.evaluate(() => ['__frameTimes', '__frameInfo', '__menuCam', '__heroPoint',
    '__moverStats', '__spawn', '__quality', '__renderer', '__warpVoid', '__biomeAt', '__inDeepWater3']
    .filter((k) => !(k in window)));
  if (missing.length) {
    console.log(`\nFAIL — this build has no ${missing.join(', ')}; menuframe measures nothing without them`);
    process.exit(1);
  }
  return p;
};

// Wait for n ANIMATION frames — animate()'s own count, not
// renderer.info.render.frame, which counts renderer.render() CALLS and runs
// about fifteen to the frame once the bloom composer is in the path. The first
// version of this probe waited on the renderer's counter and got an eighth of
// every window it asked for, at a frame rate fifteen times too high; the
// numbers looked entirely reasonable, which is the point.
const waitFrames = async (p, n, capMs) => {
  const start = Date.now();
  const from = await p.evaluate(() => window.__frameInfo().animFrames);
  await p.waitForFunction(([from, n]) => window.__frameInfo().animFrames - from >= n,
    [from, n], { timeout: capMs, polling: 250 }).catch(() => { });
  const got = await p.evaluate((from) => window.__frameInfo().animFrames - from, from);
  return { ms: Date.now() - start, got };
};

// TWO CONSECUTIVE FRAMES, each measured alone. The chain hops through rAF
// callbacks so every reset lands after animate() and every read lands after
// the next animate() — one frame, exactly, between them.
const pair = (p) => p.evaluate(() => new Promise((res, rej) => {
  const r = window.__renderer;
  r.info.autoReset = false;
  const snap = () => ({
    calls: r.info.render.calls, tris: r.info.render.triangles,
    frame: r.info.render.frame,
  });
  const to = setTimeout(() => rej(new Error('frame pair timed out')), 240000);
  requestAnimationFrame(() => {
    r.info.reset();
    const f0 = r.info.render.frame;
    requestAnimationFrame(() => {
      const a = snap();
      r.info.reset();
      requestAnimationFrame(() => {
        const c = snap();
        clearTimeout(to);
        res({ a: { calls: a.calls, tris: a.tris, passes: a.frame - f0 },
              c: { calls: c.calls, tris: c.tris, passes: c.frame - a.frame },
              info: window.__frameInfo() });
      });
    });
  });
}));

const sample = async (p, label, world, rung, extra = {}) => {
  const r = await pair(p);
  const i = r.info;
  if (i.autoReset !== false) note(`${world} r${rung} ${label}: info.autoReset came back ON — the count is a post pass`);
  if (r.a.passes < 1 || r.c.passes < 1) note(`${world} r${rung} ${label}: a sample caught no render() call at all`);
  if (r.a.passes !== r.c.passes) note(`${world} r${rung} ${label}: the two frames ran ${r.a.passes} and ${r.c.passes} passes — the pipeline moved mid-sample`);
  if (r.a.calls === 0 || r.c.calls === 0) note(`${world} r${rung} ${label}: a frame drew 0 calls`);
  if (i.qLevel !== rung) note(`${world} r${rung} ${label}: rung read back as ${i.qLevel}`);
  const row = { world, rung, label, ...extra,
    callsA: r.a.calls, callsC: r.c.calls, calls: Math.max(r.a.calls, r.c.calls),
    trisA: r.a.tris, trisC: r.c.tris, tris: Math.max(r.a.tris, r.c.tris),
    bloom: i.bloom, shadows: i.shadows, pr: i.pr, dist: Math.round(i.dist * 10) / 10,
    menuCam: i.menuCam, shSize: i.shadowSize, latch: i.qShadowLatch, qLevel: i.qLevel,
    passes: r.a.passes };
  rows.push(row);
  return row;
};

const stats = (a) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const at = (q) => s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))];
  return { n: s.length, med: at(0.5), p95: at(0.95), mean: a.reduce((x, y) => x + y, 0) / a.length,
    min: s[0], max: s[s.length - 1] };
};
const ms = (x) => (x * 1000).toFixed(1);

console.log(`\n  MENUFRAME — the menu's frame, before any of it is authored`);
console.log(`  worlds ${worlds.join(',')} · rungs ${RUNGS.join(',')} · azimuth step ${AZ_STEP}deg`);
console.log(`  stage: ${MENU_DIST}u out, eye ${MENU_EYE}, look 2u above ground · hero stage ${HERO_BACK}u back`);
console.log(`  discard ${DISCARD} frames after the pin · frame-time window ${FT_N} frames`);
console.log(`  EVERY NUMBER BELOW IS SANDBOX (swiftshader), NOT A DEVICE.\n`);

for (const world of worlds) {
  for (const rung of RUNGS) {
    const p = await open(world, rung);
    const boot = await p.evaluate(() => ({
      readyAt: window.__bootReadyAt ?? null,
      pinned: !!window.__pinnedBeforeFirstFrame,
      armErr: window.__armErr ?? null,
      menuShown: getComputedStyle(document.getElementById('menu')).display !== 'none',
      origin: performance.timeOrigin,
    }));
    if (!boot.pinned) note(`${world} r${rung}: the rung was NOT pinned before the first frame`);
    if (boot.armErr) note(`${world} r${rung}: pin threw — ${boot.armErr}`);
    if (!boot.menuShown) note(`${world} r${rung}: #menu is not displayed — this is not the menu frame`);

    const d = await waitFrames(p, DISCARD, 600000);
    if (d.got < DISCARD) note(`${world} r${rung}: only ${d.got} of ${DISCARD} discard frames in ${(d.ms / 1000).toFixed(0)}s`);
    const q = await p.evaluate(() => window.__quality());
    if (q.level !== rung) note(`${world} r${rung}: __quality().level is ${q.level}`);

    console.log(`  ── ${world.toUpperCase()}  rung ${rung} (read back ${q.level}, pr ${q.pr}, shadows ${q.shadows}, latch ${(await p.evaluate(() => window.__frameInfo())).qShadowLatch})`);
    console.log(`     boot: world ready ${boot.readyAt === null ? '?' : (boot.readyAt / 1000).toFixed(1) + 's'} from navigation start · ${DISCARD} discard frames took ${(d.ms / 1000).toFixed(0)}s (${(d.got / (d.ms / 1000)).toFixed(2)} animation fps, sandbox)`);

    // ── frame times, movers, heap, on today's menu ────────────────────────
    const fw = await waitFrames(p, FT_N, 600000);
    const env = await p.evaluate(() => ({
      ft: window.__frameTimes(),
      near138: window.__moverStats(138), near276: window.__moverStats(276),
      heap: performance.memory ? performance.memory.usedJSHeapSize : null,
      spawn: window.__spawn(), hero: window.__heroPoint(),
      voidAt: window.__voidState(), gate: window.__crowdGate,
    }));
    const ft = stats(env.ft.slice(-Math.max(1, Math.min(env.ft.length, fw.got))));
    if (!ft) note(`${world} r${rung}: __frameTimes() returned nothing`);
    else console.log(`     frames (sandbox, n=${ft.n}): median ${ms(ft.med)}ms  p95 ${ms(ft.p95)}ms  mean ${ms(ft.mean)}ms  min ${ms(ft.min)}  max ${ms(ft.max)}`);
    console.log(`     movers near 138u ${env.near138.near}/${env.near138.total} · near 276u ${env.near276.near}/${env.near276.total} · crowdGate ${Math.round(env.gate)}`);
    console.log(`     heap ${env.heap === null ? 'n/a' : (env.heap / 1048576).toFixed(1) + ' MB'} (sandbox; WKWebView has no performance.memory — day 15 reads Xcode's gauge)`);
    console.log(`     void at (${env.voidAt.x.toFixed(1)}, ${env.voidAt.z.toFixed(1)}) r ${env.voidAt.r.toFixed(2)} · spawn (${env.spawn.x.toFixed(1)}, ${env.spawn.z.toFixed(1)}) · hero ${env.hero ? `(${env.hero.x.toFixed(1)}, ${env.hero.z.toFixed(1)})` : 'none authored'}`);

    // ── TODAY: the shipped menu frame, nothing overridden ─────────────────
    let today = null;
    if (STAGES.includes('today')) {
      // WHERE HE ACTUALLY IS, on the row. Attract mode has been driving him
      // since four seconds after the world appeared, so today's menu frame is
      // a frame of a MOVING void — that is the shipped thing, not a fault, but
      // it means TODAY and the parked STAGE below are not photographed from
      // exactly the same spot and the row has to say so.
      const at = await p.evaluate(() => window.__voidState());
      today = await sample(p, 'today', world, rung, { az: null });
      today.at = `(${at.x.toFixed(1)}, ${at.z.toFixed(1)})`;
      console.log(`     TODAY  calls ${today.callsA}/${today.callsC} (max ${today.calls})  tris ${today.tris.toLocaleString()}  passes ${today.passes}  bloom ${today.bloom}  shadows ${today.shadows}  pr ${today.pr}  camDist ${today.dist}  void ${today.at} (attract mode is driving)`);
    }

    // ── the azimuth sweeps ────────────────────────────────────────────────
    const sweep = async (name, x, z, look) => {
      const out = [];
      for (let az = 0; az < 360; az += AZ_STEP) {
        await p.evaluate(([x, z, az, dist, eye, look]) => window.__menuCam({
          x, z, az, dist, h: eye,
          lookX: look ? look[0] : x, lookZ: look ? look[1] : z, lookY: 2,
        }), [x, z, az, MENU_DIST, MENU_EYE, look]);
        await waitFrames(p, 2, 180000);            // let the gate and the LOD band settle
        const r = await sample(p, name, world, rung, { az });
        out.push(r);
        console.log(`     ${name.padEnd(6)} az ${String(az).padStart(3)}deg  calls ${String(r.callsA).padStart(4)}/${String(r.callsC).padStart(4)} (max ${String(r.calls).padStart(4)})  tris ${r.tris.toLocaleString()}`);
      }
      await p.evaluate(() => window.__menuCam(null));
      const mx = out.reduce((a, r) => r.calls > a.calls ? r : a, out[0]);
      const mn = out.reduce((a, r) => r.calls < a.calls ? r : a, out[0]);
      console.log(`     ${name.padEnd(6)} SWEEP  cheapest ${mn.calls} calls at ${mn.az}deg · dearest ${mx.calls} calls at ${mx.az}deg`
        + (today ? ` · vs today ${today.calls} = ${(mx.calls / today.calls).toFixed(2)}x worst, ${(mn.calls / today.calls).toFixed(2)}x best` : ''));
      return out;
    };

    if (STAGES.includes('stage')) await sweep('STAGE', env.spawn.x, env.spawn.z, null);
    if (STAGES.includes('hero')) {
      if (!env.hero) console.log(`     HERO   skipped — ${world} authors no hero landmark (WORLD_COPY hero is null)`);
      else {
        // stand HERO_BACK units off the landmark, on the island side of it, and
        // look at the landmark: the framing §2.3 asks for. The point is checked
        // against the live island, never assumed.
        const stand = await p.evaluate(([hx, hz, back]) => {
          const n = 72;
          for (let ring = 0; ring < 3; ring++) {
            const d = back + ring * 12;
            for (let i = 0; i < n; i++) {
              const a = (i / n) * Math.PI * 2;
              const x = hx + Math.sin(a) * d, z = hz + Math.cos(a) * d;
              if (!window.__biomeAt(x, z)) continue;
              if (window.__inDeepWater3(x, z, 0)) continue;
              return { x, z, d, biome: window.__biomeAt(x, z) };
            }
          }
          return null;
        }, [env.hero.x, env.hero.z, HERO_BACK]);
        if (!stand) note(`${world} r${rung}: no standable ground found within ${HERO_BACK}-${HERO_BACK + 24}u of the hero`);
        else {
          console.log(`     HERO   standing at (${stand.x.toFixed(1)}, ${stand.z.toFixed(1)}) on ${stand.biome}, ${stand.d}u off the landmark`);
          await p.evaluate(([x, z]) => window.__warpVoid(x, z), [stand.x, stand.z]);
          await waitFrames(p, 4, 240000);
          await sweep('HERO', stand.x, stand.z, [env.hero.x, env.hero.z]);
        }
      }
    }
    console.log('');
    await p.close();

    // ── MATCH: the two numbers the whole cost story rests on, re-taken ────
    // ON ITS OWN PAGE. The HERO sweep above warps the void across the island
    // and the spawn and the opening are hand-authored and identical every
    // load ("consistency is key here") — a reference frame taken after a warp
    // is a reference to nothing. Fresh document, same rung, same pin.
    if (STAGES.includes('match')) {
      const pm = await open(world, rung);
      await waitFrames(pm, DISCARD, 600000);
      await pm.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
        if (['daily', 'gift'].includes(e.id)) e.classList.remove('show');
      }));
      await pm.evaluate(() => document.getElementById('btnPlay')?.click());
      await pm.waitForSelector(`#worldRow .wCard[data-world="${world}"]`, { state: 'visible', timeout: 400000 }).catch(() => { });
      await pm.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`)?.click(), world);
      // THE INTRO IS A GAME-CLOCK EVENT, NOT A WALL ONE. dt is clamped at
      // 0.05/frame and the sandbox renders about a frame a second, so a 2.2 s
      // establishing shot is a couple of minutes of wall time. Wait on the
      // game's own introT, never on a stopwatch (GOVERNOR.md rule 4).
      const gotIntro = await pm.waitForFunction(() => (window.__matchState?.().introT ?? 0) > 0.35,
        null, { timeout: 400000 }).then(() => true).catch(() => false);
      if (!gotIntro) note(`${world} r${rung}: never caught the intro (introT never came up)`);
      else {
        const r = await sample(pm, 'INTRO', world, rung, { az: null });
        console.log(`     INTRO  calls ${r.callsA}/${r.callsC} (max ${r.calls})  tris ${r.tris.toLocaleString()}  passes ${r.passes}  bloom ${r.bloom}  shadows ${r.shadows}  camDist ${r.dist}`);
      }
      // ── THE CLOCK STARTS ON THE FIRST TOUCH, AND NOTHING HERE HAD TOUCHED ──
      // beginMatch only ARMS (armed = true, prototype3d.ts:6144); startMatch()
      // fires from a real pointerdown on the canvas (:3397) and is what starts
      // the clock. The first version of this block waited on __matchState().t
      // for a match that was armed and idle, so t stayed 0 and it sat there
      // until its own timeout — on every world, twice. One pointerdown, the
      // smoke.mjs path verbatim, and NO pointermove: the reference frame wants
      // the match running, not the void driven across the island.
      await pm.evaluate(() => {
        const cv = document.querySelector('canvas');
        cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1,
          clientX: innerWidth / 2, clientY: innerHeight / 2, bubbles: true }));
      });
      const gotPlay = await pm.waitForFunction(() => (window.__matchState?.().t ?? 0) > 5,
        null, { timeout: 900000 }).then(() => true).catch(() => false);
      if (!gotPlay) note(`${world} r${rung}: the match never reached t=5 match-seconds`);
      else {
        const r = await sample(pm, 'PLAY', world, rung, { az: null });
        console.log(`     PLAY   calls ${r.callsA}/${r.callsC} (max ${r.calls})  tris ${r.tris.toLocaleString()}  passes ${r.passes}  shadows ${r.shadows}  camDist ${r.dist}  (settled, r ${(await pm.evaluate(() => window.__matchState().r)).toFixed(2)})`);
        // …and at r=12, the top of the growth law: the camera is furthest out
        // and the frustum is widest, which is the pair §2.8.3 sets its bar
        // against. __setVoidR freezes the radius, so this is last.
        await pm.evaluate(() => window.__setVoidR(12));
        // camDist does not jump with the radius — it eases (camFollow.lerp at
        // ~0.22 a frame), so a sample taken straight after __setVoidR is a
        // radius-12 void in a radius-1 frustum. Wait, then print the camDist
        // the row was actually taken at.
        await waitFrames(pm, 30, 600000);
        const r12 = await sample(pm, 'R12', world, rung, { az: null });
        console.log(`     R12    calls ${r12.callsA}/${r12.callsC} (max ${r12.calls})  tris ${r12.tris.toLocaleString()}  passes ${r12.passes}  shadows ${r12.shadows}  camDist ${r12.dist}`);
      }
      console.log('');
      await pm.close();
    }
  }
}

await b.close();

// ── the table, one line per row, so a later reader can diff it ─────────────
console.log('  ── TABLE (world, rung, stage, azimuth, calls A/B, max, tris, bloom, shadows, pr) ──');
for (const r of rows) {
  console.log(`  ${r.world.padEnd(8)} r${r.rung} ${r.label.padEnd(6)} ${r.az === null || r.az === undefined ? '  —' : String(r.az).padStart(3)}deg`
    + `  ${String(r.callsA).padStart(4)}/${String(r.callsC).padStart(4)}  max ${String(r.calls).padStart(4)}`
    + `  ${String(r.tris).padStart(9)} tris  passes ${r.passes}  bloom ${r.bloom ? 'on ' : 'off'}  shadows ${r.shadows ? 'on ' : 'off'}  pr ${r.pr}`);
}

const secs = ((Date.now() - t0) / 1000).toFixed(0);
if (bad.length) {
  console.log(`\nFAIL — ${bad.length} measurement fault(s); the numbers above are not trustworthy [${secs}s]`);
  process.exit(1);
}
console.log(`\nPASS — REPORT only: ${rows.length} sampled frames, every one a single animation frame with info.autoReset off and the rung read back [${secs}s]`);
