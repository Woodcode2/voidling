// DOES THE WORLD PICKER'S TYPE SIT ON ITS PLATE? — the first-glance probe.
//
//   node qa/pickerfit.mjs [port]
//
// The owner, on the picker: "when people first pick a level, how does the level
// look at first glance?" This is that screen, and it had a fault that is
// invisible on four of the five cards.
//
// ── ONE BUG, TWO SYMPTOMS ────────────────────────────────────────────────
// The card is a poster with the type in a footer band. index.html:936 lays a
// gradient over the art that only becomes opaque from 78% down, and
// index.html:939 anchors .wBody to bottom: 0 — so the band is where the type is
// LEGIBLE, and anything that makes the body taller pushes the title UP, out of
// the band and onto bare artwork. index.html:946 says this in as many words,
// and reserves two lines for the subtitle so a long subtitle cannot do it.
//
// Nothing reserved anything for .wBest, which is one line at min-height 14px.
// A never-played world renders `✨ NEW PLACE · 12 SECRETS` there
// (prototype3d.ts:5622) — about 197px of letter-spaced 12px type in a box about
// 165px wide. It wraps, every card, every time.
//
// On Maple Falls you cannot see the damage: the poster's sky is dark purple, so
// the title is readable wherever it lands. On Powder Pass the poster is snow and
// pale sky, the title lands on it, and "POWDER PASS" and "SCHOOL'S SHUT. SLIDE."
// dissolve into the mountains. The world's own name is unreadable on the screen
// that sells it.
//
// ── WHAT IT MEASURES ─────────────────────────────────────────────────────
//   WRAP      .wBest must not wrap. It is the only text on the card with no
//             reserved height, so a wrap there is a layout fault by
//             construction, whatever it does to legibility.
//   CONTRAST  95% of the pixels ACTUALLY BEHIND each line of type must clear
//             4.5:1 against it, measured by rendering the same card twice —
//             once normally, once with the type hidden — and reading the
//             backdrop out of the second frame.
//
// ── RETRACTION, made before this probe gated anything ────────────────────
// The first version of the second bar was "every line of type must START below
// 78% of the poster's height", 78% being where index.html:936 turns the scrim
// opaque. It failed all five cards at 47%, and it would have failed them
// forever: title + subtitle + best line + the PLAY button come to about 40% of
// the poster between them, so NOTHING can fit in the bottom 22% and the bar was
// unsatisfiable by construction. It was measuring layout arithmetic and calling
// it legibility — the same mistake qa/variety.mjs and qa/faceparity.mjs have
// each had to retract once.
//
// What the complaint actually is — "I cannot read the name of the world" — is
// CONTRAST, and contrast is a thing you measure against the real backdrop, not
// a proxy for where the type happens to sit. A title on bare artwork that
// happens to be dark is fine. A title on a scrim that happens to be thin over
// snow is not. Only the pixels know.
//
// It never asks anyone to change a poster: the posters are APPROVED and on the
// governor's HANDS OFF list. Every fix this probe can motivate is in the type
// treatment over the art.
//
// TRAP: voidUnlocked is a COMMA-JOINED STRING (unlocks.ts:39), not JSON.
// TRAP: a profile with a best score shows `★ BEST n` instead, which is short and
// hides the bug — so this deliberately seeds a FRESH profile.
import { chromium } from 'playwright';
import { ALL_WORLDS } from './worlds.mjs';

const PORT = process.argv[2] || '4177';

// WCAG AA for body text. This audience is six years old and reading is the
// thing they are worst at, so the large-text relaxation to 3:1 is not taken
// even for the title — a world's name is the one word on the card that has to
// land.
const MIN_CONTRAST = 4.5;

const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
// FRESH profile on purpose — see the trap above. Worlds unlocked so every card
// renders its full body rather than the locked one-liner.
// the world list is an ARGUMENT, not a closure — addInitScript serialises this
// function into the page, where a node-side binding would be a ReferenceError.
await p.addInitScript((worlds) => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked', worlds.join(','));
  for (const w of worlds) localStorage.removeItem(`voidBest_${w}`);
} catch {} }, ALL_WORLDS);
await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.waitForSelector('#btnPlay', { state: 'visible', timeout: 400000 });
await p.evaluate(() => document.getElementById('btnPlay').click());
await p.waitForSelector('#worldRow .wCard[data-world="maple"]', { state: 'visible', timeout: 400000 });
await p.waitForTimeout(1600);

