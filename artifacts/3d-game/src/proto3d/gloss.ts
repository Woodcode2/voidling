// ══ THE SPECULAR PALETTE ═══════════════════════════════════════════════════
//
// Which colours in this game are METAL, GLASS or WATER, and how much. The
// shader that consumes this lives in island.ts (installPropShader) along with
// the argument for why per-vertex is the only way to do it inside a kit that
// bakes one material per merged prop; this file is only the table.
//
// IT IS ITS OWN MODULE FOR A HARD REASON, not for tidiness. island.ts imports
// nightmarket, tailgate, luxe and mainstreet, and all four of them import
// island back — a cycle that has always been harmless because everything they
// take from it (part, mergedProp, PROP_SHARED_MAT) is either a hoisted
// function declaration or a value read at CALL time. A `registerGloss(...)`
// at the top of tailgate.ts is different: it runs during module evaluation,
// and under the cycle tailgate's body runs BEFORE island's, so a module-scope
// `const` map in island.ts would still be in its temporal dead zone. The game
// would throw a ReferenceError on boot, in every world, before the first frame.
// A leaf module with no imports of its own always evaluates first, so the map
// exists before anyone can register into it.
const GLOSS_BY_COLOR = new Map<number, number>();

/** Seed the lookup: a colour that always means metal, everywhere it is used.
 *  Each art module registers its own named palette at import time, which is
 *  how a hundred STEEL poles get a highlight without a hundred edits. */
export function registerGloss(entries: [number, number][]): void {
  for (const [c, g] of entries) GLOSS_BY_COLOR.set(c, Math.max(0, Math.min(1, g)));
}

/** What part() stamps on a vertex for this colour. 0 = matte, the default. */
export function glossOf(col: number): number {
  return GLOSS_BY_COLOR.get(col) ?? 0;
}
