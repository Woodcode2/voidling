// HE SAVOURS IT — the follow-through after a bite, the burp, and the hop
//
//   node qa/savour.mjs [port] [world]
//
// Research governor G9 (HERO): "After a bite the creature only wobbles." A big
// meal went down and the face did nothing about it: the cheeks, the eyes and
// the body carried on exactly as before. And all six worlds' win titles
// promise 'BURP OF CHAMPIONS' in a game with no burp in it. Plus the one piece
// of G4 that never landed: voidling.victoryHop() on a goal win.
//
// ── WHERE THE FOLLOW-THROUGH IS MEASURED FROM ─────────────────────────────
// The spec says capture(); the code since studio round 4 Job 11 says otherwise.
// capture() now keeps only the bookkeeping and the jaw, and every reaction a
// child can see or hear is paid on the SWALLOW (prototype3d.ts, "THE BITE PAYS
// OFF ON THE SWALLOW"; qa/bitetime.mjs). A follow-through is what happens after
// the action, and the action is the meal going in, so it is timed from the
// swallow: the `gulp` tClock __biteLog() records for that bite.
//
// ── THE DRIVE, on the game's own clock (tClock via __matchState) ──────────
// Three bites of at least 0.7 of his radius, forced through __eatNearest (the
// real capture()) 0.8 s of tClock apart at r 4 — the spec's "three inside 3 s"
// — with r set back to 4 before each (__setVoidR), so no bite is taken by a
// bigger void than the last and none of them evolves him.
// The mood is pinned to 'cruise' while they go down: frenzy's authored blush is
// 0.85 and smug's 0.9 (MOODS in void3d.ts), either of which clears the cheek bar
// with no puff at all, and the magnet feeds him a chain on its own at r 4. The
// pin moves the mood only; nothing G9 adds reads it except the scared face,
// which it leaves alone. An in-page logger records every rendered frame.
//
//   PAGE 1 — the shipped default, ?g=1 (no ?burp)
//     (a) THE CHEEKS: on the first frame after each swallow, within 50 ms of
//         tClock, the blush the material was handed is at least 0.75 (the rest
//         face draws 0.5) and the face is at least 4% wider than it is tall
//         (the spec's puff is 6%)
//     (b) THE SQUINT: within 250 ms of each swallow of a bite of at least 0.5,
//         the eye's sclera.scale.y is at or under 0.4. A blink also squashes
//         it, for 0.16 s at authored gaps of 3.4-6.6 s (void3d.ts, blinkT), so
//         a blink can explain one bite's window; every bite must show it. The
//         bites are 0.8 s apart, clear of the squint's own 0.6 s spree gap
//     (c) THE GULP: a second jelly kick — the slosh rising frame over frame by
//         at least 0.1, on a frame no capture and no evolution shares (both
//         kick the slosh themselves) — within 300 ms after each swallow.
//         RETRACTED, TWICE (GOVERNOR.md rule 3b). As committed in e61abf0 the
//         bar took the largest rise of ANY kind in the window. The next form
//         excused frames with a capture stamped on them — one frame early:
//         chomp() writes the slosh after its frame's update(), so its kick is
//         drawn on the frame AFTER. On the build with no gulp at all that form
//         read rises of 0.52 and 0.66, both on the frame after a capture by
//         the magnet: it was measuring how busy the neighbourhood was. Now a
//         rise is credited only on a frame no capture or ceremony's kick is
//         drawn on, and he eats somewhere quiet (see quiet()). The rig times it
//         80 ms on the world's clock, and a big swallow stops the world first
//         (biteGulps' hit-stop, up to 105 ms at 0.06x, which the whole body
//         obeys), so at the loop's 50 ms frames it lands up to 235 ms after
//         the swallow by that arithmetic. The first kick is chomp()'s, at the
//         capture, hundreds of ms earlier
//     (d) THE SWITCH: with no ?burp=1 there is no burp — no 'burp' audio call
//         and no burp counted — by 1.5 s after the last swallow
//     (e) THE HOP: on a goal win (the dot's EAT line crossed with __setScore)
//         the body squashes to 0.82 or under, stretches to 1.18 or over, and
//         is back within 1% of rest on every frame from 0.55 s of tClock after
//         the win — which it could not be if it ran on the outro's 0.3x world
//         clock (the spec: "a hero clock that runs at full speed")
//   PAGE 2 — ?burp=1&g=1
//     (f) THE BURP: the same three bites earn exactly one burp — counted by the
//         rig, one 'burp' in the audio call log — and its float is on screen
//     (g) THE COOLDOWN: a second trigger inside 20 s — the tagged landmark,
//         eaten through __eatLandmark — leaves it at one
//   PAGE 3 — ?burp=1&g=1
//     (h) THE WHISTLE OWNS THE END: the three bites again, and the goal met on
//         the first frame a burp is owed (an in-page watcher), while it is
//         still owed. No 'burp' is played from the end beat on, and the rig
//         counts none. A run where nothing was owed has tested nothing, and
//         FAILS as such
import { chromium } from 'playwright';
import { enterMatch } from './_enter.mjs';

