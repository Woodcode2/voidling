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

## 2. TWO DEFECTS, AND THE SECOND ONE IS A JOKE AT OUR EXPENSE

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

### 2.2 A clone is not a copy of the shader

With the town hall standing over the void, the probe reported the occluder
found, in reach, reachable, in `fadeTo`, carrying the fade hook, dissolved to
0.62, **and its material's `uFade` reading 0.62** — with **0 of 20,263** pixels
of the hero's silhouette showing through it. Switching that prop off revealed
99.9% of him, so it is certainly what covers him. Setting its own fade to 0,
which must discard every pixel it owns, changed nothing at all. A 16×16 block of
the building over his centre is one flat colour: there is no dither on it
anywhere.

The answer, verified offline against this repo's three (r185):

```
Material.clone():  onBeforeCompile copied?  false
                   userData copied?         yes, by value
```

`clone()` does not copy `onBeforeCompile`, and it does copy `userData`. So a
cloned prop material comes out carrying the **stock** standard shader plus a
**dead JSON snapshot** of the original's `shader` object. The fade hook then
writes 0.62 into that snapshot every frame; anything asking whether the material
is hooked reads true; and nothing on the GPU has ever heard of `uFade`. Every
reading was honest and every one of them was about an object no shader reads.
(The eight `THREE.Texture: Unable to serialize Texture` warnings sitting in the
console are that same clone, putting a compiled shader's uniforms through JSON.)

And what clones a prop material? The **too-big-to-eat grey tint**
(`prototype3d.ts`), which gives each prop the void cannot yet swallow a material
of its own so it can grey without taking the island with it.

> So the feature written to stop the hero disappearing behind scenery was
> switched off for every prop big enough to hide him, by a line about the colour
> grey. Small props — the ones that could never hide anything — faded correctly
> the whole time, which is exactly why it looked like it worked.

Counted rather than inferred, in one 6-second drive, by branch inside
`setMeshFade`:

```
{"swapped":10,"released":10,"starved":0,"notMesh":0,"multiMat":0,
 "notBase":255,"held":120}
```

255 refusals because the material was a clone, against 10 props ever handled.

It cost the gloss pass too: a gated prop has been rendering without the
roughness and metalness terms every other prop on the island gets.

### 2.3 The fixes

**Give the clone its shader back.** The gate tint now drops the dead snapshot
and runs `installPropShader` on its clone, so a gated prop compiles the same
program as everything else — fade, gloss and all.

**And a fading prop that is NOT gated borrows a material of its own.** Those
props still share one material, and per-object state on a shared material cannot
work twice over: every prop's hook writes the same uniforms object so the last
one drawn wins, and three.js uploads a material's uniforms only when the
material ID changes between draws, so three hundred props on one material is one
upload. The history retrodicts it — round 3 recorded that at 0.28 POWDER's snow
read as "a black-and-red halftone print", which is one occluder's fade leaking
across a whole batch, not one tree dissolving. So a fading prop takes a material
from a pool of sixteen clones per base. The clones are built at module init,
before anything compiles, so `clone()` has an empty `userData` to copy rather
than a shader. A gated prop needs no slot: it already owns its material.

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
| O2 | blocked frames in which something is fading | ≥ 90% | 52.6% | **91.0%** | 80.4% |
| O3 | the hero you can see at his worst moment | ≥ 60% | 42.4% | 0.0% | **37.5%** |

**37.5% is the arithmetic, to three figures.** A fade of 0.62 discards the six
Bayer steps at or above it and keeps ten, so a prop that covers the hero
completely leaves exactly 6/16 of him showing. Landing on the predicted number
rather than near it is the strongest evidence available that the mechanism is
now doing precisely what it says, and it also means the remaining gap to 60% is
not a bug: it is the constant.

O2's 91.0% and 80.4% are separate drives of an unseeded sequence and the spread
between them is drive-to-drive variance, not a regression; both are the
reachability fix's number. The 20% of props armed nowhere (§6) is the ceiling on
that bar.

O3's "before" of 42.4% and its 0.0% after 2.1 are **not comparable** — that is
the instrument fault in §3, and it is why the moment is now walked to rather
than waited for. Every figure from 2.1 onward is measured at the walked moment.

Diagnostics printed alongside, not scored: how many props the loop can reach,
how often the raycast finds him blocked at all, the worst and mean blockage over
the drive, the material state of every occluder in the way at the shot, and the
branch counts inside `setMeshFade`.

## 5. THE FLOOR OPENED, AND THEN THE DITHER HAD TO GO

### 5.1 0.62 → 0.28, and the correction that came with it

The dither keeps every Bayer step below the fade and discards the rest, so the
floor is a fraction, not a brightness: 0.62 leaves exactly 6/16 of a covered
hero showing, and O3 measured 37.5% to three figures. 0.28 discards eleven of
sixteen. Measured: **MAPLE 68.8%, POWDER 70.8%** — both past the 60% bar, and
Maple landed on the predicted 68.75% again.

I had argued that round 3's rejection of 0.28 was about the shared-uniform leak
rather than the dither, so the number it killed was fair game. **I was wrong,
and looking at POWDER is what said so.** The hero reads beautifully; the lodge
in front of him is a coarse grey crosshatch on white snow. A regular 4×4 mask at
low density on a large pale surface is a screen door however few props are
wearing it. The leak made it worse across the whole field; it did not make it.

Round 3 caught this by looking, and no bar in this probe would have. That is the
argument for keeping a human frame in the loop next to every number.

### 5.2 So the dissolve is alpha now

Dithering was the right call when it was made, for two reasons that have both
since gone: it needs no per-object material, and it needs no sorting. Props now
own their materials (§2.3), and an occluder is drawn between the opaques and
nothing else — so ordinary alpha is available, which is what third-person games
actually use to get a camera occluder out of the way. `depthWrite` goes off with
it, or the ghost keeps writing the depth that hides the hero behind it. The
Bayer discard stays in the prop shader, undriven: `uFade` is pinned at 1 by the
hook, which exists precisely because a uniform on a shared program keeps
whatever the last draw wrote.

### 5.3 And O3 had to change with it

Counting pixels where the frame differs with and without the hero answers a
dither honestly — each of its pixels is all hero or all prop — and flatters a
blend, where every pixel differs a little and the count reads 100% at any
opacity. O3 now measures his **contribution**: how far each pixel moves when he
is hidden, against how far it would move with nothing in front of him at all. A
dither scores exactly what it scored before (6 pixels in 16 at full strength is
0.375); a 28% ghost scores the 0.72 it actually lets through. The two mechanisms
became comparable, which they were not.

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
