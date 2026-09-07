// qa/opening.mjs — THE OPENING, MEASURED.
//
// Round 7, stream A. This probe exists to fail. It is written against
// docs/crews/round-7/streamA.opening-brief.md §5 and it must go red on the
// untouched tree for A1, A5, A6, A8, A9 and A21 before the opening is rebuilt,
// because a probe that has never failed has never been tested.
//
// What it does that a screenshot cannot: it samples the game's own state every
// animation frame from the first gameplay frame to the settle, so the descent's
// easing can be FITTED rather than asserted, and it runs the same world twice —
// tapping early and tapping late — so "the arrival costs the impatient player
// nothing" is a measurement and not a promise.
//
//   node qa/opening.mjs [world] [port] [tapMs]
//
// Ground scale is read from the camera's height above the void, not from
// camDist: on a perspective camera the on-screen size of the ground goes as
// 1/height, and height is what the descent is easing. camDist is recorded too
// because the steering's speed cap reads it (see __matchState's comment).
//
// TIME IS GAME TIME, NOT WALL CLOCK. The first run of this probe reported a
// 10,893 ms descent for an intro the code sets to 2.2 s, and a 37 s idle for a
// 2.5 s wait. Both were the instrument, not the game: under swiftshader the
// renderer manages a few frames a second, and the loop clamps dt per frame, so
// the world advances roughly ten times slower than the wall. Every duration
// below is therefore measured on the match clock (MATCH_LEN - clock), which
// advances in the same clamped dt the game itself uses. Wall time is still
// recorded per row, and is used for one thing only: how long the probe waited
// before touching, which is a property of the probe and not of the game.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const WORLD = process.argv[2] || 'maple';
const PORT = Number(process.argv[3] || 4177);
const TAP_MS = Number(process.argv[4] || 2500);
const OUT = 'qa-out/opening';