// ── MEASURE ─────────────────────────────────────────────────────────────
// Geometry and the computed text colour first, from the live DOM.
const cards = await p.evaluate(() => {
  const srgb = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = (r, g, b) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
  const parse = (css) => {
    const m = css.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const n = m[1].split(',').map((x) => parseFloat(x));
    return { r: n[0], g: n[1], b: n[2], a: n.length > 3 ? n[3] : 1 };
  };
  const out = [];
  for (const c of document.querySelectorAll('#worldRow .wCard[data-world]')) {
    const art = c.querySelector('.wArt');
    if (!art) continue;
    const ar = art.getBoundingClientRect();
    const read = (el, what) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return null;
      const cs = getComputedStyle(el);
      const col = parse(cs.color) || { r: 255, g: 255, b: 255, a: 1 };
      // COUNT REAL LINE BOXES, not box height over line height. The second
      // version of this probe did the arithmetic and started reporting "wrapped
      // to 2 lines" on every card the moment .wBest was given a two-line
      // RESERVE — it was measuring the fix as if it were the fault. A Range
      // over the text node returns one rect per rendered line and cannot be
      // fooled by reserved space.
      let lines = 1;
      try {
        const rg = document.createRange();
        rg.selectNodeContents(el);
        const rects = [...rg.getClientRects()].filter((q) => q.width > 1 && q.height > 1);
        const tops = new Set(rects.map((q) => Math.round(q.top)));
        lines = Math.max(1, tops.size);
      } catch { /* keep 1 */ }
      return {
        what,
        text: (el.textContent || '').trim(),
        lines,
        topFrac: ar.height ? (r.top - ar.top) / ar.height : 1,
        // device-pixel box, for cropping the screenshot
        box: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
        colour: col,
        colourLum: lum(col.r, col.g, col.b),
      };
    };
    out.push({
      world: c.dataset.world,
      title: read(c.querySelector('b'), 'title'),
      sub: read(c.querySelector('span'), 'subtitle'),
      best: read(c.querySelector('.wBest'), 'best'),
    });
  }
  return out;
});

// ── THE BACKDROP, MEASURED RATHER THAN ASSUMED ──────────────────────────
// Hide the type and photograph the same screen. What is left in each text box
// is exactly what that text is sitting on — scrim, artwork, or both — with no
// glyph pixels to poison the average. Anything else (sampling around the text,
// taking a percentile, subtracting a guess at coverage) is estimating a number
// this can simply read.
const shown = await p.screenshot({ type: 'png' });
await p.evaluate(() => {
  const st = document.createElement('style');
  st.id = '__hideType';
  st.textContent = '#worldRow .wCard b, #worldRow .wCard span, #worldRow .wCard .wBest { visibility: hidden !important; }';
  document.head.appendChild(st);
});
await p.waitForTimeout(500);
const bare = await p.screenshot({ type: 'png' });
const { PNG } = await import('pngjs');
const img = PNG.sync.read(bare);     // type hidden — the raw backdrop, for diagnosis
const lit = PNG.sync.read(shown);    // type visible — what a child actually sees

const srgb = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lumOf = (im) => (x, y) => {
  const i = (y * im.width + x) * 4;
  return 0.2126 * srgb(im.data[i]) + 0.7152 * srgb(im.data[i + 1]) + 0.0722 * srgb(im.data[i + 2]);
};
const lumAt = lumOf(img);
/** WCAG contrast ratio between two relative luminances. */
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
/** How much of a text box's backdrop clears the bar, and the ratio at the
 *  COVERAGE-th percentile.
 *
 *  Not the mean: a title half on dark sky and half on a white mountain averages
 *  to something respectable and is unreadable in the middle of the word.
 *
 *  And not the worst pixel either, which is where this started. Every poster
 *  here has specular highlights in it — snow, cloud, lantern flame, a white
 *  gable — so against near-white type SOME pixel behind SOME glyph is always
 *  about 1:1, on cards that read perfectly well. Worst-pixel scored all fifteen
 *  lines at 1.00–1.20:1 including ones a person can read without effort, which
 *  is a bar that cannot distinguish the good case from the bad and therefore
 *  measures nothing.
 *
 *  What separates them is HOW MUCH of the word is compromised. 95% is the bar:
 *  a handful of blown pixels behind a glyph is a sparkle, a twentieth of the
 *  word sitting on snow is a hole in it. */
const COVERAGE = 0.95;
/** THE BAR THAT DECIDES, and the second thing this probe had to correct about
 *  itself.
 *
 *  Measuring the BACKDROP (below) answers "is the scrim doing its job", which is
 *  a real question and the wrong one to gate on: it is blind to a text halo. A
 *  dark outline behind white glyphs is how every subtitle on every screen in the
 *  world stays readable over moving pictures, it costs nothing, it hides none of
 *  the art — and a backdrop-only bar cannot see it at all, so it would have
 *  forced the fix AWAY from the halo and toward darkening a poster that is on
 *  the governor's HANDS OFF list. An instrument that can only be satisfied by
 *  the wrong fix is worse than none.
 *
 *  So the gate measures the RENDERED result: inside each text box, the contrast
 *  between the glyph cores and what immediately surrounds them, halo included.
 *  P95 is glyph — near-white type, a fifth to a third of the box. P30 is what
 *  the eye reads them against. If a halo is doing work, P30 falls and this
 *  rises, which is exactly the behaviour a legibility bar should have. */
