// THE FORM WAITS FOR THE MEAL THAT EARNED IT — the evolution hold.
//
// Studio round 4, Job 11: the bite pays off on the swallow, and so does the
// form. capture() books the growth on the frame a prop is TAKEN, and the frame
// loop used to read the new form off the radius in that same frame, so the
// EVOLVED ceremony went off while the meal that earned it was still out at
// the rim. The ceremony now waits for that meal to be swallowed.
//
// ── WHY THE FORM IS WRITTEN DOWN AT THE BITE ────────────────────────────────
// In a real match the growth law runs at the top of every frame, before the
// drain, and its rate limiter sets the radius back to `lastR + maxStep` —
// where lastR was taken BEFORE that frame's captures (prototype3d.ts, the
// growth law). So the bump a bite gives lasts until the next frame; in each of
// qa/evohold.mjs's ten cases with the limiter on (five forms, 60 Hz and the
// 0.05 clamp) the radius was back under the threshold by the swallow. The
// first version of the hold (fe262dc) recomputed the form from the radius at
// the swallow, found nothing new, and let go without a ceremony; the form then
// waited for the law to cross the threshold by itself. The form a bite earned
// is the one stageFor() reads right after capture() grows the void — the
// frame the ceremony fired on before there was a hold — and that is the form
// held here and handed back on the swallow. qa/evohold.mjs steps it in node
// with the rate limiter on and off.
//
// ── THE RULES ─────────────────────────────────────────────────────────────
//   · A bite is held only when the form it earned is above every form already
//     shown (curStage, bestStage) or already earned by a bite that is still
//     owed. So the forms in `held` climb strictly in capture order, and the
//     bite held for a form is the FIRST one that crossed into it. A later bite
//     that crosses the same threshold again (because the law pulled the first
//     bump back) is not held at all, so a void eating every frame cannot keep
//     a form waiting past the first meal's swallow.
//   · When a held bite leaves the drain, its form is OWED. The ceremony block
//     moves to max(the radius's own form, the highest form owed), capped one
//     below the first bite still held: nothing above a form whose meal is
//     still in the air is shown, whether the radius, an owed form or the law
//     asks for it.
//   · `release` (the end beat) owes every held form at once.
//   · clear() forgets everything (a new match, a form bite that walks the
//     radius back down).
export interface EvoHold<M> {
  /** capture(), after the growth: the form stageFor() reads now, and the two
   *  stage counters as they stand. */
  bite(meal: M, earned: number, cur: number, best: number): void;
  /** the meal left the drain: swallowed, or taken out of the world mid-drain */
  down(meal: M): void;
  /** the form the ceremony block may move to this frame. `radiusForm` is
   *  stageFor(radius); `release` owes every held form now. */
  due(radiusForm: number, cur: number, best: number, release: boolean): number;
  clear(): void;
  /** QA: the forms still held, oldest first, and the highest one owed (0 if none) */
  state(): { held: number[]; owed: number };
}

export function createEvoHold<M>(): EvoHold<M> {
  const held: { meal: M; form: number }[] = [];
  let owed = 0;
  return {
    bite(meal, earned, cur, best) {
      const top = Math.max(cur, best, owed, held.length ? held[held.length - 1].form : 0);
      if (earned > top) held.push({ meal, form: earned });
    },
    down(meal) {
      for (let i = 0; i < held.length; i++) {
        if (held[i].meal !== meal) continue;
        owed = Math.max(owed, held[i].form);
        held.splice(i, 1);
        return;
      }
    },
    due(radiusForm, cur, best, release) {
      if (release) {
        for (const h of held) owed = Math.max(owed, h.form);
        held.length = 0;
      }
      // a form already on show owes nothing (a forced form, or QA setting the
      // form by hand) — forms in `held` climb, so only the front can be stale
      const shown = Math.max(cur, best);
      while (held.length && held[0].form <= shown) held.shift();
      if (owed <= shown) owed = 0;
      const want = Math.max(radiusForm, owed);
      return held.length ? Math.min(want, held[0].form - 1) : want;
    },
    clear() { held.length = 0; owed = 0; },
    state() { return { held: held.map((h) => h.form), owed }; },
  };
}