// The bars from the brief. Every one of these is a number this probe reads.
// `null` means "measured and reported, no bar yet" — those are the ones the
// builder needs to see move, not to satisfy.
const BARS = {
  A1: { what: 'clock ticks elapsed before the first touch', want: 0, unit: 's', cmp: (v) => v <= 0.001 },
  A3: { what: 'idle available before touch, in game time', want: '>= 0.5', unit: 's', cmp: (v) => v >= 0.5 },
  // IN FRAMES, NOT MILLISECONDS. dt is clamped to 0.05, so this harness resolves
  // time in 50 ms steps and a 133 ms bar cannot be judged: a 200 ms reading is four
  // frames and the truth could be 151-200. Frames are the invariant — theirs took 7
  // from touch-down to the hole moving, which at 60 fps is the 117 ms the brief quotes.
  A4: { what: 'frames from touch-down to first void movement', want: '<= 8', unit: 'frames', cmp: (v) => v <= 8 },
  A5: { what: 'descent duration, peak to settle', want: '1100-1300', unit: 'ms', cmp: (v) => v >= 1100 && v <= 1300 },
  // A6 IS A QUARTER-POINT TEST, NOT A CURVE FIT. The fit was measured flipping
  // between "smoothstep" and "linear" on identical descent code — RMS 0.034 vs
  // 0.032 — because under swiftshader a 1.2 s move is only ~20 samples with a
  // jittering dt, and at that density the families are not separable. Worse, the
  // MIDPOINT cannot separate them even in principle: smoothstep(0.5) = 0.5
  // exactly, the same as linear. The quarter points can: an ease-in-out has
  // travelled 0.156 of its height at t=0.25 where a linear ramp has travelled
  // 0.25 — a 0.094 gap, three times the fit noise. Two samples, decisive.
  A6: { what: 'height travelled at t=0.25 (ease-in-out <= 0.20, linear = 0.25)', want: '<= 0.20', unit: '', cmp: (v) => v <= 0.20 },
  A6c:{ what: 'height travelled at t=0.75 (ease-in-out >= 0.80, linear = 0.75)', want: '>= 0.80', unit: '', cmp: (v) => v >= 0.80 },
  A6b:{ what: 'height progress at t=0.5 (both families give 0.5 — a sanity check, not a discriminator)', want: '0.40-0.60', unit: '', cmp: (v) => v >= 0.4 && v <= 0.6 },
  // Their x4.755 was refuted: an adversarial re-measure using the hole's own
  // ground footprint, cross-checked against a dense optical-flow homography, put
  // it at x6.0 at the SCREEN CENTRE — and showed magnification varying 1.9x-8.2x
  // across a single frame, so the measuring point has to be stated or the number
  // means nothing. See holeio.recon.md 11.11.
  A7: { what: 'ground scale over the descent', want: '5.5-6.5', unit: 'x', cmp: (v) => v >= 5.5 && v <= 6.5 },
  // Counted only AFTER the void starts moving. Before that it is the acceleration
  // filter (~91 ms) doing its job — physics, not a lockout. Counting the ramp made
  // this bar one that any game with acceleration would fail.
  A8: { what: 'descent frames that ignored a held touch (after first movement)', want: 0, unit: 'frames', cmp: (v) => v === 0 },
  A9: { what: 'first +1 floater, as a fraction of the descent', want: '0.30-0.60', unit: '', cmp: (v) => v >= 0.3 && v <= 0.6 },
  A11:{ what: 'goal card visible for (unroll + hold + roll-up)', want: '450-750', unit: 'ms', cmp: (v) => v >= 450 && v <= 750 },
  A12:{ what: 'goal card appears after the world is up, on a timer', want: '0.3-0.9', unit: 's', cmp: (v) => v >= 0.3 && v <= 0.9 },
  A13:{ what: 'goal card frames that could swallow input (pointer-events)', want: 0, unit: 'frames', cmp: (v) => v === 0 },
  A21:{ what: 'descent length difference, early tap vs late tap', want: '<= 100', unit: 'ms', cmp: (v) => v <= 100 },
  // A9 stays failing until the guaranteed first bite lands (brief 3.2): their
  // first point arrives at 45% of the descent by luck of the map, ours by rule.
};

// Curve families fitted to the height-progress series. Same set that was fitted
// to Hole.io's recording, so the two answers are comparable.
const EASINGS = {
  'linear': (x) => x,
  'ease-in-quad': (x) => x * x,
  'ease-out-quad': (x) => 1 - (1 - x) * (1 - x),
  'ease-in-out-quad': (x) => (x < 0.5 ? 2 * x * x : 1 - 2 * (1 - x) * (1 - x)),
  'smoothstep': (x) => x * x * (3 - 2 * x),
  'smootherstep': (x) => x * x * x * (x * (x * 6 - 15) + 10),
  'sine-in-out': (x) => 0.5 - 0.5 * Math.cos(Math.PI * x),
};

// HOW MUCH OF AN AUTHORED MOVE DO THE THRESHOLDS ACTUALLY SEE? The descent is
// found between 0.5% and 99.5% of the total height travelled, and for anything
// but a linear ramp those cuts land INSIDE the move: a smoothstep reaches 0.5%
// of its height only 4.1% of the way through, and 99.5% at 95.9%, so the probe
// sees 91.7% of it and an authored 1,200 ms reads as 1,101. That is a property
// of the instrument, not of the build — and it is not constant across families,
// so a builder could otherwise satisfy A5 by picking an easing whose tails the
// thresholds happen to clip less. Each family's capture fraction is computed
// here and the measured span is divided by the fitted family's, so A5 is a bar
// on the AUTHORED duration whatever curve is chosen. The raw span is printed
// beside it.
function captureFraction(f) {
  const N = 20001;
  let lo = 0, hi = 1;
  for (let i = 0; i <= N; i++) { const x = i / N; if (f(x) >= 0.005) { lo = x; break; } }
  for (let i = 0; i <= N; i++) { const x = i / N; if (f(x) >= 0.995) { hi = x; break; } }
  return Math.max(0.2, hi - lo);
}
const CAPTURE = Object.fromEntries(Object.entries(EASINGS).map(([k, f]) => [k, captureFraction(f)]));

