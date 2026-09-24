// DOES THE ALARM MEAN DANGER, AND ONLY DANGER? — the one-meaning-per-channel probe.
//
//   node qa/dangerchannel.mjs [port] [world]
//
// Studio round 4, Job 10 (PLAY + AUDIO; governor's conflict 9, "red means
// danger" and "glow means light" are the same rule). On the build the studio
// read, audio.alert() answered six events and a red wash three:
//
//   alert()   every sibling joining (3-5 a match, GRUMPS included), the charge,
//             losing the lead, the first-run danger teach, a tapped locked
//             level dot, a tapped locked world card
//   red wash  the charge, a form bite, losing the lead
//
// A pre-reader learns an alarm that rings for everything means "something
// happened", so by the time NIBBLES winds up it has stopped meaning "move".
// And a padlock tapped out of curiosity got the danger sound.
//
// ── WHAT IT DOES ───────────────────────────────────────────────────────────
// PART 1, the menu (?manual=1, no match): a profile on Maple dot 2 with only
// Maple unlocked, so dots 3-5 and every other world are locked. It taps a
// locked level dot and a locked world card and reads __audioCalls() for what
// each tap played.
//
// PART 2, a match (?len=60, which starts a goal-free harness match — no goal
// can end it on a score — and scales the family's join times to a third:
// rivals.ts reroll() seats NIBBLES at rand(7, 13) x 1/3 = 2.3-4.3 s and the
// next seat at rand(9, 15) x 1/3 = 3-5 s, and the first slot's rand(2, 5) is
// never used, because NIBBLES always holds seat 0 — so the first sibling
// walks in inside about four and a half match-seconds, the second by 5).
// An init script wraps __fx.flash (the same object the game calls) and, on
// every animation frame, mirrors __audioCalls() (the game's own log, stamped
// with tClock, capped at 400 entries, hence the mirror) and records each
// danger event off __matchState().ev and the guide: a charge, a bite on the
// player, the first-run BIGGER teach. It also records joins, crowns and lost
// leads.
// Then, keyed on the game's clocks only:
//   · the natural opening, until at least two siblings have joined and 6
//     match-seconds have passed;
//   · __charge() — the real rivals.onCharge handler, fired for a joined rival
//     at its own position (a natural charge needs the hunt window and minutes
//     of match clock under a software renderer);
//   · __bite(true) — the real bite handler, a form bite;
//   · a lead taken and lost: every rival to 1e6, the player to 1e8 (the crown
//     fires), 6.2 s of tClock for the mirror's cooldown, then one rival to 2e8.
//
// THE BARS
//   (a) THE CHANNEL. Across the whole run, every alert() call and every
//       red-hue flash lands within 0.3 s of tClock of a charge, a bite on the
//       player or the danger teach. Red is hue within 20° of 0 at HSV
//       saturation >= 0.5 and alpha > 0, in any colour stop of the wash. A
//       flash whose string is one of the game's own beat washes (__beats) is
//       noted, not graded — see below. Needs at least one sibling joined in the
//       natural opening, or it is a PASS on no data and reads FAIL. Fails on
//       the build before Job 10 at the first join, which rings alert().
//   (b) ONE FLASH A FRAME. No animation frame of this run carries two
//       flash() calls — the second erases the first before it is drawn (fx.ts
//       writes background and opacity together). Fails before Job 10 on the
//       forced form bite (violet, then red) and on any rival eaten in the run
//       (gold, then violet). It is not a game-wide bar: the last form's
//       evolution still calls flash() twice (gold, then white), and this run
//       steers nothing and sets only scores, so it never evolves her there.
//   (c) THE CHARGE STILL ALARMS, FROM HER SIDE. __charge() rings alert(),
//       fires exactly one flash, and that flash is a linear-gradient whose
//       angle is __wayAim(her x, 0, her z).bear within 1°, clear (alpha 0) at
//       its first stop and red at its last. Fails before Job 10: no __charge
//       hook, and the wash was a flat rgba() fill.
//   (d) LOSING THE LEAD IS NEWS, NOT DANGER. The lead-lost branch fired
//       (ev.leadLost counted it) and nothing in its frame was an alert() or a
//       red flash. Before Job 10 there is no counter, so this reads FAIL on
//       the missing count; bar (a) is the one that fails there on the alarm
//       itself if the crown and the loss happen.
//   (e) A PADLOCK IS CURIOSITY. Each locked tap in part 1 plays bonk(), the
//       wall's soft "you can't have that", and neither pop() (the eat, the
//       game's reward) nor alert(). Fails before Job 10 on both taps (alert),
//       and on c79d36b, the job's first cut, on both (pop). qa/padlock.mjs
//       reads the same two handlers and bonk()'s graph in node.
//
// NOT GRADED HERE: the beat palette. Beat washes are world colours, and a
// season repaints every one of them for its fortnight (events.ts), so whether
// one is red depends on the date the probe runs. Two of the authored ones sit
// in this probe's red band — Maple's rgba(255,93,126) (hue 348°) and Game
// Day's CRIM rgba(196,52,47) (hue 2°) — and Job 10 does not touch them. At
// ?len=60 the earliest a beat can fire is match-second 24 (beat 1's 30 ± 6;
// the finale's slot clamps to matchLen - dur - 2 = 26), near the end of this
// run, so the probe names any beat wash it sees rather than grading it.
import { chromium } from 'playwright';

