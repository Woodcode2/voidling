import { CONFIG, type SkinDef } from './config';
import { growRadius } from './utils';

// v15 §0: Growth Law — engine sets elapsed each tick so grow() can enforce the ceiling
let _roundElapsedSec = 0;
export function setRoundElapsed(ms: number) { _roundElapsedSec = ms / 1000; }

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
  // v15 §0: Growth Law enforced here — maxRadius(t) = GROWTH_LAW_BASE + GROWTH_LAW_RATE × t
  protected grow(addedArea: number) {
    const lawCeiling = CONFIG.GROWTH_LAW_BASE + CONFIG.GROWTH_LAW_RATE * _roundElapsedSec;
    if (this.radius >= lawCeiling) {
      console.log(`[LAW] clamped ${this.name || 'void'} at t=${_roundElapsedSec.toFixed(1)}`);
      return; // score is granted by caller; only growth is blocked
    }
    // Compute uncapped growth first so we can detect overshoot before clamping
    const uncapped = growRadius(
      this.radius,
      addedArea * this.underdogGrowth,
      CONFIG.DIMINISH_BASE,
      CONFIG.MAX_RADIUS,
    );
    if (uncapped > lawCeiling) {
      console.log(`[LAW] clamped ${this.name || 'void'} at t=${_roundElapsedSec.toFixed(1)}`);
      this.radius = lawCeiling;
    } else {
      this.radius = uncapped;
    }
  }

  // v15 §0: orbit parity — deferred absorb queue shared by player and bots
  // Items sit in the queue for ORBIT_SPIRAL_DUR ± 200ms before growth is applied.
  protected _captureQueue: Array<{area: number; score: number; timer: number}> = [];

  captureObject(objSize: number, scoreGain: number) {
    if (this._captureQueue.length >= CONFIG.ORBIT_MAX) {
      // capacity full: finalize oldest immediately so queue never exceeds cap
      const oldest = this._captureQueue.shift()!;
      this.grow(oldest.area);
      this.score += oldest.score;
      this.advanceForms();
    }
    // jitter duration 1600–2000ms around the nominal spiral dur
    const dur = CONFIG.ORBIT_SPIRAL_DUR + (Math.random() - 0.5) * 400;
    this._captureQueue.push({ area: Math.PI * objSize * objSize * 0.5, score: scoreGain, timer: dur });
  }

  tickCaptures(dt: number) {
    for (let i = this._captureQueue.length - 1; i >= 0; i--) {
      this._captureQueue[i].timer -= dt;
      if (this._captureQueue[i].timer <= 0) {
        const it = this._captureQueue.splice(i, 1)[0];
        this.grow(it.area);
        this.score += it.score;
        this.advanceForms();
      }
    }
  }

  // ── SHARED ABSORB RULES: object intake and void intake are area-based ─────────
  absorbObjectMass(objSize: number) { this.grow(Math.PI * objSize * objSize * 0.5); }
  absorbVoidMass(otherRadius: number) { this.grow(Math.PI * otherRadius * otherRadius * 0.5); }
  // v13 §0: bot-on-bot eats transfer only 25% mass (vs 50% for player-involved chomps)
  absorbVoidMassBotOnBot(otherRadius: number) { this.grow(Math.PI * otherRadius * otherRadius * 0.25); }
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
