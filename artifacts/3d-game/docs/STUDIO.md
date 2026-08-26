# THE STUDIO

*"I want a full billion-dollar team that can do its due diligence, vet, and fix.
Nothing sub-par passes them. They're always asking: is this the best visually? If
not, they figure out how to get there."* — the owner, 2026-08-23

This file is the charter. `.claude/workflows/studio.js` is the runnable version.

---

## Why a studio and not another audit

The release gate (`docs/RELEASE-GATE.md`) catches what somebody already thought
to measure. The nine-lens audit catches what nothing measures yet. Neither
catches **"this is not good enough"**, because that judgement needs an owner —
a named party whose whole job is one surface, who knows what the best in the
world looks like on that surface, and who is allowed to say no.

Two failures on 2026-08-23 are the reason this exists, and both are the same
failure:

- Eyes were added to every person in the game and "verified" against a crop of
  a person seen **from behind**. The owner's next screenshot showed white balls
  stuck to the sides of their heads. Nobody looked at a face.
- Leaf litter was added to the ground and measured for exposure — the mean held
  at 0.622, which was the number being watched. On the pale plaza it read as
  spilled coffee. Nobody looked at the plaza.

Both passed every gate in the repo. A gate cannot see "that looks wrong". A
person whose only job is that surface can.

---

## The teams

Each team owns a surface, carries a bar drawn from a shipped title, and has a
veto on its own surface. A team's verdict is **SHIP** or **NO-SHIP**, and
NO-SHIP blocks — the fix is found, not argued away.

| team | owns | files |
|---|---|---|
| **STATIC** | everything that stands still: buildings, landmarks, trees, bushes, signage, street furniture | `island.ts` prop builders, `mainstreet.ts`, `luxe.ts`, `alpine.ts`, `nightmarket.ts`, `tailgate.ts` |
| **MOTION** | everything that moves: crowds, vehicles, animals, rivals — their silhouettes, poses, variety | `life.ts`, `rivals.ts` |
| **GROUND** | the largest surface in every frame: the bake, biomes, roads, water, decals, the shader detail layers | `island.ts` bake, `palette.ts` |
| **LIGHT** | lighting rigs, sky, fog, exposure, the grade, per-world colour | `prototype3d.ts` `WORLD_LIGHT` + grade, `island.ts` sky |
| **HERO** | the void: body, face, moods, rings, skins, and how it reads against every world | `void3d.ts` |
| **UI** | HUD, menus, type, layout, safe areas, taps, flow | `index.html`, HUD code in `prototype3d.ts` |
| **CHOREOGRAPHY** | timing: anticipation, settle, transitions, how many channels answer an action | `prototype3d.ts` match loop and fx |
| **AUDIO** | score, SFX, mix, the cover pad, what a world sounds like | `audio3d.ts` |
| **PLAY** | what it is like to PLAY this: firing rates, repetition, punishment, the words a child reads. The only team forbidden to file an art finding | `prototype3d.ts` match loop, `rivals.ts`, `newsroom*.ts`, `fx.ts` |

### Why there is a ninth team

*"Get a team also on quality."* — the owner, 2026-08-25, after playing a build.

The first eight own SURFACES, and the evidence that this is not enough is not an
argument, it is a list. The owner's own six items were:

1. the void "turns whitish" when about to be eaten — a mood tell that does not read
2. can other voids eat him, and is there a penalty — a rule nobody could tell
3. the island edge glitches and sometimes speeds you up — a collision response
4. rings keep popping up behind you — an effect firing 186 times a minute
5. the news keeps calling him "the hole" — 74 strings
6. space does not look like space — the only one of the six that is art

**Five of six were behaviour or words. Not one was found by a surface team**, and
several had been in the game for weeks under a studio that already had veto
power. A team that reviews pictures cannot find a collision response that
accelerates, an effect firing three times a second, or a newsroom calling the
protagonist by the wrong noun seventy-four times.

TEAM PLAY closes that gap, and its brief forbids it an art finding precisely so
it does not drift back into the comfortable half of the job.

And above them:

| role | job |
|---|---|
| **ART DIRECTION** | one question only: *does this read as one game?* Cross-team coherence — a beautiful tree in a world lit for a different palette is a defect, and it belongs to nobody else. |
| **THE GOVERNOR** | sequences the work, resolves conflicts between teams, decides what ships, and is accountable for the mandate. This is me. |

---

## The implementation arm — CREWS

*"Build the right teams to implement everything you suggested."* — the owner,
2026-08-26.

The nine teams REVIEW. For their first three rounds, every confirmed finding
then waited for the governor to implement it serially, which made one person
the bottleneck on a board the studio could fill faster than he could drain.

The evolution is the pipeline that already worked once (the chalet, the stall,
the snowman — 2026-08-26): for each confirmed finding, a **crew** is spun up
that produces an EXACT PATCH against HEAD — file, lines, replacement code,
seeded-draw accounting, triangle cost — and an independent **skeptic** whose
only job is to kill that patch by reading the real files at the cited lines.
Verdicts are SOUND / SOUND WITH CORRECTIONS / KILLED. The governor lands only
the survivors, applies the skeptic's corrections, builds once, reshoots the
pack once, and every gate runs before main moves.

The record so far, which is why the skeptic phase is not optional:

- the chalet crew's patch shipped nearly verbatim — after its skeptic killed a
  door hood that was occluded at every camera pitch the game has, and caught a
  window offset that reaches zero overlap at roof pitch 31.8°
- the planter fix the review proposed was measured to be a NO-OP (52.5% of the
  barrel shaded before, 50.0% after); the crew process replaced it with the
  hoops that actually fixed it
- the snowman fix the review proposed would have cut accent pixels 79% on half
  the population; the skeptic's measurement shrank it to one number

**Crew constraints are hard, and the skeptic checks each by reading code:**
1. The camera looks down 46–65°: identity lives on horizontal surfaces.
2. Seeded draws (`mrnd`/`mr`/`mpick`/`mchance`) are one stream: a patch adds
   exactly as many draws as it removes, in the same order. Changing a draw's
   candidate list is stream-safe; changing the count is not.
3. One mesh: no new draw calls, materials, or textures.
4. `qa/roundlod.mjs` is a ratchet: no new single-digit spheres.
5. Triangle costs are stated, in tens not hundreds; Game Day is near its
   memory ceiling.

## The four rules

**1. LOOK AT THE PIXELS.** No team may report on a surface it has not seen
rendered. `qa/lookbook.mjs` builds the evidence pack — play frames for all five
worlds, the character sheet at four angles, the ground bake — and every team
reads the images that show its own surface. The eyes shipped because code was
read and a face was never looked at.

**2. NAME THE BAR.** *"It looks cheap"* is not a finding. *"Alto's Odyssey
tripled its asset count and called the whole job taming that chaos; our canopy
is seven spheres and the eye resolves each one"* is a finding. Every verdict
cites a shipped title and what it does mechanically.

**3. THE FIX, OR THE PATH TO IT.** A team that says NO-SHIP owes either the
smallest change that closes it, or — when it does not know yet — the experiment
that would find out. "Figure out how to get there" is the job, not an excuse.

**4. A GATE, OR IT COMES BACK.** Every accepted fix ships with a probe in `qa/`
that fails on the build before it. This is the house rule and the studio does
not get an exemption from it.

---

## The standing question

Every team, every pass, on its own surface:

> **Is this the best this can be? If not, what is between here and there?**

A team that answers "yes, this is the best it can be" must say why it believes
that, against the bar it named. Comfortable silence is the failure mode this
whole structure exists to prevent.

---

## Running it

```bash
node qa/lookbook.mjs           # build the evidence pack first — teams need pixels
```
then invoke the studio workflow (`.claude/workflows/studio.js`) with the target
surface, or all of them.

The studio does not replace the release gate. Order before going live:

1. `node qa/gate.mjs --selftest` — the gate can still fail
2. the studio — every team SHIP, or the NO-SHIPs are closed
3. `node qa/gate.mjs` — the LIVE profile, green
4. the owner's phone, which outranks all three