const POS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const PORT = POS[0] || '4177';
const WORLD = POS[1] || 'maple';

const die = (m) => { console.log(`FAIL — ${m}`); process.exit(1); };
process.on('uncaughtException', (e) => die(`threw: ${String((e && e.message) || e).split('\n')[0]}`));
process.on('unhandledRejection', (e) => die(`rejected: ${String((e && e.message) || e).split('\n')[0]}`));

const WINDOW = 0.3;         // s of tClock between a cue and the danger that explains it
const NATURAL_T = 6;        // match-seconds of natural opening
const NATURAL_JOINS = 2;

// ── COLOUR ──────────────────────────────────────────────────────────────────
const stops = (bg) => {
  const s = String(bg), out = [];
  for (const m of s.matchAll(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/g))
    out.push({ r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] });
  for (const m of s.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) {
    const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
    out.push({ r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 });
  }
  return out;
};
const isRed = ({ r, g, b, a }) => {
  if (!(a > 0)) return false;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx <= 0 || (mx - mn) / mx < 0.5) return false;
  let h = mx === r ? 60 * (((g - b) / (mx - mn)) % 6) : mx === g ? 60 * ((b - r) / (mx - mn) + 2) : 60 * ((r - g) / (mx - mn) + 4);
  h = (h + 360) % 360;
  return h <= 20 || h >= 340;
};
const redWash = (bg) => stops(bg).some(isRed);

const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const waitOr = async (p, fn, arg, label, timeout = 900000) => {
  try { await p.waitForFunction(fn, arg, { timeout, polling: 250 }); }
  catch { die(`${label} (waited ${Math.round(timeout / 1000)} s of wall clock)`); }
};

