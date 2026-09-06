# STREAM D — COLOUR AND POP

*The governor, directing. Round 7, stream D of the polish plan. Every number here was
measured — ours from rendered frames in this tree, theirs from the owner's screenshots and
recording, both with the same script (`recon/self/self.py`). Where a number is a target it
says so. The builder works from this document; the probe in §6 is written before the build
and must fail first.*

**Standing constraints.** The void stays a creature, not a hole — this stream gives him a
lit rim in his own skin colour, which is not the same thing as making him an absence. No
ads. 4+ stays 4+. `node qa/gate.mjs --profile=push --port=4177` green at every commit.

---

## 0. THE VERDICT AND THE DIAGNOSIS

The owner:

> "The items, there's so much color and pop, and there's simplicity behind it."

The diagnosis is not what it looks like. It is not that their colours are better. It is:

> **Pop is a gap, not an amount. They stage saturated objects on a neutral ground; we
> mostly stage saturated objects on a saturated ground, so nothing separates.**

And the second half, which is the good news:

> **We already do it correctly in one world.** GAME DAY's parking lot is 70% near-neutral
> with its trucks and coolers on top — a *better* stage ratio than Hole.io's city. The
> mechanism runs in our engine today. Five worlds do not use it.

---

## 1. WHAT IS ACTUALLY THERE — MEASURED

Spawn frame, t = 5 s, HUD bands excluded, chroma = (max−min)/255. "Stage" is the share of
the playfield below chroma 0.12; "actors" the share above 0.35. Their two frames measured
by the identical script.

| frame | stage (<0.12) | actors (>0.35) | value median | chroma median | reading |
|---|---|---|---|---|---|
| **HOLE.IO city** | **52.3%** | **25.9%** | 0.69 | 0.098 | the target |
| **HOLE.IO flowers** | **61.4%** | 13.4% | 0.89 | 0.055 | the target, bright variant |
| MAPLE FALLS | 26.2% | 37.7% | 0.68 | 0.227 | saturated stage — the grass is a prop colour |
| PIRATE COVE | **14.7%** | **11.0%** | 0.73 | 0.192 | warm sand competes, and few actors on it |
| GAME DAY | **70.0%** | 15.8% | **0.33** | 0.063 | **right ratio, too dark** |
| LANTERN NIGHT | 61.7% | **2.8%** | **0.25** | 0.110 | neutral but unlit — nothing to pop |
| POWDER PEAK | 35.5% | **1.8%** | 0.68 | 0.149 | pale stage, almost no actors |
| SKYLARK FIELD | 16.6% | **48.2%** | 0.45 | 0.341 | the field is one saturated green |

**Six worlds, four different failures.** A single global rule would fix none of them and
break two. The bars in §5 are therefore stated per world.

Other measured facts that shape this stream:

| Fact | Ours | Theirs | Where |
|---|---|---|---|
| Void's body, lit vs shade | **2.04:1** (value 0.85 / 0.42) | 2.09:1 on a bench, 2.54:1 on a canopy | `recon/self/maple-spawn-t5.png` / §2 L5 |
| Void's rim | **none** — a shader lip held at ~2.5 px | a lit torus, **13.4% of its diameter**, three tones, 9.12:1 against its interior | `void3d.ts:246` / §2 L6 |
| Void on screen at spawn | 17.8–20.7% of width | **22.6%** | `recon/self/*-spawn-t5.png` / §2 L4 |
| Prop materials | **single-tone** vertex colour under the light rig | **two tones per material**, ~2:1 | `island.ts:3973` / §2 L5 |
| Shade | **hue-shifted already** — cool fill (`0x9fc8ff`) against a warm key | hue-shifted: foliage 160°→173°, ground shadow 330°→251° | `prototype3d.ts:793` / §2 L5 |
| Display type | one layer: stroke, no gradient fill | **three**: gradient fill + stroke at 67% of the fill's area + shadow | `index.html:128` / §2 L7 |

Two of those rows are already right and must not be "fixed": **our void's body is already
two-toned at the correct ratio**, and **our shade is already hue-shifted** because we light
with a real rig rather than multiplying colours down. The gap is the stage, the rim, the
prop materials and the type.

