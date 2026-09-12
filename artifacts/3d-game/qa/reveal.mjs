// ── THE LADDER HAS TO MOVE, AND THEN IT HAS TO STOP ─────────────────────────
//
// Day 10 of the menu stream. Days 7 and 8 put thirty dots on the menu and the
// world behind them; this measures the two moments the row is allowed to move,
// and — the part that turned out to matter — that it is perfectly still the rest
// of the time.
//
// WHAT IT COVERS, against MENU-BRIEF:
//
//   bar 1  §5.1/18 + §4.6  the first reveal runs ONCE ever, and PLAY glows at
//                          the end of it — the one instruction in a wordless
//                          introduction
//   bar 2  §5.1/4          the ladder is STILL when nothing has changed
//   bar 3  §3.3            the hop: flip the dot she played, THEN move the ring;
//                          and the panel keeps its world name and goal line on
//                          every frame of it
//   bar 4  —               the stylesheet's timings equal the module's constants
//   bar 5  §3.3            calm is a hard cut: the states, none of the motion
//   bar 6  §4.6            the void looks down at the row, and stops
//   bar 7  §3.2            a MISS flips and does not hop — the ring is still hers
//
// WHY BAR 2 IS THE POINT OF THIS FILE. Day 7 shipped the "you are here" ring
// with `animation: pipHere 2.2s ease-in-out infinite` on the menu, on the
// argument that a ring pointing at a button should keep asking. MENU-BRIEF
// §5.1 bar 4 asks for ZERO changed pixels inside the pips on a settled menu, and
// an infinite animation cannot ever satisfy it — so the bar was unwritten for
// three days while the code it would have failed was already shipped. The same
// class of motion had ALREADY cost a gate step once: the end card's copy of this
// ring kept Playwright from finding two stable frames to click PLAY AGAIN on
// (econ, 30s timeout, "element is not stable"), which is how it came to be
// scoped to the menu in the first place. Scoping moved it; it did not fix it.
//
// A ring that never settles is a screen that never settles. §3.3 asked for three
// pulses on the reveal and stillness after, and that is what bar 2 holds.
//
// HOW "STILL" IS MEASURED. Not one frame apart: a CSS animation runs on the
// compositor's wall clock, and this sandbox renders the 3D scene at under two
// frames a second, so "one animation frame" here is most of a second of wall
// time and says nothing about a phone. Four screenshots of the #mlPips box at
// 150ms intervals — a quarter of the pulse's period — and every consecutive pair
// must be byte-identical. The window behind the panel is 3D and always moving,
// so the box is cropped to the ladder itself.
//
// HOW THE HOP IS MEASURED. The hop is a two-beat schedule 180ms apart over five
// nodes, so it is sampled rather than observed: __ladderState() returns the
// state each dot is WEARING plus which one-shot classes are live, and the probe
// polls it. A MutationObserver would be the obvious tool and is the wrong one —
// this stream already learned it cannot fire inside a synchronous crank
// (qa/levels.mjs's header), and here it would also have to distinguish the
// flip's rewrite from the hop's.
//
// THE WIN IS RECORDED THROUGH THE GAME. __recordLevel is the game's own
// recordLevelResult — the same call endMatch() makes — and __paintLadder is the
// same paint coming HOME makes. Bar 3 uses those two rather than playing a
// ninety-second match per case, and bar 7 plays a real one (?len=8) so the whole
// path from a real buzzer to a moved ring is covered at least once.
//
//   node qa/reveal.mjs [port]
import { chromium } from 'playwright';

const PORT = (process.argv.slice(2).filter((a) => !a.startsWith('--'))[0]) || '4177';
/** `--only=2` runs one bar. Used to take the BEFORE reading of bar 2 against a
 *  preserved old build on its own port, without booting the other six contexts
 *  alongside a gate that was already running. Every bar is listed in the PASS
 *  line, so a partial run cannot be mistaken for a whole one. */