// ════ PART 1 — THE MENU: A TAPPED PADLOCK ═════════════════════════════════════
const m = await b.newPage({ viewport: { width: 390, height: 844 } });
m.on('pageerror', (e) => console.log(`  [pageerror] ${e.message.split('\n')[0]}`));
await m.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await m.addInitScript((w) => { try {
  localStorage.clear();
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidMute', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidWorld', w);
  localStorage.setItem('voidUnlocked', w);
  // dot 1 met, so dot 2 is next and 3-5 are locked (levels.ts's own store)
  localStorage.setItem('voidLevels', JSON.stringify({ v: 1, w: { [w]: { 1: { st: 'done', n: 1 } } } }));
} catch { /* private mode */ } }, WORLD);
await m.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}&manual=1`, { waitUntil: 'domcontentloaded', timeout: 400000 });
await waitOr(m, () => !!window.__voidState && typeof window.__audioCalls === 'function', null, 'the menu never booted a debug API with __audioCalls');
await waitOr(m, () => !!document.querySelector('#mlPips .pip.s-locked'), null,
  'no locked level dot (#mlPips .pip.s-locked) on the menu — a profile on dot 2 should show dots 3-5 locked', 300000);
const tapDot = await m.evaluate(() => {
  const w0 = performance.now() / 1000;
  document.querySelector('#mlPips .pip.s-locked').click();
  return window.__audioCalls().filter((c) => c.w >= w0).map((c) => c.id);
});
await m.evaluate(() => {
  document.querySelectorAll('.show').forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); });
  document.getElementById('worlds')?.classList.add('show');
});
await waitOr(m, () => !!document.querySelector('#worldRow .wCard.locked'), null,
  'no locked world card (#worldRow .wCard.locked) in the picker with only one world unlocked', 300000);
const tapCard = await m.evaluate(() => {
  const w0 = performance.now() / 1000;
  const c = document.querySelector('#worldRow .wCard.locked');
  c.click();
  return { world: c.getAttribute('data-world'), ids: window.__audioCalls().filter((x) => x.w >= w0).map((x) => x.id) };
});
await m.close();
console.log(`\n  DANGER CHANNEL — ${WORLD} on :${PORT}`);
console.log(`  part 1: locked level dot played [${tapDot.join(', ') || 'nothing'}]; `
  + `locked world card (${tapCard.world}) played [${tapCard.ids.join(', ') || 'nothing'}]`);

// ════ PART 2 — A MATCH ═══════════════════════════════════════════════════════
const p = await b.newPage({ viewport: { width: 320, height: 640 }, deviceScaleFactor: 1 });
p.on('pageerror', (e) => console.log(`  [pageerror] ${e.message.split('\n')[0]}`));
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript((w) => { try {
  localStorage.clear();
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidMute', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidWorld', w);
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
} catch { /* private mode */ } }, WORLD);
// THE RECORDER, in the page, so no reading waits on a round trip
await p.addInitScript(() => {
  const dc = window.__dc = { flashes: [], calls: [], events: [], frame: 0, armed: false,
    charges: 0, bites: 0, leadLost: 0, crowns: 0, joined: 0, teach: false, hasLead: false };
  const seen = new WeakSet();
  const arm = () => {
    if (!window.__fx || typeof window.__matchState !== 'function' || typeof window.__audioCalls !== 'function') {
      setTimeout(arm, 5); return;
    }
    const real = window.__fx.flash;
    window.__fx.flash = function (bg, alpha) {
      dc.flashes.push({ f: dc.frame, t: window.__matchState().tClock, bg: String(bg), alpha });
      return real.apply(this, arguments);
    };
    const ev0 = window.__matchState().ev;
    dc.charges = ev0.charges; dc.bites = ev0.bites;
    dc.hasLead = typeof ev0.leadLost === 'number' && typeof ev0.crowns === 'number';
    dc.leadLost = ev0.leadLost ?? 0; dc.crowns = ev0.crowns ?? 0;
    dc.armed = true;
    const tick = () => {
      dc.frame++;
      const s = window.__matchState(), t = s.tClock, ev = s.ev;
      for (const c of window.__audioCalls()) if (!seen.has(c)) { seen.add(c); dc.calls.push({ t: c.t, id: c.id, f: dc.frame }); }
      if (ev.charges > dc.charges) { dc.events.push({ t, mt: s.t, kind: 'charge' }); dc.charges = ev.charges; }
      if (ev.bites > dc.bites) { dc.events.push({ t, mt: s.t, kind: 'bite' }); dc.bites = ev.bites; }
      if ((ev.crowns ?? 0) > dc.crowns) { dc.events.push({ t, mt: s.t, kind: 'crown' }); dc.crowns = ev.crowns; }
      if ((ev.leadLost ?? 0) > dc.leadLost) { dc.events.push({ t, mt: s.t, kind: 'leadLost' }); dc.leadLost = ev.leadLost; }
      const j = s.rivals.filter((r) => r.joined).length;
      for (; dc.joined < j; dc.joined++) dc.events.push({ t, mt: s.t, kind: 'join' });
      const g = document.getElementById('guide');
      if (!dc.teach && g && g.classList.contains('show') && /BIGGER/.test(g.textContent || '')) {
        dc.teach = true; dc.events.push({ t, mt: s.t, kind: 'teach' });
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  arm();
});
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}&len=60`, { waitUntil: 'domcontentloaded', timeout: 400000 });
await waitOr(p, () => !!window.__voidState && window.__dc?.armed, null, 'the match page never booted a debug API the recorder could arm on');