const POS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const PORT = POS[0] || '4177', WORLD = POS[1] || 'maple';
const REL = 0.7, GAP = 0.8, R0 = 4;

const die = (m) => { console.log(`FAIL — ${m}`); process.exit(1); };
process.on('uncaughtException', (e) => die(`threw: ${String((e && e.message) || e).split('\n')[0]}`));
process.on('unhandledRejection', (e) => die(`rejected: ${String((e && e.message) || e).split('\n')[0]}`));

// every wait says what it was waiting for, so a timeout names its stage
const T_START = Date.now();
const note = (m) => console.log(`    · ${((Date.now() - T_START) / 1000).toFixed(0).padStart(4)} s  ${m}`);
const until = (p, label, fn, arg, opts = {}) => p.waitForFunction(fn, arg, { timeout: 1500000, polling: 250, ...opts })
  .catch((e) => die(`${label}: ${String((e && e.message) || e).split('\n')[0]}`));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

// one row per rendered frame; each row is one finished animate()'s state
const LOGGER = () => {
  const L = window.__sv = { on: false, fr: [] };
  const tick = () => {
    try {
      if (L.on && window.__matchState && window.__faceState) {
        const f = window.__faceState();
        const vf = [];
        for (const e of document.querySelectorAll('.vf.go')) vf.push(e.textContent);
        L.fr.push({ tc: window.__matchState().tClock, blush: f.blush, op: f.blushOpacity, sy: f.scleraY,
          fx: f.faceX, wob: f.wobble, hop: f.hop, burpN: f.burpN, mood: f.mood, vf,
          cer: window.__stages ? window.__stages().ceremonies : 0 });
      }
    } catch { /* a frame we could not read is a frame we do not report */ }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const tc = (p) => p.evaluate(() => window.__matchState().tClock);
const waitTc = async (p, t) => until(p, `tClock never reached ${t.toFixed(2)}`, (x) => window.__matchState().tClock >= x, t, { polling: 150 });

/** THE QUIET SPOT. The magnet swallows anything under r 2.5 inside about
 *  2R + 2.4r of him on its own (the well test in the eat loop), and every one
 *  of those meals kicks the slosh (chomp()), can close the burp's streak and
 *  can start a squint — so on the spawn square the forced bites shared their
 *  windows with the town's. The first run of (c) credited a capture's own
 *  kick to the gulp that way. So he is moved (__warpVoid) to the legal spot
 *  (__solidAt, the game's own containment rule) farthest from any small
 *  edible, on an 8-unit grid over the props' own extent. Whoever walks in
 *  later still can; the frame logger flags every capture regardless. */
async function quiet(p) {
  // sized and moved in ONE task: a frame between __setVoidR and __warpVoid is
  // a frame of the magnet feasting on the spawn square at r 4, and those meals
  // go down after the move, into the burp's streak and the squint's gap
  const spot = await p.evaluate((r) => {
    window.__setMood('cruise'); window.__setVoidR(r);
    const E = window.__edibles.filter((e) => !e.eaten && e.mesh.visible && !e.mesh.userData.departed);
    const small = E.filter((e) => e.radius < 2.5).map((e) => [e.mesh.position.x, e.mesh.position.z]);
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const e of E) { const q = e.mesh.position; x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); z0 = Math.min(z0, q.z); z1 = Math.max(z1, q.z); }
    let best = null, bd = -1;
    for (let x = x0; x <= x1; x += 8) for (let z = z0; z <= z1; z += 8) {
      if (!window.__solidAt(x, z, r)) continue;
      let dmin = Infinity;
      for (const [sx, sz] of small) { const d = Math.hypot(sx - x, sz - z); if (d < dmin) { dmin = d; if (dmin <= bd) break; } }
      if (dmin > bd) { bd = dmin; best = { x, z }; }
    }
    if (best) window.__warpVoid(best.x, best.z);
    return best ? { ...best, clear: bd } : null;
  }, R0);
  if (!spot) die('no legal spot for the void was found on the grid — __solidAt refused them all');
  note(`moved to (${spot.x.toFixed(0)}, ${spot.z.toFixed(0)}), ${spot.clear.toFixed(1)} units from the nearest small edible`);
  return spot;
}