const ONLY = (() => {
  const f = process.argv.find((a) => a.startsWith('--only='));
  return f ? new Set(f.slice(7).split(',').map((x) => x.trim())) : null;
})();
const want = (n) => !ONLY || ONLY.has(String(n));
const WORLD = 'maple';
const t0 = Date.now();
const bad = [];
let bars = 0;
const ok = (m) => { bars++; console.log(`  ok   ${m}  [${((Date.now() - t0) / 1000).toFixed(0)}s]`); };
const no = (m) => { bars++; bad.push(m); console.log(`  BAD  ${m}  [${((Date.now() - t0) / 1000).toFixed(0)}s]`); };

process.on('uncaughtException', (e) => {
  console.log(`\nFAIL — reveal threw: ${String(e && e.message || e).split('\n')[0]}`); process.exit(1); });
process.on('unhandledRejection', (e) => {
  console.log(`\nFAIL — reveal rejected: ${String(e && e.message || e).split('\n')[0]}`); process.exit(1); });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

/** A page whose profile is written before the first line of the game runs.
 *  `extra` is a plain object of localStorage keys; `levels` is the voidLevels
 *  blob, or null to leave the key absent — which is what "she has never seen
 *  the ladder" IS. */
const open = async (ctx, { levels = null, extra = {}, q = '' } = {}) => {
  const p = await ctx.newPage();
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(([lv, ex]) => {
    try {
      localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
      localStorage.setItem('voidMute', '1');
      localStorage.setItem('voidDailyLast', new Date().toDateString());
      localStorage.setItem('voidUnlocked', 'maple,pirate');
      // ONCE, NOT ON EVERY NAVIGATION. addInitScript runs before the first line
      // of every document in this page's life, the reload included — so the
      // first version of this removed voidLevels again on bar 1's second load
      // and the reveal ran a second time for exactly the right reason. It read
      // as the feature being broken; it was the probe wiping the bit the feature
      // had just written. The sentinel makes "no voidLevels" a starting
      // condition rather than a standing one.
      if (lv) localStorage.setItem('voidLevels', lv);
      else if (!localStorage.getItem('rvWiped')) {
        localStorage.removeItem('voidLevels'); localStorage.setItem('rvWiped', '1');
      }
      for (const [k, v] of Object.entries(ex)) localStorage.setItem(k, v);
    } catch { }
  }, [levels, extra]);
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}&manual=1${q}`,
    { waitUntil: 'domcontentloaded', timeout: 300000 });
  // WAITS ON __menuState, NOT __ladderState. Bar 2's before-reading was taken
  // against a preserved build that predates this day's hooks, and waiting on a
  // hook that cannot exist there would have spent seven minutes and then thrown
  // instead of printing the number the fix is justified by. Bar 2 needs only the
  // DOM and a camera; the bars that need the hook say so themselves.
  await p.waitForFunction(() => !!window.__menuState, null, { timeout: 420000 });
  return p;
};

/** maple dot 1 open, the rest locked — a profile that has played and won
 *  nothing. Written in the shape levels.ts stores, so it goes in through the
 *  game's own migrate() rather than past it. */
const SEED_OPEN = JSON.stringify({ v: 1, seen: 1,
  w: { maple: { 1: { st: 'open', best: 0, pct: 0, first: '', n: 0 } } } });

/** The picture of the ladder this frame. Throws a NAMED failure on a build with
 *  no hook rather than a bare TypeError, so "this build predates the feature"
 *  reads as that instead of as a broken probe. */
const st = async (p) => {
  const has = await p.evaluate(() => typeof window.__ladderState === 'function');
  if (!has) throw new Error('__ladderState is missing — this build has no day-10 ladder');
  return p.evaluate(() => window.__ladderState());
};
const nap = (ms) => new Promise((r) => setTimeout(r, ms));

// ═══ BAR 1 · THE FIRST REVEAL RUNS ONCE ════════════════════════════════════
if (want(1)) {
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  const p = await open(ctx, { levels: null });
  // the reveal is armed on the paint and fires one frame later, on purpose (it
  // has to outlive the boot branch that hides the menu for a first-ever
  // session). Under swiftshader one frame is up to a couple of seconds.
  await p.waitForFunction(() => window.__ladderState().reveal === true, null, { timeout: 120000 })
    .catch(() => { });
  const a = await st(p);
  if (a.reveal && a.seen) ok(`#1 first reveal ran: reveal=${a.reveal} seen=${a.seen} shown=${a.shown.join(',')}`);
  else no(`#1 first reveal did NOT run on a played profile with no voidLevels — reveal=${a.reveal} seen=${a.seen} menuShown=${a.menuShown}`);
  // …AND PLAY LIGHTS UP AT THE END OF IT. The last beat of the introduction and
  // the only one that is an instruction, for a child who cannot read a word on
  // this screen. Polled at 50ms rather than on rAF: the glow is a 900ms one-shot
  // and this sandbox's frame callback fires as slowly as 0.4 times a second, so
  // an rAF poll can step straight over it. (Screenshots cannot catch it either —
  // qa/_revealshot.mjs reported glow=false on all four reveal frames because a
  // screenshot here takes longer than the beat it is trying to photograph.)
  const glowed = await p.waitForFunction(() => window.__ladderState().glow === true,
    null, { timeout: 60000, polling: 50 }).then(() => true).catch(() => false);
  if (glowed) ok(`#1c PLAY glows once when the row has finished arriving`);
  else no(`#1c PLAY never glowed — the one instruction in a wordless introduction did not happen`);

  // SECOND LOAD, SAME PROFILE. localStorage survives the reload, so the only
  // thing that can suppress the reveal is the bit the reveal itself wrote.
  await p.reload({ waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__ladderState, null, { timeout: 420000 });
  await nap(3000);
  const c = await st(p);
  if (!c.reveal && c.seen) ok(`#1b second load: reveal=${c.reveal} (absent, as it must be) seen=${c.seen}`);
  else no(`#1b the reveal ran a SECOND time — an introduction that repeats is a stutter. reveal=${c.reveal} seen=${c.seen}`);
  await ctx.close();
}