// the natural opening, on the match clock
await waitOr(p, ({ T, J }) => (window.__matchState().t >= T && window.__dc.joined >= J) || window.__matchState().t >= 20,
  { T: NATURAL_T, J: NATURAL_JOINS }, `the natural opening never reached ${NATURAL_T} match-seconds`, 1500000);
const nat = await p.evaluate(() => ({ t: window.__matchState().tClock, mt: window.__matchState().t,
  joins: window.__dc.events.filter((e) => e.kind === 'join').length, frame: window.__dc.frame }));
console.log(`  part 2: natural opening to match-second ${nat.mt.toFixed(1)} (tClock ${nat.t.toFixed(2)}), ${nat.joins} sibling(s) joined`);

const nextFrame = async (label) => {
  const f0 = await p.evaluate(() => window.__dc.frame);
  await waitOr(p, (f) => window.__dc.frame > f + 1, f0, `no frame drew after ${label}`, 300000);
};

// (c) the charge, through its real handler
const hasCharge = await p.evaluate(() => typeof window.__charge === 'function');
let charge = null;
if (hasCharge) {
  charge = await p.evaluate(() => {
    const dc = window.__dc;
    const nf = dc.flashes.length, nc = window.__audioCalls().length;
    const w0 = performance.now() / 1000;
    const who = window.__charge();
    if (!who) return { who: null };
    const aim = window.__wayAim(who.x, 0, who.z);
    return { who, aim, flashes: dc.flashes.slice(nf),
      ids: window.__audioCalls().filter((c) => c.w >= w0).map((c) => c.id), nc };
  });
  await nextFrame('the forced charge');
}
// (b) a form bite, through its real handler
const bite = await p.evaluate(() => {
  const dc = window.__dc, nf = dc.flashes.length;
  window.__bite(true);
  return { flashes: dc.flashes.slice(nf) };
});
await nextFrame('the forced bite');

// (d) take the lead, then lose it — on tClock throughout
let lead = { fired: false, why: '' };
const hasLead = await p.evaluate(() => window.__dc.hasLead);
if (!hasLead) lead.why = '__matchState().ev carries no crowns/leadLost counters on this build';
else {
  const tc = () => p.evaluate(() => window.__matchState().tClock);
  await p.evaluate(() => { window.__setRivalScores([1e6, 1e6, 1e6, 1e6, 1e6]); window.__setScore(0); });
  let t0 = await tc();
  await waitOr(p, (t) => window.__matchState().tClock > t + 2.4, t0, 'tClock stalled while the player sat behind');
  const crowns0 = await p.evaluate(() => window.__dc.crowns);
  await p.evaluate(() => window.__setScore(1e8));
  t0 = await tc();
  await waitOr(p, ({ c, t }) => window.__dc.crowns > c || window.__matchState().tClock > t + 5, { c: crowns0, t: t0 },
    'tClock stalled waiting for the crown');
  // the crown is WORN if the latest crown/lead-lost event is a crown — one the
  // natural opening fired and nothing took away counts as much as a new one
  const worn = await p.evaluate(() => {
    const e = window.__dc.events.filter((x) => x.kind === 'crown' || x.kind === 'leadLost');
    const last = e[e.length - 1];
    return last && last.kind === 'crown' ? { t: last.t } : null;
  });
  if (!worn) lead.why = 'the crown never fired after the player went from last to first (5 s of tClock)';
  else {
    // the mirror shares the crown's 6 s budget from the crown's own frame
    await waitOr(p, (t) => window.__matchState().tClock > t + 6.2, worn.t, 'tClock stalled through the lead cooldown');
    const lost0 = await p.evaluate(() => window.__dc.leadLost);
    await p.evaluate(() => window.__setRivalScores([2e8]));
    t0 = await tc();
    await waitOr(p, ({ c, t }) => window.__dc.leadLost > c || window.__matchState().tClock > t + 5, { c: lost0, t: t0 },
      'tClock stalled waiting for the lead to go');
    lead.fired = await p.evaluate((c) => window.__dc.leadLost > c, lost0);
    if (!lead.fired) lead.why = 'the lead-lost branch never fired after a rival passed the crowned player (5 s of tClock)';
  }
}
const rec = await p.evaluate(() => ({ flashes: window.__dc.flashes, calls: window.__dc.calls, events: window.__dc.events,
  // the beat table's own washes (seasons repaint them), read off the game, not copied
  beatWash: (window.__beats || []).map((bt) => String(bt.flash)),
  mt: window.__matchState().t }));
