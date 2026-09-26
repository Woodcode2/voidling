// ONE NUMBER STREAM A CHILD CAN READ, AND A CHAIN SHE CAN SEE
//
//   node qa/nomstream.mjs [port] [world]
//
// Found by the 2026-09-23 research governor (G6). Three number streams ran at
// once on every bite: a '+N' rising off the prop, the coalesced '+N' flying
// into the bar, and every fifth bite a 'COMBO ×1.5' — a decimal, which a six
// year old does not read. The chain the combo counts was invisible between
// those fifths, it paid out silently when it lapsed, and the flying number was
// the same size for a traffic cone and a town hall.
//
// THE DRIVE. A scripted spree on the game's own clock: __eatNearest every 0.2
// match-seconds for 25 bites (two of them deliberately big meals, so the
// stream has something to size), then the chain is left to lapse. Every
// floater the pool shows is logged by its class, text, computed size and
// colour, at the match time it was raised. Then a beat is forced through the
// game's own schedule and three more bites are taken after it.
//
// THE BARS:
//   (a) no per-bite '+N' rises off a non-coin prop — the flight is the stream
//   (b) no decimal combo floater anywhere
//   (c) the largest flying number is at least 1.4x the smallest, by font size
//   (d) a crown at every tenth link the chain reached, and only there
//   (e) exactly one 'N NOMS! +N' cash-in, within 1.8 s of the chain's last
//       bite, naming the chain's own length
//   (f) the NOMS badge is up whenever the chain is 5 or more, says the chain's
//       length, wears the right tier, and never covers his face
//   (g) the crowns and the cash-in are HEARD — the audio engine logged them
//   (h) a beat pays nothing and paints nothing: after it fires, every flying
//       number wears the colour the chain's own flights wore before it —
//       never the beat's — and the NOMS pill carries no ×N badge
//   (i) the badge lives in a TOP CORNER and does not ride him: on every frame
//       it is up, its centre is in the top tenth of the screen and the outer
//       third of its width, it is wholly on screen with 8 px to spare, it is
//       clear by 4 px of the clock's own glyphs, the coins and the pause
//       button, and it does not move more than 1 px from where it first stood
//   (j) the same corner at 430x932, 390x844 and 360x780 — the live page,
//       resized mid-chain — and clear of the goal chip too (staged up for the
//       one synchronous read, because this match is not a level)
//
// ── RETRACTED: (f)'s PLACEMENT HALF, AS FIRST WRITTEN ────────────────────────
// Until 2026-09-25 (f) was this file's only placement bar, and all it asked of
// the pill was "never covers his face" — the rule for something that sits
// BESIDE him, which is where G6 put it (paintNoms placed it off the edge of his
// disc every frame). It passed 8/8 on that build while the pill stood next to
// the void on every chain frame of the spree. The owner, on his own recording
// that day: "the noms on the side ... it's always there next to the void ... it
// just takes real estate space. What if we put that on the top screen
// somewhere, like in a corner". So the bar was grading the one thing the pill
// must not do and nothing about where it should be, and the defect he reported
// was invisible to it. The face half stays in (f), because a badge over his
// face is still wrong; where the chain lives is (i) and (j) now, and "beside
// the void" is exactly what they fail.
//
// RETRACTED, 2026-09-25 — the old (h) was "inside a beat window the flying
// number wears the beat's colour". It was right for the game it measured, in
// which a beat opened a x2/x3 scoring window and the doubled number deserved
// to look doubled. The owner removed the windows on his own recording ("these
// events, like there's a bakery sale or double points ... I say we get rid of
// that"), so a flight in the beat's colour is now the defect, and (h) says so.
// It waits on the beat's own `fired` flag, not on __matchState().fever, which
// went with the windows; on the build before the change the forced beat still
// opens a window and (h) fails on its colour.
//
// Everything is keyed on __matchState().t. The software renderer here manages
// about 0.04 match-seconds per wall-second, and the chain lapses on a 1.6 s
// match timer: a drive paced in wall milliseconds would break the chain it is
// trying to measure.
import { chromium } from 'playwright';
import { enterMatch } from './_enter.mjs';