function fitEasing(series) {          // series: [{x, y}] both normalised 0..1
  let best = null;
  for (const [name, f] of Object.entries(EASINGS)) {
    let s = 0;
    for (const p of series) { const d = f(p.x) - p.y; s += d * d; }
    const rms = Math.sqrt(s / series.length);
    if (!best || rms < best.rms) best = { name, rms };
  }
  return best;
}

// The sampler runs inside the page: one record per animation frame. Reading the
// camera directly rather than trusting a reported number is deliberate — a
// wrong camera maths must not be able to pass itself.
const SAMPLER = () => {
  const w = window;
  w.__op = { rows: [], floaters: [], card: [], t0: performance.now(), touchAt: null };
  const live0 = new WeakMap();   // element -> was it live on the previous frame
  // THE CARD IS CAUGHT BY EVENTS, NOT BY SAMPLING. Its trigger is in game time but
  // its animation is a CSS animation, which runs on the WALL clock: 600 ms. Under
  // swiftshader the sampler gets about one frame a second, so it can and did miss
  // the whole thing — A11/A12 read zero while the card was firing correctly.
  // ATTACHED LAZILY, BECAUSE THIS WHOLE FUNCTION RUNS BEFORE THE DOCUMENT EXISTS.
  // addInitScript executes at document-creation time, so getElementById returns
  // null here and every listener silently attaches to nothing. The floater check
  // survived only because it re-queries the DOM inside the frame loop. This cost
  // another full run of A11/A12 reading zero on a card that was firing.
  let cardWired = false;
  const wireCard = () => {
    if (cardWired) return;
    const tcEl = document.getElementById('titlecard');
    if (!tcEl) return;
    cardWired = true;
    const stamp = (k) => ({ k, t: performance.now() - w.__op.t0,
      g: w.__matchState ? w.__matchState().tClock : 0,
      blocks: getComputedStyle(tcEl).pointerEvents !== 'none' });
    tcEl.addEventListener('animationstart', () => w.__op.card.push(stamp('start')));
    tcEl.addEventListener('animationend', () => w.__op.card.push(stamp('end')));
    new MutationObserver(() => {
      if (tcEl.classList.contains('show')) w.__op.card.push(stamp('show'));
    }).observe(tcEl, { attributes: true, attributeFilter: ['class'] });
  };
  const tick = () => {
    try {
      wireCard();
      const ms = w.__matchState ? w.__matchState() : null;
      const vs = w.__voidState ? w.__voidState() : null;
      const cam = w.__cam;
      if (ms && vs && cam) {
        w.__op.rows.push({
          t: performance.now() - w.__op.t0,          // wall ms, for the probe's own bookkeeping
          g: ms.clock,                               // the match clock: the game's own time axis
          tc: ms.tClock,                             // the game's monotonic clock — runs during the idle too
          clock: ms.clock, mt: ms.t, camDist: ms.camDist, r: ms.r, score: ms.score,
          cy: cam.position.y, cx: cam.position.x, cz: cam.position.z,
          vx: vs.x, vz: vs.z, vr: vs.r,
        });
      }
      // FLOATERS ARE A POOL, NOT SPAWNED NODES. bubbles.ts creates fourteen
      // div.vf on the body at startup and recycles them; a first-sighting test
      // therefore banks all fourteen on the probe's own first frame and never
      // reports another. That is why this read "first floater none" through five
      // runs while the void was demonstrably eating. A floater is LIVE when it
      // carries text and the `go` class, so the transition into that state is the
      // spawn, and the same element spawning again must count again.
      // The goal card: when it is on, and whether it could ever eat a tap. It is
      // pointer-events:none by design, so this measures the design rather than
      // trusting it — a later stylesheet edit that made it clickable would show up
      // here as a non-zero A13 rather than as a child whose first tap did nothing.
      // (the card is captured by events, below — a 600 ms CSS animation cannot be
      // seen by a sampler running at roughly one frame a second)
      for (const el of document.querySelectorAll('.vf')) {
        const live = el.classList.contains('go') && !!(el.textContent || '').trim();
        const was = live0.get(el) || false;
        if (live && !was) w.__op.floaters.push({ t: performance.now() - w.__op.t0, text: el.textContent || '' });
        live0.set(el, live);
      }
    } catch { /* a frame we could not read is a frame we do not report */ }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

async function runOnce(browser, tapMs, shots) {
  const p = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  p.setDefaultTimeout(400000);
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
  } catch { /* private mode: the defaults are fine */ } });
  await p.addInitScript(SAMPLER);
  // Bare URL, not ?w=<world>. With the world in the query string the game boots
  // straight into it and runs its intro camera while the probe is still clicking
  // through the menu, so the first sampled frame already has the camera at rest:
  // the first game-time run of this probe found a 328 ms "descent" of x1.21 for
  // an intro that travels from camDist 300 to 38. The world is chosen from the
  // picker instead, so sampling starts before the intro does.
  await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
  await p.waitForFunction(() => !!window.__matchState, null, { timeout: 400000 });
  // Reset the sampler to the first gameplay frame, not to page load, and assert
  // the camera really is still high — if it is not, the intro was missed and
  // every descent number below would be measuring the tail of something.
  await p.evaluate(() => { window.__op.rows = []; window.__op.floaters = []; window.__op.card = []; window.__op.t0 = performance.now(); });
  await p.waitForTimeout(60);
  // Sampling must begin before the camera reaches its intro peak. Checking
  // rows[0] is the wrong test — the camera is still at its menu position there.
  // The honest test is done in analyse(): if the peak is the very first sampled
  // frame, the climb was missed and the descent may be a tail.

  if (shots) { mkdirSync(OUT, { recursive: true }); await p.screenshot({ path: `${OUT}/${WORLD}-01-first.png` }); }
  // WAIT IN GAME TIME, NOT WALL TIME. dt is clamped to 0.05 per frame, so under
  // swiftshader the opening runs about twenty times slower than the wall: the
  // 0.5 s goal-card timer takes ~12 s of wall clock. Waiting `tapMs` of wall
  // clock touched the screen before the card had fired and before the void had
  // landed, and then reported both missing — five runs of A11/A12 reading zero on
  // a build that was working. The wait is now expressed in the game's own clock.
  const wantG = tapMs / 1000;
  await p.waitForFunction((g) => {
    const s0 = window.__opG0 ?? (window.__opG0 = window.__matchState().tClock);
    return window.__matchState().tClock - s0 >= g;
  }, wantG, { timeout: 400000 }).catch(() => {});
  if (shots) await p.screenshot({ path: `${OUT}/${WORLD}-02-pretouch.png` });

  // The touch. Held and dragged, because a tap that does not move the stick
  // measures nothing about how long it takes the void to answer.
  const box = { x: 215, y: 700 };
  await p.evaluate(() => { window.__op.touchAt = performance.now() - window.__op.t0; });
  await p.mouse.move(box.x, box.y);
  await p.mouse.down();
  for (let i = 1; i <= 30; i++) { await p.mouse.move(box.x, box.y - i * 4); await p.waitForTimeout(16); }
  await p.waitForTimeout(2600);
  if (shots) await p.screenshot({ path: `${OUT}/${WORLD}-03-settle.png` });
  await p.mouse.up();

  const data = await p.evaluate(() => window.__op);
  await p.close();
  return data;
}