// ═══ BAR 2 · THE SETTLED LADDER IS STILL ═══════════════════════════════════
// MEASURED TWICE, AND THE FIRST WAY WAS WRONG. The bar as MENU-BRIEF §5.1 wrote
// it — "0 changed pixels inside .pips" — was written on day 1, when the menu was
// a still splash. From day 8 the menu is a live 3D world and #menuLadder's panel
// is rgba(18,9,38,0.72) with a 9px backdrop blur, so 28% of every pixel in this
// box is a blurred photograph of a drifting camera. Taken that way the box came
// back 8,483 of 10,752 pixels changed (78.9%) 150ms apart on the build BEFORE
// this day's fix — a number that says almost nothing about the ladder and
// everything about the town behind it, and which would have read as a pass for
// the fix at any value below it.
//
// So the bar hides the canvas first (firstframe.mjs's freeze, for the same
// reason: "the screen being measured is the only body child left visible while it
// is measured"), which fixes the backdrop and leaves CSS animation as the only
// thing that can move. The see-through reading is still printed, as a report,
// because it is the honest answer to "is this box still on a real phone" and the
// answer is no — it cannot be, by design, and §5.1 bar 4 needs that qualifier.
if (want(2)) {
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  const p = await open(ctx, { levels: SEED_OPEN });   // seen:1 — no reveal to wait out
  const box = await p.evaluate(() => {
    const e = document.getElementById('mlPips');
    if (!e) return null;
    // PADDED BY 12px. The "you are here" ring is an ::after at inset -16% of the
    // pip size — at 40px it stands 6.4px outside its dot, so the row's own
    // bounding box clips the top and bottom of the one element whose motion this
    // bar exists to catch. A pulse measured through a box that crops it is a
    // pass waiting to happen.
    const r = e.getBoundingClientRect();
    const pad = 12;
    return { x: Math.max(0, Math.round(r.x - pad)), y: Math.max(0, Math.round(r.y - pad)),
      width: Math.round(r.width + pad * 2), height: Math.round(r.height + pad * 2) };
  });
  if (!box || box.width < 40 || box.height < 20) {
    no(`#2 #mlPips has no box to photograph (${JSON.stringify(box)}) — the ladder is not on screen`);
  } else {
    await nap(3500);   // past any reveal tail: 4 steps + 3 pulses is ~2.5s
    const { PNG } = await import('pngjs');
    const px = box.width * box.height;
    /** worst consecutive-pair difference over four shots 150ms apart — a quarter
     *  of the pulse's period, so a 660ms breath cannot hide between two of
     *  them. */
    const churn = async () => {
      const shots = [];
      for (let i = 0; i < 4; i++) {
        shots.push(PNG.sync.read(await p.screenshot({ clip: box })));
        if (i < 3) await nap(150);
      }
      let worst = 0, pair = '';
      for (let i = 1; i < shots.length; i++) {
        const a = shots[i - 1].data, c = shots[i].data;
        let diff = 0;
        for (let k = 0; k < Math.min(a.length, c.length); k += 4) {
          if (a[k] !== c[k] || a[k + 1] !== c[k + 1] || a[k + 2] !== c[k + 2]) diff++;
        }
        if (diff > worst) { worst = diff; pair = `${i - 1}->${i}`; }
      }
      return { worst, pair };
    };
    // ── the REPORT: as a child's eye actually gets it, live world and all
    const live = await churn();
    console.log(`  ·    #2 report: with the world live behind the panel, ${live.worst} of ${px} px `
      + `(${(live.worst / px * 100).toFixed(1)}%) change in 150ms — the panel is 72% opaque over a `
      + `moving camera, so this can never be 0 and is not what the bar measures`);
    // ── the BAR: canvas hidden, so only CSS can move
    // DISPLAY, NOT VISIBILITY — and this one cost a run. firstframe.mjs's freeze
    // uses `visibility: hidden` because it needs the layout it is measuring to
    // stay put. #menuLadder carries `backdrop-filter: blur(9px)`, and a
    // visibility-hidden canvas is still in the backdrop root: with the 3D scene
    // rendering at 0.4-2.9 fps in this sandbox, four shots 150ms apart sometimes
    // all land inside one slow 3D frame and sometimes straddle two, so the same
    // build measured 0 of 18,480 px on one run and 3,107 (16.8%) on the next.
    // `display: none` takes the canvas out of the layer tree, and the panel's
    // blur then has nothing left to sample that can change. The ladder's own
    // layout does not depend on it — #menu is positioned, not in flow with it.
    await p.evaluate(() => {
      const keep = document.getElementById('mlPips');
      for (const c of Array.from(document.body.children)) {
        if (c === keep || c.contains(keep)) continue;
        c.dataset.rvFroze = c.style.display; c.style.display = 'none';
      }
      for (const cv of Array.from(document.querySelectorAll('canvas'))) cv.style.display = 'none';
    });
    await nap(400);
    const still = await churn();
    if (still.worst === 0) ok(`#2 the settled ladder is still: 0 of ${px} px changed across 4 shots 150ms apart, canvas hidden`);
    else {
      // NAME WHAT IS MOVING. "Some pixels changed" sends the next reader hunting
      // through a stylesheet; the browser already knows every animation it is
      // running and on what. Printed on failure only, and it is the whole
      // diagnosis: element, animation name, play state.
      const live = await p.evaluate(() => document.getAnimations()
        .filter((a) => a.playState === 'running')
        .map((a) => {
          const t = a.effect && a.effect.target;
          const id = t ? (t.id || t.className || t.tagName || '?') : '?';
          const ps = a.effect && a.effect.pseudoElement ? a.effect.pseudoElement : '';
          return `${a.animationName || a.constructor.name}@${id}${ps}`;
        }));
      no(`#2 the settled ladder is MOVING with the canvas hidden — ${still.worst} of ${px} px `
        + `(${(still.worst / px * 100).toFixed(1)}%) changed between shots ${still.pair}, 150ms apart, `
        + `3.5s after the menu came up. Nothing but a CSS animation can do that, and MENU-BRIEF §5.1 bar 4 asks for 0. `
        + `Running: ${live.length ? live.join(', ') : '(none — so it is not CSS; look at what the freeze did not hide)'}`);
    }
  }
  await ctx.close();
}

