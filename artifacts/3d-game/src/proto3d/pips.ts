// ── THE PIP. The whole ladder speaks through this one shape. ────────────────
//
// A pip is one dot of the thirty. It is the only piece of the progression a
// child ever has to READ, and she cannot read — so it has to say everything in
// silhouette and colour, at 28 px in a row of five and at 96 px alone on the
// end card, from ONE definition.
//
// WHY THIS FILE EXISTS AT ALL. The pip is drawn in four places: the end card's
// headline, the end card's row of five, the end card's "next reward", and the
// menu's six rows of five. Four hand-rolled copies of a five-state visual
// language is four places for the states to drift apart, and the states are the
// game's progression model — the one thing that must never disagree with itself.
// So: one module, no DOM, no THREE, returns strings. The end card and the menu
// both call it; a probe can reason about it without a browser.
//
// WHY SVG AND NOT A SPRITE SHEET. MENU-BRIEF §4.4 asks for 96 px sprites from a
// `qa/icons.mjs` sheet. That sheet does not exist and would be 5 states x N
// sizes of bitmap to author, deliver and cache-bust — and the game's CDN egress
// is blocked in this environment, so a sheet would have to be inlined as data
// URIs anyway. Inline <symbol> + <use> is crisp at every size from one
// definition, takes its colour from CSS (so the states are themed in the
// stylesheet where every other colour in this game lives), costs no request,
// and cannot half-arrive. The glyphs are deliberately fat and simple: a
// six-year-old reads silhouette, not detail.
//
// THE FIVE STATES, and what each one has to say without words:
//
//   locked   a padlock. "Not yet — but it is THERE." Hole.io shows you what you
//            have not reached; Angry Birds shows you the whole level select with
//            the far ones dimmed. Seeing the shape of the mountain is most of
//            why anyone climbs it, so a locked pip is drawn at full size and
//            full shape, only drained of colour.
//   open     the live one. Empty, bright, with the green RING around it — "you
//            are here". One per world by construction (levels.ts derives it), so
//            the ring is never ambiguous.
//   fin      attempted, goal not met. The dot is filled but grey, and it keeps
//            the green ring because under the owner's win gate a missed dot is
//            STILL where she is. A replay arrow sits in it: not a cross, not a
//            zero — an invitation. Nothing here says "failed".
//   done     the tick. Earned, kept, never taken away.
//   clear    the star. The tick plus the world's CLEAR number in the same run —
//            the thing a child shows somebody.
//
// There is no 'stolen', no 'expired' and no 'locked again': states only ever
// rise (levels.ts RANK), and this file has no way to express a fall.

/** The five states, lowest to highest. Mirrors levels.ts LevelState exactly;
 *  imported as a type there rather than re-declared, so they cannot drift. */
export type PipState = 'locked' | 'open' | 'fin' | 'done' | 'clear';

/** Which glyph each state wears, or null for the bare dot. `open` is bare on
 *  purpose: it is the only state whose meaning is "nothing has happened here
 *  yet", and a glyph would be a claim. */
export const PIP_GLYPH: Record<PipState, string | null> = {
  locked: 'ic-lock',
  open: null,
  fin: 'ic-again',
  done: 'ic-tick',
  clear: 'ic-star',
};

/** The word under the pip — 12 px, for the grown-up reading over her shoulder,
 *  never the headline (child skeptic: "the first thing on the one screen that
 *  tells her how she did is a word she cannot read"). */
export const PIP_WORD: Record<PipState, string> = {
  locked: 'LOCKED',
  open: 'PLAY THIS',
  fin: 'NOT YET',
  done: 'DONE',
  clear: 'CLEARED',
};

/** Does this state carry the "you are here" ring? Open and fin both do: a
 *  missed dot is still the current one under the win gate (§3.2). */
export const pipHere = (s: PipState): boolean => s === 'open' || s === 'fin';

/** ── THE THREE TIMINGS THE LADDER MOVES ON ────────────────────────────────
 *  Here, not in the stylesheet and not in the caller, because THREE places read
 *  each one: the CSS animation that plays it, the JS that schedules the next
 *  beat after it, and the probe that measures whether it happened. A number
 *  written three times is a number that will disagree with itself the first
 *  time one of the three is tuned.
 *
 *  The CSS side gets them as custom properties on :root (see index.html) and
 *  they are asserted equal by qa/reveal.mjs, so the stylesheet cannot drift
 *  away from the schedule that drives it.
 *
 *  FLIP then HOP, in that order and never together: the dot she just played
 *  changes first, so the eye is already on it, and only then does the ring
 *  leave for the next one. Both at once and there is nothing to follow. */
export const PIP_FLIP_MS = 180;
/** the ring's travel to the dot the win opened */
export const PIP_HOP_MS = 220;
/** the gap between one pip's arrival and the next during the first reveal */
export const PIP_REVEAL_STEP_MS = 80;

/** THE SVG DEFS. Injected once into the document by ensurePipDefs(); every pip
 *  after that is a <use href="#ic-…">, which the browser shares.
 *
 *  All five glyphs are drawn inside a 24x24 box with a 2px margin so they optically
 *  match at any size, and every stroke is 3 units — at 28 px that renders as a
 *  1.2 px line, which survives a phone's subpixel grid; at 96 px it is 4 px and
 *  still reads as one confident mark rather than a hairline. */