async function open(q) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 } });
  p.on('pageerror', (e) => console.log('PAGEERR ' + String(e).slice(0, 140)));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidFirstNom', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
  } catch { /* private mode */ } });
  await p.addInitScript(LOGGER);
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}&g=1${q}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await until(p, 'the page never booted', () => !!window.__voidState);
  // ?w= and ?g= land on the MENU (no ?len=, so no menu skip): PLAY, the way a
  // child does, which launches ?g='s dot on the world already built
  await enterMatch(p, WORLD);
  await until(p, 'the match never reached t 3', () => (window.__matchState?.().t ?? 0) > 3);
  note(`${q || 'default'}: in the match at tClock ${(await tc(p)).toFixed(2)}`);
  const hooks = await p.evaluate(() => ({
    face: typeof window.__faceState === 'function', eat: typeof window.__eatNearest === 'function',
    log: typeof window.__biteLog === 'function', calls: typeof window.__audioCalls === 'function',
    setR: typeof window.__setVoidR === 'function', goal: window.__goalState?.(),
  }));
  for (const k of ['face', 'eat', 'log', 'calls', 'setR']) if (!hooks[k]) die(`this build has no ${k} hook — nothing here can be measured without it`);
  if (!hooks.goal || hooks.goal.n !== 1) die(`?g=1 did not make a dot-1 level match (goal ${JSON.stringify(hooks.goal)})`);
  const f = await p.evaluate(() => window.__faceState());
  for (const k of ['blush', 'blushOpacity', 'scleraY', 'faceX', 'wobble']) {
    if (typeof f[k] !== 'number') die(`faceState() does not report ${k}, so the face cannot be read back`);
  }
  return p;
}

/** Pin, size, settle; then three forced bites GAP apart. Resolves with each
 *  bite's mesh id, grade and capture tClock once all three are swallowed. */