// ═══ BAR 3 · THE HOP: FLIP, THEN THE RING ══════════════════════════════════
if (want(3)) {
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  const p = await open(ctx, { levels: SEED_OPEN });
  await nap(1500);
  const before = await st(p);
  if (before.shown.join(',') !== 'open,locked,locked,locked,locked') {
    no(`#3 the seed did not take — the row reads ${before.shown.join(',')}, wanted open,locked,locked,locked,locked`);
  } else {
    // A WIN, through the game's own recorder, then the same paint HOME makes.
    // Sampling starts inside the same evaluate so the first read lands before
    // the scheduled first frame can.
    const trace = await p.evaluate(async () => {
      const out = [];
      const snap = () => { const s = window.__ladderState();
        out.push({ t: Math.round(performance.now()), shown: s.shown.join(','), here: s.here,
          pop: s.pop, ringIn: s.ringIn, label: s.label, line: s.line }); };
      window.__recordLevel({ world: 'maple', goal: 1, kind: 'eat', result: 'win',
        cleared: false, score: 999, pct: 12, rank: 1, secs: 61 });
      window.__paintLadder();
      snap();
      // THE FLIP IS BEHIND A requestAnimationFrame, which in this sandbox fires
      // at the RENDER rate — 0.4 to 2.9 frames a second, so the beat that takes
      // 16ms on a phone can take two and a half seconds here. Sampled for up to
      // twelve seconds and stopped the moment the hop has both landed and
      // settled, so a fast machine is not paid for by a slow one.
      let done = 0;
      for (let i = 0; i < 240; i++) {
        await new Promise((r) => setTimeout(r, 50)); snap();
        const last = out[out.length - 1];
        if (last.here === 1 && last.ringIn === -1 && done) break;
        if (last.here === 1) done = 1;
      }
      return out;
    });
    const first = trace[0];
    const flip = trace.find((r) => r.pop === 0);
    const hop = trace.find((r) => r.here === 1 && r.ringIn === 1);
    const end = trace[trace.length - 1];
    const truth = (await st(p)).truth.join(',');
    const say = (r) => r ? `+${r.t - first.t}ms shown=${r.shown} here=${r.here} pop=${r.pop} ringIn=${r.ringIn}` : 'never';
    // 1 · the row is first painted AS SHE LEFT IT, or there is no change to see
    if (first.shown === 'open,locked,locked,locked,locked' && first.here === 0)
      ok(`#3a the first paint is the ladder she left: ${say(first)}`);
    else no(`#3a the change was painted with no before-frame — nothing to see change. ${say(first)}`);
    // 2 · the dot she played flips, and the ring has NOT moved yet
    if (flip && flip.shown === 'done,open,locked,locked,locked' && flip.here === 0)
      ok(`#3b the flip: the dot she won changes, the ring waits. ${say(flip)}`);
    else no(`#3b the flip beat is wrong — wanted shown=done,open,… with the ring still on dot 1. ${say(flip)}`);
    // 3 · THEN the ring hops, and it arrives (ringIn)
    if (hop && flip && hop.t >= flip.t)
      ok(`#3c the hop: the ring lands on the dot the win opened. ${say(hop)}`);
    else no(`#3c the ring never hopped to the opened dot. ${say(hop)}`);
    // 4 · and it settles on the truth, with no animation class left behind
    // SETTLED means every one-shot marker is back off, not just that the states
    // are right: __ladderState() is what a probe asks "is this screen still?" and
    // a marker left standing answers no forever.
    if (end.shown === 'done,open,locked,locked,locked' && end.here === 1 && end.pop === -1 && end.ringIn === -1)
      ok(`#3d it settles, with no one-shot class left behind: ${say(end)}`);
    else no(`#3d the row did not settle — ${say(end)}`);
    // 5 · the picture never disagrees with the ladder at the end
    if (truth === 'done,open,locked,locked,locked') ok(`#3e the ladder itself says ${truth}`);
    else no(`#3e the LADDER is wrong, not just the picture: ${truth}`);
    // 6 · AND THE PANEL KEEPS ITS WORDS THROUGHOUT. The repaint rewrites the
    // world label and the goal line as well as the dots, and the goal line is
    // derived per dot (goalLine(w, 2) joins that world's SET order), so an empty
    // set would paint a blank sentence under the row and nothing else would
    // notice. Every sampled frame, not just the last: a blank that heals is
    // still a blank a child saw.
    const mute = trace.filter((r) => !r.label || !r.line);
    if (!mute.length) ok(`#3f the panel keeps its words on all ${trace.length} sampled frames: `
      + `"${end.label}" / "${end.line}"`);
    else no(`#3f the panel went wordless on ${mute.length} of ${trace.length} frames — `
      + `first at +${mute[0].t - first.t}ms with label="${mute[0].label}" line="${mute[0].line}"`);
  }
  await ctx.close();
}