await b.close();

// ── THE BARS ─────────────────────────────────────────────────────────────────
let bad = 0;
const bar = (ok, id, msg) => { console.log(`  ${ok ? 'ok  ' : 'BAD '} (${id}) ${msg}`); if (!ok) bad++; };
const danger = rec.events.filter((e) => e.kind === 'charge' || e.kind === 'bite' || e.kind === 'teach');
const explained = (t) => danger.some((e) => Math.abs(e.t - t) <= WINDOW);
const near = (t) => rec.events.filter((e) => Math.abs(e.t - t) <= WINDOW).map((e) => e.kind);
const alerts = rec.calls.filter((c) => c.id === 'alert');
// A beat's wash is the beat table's world colour (see the header), not the
// family's channel: noted, not graded, and named if one lands in the run.
const beatSet = new Set(rec.beatWash);
const beatReds = rec.flashes.filter((f) => beatSet.has(f.bg) && redWash(f.bg));
const reds = rec.flashes.filter((f) => redWash(f.bg) && !beatSet.has(f.bg));
const loose = [...alerts.map((c) => ({ what: 'alert()', t: c.t })), ...reds.map((f) => ({ what: `red flash ${f.bg.slice(0, 60)}`, t: f.t }))]
  .filter((x) => !explained(x.t)).sort((x, y) => x.t - y.t);
console.log(`  events to match-second ${rec.mt.toFixed(1)}: ${['join', 'charge', 'bite', 'teach', 'crown', 'leadLost'].map((k) => `${k} ${rec.events.filter((e) => e.kind === k).length}`).join(', ')}; `
  + `${alerts.length} alert(), ${rec.flashes.length} flash() of which ${reds.length} red`);
if (beatReds.length) console.log(`  note: ${beatReds.length} beat wash(es) in the red band, not graded: ${[...new Set(beatReds.map((f) => f.bg))].join(', ')}`);

// (a)
if (nat.joins < 1) bar(false, 'a', `no sibling joined in the natural opening — nothing tested whether a join rings the alarm (a PASS on no data)`);
else if (loose.length) {
  const x = loose[0];
  bar(false, 'a', `${loose.length} alarm/red cue(s) with no charge, bite or teach within ${WINDOW} s; first: ${x.what} at tClock ${x.t.toFixed(2)} `
    + `beside [${near(x.t).join(', ') || 'nothing'}]`);
} else bar(true, 'a', `every alert() (${alerts.length}) and every red flash (${reds.length}) lands within ${WINDOW} s of a charge, a bite or the teach; `
  + `${nat.joins} sibling(s) joined without one`);

