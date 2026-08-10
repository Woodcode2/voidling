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
// who registered each colour, for the collision warning below
const GLOSS_OWNER = new Map<number, string>();

/** Seed the lookup: a colour that always means metal, everywhere it is used.
 *  Each art module registers its own named palette at import time, which is
 *  how a hundred STEEL poles get a highlight without a hundred edits.
 *
 *  `who` is the registering module. It exists for the warning below and costs
 *  one string per call site.
 *
 *  ── WHY THE WARNING EXISTS ───────────────────────────────────────────────
 *  This map is GLOBAL, keyed by raw colour, written by five art modules at
 *  import time, and it is last-write-wins. Two modules that happen to pick the
 *  same hex for different materials therefore fight, and the winner is decided
 *  by module evaluation order — which is decided by an import cycle nobody is
 *  thinking about while naming a colour.
 *
 *  That is not hypothetical. Game Day's GOLD (0xf0b429, registered 0.50) and
 *  Main Street's FAIR_C are the same hex. Adding FAIR_C at 0.28 to Maple's
 *  table silently demoted every gold surface in the STADIUM, and the only
 *  reason it was caught is that qa/glosscov.mjs happened to be watching Game
 *  Day's strong fraction, which fell from 27.1% to 17.9% in a commit that was
 *  supposed to touch autumn leaves.
 *
 *  A conflicting re-registration is nearly always a mistake, so it says so. An
 *  identical one is just two modules agreeing and is silent. When a colour
 *  genuinely IS two materials, the fix is glossy() in island.ts, which
 *  overrides one part rather than the whole palette. */
export function registerGloss(entries: [number, number][], who = '?'): void {
  for (const [c, g] of entries) {
    const v = Math.max(0, Math.min(1, g));
    const had = GLOSS_BY_COLOR.get(c);
    if (had !== undefined && had !== v) {
      console.warn(`VOIDLING gloss collision on #${c.toString(16).padStart(6, '0')}: `
        + `${GLOSS_OWNER.get(c) ?? '?'} set ${had}, ${who} now sets ${v}. `
        + `Last import wins — use glossy() for a per-part override instead.`);
    }
    GLOSS_BY_COLOR.set(c, v);
    GLOSS_OWNER.set(c, who);
  }
}

/** What part() stamps on a vertex for this colour. 0 = matte, the default. */
export function glossOf(col: number): number {
  return GLOSS_BY_COLOR.get(col) ?? 0;
}
