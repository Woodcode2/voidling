// ── DOES THE MENU POSTER FLOAT, OR DOES IT SLIDE? ───────────────────────────
//
// The owner approved one thing: "a slightly animated image". The failure this
// probe exists to catch is the one that cannot be seen in a still and cannot be
// seen in code review either —
//
//   TWO CSS ANIMATIONS ON ONE ELEMENT BOTH WRITING `transform` DO NOT COMPOSE.
//
// The last one in the animation list wins outright and the first is simply not
// applied, silently, with no warning anywhere. `animation: artBob …, artTilt …`
// on #menuArtImg would compile, ship, and render a poster that slides straight
// up and down like a sticker on glass — which is precisely the thing the tilt
// was added to prevent. So the bob and the tilt live on different elements, and
// this probe proves BOTH are moving by reading the two computed matrices apart
// over a full cycle.
//
//   node qa/_float.mjs [port]
//
// Prints PASS/FAIL lines (the gate's `pf` shape: silence is failure) and writes
// eight frames across the 5.2s bob to qa/out/float/.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { PNG } from 'pngjs';

/** ── IS THE 3D WORLD STILL SHOWING THROUGH? ────────────────────────────────
 *
 *  Asked of the pixels, because the two attempts to ask it of the stylesheet
 *  both answered confidently and wrongly (see the note in read()).
 *
 *  The menu's shipped background is a gradient with a clear band across the
 *  middle of the screen, and the live canvas renders behind it. "The window is
 *  closed" has exactly one meaning: TAKING THE CANVAS AWAY CHANGES NOTHING. So
 *  shoot the menu, hide the canvas, shoot it again, and count the pixels that
 *  moved — against a same-canvas pair shot the same way, which is the floor for
 *  whatever this page does on its own between two screenshots.
 *
 *  Motion is stopped first: prefers-reduced-motion parks the float, and with
 *  the canvas covered the scene behind it can keep running unseen. */
async function openWindow(p) {
  const shoot = async () => PNG.sync.read(await p.screenshot());
  const diff = (a, b) => { let n = 0;
    for (let i = 0; i < a.data.length; i += 4) {
      if (Math.abs(a.data[i] - b.data[i]) > 6 || Math.abs(a.data[i + 1] - b.data[i + 1]) > 6
        || Math.abs(a.data[i + 2] - b.data[i + 2]) > 6) n++;
    }
    return n; };
  const was = await p.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await p.waitForTimeout(500);
  const a1 = await shoot();
  await p.waitForTimeout(500);
  const a2 = await shoot();                      // the floor
  // __renderer.domElement, NOT querySelector('canvas'). This page holds 36
  // canvases — every sticker thumbnail is one — and the first in document order
  // is not the scene. Hiding that one moved 10,106 px of sticker art inside the
  // poster's bounding box and the check read it as the 3D world leaking through.
  await p.evaluate(() => { window.__renderer.domElement.style.visibility = 'hidden'; });
  await p.waitForTimeout(500);
  const b1 = await shoot();
  await p.evaluate(() => { window.__renderer.domElement.style.visibility = ''; });
  if (!was) await p.emulateMedia({ reducedMotion: null });
  await p.waitForTimeout(400);
  const total = a1.width * a1.height;
  return { floor: diff(a1, a2), hidden: diff(a1, b1), total };
}

const PORT = process.argv[2] || '4177';
const OUT = 'qa/out/float';
// The real Maple poster lives on the generation CDN and this container's egress
// proxy refuses that origin, so the float is photographed against a 3:4 poster
// that IS on disk — Maple's current picker card. The CSS is what is under test;
// which painting is inside the <img> is not.
const STAND_IN = '/assets/hf/hf_20260801_130607_c92a52e5-8c1c-4a60-a566-ba19583fd532.png';
mkdirSync(OUT, { recursive: true });