const POS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const PORT = POS[0] || '4177';
const WORLD = POS[1] || 'maple';
/** --shot=<file.png>: a picture of the mid-chain frame at 430x932, for a person */
const SHOT = (process.argv.find((a) => a.startsWith('--shot=')) || '').slice(7);
const BITES = 25, GAP = 0.2, BIG_AT = new Set([8, 18]);

const die = (m) => { console.log(`FAIL — ${m}`); process.exit(1); };
process.on('uncaughtException', (e) => die(`threw: ${(e && e.message) || e}`));
process.on('unhandledRejection', (e) => die(`rejected: ${(e && e.message) || e}`));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidFirstNom', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await enterMatch(p, WORLD);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 4, null, { timeout: 600000 });

// ── THE LOG ─────────────────────────────────────────────────────────────────
// Every floater is one of fourteen pooled '.vf' nodes, and each raise writes
// its className after its text. An own-property setter on each node fires
// inline, once per raise, with the real match time; the computed size and
// colour are read in a microtask so whatever inline style the raise sets after
// the class has landed. A per-frame logger records the chain and the pill.
await p.evaluate(() => {
  const L = window.__ns = { f: [], fr: [] };
  const ms = () => window.__matchState?.() ?? {};
  const proto = Element.prototype;
  const d = Object.getOwnPropertyDescriptor(proto, 'className');
  document.querySelectorAll('.vf').forEach((el) => {
    Object.defineProperty(el, 'className', {
      configurable: true,
      get() { return d.get.call(this); },
      set(v) {
        d.set.call(this, v);
        const text = (this.textContent || '').trim();
        if (!text) return;
        const s = ms();
        const rec = { t: s.t ?? 0, fever: s.fever ?? 1, fly: /\bfly\b/.test(v), cls: v, text, fs: 0, col: '', go: false };
        L.f.push(rec);
        queueMicrotask(() => { const cs = getComputedStyle(this);
          rec.fs = parseFloat(cs.fontSize) || 0; rec.col = cs.color; rec.go = this.classList.contains('go'); });
      },
    });
  });
  // the HUD pieces the badge has to stay clear of, as they are drawn on this
  // frame. #timer is a full-width line box (left: 0; right: 0), so its glyphs
  // are read through a Range — the element's own rect would collide with
  // anything anywhere in the top band.
  const box = (e) => {
    if (!e || !e.getClientRects().length) return null;
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) return null;
    const r = e.getBoundingClientRect();
    return r.width && r.height ? [r.left, r.top, r.right, r.bottom] : null;
  };
  const glyphs = (e) => {
    if (!e || !box(e) || !e.firstChild) return null;
    const rg = document.createRange(); rg.selectNodeContents(e);
    const r = rg.getBoundingClientRect();
    return r.width ? [r.left, r.top, r.right, r.bottom] : null;
  };
  window.__nsHud = () => ({ timer: glyphs(document.getElementById('timer')), coins: box(document.getElementById('coins')),
    btnQuit: box(document.getElementById('btnQuit')), goal: box(document.getElementById('goal')) });
  const tick = () => {
    const s = ms();
    const pill = document.getElementById('noms');
    let pv = false, ptxt = '', ptier = '', hit = false, pr = null, po = null, hud = null;
    if (pill) {
      const cs = getComputedStyle(pill);
      pv = cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.05;
      ptxt = (pill.textContent || '').trim(); ptier = pill.dataset.tier || '';
      const fb = window.__formBox?.();
      if (pv) {
        const r = pill.getBoundingClientRect();
        pr = [r.left, r.top, r.right, r.bottom];
        // where it is LAID OUT, transforms aside: (i)'s "does not ride him" is
        // about position, and a rect caught inside the badge's own entrance
        // pop (a scale) would read as movement on a fast enough renderer
        po = [pill.offsetLeft, pill.offsetTop];
        hud = window.__nsHud();
        if (fb && fb.on) hit = r.left < fb.right && r.right > fb.left && r.top < fb.bottom && r.bottom > fb.top;
      }
    }
    L.fr.push({ t: s.t ?? 0, eaten: s.eaten ?? 0, combo: s.combo, fever: s.fever ?? 1, pv, ptxt, ptier, hit,
      pr, po, hud, W: innerWidth, H: innerHeight });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

// ── WHERE THE BADGE STANDS, AGAINST WHAT IT MUST CLEAR ─────────────────────
// One rule for (i) and (j), so the per-frame reading and the three-phone
// reading cannot disagree about what "a top corner" means.
const cornerFaults = (pr, hud, W, H) => {
  const out = [];
  if (!pr) return ['not on screen'];
  const [l, t, r, bt] = pr;
  const cx = (l + r) / 2, cy = (t + bt) / 2;
  if (cy > 0.1 * H) out.push(`centre ${cy.toFixed(0)}px down (bar ${(0.1 * H).toFixed(0)})`);
  if (cx > W / 3 && cx < (2 * W) / 3) out.push(`centre ${cx.toFixed(0)}px across — the middle third`);
  if (l < 8 || t < 8 || r > W - 8 || bt > H - 8) out.push(`off the 8 px margin (${pr.map((v) => v.toFixed(0)).join(',')})`);
  for (const [k, q] of Object.entries(hud || {})) {
    if (!q) continue;
    if (l < q[2] + 4 && r > q[0] - 4 && t < q[3] + 4 && bt > q[1] - 4) out.push(`within 4 px of #${k}`);
  }
  return out;
};

const now = () => p.evaluate(() => window.__matchState().t);
const waitT = async (t) => { await p.waitForFunction((x) => window.__matchState().t >= x, t, { timeout: 900000, polling: 100 }); };

// ── (j) THREE PHONES, ONE LIVE CHAIN ────────────────────────────────────────
// The badge is read on the live page resized mid-chain, not on three fresh
// matches: a chain is minutes of wall clock to build here, and what (j) asks —
// where the corner is at each width — is a question for the stylesheet the
// badge is laid out by, not for the chain. The goal chip is display:none on a
// match nobody chose a dot for, so it is put up for the one synchronous read
// (no frame can be drawn inside an evaluate) with a long value in it, and put
// back exactly as it was.
const VIEWS = [[430, 932], [390, 844], [360, 780]];
const readPhones = async () => {
  const out = [];
  for (const [w, h] of VIEWS) {
    await p.setViewportSize({ width: w, height: h });
    out.push(await p.evaluate(() => {
      const pill = document.getElementById('noms');
      const cs = getComputedStyle(pill);
      const on = cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.05;
      const g = document.getElementById('goal');
      const gl = g && g.querySelector('.gLabel'), gv = g && g.querySelector('.gVal');
      const was = g ? { hidden: g.hidden, l: gl ? gl.textContent : null, v: gv ? gv.textContent : null } : null;
      if (g && was.hidden) { g.hidden = false; if (gl) gl.textContent = 'EAT'; if (gv) gv.textContent = '12,345 / 30,000'; }
      const r = pill.getBoundingClientRect();
      const hud = window.__nsHud();
      if (g && was.hidden) { g.hidden = true; if (gl) gl.textContent = was.l; if (gv) gv.textContent = was.v; }
      return { on, pr: on ? [r.left, r.top, r.right, r.bottom] : null, hud, W: innerWidth, H: innerHeight,
        combo: window.__matchState().combo, txt: (pill.textContent || '').trim() };
    }));
  }
  await p.setViewportSize({ width: 430, height: 932 });
  return out;
};

// ── THE SPREE ───────────────────────────────────────────────────────────────
const t0 = await now();
const meals = [];
let phones = null;
for (let i = 0; i < BITES; i++) {
  await waitT(t0 + i * GAP);
  const got = await p.evaluate((rel) => window.__eatNearest(rel) ?? window.__eatNearest(0.1), BIG_AT.has(i) ? 0.55 : 0.1);
  meals.push(got);
  if (i === 11) {
    phones = await readPhones();
    if (SHOT) {
      // one frame at 430x932 again before the picture, so the canvas is not
      // the last size's frame stretched
      const tc = await p.evaluate(() => window.__matchState().tClock);
      await p.waitForFunction((x) => window.__matchState().tClock > x, tc, { timeout: 600000, polling: 100 });
      await p.screenshot({ path: SHOT });
    }
  }
}
const spreeEnd = await now();
const hasCombo = await p.evaluate(() => typeof window.__matchState().combo === 'number');
// …then let the chain lapse on its own. A build that reports the chain waits
// for it to hit zero (the void keeps eating whatever drifts into reach, and
// those bites are links too); one that does not gets the spec's two seconds.
if (hasCombo) {
  await p.waitForFunction(() => window.__matchState().combo === 0, null, { timeout: 900000, polling: 200 });
  await waitT((await now()) + 2.0);
} else {
  await waitT(spreeEnd + 2.0);
}
const chainOver = await now();

// ── THE BEAT ────────────────────────────────────────────────────────────────
// Through the game's own schedule: the next unfired beat's `at` is pulled to
// the present, so the SAME code path that opens a beat in a real match opens
// this one. Its colour is read from the beat itself.
const beat = await p.evaluate(() => {
  const bt = (window.__beats || []).find((x) => !x.fired);
  if (!bt) return null;
  bt.at = 0;
  return { title: bt.title, col: bt.col };
});
let beatFrom = null;
if (beat) {
  await p.waitForFunction((title) => (window.__beats || []).some((x) => x.title === title && x.fired),
    beat.title, { timeout: 900000, polling: 200 });
  beatFrom = await now();
  for (let i = 0; i < 3; i++) {
    await waitT(beatFrom + 0.3 + i * GAP);
    await p.evaluate(() => window.__eatNearest(0.1));
  }
  await waitT(beatFrom + 0.3 + 3 * GAP + 1.2);
}

const L = await p.evaluate(() => window.__ns);
const alog = await p.evaluate(() => (window.__audioLog ? window.__audioLog() : null));
await b.close();

// ── GRADING ─────────────────────────────────────────────────────────────────
const f = L.f, fr = L.fr;
const inChain = (r) => r.t >= t0 - 0.05 && r.t <= chainOver;
const PLUS = /^\+[\d,]+$/;
// A RISING floater is one that wears `go`: float() writes the class and adds
// `go` in the same call. A LANDED flight has its class reset to bare 'vf' with
// its text still on it, and that write passes through the same setter — the
// first run of this probe counted every landing as a per-bite number (10 for
// 10 flights). `go` is read in the microtask, after the raise has finished.
const perBite = f.filter((r) => inChain(r) && !r.fly && r.go && PLUS.test(r.text));
const decimal = f.filter((r) => r.go && /COMBO\s*[×x]\s*\d+\.\d/i.test(r.text));
const flights = f.filter((r) => inChain(r) && r.fly && PLUS.test(r.text) && r.fs > 0);
const crowns = f.filter((r) => inChain(r) && r.go && /^(\d+) NOMS!$/i.test(r.text));
const cashins = f.filter((r) => inChain(r) && r.go && /^(\d+) NOMS! \+[\d,]+$/i.test(r.text));

// the chain, from the game's own count when it reports one
const chainFrames = fr.filter((x) => x.t >= t0 - 0.05 && x.t <= chainOver);
const peak = hasCombo ? Math.max(0, ...chainFrames.map((x) => x.combo || 0)) : BITES;
let lastBite = spreeEnd;
for (let i = 1; i < chainFrames.length; i++) if (chainFrames[i].eaten > chainFrames[i - 1].eaten) lastBite = chainFrames[i].t;
if (hasCombo) {
  // the chain's last link is the last bite before the count fell to zero
  const lapse = chainFrames.findIndex((x, i) => i > 0 && x.combo === 0 && chainFrames[i - 1].combo > 0);
  if (lapse > 0) {
    for (let i = lapse; i > 0; i--) if (chainFrames[i].eaten > chainFrames[i - 1].eaten) { lastBite = chainFrames[i].t; break; }
  }
}

console.log(`\n  NOM STREAM — ${WORLD} on :${PORT}\n`);
console.log(`  ·    spree: ${meals.filter(Boolean).length}/${BITES} bites landed, t ${t0.toFixed(2)} → ${spreeEnd.toFixed(2)}; `
  + `chain ${hasCombo ? `peaked at ${peak}` : 'not reported by this build'}, last bite t=${lastBite.toFixed(2)}`);
console.log(`  ·    floaters raised in the chain window: ${f.filter(inChain).length}  `
  + `(${perBite.length} per-bite '+N', ${flights.length} flights, ${crowns.length} crowns, ${cashins.length} cash-ins, ${decimal.length} decimal)`);

let bad = 0;
const bar = (ok, id, msg) => { console.log(`  ${ok ? 'ok  ' : 'BAD '} (${id}) ${msg}`); if (!ok) bad++; };

bar(perBite.length === 0, 'a', perBite.length === 0
  ? 'no per-bite number rises off a prop — the flight into the bar is the one stream'
  : `${perBite.length} per-bite '+N' floaters rose off props on top of the flights (first: ${perBite.slice(0, 5).map((r) => r.text).join(' ')})`);
bar(decimal.length === 0, 'b', decimal.length === 0
  ? 'no decimal combo floater'
  : `${decimal.length} decimal combo floater(s): ${[...new Set(decimal.map((r) => r.text))].join(', ')}`);

if (flights.length >= 2) {
  const fsz = flights.map((r) => r.fs);
  const lo = Math.min(...fsz), hi = Math.max(...fsz);
  const pts = flights.map((r) => Number(r.text.replace(/[^\d]/g, '')));
  console.log(`  ·    the flights in order: ${flights.map((r) => `${r.text} ${r.fs.toFixed(1)}px`).join(', ')}`);
  bar(hi / lo >= 1.4, 'c', `flying numbers ${lo.toFixed(1)}px → ${hi.toFixed(1)}px = ${(hi / lo).toFixed(2)}x across banks of `
    + `${Math.min(...pts).toLocaleString()} → ${Math.max(...pts).toLocaleString()} (bar 1.4x)`);
} else bar(false, 'c', `only ${flights.length} flight(s) seen — nothing to size`);

const wantCrowns = [];
for (let k = 10; k <= peak; k += 10) wantCrowns.push(k);
const gotCrowns = crowns.map((r) => Number(r.text.match(/^(\d+)/)[1]));
bar(wantCrowns.length > 0 && JSON.stringify(gotCrowns) === JSON.stringify(wantCrowns), 'd',
  `crowns ${gotCrowns.length ? gotCrowns.join(', ') : 'none'} for a chain that reached ${peak} (want ${wantCrowns.join(', ') || '—'})`);

{
  const ok1 = cashins.length === 1;
  const c = cashins[0];
  const dt = c ? c.t - lastBite : NaN;
  const n = c ? Number(c.text.match(/^(\d+)/)[1]) : NaN;
  const okT = c && dt >= 0 && dt <= 1.8;
  const okN = !hasCombo || n === peak;
  bar(ok1 && okT && okN, 'e', c
    ? `${cashins.length} cash-in(s): "${c.text}" ${dt.toFixed(2)} s after the last bite (bar ≤ 1.8), naming ${n} for a chain of ${peak}`
    : 'no cash-in when the chain lapsed — the chain ended in silence');
}

if (hasCombo) {
  const live = chainFrames.filter((x) => (x.combo || 0) >= 5);
  const off = chainFrames.filter((x, i) => (x.combo || 0) < 5 && i > 0 && (chainFrames[i - 1].combo || 0) < 5);
  const shown = live.filter((x) => x.pv);
  const said = shown.filter((x) => (x.ptxt.match(/(\d+)/) || [])[1] === String(x.combo));
  const tierOf = (n) => (n >= 20 ? '3' : n >= 10 ? '2' : '1');
  const tiered = shown.filter((x) => x.ptier === tierOf(x.combo));
  const stray = off.filter((x) => x.pv);
  const face = chainFrames.filter((x) => x.hit);
  const share = live.length ? shown.length / live.length : 0;
  bar(live.length > 0 && share >= 0.9 && said.length >= shown.length * 0.9 && tiered.length >= shown.length * 0.9
      && stray.length === 0 && face.length === 0, 'f',
    `pill up on ${shown.length}/${live.length} chain-5+ frames (bar 90%), right count on ${said.length}, right tier on ${tiered.length}, `
    + `up below 5 on ${stray.length}, over his face on ${face.length}`);
} else bar(false, 'f', 'this build does not report the chain, so there is no pill to grade');

{
  const lines = alog || [];
  const aCrown = lines.filter((s) => /\bcrown \d+/.test(s)).length;
  const aCash = lines.filter((s) => /\bcashin \d+/.test(s)).length;
  bar(alog !== null && aCrown === gotCrowns.length && aCrown > 0 && aCash === cashins.length && aCash === 1, 'g',
    alog === null ? 'this build has no audio log — the chain makes no sound of its own'
      : `audio logged ${aCrown} crown(s) and ${aCash} cash-in(s) for ${gotCrowns.length} and ${cashins.length} on screen`);
}

if (beat) {
  const beatCol = `rgb(${(beat.col >> 16) & 255}, ${(beat.col >> 8) & 255}, ${beat.col & 255})`;
  const own = new Set(flights.map((r) => r.col));   // the chain's flights, before the beat
  const after = f.filter((r) => r.t >= beatFrom && r.fly && PLUS.test(r.text) && r.col);
  const painted = after.filter((r) => r.col === beatCol || !own.has(r.col));
  const badged = fr.filter((x) => x.t >= beatFrom && /×\d/.test(x.ptxt || ''));
  bar(after.length > 0 && own.size > 0 && painted.length === 0 && badged.length === 0, 'h', after.length
    ? `${after.length - painted.length}/${after.length} flights after "${beat.title}" wore the chain's own colour (${[...own].join(', ')}; the beat's is ${beatCol}, seen ${[...new Set(after.map((r) => r.col))].join(', ')}), ${badged.length} pill frame(s) carried ×N`
    : `no flight landed after "${beat.title}" — nothing to read`);
} else bar(false, 'h', 'no unfired beat left to force');

if (hasCombo) {
  const shownR = chainFrames.filter((x) => x.pv && x.pr);
  const faults = [];
  const first = new Map();
  let drift = 0;
  for (const x of shownR) {
    const k = `${x.W}x${x.H}`;
    const at0 = x.po || x.pr;
    if (!first.has(k)) first.set(k, at0);
    const f0 = first.get(k);
    drift = Math.max(drift, Math.abs(at0[0] - f0[0]), Math.abs(at0[1] - f0[1]));
    const fl = cornerFaults(x.pr, x.hud, x.W, x.H);
    if (fl.length) faults.push({ t: x.t, n: x.combo, fl });
  }
  const at = shownR.length ? shownR[0].pr.map((v) => v.toFixed(0)).join(',') : '—';
  bar(shownR.length > 0 && faults.length === 0 && drift <= 1, 'i', shownR.length
    ? `badge in a top corner on ${shownR.length - faults.length}/${shownR.length} frames it was up (first at ${at}), moved ${drift.toFixed(1)}px (bar 1)`
      + (faults.length ? ` — e.g. chain ${faults[0].n}: ${faults[0].fl.join('; ')}` : '')
    : 'the badge was never up, so there is no corner to grade');
}

{
  const rows = phones || [];
  const bits = [];
  let nbad = rows.length === VIEWS.length ? 0 : 1;
  for (const r of rows) {
    const fl = r.on ? cornerFaults(r.pr, r.hud, r.W, r.H) : [`not up (chain ${r.combo})`];
    if (!r.hud || !r.hud.goal) fl.push('the goal chip could not be put up to measure against');
    if (fl.length) nbad++;
    const room = r.pr && r.hud && r.hud.timer ? (r.pr[0] < r.hud.timer[0] ? r.hud.timer[0] - r.pr[2] : r.pr[0] - r.hud.timer[2]) : NaN;
    const below = r.pr && r.hud && r.hud.goal ? r.hud.goal[1] - r.pr[3] : NaN;
    bits.push(`${r.W}x${r.H} "${r.txt}" ${fl.length ? 'BAD: ' + fl.join('; ') : `ok, ${room.toFixed(0)}px to the clock, ${below.toFixed(0)}px above the goal chip`}`);
  }
  bar(nbad === 0, 'j', rows.length ? bits.join(' · ') : 'the three-phone read never ran');
}

console.log(bad ? `\nFAIL — ${bad} of 10 bar(s)` : '\nPASS — one stream, a chain she can see in its corner, and a cash-in when it ends');
process.exit(bad ? 1 : 0);