export const PIP_DEFS = `
<svg id="pipDefs" aria-hidden="true" focusable="false" width="0" height="0"
     style="position:absolute;width:0;height:0;overflow:hidden">
  <defs>
    <!-- THE TICK. One stroke, round caps, leaning right the way a hand draws
         it — a symmetrical V reads as a checkbox glyph; this reads as somebody
         having marked it. -->
    <symbol id="ic-tick" viewBox="0 0 24 24">
      <path d="M4.5 13.2 L9.6 18.4 L19.8 6.6" fill="none" stroke="currentColor"
            stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
    </symbol>
    <!-- THE STAR. Five points, filled, slightly fat-limbed so it holds its
         shape at 28 px where a thin classical star turns into a blob. -->
    <symbol id="ic-star" viewBox="0 0 24 24">
      <path d="M12 2.6 L14.9 9.1 L22 9.9 L16.7 14.6 L18.2 21.6 L12 18 L5.8 21.6
               L7.3 14.6 L2 9.9 L9.1 9.1 Z" fill="currentColor"/>
    </symbol>
    <!-- THE PADLOCK. Shut, but drawn small inside the dot rather than over it:
         the pip's own shape has to stay legible, because the shape is the
         promise that the level exists. -->
    <symbol id="ic-lock" viewBox="0 0 24 24">
      <path d="M8.2 10.4 V7.8 a3.8 3.8 0 0 1 7.6 0 V10.4" fill="none"
            stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>
      <rect x="5.6" y="10.2" width="12.8" height="9.6" rx="2.4" fill="currentColor"/>
    </symbol>
    <!-- COME BACK. A circular arrow, not a cross and not a zero. This is the
         glyph on a dot she missed, and it is the only thing on that dot: an
         invitation to go again, which is the entire content of a miss in this
         game. -->
    <symbol id="ic-again" viewBox="0 0 24 24">
      <path d="M19 12 a7 7 0 1 1 -2.4 -5.3" fill="none" stroke="currentColor"
            stroke-width="3" stroke-linecap="round"/>
      <path d="M18.6 2.2 V7.2 H13.6" fill="none" stroke="currentColor"
            stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </symbol>
  </defs>
</svg>`;

/** Put the defs in the document exactly once. Idempotent, so every caller may
 *  simply ask — the end card, the menu and a QA hook all do. */
export function ensurePipDefs(doc: Document = document): void {
  if (doc.getElementById('pipDefs')) return;
  const host = doc.createElement('div');
  host.innerHTML = PIP_DEFS;
  const svg = host.firstElementChild;
  if (svg) doc.body.insertBefore(svg, doc.body.firstChild);
}

export interface PipOpts {
  /** 1-5 within the world. Printed inside `locked` and `open` pips, because a
   *  numeral is the one bit of text a five-year-old learning to count CAN read,
   *  and it is how a grown-up says "do level three". */
  n?: number;
  /** 0-based position in its row, published as `--pipI`. The staggered reveal
   *  is then one CSS rule with a calc()'d delay rather than five timers and
   *  five class writes — which matters because the alternative version of this
   *  animates five nodes from JS on a screen whose whole job is to be still. */
  idx?: number;
  /** px. 28 in a row, 96 as the end card's headline. */
  size?: number;
  /** extra classes, e.g. 'pop' to run the flip animation once */
  cls?: string;
  /** a11y label; the pips are decorative in a row and meaningful alone */
  label?: string;
}

/** ONE PIP. Returns markup, never touches the DOM — so the same string is used
 *  by innerHTML on the end card, by the menu's row builder, and by a probe's
 *  fixture. */
export function pip(state: PipState, opts: PipOpts = {}): string {
  const { n, size, cls, label, idx } = opts;
  const g = PIP_GLYPH[state];
  const vars = (size ? `--pipSize:${size}px;` : '') + (idx !== undefined ? `--pipI:${idx};` : '');
  const style = vars ? ` style="${vars}"` : '';
  const ring = pipHere(state) ? ' here' : '';
  const aria = label ? ` role="img" aria-label="${label}"` : ' aria-hidden="true"';
  // the numeral shows only where there is no glyph to collide with it
  const num = (state === 'locked' || state === 'open') && n ? `<i class="pipN">${n}</i>` : '';
  const glyph = g ? `<svg class="pipG" viewBox="0 0 24 24"><use href="#${g}"/></svg>` : '';
  return `<span class="pip s-${state}${ring}${cls ? ` ${cls}` : ''}"${style}${aria}>`
    + `<span class="pipDot">${glyph}${num}</span></span>`;
}

/** A WORLD'S FIVE, in order. The row is the sentence; one pip is a word.
 *
 *  `states` comes from levels.ts allLevels() and is never re-derived here —
 *  this file draws the ladder, it does not decide it. */
export function pipRow(states: PipState[], opts: { size?: number; popAt?: number } = {}): string {
  const { size = 28, popAt } = opts;
  return `<div class="pipRow">` + states.map((s, i) =>
    pip(s, { n: i + 1, idx: i, size, cls: popAt === i + 1 ? 'pop' : '' })).join('') + `</div>`;
}

/** The headline pip: one dot, big, with its word underneath at 12 px.
 *  §4.4 point 1 — the picture first, the word second, always in that order. */
export function pipHead(state: PipState, n: number, caption?: string): string {
  return `<div class="pipHead">${pip(state, { n, size: 96, cls: 'pop', label: PIP_WORD[state] })}`
    + `<b class="pipHW">${PIP_WORD[state]}</b>`
    + (caption ? `<i class="pipHC">${caption}</i>` : '')
    + `</div>`;
}
