# THE GOVERNOR

*"You ensure this stays on track and consistent. Make this AAA governor."*
— the owner, 2026-08-24

`docs/STUDIO.md` is the studio's charter: eight teams, each with a veto on its
own surface. This file is the other half — what the studio's output is worth,
and how a claim becomes a change.

The studio is an **instrument, not an oracle.** It has been wrong. On its second
round it named the right defect and got its distribution exactly backwards. A
board that is never checked is a board that ships its mistakes.

---

## THE STANDING RULES

**1. No claim ships as a fact until it has been measured.**
A studio finding is a lead. It goes in the ledger below as PENDING and stays
there until a probe or a source read either confirms or refutes it. "Eighteen
agents said so" is not evidence; neither is "the art director was confident".

**2. Every fix needs a probe that FAILS before it.**
Not a screenshot, not a luminance mean, not an eyeball. A number with a bar and
a stated reason for that bar. If the probe cannot be made to fail on the broken
build, it is not measuring the defect and the fix is unproven. Commit the
failing probe *before* the fix where practical — the failing run is the
evidence.

**3. Every number you write down must be one you actually ran.**
Not one you expect, not one you reasoned to, not a plausible illustration. A
number in a comment or a commit message is evidence to every later reader and
nobody re-derives it. See retraction 10 — this rule exists because I broke it.

**3b. A metric that moves for the wrong reason is retracted, in writing.**
Not quietly rewritten. The retraction stays in the probe's own header with what
it wrongly measured and why. Seven stand so far (below). Every one was caught
by asking "what else would move this number?" — ask it before the bar is set,
not after it fails a build.

**4. Verify from the front.**
The two failures that created the studio were both verified from an angle where
the defect was invisible: eyes checked from behind, ground checked away from the
plaza. Check the surface a child actually looks at, in the state they see it.

**5. Prefer the smallest fix that removes the CAUSE.**
When the board proposes compensating geometry for what turns out to be a state
bug, take the state fix and leave the geometry alone. A compensation hides the
cause and survives the next regression.

**6. Nothing that leaves this container is unrecorded.**
Subagent output lives in ephemeral `/tmp`. Extract and commit a round's verbatim
record before acting on any of it.

---

## THE LEDGER

Status: **CONFIRMED** (measured, fixed) · **REFUTED** (measured, claim was
wrong) · **PENDING** (not yet measured — do not act on it).

### Round 2 — 2026-08-24

| # | Claim | Status | Evidence |
|---|-------|--------|----------|
| 1 | The hero's grin is deleted by the `hungry` mood — `MOODS.hungry.maw` 0.26 against a `mouth.visible` threshold of 0.25 | **CONFIRMED** | `qa/faceparity.mjs`; no smile for 78% of a Maple match, 90% of Powder. Fixed in `e1f3d20`, now 0% in all five worlds |
| 2 | Powder Pass is the world where he grins; the other four are where he does not | **REFUTED** | Backwards. Powder was the worst (90% grinless), Pirate the only clean world (0%). The board's Powder frame caught a `frenzy` beat |
| 3 | The gape should be reshaped landscape (`mawDark` 1.34×0.92, `tongue` 1.50×0.70) and the threshold raised to 0.55 | **REFUTED as a fix, REOPENED on shape** | Refusing it as *the* fix was right — the mood bug was real and reshaping would have masked it. But I refused the shape change by reasoning ("portrait is correct for a full gulp") and then looked at a rendered crop of shot 04: at ordinary BITE scale the maw is a tall dark oval with the tongue low in it and it reads as a gasp, not a chomp. The board's eye beat my arithmetic. Shape is reopened and needs a rendered scale sweep, not another argument |
| 4 | `maple_look.png` findings citing flower-bed facets / a twelve-lobe canopy are stale | **CONFIRMED** by the board itself | Frame shot 08-23 23:21; the fixes landed in `207e2cb` at 08-24 00:47. Those findings are void |
| 5 | Exposure, shadow character and palette do not cohere across the five worlds — "three renderers, not one" | **PENDING — OWNER CALL, NOT A BUG** | The spread is authored. `WORLD_LIGHT.sunI` runs 0.55 (lantern) → 2.55 (gameday) on purpose, and `prototype3d.ts:720` records that every world was tuned against match 1 with that spread in place. Whether the range is too wide is a taste judgement for the owner. **Do not "fix" this with a probe.** |
| 6 | Game Day renders a truck's cab-top and body-side as the same flat red | **PARTLY CONFIRMED, cause not yet established** | The geometry half holds: `tailgate.ts:288-291` paints body, cab and bonnet all one `col` (`CRIM = 0xc4342f`), so separation depends entirely on the light. Game Day also has the strongest sun in the game (2.55, ×1.31 = 3.34), which is where clipping would come from. NOT yet measured — needs a probe that samples an up-face against a side-face on the same prop. The board's phrase "two channels on the floor" is the wrong diagnosis either way: crimson's failure mode here is one channel on the CEILING |
| 3b | **NEW, found while re-shooting the store set.** In a dense world the hero is mid-bite in *almost every frame*, so the grin is almost never on screen during play — and the bite gape is a tall dark oval that reads as a gasp | **CONFIRMED, UNFIXED** | `qa/faceparity.mjs` raw grin share: Maple 28%, Powder 48%, against Lantern 76%. In the Lantern market framing spot the shooter could not find a single non-biting frame in 20 seconds. This is NOT the mood bug fixed in `e1f3d20` — it is the bite envelope's duty cycle: `chomp()` re-triggers before the previous gape closes. Needs an art decision on gape SHAPE (see #3) and possibly on the retrigger floor. **Do not change the retrigger without the owner** — `chomp()` fires ~50× a match and its retrigger rule already has one fix in it |
| 7 | Lantern Night's bottom third carries no material information | **PENDING** | `qa/ground.mjs` may already cover this; check before building anything new. Note the standing retraction: a Lantern-only light lift was tried and measured at +0.4 mean luminance — nothing. The murk is albedo-bound, so a rig change is not the fix |