---

## 2. WHERE THEIR COLOUR IS WEAK

| # | Their weakness | Measured | Ours to take |
|---|---|---|---|
| 1 | **No texture anywhere.** Flat colour per face. | §2 L10 | We have a real light rig and shadow maps; we can be richer without being noisier |
| 2 | **One lighting mood per map.** No time of day, no weather. | all ten frames | We have six worlds with their own suns — LANTERN's night is a thing they cannot do at all |
| 3 | **The ground is a stage and nothing more.** It carries no information. | §2 L1 | Our districts already mean something; a neutral ground can still read as park, lot, quad |
| 4 | **Their shade is applied per material, not per scene.** Consistent, but no bounce, no coloured light. | §2 L5 | Our fill light is coloured per world and already does this better |

The instruction for this stream is therefore narrower than "make it look like Hole.io":
**take the stage ratio and the two-tone material; keep our rig, our shadows, and our six
moods.** Where we already beat them, do not regress to match them.

---

## 3. THE DESIGN

### 3.1 The stage, per world

Desaturate the ground **toward its own hue's grey**, never to grey. Maple's park stays
green — a pale, chalky green at chroma ~0.15 instead of 0.44. The district still reads as
park, lot, quad or runway; it stops competing with the objects standing on it.

Four different jobs:

- **MAPLE, SKYLARK** — the stage is too saturated. Desaturate the ground 50–70% toward its
  own hue. Prop palettes untouched.
- **PIRATE, POWDER** — the stage is acceptable; there is almost nothing colourful on it
  (11% and 1.8% actors against their 26%). Do not touch the ground. Raise prop chroma and
  put more coloured props on the field.
- **GAME DAY** — the ratio is already better than theirs. The problem is value: 0.33
  against their 0.69. Lift the key so the lot reads as daylight concrete, not dusk.
- **LANTERN** — a night world may keep a low value **only if the actors are lit**. Lanterns,
  stalls and food carts become emissive at chroma ≥ 0.45 covering ≥ 15% of the playfield.
  If that cannot be reached, the night brightens.

### 3.2 The void gets a lit rim — as a creature, not a hole

Their hole reads at every size because its rim is a lit torus at 13.4% of its diameter with
three tones and 9:1 contrast against the interior. **We give the void the same legibility
mechanism in his own skin colour**: a lit rim, three tones, scaling with his on-screen size
rather than held at a fixed pixel width, so he reads at Size 1 and at the cap.

He is not becoming a hole. He keeps his face, his body, his gloss and his two-tone shading.
The rim is a lit edge on a creature — the thing that makes a character pop off a background
in every animated film ever made.

### 3.3 Two tones per material

Every merged prop gets a shade tone 1.9–2.6:1 below its lit tone, hue-shifted 8–15° toward
the fill light, selected per face by the face normal against the key. This is a vertex
colour pass, not new geometry and not new draw calls.

### 3.4 Three-layer type

Display type gets a two-stop gradient fill, a stroke covering 60–75% of the fill's area at
≥ 3:1 from it, and a shadow. Our stroke already exists; the gradient and the ratio do not.

---

## 4. WHAT MUST NOT HAPPEN

- The void must not become a hole, an absence, or a ring. He is a creature with a lit edge.
- No ground may be desaturated to grey. Toward its own hue's grey, or not at all.
- No world may lose its mood to hit a number. LANTERN is allowed to be dark **if its actors
  are lit**; POWDER is allowed to be pale.
- No textures, no bloom passes, no post effects added to chase their look. Their look is
  value steps and colour, and so is ours.
- Prop palettes must not be pushed past chroma 1.0-equivalents into neon — 4+ audience,
  and the reference sits at 0.45–0.60.
- Frame time must not regress. The two-tone pass is vertex colour, not a second material.

---

## 5. THE BARS

Reference viewport 430×932, DPR 3 via `qa/_worldshots.mjs`, spawn frame t = 5 s, HUD bands
excluded, chroma = (max−min)/255 — the identical method used on their frames.