// (b)
const perFrame = new Map();
for (const f of rec.flashes) perFrame.set(f.f, [...(perFrame.get(f.f) ?? []), f.bg]);
const doubled = [...perFrame.values()].filter((v) => v.length > 1);
bar(!doubled.length && bite.flashes.length === 1, 'b', doubled.length
  ? `${doubled.length} frame(s) carried two or more flash() calls; first: ${doubled[0].map((s) => s.slice(0, 40)).join(' then ')}`
  : bite.flashes.length !== 1 ? `the forced form bite fired ${bite.flashes.length} flash() call(s), not one`
    : `one flash() per frame across ${perFrame.size} flashing frame(s), the form bite included (${bite.flashes[0].bg})`);

// (c)
if (!hasCharge) bar(false, 'c', 'this build has no __charge hook, so a charge cannot be fired through its real handler');
else if (!charge.who) bar(false, 'c', '__charge() found no joined rival to fire for');
else {
  const f = charge.flashes;
  const g = f.length === 1 ? /linear-gradient\(\s*(-?[\d.]+)deg/.exec(f[0].bg) : null;
  const st = f.length === 1 ? stops(f[0].bg) : [];
  const angOk = g && charge.aim && Math.abs((((+g[1] - charge.aim.bear) % 360) + 540) % 360 - 180) <= 1;
  const ok = charge.ids.includes('alert') && f.length === 1 && g && angOk
    && st.length >= 2 && st[0].a === 0 && isRed(st[st.length - 1]);
  bar(!!ok, 'c', ok
    ? `the charge (${charge.who.name}) rang alert() and drew one edge wash at ${(+g[1]).toFixed(1)}° against her bearing ${charge.aim.bear.toFixed(1)}° `
      + `(${charge.aim.onScreen ? 'in frame' : 'off frame'})`
    : `the charge (${charge.who.name}): alert ${charge.ids.includes('alert') ? 'rang' : 'DID NOT ring'}, ${f.length} flash(es)`
      + `${f.length ? `, first "${f[0].bg.slice(0, 80)}"` : ''}; her bearing ${charge.aim ? charge.aim.bear?.toFixed?.(1) : 'n/a'}°`
      + ' — the wash must be one gradient, clear at its first stop, red at its last, laid along her bearing');
}

// (d)
if (!lead.fired) bar(false, 'd', `the lead was never lost: ${lead.why}`);
else {
  // the recorder stamps the loss on the frame it sees the counter move, at
  // most one frame (dt <= 0.05 s) after the branch ran; anything the branch
  // played is inside WINDOW of it, and a real danger inside it still excuses
  // a cue, as in (a)
  const tl = rec.events.filter((e) => e.kind === 'leadLost').pop().t;
  const atLoss = [...alerts.filter((c) => Math.abs(c.t - tl) <= WINDOW && !explained(c.t)).map(() => 'alert()'),
    ...reds.filter((x) => Math.abs(x.t - tl) <= WINDOW && !explained(x.t)).map((x) => `red flash ${x.bg.slice(0, 40)}`)];
  bar(!atLoss.length, 'd', atLoss.length ? `losing the lead played ${atLoss.join(', ')}`
    : `losing the lead fired its card with no alert() and no red (tClock ${tl.toFixed(2)})`);
}

// (e)
const padOk = (ids) => ids.includes('bonk') && !ids.includes('pop') && !ids.includes('alert');
bar(padOk(tapDot) && padOk(tapCard.ids), 'e', padOk(tapDot) && padOk(tapCard.ids)
  ? 'a locked level dot and a locked world card each play bonk(), and neither pop() nor alert()'
  : `locked taps played dot [${tapDot.join(', ') || 'nothing'}], card [${tapCard.ids.join(', ') || 'nothing'}] — each wants bonk(), and neither pop() (the eat) nor alert()`);

if (bad) { console.log(`\nFAIL — the danger channel carries non-danger (${bad} of 5 bars)`); process.exit(1); }
console.log('\nPASS — alert() and the red wash answer only a charge, a bite or the teach; one flash a frame; the charge washes from her side; a lost lead is not an alarm and a padlock is neither an alarm nor a meal');
process.exit(0);