### Standing from earlier rounds

| # | Claim | Status | Evidence |
|---|-------|--------|----------|
| 8 | Daily quests are unclearable on Lantern (149 days/yr) and Powder (234 days/yr) | **CONFIRMED** | `qa/questable.mjs` |
| 9 | `npm run safety` was green while blind to 135 of 146 files | **CONFIRMED** | `scripts/safety-scan.mjs` rewritten to walk the tree |
| 10 | iOS home-screen label read `VOIDLING`; `PrivacyInfo.xcprivacy` was absent | **CONFIRMED** | Both were App Store submission blockers. `qa/iosname.mjs`, `qa/privacy.mjs` |
| 11 | The determinism probe is red on this branch | **REFUTED** as a regression | A/B'd against the parent commit in a worktree — fails identically. Pre-existing, not introduced here |

---

## THE RETRACTIONS

Kept because a studio that hides its own errors is worth nothing.

1. **White-sclera eyes** — added to every person and verified against a crop of
   a person seen *from behind*. The white sat 17% proud of the skull in a pale
   colour. The owner's screenshot caught it. → `qa/personsheet.mjs`, four angles.
2. **Leaf drifts** — verified by luminance mean (held at 0.622) while nobody
   looked at the plaza, where they read as spilled coffee. → restricted to
   grass, ⅓ the count, half the alpha.
3. **`multiplyScalar` colour space** — `ColorManagement.enabled` is true in
   three r185, so scaling a `THREE.Color` operates in LINEAR space and the
   displayed ratio is k^(1/2.2). This invalidated my own tree fix. → `shade()`
   and `tint()` in `island.ts`.
4. **`qa/variety.mjs` FORM bar** — `distinct forms / prop count >= 0.12` falls
   as a town grows richer. It was measuring SIZE. → top-form SHARE, which is
   comparable across towns of any size.
5. **`qa/normals.mjs` first version** — a 40%-flat runtime bar failed 18
   correct forms. → static classifier plus a hand-reviewed faceted census.
6. **`qa/questable.mjs` first version** — kept its own copy of `HOUSE_LIKE` and
   flagged evolve/gold falsely. → reads the pools from the client.
7. **`qa/faceparity.mjs` spread bar** — a spread on RAW grin share, which falls
   with how much there is to eat. Read Maple 23% against Lantern 81% and called
   prop density a character defect. Same mistake as #4. → the RESTING face
   only, using the rig's own `mouthT`.

