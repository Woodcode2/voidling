# STREAM D — NOTHING STANDS IN FRONT OF THE HERO

*Round 7, stream D, opened mid-stream. Not in the original plan: it was found by
looking at a frame the colour probe had just measured, and it turned out to be
the reason that frame's colour numbers were wrong too.*

---

## 0. HOW IT WAS FOUND

Stream D's screen-share change took `PLAY_DIST` from 38 to 33 so the void reads
larger. The colour probe then reported MAPLE's spawn frame at **7.7% of screen
width** — a third of what it had been at the *further* camera, which is
arithmetically impossible if the number means what it says.

It did not. The frame:

> the hero entirely behind a solid, undithered maple canopy, with only a violet
> sliver of his left edge showing. `qa-out/gw/maple-spawn.png`, 15:10.

The probe had found the sliver and called it the void. So one bug produced two
false readings at once: the void looked small, and MAPLE's stage share fell from
47.5% to 29.9% because two enormous red canopies had replaced the ground in
frame. Neither number was about colour or framing.

---

## 1. WHAT WAS ALREADY THERE

`prototype3d.ts` has had a camera-occlusion fade since round 3. Its own comment
states the case that justified it:

> Measured before this existed: 3-13% of sampled frames per world hid a quarter
> or more of the void behind scenery, and both Maple and Lantern produced a frame
> inside the first FORTY SECONDS where it was 100% invisible.