const inkContrast = (box) => {
  const at = lumOf(lit);
  const v = [];
  for (let y = box.y; y < box.y + box.h; y++) {
    for (let x = box.x; x < box.x + box.w; x++) {
      if (x < 0 || y < 0 || x >= lit.width || y >= lit.height) continue;
      v.push(at(x, y));
    }
  }
  if (v.length < 20) return null;
  v.sort((a, b) => a - b);
  const pct = (q) => v[Math.min(v.length - 1, Math.max(0, Math.floor(v.length * q)))];
  const ink = pct(0.95), ground = pct(0.30);
  return (Math.max(ink, ground) + 0.05) / (Math.min(ink, ground) + 0.05);
};
const backdrop = (box, textLum) => {
  const rs = [];
  for (let y = box.y; y < box.y + box.h; y++) {
    for (let x = box.x; x < box.x + box.w; x++) {
      if (x < 0 || y < 0 || x >= img.width || y >= img.height) continue;
      rs.push(ratio(textLum, lumAt(x, y)));
    }
  }
  if (!rs.length) return { contrast: null, clear: null };
  rs.sort((a, b) => a - b);
  // the ratio the worst 5% of the backdrop is allowed to be below
  const idx = Math.floor(rs.length * (1 - COVERAGE));
  return {
    contrast: rs[Math.min(idx, rs.length - 1)],
    clear: rs.filter((r) => r >= MIN_CONTRAST).length / rs.length,
    floor: rs[0],
  };
};

for (const c of cards) {
  for (const m of [c.title, c.sub, c.best]) {
    if (!m) continue;
    const r = backdrop(m.box, m.colourLum);
    m.backdrop = r.contrast;
    m.clear = r.clear;
    m.contrast = inkContrast(m.box);
  }
}

await b.close();

const fails = [];
for (const c of cards) {
  if (c.best && c.best.lines > 1) {
    fails.push(`${c.world}: .wBest wrapped to ${c.best.lines} lines ("${c.best.text}"). `
      + `It is the only text on the card with no reserved height and .wBody is anchored to the `
      + `bottom, so every extra line here pushes the TITLE up off the scrim (index.html:939, :946)`);
  }
  for (const m of [c.title, c.sub, c.best]) {
    if (!m || m.contrast == null) continue;
    if (m.contrast < MIN_CONTRAST) {
      fails.push(`${c.world}: the ${m.what} ("${m.text}") renders at ${m.contrast.toFixed(2)}:1 `
        + `between its glyphs and what surrounds them (bar ${MIN_CONTRAST}:1). `
        + `For context the bare backdrop under it is ${m.backdrop == null ? '?' : m.backdrop.toFixed(2)}:1 `
        + `with ${m.clear == null ? '?' : (m.clear * 100).toFixed(0)}% of it clearing — so the art behind `
        + `is bright AND the type has nothing to sit on. Fix the type treatment (a halo, a plate); `
        + `never the poster, which is APPROVED`);
    }
  }
}

console.log('');
for (const c of cards) {
  const f = (m) => !m ? '—'
    : `${m.contrast == null ? '?' : m.contrast.toFixed(1)}:1/${m.backdrop == null ? '?' : m.backdrop.toFixed(1)}`
      + `${m.lines > 1 ? ` (${m.lines}ln)` : ''}`;
  console.log(`  ${String(c.world).padEnd(9)} title ${f(c.title).padStart(11)}   `
    + `sub ${f(c.sub).padStart(11)}   best ${f(c.best).padStart(11)}`);
}
console.log('');
if (!cards.length) { console.log('FAIL — no world cards found; the picker did not open'); process.exit(1); }
if (fails.length) {
  for (const x of fails) console.log(`  · ${x}`);
  console.log(`\nFAIL — a child cannot read the world picker (${fails.length} finding(s))`);
  process.exit(1);
}
const worst = Math.min(...cards.flatMap((c) => [c.title, c.sub, c.best]).filter((m) => m?.contrast != null).map((m) => m.contrast));
console.log(`PASS — every line of type on all ${cards.length} world cards clears ${MIN_CONTRAST}:1 `
  + `against its real backdrop (worst ${worst.toFixed(2)}:1), and nothing wrapped`);
