// A SHEET HAS TO HAVE ARRIVED BEFORE A PROBE READS IT.
//
//   import { settle, restState, atRest, describeRest } from './_atrest.mjs';
//
// Studio round 4 (Job 7) put modalIn on #worlds, #shop, #profile and the pause
// card. Its first keyframe is `opacity: 0; transform: translateY(14px)
// scale(0.94)` (index.html). A probe that opens one of those sheets, waits a
// few hundred milliseconds and then reads it is only reading the sheet at rest
// if the animation has advanced past that first keyframe by then — and a CSS
// animation's time only advances on a rendered frame. qa/navtap.mjs traced
// this machine drawing the island about once every 2.5 s, with the ladder's
// pips reading `running, t=0` 1.2 s after they started and `finished` at
// 7.2 s. On a frame like that:
//   • every rect under the sheet is scaled by 0.94 (44px x 0.94 = 41.4px), and
//   • every element under the sheet has an ancestor at computed opacity 0,
//     which is the test qa/pictograph.mjs uses to skip text nobody can see.
//
// So the arrival is FINISHED, not waited for — the same move navtap makes on
// the menu. Every finite animation on each matched element, on its subtree and
// on each of its ancestors is finish()ed; anything infinite is left alone,
// because finish() throws on it and its resting frame is not the question.
// Nothing in src/ or index.html listens for an animation event or drives the
// Web Animations API (grep for animationend/start/cancel/iteration, onfinish,
// .animate( and getAnimations finds only comments), so finishing one runs no
// game code.
//
// restState() reads without touching anything, so a probe can ask again after
// it has photographed the sheet. Both page functions are self-contained:
// Playwright serialises them into the page, where nothing from this module is
// in scope.

/** In-page, read only. Over every element matching `s`: `op` is the lowest
 *  product of computed opacity along the path from a matched element up to
 *  <html> (null when nothing matches); `left` counts the distinct finite
 *  animations on the matched elements, their subtrees and their ancestors
 *  whose playState is still 'running'. */
const readRest = (s) => {
  const els = [...document.querySelectorAll(s)];
  if (!els.length) return { matched: 0, op: null, left: 0 };
  let op = 1;
  const running = new Set();
  for (const e of els) {
    let o = 1;
    for (let a = e; a; a = a.parentElement) o *= +getComputedStyle(a).opacity;
    op = Math.min(op, o);
    const anims = [...e.getAnimations({ subtree: true })];
    for (let a = e.parentElement; a; a = a.parentElement) anims.push(...a.getAnimations());
    for (const an of anims) {
      const t = an.effect && an.effect.getComputedTiming();
      if (!t || t.iterations === Infinity) continue;
      if (an.playState === 'running') running.add(an);
    }
  }
  return { matched: els.length, op, left: running.size };
};

/** In-page. Finish every finite animation on each element matching `s`, on
 *  its subtree and on its ancestors. Returns how many it finished, and the
 *  lowest opacity product it read BEFORE finishing — the number that says
 *  whether a probe reading this sheet unsettled would have been looking at
 *  it. */
const finishArrival = (s) => {
  // a CSS animation exists only once style has been computed with the .show
  // class on, and no frame may have been drawn since the door was opened —
  // so compute style here, before asking for the animations
  void document.documentElement.getBoundingClientRect();
  const els = [...document.querySelectorAll(s)];
  let opBefore = els.length ? 1 : null;
  for (const e of els) {
    let o = 1;
    for (let a = e; a; a = a.parentElement) o *= +getComputedStyle(a).opacity;
    opBefore = Math.min(opBefore, o);
  }
  let finished = 0;
  const seen = new Set();
  for (const e of els) {
    const anims = [...e.getAnimations({ subtree: true })];
    for (let a = e.parentElement; a; a = a.parentElement) anims.push(...a.getAnimations());
    for (const an of anims) {
      if (seen.has(an)) continue;
      seen.add(an);
      const t = an.effect && an.effect.getComputedTiming();
      if (!t || t.iterations === Infinity || an.playState === 'finished') continue;
      try { an.finish(); finished++; } catch { /* not finishable */ }
    }
  }
  return { finished, opBefore };
};

/** Read the rest state of `sel` without changing anything:
 *  { matched, op, left }. */
export async function restState(page, sel) {
  return page.evaluate(readRest, sel);
}

/** Finish `sel`'s arrival, give the page 120 ms (navtap's wait after the same
 *  move), and report { matched, op, left, finished, opBefore }. */
export async function settle(page, sel) {
  const f = await page.evaluate(finishArrival, sel);
  await page.waitForTimeout(120);
  return { ...f, ...(await restState(page, sel)) };
}

/** At rest: the element is there, nothing on its path is still animating, and
 *  it is fully opaque. 0.999 rather than 1 because opacity is a float product. */
export const atRest = (r) => !!r && r.matched > 0 && r.op != null && r.op >= 0.999 && r.left === 0;

const f3 = (x) => (x == null ? 'n/a' : Number(x).toFixed(3));
/** One line for a probe to print: settle()'s result names what it finished and
 *  the opacity before and after; restState()'s names only what it read. */
export const describeRest = (r) => {
  if (!r || r.matched === 0) return 'nothing matched';
  const tail = `${r.left} finite animation(s) still running`;
  return r.finished === undefined ? `opacity ${f3(r.op)}; ${tail}`
    : `${r.finished} arrival animation(s) finished; opacity ${f3(r.opBefore)} before, ${f3(r.op)} after; ${tail}`;
};