function analyse(d) {
  const rows = d.rows, touchAt = d.touchAt ?? 0;
  // Game time, in ms, measured down from whatever the clock read on the first
  // sampled frame. On the untouched tree the clock is already running there, so
  // this axis starts at zero and moves; once stream A lands it will not move at
  // all until the touch, which is bar A1.
  const g0 = rows[0]?.g ?? 0;
  const gm = (r) => (g0 - r.g) * 1000;
  const pre = rows.filter((r) => r.t < touchAt);
  const clock0 = pre.length ? pre[0].clock : null;
  const clockPre = pre.length ? clock0 - pre[pre.length - 1].clock : null;   // seconds burned before the touch
  // In the game's own clock, which runs during the idle. The old fallback used
  // wall seconds and so reported a 122 s idle for 2.5 s of game time — a number
  // that was true of the harness and false of the game.
  const idleG = pre.length ? ((pre[pre.length - 1].tc ?? 0) - (pre[0].tc ?? 0)) : 0;

  // The descent, found from the camera height series rather than from a flag:
  // the first frame where height starts falling to the frame where it stops.
  // The camera does not begin high: it sits at its menu position, JUMPS to the
  // intro's start height when the match begins, and only then descends. A
  // detector that assumed a fall from row 0 reported a 421 ms descent of x1.20
  // for a move from camDist 300 to 38 — it had measured the settle and called it
  // the descent. So find the peak first, and measure from there.
  const h = rows.map((r) => ({ t: r.t, y: r.cy - 0, d: r.camDist }));
  let iPeak = 0;
  for (let i = 1; i < h.length; i++) if (h[i].y > h[iPeak].y) iPeak = i;
  // THE END OF THE MOVE IS WHERE IT STOPS MOVING, NOT ITS LOWEST POINT. Taking the
  // global minimum let slow post-settle drift — the camera easing as the void
  // grows, the look-up, the spring resuming — keep extending the window: one run
  // read 1300 ms with a midpoint of 0.624 on the same descent another read as
  // 1196 ms and 0.560. A rate test is immune to that and to the choice of easing:
  // find the fastest sample, then take the first and last samples still moving at
  // 5% of it.
  let iMin = h.length - 1;
  {
    const rate = [];
    for (let i = 1; i < h.length; i++) {
      const d = gm(rows[i]) - gm(rows[i - 1]);
      rate.push(d > 0 ? Math.abs(h[i].y - h[i - 1].y) / d : 0);
    }
    const peakRate = Math.max(...rate, 1e-9);
    let a = iPeak, b = iPeak;
    for (let i = 0; i < rate.length; i++) {
      if (rate[i] >= 0.05 * peakRate) { if (a === iPeak && i + 1 > iPeak) a = i; b = i + 1; }
    }
    if (b > a) { iPeak = Math.max(0, Math.min(iPeak, a)); iMin = b; }
  }
  const yStart = h[iPeak]?.y ?? 0;
  const yEnd = h[iMin]?.y ?? 0;
  const span = yStart - yEnd;
  let iA = iPeak, iB = iMin;
  if (Math.abs(span) > 0.5) {
    while (iA < iMin && (yStart - h[iA].y) < 0.005 * span) iA++;
    while (iB > iA && (yStart - h[iB].y) > 0.995 * span) iB--;
  }
  // THE WINDOW IS PEAK -> MINIMUM, NOT THE TRIMMED SPAN. Normalising time over a
  // window trimmed at 0.5%/99.5% shifts the curve's own landmarks: probe-t 0.25
  // then lands at true p 0.271, where a smoothstep reads 0.180 rather than 0.156,
  // and the quarter-point test measures the trim instead of the easing. It cost a
  // false A6 failure at 0.202/0.796 on a descent that was correct. The peak and
  // the minimum are the move's real endpoints, so they are the window; iA/iB stay
  // only as a diagnostic of where the flat tails begin.
  const descentMs = gm(rows[iMin]) - gm(rows[iPeak]);
  const seg = h.slice(iPeak, iMin + 1);
  const segG = rows.slice(iPeak, iMin + 1).map(gm);
  const series = seg.map((p, i) => ({ x: (segG[i] - segG[0]) / (descentMs || 1), y: (yStart - p.y) / (span || 1) }));
  const fit = series.length > 5 ? fitEasing(series) : { name: 'n/a', rms: NaN };
  // INTERPOLATE THE QUARTER POINTS, DO NOT SNAP TO THE NEAREST SAMPLE. Twenty-five
  // samples across 1.2 s is a 48 ms grid, so the nearest sample to t=0.25 can sit
  // anywhere in +-0.02 of it — and on a curve climbing steeply there, that is
  // worth up to 0.05 of height. Snapping put a correct smoothstep at 0.202
  // against a 0.20 bar: the reading was quantisation, not easing. Linear
  // interpolation between the two bracketing samples removes it.
  const at = (t) => {
    if (!series.length) return { x: t, y: 0 };
    let i = 0;
    while (i < series.length - 1 && series[i + 1].x < t) i++;
    const a = series[i], b = series[Math.min(i + 1, series.length - 1)];
    if (b.x === a.x) return a;
    const k = Math.max(0, Math.min(1, (t - a.x) / (b.x - a.x)));
    return { x: t, y: a.y + (b.y - a.y) * k };
  };
  const mid = at(0.5), q1 = at(0.25), q3 = at(0.75);
  // Ground scale: on-screen size goes as 1/height, so the scale gained over the
  // descent is the ratio of the heights, measured above the void's own plane.
  const groundScale = (yStart - 0) / (yEnd || 1);

  // Controls: the void's own position is the only honest witness. Count descent
  // frames in which the void did not move at all while a touch was held.
  let firstMove = null, firstMoveIdx = -1;
  const touchIdx = Math.max(1, rows.findIndex((r) => r.t >= touchAt));
  for (let i = touchIdx; i < rows.length; i++) {
    if (Math.hypot(rows[i].vx - rows[i - 1].vx, rows[i].vz - rows[i - 1].vz) > 1e-3) {
      firstMove = i - touchIdx; firstMoveIdx = i; break;
    }
  }
  let dead = 0;
  if (firstMoveIdx >= 0) {
    for (let i = Math.max(iPeak, firstMoveIdx) + 1; i <= iMin; i++) {
      if (Math.hypot(rows[i].vx - rows[i - 1].vx, rows[i].vz - rows[i - 1].vz) < 1e-4) dead++;
    }
  }
  // Floaters carry wall timestamps (they are DOM sightings), so convert by
  // finding the sampled frame nearest in wall time and reading its game clock.
  // Card window, in game time, from the samples where it was on screen.
  // The card's LIFE is wall time (a CSS animation); the moment it APPEARS is game
  // time (a game-clock timer). Each is measured in its own units.
  const cEv = d.card || [];
  const cStart = cEv.find((c) => c.k === 'start'), cEnd = cEv.find((c) => c.k === 'end');
  const cShow = cEv.find((c) => c.k === 'show');
  const cardMs = cStart && cEnd ? cEnd.t - cStart.t : 0;
  const cardAt = cShow ? cShow.g - (rows[0]?.tc ?? cShow.g) : -1;
  const cardBlocks = cEv.filter((c) => c.blocks).length;
  const f0w = d.floaters[0]?.t ?? null;
  const f0 = f0w == null ? null : gm(rows.reduce((a, b) => (Math.abs(b.t - f0w) < Math.abs(a.t - f0w) ? b : a), rows[0]));
  const floaterFrac = f0 == null ? null : (f0 - gm(rows[iA])) / (descentMs || 1);

  const missedClimb = iPeak === 0;
  // The authored length, recovered from the measured span and the fitted family's
  // known clipping. Sampling granularity is reported too: under swiftshader the
  // descent is only ever a handful of frames, so the residual uncertainty is
  // roughly one sample interval.
  // No capture correction any more: the window is the whole move, so the measured
  // span IS the authored span (to within one sample).
  const cap = 1;
  const authoredMs = descentMs;
  const sampleMs = seg.length > 1 ? descentMs / (seg.length - 1) : NaN;
  // How far the void actually travelled after the touch. Without this a missing
  // "+1" is ambiguous: it could be a world with no food in reach, or a probe whose
  // synthetic drag simply did not cover any ground before the window closed.
  let travelled = 0;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].t < touchAt) continue;
    travelled += Math.hypot(rows[i].vx - rows[i - 1].vx, rows[i].vz - rows[i - 1].vz);
  }
  return { rows: rows.length, touchAt, clockPre, clock0, idleG, descentMs, authoredMs, cap, sampleMs, q1: q1.y, q3: q3.y, travelled, samples: seg.length, cardMs, cardAt, cardBlocks, descentFrom: gm(rows[iA]), fit, mid: mid.y, missedClimb, iPeak, peakDist: rows[iPeak]?.camDist ?? 0,
    groundScale, dead, firstMove, floater: f0, floaterFrac, yStart, yEnd };
}

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const late = analyse(await runOnce(b, TAP_MS, true));
const early = analyse(await runOnce(b, 200, false));
await b.close();

