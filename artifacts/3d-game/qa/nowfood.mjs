// "NOW I CAN EAT THAT!" — is the moment a threat becomes food heard and seen?
//
//   node qa/nowfood.mjs [port] [world] [--only=k,a,b,c]
//
// Found by the 2026-09-23 research governor (G7). The instant something that
// was too big becomes food is the genre's central rush, and here it was
// silent three times over:
//   · a SIBLING the player outgrows: rivals.ts turns its ground halo green on
//     `pr > rv.r * 1.2` and does nothing else — no callback, no float, no
//     sound, in the second after it turns green or ever;
//   · a WAVE of greyed props that turn back to colour when the player grows
//     through their size: the un-gate pass restores every colour on one 0.4 s
//     tick, all at once, in silence;
//   · a BUMP into a prop that is still too big: the prop shakes (shakeT 0 ->
//     0.45) and nothing sounds, so a pre-reader who cannot use the guide lines
//     has no way to hear the size rule she meets from the first touch.
//
// THE DRIVE, each part on its own page and on the GAME's clocks
// (__matchState().t and tClock — under this software renderer the match
// clock runs about 14x slower than the wall, so nothing here waits on wall
// time), and one that needs no page at all:
//
//   (k) the source itself, in node: the kind table the class float names a
//       wave from, against every kind tag the island writes. It reads ./src
//       of the CWD — a preview server cannot be asked for its source — so run
//       this probe from the tree the build under test was made from.
//   (a) r 2 (__setVoidR). Every sibling is pulled onto the island at once by
//       __setRivalScores, which moves each one's joinAt into the past so the
//       real arrival code places and sizes it: NIBBLES arrives at 1.18x the
//       player and the rest arrive SMALLER than her 1.2x line. The clock is
//       then rushed to 75% of the match, past the hunt (55%) and past the surge
//       window (55-72%), so NIBBLES is stuffed at whatever she reached and no
//       sibling can grow back over the line. Then __eatNearest, one bite a
//       frame, until the void is past 1.2x NIBBLES, and two seconds of tClock
//       with no eating to catch a late or repeated cue. On the frame the void
//       first passes her line the form-name callout goes up (__formCall), so
//       the float she earns is raised under a live callout.
//       Then a SECOND page, set up the same way to the end of her hunt, where
//       the void is put down on NIBBLES and set past her line in one step, so
//       the frame that first sees the crossing swallows her; it is watched
//       until 1.5 s of tClock after she is back on the island, tiny.
//   (b) The goal card is let finish; the void is put down on bare land
//       beside the biggest cluster of TAGGED static props over r 2 and set
//       just under that cluster's smallest member (see below for why both),
//       and then:
//         1. __forceEvolve() — an EVOLVED card, through the real ceremony;
//         2. at once, __setVoidR through the smallest wave that frees a
//            tagged prop — a tagged wave inside 1.5 s of that card;
//         3. once 1.6 s of tClock have passed since the card, the same again
//            — the governor's "grow through r 2.5", read off the island
//            rather than a fixed radius (see `target` below);
//         4. the smallest wave of any kind — a second wave, 0.6 s after the third.
//       Every frame the props' own `gated` flags are diffed, so the waves are
//       seen from the props rather than taken on the game's word, and every
//       prop that flips is watched until its material's colour is back to its
//       own base colour.
//   (c) the spawn radius. The nearest static prop clearly too big for the spawn void is
//       picked and the void is put down on it (__warpVoid) — first contact,
//       the prop's own shakeT edge — and left sitting inside it for 1.5 s.
//
// THE BARS
//   (k1) every kind tag the source writes (as `.qk = '...'`, or as the kind
//        argument of the island's drop() and plant()) has a KIND_WORD entry or
//        is one kindWord() handles by name — a tag with none goes to the
//        generic line exactly as a deliberate `null` does, so the omission is
//        silent
//   (a1) exactly ONE outgrown cue (__outgrownN), and it is NIBBLES's
//   (a2) exactly one 'outgrow' in the audio call log and exactly one float
//        naming NIBBLES, both inside the second of tClock after the first frame
//        the void was over 1.2x her radius — the governor's own words, "nothing
//        floats or sounds in the second after it turns green". Not sooner than
//        that frame; and a cue confirmed over 1.4 s, the governor's hysteresis
//        applied to the rising edge too, would miss it
//   (a3) NOTHING for a sibling who joined already smaller: no float names one
//   (a4) the float never covers his face (bubbles' own face box, __formBox)
//        and never covers the NOMS pill, at any visible pose of its rise on any
//        frame it is up — and at least one pose is seen, or there was nothing
//        to measure. Poses, not frames: see the sampler for why
//   (a5) a sibling EATEN on the frame she crosses the line is not announced:
//        no cue, no 'outgrow', no BIGGER THAN float from the step through her
//        respawn and 1.5 s after it. Found by review on the first fix: the
//        eat branch runs before the latch and skips it, the dying and respawn
//        branches skip it too, so the latch never saw the crossing — and she
//        came back tiny, the player past her line, and was announced then
//   (a6) the float never covers the form-name callout at any visible pose,
//        graded against every visible point of the callout's path (the
//        interface promises a head float clears it) — and at least one pose
//        is seen while the callout is up
//   (b1) each of the three steps un-greyed a wave, read off the props: 8 or
//        more in one tick, or a non-mover over r 2 — the precondition
//   (b2) the game counted the same number of waves the props showed
//   (b3) exactly one class float ('<KIND> ARE FOOD NOW!' in capitals) over the
//        whole drive, raised on the first tagged wave clear of the card's 1.5 s
//        (read off the props — normally step 3), silent on the tagged wave(s)
//        inside it (step 2), and not twice
//   (b4) the glock sparkle is heard on a wave, never twice inside 3 s of
//        tClock, and not inside 1.5 s of the card
//   (b5) the colour ROLLS OUTWARD on the wave the name was due on: sorted by distance from
//        the void, restore times never go backwards by more than a frame, and
//        the farthest prop is restored at least (spread / 60 - 0.1) s after
//        the nearest — the colour travels at 60 units a second
//   (b6) the class float, like (a4): never on his face or the pill, at any pose
//   (c1) exactly one 'bonk' within 100 ms of tClock of first contact
//   (c2) no second bonk for the 1.5 s the void sits inside it — a nag every
//        shake would be the ring mistake again (see the wall cue's note)
//   (c3) the shore's own counter did not move: the bonk is the prop's
//
// NOT MEASURED HERE: the end beat. No new cue may fire while endBeat() is true
// or in the outro; qa/endbeat.mjs and qa/endparty.mjs hold that end. And the
// ring census is qa/ringcount.mjs's: this change adds no ring, and its AWAY
// share is read on both builds, not asserted here.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { enterMatch } from './_enter.mjs';