// Read the two transforms apart. A matrix as a plain string is enough: we are
// asking "did this change", not "by how much", and the string changes iff the
// matrix does.
const read = () => {
  const bob = document.getElementById('menuArtBob');
  const img = document.getElementById('menuArtImg');
  if (!bob || !img) return null;
  const cs = getComputedStyle, b = cs(bob), i = cs(img);
  const leaf = document.querySelector('#menuArt .leaf');
  const tw = document.querySelector('#menuArt .tw');
  return {
    bob: b.transform, img: i.transform,
    leaf: leaf ? cs(leaf).transform : null,
    leafOp: leaf ? +cs(leaf).opacity : null,
    twOp: tw ? +cs(tw).opacity : null,
    poster: document.body.classList.contains('poster'),
    // (Whether the live 3D world still shows through is NOT read from here —
    //  see openWindow() below. Two attempts to answer it from the computed
    //  background both failed: `#menu::after`'s display, which body.diorama has
    //  been answering `none` on the shipped menu for weeks, and then a search
    //  for a zero-alpha stop, which matched the keyword `transparent` in the two
    //  corner glows that BOTH backgrounds carry. It is a question about pixels.)
    stars: cs(document.querySelector('#menu'), '::before').display,
    // the authored periods, read off the animations themselves rather than
    // inferred from samples — see the note on (d)
    anims: ['menuArtBob', 'menuArtImg'].map((id) => {
      const el = document.getElementById(id);
      return el ? el.getAnimations().map((a) => ({
        name: a.animationName, dur: a.effect.getTiming().duration,
        dir: a.effect.getTiming().direction })) : [];
    }),
    artBox: (() => { const r = document.getElementById('menuArtImg')?.getBoundingClientRect();
      return r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null; })(),
  };
};

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
let bad = 0;
const fail = (m) => { console.log(`FAIL — ${m}`); bad++; };
const pass = (m) => console.log(`PASS — ${m}`);
try {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  p.on('pageerror', (e) => console.log('  [pageerror] ' + e.message.split('\n')[0]));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try { localStorage.clear();
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidMute', '1');
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark'); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=maple&manual=1`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__menuState && window.__menuState().menuMode, null, { timeout: 420000 });

  // (a) THE LAYER EXISTS AT ALL. On the build before this change #menuArt is
  //     not in the document, and every assertion below is vacuous without it.
  const present = await p.evaluate(() => !!document.getElementById('menuArtBob') && !!document.getElementById('menuArtImg'));
  if (!present) { fail('the menu has no #menuArt layer — nothing to float'); throw new Error('no layer'); }
  pass('#menuArt / #menuArtBob / #menuArtImg are in the menu');

  // (b) THE POSTER GOES UP, and the generic splash goes down with it.
  if (!(await p.evaluate((s) => window.__menuArtSrc(s), STAND_IN))) fail('__menuArtSrc did not take the stand-in');
  await p.waitForFunction(() => document.body.classList.contains('poster'), null, { timeout: 60000 })
    .catch(() => fail('body.poster never went on — the poster never decoded'));
  const s0 = await p.evaluate(read);
  if (!s0) { fail('could not read the float layer'); throw new Error('no read'); }
  if (s0.stars !== 'none') pass('the star field is back — the island has a sky behind it');
  else fail('the star field is still hidden by body.diorama — the poster floats on a flat gradient');
  if (s0.artBox && s0.artBox.w > 120 && s0.artBox.h > 200) pass(`poster occupies ${s0.artBox.w}x${s0.artBox.h} at (${s0.artBox.x},${s0.artBox.y})`);
  else fail(`poster box is ${JSON.stringify(s0.artBox)} — too small to be a hero`);

  // (c) BOTH MATRICES MOVE. Sample a full bob cycle (5.2s) at 26 points and
  //     count how many DISTINCT values each element took. One distinct value is
  //     a dead animation; the composition bug reads exactly that way on the bob.
  const N = 26, bobs = new Set(), imgs = new Set(), leaves = new Set(), twOps = new Set();
  const shots = [];
  for (let k = 0; k < N; k++) {
    const st = await p.evaluate(read);
    bobs.add(st.bob); imgs.add(st.img);
    if (st.leaf) leaves.add(st.leaf);
    if (st.twOp !== null) twOps.add(st.twOp.toFixed(3));
    if (k % 4 === 0) shots.push(k);
    await p.waitForTimeout(200);
  }
  // THE BAR IS THREE, AND THAT IS NOT SLOPPINESS. A computed transform only
  // changes on a rendered frame, and this container renders at roughly 1fps on
  // SwiftShader — 26 samples over 5.2s came back with 5 distinct values for
  // every element, animating or not, because that is how many frames there
  // were. What this check has to catch is the composition bug, and that bug
  // reads as ONE value for the whole run whatever the frame rate: an animation
  // that was never applied has a constant computed transform. Three separates
  // "moving" from "dead" with room to spare; the PERIODS are (d)'s job.
  const chk = (set, what) => set.size >= 3
    ? pass(`${what} took ${set.size} distinct values across 5.2s — it is animating`)
    : fail(`${what} took only ${set.size} distinct value(s) across 5.2s — it is NOT animating`);
  chk(bobs, 'the bob transform (#menuArtBob)');
  chk(imgs, 'the tilt transform (#menuArtImg)');
  chk(leaves, 'the leaf transform');
  chk(twOps, 'the star opacity');

  // (d) ONE ANIMATION EACH, ON PERIODS THAT DO NOT DIVIDE.
  //
  //     Read off getAnimations() rather than sampled, because sampling cannot
  //     answer this here: an earlier version of this check watched the pair for
  //     3s and reported "3/18 distinct pairings — they are in lockstep", which
  //     was a measurement of SwiftShader's frame rate wearing a conclusion's
  //     clothes. The authored durations are a property of the stylesheet and
  //     are exact at any frame rate.
  //
  //     Two things have to hold. ONE animation per element: a second one on the
  //     same element is the composition bug arriving, and it is silent. And a
  //     ratio that is not a small whole number: 2.6s against 3.65s realign every
  //     37.96s, which is longer than a child looks at a menu — equal periods, or
  //     3.9 against 2.6, would beat in plain sight.
  const a = s0.anims;
  const names = a.map((x) => x.map((y) => y.name).join('+'));
  if (a[0].length === 1 && a[1].length === 1) pass(`one animation per element: ${names[0]} on the bob, ${names[1]} on the image`);
  else fail(`animations per element are ${a[0].length} and ${a[1].length} — two on one element do not compose, the first is dropped`);
  const [d0, d1] = [a[0][0] && a[0][0].dur, a[1][0] && a[1][0].dur];
  const ratio = d0 && d1 ? Math.max(d0, d1) / Math.min(d0, d1) : 1;
  const nearInt = Math.abs(ratio - Math.round(ratio)) < 0.04;
  if (d0 && d1 && d0 !== d1 && !nearInt) {
    const g = (x, y) => (y < 1 ? x : g(y, x % y));
    const lcm = (d0 * d1) / g(d0, d1);
    pass(`bob ${d0}ms x2 vs tilt ${d1}ms x2 (ratio ${ratio.toFixed(3)}) — they realign every ${(lcm * 2 / 1000).toFixed(1)}s`);
  } else fail(`bob ${d0}ms vs tilt ${d1}ms (ratio ${ratio.toFixed(3)}) — the two periods beat together and the float looks mechanical`);
  if (a[0][0] && a[0][0].dir === 'alternate' && a[1][0] && a[1][0].dir === 'alternate') pass('both run `alternate` — the poster eases back, it never snaps to its start');
  else fail(`directions are ${a[0][0] && a[0][0].dir} / ${a[1][0] && a[1][0].dir} — a non-alternating loop jumps on every repeat`);

  // (e) THE PICTURES. Eight frames across one bob, as the child sees them.
  for (let k = 0; k < 8; k++) {
    await p.screenshot({ path: `${OUT}/maple-${String(k).padStart(2, '0')}.png` });
    await p.waitForTimeout(650);
  }
  console.log(`  8 frames -> ${OUT}/maple-00..07.png`);

  // (f) IS THE WINDOW ONTO THE LIVE 3D WORLD CLOSED? Run here, not before the
  //     sampling above: openWindow() has to park the page under
  //     prefers-reduced-motion to compare two still frames, and when it ran
  //     first every animation check behind it reported one or two distinct
  //     values and read as dead.
  const w0 = await openWindow(p);
  const pct = (n) => ((100 * n) / w0.total).toFixed(2) + '%';
  if (s0.poster && w0.hidden <= Math.max(w0.floor * 2, 400))
    pass(`the window is closed behind the poster: taking the scene canvas away moves ${w0.hidden} px (${pct(w0.hidden)}), against a ${w0.floor} px floor`);
  else fail(`taking the scene canvas away moves ${w0.hidden} px (${pct(w0.hidden)}) against a ${w0.floor} px floor — the rendered world is still showing through the poster`);

  // (g) REDUCED MOTION STOPS IT. A child who told the phone to stop moving
  //     things gets the poster and no motion — not a poster that ignores her.
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await p.waitForTimeout(300);
  const rm = new Set();
  for (let k = 0; k < 8; k++) { rm.add((await p.evaluate(read)).bob); await p.waitForTimeout(220); }
  if (rm.size === 1) pass('prefers-reduced-motion: the poster stays and the bob stops');
  else fail(`prefers-reduced-motion: the bob still took ${rm.size} values`);
  await p.screenshot({ path: `${OUT}/maple-reduced.png` });

  // (h) A WORLD WITH NO POSTER FALLS BACK, and falls back from a world that HAD
  //     one — the state that leaves an old island hanging behind a hidden splash.
  await p.evaluate(() => window.__menuArtSrc(null));
  await p.waitForTimeout(200);
  const s1 = await p.evaluate(read);
  const w1 = await openWindow(p);
  if (!s1.poster && w1.hidden > Math.max(w1.floor * 2, 400))
    pass(`no poster for this world -> body.poster off and the live 3D menu is back: the canvas is worth ${w1.hidden} px again (${((100 * w1.hidden) / w1.total).toFixed(2)}%)`);
  else fail(`fallback left poster=${s1.poster} and the canvas worth only ${w1.hidden} px against a ${w1.floor} px floor — a world with no poster lost its menu`);
  await p.close();
} catch (e) {
  if (!String(e.message).match(/^(no layer|no read)$/)) { console.log('FAIL — ' + e.message.split('\n')[0]); bad++; }
} finally { await b.close(); }
console.log(bad ? `\n${bad} check(s) failed` : '\nall checks passed');
process.exit(bad ? 1 : 0);