It is carefully built — a cylinder test rather than a raycast because
"raycasting into ~10,900 meshes every frame is not affordable"; a dissolve rate
so a prop never pops; a 0.62 constant argued down to the Bayer step ("at 0.28
the keep-mask is 5/16 pixels — on white snow that is a black-and-red halftone
print"); and a companion change killed by the crews skeptic on the grounds that
its motivating scenario was geometrically impossible.

All of that is about a mechanism that could only reach **half the island**.

---

## 2. ONE DEFECT FOUND AND FIXED, ONE STILL OPEN

### 2.1 The fade could only reach half the island

`fadeOccluders` skips any prop it cannot read a fade off:

```ts
if (!m.visible || m.userData.fade === undefined) continue;
```

`armFade()` sets that flag inside `mergedProp()` — on the merged **mesh**. Most
prop factories then wrap that mesh in a **Group** and hand the group to
`addEdible`. The loop was therefore handed an object whose `userData.fade` is
undefined, and skipped the prop.

Measured on MAPLE, at spawn, by `qa/occlusion.mjs`:

| | count | share |
|---|---|---|
| edibles | 5614 | |
| armed on the object the loop reads | 2742 | **48.8%** |
| armed only on a child underneath it | 1741 | 31.0% |
| not armed anywhere | 1131 | 20.1% |

*A correction, recorded because the first reading was wrong:* counting factory
return types gave "56 of 58 return a Group, so essentially nothing fades". The
runtime split is 49 / 31 / 20. Reading the code told me there was a bug; only
running it told me how big.

Resolving the fade targets once, in `addEdible`, took **O2 from 52.6% to 91.0%**.
And O3 — how much of the hero you can actually see — went to **zero**.

### 2.2 The dissolve does not reach the screen — cause still open

That is not a contradiction, it is the next question. With the town hall
standing over the void, the probe reported the occluder found, in reach,
reachable, and dissolved to 0.62 — and **0 of 11,050** pixels of the hero's
silhouette showing through it. The frame, `qa-out/occ/maple-worst.png`, shows a
flat cream building with no dither anywhere on it.

**A correction, and it is mine.** The same line reported the material's `uFade`
as 1 while the prop's own `userData.fade` read 0.62, and I wrote a section here
concluding that every prop's hook was clobbering one shared uniform. That
reading was an artefact of the probe: the drive stubs `renderer.render`,
`onBeforeRender` only fires from inside a render, so for the whole drive the
fade hook never runs and every material's `uFade` sits at its initial 1 whatever
the props say. I read the stub's fingerprint as the game's. The probe now
renders once before it asks anything about a shader.

The shared uniform is still a real hazard, and the history retrodicts it:
three.js uploads a material's uniforms only when the material ID changes between
draws, so three hundred props on one material is one upload — and round 3
recorded that at 0.28 POWDER's snow read as "a black-and-red halftone print",
which is what one occluder's fade leaking to every prop in the batch looks like,
not what one dissolving tree looks like. But fixing it (§2.3) did **not** move
O3, so it is not the whole story and may not be this story at all.

The question is now narrowed to two candidates, and the probe has an experiment
that separates them: render the frame again with the nearest thing in the way
simply switched off. If the hero appears, the dissolve is what is broken. If he
does not, that is not what is covering him.

### 2.3 A fading prop borrows a material of its own

A prop that is currently fading takes a material from a pool of sixteen clones
per base. One mesh per material means nothing else can overwrite its uniform,
and the material ID necessarily changes on either side of that draw, so the
upload happens. The clones are made at module init — `Material.clone()` puts
`userData` through `JSON.parse(JSON.stringify(...))`, and once a prop material
has been drawn its `userData` holds the compiled shader, which is what the eight
`THREE.Texture: Unable to serialize Texture` warnings already in the console
are. Cloning before anything compiles is silent. They share the base's defines,
so three's program cache returns the same compiled program: a swap costs a
uniform upload, not a shader build. A prop that cannot get a slot stays solid —
the old behaviour — and `_fadeStarved` counts it.

**This is correct and it is not sufficient.** O3 stayed at 0.0% with it in. It
stays in the tree only if the experiment shows the dissolve is what is broken;
if the cause is elsewhere it comes back out, rather than sitting there looking
like a fix.

## 3. THE PROBE — `qa/occlusion.mjs`

Written before the fix and red on both bars. It asks the question two ways that
share no arithmetic with `fadeOccluders`, because a mechanism bug and a tuning
bug look identical from the outside and have different answers.

**O2 — when the hero is genuinely blocked, is anything fading?** Ground truth is
a **raycast**: thirteen rays from the lens at his own silhouette — the centre,
four at 45% of his radius, eight at 85% — answered by the scene's triangles.
Affordable here and not in the game because the probe stubs the renderer and the
game does not.

**O3 — at the worst moment, how much of him can you actually see?** Ground truth
is **four renders of one frame**: nothing, the hero alone, the frame as it is,
and the frame with the hero hidden. The first pair differ exactly where the hero
is, which gives his silhouette by construction rather than by a colour guess; the
second pair differ exactly where he reached the screen — so a 62%-solid dither,
which shows him through 6 pixels in 16, correctly counts as partly seen.

Two faults in the first version of this probe, both found by looking at what it
produced rather than at what it reported:

1. **It shot three separate screenshots** and the match clock moved 2:20 → 2:19
   between the first and the last. The camera had travelled; the three masks
   were of three different compositions. The four renders now happen inside one
   synchronous evaluate, so the world cannot advance between them.
2. **It called the occluder set `__edibles`** and treated everything else as
   background — so the rival standing across the hero's face in the very first
   run was invisible to it. Layer-based renders replaced that: the silhouette is
   his, whatever is in front of him.

`O1` was written as a bar and demoted to a printed diagnostic: any threshold on
"props armed for the fade" is a restatement of whichever implementation is in the
tree, and a bar that can only agree with the code is not a bar.

---

## 4. THE BARS

| # | Bar | Target | Before | After 2.1 | After 2.3 |
|---|---|---|---|---|---|
| O2 | blocked frames in which something is fading | ≥ 90% | **52.6%** | **91.0%** | — |
| O3 | the hero you can see at his worst moment | ≥ 60% | 42.4% | **0.0%** | — |

Diagnostics printed alongside, not scored: how many props the loop can reach,
how often the raycast finds him blocked at all, the worst and mean blockage over
the drive, and the material state of every occluder in the way at the shot.

O3's "before" of 42.4% and its 0.0% after 2.1 are **not comparable** — that is
the instrument fault in §3, and it is why the moment is now walked to rather
than waited for. The honest before-and-after of the whole change is the pair of
runs on the walked moment.

---

## 5. WHAT THE FIX CAN AND CANNOT DO

Once the dissolve reaches the GPU, an occluder that fully covers the hero still
leaves him only **37.5% visible**: 0.62 keeps ten pixels in sixteen of the Bayer
mask. That ceiling is why O3's target is 60% and not 95% — the number itself
says whether the second half of the work is needed, rather than being set where
the first half was always going to land.

If it is needed, the second half is not a smaller constant. 0.28 was already
tried and rejected by measurement: on POWDER's snow a 5-in-16 keep-mask reads as
a black-and-red halftone print. The answer is to draw the hero where he is
hidden — an upper-hemisphere overlay in his own skin colour with
`depthFunc: GreaterDepth`, which paints only the pixels where something nearer
is already in the depth buffer. One extra low-poly draw, the trick every
third-person game uses, and it keeps him a creature instead of turning the world
into a flicker. The hemisphere matters: a full sphere would draw a disc of skin
colour at ground level wherever the ground is in front of his sunken half, which
is the ring a previous round already rejected by measurement.

---

## 6. WHAT IS STILL OPEN

- **The 20% of props armed nowhere.** Cars and people from `life.ts` are built
  from `MeshStandardMaterial` per part, not through `mergedProp`, so they have
  no fade shader to write to. A truck parked between the lens and the hero is
  exactly as bad as a tree; GAME DAY is a world made of them.
- **A dissolved prop still casts a full shadow.** The shadow pass uses the depth
  material, which has no `uFade`. It has never been over the hero in a sampled
  frame, so it is recorded rather than fixed.
- **The cylinder test measures from the prop's ORIGIN**, which for a tree is the
  trunk base at ground level and for a lamp post is the foot of the pole. It
  works for trees because their gameplay radius is large enough to cover the
  error. It is not obviously right for anything tall and thin, and the one
  attempt to change it was killed by the skeptic for a reason that still holds.