| # | Bar | Target | Theirs | Ours now |
|---|---|---|---|---|
| D1 | Stage: playfield below chroma 0.12 | **≥ 45%**, every world | 52.3% / 61.4% | 14.7–70.0% |
| D2 | Actors: playfield above chroma 0.35 | **≥ 15%**, every world | 25.9% / 13.4% | 1.8–48.2% |
| D3 | Value median of the playfield | **0.50–0.80** (LANTERN ≥ 0.30 if D2 is met by emissive props) | 0.69 / 0.89 | 0.25–0.73 |
| D4 | Ground hue preserved | hue of each district within **±12°** of its pre-change hue | n/a | — |
| D5 | Two tones per prop material, lit:shade luminance | **1.9–2.6:1** on a bench, a tree and a house | 2.09:1, 2.54:1 | single-tone |
| D6 | Shade hue shift from lit | **8–15°** | 13°, and 79° on ground shadow | already hue-shifted (rig) |
| D7 | Void rim width | **10–15% of his on-screen diameter**, at Size 1 and at the cap | 13.4% | ~3–6%, fixed px |
| D8 | Void rim contrast against his body's interior | **≥ 8:1** | 9.12:1 | n/a |
| D9 | Void body lit:shade | **keep 1.9–2.6:1** | 2.09:1 | **2.04:1 — already passing** |
| D10 | Void on screen at spawn | **22–26% of width** | 22.6% | 17.8–20.7% |
| D11 | Display type layers | **gradient fill + stroke + shadow**; stroke area 60–75% of fill | 67% | stroke only |
| D12 | Frame time, 95th percentile, reference device | **≤ 16.7 ms**, no regression | n/a | measure first |

## 6. THE PROBE — `qa/pop.mjs`

Written before the build; must fail D1 on Pirate, Maple and Skylark, D2 on Lantern and
Powder, D3 on Game Day and Lantern, D5 everywhere, and D7, D8, D10, D11 everywhere.

What it does:

1. Renders the spawn frame for all six worlds through `qa/_worldshots.mjs`'s path.
2. Computes the chroma histogram of the playfield with the recon's method, and prints
   ours beside Hole.io's two frames in the same table — so the comparison is one artefact,
   not two.
3. Samples each named district's hue before and after, and fails D4 on a hue drift over
   12°, so "desaturate toward the hue" cannot silently become "desaturate to grey".
4. Locates a bench, a tree and a house by colour cluster and measures each material's lit
   and shade luminance and their hue difference — D5 and D6.
5. Locates the void by his violet body mask, measures his on-screen diameter, his rim's
   width as a fraction of it, and the rim's contrast against his interior at Size 1 and at
   the cap — D7, D8, D10.
6. Measures the display type's fill, stroke and shadow areas by colour cluster — D11.
7. Emits every measured frame to `qa-out/pop/` so a human can see what the numbers mean.

Registered in the push gate once green.

## 7. THE ORDER OF WORK

1. **Write `qa/pop.mjs` and run it on the untouched tree.** Commit the probe and its
   failing output.
2. **The void's rim** (D7, D8, keeping D9) — one file, `void3d.ts`, biggest single gain in
   legibility, and it is the thing the owner asked to be *refined rather than replaced*.
3. **Screen share** (D10) — refit `targetDist`. One line, measurable immediately.
4. **The stage, world by world** (D1–D4), in the order Maple, Skylark, Game Day, Lantern,
   Pirate, Powder — the two saturated stages first, because they are the largest visual
   change and the fastest to judge.
5. **Two-tone materials** (D5, D6) — the vertex colour pass.
6. **Three-layer type** (D11).
7. **Frame time** (D12) re-measured after every step, not once at the end.

Each step is one commit with its probe numbers in the message. A step that cannot go green
stops and reports.

## 8. DONE MEANS

- `node qa/pop.mjs` green on all twelve bars across all six worlds.
- The gate green.
- Six spawn frames in `qa-out/pop/` beside the two Hole.io references, one sheet.
- A verdict from the builder giving each bar's number beside its target and theirs.
- The governor's skeptic verdict on top of it.

*The world to judge this by is GAME DAY. It already has the stage. When the other five read
the way it does — and it reads brighter — this stream is done.*