const got = {
  A1: late.clockPre ?? 0, A3: late.idleG ?? 0, A4: late.firstMove ?? 1e9,
  A5: late.authoredMs, A6: late.q1, A6c: late.q3, A6b: late.mid, A7: late.groundScale,
  A8: late.dead, A9: late.floaterFrac ?? -1,
  A11: late.cardMs, A12: late.cardAt, A13: late.cardBlocks,
  A21: Math.abs(late.descentMs - early.descentMs),
};
let fails = 0;
const lines = [];
for (const [k, bar] of Object.entries(BARS)) {
  const v = got[k];
  const ok = v == null ? false : bar.cmp(v);
  if (!ok) fails++;
  const shown = typeof v === 'number' ? (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(3)) : String(v);
  lines.push(`${ok ? 'PASS' : 'FAIL'}  ${k.padEnd(4)} ${bar.what.padEnd(52)} got ${String(shown).padStart(12)} ${bar.unit.padEnd(6)} want ${bar.want}`);
}
mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/${WORLD}-series.json`, JSON.stringify({ late, early, got }, null, 1));
console.log(`\nOPENING — ${WORLD} @ ${PORT}, tap at ${TAP_MS} ms (and a second run tapping at 200 ms)\n`);
console.log(lines.join('\n'));
if (late.missedClimb) console.log(`\n  WARNING: the camera's peak was the first sampled frame — the climb was missed and the descent below may be a tail, not the move.`);
console.log(`\n  descent (game time) ${late.descentFrom.toFixed(0)}..${(late.descentFrom + late.descentMs).toFixed(0)} ms; camera height ${late.yStart.toFixed(1)} -> ${late.yEnd.toFixed(1)}`);
console.log(`  NOTE: durations are GAME time (the match clock), not wall clock — under swiftshader the wall runs ~10x slower.`);
console.log(`  camera peaked at sample ${late.iPeak} (camDist ${late.peakDist.toFixed(0)}); ${late.samples} samples across the descent`);
console.log(`  void travelled ${late.travelled.toFixed(1)} world units after the touch (the first-bite ring sits at 5)`);
console.log(`  span ${late.descentMs.toFixed(0)} ms across the whole move (+-${(late.sampleMs || 0).toFixed(0)} ms, one sample); quarter points ${late.q1.toFixed(3)} / ${late.q3.toFixed(3)} against 0.156 / 0.844 for an ease-in-out`);
console.log(`  easing fit ${late.fit.name} (rms ${late.fit.rms.toFixed(3)}); early-tap descent ${early.descentMs.toFixed(0)} ms`);
console.log(`  clock at the first gameplay frame ${late.clock0?.toFixed(2)} s; first floater ${late.floater == null ? 'none' : late.floater.toFixed(0) + ' ms'}`);
console.log(`\n${fails} of ${Object.keys(BARS).length} bars failing\n`);
process.exit(fails ? 1 : 0);
