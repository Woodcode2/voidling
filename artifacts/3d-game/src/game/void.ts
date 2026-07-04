import { CONFIG, type SkinDef } from './config';
import { growRadius } from './utils';

// ─────────────────────────────────────────────────────────────────────────────
// v9 §1 — ONE VOID CLASS. Fairness by architecture: the player and every bot are
// instances of this single class and share the EXACT same functions for growth
// (diminishing curve), absorb rules, size cap, the evolution ladder, leader decay,
// underdog aura, respawn-eat rules, and event effects. Controllers differ (human
// input vs AI) — physics and rules do not. There is no bot-specific growth,
// scoring-to-size, or size-cap code path anywhere; all of it lives here.
// ─────────────────────────────────────────────────────────────────────────────
export abstract class Void {
  x = 0; y = 0; prevX = 0; prevY = 0;
  vx = 0; vy = 0;                          // px/s
  radius = CONFIG.PLAYER_BASE_RADIUS;
  score = 0;

  // evolution form ladder — index into CONFIG.FORMS; only ever goes up in a round
  formIndex = 0;

  // shared status
  ghostTime = 0;

  // v9 §3: body-morph crossfade — ms remaining of the 500ms tween into a new form
  morphTime = 0;

  // catch-up economy (v6 §2) — identical rules for player + bots
  underdogSpeed = 1;
  underdogGrowth = 1;
  underdog = false;

  // per-frame event effect (firetruck water / storm), reset each frame by events
  eventSlow = 1;

  // identity
  skin: SkinDef;
  name = '';

  constructor(skin: SkinDef) {
    this.skin = skin;
  }

  get ghost() { return this.ghostTime > 0; }
  get formName() { return CONFIG.FORMS[this.formIndex].name; }

  // v9 §3: 0 at the instant of evolving → 1 when the body morph has fully settled
  get morph() { return CONFIG.EVO_MORPH_MS > 0 ? 1 - this.morphTime / CONFIG.EVO_MORPH_MS : 1; }

  // v9 §3: called from each controller's update() to advance the morph crossfade
  tickMorph(dt: number) { if (this.morphTime > 0) this.morphTime = Math.max(0, this.morphTime - dt); }

  // being chomped / decayed can never demote below a form already reached
  get formFloor() {
    return Math.max(CONFIG.PLAYER_BASE_RADIUS, CONFIG.FORMS[this.formIndex].radius);
  }

  // mass model: a void's "mass" is its disc area (used for growth + debug logging)
  get mass() { return Math.PI * this.radius * this.radius; }

  // ── SHARED GROWTH: single diminishing curve + hard size cap (v7 §1 math) ──────
  // Everything that makes a void bigger funnels through here, so no controller can
  // grow faster than another for the same intake.
  protected grow(addedArea: number) {
    this.radius = growRadius(
      this.radius,
      addedArea * this.underdogGrowth,
      CONFIG.DIMINISH_BASE,
      CONFIG.MAX_RADIUS,
    );
  }

  // ── SHARED ABSORB RULES: object intake and void intake are area-based ─────────
  absorbObjectMass(objSize: number) { this.grow(Math.PI * objSize * objSize * 0.5); }
  absorbVoidMass(otherRadius: number) { this.grow(Math.PI * otherRadius * otherRadius * 0.5); }
  // flat merge growth (a TRIPLE) still runs through the shared curve
  absorbMergeMass(area: number) { this.grow(area); }

  // ── SHARED EVOLUTION LADDER: forms only go up; optional per-step callback ─────
  protected advanceForms(onEvolve?: (formIndex: number) => void) {
    while (
      this.formIndex < CONFIG.FORMS.length - 1 &&
      this.radius >= CONFIG.FORMS[this.formIndex + 1].radius
    ) {
      this.formIndex++;
      this.morphTime = CONFIG.EVO_MORPH_MS; // v9 §3: kick off the body morph crossfade
      onEvolve?.(this.formIndex);
    }
  }

  // ── SHARED LEADER DECAY: above DEVOURER the leader slowly bleeds mass, but
  // never below its reached form floor. Returns how much radius was shed. ────────
  applyLeaderDecay(dtSec: number): number {
    if (this.formIndex < CONFIG.DEVOURER_FORM_INDEX) return 0;
    const before = this.radius;
    this.radius = Math.max(this.formFloor, this.radius * (1 - CONFIG.LEADER_DECAY_RATE * dtSec));
    return before - this.radius;
  }

  // ── SHARED UNDERDOG AURA: 5th place onward gets the same speed + growth boost ─
  setUnderdog(under: boolean) {
    this.underdog = under;
    this.underdogSpeed = under ? 1 + CONFIG.UNDERDOG_SPEED : 1;
    this.underdogGrowth = under ? 1 + CONFIG.UNDERDOG_GROWTH : 1;
  }

  // ── SHARED RESPAWN-EAT RULE: losing a fight sheds mass to the same fraction,
  // floored at the reached form. ───────────────────────────────────────────────
  protected shrinkOnEaten() {
    this.radius = Math.max(this.formFloor, this.radius * CONFIG.RESPAWN_MASS_FRAC);
  }
}