// ═══ BAR 4 · THE STYLESHEET AND THE MODULE AGREE ═══════════════════════════
if (want(4)) {
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  const p = await open(ctx, { levels: SEED_OPEN });
  const s = await st(p);
  const want = { flip: `${s.flipMs}ms`, hop: `${s.hopMs}ms`, step: `${s.stepMs}ms` };
  const same = ['flip', 'hop', 'step'].filter((k) => s.css[k] === want[k]);
  if (same.length === 3) ok(`#4 timings agree: flip ${want.flip} hop ${want.hop} step ${want.step}`);
  else no(`#4 the CSS and the schedule disagree — CSS ${JSON.stringify(s.css)} vs module ${JSON.stringify(want)}`);
  await ctx.close();
}

// ═══ BAR 5 · CALM IS A HARD CUT ════════════════════════════════════════════
if (want(5)) {
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  const p = await open(ctx, { levels: SEED_OPEN, extra: { voidMotion: '0' } });
  await nap(1500);
  const on = await st(p);
  if (!on.calm) { no(`#5 voidMotion=0 did not put the body in calm — nothing below is measuring what it says`); }
  else {
    const trace = await p.evaluate(async () => {
      const out = [];
      window.__recordLevel({ world: 'maple', goal: 1, kind: 'eat', result: 'win',
        cleared: false, score: 999, pct: 12, rank: 1, secs: 61 });
      window.__paintLadder();
      const s0 = window.__ladderState();
      out.push({ shown: s0.shown.join(','), here: s0.here, look: s0.look });
      await new Promise((r) => setTimeout(r, 400));
      const s1 = window.__ladderState();
      out.push({ shown: s1.shown.join(','), here: s1.here,
        anims: document.getElementById('mlPips').getAnimations({ subtree: true }).length });
      return out;
    });
    const [cut, after] = trace;
    if (cut.shown === 'done,open,locked,locked,locked' && cut.here === 1)
      ok(`#5a calm cuts straight to the new ladder: shown=${cut.shown} here=${cut.here}`);
    else no(`#5a calm still animated the change — first paint was shown=${cut.shown} here=${cut.here}`);
    if (after.anims === 0) ok(`#5b and nothing is animating inside the row (${after.anims})`);
    else no(`#5b calm left ${after.anims} animation(s) running inside #mlPips`);
  }
  await ctx.close();
}