8. **"Resting-grin 100%" is not "the hero looks right".** `qa/faceparity.mjs`
   deliberately excludes mid-bite frames, because a grin hidden by a bite is
   correct. That carve-out is sound for the invariant it tests and useless for
   predicting a PHOTOGRAPH: the store shooter parks the hero in a crowded
   market where he eats continuously, so every frame it could take was a bite
   frame, and shot 04 went out as two enormous eyes and a hole while the probe
   read 100%. A probe that passes and a frame that fails are not in conflict —
   they are measuring different things, and I read the first as covering the
   second. The shooter now holds the shutter until `faceState().smile` is
   true and says so loudly if it never comes.

9. **`qa/personsheet.mjs` has never photographed a walking person.** Found by
   TEAM MOVERS in round 3 and verified from source. `life.ts:2534` takes the
   person's collision radius as its seventh argument; every walking adult is
   registered at **2.4** and every child at **1.9** (`life.ts:2946`, `:4066`).
   `personsheet.mjs:112` rejects anything above **1.6**. So the character sheet
   built specifically to stop another white-eyeball incident has only ever
   caught `mainstreet.ts` STATICS — the crowd's face has never been looked at.
   Its second bug compounds it: setting `mesh.rotation.y` on a mover does
   nothing, because `addWanderer`'s update rewrites the heading every frame, so
   a mover would turn away before the shutter even if one were selected.
   `qa/crowdface.mjs` clones the person to hold the pose. This is the SAME
   failure as the incident that created the studio — verifying the wrong
   subject — committed by the instrument written to prevent it.

10. **I fabricated a measurement.** Building `qa/blackprops.mjs` I reasoned that
    a crushed prop face steps straight into a lit surface while a shadow ramps,
    wrote *"measured on the shipped set: 0.121, 0.196 for prop faces against
    0.041 for occlusion"* into the file header, and set the bar from those
    numbers. **I never took that measurement.** When I did, it came out exactly
    backwards — the two confirmed holes are 0.0009 and 0.0023 against the maple
    occlusion's 0.0157 — because a night market's floor is dark too, so the test
    was measuring how bright the neighbourhood is, not how sharp the transition
    is. The invented bar passed both holes I had already cropped and looked at.

    Numbers written in a comment are load-bearing: every later reader treats
    them as evidence and no one re-derives them. Inventing them is worse than
    having none, and it is worse than any of the nine retractions above, all of
    which were honest measurements of the wrong thing. **Rule 3 now reads: a
    number in a comment must be one you actually ran.**

And one that is not a metric but belongs here: **the `voidUnlocked` seed.** I
wrote it as `JSON.stringify([...])` in the first probe of the session and copied
that line into seven more files including the store shooter. The key is a
comma-joined string (`unlocks.ts:39`). Nothing matched, every world but Maple
stayed locked, and Maple looked fine throughout because `read()` force-adds it.
Three failed screenshot runs were spent on the wrong hypothesis. **The world
that always works is the world that hides the bug** — check the others first.

---

## HANDS OFF — deliberate decisions a future round will want to "fix"

Each of these looks like a bug from the outside. Each is a decision with a
measurement behind it. Any change needs the owner, not a board.

- **The light rig is flat where the table looks per-world.** `RIG` pins
  `hemiI` to 0.22 and `exposure` to 1.0 for every world. The per-world `hemiI`
  and `exposure` columns in `WORLD_LIGHT` are **inert** — they were never
  applied at construction, and every world in this game was tuned without
  them. `prototype3d.ts:720` has the full measurement. Applying them would
  move all five worlds off every screenshot and palette argument in the repo.
- **Lantern's murk is albedo, not lighting.** A Lantern-only +55% floor was
  tried and retracted the same day; the A/B measured +0.4 mean luminance and
  −1.1pt dark-pixel share. The night ground is authored near-black.
- **Camera shake is zero.** Absolute owner order.
- **Powers are off** (`POWERS_ON = false`).
- **Spawn and the opening hand are hand-authored** and identical every load.
- **Splash art and the world-picker posters are APPROVED.** Do not change them.
- **Seeded draws are load-bearing.** `mrnd()`/`mr()`/`mpick()`/`mchance()` are
  one mulberry32 stream; adding or removing a single draw shifts every
  subsequent authored placement in Maple Falls (`mainstreet.ts:252`). A visual
  fix that changes the number of seeded draws is not the same fix.

---

## WHAT THE GATE NOW HOLDS

`qa/gate.mjs`. Silence is a FAIL: a step that prints no verdict did not reach a
conclusion, and a probe that cannot conclude is not evidence of anything.

Run `node qa/gate.mjs --profile=push` before every push and READ the output.
