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
// real capture()) 0.8 s of tClock apart at r 4 — the spec's "three inside 3 s".
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
//         a blink can explain one bite's window; every bite must show it
//     (c) THE GULP: a second jelly kick — the slosh rising frame over frame by
//         at least 0.1 — within 200 ms after each swallow. The first kick is
//         chomp()'s, at the capture, hundreds of ms earlier
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
//         the frame after the third swallow, while the burp is still owed. No
//         'burp' is played from the end beat on, and the rig counts none. A run
//         where nothing was owed when the end began has tested nothing, and
//         FAILS as such
import { chromium } from 'playwright';

const POS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const PORT = POS[0] || '4177', WORLD = POS[1] || 'maple';
const REL = 0.7, GAP = 0.8, R0 = 4;

const die = (m) => { console.log(`FAIL — ${m}`); process.exit(1); };
process.on('uncaughtException', (e) => die(`threw: ${String((e && e.message) || e).split('\n')[0]}`));
process.on('unhandledRejection', (e) => die(`rejected: ${String((e && e.message) || e).split('\n')[0]}`));

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
          fx: f.faceX, wob: f.wobble, hop: f.hop, burpN: f.burpN, mood: f.mood, vf });
      }
    } catch { /* a frame we could not read is a frame we do not report */ }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

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
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 900000, polling: 250 });
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
const tc = (p) => p.evaluate(() => window.__matchState().tClock);
const waitTc = async (p, t) => p.waitForFunction((x) => window.__matchState().tClock >= x, t, { timeout: 900000, polling: 150 });

/** Pin, size, settle; then three forced bites GAP apart. Resolves with each
 *  bite's mesh id, grade and capture tClock once all three are swallowed. */