const POS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const PORT = POS[0] || '4177', WORLD = POS[1] || 'maple';
// --only=a,c runs just those parts (each is its own page, and (k) needs none)
// — for working on one of them; the gate runs all four
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '--only=k,a,b,c').slice(7).split(',');
const OUT_RE = /BIGGER THAN/i, CLASS_RE = /ARE FOOD NOW/i;

const die = (m) => { console.log(`FAIL — ${m}`); process.exit(1); };
process.on('uncaughtException', (e) => die(`threw: ${String((e && e.message) || e).split('\n')[0]}`));
process.on('unhandledRejection', (e) => die(`rejected: ${String((e && e.message) || e).split('\n')[0]}`));

// launched on the first page a part asks for: (k) alone runs in node, no page
let b = null;
const browser = async () => (b ??= await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] }));

let bad = 0, bars = 0;
const bar = (ok, id, msg) => { bars++; console.log(`  ${ok ? 'ok  ' : 'BAD '} (${id}) ${msg}`); if (!ok) bad++; };
const tc = (p) => p.evaluate(() => window.__matchState().tClock);
/** wait until tClock has advanced `s` past `from` (default: now) */
async function waitT(p, s, from) {
  const t0 = from ?? await tc(p);
  await p.waitForFunction((x) => window.__matchState().tClock >= x, t0 + s, { timeout: 900000, polling: 200 });
}