async function threeBites(p, { after } = {}) {
  await quiet(p);
  await waitTc(p, (await tc(p)) + 1.2);   // the feast a size change sets off, as juice.mjs waits it out
  if (after) await after();
  await p.evaluate(() => { window.__sv.on = true; });
  const bites = [];
  for (let i = 0; i < 3; i++) {
    if (i) await waitTc(p, bites[i - 1].cap + GAP);
    const got = await p.evaluate(({ rel, r0 }) => {
      // back to r 4 before every bite: the last one grew him, a bigger well
      // feeds him more on its own, and past r 5.5 he evolves — a ceremony,
      // which celebrate()s the slosh to 1 and holds any burp back for 1.8 s
      window.__setVoidR(r0);
      const cap = window.__matchState().tClock;
      const ate = window.__eatNearest(rel);
      if (!ate) return null;
      const log = window.__biteLog();
      const row = log[log.length - 1];
      // capture() writes its row with this very tClock; anything else means it
      // declined the prop (a departed balloon, a tethered whale) and the last
      // row is some earlier bite's
      if (!row || row.cap !== cap) return { declined: true, r: ate.r };
      return { id: row.id, r: ate.r, R: ate.R, bite: ate.r / ate.R, cap };
    }, { rel: REL, r0: R0 });
    if (!got) die(`bite ${i + 1}: no edible of at least ${REL} of the void's radius is left on ${WORLD}`);
    if (got.declined) die(`bite ${i + 1}: capture() declined the r ${got.r.toFixed(2)} prop __eatNearest chose — nothing new is in the drain`);
    bites.push(got);
  }
  note(`three bites taken at tClock ${bites.map((x) => x.cap.toFixed(2)).join(', ')}`);
  await until(p, 'the three bites were never all swallowed', (ids) => {
    const log = window.__biteLog();
    return ids.every((id) => { const r = log.find((x) => x.id === id); return r && r.gulp >= 0; });
  }, bites.map((x) => x.id), { polling: 150 });
  const log = await p.evaluate(() => window.__biteLog());
  for (const x of bites) x.gulp = log.find((r) => r.id === x.id).gulp;
  return bites;
}
const frames = (p) => p.evaluate(() => window.__sv.fr.slice());
const burps = (p) => p.evaluate(() => window.__audioCalls().filter((c) => c.id === 'burp'));

let bad = 0;
const bar = (ok, id, msg) => { console.log(`  ${ok ? 'ok  ' : 'BAD '} (${id}) ${msg}`); if (!ok) bad++; };
console.log(`\n  HE SAVOURS IT — ${WORLD} on :${PORT}\n`);