async function threeBites(p, { after } = {}) {
  await p.evaluate((r) => { window.__setMood('cruise'); window.__setVoidR(r); }, R0);
  await waitTc(p, (await tc(p)) + 1.2);   // the feast a size change sets off, as juice.mjs waits it out
  if (after) await after();
  await p.evaluate(() => { window.__sv.on = true; });
  const bites = [];
  for (let i = 0; i < 3; i++) {
    if (i) await waitTc(p, bites[i - 1].cap + GAP);
    const got = await p.evaluate((rel) => {
      const cap = window.__matchState().tClock;
      const ate = window.__eatNearest(rel);
      if (!ate) return null;
      const log = window.__biteLog();
      return { id: log[log.length - 1].id, r: ate.r, R: ate.R, bite: ate.r / ate.R, cap };
    }, REL);
    if (!got) die(`bite ${i + 1}: no edible of at least ${REL} of the void's radius is left on ${WORLD}`);
    bites.push(got);
  }
  await p.waitForFunction((ids) => {
    const log = window.__biteLog();
    return ids.every((id) => { const r = log.find((x) => x.id === id); return r && r.gulp >= 0; });
  }, bites.map((x) => x.id), { timeout: 900000, polling: 150 });
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
  const rows = bites.map((x) => {
    const w = (lo, hi) => fr.filter((r) => r.tc > x.gulp + lo + 1e-6 && r.tc <= x.gulp + hi + 1e-6);
    const first = w(0, 0.0501);
    const sq = w(0, 0.25);
    const gw = fr.filter((r) => r.tc > x.gulp - 1e-6 && r.tc <= x.gulp + 0.2001);
    let kick = 0;
    for (let i = 1; i < gw.length; i++) kick = Math.max(kick, gw[i].wob - gw[i - 1].wob);
    return { ...x, op: Math.max(0, ...first.map((r) => r.op)), blush: Math.max(0, ...first.map((r) => r.blush)),
      fx: Math.max(0, ...first.map((r) => r.fx)), sy: Math.min(9, ...sq.map((r) => r.sy)), kick,
      nFirst: first.length };
  });
  console.log('  PAGE 1 — the shipped default (?g=1)');
  console.log('    bite    grade   swallow   blush drawn (asked)   face w/h   sclera.y min   slosh kick');
  for (const [i, r] of rows.entries()) {
    console.log(`    ${i + 1}       ${r.bite.toFixed(2)}   ${r.gulp.toFixed(2).padStart(7)}     ${r.op.toFixed(2)} (${r.blush.toFixed(2)})`
      + `            ${r.fx.toFixed(3)}      ${r.sy.toFixed(2)}          ${r.kick.toFixed(2)}${r.nFirst ? '' : '   (no frame in the first 50 ms)'}`);
  }
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
  await p.waitForFunction(() => window.__goalState()?.met, null, { timeout: 600000, polling: 100 });
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
    await p.waitForFunction(() => { const s = window.__burpState(); return s.wait < 0 && s.cd <= 0; }, null, { timeout: 900000, polling: 250 });
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
    + `${c1.length ? ` (+${(c1[0].t - lastG).toFixed(2)} s after the third)` : ''}; float shown on ${shown.length} frame(s) as "${shown[0]?.vf.find((s) => /^burp!$/i.test(s)) ?? '—'}"`);
  bar(n1 === 1 && c1.length === 1 && shown.length > 0, 'f',
    `three big bites inside ${(bites[2].cap - bites[0].cap).toFixed(1)} s earn one burp: burpN ${n1}, ${c1.length} 'burp' call(s), float on ${shown.length} frame(s)`);
  // (g) a second trigger inside the cooldown
  const lm = await p.evaluate(() => { const x = window.__eatLandmark(); const log = window.__biteLog();
    return x ? { ...x, id: log[log.length - 1].id, t: window.__matchState().tClock } : null; });
  if (!lm) die(`${WORLD} has no tagged landmark to eat for the second trigger`);
  await p.waitForFunction((id) => { const r = window.__biteLog().find((x) => x.id === id); return r && r.gulp >= 0; }, lm.id, { timeout: 900000, polling: 150 });
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
  await p.evaluate((r) => { window.__setMood('cruise'); window.__setVoidR(r); }, R0);
  await waitTc(p, (await tc(p)) + 1.2);
  await p.waitForFunction(() => { const s = window.__burpState(); return s.wait < 0 && s.cd <= 0; }, null, { timeout: 900000, polling: 250 });
  const eat = await p.evaluate(() => window.__levelSpec().eat);
  const caps = [];
  for (let i = 0; i < 3; i++) {
    if (i) await waitTc(p, caps[i - 1].cap + GAP);
    const got = await p.evaluate((rel) => {
      const cap = window.__matchState().tClock;
      const ate = window.__eatNearest(rel);
      const log = window.__biteLog();
      return ate ? { id: log[log.length - 1].id, cap } : null;
    }, REL);
    if (!got) die(`bite ${i + 1}: no edible of at least ${REL} of the void's radius is left on ${WORLD}`);
    caps.push(got);
  }
  // the goal is met the moment the third meal is down — on the game's side of
  // the call, in one task, so no frame can fire the burp in between
  await p.waitForFunction((id) => { const r = window.__biteLog().find((x) => x.id === id); return r && r.gulp >= 0; },
    caps[2].id, { timeout: 900000, polling: 50 });
  const endAt = await p.evaluate((e) => {
    const s = window.__burpState();
    window.__setScore(e + 1);
    return { t: window.__matchState().tClock, owed: s.wait >= 0, n: window.__faceState().burpN, wait: s.wait };
  }, eat);
  await waitTc(p, endAt.t + 1.5);
  const after = await burps(p);
  const n3 = await p.evaluate(() => window.__faceState().burpN);
  const met = await p.evaluate(() => !!window.__goalState()?.met);
  await p.close();
  const late = after.filter((c) => c.t >= endAt.t);
  console.log('\n  PAGE 3 — ?burp=1, the goal met while a burp is owed');
  console.log(`    end beat from tClock ${endAt.t.toFixed(2)}: a burp was ${endAt.owed ? `owed, due in ${endAt.wait.toFixed(2)} s` : 'NOT owed'}; `
    + `'burp' calls from then on ${late.length}; burpN ${endAt.n} -> ${n3}; goal met ${met}`);
  if (!endAt.owed) bar(false, 'h', 'nothing was owed when the end beat began — this run tested nothing');
  else bar(!late.length && n3 === endAt.n && met, 'h', late.length || n3 !== endAt.n
    ? `the burp went off inside the end beat (${late.length} call(s)) — it talked over the whistle`
    : 'the owed burp never played: the whistle has the end to itself');
}

await b.close();
if (bad) console.log(`\nFAIL — ${bad} of 8 bar(s)`);
else console.log('\nPASS — 8 bar(s): he savours a big bite, burps once on ?burp=1 and never over the whistle, and hops when he wins');
process.exit(bad ? 1 : 0);