// ═══ BAR 6 · THE VOID LOOKS DOWN, AND STOPS ════════════════════════════════
if (want(6)) {
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  const p = await open(ctx, { levels: null });   // a reveal, so there is a look to see
  await p.waitForFunction(() => window.__ladderState().reveal === true, null, { timeout: 120000 })
    .catch(() => { });
  const a = await st(p);
  if (a.look > 0) ok(`#6a he looks down at the row on the reveal: ${a.look}s left of 1.4`);
  else no(`#6a the reveal did not aim his gaze at the ladder (look=${a.look})`);
  // it has to STOP. The countdown runs on the render tail's dt, and the sandbox
  // renders under two frames a second, so this waits on the value rather than
  // on a wall-clock estimate of when it should have expired.
  const stopped = await p.waitForFunction(() => window.__ladderState().look === 0, null, { timeout: 420000 })
    .then(() => true).catch(() => false);
  if (stopped) ok(`#6b and he stops looking — the gaze is a beat, not a state`);
  else no(`#6b the downward gaze never expired: look=${(await st(p)).look}`);
  await ctx.close();
}

// ═══ BAR 7 · A MISS FLIPS AND KEEPS THE RING (§3.2) ════════════════════════
// The one case driven by a REAL buzzer rather than by the recorder, so the whole
// path — clock runs out, endMatch records, HOME repaints, the row moves — is
// covered end to end at least once.
if (want(7)) {
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  // ?len=8 SETS DEBUG_HARNESS, WHICH SETS AUTO_START — so the match starts itself
  // and #menu is already hidden by the time a probe could click PLAY. The first
  // version of this bar clicked it anyway and spent thirty seconds waiting for a
  // button inside a hidden panel. ?g=1 is the third of the three things allowed to
  // choose a level (§3.1, beside PLAY and a pip tap), so the auto-started match
  // is a real dot-1 attempt with a real goal attached; the 8-second clock makes it
  // a real MISS, which is the case this bar is about. No input at all: a miss is
  // what happens when nothing happens.
  const p = await open(ctx, { levels: SEED_OPEN, q: '&len=8&g=1' });
  const ended = await p.waitForSelector('#end.show', { timeout: 600000 }).then(() => true).catch(() => false);
  if (!ended) { no(`#7 the 8-second match never reached the end card — nothing to come home from`); }
  else {
    const trace = await p.evaluate(async () => {
      const out = [];
      document.getElementById('btnHome').click();
      const snap = () => { const s = window.__ladderState();
        out.push({ t: Math.round(performance.now()), shown: s.shown.join(','), here: s.here, pop: s.pop, ringIn: s.ringIn }); };
      snap();
      // same rAF caveat as bar 3 — long window, early exit once the flip has
      // landed and the pop class has come back off
      let seen = 0;
      for (let i = 0; i < 240; i++) {
        await new Promise((r) => setTimeout(r, 50)); snap();
        const last = out[out.length - 1];
        if (last.shown.startsWith('fin,')) seen++;
        if (seen > 12) break;
      }
      return out;
    });
    const end = trace[trace.length - 1];
    const flip = trace.find((r) => r.pop === 0);
    const hopped = trace.find((r) => r.ringIn >= 0);
    const truth = (await st(p)).truth.join(',');
    if (flip && flip.shown.startsWith('fin,')) ok(`#7a a missed dot flips to fin: +${flip.t - trace[0].t}ms shown=${flip.shown}`);
    else no(`#7a the missed dot did not flip — trace ended at shown=${end.shown}`);
    if (end.here === 0 && !hopped) ok(`#7b and the ring stays hers: here=${end.here}, no arrival played`);
    else no(`#7b the ring moved off a dot she has not passed (here=${end.here}, ringIn=${hopped ? hopped.ringIn : -1}) — §3.2 says a miss keeps it`);
    if (truth === 'fin,locked,locked,locked,locked') ok(`#7c and dot 2 is still locked: ${truth}`);
    else no(`#7c the win gate leaked: ${truth}`);
  }
  await ctx.close();
}

await b.close();
const secs = ((Date.now() - t0) / 1000).toFixed(0);
if (bad.length) {
  console.log('');
  for (const m of bad) console.log(`  · ${m}`);
  console.log(`\nFAIL — ${bad.length} of ${bars} bar(s) [${secs}s]`);
  process.exit(1);
}
console.log(`\nPASS — ${bars} bars${ONLY ? ` (--only=${[...ONLY].join(',')}, NOT a full run)` : ''}, `
  + `the ladder moves twice and is still otherwise [${secs}s]`);