async function open(r0) {
  const p = await (await browser()).newPage({ viewport: { width: 430, height: 932 } });
  p.on('pageerror', (e) => console.log('  PAGEERR ' + String(e).slice(0, 160)));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidFirstNom', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
  } catch { /* private mode */ } });
  // NOT ?r=: that is a DEBUG_HARNESS flag, and a harness match self-drives in
  // attract mode four seconds after the last input (prototype3d.ts, the wander
  // branch) — a void that drives itself off the prop it was put on, and eats
  // what it likes on the way. A real match never self-drives, so this plays
  // one and sets the radius with __setVoidR, which also holds the growth law
  // off it, exactly as qa/bitetime.mjs does.
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await enterMatch(p, WORLD);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 900000, polling: 250 });
  const miss = await p.evaluate(() => ['__matchState', '__audioCalls', '__eatNearest', '__setRivalScores', '__rushClock',
    '__setVoidR', '__forceEvolve', '__stages', '__formBox', '__warpVoid', '__wallCues', '__outgrownN', '__ungateWaveN', '__goalPools', '__solidAt']
    .filter((k) => typeof window[k] !== 'function').concat(Array.isArray(window.__edibles) ? [] : ['__edibles']));
  if (miss.length) die(`this build has no ${miss.join(', ')} — nothing here can be measured without ${miss.length > 1 ? 'them' : 'it'}`);
  if (r0) {
    await p.evaluate((x) => window.__setVoidR(x), r0);
    await waitT(p, 0.9);   // two gate ticks at the new radius: what is too big is grey now
  }
  // THE FLOAT LOG. Every floater is one of the pooled '.vf' nodes and each
  // raise writes its className after its text (bubbles.ts), so an own-property
  // setter on each node fires once per raise, inline, with the game's clock.
  // And a per-frame sampler grades every visible float this probe cares about
  // against the face box bubbles.ts itself dodges and against the NOMS pill.
  await p.evaluate(([outSrc, clsSrc]) => {
    const OUT = new RegExp(outSrc, 'i'), CLS = new RegExp(clsSrc, 'i');
    const L = window.__nf = { raises: [], frames: 0, face: 0, pill: 0, off: 0, worst: null, formFrames: 0, form: 0, formWorst: null };
    const d = Object.getOwnPropertyDescriptor(Element.prototype, 'className');
    document.querySelectorAll('.vf').forEach((el) => {
      Object.defineProperty(el, 'className', {
        configurable: true,
        get() { return d.get.call(this); },
        set(v) {
          d.set.call(this, v);
          const text = (this.textContent || '').trim();
          if (!text || !/\bvf\b/.test(v) || /\bfly\b/.test(v)) return;
          const ms = window.__matchState();
          L.raises.push({ text, tc: ms.tClock, t: ms.t });
        },
      });
    });
    const inter = (a, b2) => a.left < b2.right && a.right > b2.left && a.top < b2.bottom && a.bottom > b2.top;
    const tick = () => {
      try {
        for (const el of document.querySelectorAll('.vf')) {
          const text = el.textContent || '';
          if (!OUT.test(text) && !CLS.test(text)) continue;
          if (!el.classList.contains('go')) continue;
          // ── THE WHOLE RISE, NOT ONE INSTANT OF IT ─────────────────────────
          // vfRise runs on the WALL clock and this box draws a frame every
          // second or so, so the rise is over inside one or two frames and a
          // per-frame read catches one pose of it, or none. So on every frame
          // the float is up, its own CSS animation is stepped through its own
          // duration (read off the animation, not copied from the stylesheet)
          // and every visible pose is graded against the face box and the pill
          // as they stand on that frame; then it is put back where it was.
          const fb = window.__formBox();
          const noms = document.getElementById('noms');
          const nr = noms && noms.classList.contains('on') ? noms.getBoundingClientRect() : null;
          // ── …AND THE FORM-NAME CALLOUT'S WHOLE PATH, WHEN IT IS UP ─────────
          // The callout rides him on the bubbles' own clock and this float on
          // the wall clock, so no pose of one can be paired with a pose of the
          // other. The callout is graded as its PATH instead: every point of
          // its life that is visible (opacity over 0.05), placed by the game's
          // own geometry (__formSweep, against this frame's face box) as the
          // box its unscaled self would fill — its bottom edge at y and its
          // own layout height above that. The scaled box (transform-origin at
          // its bottom centre) is always inside that one.
          const formEl = document.getElementById('form');
          const path = [];
          if (formEl && formEl.classList.contains('on') && fb.on) {
            const w = formEl.offsetWidth, h = formEl.offsetHeight;
            for (let i = 0; i <= 50; i++) {
              const f = window.__formSweep(i / 50);
              if (f && f.o > 0.05) path.push({ left: f.x - w / 2, right: f.x + w / 2, top: f.y - h, bottom: f.y, a: i / 50 });
            }
          }
          const an = (el.getAnimations ? el.getAnimations() : [])[0];
          const dur = an ? Number(an.effect.getTiming().duration) || 0 : 0;
          const keep = an ? an.currentTime : null;
          const poses = an && dur ? 12 : 1;
          for (let k = 0; k < poses; k++) {
            if (an && dur) an.currentTime = (k / (poses - 1)) * dur;
            if (Number(getComputedStyle(el).opacity) <= 0.05) continue;
            const r = el.getBoundingClientRect();
            L.frames++;
            if (fb.on && inter(r, fb)) { L.face++; L.worst = L.worst ?? { text, pose: k, r: [r.left, r.top, r.right, r.bottom].map(Math.round), fb: [fb.left, fb.top, fb.right, fb.bottom].map(Math.round) }; }
            if (nr && nr.width && inter(r, nr)) L.pill++;
            if (r.left < 0 || r.right > innerWidth || r.top < 0) L.off++;
            if (path.length) {
              L.formFrames++;
              const hit = path.find((q) => inter(r, q));
              if (hit) {
                L.form++;
                L.formWorst = L.formWorst ?? { text, pose: k, r: [r.left, r.top, r.right, r.bottom].map(Math.round),
                  callout: [hit.left, hit.top, hit.right, hit.bottom].map(Math.round), a: hit.a };
              }
            }
          }
          if (an && keep !== null) an.currentTime = keep;
        }
      } catch (err) { L.err = String((err && err.message) || err); }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [OUT_RE.source, CLASS_RE.source]);
  return p;
}
const calls = (p, from) => p.evaluate((x) => window.__audioCalls().filter((c) => c.t >= x), from);

console.log(`\n  NOW I CAN EAT THAT — ${WORLD} on :${PORT}\n`);

// ══ (k) EVERY KIND HAS A WORD, OR IS GENERIC ON PURPOSE ══════════════════════
// kindWord() sends a tag it has no entry for to the generic line — the same
// place a tag deliberately listed as `null` goes — so a missing entry is
// silent: the wave is named "BIGGER THINGS" and nothing says why. Read off
// the source, not a copy: KIND_WORD's keys and the tags kindWord() tests by
// name, against every tag the source writes as a literal, through the three
// routes it uses — `.qk = '<tag>'`, and the kind argument of the island's
// drop() and plant() placements. A route that finds nothing is an abort,
// not a pass: the call sites have moved and this bar would be blind.
if (ONLY.includes('k')) {
  const SRC = join(process.cwd(), 'src');
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith('.ts') ? [join(d, e.name)] : []));
  const files = walk(SRC);
  const proto = readFileSync(join(SRC, 'prototype3d.ts'), 'utf8');
  const tbl = proto.match(/const KIND_WORD: Record<string, string \| null> = \{([\s\S]*?)\n\};/);
  const fn = proto.match(/function kindWord\(e: Edible\)[^{]*\{([\s\S]*?)\n\}/);
  if (!tbl || !fn) die(`(k1) ${!tbl ? 'KIND_WORD' : 'kindWord()'} is not where prototype3d.ts had it — the kind table cannot be read`);
  const keys = new Set([...tbl[1].matchAll(/(\w+)\s*:/g)].map((m) => m[1]));
  const named = new Set([...fn[1].matchAll(/qk === '([\w-]+)'/g)].map((m) => m[1]));
  const routes = {
    assign: /\.qk\s*=\s*'([\w-]+)'/g,
    drop: /\bdrop\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*?,\s*'([\w-]+)'\s*(?:,\s*[^,()']+)?\)/g,
    plant: /\bplant\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*?,\s*'([\w-]+)'\s*(?:,\s*[^,()']+)?\)/g,
  };
  const tags = new Map();   // tag -> first file:line it is written at
  const perRoute = {};
  for (const f of files) {
    const s = readFileSync(f, 'utf8');
    for (const [k, re] of Object.entries(routes)) {
      for (const m of s.matchAll(re)) {
        perRoute[k] = (perRoute[k] ?? 0) + 1;
        if (!tags.has(m[1])) tags.set(m[1], `${f.slice(SRC.length + 1)}:${s.slice(0, m.index).split('\n').length}`);
      }
    }
  }
  const blind = Object.keys(routes).filter((k) => !perRoute[k]);
  if (blind.length) die(`(k1) no kind tag found through ${blind.join(', ')} — the call sites have moved and the census would be blind`);
  const miss = [...tags].filter(([t]) => !keys.has(t) && !named.has(t));
  console.log(`  ·   (k1) ${tags.size} kind tags written (${Object.entries(perRoute).map(([k, n]) => `${k} ${n}`).join(', ')}); KIND_WORD has ${keys.size}, kindWord() names ${[...named].join(', ')}`);
  bar(!miss.length, 'k1', miss.length ? `tag(s) with no entry, so their wave is named generically by omission: ${miss.map(([t, at]) => `'${t}' (${at})`).join(', ')}`
    : 'every kind tag the island writes has a word, or is listed as generic on purpose');
}

// ══ (a) THE SIBLING WHO BECOMES FOOD ═════════════════════════════════════════
if (ONLY.includes('a')) {
  const p = await open(2);
  await p.evaluate(() => window.__setRivalScores([]));
  await p.waitForFunction(() => { const ms = window.__matchState(); return ms.rivals.length > 0 && ms.rivals.every((r) => r.joined); },
    null, { timeout: 900000, polling: 200 });
  const join = await p.evaluate(() => {
    const ms = window.__matchState();
    return { R: ms.r, rivals: ms.rivals.map((r) => ({ name: r.name, r: r.r, arch: r.arch, smaller: ms.r > r.r * 1.2 })) };
  });
  const nib = join.rivals.find((r) => r.name === 'NIBBLES');
  if (!nib) die('NIBBLES is not in the cast — rivals.ts promises she is always at the table');
  if (nib.smaller) die(`NIBBLES joined already smaller than the player (r ${nib.r.toFixed(2)} vs R ${join.R.toFixed(2)}) — there is no crossing to test`);
  const smaller = join.rivals.filter((r) => r.smaller).map((r) => r.name);
  // past the hunt and past the surge window: nobody grows back over the line
  await p.evaluate(() => { const ms = window.__matchState(); window.__rushClock((ms.t + ms.clock) * 0.25); });
  await p.waitForFunction(() => !window.__matchState().rivals.find((r) => r.name === 'NIBBLES').hunt, null, { timeout: 900000, polling: 200 });
  // the crossing, read every frame off the game's own radii — and on that
  // frame the form-name callout goes up (__formCall, the qa/formcall.mjs
  // route), so the float is raised under a live callout: growth drives both,
  // and the bite that takes her past NIBBLES can be the bite that evolves her
  await p.evaluate(() => {
    const X = window.__nfx = { rows: 0, cross: null };
    const tick = () => {
      const ms = window.__matchState();
      const n = ms.rivals.find((r) => r.name === 'NIBBLES');
      X.rows++;
      if (!X.cross && n && ms.r > n.r * 1.2) {
        X.cross = { tc: ms.tClock, R: ms.r, rN: n.r };
        window.__formCall('CHOMPOSAURUS');
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const t0 = await tc(p);
  const outN0 = await p.evaluate(() => window.__outgrownN());
  let crossed = null;
  for (let i = 0; i < 400 && !crossed; i++) {
    const t = await tc(p);
    await p.waitForFunction((x) => window.__matchState().tClock > x, t, { timeout: 600000, polling: 100 });
    crossed = await p.evaluate(() => {
      const ms = window.__matchState(), n = ms.rivals.find((r) => r.name === 'NIBBLES');
      if (ms.r > n.r * 1.2 * 1.02) return { R: ms.r, rN: n.r };
      window.__eatNearest(0.2);
      return null;
    });
  }
  if (!crossed) die('400 bites and the void never got past 1.2x NIBBLES — nothing to test');
  await waitT(p, 2.0);
  const X = await p.evaluate(() => window.__nfx);
  const L = await p.evaluate(() => window.__nf);
  const cs = await calls(p, t0);
  const outN = await p.evaluate(() => window.__outgrownN()) - outN0;
  await p.close();
  if (!X.cross) die('the sampler never saw the crossing it was built to time');
  const outs = cs.filter((c) => c.id === 'outgrow');
  const fl = L.raises.filter((r) => r.tc >= t0 && OUT_RE.test(r.text));
  const flN = fl.filter((r) => /NIBBLES/i.test(r.text));
  const flSib = fl.filter((r) => smaller.some((s) => new RegExp(s, 'i').test(r.text)));
  const near = (t) => t >= X.cross.tc - 0.06 && t <= X.cross.tc + 1.0;
  console.log(`  ·    (a) R ${join.R.toFixed(2)} at the join; NIBBLES r ${nib.r.toFixed(2)}; joined smaller: ${smaller.join(', ') || 'nobody'}`);
  console.log(`  ·        crossed 1.2x at tClock ${X.cross.tc.toFixed(2)} (R ${X.cross.R.toFixed(2)} over NIBBLES ${X.cross.rN.toFixed(2)}); `
    + `cues ${outN}; outgrow calls ${outs.map((c) => c.t.toFixed(2)).join(' ') || 'none'}; floats ${fl.map((r) => `"${r.text}" @${r.tc.toFixed(2)}`).join(' ') || 'none'}`);
  bar(outN === 1, 'a1', outN === 1 ? 'exactly one outgrown cue' : `${outN} outgrown cue(s) — the halo turned green and ${outN ? 'the game said so more than once' : 'nothing answered it'}`);
  bar(outs.length === 1 && flN.length === 1 && near(outs[0].t) && near(flN[0].tc), 'a2',
    outs.length === 1 && flN.length === 1
      ? `one 'outgrow' (+${(outs[0].t - X.cross.tc).toFixed(2)} s) and one float naming NIBBLES (+${(flN[0].tc - X.cross.tc).toFixed(2)} s) after the crossing (bar: inside the second after it)`
      : `${outs.length} 'outgrow' call(s) and ${flN.length} float(s) naming NIBBLES from the drive to 2.0 s after the halo turned green (bar: exactly one of each)`);
  bar(!flSib.length, 'a3', flSib.length ? `a sibling who joined smaller was announced: ${flSib.map((r) => r.text).join(' | ')}`
    : `nothing for the ${smaller.length} sibling(s) who joined already smaller`);
  bar(L.frames > 0 && !L.face && !L.pill && !L.off, 'a4', !L.frames ? 'the float was never on screen to measure — face and NOMS pill untested'
    : `the float over ${L.frames} visible pose(s): on his face ${L.face}, on the NOMS pill ${L.pill}, off screen ${L.off}${L.worst ? ` — ${JSON.stringify(L.worst)}` : ''}${L.err ? ` (sampler: ${L.err})` : ''}`);
  bar(L.formFrames > 0 && !L.form, 'a6', !L.formFrames ? 'the float was never on screen while the form-name callout was up — the callout untested'
    : `the float over ${L.formFrames} visible pose(s) under a live form-name callout: on the callout's path ${L.form}${L.formWorst ? ` — ${JSON.stringify(L.formWorst)}` : ''}`);

  // ── (a5) EATEN ON THE CROSSING ─────────────────────────────────────────────
  // The likeliest way a child eats NIBBLES as the marquee meal: the gold PRIZE
  // halo shows from 1.05x, a sibling does not run until she can be swallowed,
  // so the child sits on her and takes her on the very frame she crosses the
  // 1.2x line. That meal is not news to be told later — the child just ate
  // her. Its own page, set up exactly as above (her hunt over, nobody else
  // able to cross back), and then ONE step: the void put down on her and set
  // past her line in the same evaluate, so the frame that first sees the
  // crossing is the frame that swallows her. Then graded from that step
  // until 1.5 s of tClock after she is seen back on the island — the tiny
  // respawn is where a stale cue would land — for no cue, no 'outgrow' and no
  // float naming anyone as outgrown. Her return is read off the game (her
  // position jumps from the pit to the far coast), not timed from a copied
  // respawn constant.
  {
    const q = await open(2);
    await q.evaluate(() => window.__setRivalScores([]));
    await q.waitForFunction(() => { const ms = window.__matchState(); return ms.rivals.length > 0 && ms.rivals.every((r) => r.joined); },
      null, { timeout: 900000, polling: 200 });
    await q.evaluate(() => { const ms = window.__matchState(); window.__rushClock((ms.t + ms.clock) * 0.25); });
    await q.waitForFunction(() => !window.__matchState().rivals.find((r) => r.name === 'NIBBLES').hunt, null, { timeout: 900000, polling: 200 });
    const s0 = await q.evaluate(() => {
      const ms = window.__matchState(), n = ms.rivals.find((r) => r.name === 'NIBBLES');
      return { R: ms.r, rN: n.r, eaten: ms.ev.eaten, outN: window.__outgrownN() };
    });
    if (s0.R > s0.rN * 1.2) die(`(a5) NIBBLES is already under the player's line before the step (r ${s0.rN.toFixed(2)} vs R ${s0.R.toFixed(2)}) — no crossing to take in one step`);
    // her whole story, frame by frame: the frame she goes into the pit, and
    // the frame she is back on land
    await q.evaluate((eaten0) => {
      const E = window.__nfe = { eat: null, back: null, last: null };
      const tick = () => {
        const ms = window.__matchState(), n = ms.rivals.find((r) => r.name === 'NIBBLES');
        if (!E.eat && ms.ev.eaten > eaten0) E.eat = { tc: ms.tClock, outN: window.__outgrownN() };
        if (E.eat && !E.back && E.last && Math.hypot(n.x - E.last.x, n.z - E.last.z) > 20)
          E.back = { tc: ms.tClock, R: ms.r, rN: n.r };
        E.last = { x: n.x, z: n.z };
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, s0.eaten);
    const step = await q.evaluate(() => {
      const ms = window.__matchState(), n = ms.rivals.find((r) => r.name === 'NIBBLES');
      window.__warpVoid(n.x, n.z); window.__setVoidR(n.r * 1.3);
      return { tc: ms.tClock, rN: n.r, R: n.r * 1.3 };
    });
    await q.waitForFunction((x) => !!window.__nfe.eat || window.__matchState().tClock > x, step.tc + 1.0, { timeout: 900000, polling: 100 });
    const E1 = await q.evaluate(() => window.__nfe);
    if (!E1.eat) { await q.close(); die(`(a5) the void was put down on NIBBLES at ${step.R.toFixed(2)} (her r ${step.rN.toFixed(2)}) and she was not eaten inside 1 s of tClock — the step did not happen`); }
    await q.waitForFunction(() => !!window.__nfe.back, null, { timeout: 900000, polling: 250 });
    const back = await q.evaluate(() => window.__nfe.back);
    await waitT(q, 1.5, back.tc);
    const L5 = await q.evaluate(() => window.__nf);
    const cs5 = await calls(q, step.tc);
    const outN5 = await q.evaluate(() => window.__outgrownN()) - s0.outN;
    await q.close();
    const outs5 = cs5.filter((c) => c.id === 'outgrow');
    const fl5 = L5.raises.filter((r) => r.tc >= step.tc && OUT_RE.test(r.text));
    console.log(`  ·   (a5) stepped onto NIBBLES (r ${step.rN.toFixed(2)}) at R ${step.R.toFixed(2)} at tClock ${step.tc.toFixed(2)}; eaten at ${E1.eat.tc.toFixed(2)} `
      + `with ${E1.eat.outN - s0.outN} cue(s) so far; back on the island at ${back.tc.toFixed(2)} (r ${back.rN.toFixed(2)} against R ${back.R.toFixed(2)}); `
      + `watched to ${(back.tc + 1.5).toFixed(2)}: cues ${outN5}; outgrow calls ${outs5.map((c) => c.t.toFixed(2)).join(' ') || 'none'}; floats ${fl5.map((r) => `"${r.text}" @${r.tc.toFixed(2)}`).join(' ') || 'none'}`);
    bar(!outN5 && !outs5.length && !fl5.length, 'a5', !outN5 && !outs5.length && !fl5.length
      ? 'eaten on the frame she crossed: no outgrown cue, no \'outgrow\' and no float, through her respawn and 1.5 s after it'
      : `eaten on the frame she crossed, and still announced: ${outN5} cue(s), ${outs5.length} 'outgrow' call(s), ${fl5.length} float(s) — `
        + `${fl5.concat(outs5).map((r) => `+${((r.tc ?? r.t) - back.tc).toFixed(2)} s after her respawn`).join(', ')}`);
  }
}

// ══ (b) THE WORLD LIGHTS UP ══════════════════════════════════════════════════
if (ONLY.includes('b')) {
  const p = await open(0);
  // the goal card must be finished or the EVOLVED card is not shown at all
  await p.waitForFunction(() => { const ms = window.__matchState(); return ms.tClock > ms.titleUntil + 0.2; }, null, { timeout: 900000, polling: 250 });
  // ── WHERE THE KINDS ARE, AND A PLACE TO STAND WHERE NOTHING FEEDS HIM ──────
  // Two things this part cannot leave to the spawn, both found by running it.
  //   · The gate greys only what is within reach (r x 26 + 40 units), and the
  //     island tags a KIND on few of its props — 166 of Maple's 8,593 edibles
  //     carry a `qk` (a scratch census of the unmodified build) — most of them
  //     out in the suburbs. Standing at the spawn, the first run of this probe
  //     found no tagged prop grey at all.
  //   · __setVoidR holds the growth law off the void, but not its magnet: a
  //     still void swallows whatever its well draws in. At r 2 by the spawn it
  //     reached 2.73 before the family had joined, and by then it had outgrown
  //     every tagged class on Maple (cars top out at 3.6, houses are 3.2), so
  //     there was nothing left for the class float to name.
  // So: the tagged, static props of r over 2 are clustered; the void is put
  // down on land beside the biggest cluster where nothing it could eat is
  // inside its well (the magnet reaches 2r + 2.4x the prop's radius,
  // prototype3d.ts's `reach`, and never pulls a walker), and set half a unit
  // under what that cluster's smallest member needs, so the whole class is
  // grey and waiting.
  const moved = await p.evaluate(() => {
    const er = window.__goalPools().eatRatio;
    const live = window.__edibles.filter((e) => !e.eaten && e.mesh.visible);
    const cand = live.filter((e) => e.mesh.userData.qk && !e.mesh.userData.mover && e.radius > 2);
    let best = null, bn = 0;
    for (const e of cand) {
      const n = cand.filter((o) => Math.hypot(o.mesh.position.x - e.mesh.position.x, o.mesh.position.z - e.mesh.position.z) < 50).length;
      if (n > bn) { bn = n; best = e; }
    }
    if (!best) return { err: 'no tagged static prop over r 2 on this island' };
    const near = cand.filter((o) => Math.hypot(o.mesh.position.x - best.mesh.position.x, o.mesh.position.z - best.mesh.position.z) < 50);
    const rs = Math.max(window.__voidState().r, Math.min(...near.map((o) => o.radius)) / er - 0.5);
    // what the well could draw in at rs: anything he could eat, not a walker
    // (walkers are never magnetised). Bigger props are grey and stay put.
    const food = live.filter((o) => !o.mesh.userData.mover && o.radius <= rs * er * 1.05);
    const cx = best.mesh.position.x, cz = best.mesh.position.z;
    for (let ring = 10; ring <= 90; ring += 5) {
      for (let k = 0; k < 36; k++) {
        const a = (k / 36) * Math.PI * 2 + ring * 0.13;
        const x = cx + Math.cos(a) * ring, z = cz + Math.sin(a) * ring;
        if (!window.__solidAt(x, z, rs)) continue;
        if (food.some((o) => Math.hypot(o.mesh.position.x - x, o.mesh.position.z - z) < rs * 2 + o.radius * 2.4 + 2)) continue;
        window.__warpVoid(x, z);
        window.__setVoidR(rs);
        return { qk: best.mesh.userData.qk, n: bn, rs, d: ring };
      }
    }
    return { err: `no land within 90 units of the ${best.mesh.userData.qk} cluster (${bn} props) with nothing in a void's well` };
  });
  if (moved.err) die(`${moved.err} — the class float has nothing to name here`);
  await waitT(p, 0.9);   // two gate ticks where he stands now
  const settled = await p.evaluate(() => window.__voidState().r);
  console.log(`  ·    (b) stood beside a cluster of ${moved.n} '${moved.qk}' props, ${moved.d} units off, at r ${moved.rs.toFixed(2)} (r ${settled.toFixed(2)} 0.9 s later)`);
  // THE PROPS' OWN FLAGS, every frame, and every flipped prop until its colour is back
  await p.evaluate(() => {
    const W = window.__nw = { ticks: [], watch: [] };
    const last = new Map();
    const matOf = (e) => {
      let m = null;
      e.mesh.traverse((o) => { if (!m && o.userData && o.userData.gateMat && o.userData.baseCol && o.material && o.material.color) m = o; });
      return m;
    };
    for (const e of window.__edibles) last.set(e, e.mesh.userData.gated);
    const tick = () => {
      try {
        const ms = window.__matchState(), vs = window.__voidState();
        const flips = [];
        for (const e of window.__edibles) {
          const g = e.mesh.userData.gated, was = last.get(e);
          if (was === true && g === false) flips.push(e);
          last.set(e, g);
        }
        if (flips.length) {
          const kinds = {};
          for (const e of flips) { const k = e.mesh.userData.qk ?? (e.mesh.userData.mover ? '(mover)' : '-'); kinds[k] = (kinds[k] || 0) + 1; }
          const tk = { tc: ms.tClock, R: vs.r, n: flips.length, big: flips.filter((e) => e.radius > 2 && !e.mesh.userData.mover).length, kinds };
          W.ticks.push(tk);
          for (const e of flips) {
            const o = matOf(e);
            if (!o) continue;
            W.watch.push({ tick: W.ticks.length - 1, d: Math.hypot(e.mesh.position.x - vs.x, e.mesh.position.z - vs.z), o, e, done: -1 });
          }
        }
        for (const w of W.watch) {
          if (w.done >= 0) continue;
          // A PROP WEARING SOMETHING ELSE IS NOT SHOWING THE GATE. The hero's
          // occlusion fade (island.ts, setMeshFade) swaps a prop between him
          // and the lens onto a pooled dither material, and on release puts it
          // back on its BASE material, not the grey clone — so for as long as
          // that lasts the prop's colour on screen says nothing about the
          // gate either way. Such a prop is set aside, counted, not graded.
          if (w.o.material !== w.o.userData.gateMat) { w.swapped = true; continue; }
          if (w.o.material.color.equals(w.o.userData.baseCol)) w.done = ms.tClock;
        }
      } catch (err) { W.err = String((err && err.message) || err); }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const t0 = await tc(p);
  const wave0 = await p.evaluate(() => window.__ungateWaveN());
  const ev0 = await p.evaluate(() => window.__stages().ceremonies);
  await p.evaluate(() => window.__forceEvolve());
  await p.waitForFunction((n) => window.__stages().ceremonies > n, ev0, { timeout: 900000, polling: 100 });
  const card = await p.evaluate(() => ({ tc: window.__matchState().tClock, shown: !!document.getElementById('evolve')?.classList.contains('show') }));
  if (!card.shown) die('__forceEvolve() ran the ceremony but the EVOLVED card is not up — the 1.5 s rule has nothing to be measured against');
  // ── WHERE EACH STEP GROWS TO, READ OFF THE ISLAND ────────────────────────
  // Not fixed radii: from wherever the void is, to just past a size the island
  // actually has, using the game's own eat ratio (__goalPools().eatRatio)
  // against the props' own `gated` flags, and the smallest growth that makes a
  // WAVE (eight grey props, or one static prop over r 2):
  //   'tagged' the smallest wave that frees the smallest grey tagged prop,
  //            which is the only kind of wave the class float may name
  //   'any'    the smallest wave, whatever is in it
  const target = (kind) => p.evaluate((k) => {
    const er = window.__goalPools().eatRatio, R = window.__voidState().r;
    const grey = window.__edibles.filter((e) => e.mesh.userData.gated === true && !e.eaten && e.mesh.visible)
      .map((e) => ({ r: e.radius, tag: !!e.mesh.userData.qk && !e.mesh.userData.mover, mover: !!e.mesh.userData.mover }))
      .sort((a, b) => a.r - b.r);
    const tagMin = grey.find((x) => x.tag)?.r ?? Infinity;
    let n = 0, big = false;
    for (const g of grey) {
      n++; if (g.r > 2 && !g.mover) big = true;
      if ((n >= 8 || big) && (k !== 'tagged' || g.r >= tagMin)) return Math.max(R + 0.02, g.r / er + 0.005);
    }
    return null;
  }, kind);
  const steps = [];
  const step = async (label, kind, after) => {
    if (after) await p.waitForFunction((x) => window.__matchState().tClock >= x, after, { timeout: 900000, polling: 200 });
    const r = await target(kind);
    if (r === null) die(`step "${label}": no ${kind === 'tagged' ? 'tagged grey prop' : 'wave of grey props'} left above the void to grow through`);
    const s = await tc(p);
    await p.evaluate((x) => window.__setVoidR(x), r);
    await waitT(p, 0.6, s);
    steps.push({ label, r: +r.toFixed(2), from: s, to: await tc(p) });
  };
  await step('near the card', 'tagged');
  await step('a tagged wave', 'tagged', card.tc + 1.6);
  await step('again', 'any');
  // let the roll finish: every watched prop back to colour, or 8 s of tClock
  const tw = await tc(p);
  await p.waitForFunction((x) => window.__nw.watch.every((w) => w.done >= 0) || window.__matchState().tClock > x, tw + 8,
    { timeout: 900000, polling: 250 });
  const W = await p.evaluate(() => ({ ticks: window.__nw.ticks, err: window.__nw.err,
    watch: window.__nw.watch.map((w) => ({ tick: w.tick, d: w.d, done: w.done, r: +w.e.radius.toFixed(2), qk: w.e.mesh.userData.qk ?? '',
      mover: !!w.e.mesh.userData.mover, eaten: !!w.e.eaten || !w.e.mesh.visible, gated: w.e.mesh.userData.gated, swapped: !!w.swapped })) }));
  const L = await p.evaluate(() => window.__nf);
  const cs = await calls(p, t0);
  const waves = await p.evaluate(() => window.__ungateWaveN()) - wave0;
  await p.close();
  if (W.err) die(`the prop sampler threw: ${W.err}`);
  const isWave = (k) => k.n >= 8 || k.big > 0;
  const inStep = (t, s) => t >= s.from && t <= s.to + 0.05;
  for (const s of steps) {
    s.ticks = W.ticks.filter((k) => inStep(k.tc, s));
    s.waves = s.ticks.filter(isWave);
    console.log(`  ·    (b) ${s.label.padEnd(14)} r ${s.r}: ${s.ticks.map((k) => `${k.n} flipped (${k.big} over r 2) ${Object.entries(k.kinds).map(([q, n]) => `${q}:${n}`).join(' ')}`).join('; ') || 'nothing flipped'}`);
  }
  const seen = W.ticks.filter(isWave).length;
  const classF = L.raises.filter((r) => r.tc >= t0 && CLASS_RE.test(r.text));
  const sparks = cs.filter((c) => c.id === 'sparkle');
  console.log(`  ·        card at tClock ${card.tc.toFixed(2)}; waves seen ${seen}, counted ${waves}; class floats ${classF.map((r) => `"${r.text}" @${r.tc.toFixed(2)}`).join(' ') || 'none'}; sparkles ${sparks.map((c) => c.t.toFixed(2)).join(' ') || 'none'}`);
  bar(steps.every((s) => s.waves.length > 0), 'b1', steps.every((s) => s.waves.length > 0)
    ? 'each step un-greyed a wave, read off the props themselves'
    : `no wave in step(s) ${steps.filter((s) => !s.waves.length).map((s) => `"${s.label}"`).join(', ')} — the precondition failed, the rules below are untested there`);
  bar(waves === seen && seen > 0, 'b2', `the game counted ${waves} wave(s), the props showed ${seen}`);
  // ── WHICH WAVE THE NAME BELONGS TO, READ OFF THE PROPS ─────────────────────
  // A tagged wave is a wave with a `qk` in it that is not a bare walker. The
  // name belongs on the FIRST tagged wave that is not inside 1.5 s after the
  // card — normally step 3, but a walker the void swallows between steps grows
  // it through a class of its own, and that wave is just as much the first.
  // Step 2 is a tagged wave inside the card's 1.5 s: the rule is tested there.
  const tagWave = (k) => isWave(k) && Object.keys(k.kinds).some((q) => q !== '-' && q !== '(mover)');
  const nearCardTag = W.ticks.filter((k) => tagWave(k) && k.tc >= card.tc - 0.05 && k.tc < card.tc + 1.5);
  const due = W.ticks.find((k) => tagWave(k) && !(k.tc >= card.tc - 0.05 && k.tc < card.tc + 1.5));
  const okClass = classF.length === 1 && !!due && Math.abs(classF[0].tc - due.tc) < 0.06
    && /^[A-Z][A-Z' ]* ARE FOOD NOW!$/.test(classF[0].text) && nearCardTag.length > 0;
  bar(okClass, 'b3', okClass ? `one class float, "${classF[0].text}", on the first tagged wave clear of the card (tClock ${due.tc.toFixed(2)}) — silent on the ${nearCardTag.length} tagged wave(s) inside its 1.5 s, and never twice`
    : `${classF.length} class float(s)${classF.length ? ` (${classF.map((r) => `"${r.text}" @${r.tc.toFixed(2)}`).join(', ')})` : ''}; first tagged wave clear of the card ${due ? `@${due.tc.toFixed(2)}` : 'none'}; tagged waves inside its 1.5 s ${nearCardTag.length} `
      + '(bar: exactly one, in capitals, on that wave, and at least one tagged wave near the card to have been silent on)');
  const gaps = sparks.slice(1).map((c, i) => c.t - sparks[i].t);
  const nearCard = sparks.filter((c) => c.t < card.tc + 1.5);
  bar(sparks.length > 0 && gaps.every((g) => g >= 3) && !nearCard.length, 'b4', !sparks.length ? 'no sparkle on any wave — the world lit up in silence'
    : `${sparks.length} sparkle(s); closest two ${gaps.length ? Math.min(...gaps).toFixed(2) : '-'} s apart (bar 3 s); inside 1.5 s of the card: ${nearCard.length}`);
  // the roll, on the wave the name was due on (the biggest roll a child sees)
  const w3 = due ?? steps[1].waves[0];
  const wi = w3 ? W.ticks.indexOf(w3) : -1;
  const all = W.watch.filter((w) => w.tick === wi);
  const rows = all.filter((w) => !w.swapped).sort((x, y) => x.d - y.d);
  const swapped = all.length - rows.length;
  if (!rows.length) bar(false, 'b5', 'no prop of the named wave could be watched back to colour');
  else {
    const undone = rows.filter((w) => w.done < 0).length;
    let back = 0;
    const backs = [];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i].done >= 0 && rows[i - 1].done >= 0 && rows[i].done < rows[i - 1].done - 0.051) {
        back++;
        if (backs.length < 3) backs.push([rows[i - 1], rows[i]].map((w) => `d ${w.d.toFixed(1)} back +${(w.done - w3.tc).toFixed(2)} r ${w.r}${w.qk ? ` ${w.qk}` : ''}${w.mover ? ' walker' : ''}${w.eaten ? ' eaten' : ''}`).join(' then '));
      }
    }
    if (backs.length) console.log(`  ·        out of order: ${backs.join(' | ')}`);
    const near1 = rows[0], far1 = rows[rows.length - 1];
    const lag = far1.done - near1.done, want = (far1.d - near1.d) / 60 - 0.1;
    console.log(`  ·        the named wave: ${rows.length} props from ${near1.d.toFixed(0)} to ${far1.d.toFixed(0)} units (${swapped} set aside, wearing the occlusion fade's material); nearest back at +${(near1.done - w3.tc).toFixed(2)} s, farthest at +${(far1.done - w3.tc).toFixed(2)} s`);
    bar(!undone && !back && lag >= want, 'b5', undone ? `${undone} of ${rows.length} props never got their colour back`
      : `restore order ${back ? `went backwards ${back} time(s)` : 'follows distance'}; farthest ${lag.toFixed(2)} s after nearest (bar ${want.toFixed(2)} s — 60 units a second)`);
  }
  bar(L.frames > 0 && !L.face && !L.pill && !L.off, 'b6', !L.frames ? 'the class float was never on screen to measure — face and NOMS pill untested'
    : `the class float over ${L.frames} visible pose(s): on his face ${L.face}, on the NOMS pill ${L.pill}, off screen ${L.off}${L.worst ? ` — ${JSON.stringify(L.worst)}` : ''}${L.err ? ` (sampler: ${L.err})` : ''}`);

}

// ══ (c) THE BUMP ═════════════════════════════════════════════════════════════
if (ONLY.includes('c')) {
  const p = await open(0);
  const pick = await p.evaluate(() => {
    const vs = window.__voidState();
    let best = null, bd = 1e9;
    window.__edibles.forEach((e, i) => {
      const u = e.mesh.userData;
      if (e.eaten || !e.mesh.visible || u.mover || u.eaten || u.departed || u.tethered) return;
      if (e.radius < vs.r * 1.11 * 1.6 || e.radius > vs.r * 5) return;
      const d = Math.hypot(e.mesh.position.x - vs.x, e.mesh.position.z - vs.z);
      if (d < vs.r + e.radius * 0.7 + 3) return;   // already touching it: no first contact to time
      if (d < bd) { bd = d; best = i; }
    });
    if (best === null) return null;
    const e = window.__edibles[best];
    window.__nc = { e, rows: [], contact: null };
    const tick = () => {
      const C = window.__nc;
      if (!C.contact && C.e.mesh.userData.shakeT > 0) C.contact = window.__matchState().tClock;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return { r: e.radius, R: vs.r, d: bd, x: e.mesh.position.x, z: e.mesh.position.z, qk: e.mesh.userData.qk ?? '' };
  });
  if (!pick) die('no static prop between 1.6x and 5x of the eat line within reach of the spawn — nothing to bump');
  const w0 = await p.evaluate(() => window.__wallCues());
  const t0 = await tc(p);
  await p.evaluate(([x, z]) => window.__warpVoid(x, z), [pick.x, pick.z]);
  await p.waitForFunction(() => window.__nc.contact !== null, null, { timeout: 900000, polling: 100 });
  const contact = await p.evaluate(() => window.__nc.contact);
  await waitT(p, 1.5, contact);
  const cs = await calls(p, t0);
  const w1 = await p.evaluate(() => window.__wallCues());
  await p.close();
  const bonks = cs.filter((c) => c.id === 'bonk');
  const onTouch = bonks.filter((c) => c.t >= contact - 0.001 && c.t <= contact + 0.1);
  console.log(`  ·    (c) a prop of r ${pick.r.toFixed(2)}${pick.qk ? ` (${pick.qk})` : ''} against a void of ${pick.R.toFixed(2)} (eat line ${(pick.R * 1.11).toFixed(2)}); `
    + `first contact at tClock ${contact.toFixed(2)}; bonks ${bonks.map((c) => `+${(c.t - contact).toFixed(2)}`).join(' ') || 'none'}`);
  bar(onTouch.length === 1, 'c1', onTouch.length === 1 ? 'one bonk on first contact, inside 100 ms' : `${onTouch.length} bonk(s) inside 100 ms of first contact (bar: exactly one)`);
  bar(bonks.length === onTouch.length, 'c2', bonks.length === onTouch.length ? 'and no second one for the 1.5 s it sat inside the prop'
    : `${bonks.length - onTouch.length} more bonk(s) while it sat inside — a nag`);
  bar(w1 === w0, 'c3', w1 === w0 ? 'the shore did not answer: the bonk is the prop\'s' : `the wall cue fired ${w1 - w0} time(s) — the bonk cannot be attributed to the prop`);
}

if (b) await b.close();
if (bad) console.log(`\nFAIL — ${bad} of ${bars} bar(s)`);
else if (ONLY.length < 4) console.log(`\nPASS — ${bars} bar(s) of part(s) ${ONLY.join(', ')} (the gate runs all four)`);
else console.log(`\nPASS — ${bars} bar(s): the sibling she outgrows is announced once, the world lights up outward with one class float, and a bump into something too big says "not yet" once`);
process.exit(bad ? 1 : 0);