// ══ PAGE 1: the shipped default ═════════════════════════════════════════════
{
  const p = await open('');
  const bites = await threeBites(p);
  const lastG = Math.max(...bites.map((x) => x.gulp));
  await waitTc(p, lastG + 1.5);
  const fr = await frames(p);
  // every capture this page made — the magnet's too — so a slosh kick can be
  // told from chomp()'s: a frame on which some bite was captured, or an
  // evolution celebrate()d, cannot credit the gulp
  const caps = (await p.evaluate(() => window.__biteLog())).map((r) => r.cap);
  const rows = bites.map((x) => {
    const w = (lo, hi) => fr.filter((r) => r.tc > x.gulp + lo + 1e-6 && r.tc <= x.gulp + hi + 1e-6);
    const first = w(0, 0.0501);
    const sq = w(0, 0.25);
    const gw = fr.filter((r) => r.tc > x.gulp - 1e-6 && r.tc <= x.gulp + 0.3001);
    let kick = 0;
    const series = gw.map((r, i) => {
      if (!i) return r.wob.toFixed(2);
      const prev = gw[i - 1];
      // a kick is drawn on the FIRST frame after the one it was written in:
      // chomp() and celebrate() write the slosh after that frame's update(),
      // and __eatNearest runs between two frames — so a capture stamped at or
      // after the previous frame's tClock, or a ceremony counted on the
      // previous frame, owns this frame's rise
      const pi = fr.indexOf(prev);
      const other = caps.some((c) => c > prev.tc - 1e-6 && c < r.tc - 1e-6)
        || (pi > 0 && fr[pi].cer !== fr[pi - 1].cer);
      if (!other) kick = Math.max(kick, r.wob - prev.wob);
      return `${r.wob.toFixed(2)}${other ? '*' : ''}`;
    }).join(' ');
    return { ...x, op: Math.max(0, ...first.map((r) => r.op)), blush: Math.max(0, ...first.map((r) => r.blush)),
      fx: Math.max(0, ...first.map((r) => r.fx)), sy: Math.min(9, ...sq.map((r) => r.sy)), kick,
      nFirst: first.length, series };
  });
  console.log('  PAGE 1 — the shipped default (?g=1)');
  console.log('    bite    grade   swallow   blush drawn (asked)   face w/h   sclera.y min   slosh kick');
  for (const [i, r] of rows.entries()) {
    console.log(`    ${i + 1}       ${r.bite.toFixed(2)}   ${r.gulp.toFixed(2).padStart(7)}     ${r.op.toFixed(2)} (${r.blush.toFixed(2)})`
      + `            ${r.fx.toFixed(3)}      ${r.sy.toFixed(2)}          ${r.kick.toFixed(2)}${r.nFirst ? '' : '   (no frame in the first 50 ms)'}`);
  }
  for (const [i, r] of rows.entries()) console.log(`    slosh after swallow ${i + 1}, frame by frame (* = a capture's or a ceremony's own kick lands here): ${r.series}`);
  const rest = fr.find((r) => r.tc < bites[0].cap);
  if (rest) console.log(`    before the first bite: blush drawn ${rest.op.toFixed(2)} (asked ${rest.blush.toFixed(2)}), face w/h ${rest.fx.toFixed(3)}, sclera.y ${rest.sy.toFixed(2)}`);
  bar(rows.every((r) => r.op >= 0.75 && r.fx >= 1.04), 'a',
    `the cheeks puff on the first frame after every swallow: blush drawn ${rows.map((r) => r.op.toFixed(2)).join(', ')} (bar 0.75), `
    + `face ${rows.map((r) => r.fx.toFixed(3)).join(', ')} wide (bar 1.04)`);
  bar(rows.every((r) => r.sy <= 0.4), 'b',
    `he squints within 250 ms of every big swallow: sclera.y ${rows.map((r) => r.sy.toFixed(2)).join(', ')} (bar 0.4)`);
  bar(rows.every((r) => r.kick >= 0.1), 'c',
    `a second slosh after every swallow: kicks ${rows.map((r) => r.kick.toFixed(2)).join(', ')} (bar 0.1)`);
  const bc = await burps(p);
  const nowN = await p.evaluate(() => window.__faceState().burpN);
  bar(!bc.length && !nowN, 'd', bc.length || nowN
    ? `no ?burp=1 and he burped anyway (${bc.length} 'burp' call(s), burpN ${nowN}) — the owner has not heard it yet`
    : `no ?burp=1, no burp (0 calls, burpN ${nowN ?? 'absent'})`);

  // (e) the hop, on the goal-win door
  await p.evaluate(() => { window.__setMood(null); window.__sv.fr.length = 0; });
  const eat = await p.evaluate(() => window.__levelSpec().eat);
  const tW = await p.evaluate((e) => { window.__setScore(e + 1); return window.__matchState().tClock; }, eat);
  await until(p, 'the goal was never met', () => window.__goalState()?.met, null, { polling: 100 });
  await waitTc(p, tW + 1.2);
  const hf = (await frames(p)).filter((r) => r.tc > tW);
  await p.close();
  if (!hf.length || typeof hf[0].hop !== 'number') {
    bar(false, 'e', 'faceState() does not report the body\'s hop — this build has no victoryHop()');
  } else {
    const lo = Math.min(...hf.map((r) => r.hop)), hi = Math.max(...hf.map((r) => r.hop));
    const late = hf.filter((r) => r.tc >= tW + 0.55);
    const off = late.filter((r) => Math.abs(r.hop - 1) > 0.01);
    const lastMove = [...hf].reverse().find((r) => Math.abs(r.hop - 1) > 0.01);
    console.log(`    the goal-win hop: ${hf.filter((r) => r.tc <= tW + 0.6).map((r) => r.hop.toFixed(2)).join(' ')}   `
      + `(last frame off rest at +${lastMove ? (lastMove.tc - tW).toFixed(2) : '—'} s of tClock)`);
    bar(lo <= 0.82 && hi >= 1.18 && late.length > 0 && !off.length, 'e',
      `the goal-win hop squashes to ${lo.toFixed(2)} (bar 0.82), stretches to ${hi.toFixed(2)} (bar 1.18), `
      + `and ${off.length ? `is still off rest on ${off.length} frame(s) past +0.55 s — the world's 0.3x clock` : `is at rest from +0.55 s of tClock (${late.length} frames)`}`);
  }
}

// ══ PAGE 2: ?burp=1 — one burp, then the cooldown ══════════════════════════
{
  const p = await open('&burp=1');
  const ready = async () => {
    const st = await p.evaluate(() => window.__burpState?.());
    if (!st) die('this build has no __burpState — there is no burp machinery to measure');
    if (!st.on) die('?burp=1 did not switch the burp on');
    await until(p, 'the burp never came off cooldown', () => { const s = window.__burpState(); return s.wait < 0 && s.cd <= 0; });
  };
  const bites = await threeBites(p, { after: ready });
  const lastG = Math.max(...bites.map((x) => x.gulp));
  await waitTc(p, lastG + 1.5);
  const n1 = await p.evaluate(() => window.__faceState().burpN);
  const c1 = await burps(p);
  const fr = await frames(p);
  const shown = c1.length ? fr.filter((r) => r.tc >= c1[0].t && r.tc <= c1[0].t + 0.3 && r.vf.some((s) => /^burp!$/i.test(s))) : [];
  console.log('\n  PAGE 2 — ?burp=1');
  console.log(`    swallows at ${bites.map((x) => x.gulp.toFixed(2)).join(', ')}; burp heard at ${c1.map((c) => c.t.toFixed(2)).join(', ') || 'never'}`
    + `${c1.length ? ` (${(() => { const g = bites.filter((x) => x.gulp <= c1[0].t).pop(); return g ? `${(c1[0].t - g.gulp).toFixed(2)} s after swallow ${bites.indexOf(g) + 1}` : 'before any forced swallow'; })()})` : ''}; float shown on ${shown.length} frame(s) as "${shown[0]?.vf.find((s) => /^burp!$/i.test(s)) ?? '—'}"`);
  bar(n1 === 1 && c1.length === 1 && shown.length > 0, 'f',
    `three big bites taken inside ${(bites[2].cap - bites[0].cap).toFixed(1)} s earn one burp: burpN ${n1}, ${c1.length} 'burp' call(s), float on ${shown.length} frame(s)`);
  // (g) a second trigger inside the cooldown
  const lm = await p.evaluate(() => { const x = window.__eatLandmark(); const log = window.__biteLog();
    return x ? { ...x, id: log[log.length - 1].id, t: window.__matchState().tClock } : null; });
  if (!lm) die(`${WORLD} has no tagged landmark to eat for the second trigger`);
  await until(p, `the ${lm.name} was never swallowed`, (id) => { const r = window.__biteLog().find((x) => x.id === id); return r && r.gulp >= 0; }, lm.id, { polling: 150 });
  const g2 = await p.evaluate((id) => window.__biteLog().find((x) => x.id === id).gulp, lm.id);
  await waitTc(p, g2 + 1.5);
  const n2 = await p.evaluate(() => window.__faceState().burpN);
  const c2 = await burps(p);
  await p.close();
  console.log(`    the ${lm.name} swallowed at ${g2.toFixed(2)}, ${(g2 - (c1[0]?.t ?? g2)).toFixed(1)} s after the burp`);
  bar(n2 === 1 && c2.length === 1 && g2 - (c1[0]?.t ?? -99) < 20, 'g',
    `a second trigger ${(g2 - (c1[0]?.t ?? g2)).toFixed(1)} s later is held by the 20 s cooldown: burpN ${n2}, ${c2.length} 'burp' call(s)`);
}

// ══ PAGE 3: ?burp=1 — the end beat ═════════════════════════════════════════
{
  const p = await open('&burp=1');
  const st0 = await p.evaluate(() => window.__burpState?.());
  if (!st0) die('this build has no __burpState — there is no burp machinery to measure');
  const eat = await p.evaluate(() => window.__levelSpec().eat);
  // THE WATCHER meets the goal on the first frame a burp is owed, whichever
  // swallow owed it. The magnet feeds him landmark-grade meals of its own at
  // r 4, so the streak can close on the first or second forced swallow as
  // easily as the third; the run before this one met the goal after the
  // third, by which time an earlier burp had played and the cooldown held the
  // owed one off — it tested nothing. A rAF callback runs between two frames,
  // so the next animate() sees the goal met at its top, ahead of the burp's
  // own countdown, which is at least 0.45 s of world time long.
  const ready = async () => {
    await until(p, 'the burp never came off cooldown', () => { const s = window.__burpState(); return s.wait < 0 && s.cd <= 0; });
    await p.evaluate((e) => {
      const W = window.__svEnd = { at: null };
      const tick = () => {
        const s = window.__burpState();
        if (s.wait >= 0 && !W.at) {
          window.__setScore(e + 1);
          W.at = { t: window.__matchState().tClock, wait: s.wait, n: window.__faceState().burpN };
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, eat);
  };
  await quiet(p);
  await waitTc(p, (await tc(p)) + 1.2);
  await ready();
  // the same three bites as page 2, stopping early once the goal is met: after
  // the end the drain stops, and a meal taken then is never swallowed
  const bites = [];
  for (let i = 0; i < 3; i++) {
    if (i) await waitTc(p, bites[i - 1].cap + GAP);
    if (await p.evaluate(() => !!window.__svEnd.at)) break;
    const got = await p.evaluate(({ rel, r0 }) => {
      window.__setVoidR(r0);
      const cap = window.__matchState().tClock;
      const ate = window.__eatNearest(rel);
      const log = window.__biteLog();
      const row = log[log.length - 1];
      return ate ? (row && row.cap === cap ? { id: row.id, cap } : { declined: true, r: ate.r }) : null;
    }, { rel: REL, r0: R0 });
    if (!got) die(`bite ${i + 1}: no edible of at least ${REL} of the void's radius is left on ${WORLD}`);
    if (got.declined) die(`bite ${i + 1}: capture() declined the r ${got.r.toFixed(2)} prop __eatNearest chose — nothing new is in the drain`);
    bites.push(got);
  }
  await until(p, 'no burp was owed and the forced meals never all went down', (ids) => {
    if (window.__svEnd.at) return true;
    const log = window.__biteLog();
    return ids.every((id) => { const r = log.find((x) => x.id === id); return r && r.gulp >= 0; });
  }, bites.map((x) => x.id), { polling: 150 });
  const log3 = await p.evaluate(() => window.__biteLog());
  for (const x of bites) x.gulp = log3.find((r) => r.id === x.id)?.gulp ?? -1;
  let endAt = await p.evaluate(() => window.__svEnd.at);
  if (!endAt) { await waitTc(p, Math.max(...bites.map((x) => x.gulp)) + 1.0); endAt = await p.evaluate(() => window.__svEnd.at); }
  if (endAt) await waitTc(p, endAt.t + 1.5);
  const after = await burps(p);
  const n3 = await p.evaluate(() => window.__faceState().burpN);
  const met = await p.evaluate(() => !!window.__goalState()?.met);
  await p.close();
  console.log('\n  PAGE 3 — ?burp=1, the goal met the frame a burp is owed');
  if (!endAt) {
    console.log(`    swallows at ${bites.map((x) => x.gulp.toFixed(2)).join(', ')}; no burp was ever owed`);
    bar(false, 'h', 'no burp was owed by three big swallows, so the end beat could not be tested — this run tested nothing');
  } else {
    const late = after.filter((c) => c.t >= endAt.t);
    console.log(`    ${bites.length} forced bite(s), swallows at ${bites.map((x) => (x.gulp >= 0 ? x.gulp.toFixed(2) : 'never')).join(', ')}; a burp owed at tClock ${endAt.t.toFixed(2)}, `
      + `due in ${endAt.wait.toFixed(2)} s, and the goal met there; 'burp' calls from then on ${late.length}; burpN ${endAt.n} -> ${n3}; goal met ${met}`);
    bar(!late.length && n3 === endAt.n && met, 'h', late.length || n3 !== endAt.n
      ? `the burp went off inside the end beat (${late.length} call(s)) — it talked over the whistle`
      : 'the owed burp never played: the whistle has the end to itself');
  }
}

await b.close();
note('all three pages done');
if (bad) console.log(`\nFAIL — ${bad} of 8 bar(s)`);
else console.log('\nPASS — 8 bar(s): he savours a big bite, burps once on ?burp=1 and never over the whistle, and hops when he wins');
process.exit(bad ? 1 : 0);
