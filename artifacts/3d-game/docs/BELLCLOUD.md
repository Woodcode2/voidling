# BELLCLOUD HEIGHTS: world 6's re-theme

*"Skylark, I think we need a better theme ... it's lame. There's no theme to it.
It makes no sense. What if we did something like ... like a cloud level, like
there's clouds or something on the ground as texture. And then there's like some
old style castles, some interesting people ... And the center could be like a
giant bell ... It's completely different."* Then, on the proposal: *"Cloud
Kingdom, Bell Cloud Heights. I like that name."* (the owner, 2026-09-25)

This is the build spec for two builders working in parallel: the **WORLD**
builder (ground, light, props, people, sound, probes, owner sheets) and the
**WORDS** builder (every string a child reads). Each part names the files it
touches and the functions in them. Ship mode applies (AAA-LOOP.md, top section):
about a day per builder, one review, the push gate before `main`.

**How to read the numbers.** Every number here is one of three things, and it is
labelled:
- **[ran]**: measured for this spec on 2026-09-25 at base `66d9b51`
  (qa/airfield.mjs, qa/skyland.mjs, qa/kitfit.mjs, and a scratch geometry
  script over `skylark.ts` loaded through vite SSR, the way qa/skyland.mjs
  loads it). §14 lists them.
- **[recorded]**: a measurement already in the repo, with its source.
  Nobody re-ran it for this spec.
- **[target]**: a bar the builder has to measure against. It is not a result.
  GOVERNOR rule 3: a target only goes into a code comment after someone has run
  it.

---

## 0. The picture, in one paragraph

Bellcloud Heights is the **last island of the trip**. Every floating island
throws its festival once a year, and the Voidling kids road-trip from one to the
next eating their way through. This island's festival is **the Ringing of the
Great Bell**. It is a kingdom on the clouds. The ground is soft pearl cloud with
pastel shading. At the centre, a giant shining golden bell hangs in a tall white
stone arch. Around it are small old sky castles with round towers and
blue-and-gold pointed roofs, puffy cloud trees, cloud cottages, a cloud market
and a rainbow ring road. Striped hot-air balloons dock along the edge, and
fluffy cloud sheep graze on the avenue. Cheerful sky folk with cloud-puff hats
and little wings walk about. The island floats on a sea of clouds under a bright
golden day. It should feel like the top of the trip. When the child finally eats
the Great Bell, the whole island hears a huge **BONG**, every docked balloon
lets go, and the camera looks up at a sky filling with them.

---

## 1. Rules both builders follow

1. **The internal id stays `'skylark'`.** That covers WorldId, `?w=skylark`,
   localStorage (`voidUnlocked`, `voidLevels`, `voidBest_skylark`), sticker ids,
   season ids, qa probe arguments, module and function names (`skylark.ts`,
   `skyfield.ts`, `pickSkylarkNews`, `SKYLARK_BRAND`, `SK_*`, `skRegionAt`), the
   `SkBiome` district ids and the beat `id`/`cue` fields. Only what a child sees
   gets renamed. File names stay the same too; a rename would be churn in a
   merge week.
2. **Our design, not One Piece's.** A kingdom on the clouds with a great bell at
   its heart is ours to make. Nothing in code, comments, copy, art prompts or
   commits may name or imitate the other work. Do not use these words anywhere:
   Skypiea, Shandora, Upper Yard, Angel Island, Angel Beach, Enel, "God" as a
   title, Gan Fall, Conis, Pagaya, Wyper, Shandia, Noland, Calgara, Jaya, Vearth,
   Knock Up Stream, Milky Road, White-White Sea, Heaven's Gate, Lovely Street,
   Giant Jack, "golden belfry", "dials". Do not copy these designs: no ruined
   golden city, no giant beanstalk or vine the bell sits on, no war, no
   priests. Our bell is a **festival bell in a white stone arch in a cheerful
   plaza**. Do not use the line "ring the bell so they know we're here" or
   anything close to it.
3. **Every other world stays byte-identical.** Every edit sits behind
   `WORLD_ID === 'skylark'` / `pickedWorld === 'skylark'`, or is a Skylark row
   in a per-world table. There are exactly **three** shared-code lines in this
   spec (§5.4). Each is a no-op on the other five worlds, and §5.4 says why.
4. **prototype3d.ts and index.html are being edited by another team right now**
   (HUD, menu, events, lag). Keep edits to the Skylark rows and tables listed
   here. Keep hunks small. Rebase before committing. That team is **removing
   event banners and multipliers**. Wherever beats survive their merge, the
   WORDS builder changes only the text fields, and nothing in this spec depends
   on a beat still existing (§5.5).
5. **House rules for props** (skyfield.ts and island.ts headers):
   - one merged mesh per prop on `PROP_SHARED_MAT`
   - flat shading, no textures on props, no new materials per frame
   - chunky silhouettes that read from the 46° camera
   - at most about three colours per prop, plus one dark accent
   - y = 0 is the ground; the nose faces +X; under about 140 parts each
   - camera shake stays zero; 4+ safe, nothing scary
   - apply skyfield.ts's crown rule to every roof: seen from above, a building
     is its roof, so every roof gets a dark eave ring where it meets the wall.
6. **Ship mode, measured.** GOVERNOR rules 2-4 apply:
   - a probe fails on today's build before the fix
   - numbers come from runs
   - probes read the real source or the live page, on the match clock
7. **Browser runs**:
   - Always go through the slot lock:
     `/tmp/claude-0/-home-user-voidling/eaa69740-f218-57be-a086-f424ed5739eb/scratchpad/slot.sh node qa/<probe>.mjs <port> ...`
   - Use only your own port, and stop every server you start.
   - Never run `qa/gate.mjs` except `--list`.
   - Never touch ports 4177, 4188 or 4202.
   - Never commit `node_modules`, `dist-*` or `qa/out/`.

### File ownership (so the two builders never edit the same hunk)

| file | WORLD builder | WORDS builder |
|---|---|---|
| `src/proto3d/skylark.ts` | header comment, `SK_REGIONS[].name` strings | none |
| `src/proto3d/skyfield.ts` | all | none |
| `src/proto3d/island.ts` | Skylark branches (ground bake, SKY_MOOD/SKIES rows, halo guard, cliff colour, cloud sea, populate block incl. its four `breathe()` lines) | none |
| `src/proto3d/life.ts` | Skylark cast (castFor cases, OUTFIT rows, SK palette), new hat/prop/wings, ascension `'bell'` cue, whale-geometry removal | none (the crowd's lines live in newsroom_skylark.ts) |
| `src/proto3d/audio3d.ts`, `src/proto3d/eatvoice.ts` | `greatBell()`, the Skylark `whistle()` branch, the `'ding'` voice | none |
| `src/prototype3d.ts` | `WORLD_LIGHT.skylark`, `HOURS.skylark`, `LEVEL_SPEC.skylark` (numbers **and** set labels/icons), `MENU_ART`/`CARD_ART`/`CARD_FALLBACK` skylark rows, `MED_BY_WORLD`/`HARD_BY_WORLD` skylark rows, the finale lines in §5.4 | `WORLD_NAMES.skylark`, `WORLD_COPY.skylark` (string fields only), `SKYLARK_BEATS` + the two skylark `MID_POOL` extras (icon/title/sub/news only), `renderBook` NAMES.skylark |
| `src/proto3d/newsroom_skylark.ts`, `newsroom_react.ts` (SKYLARK + `skylark.*` MID_REACT) | none | all strings |
| `src/game/stickers.ts` (SKYLARK, NIGHTGLOW), `seasons.ts` (nightglow), `unlocks.ts` (WORLD_LABEL) | none | text fields only |
| `index.html` | none | the skylark picker card's `<b>` and `<span>` |
| `qa/airfield.mjs`, `skyland.mjs`, `skylarkfield.mjs`, `ascension.mjs`, the skylark spot in `qa/lookpair.mjs`, new `qa/bellsheet.mjs`, the four `why:` texts in `qa/gate.mjs` | all | none |

---

## 2. Structure: what stays, what becomes what, what goes

### 2.1 The geometry in `skylark.ts` stays, all of it

Keep these unchanged:
- `SK_LAND`, the three-armed coast with its three bites
- `RUNWAYS` (RWY03/09/15 and their half-widths, `live` flags, internal names)
- `PERIMETER`, `LAUNCH`, the `SK_REGIONS` polygons, `SK_SPAWN`
- `skRegionAt`, `skPlaceable`, the scatter functions, `skCrewSites`, `CREW_GAP`

That geometry is what three probes, the crowd's dress codes, the newsroom's
district pools, the sticker biomes and the placement audit are keyed on. It is
also measured and passing today [ran]:
- placeable ground 61.5% of the island, largest piece 51.0% of it
- the spawn resolves to `arrivals`
- LAUNCH is 5.4° off the fixed camera's centreline from the spawn
- every strip stays at least 150 units inside the coast
- the ring closes; every district polygon is on the island and has room

Change only the `name:` strings and the header comment (P1, cosmetic: probes
print them). Keep the one-line `{ id: '…', name: '…', density: …, poly: … }`
shape, because qa/airfield.mjs parses it.

**Why the bell stays on the launch circle, not the island's centroid.** The
centroid is (6130, 6520), inside the launch field, 2,171 units south of LAUNCH
[ran]. The launch circle is where the avenues cross. It is the hub of the road
network, which is the centre a child reads. It is also 5.4° off-axis at 2,198
units from the spawn [ran], so the first frame looks straight down the Old Way
at the bell, and COPY.hero (the intro fly-over) already points at it. The
centroid would be 69.8° off-axis from the spawn [ran], out of the first frame at
every phone aspect. Moving it would mean re-deriving the spawn, the intro shot
and skyland's bar for no gain.

### 2.2 District by district

The `SkBiome` id stays; the visible name, floor and contents change.

| id | today | becomes (visible name) | what it holds | area share [ran] |
|---|---|---|---|---|
| `circle` | THE LAUNCH CIRCLE, the whale | **THE BELL PLAZA** | **the Great Bell** (§5) on the centre; white marble floor with a gold ring; 12 bell posts ringing it; 2 fountains, 2 banner poles | 8.0% |
| `runway` (03/21, live, half 500) | the live runway, sightline | **THE GRAND AVENUE** | kept clear by design, as today (it is still the sightline to the bell); warm cloud-stone paving with gold edge lines; gold lanterns along both edges; nothing edible on it | 11.7% |
| `slab` (09/27, 15/33, half 260) | disused slab | **THE OLD STONE WAYS** | cracked pale cloud-stone, placeable as today; broken columns; the cloud sheep graze beside the 09/27 way | 0%: see the note below the table |
| `perimeter` | the perimeter track | **THE RAINBOW RING** | a five-band pastel rainbow ribbon painted on the ground along the ring, kept clear as today (placement audit); pennants and puff bushes on its verge; a band of cloud cottages just outside it | 14.6% |
| `launchfield` | THE LAUNCH FIELD, 92-node balloon grid | **THE CLOUD GARDENS** | the same pegged grid, now lanes of cloud cottages, cloud trees, sky turrets, bell shrines and fountains; bushes, flowers, bell posts, sheep and broken columns between them | 16.9% |
| `arrivals` | THE ARRIVALS FIELD, trailers | **THE BALLOON DOCK** | the spawn, unchanged; basket carts nose-in; bagged, spilled, cold and standing balloons (visitors arriving); the ticket wagon | 2.6% |
| `tower` | THE TOWER, control tower | **THE CASTLE KEEP** | the Keep (big round tower, the Bell-Keeper's balcony); sky turrets, castle walls, cottages, banners | 2.5% |
| `hangars` | THE HANGARS, flea market | **THE CASTLE YARD** | two castle gatehouses; the craft market (stalls, trestles, tea urns, bell shrines, banners); two turrets on the apron | 1.8% |
| `breakfast` | BREAKFAST ROW, food vans | **THE CLOUD MARKET** | four pastel cake carts in their row; market stalls; benches; bell posts | 1.1% |
| `meadow` | THE ROUGH | **THE CLOUD MEADOWS** | puff bushes, cloud flowers, broken columns, the skylark birds, cloud bunnies; balloons docked along the edge (the old crew sites); hamlets inland | 40.9% |

**`slab` is never returned today, and that stays.** `skRegionAt` tries every
`SK_REGIONS` polygon before `onSlab`, and the last of them, `meadow`, is the
whole island (`poly: SK_LAND_SMOOTH`). So every land point that is not in the
circle, on the live runway, on the ring or in a named district comes back as
`meadow`, and the `onSlab` line is unreachable. A 40-unit grid over the island
found no `slab` cells [ran]. The comment above that line says the opposite.

So the Old Stone Ways are **ground paint** (§3.2) and **placeable ground**
(`skPlaceable` only excludes the live strip). They are not a district, and
`OUTFIT.slab` never dresses anyone. Do not reorder `skRegionAt` in this
re-theme: it would re-route the crowd's dress codes and the newsroom's district
pools in a merge week. It goes in the post-launch list.

### 2.3 What goes

- **The whale**: `skWhaleLying`, `skWhaleStanding`, her tether-pin ring, her
  kit, her `tethered` flag in island.ts, and life.ts's stage-4 branch (§7.4).
- **The runway designators**: `skThresholdNumerals`, `SEG`, `digit` and the
  numerals pass. They were the airfield's biggest statement and the kingdom has
  no numbers painted on it.
- **Airfield furniture**:
  - `skCentrelineDash` (the avenue paving is baked into the ground now)
  - `skTaxiwaySign`, `skPerimeterCone`, `skMarshalPost`
  - `skControlTower`, `skMetHut`, `skBriefingCaravan`
  - `skFlagpole`, `skWindsock`, `skFireTender`
  - `skHangar`, `skRosetteWall`, `skModelPlaneStand`, `skVintageTractor`
  - `skStrawBale`, `skWheelieBin`, `skSpectatorCar`
  - `skTussock`, `skThistle`, `skFencePost`, `skFenceRun`,
    `skCollapsedWindsockPole`
- **The `'hangar'` landmark tag**. The Great Bell takes the landmark (§5).

---

## 3. The ground, and what lies beyond the edge

### 3.1 What the ground is today

Skylark has **no ground bake of its own**. Every strip colour in island.ts's
`biomeColor` table (runway `0xa9a6b4`, slab `0x8c8b84` …) is read only under
`if (WORLD_ID === 'maple')` (island.ts, the block-fill loop near line 2572). So
the airfield's ground is one colour: `WORLD.meadow` filled at the top of the
bake (near line 1431), with the shared grain mottle, and dialled at
`GROUND_DIALLED` 0.55. Its own notes agree: "skylark's albedo is uniformly
0.169" (island.ts near line 1251) and "The grass here is Maple's own meadow
colour" (prototype3d.ts WORLD_LIGHT note). The runways have only ever existed as
the numerals, dashes and lights standing on grass. So the cloud ground is a
**new bake branch**, not a recolour.

### 3.2 The cloud bake (WORLD, island.ts)

Add `if (WORLD_ID === 'skylark') { … }` directly after the shared base fill and
mottle, beside Powder's branch. Model it on Powder's:
- a `ppath` helper and `PU` (canvas px per world unit)
- `Math.random` for grain; it is unseeded and branch-local, and Powder does the
  same
- no clip path for tiny ops
- `g.save()`/`g.restore()` around any `lineCap` change
- **every colour through `hex()`/`quiet()`**, so the dial and qa/groundtruth's
  ledger see them. Keep `['skylark', 0.55]` in `GROUND_DIALLED`.

In order:

1. **Base, "pearl cloud"**: fill `#ebe7f1`. Not paper white: ACES has to have
   room above the ground for white walls and gold. A rough guide, and an
   estimate, not a measurement: Maple's grass renders at 0.626 luma at its spawn
   [recorded, WORLD_LIGHT skylark note], and `WORLD.meadow`'s byte luma is
   0.693, which the dial preserves. So a ground renders at roughly 0.9× its
   byte luma under a noon rig. L2 in §4 is the real check.
2. **Billows, the thing that makes it cloud rather than paper**: about 900
   matched pairs of big soft radial gradients at *patch* scale, 60-260 world
   units (the Maple-lawn note explains why grain-scale blobs vanish at the 11×
   on-screen magnification).
   - Each billow is a warm highlight, `rgba(255,248,236,0.22)`, offset toward
     the **east**, where the key comes from, plus a lilac shade crescent,
     `rgba(190,180,222,0.20)`, offset west.
   - Pairs matched in count and alpha so the mean holds, as the Maple lawn
     pass does.
3. **The rolled edge**: a lilac shade band 0-420 world units in from the coast,
   stroked along `SK_LAND_RING`, like Powder's rim. It sells the cloud curving
   over the edge.
4. **District floors**: pale, low chroma, separated by hue and value rather
   than chroma. Fill each `SK_REGIONS` polygon, stroke each strip.
   - Outlines: a slightly darker `#d9cfbf` stroke 12 units wide on the Grand
     Avenue's edges.

   | id | floor |
   |---|---|
   | `circle` | white marble `#f5f2ec`; a gold ring `#e6c173` 40 units wide at 0.97·rx; a second at 0.52·rx; 12 paler radial spokes |
   | `runway` | warm cloud-stone `#efe3c9`; gold edge lines `#e2c27e` 30 wide at ±half; paving joints every 260 units, `rgba(200,180,140,0.25)` |
   | `slab` | pale lilac stone `#dfd8e4`, with about 300 short dark cracks `rgba(150,140,170,0.25)` |
   | `perimeter` | the **Rainbow Ring**: five bands across the 340-unit track, rose `#f3b5c4` / peach `#f6cfa6` / lemon `#f3e7a6` / mint `#bfe6cf` / sky `#b9d7f2`, each 68 wide, stroked along `PERIMETER` (it is closed) |
   | `launchfield` | a mint tint `#e3f0e7`, so the gardens read as gardens |
   | `arrivals` | a pale plank deck `#ecdcc6` with plank lines every 60 units along 090 (it is a dock) |
   | `tower`, `hangars` | lavender flagstones `#e4dff0` with flag joints |
   | `breakfast` | rose cobbles `#f2e1e5` |
   | `meadow` | the base; nothing on top |

5. **Grain**: set `GRAIN.skylark` to about `[0.18, 0.20, 0.20, 8]`, starting
   there. Cloud is soft up close; the billows carry the patch scale.
   [target] qa/groundgrain.mjs median 16×16 tile sd between 0.008 and 0.020.
   For reference [recorded, island.ts GRAIN note]: Powder read 0.0036 ("paper"),
   Maple 0.0172.

   **groundgrain cannot see skylark today.** It reads its fixed spots from
   `qa/lookpair.mjs`'s `SPOTS`, which has five worlds, and fails "no fixed spot
   is authored" on a sixth. Add
   `skylark: { name: 'THE BELL PLAZA — the Great Bell under its arch', x: w3(6107) + back(26), z: w3(4349) + back(26) }`,
   with a comment in that file's own style (P1). That also gives the studio's
   lookpair its sixth world.

The colours above are **starting albedos**. The frame bars in §4 decide them.

### 3.3 Beyond the edge: a cloud sea (WORLD, island.ts)

Today, rays that leave the coast fall to the space dome, with a violet additive
halo plane at y −3 (`islandHalo`, near line 1160). On Bellcloud:

- **P0: cloud sea.** One `THREE.InstancedMesh` of low-poly puffs, **one draw
  call**.
  - Geometry `IcosahedronGeometry(1, 0)`, 20 triangles. One material made once
    at build: `MeshLambertMaterial({ color: 0xf5f2fb, flatShading: true })`,
    fog on. Chunky and flat-shaded like the rest of the game.
  - About 1,100 instances on a jittered 40-unit grid over a 1,400 × 1,400
    (3D-unit) square centred on the island. Skip every cell whose centre is
    inside the island silhouette inset by 20.
  - Radius 18-34, scale y 0.40, y from −34 to −22. No shadow cast or received.
  - It fades into the fog at 1,500. It is decor: never `place()`d, never an
    edible.
- **P0: halo off.** Wrap the halo block in `if (WORLD_ID !== 'skylark')`. The
  cloud sea is this world's edge glow.
- **P0: cliff and underside.** At the cliff wall (near line 3892):
  - wall colour `WORLD_ID === 'skylark' ? 0xe2dcef : WORLD.cliff`
  - wall emissive 0 on skylark (the violet emissive is what makes the rock
    read purple)
  - underside cap `0xb9b1d6`
- **P1: the cloud lip.** A second InstancedMesh (`IcosahedronGeometry(1, 1)`,
  80 triangles) with two rows of white puffs:
  - one row every 150 world units along `SK_LAND_RING`, radius 2.5-4.5 (3D),
    centred on the coastline at y 0.4, half inside and half over the edge
  - a smaller row 60 units inland
  - no shadow cast, shadows received, not food

  It turns the island's outline into a scalloped cloud edge, which is the
  poster's read. About 350 instances.

### 3.4 The sky (WORLD, island.ts)

The play camera's top edge is always 30-50° below the horizon [recorded,
prototype3d.ts "THE LOOK-UP" note], so the sky shows only in the look-up tilt
(§5.5) and the intro.
- **P0**: `SKY_MOOD.skylark = { tint: '#8cc3ef', tintA: 0.85, fog: 0xd3e3f3, bgI: 0.75 }`.
  A day-blue tint; a pale haze fog, so the far arms and the cloud sea fade to
  bright air rather than navy. The 'color' composite keeps the painting's
  structure.
- **P2**: the `SKIES.skylark` bodies, restyled as two daytime moons:
  - `{ size 110, hue '#fff1c8', dark '#c9a860', glow '#fff6dc' }`
  - `{ size 34, hue '#d8ecff', dark '#6f8fb8', glow '#eef6ff' }`

  qa/skyfit.mjs is geometry only; it does not care.

---

## 4. The light: a bright golden day (WORLD, prototype3d.ts)

Today's row is first light, keyed from the east at 33.5° elevation, apricot. The
ledger's numbers for it:
- spawn frame luma 0.467 against Maple's 0.553 [recorded, AAA-LOOP S-3,
  qa/skylarkfield.mjs, SEED 7, settled r-4 camera]
- halocensus diffuse ceiling 0.669 against a bloom cut of 1.05 [recorded,
  WORLD_LIGHT note]

Bellcloud keeps the world's one big lighting idea: it is **the only rig keyed
from the east**, so every shadow rakes the other way. It raises the sun and
warms it to gold.

| | Maple (ref) | Skylark today | **Bellcloud (start here)** |
|---|---|---|---|
| sun | `0xfff8ee` | `0xffc78e` | **`0xffe3a8`** (gold, not apricot) |
| sunI | 2.00 | 1.90 | **1.70** (the ground reflects roughly twice what grass does) |
| off | [-55, 95, 42], 53.9° | [78, 60, -46], 33.5° | **[70, 95, -40], 49.7°**, still from the east |
| hemiSky / hemiGround | `0xeef5ff` / `0xb4bcc6` | `0xe2d8f0` / `0x7c8a5e` (grass) | **`0xd2e6ff` / `0xf0eaf2`** (the bounce off cloud is bright lilac-white) |
| hemiI | 0.62 | 0.58 | **0.60** (skylark stays in `HEMI_APPLIED`) |
| dusk | 0 | 0.80 | **0.10** (day: lamps barely on) |
| exposure | 1.12 | 1.15 | **1.05** (stay under the mascot ceiling, ~1.26 [recorded, WORLD_LIGHT note]) |
| fill / fillI / fillOff | `0xb0d8ff` / 0.84 | `0x8fa8e4` / 0.62 | **`0xa9c6f2` / 0.55 / [-70, 52, 40]** |
| bloomCut | 1.25 | (floor 1.05) | **1.25** to start. Raise only if halocensus shows paint crossing |

Replace `HOURS.skylark`. Index 0 is always the shipped rig. The names are
internal; nothing displays them.

```
{ name: 'festival morning', dusk: 0.10, sunK: 1,    warm: 0 },
{ name: 'golden afternoon', dusk: 0.30, sunK: 0.92, warm: 0.30 },
{ name: 'bright noon',      dusk: 0.00, sunK: 1.08, warm: -0.12 },
```

Rewrite the WORLD_LIGHT comment block for the new rig, and put the numbers you
measure into it.

**Bars [target]**, each with its reason:

- **L1**: spawn frame mean luma **0.60-0.72**, measured by qa/skylarkfield.mjs
  (SEED 7, settled r 4). That is Maple's 0.553 plus 0.05 to 0.17. A cloud
  kingdom at noon should read brighter than a green town; below 0.60 it reads
  overcast, and above about 0.72 the white stone and the ground merge.
- **L2**: cloud-ground pixels (HSV sat ≤ 0.20, luma ≥ 0.60) have p50 luma
  **0.74-0.86** in all four play frames.
- **L3**: no play frame has more than **2%** of its pixels with any channel
  ≥ 250. White must not blow out.
- **L4**: qa/halocensus.mjs skylark PASS: nothing but a light crosses the bloom
  threshold. Report the diffuse ceiling. The gold bell's gloss (§5.1) and the
  white walls are "metal and paint" and must not glow.
- **L5**: qa/formsep.mjs PASS, the push gate step: every skyfield.ts colour
  shows a lit and a shaded face at least 6 dE apart under this key. If a white
  fails, darken it (`0xf1ece2` → `0xe9e3da`) rather than touch the key.
- **L6**: qa/rigexposure.mjs skylark (table == renderer) and qa/lightdrift.mjs
  (match 1 == match 2) still PASS.

---

## 5. The Great Bell: hero landmark, dot-3 landmark, finale

### 5.1 The prop: `skGreatBell()` (skyfield.ts, BIG)

One merged mesh, about 40 parts, sitting on y = 0 (qa/kitfit.mjs).

- **Plinth**: two white stone steps (`STONE 0xf1ece2`), 12.4 × 5.4 then
  11.2 × 4.4, 0.5 tall each.
- **Piers**: two `STONE` boxes, 2.2 × 11 × 2.2, at x = ±4.4.
- **The arch**: a half torus, `new THREE.TorusGeometry(4.4, 1.1, 6, 12, Math.PI)`,
  standing on the piers with its crown at about y 16.6. Put a thin dark-blue
  eave band `0x27468f` under a small pointed **blue cone roof** `0x3d6fd6`
  (radius 1.8, height 2.6) on the crown, and a gold ball finial on top.
  Total height about 19.5. That is under the 23.4-unit Pirate building that
  skyfield.ts's STANDING note cites as already handled by fadeOccluders
  [recorded].
- **The bell**, hanging from the arch's apex on a short yoke `0xc8902a`, from
  y 8.3 to y 13.3, in gold `0xf2c14e`:
  - crown cylinder r 1.1
  - shoulder r 1.6 → 2.2
  - waist r 2.2 → 2.6
  - a flared lip r 3.0, 0.5 tall, in `0xc8902a`
  - a dark mouth disc `0x5a3a12` inside the lip (the one dark accent)
  - a small gold clapper sphere just below the mouth
- **Colours**: stone white, gold, castle blue, plus the dark mouth.
- **Shine**: in skyfield.ts, `registerGloss([[0xf2c14e, 0.55], [0xc8902a, 0.4]], 'skyfield')`.
  First check that neither hex is registered by another module: the collision
  warning, and Game Day's GOLD is `0xf0b429`. Metal must not bloom (L4).
- **Voice**: `voiced(…, 'ding')`. The `'ding'` voice is in §6.5. Without that
  tag, the landmark rule in `eatVoiceOf` would make it crumble.

### 5.2 Placement (island.ts, pass 1, replacing the whale)

```
const bell = asLandmark(voiced(SKF.skGreatBell(), 'ding'), 'great bell');
bell.userData.keepForPlayer = true;                               // §5.4 #2
drop(bell, [SK.LAUNCH.cx, SK.LAUNCH.cy], 5.5, BELL_YAW, true, 'big');
SK.claimSpot(SK.LAUNCH.cx, SK.LAUNCH.cy, SK.LAUNCH.rx * 0.85);   // as the whale's
```

`BELL_YAW` turns the arch's open face toward the spawn, so the first frame
looks through the arch at the bell. The arch spans local x, so the open face is
±z. `force` marks it `authored`, so the boot sweep can never retire it.

**Eat radius 5.5**: the hangar's figure. It needs R 4.95 (5.5 / `EAT_RATIO`
1.11), and `LEVEL_SPEC.skylark.landmarkR` stays **4.95**. The footprint is
12.4 × 5.4, half-diagonal 6.8, the same order as a standing envelope's.

**It must be the largest edible**, so that `heroProp` (the largest `radius`,
resolved in beginMatch) resolves to it. No other Skylark prop may carry
r ≥ 5.5. The next biggest in this spec is the spilled balloon at 5.2, then the
Keep at 5.0.

### 5.3 Why one prop can be both the hero and the dot-3 landmark

Today they are different objects on every world (Maple: town hall and barn).
The hero was the whale at r 18, which needed R 16.2 [recorded, island.ts
asLandmark note]. That made her a four-rival hunt rather than a landmark, and
she was "reached never" by a competent autopilot. At r 5.5:
- the finale is reachable on a normal run, at about 73% of the clock on the
  hangar's old measurement [recorded, LEVEL_SPEC comment]
- dot 3 asks for the thing the whole world is about

The goal curve must be re-measured on the new food (§8; §12, W-8).

### 5.4 The three shared-code lines (WORLD, prototype3d.ts)

Each is a no-op on the other five worlds, because `goalProp !== heroProp` there
(barn/town hall, lookout/ship, clock tower/stadium, gate/bathhouse, bell
tower/lodge).

1. **One ceremony, not two.** Add `&& goalProp !== heroProp` to the dot-3
   goal-cue condition (`if (goal && goal.n === 3 && goalProp && !goalCued …`,
   near line 16277). When the hero IS the landmark, the hero cue already fires
   all five channels (banner, hold, `audio.ready`, buzz, gold ring) on the same
   frame. Without this the child gets two banners back to back.
2. **The bell is always hers.** In beginMatch's reservation loop (near line
   10373) change `if (goal?.n === 3)` to
   `if (goal?.n === 3 || e.mesh.userData.keepForPlayer)`. island.ts sets
   `userData.keepForPlayer = true` on the Great Bell only. This is the summit of
   the trip: a sibling (BIGSHOT crosses the island for the biggest landmark)
   must never ring it first. It uses the existing `reserved` path, which
   rivals.ts's `eaten()` predicate already honours at all four scan and swallow
   sites. `tethered` would be wrong, because the player cannot eat a tethered
   prop.
3. **No hero banner over the whistle.** In the heroGone block (near line
   16286) change `if (heroProp.mesh.userData.byPlayer)` to
   `if (heroProp.mesh.userData.byPlayer && !(goalProp === heroProp && endBeat()))`.
   On dot 3, eating the bell *is* the win on the spot, and the end beat owns
   that moment (G4). The whistle is the BONG there (§5.5), so nothing is lost.

### 5.5 The finale, frame by frame

When the Great Bell is eaten by the player (it is reserved, so only the player
can eat it):

1. **The bite** pays `'landmark'` as today (capture: `payBeat`, `treat`). G8's
   marquee freeze stays behind `?killbeat=1`. Camera shake stays zero.
2. **The BONG at the sink.** In `biteSinks`, beside the eat voice (near line
   9915), add a skylark-local line:
   `if (pickedWorld === 'skylark' && e === heroProp && !beat && !ended) audio.greatBell();`.
   G8 says the reward lands on the drop, not on contact, and this is the drop.
   Its `'ding'` voice still sounds under the pop, as a strike transient under
   the bell.
3. **The banner** (heroGone, existing): `COPY.heroGone` +
   `townReacts({ kind: 'landmark', subject: COPY.heroName }, 6)`. The words are
   in §9.
4. **Every balloon lets go.** In the same Skylark branch:
   - call `life.cue('bell', voidState.x, voidState.z)`
   - set `lookUpAt = matchElapsed() + 2.5`. This is the existing four-second
     look-up tilt, a camera move and not shake.

   In life.ts's ascension cue handler (near line 5676) add:
   `else if (n === 'bell' && live && !cascade) { cascade = true; cascadeAt = mt + 1.5; }`.

   The cascade spreads outward from the void, which is at the plaza, so from
   the bell. Spilled and cold balloons stand, telegraph for 8 s and lift, and
   they stay edible below 6 units: a chase at the end of the match. The
   existing `'whale'` cue (beat 4, if it survives the events merge) still starts
   the cascade 13 s after its card. Whichever comes first wins.
5. **The burp** (G9, `?burp=1` only). The hero is a treat, so a burp is owed.
   On Bellcloud it waits for the bell's bloom. In `biteGulps`, where
   `oweBurp(BURP_AFTER)` is called (near line 10023), pass
   `BELL_BURP_AFTER = 1.6` when the meal is the Great Bell
   (`pickedWorld === 'skylark' && pay.id === heroProp?.mesh.id`). The beat is
   "BONG … burp". Nothing changes on dot 3: the end beat owns it, and G9 never
   owes a burp over the whistle.
6. **The whistle is the bell.** Bellcloud's G4 end sound (`whistle()`, the
   `isSkylark()` branch near audio3d.ts line 5042, today a burner whoosh and
   three chimes) becomes a **short strike of the same bell**. The festival ends
   when the bell tolls. On dot 3 the bite ends the match, `!beat` suppresses the
   sink BONG, and the whistle is the only BONG.

### 5.6 The sound: `audio.greatBell()` (WORLD, audio3d.ts)

- Add `greatBell(): void` to the `Audio3D` interface, beside `skBurnerHit()`.
- Implement one private `bellStrike(dest, t, long)` on master (**not** the eat
  bus, which has a 300 Hz floor). `greatBell()` calls it with `long = true`;
  the skylark `whistle()` branch calls it with `long = false`.
- **Partials**: a church-bell stack like `churchBell()` (near line 2451), on C4
  = 261.63 Hz. Ratio / level / long decay in seconds:
  - 0.5 / 0.25 / 6.0 (hum, 130.8 Hz)
  - 1 / 1.0 / 5.0
  - 1.2 / 0.45 / 3.6 (the tierce is what makes it a bell)
  - 1.5 / 0.35 / 3.0
  - 2 / 0.8 / 4.2 (the nominal, 523 Hz)
  - 2.5 / 0.3 / 2.2
  - 3 / 0.35 / 2.0
  - 4.2 / 0.2 / 1.4
  - plus a 15 ms band-passed noise strike at 2 kHz.
- `long = false` scales every decay by 0.4, so the end card's motif is not
  buried.
- `long = true` adds `windChime()`'s three glock notes at +0.45 s: the
  festival's small bells answering.

**Bars [target]**, checked by an offline render in the qa/chomp.mjs route:
- **S1**: at least 50% of the first second's energy is above 500 Hz. Phone
  speakers give up below about 500 Hz [recorded, audio3d.ts town-bell note on
  qa/chomp.mjs (j)]; the nominal and above carry the BONG on a phone, and the
  hum is for headphones.
- **S2**: no partial below 120 Hz (G9's burp rule).
- **S3**: peak within ±3 dB of `evolve()`'s peak. It is the biggest sound in the
  match, not louder than a fanfare.
- **S4**: qa/endparty.mjs still PASS with the short strike as skylark's whistle:
  at most one celebration within 0.5 s at the end card.

---

## 6. The prop list (WORLD, skyfield.ts)

### 6.1 The palette

These are new named constants; qa/formsep.mjs grades every one (L5).

```
STONE 0xf1ece2 · STONE_D 0xd9d0c4 · ROOF_BLUE 0x3d6fd6 · EAVE 0x27468f
GOLD 0xf2c14e · GOLD_D 0xc8902a · ROSE 0xef8fae · MINT 0x8fd8b4
PUFF_W 0xf7f4fb · PUFF_L 0xe3dcf2 · PUFF_M 0xd6f0e2 · PUFF_P 0xffe3d4
WATER 0x9fd8f0 · BELL_MOUTH 0x5a3a12
```

- `ENVELOPE` stays as it is. The poster's balloons are the same red/gold/white
  and blue stripes.
- The ground is near-white, so props carry the colour: blue roofs, gold,
  pastel cloud trees, striped balloons. This is skyfield.ts's inversion rule
  kept. The rendered white of a white wall must stay above the ground's luma:
  the roofs and the eave ring are the read.

### 6.2 New factories: 15, in two priorities

| # | factory | P | size, eat r | silhouette (from 46°) | colours | voice / qk / kind |
|---|---|---|---|---|---|---|
| 1 | `skGreatBell()` | P0 | BIG 5.5 | white arch, blue cone roof, gold bell inside (§5.1) | stone, gold, blue (+mouth) | ding / big / landmark `'great bell'` |
| 2 | `skCastleKeep()` | P0 | BIG 5.0 | fat round tower (cyl r 3.2, h 10), 8 crenels, a gold balcony ring at y 7.5, dark eave, blue cone roof (r 3.6, h 6), gold finial; about 17.5 tall | stone, blue, gold | crumble / big / kind `'tower'` (the Bell-Keeper's balcony) |
| 3 | `skSkyTurret(roof = ROOF_BLUE)` | P0 | BIG 3.6 | slim round tower (r 2.3, h 7), eave, cone roof (r 2.7, h 4), gold finial; about 11.5 tall | stone, roof colour, gold | crumble / big |
| 4 | `skCloudCottage(roof)` | P0 | MID 2.6 | round white cottage (r 1.8, h 2.2), dark eave, pointed roof in blue, rose or mint, gold door; about 5 tall | stone, roof, gold | crumble / **house** |
| 5 | `skCloudTree(tint)` | P0 | MID 2.0 | gold-cream trunk, 3-5 overlapping puffs in one pastel (mint, peach or lilac, **never white**: white is the ground's); about 6 tall | trunk, puff, puff shade | poof / small |
| 6 | `skPuffBush()` | P0 | SMALL 0.45 | three low pastel puffs | 2 puff tones | poof / small |
| 7 | `skBellPost()` | P0 | SMALL 0.5 | slim white post, a gold hand bell on a bracket, blue cap | stone, gold, blue | ding / small (kind `'bin'` where cleaners route, §7.3) |
| 8 | `skBellShrine()` | P0 | MID 1.6 | open pavilion: 4 white posts, blue cone roof, a small gold bell hanging inside | stone, blue, gold | ding / small |
| 9 | `skBrokenColumn(big = false)` | P0 | SMALL 0.9 (big 1.2) | fluted white stump, a fallen drum beside it, a gold capital fragment: the "old style" ruins | stone, stone shade, gold | crumble / small |
| 10 | `skMarketStall(stripe)` | P0 | MID 2.2 | striped awning (rose/white or blue/white) on white posts over a gold counter | stripe, white, gold | crumble / **house** |
| 11 | `skCastleGate()` | P1 | BIG 4.8 | two short turrets (r 1.6, h 6, cone roofs) and a white arch wall between with a dark opening | stone, blue, gold | crumble / big |
| 12 | `skCastleWall()` | P1 | MID 2.8 | 6 × 2.4 × 1.2 crenellated wall with a hanging blue banner, gold stripe | stone, blue, gold | crumble / small |
| 13 | `skCloudFountain()` | P1 | MID 1.6 | round white basin, pale water disc, a central pillar with a gold ball | stone, water, gold | crumble / small |
| 14 | `skBannerPole()` | P1 | SMALL 0.5 | tall white pole with a long blue pennant with a gold stripe (a colour stroke from above) | stone, blue, gold | none / small |
| 15 | `skCloudBridge()` | P1 | MID 2.8 | the poster's curving cloud bridge: an arched white footbridge with gold rails | stone, gold | crumble / small |

Until the P1 factories exist, P0 stands in for them:
- turrets in place of gates and walls
- bell shrines in place of fountains
- bell posts in place of banner poles
- bridges are simply absent

### 6.3 Re-skins: existing factories, colour literals changed in place

These factories are Skylark-only, so editing their literals touches nothing
else.

| factory | becomes | change |
|---|---|---|
| `skTrailer` | **basket cart** (kind `'trailer'`, qk `'car'`, meeps: it has wheels) | body `0x9aa0ad` → wood `0xc9a267`; sides → cream `0xf2ede4`; folded envelope stays |
| `skTicketCaravan` | **ticket wagon** (kind `'caravan'`) | canvas → pastel rose `0xf3c9d4`; roof → gold `0xf2c14e`; wheels stay |
| `skBaconVan`, `skCoffeeHorsebox`, `skDoughnutTrailer` | **cake carts** (kind `'van'`) | pastel bodies (mint, lemon, sky, rose); striped awning; the doughnut sign stays (a cake is a cake) |
| `skSheep` | **cloud sheep** (kind `'sheep'`, baa) | fleece → `0xf8f6f2` with one more puff each side; face and legs → soft plum-grey `0x5a4a64`. The dark legs and face stay the overhead read (the factory's own note) |
| `skTetherPin` | **mooring post** | stake → gold `0xf2c14e`; ring stays |
| `skRunwayEdgeLight` | **avenue lantern** (paint, not food, glow material) | `0x3aa0ff` / `0x9fd8ff` → `0xffd98a` / `0xfff3d0`. The pale core is what crosses the bloom cut, and L4 checks it |
| `skLaunchCircleMarker` | **plaza ring tile** (paint) | chalk → gold `0xe6c173` |
| `skHare` | **cloud bunny** | coat → `0xf4f1ec`; inner ears → `0xf3b5c4` |

### 6.4 Survivors, unchanged

- The four balloon stages: `skBalloonBagged`, `skBalloonSpilled`,
  `skBalloonCold`, `skBalloonStanding`. Visitors arrive by balloon, and the
  ascension still runs on them.
- The balloon kit: `skBasket`, `skBurnerFrame`, `skPilotFlame`,
  `skInflatorFan`, `skCylinderPair`, `skCrownLine`.
- `skWildflowerClump` (the cloud flowers), `skSkylark` (the bird: larks sing
  above clouds), `skPicnicBench`, `skTrestleTable`, `skTeaUrn`.

### 6.5 The `'ding'` voice (P0 to add, P1 to calibrate; eatvoice.ts and audio3d.ts)

P0 because the Great Bell is tagged with it (§5.1). `voiced()` takes an
`EatVoice`, so the bell will not type-check without it, and the landmark rule
would otherwise make it crumble.

- Add `'ding'` to `EAT_VOICES`.
- In audio3d's voice table:
  `ding: (d, t, v) => { const f = 1318.5 * 2 ** ((eatRand() * 2 - 1) * 2 / 12); glock(d, f, t, 0.6, v); glock(d, f * 1.5, t + 0.06, 0.4, v * 0.5); }`
- Start `EAT_LEVEL.ding` at crinkle's 0.0153, since its glock is the same
  instrument, then calibrate it with qa/eatvoice.mjs (c): the loudest of five
  renders at least 6 dB and at most 14 dB under the pop.
- (a) through (k) must PASS for it.
- Until the P1 calibration has run, the level in the code is marked
  provisional, and nobody claims the census below. Never make a bell rustle or
  crumble.

**The Skylark census after the change** [target, qa/eatvoice.mjs --only=census]:

| voice | props |
|---|---|
| squeak | balloons |
| meep | carts, wagon |
| baa | cloud sheep |
| poof | cloud trees, puff bushes |
| crumble | castle pieces, cottages, stalls, columns |
| ding | bells, shrines, posts |
| rustle | cloud flowers |
| wheee | people |

(r) must hold: one shape, one voice.

### 6.6 Where everything goes (island.ts, the Skylark populate block)

**Keep the block's structure, passes, streams (`'decor'`, `'apron'`,
`'crews'`) and counts.** That keeps qa/rng.mjs and qa/placement.mjs risk
small. Swap factories one for one:

| pass | today | Bellcloud |
|---|---|---|
| 1 plaza | whale (force, r 18, tethered) + 14 tether pins + 4 whale-kit props | **Great Bell** (§5.2) + **12 bell posts** on the 0.86·rx ring (force, r 0.5) + at the four kit offsets: fountain [-880, 250], fountain [860, -300], banner pole [200, 820], banner pole [-300, -800] (force, kind `'plazakit'`) |
| 2 gardens grid | 92 nodes of the 4 balloon stages, 14-cycle | same grid, pitch and yaw. 14-cycle `n % 14`: **0-3 cottage** (r 2.6, roofs rotate blue/rose/mint), **4-8 cloud tree** (r 2.0), **9-10 turret** (r 3.6, claim 9.0), **11-12 bell shrine** (r 1.6), **13 fountain** (r 1.6). Pass two's kit (basket/fan/cylinders behind each node) → one **puff bush** per node |
| 2 gardens small stuff | crown lines 149, pins 124, cylinders 112, baskets 74, bales 62, tussocks 99 | **puff bush 180** (r 0.45, sep 0.8), **wildflower 124** (0.35, 0.6), **bell post 60** (0.5, 0.8), **cloud sheep 30** (0.55, 0.9, kind `'sheep'`), **broken column 60** (0.9, 1.1), **picnic bench 40** (0.75, 0.95). Same total, about 620 |
| 3 dock | 9 trailers + 9 bags in a row; ticket caravan; rig grid of spilled/cold/standing; scatter: 29 cars, 57 bags, 38 baskets, 34 cylinders, 32 tussocks | trailers → **basket carts**; caravan → **ticket wagon**; rig grid **unchanged** (the docked balloons; keep the rule that no dome stands on the camera side of the spawn); scatter: cars 29 → **cloud trees 29** (r 2.0, sep 2.2); bags, baskets, cylinders **unchanged**; tussocks 32 → **puff bushes** |
| 4 keep | control tower (force, r 4.2) + met hut, briefing caravan, flagpole, windsock, fire tender; 20 scattered balloons; 110 cones/signs/tussocks | **Castle Keep** (force, r 5.0, kind `'tower'`) + bell shrine (kind `'methut'`), **cottage** (claim 4.2), 2 banner poles, **castle wall** (was the fire tender); the 20 balloons → 20 castle pieces (`k < 0.4` turret, `< 0.75` wall, else cottage); the 110 small → banner pole 30%, puff bush 40%, bell post 30% |
| 5 yard | 2 hangars (force, r 5.5, landmark `'hangar'`); 2 apron balloons; flea market: 27 tractors, 51 trestles, 21 model planes, 21 rosette boards, 18 urns, 12 bales | 2 **castle gates** (force, r 4.8, claim 9.0, **no landmark tag**); 2 apron **turrets** (same `'apron'` stream); tractors → **market stalls 27** (r 2.2, qk `'house'`); trestles, urns **unchanged**; model planes → **bell shrines 21**; rosette boards → **banner poles 21**; bales → **puff bushes** |
| 6 market | 4 vans in the measured row (heading 130, pitch 280, anchor 7520,5020: keep it); 16 spilled balloons; 18 cars, 61 benches, 47 bales, 29 bins, 25 tussocks | the 4 **cake carts** in the same row (kind `'van'`); balloons → **market stalls 16** (claim 5.0); cars → **cloud trees 18**; benches **unchanged**; bales → **puff bushes**; bins → **bell posts** (kind `'bin'`); tussocks → **wildflowers** |
| 7 strips | numerals, centreline dashes, blue edge lights, 14 sheep beside 09 | numerals **deleted**; dashes **deleted**; edge lights → **avenue lanterns** (same spacing, all three ways); sheep → **cloud sheep** (same pass, kind `'sheep'`); **P1: 3 cloud bridges**, one across each Old Way 500 units out from the plaza edge |
| 7b ring paint | 40 chalk launch-ring markers | 40 **gold plaza ring tiles** |
| 8 ring | cones/posts at 260 in; the spectator-car band at five stations per segment | cones → **banner poles**, posts → **puff bushes**; the car band → a **ring of cottages** (r 2.6, claim 4.2, facing the field) at the same stations |
| 8b crew sites | 58 sites [ran]: an envelope at its stage + trailer + kit | if `SK.distToEdge(site) < 1200` (45 of 58 [ran]): **docked balloon**, exactly as today (same STAGE cycle, basket cart alongside, kit); otherwise a **hamlet**: a turret (r 3.6, claim 9.0) and two cloud trees at ±vx·330 |
| 9 meadows | 1,650 band scatter (tussock 42%, flower 24%, thistle 16%, fences 18%); 22 skylarks; 3 hares; 2 fallen masts; 1,500 general (tussock 55%, flower 30%, thistle 15%) | tussock → **puff bush**, thistle → **wildflower**, fences → **broken column** (r 0.9/1.0); skylarks **unchanged**; hares → **cloud bunnies**; masts → **broken column big** (r 1.2); general: puff bush 55%, wildflower 45% |

**The four loading lines** in this block are visible to the child. The WORLD
builder owns them, since this block is its file:
- `'Pegging out the field…'` → `'Raising the Great Bell…'`
- `'Filling the balloons…'` → `'Fluffing the clouds…'`
- `'Opening the bacon van…'` → `'Opening the cake carts…'`
- `'Waiting for the wind to drop…'` → `'Polishing the bell…'`

**Kinds are route keys, so keep them.** life.ts's cast walks `byKind('van')`,
`'bin'`, `'trailer'`, `'sheep'`, `'crewkit'`, `'caravan'` and `'tower'`. The
table above puts every one of those kinds on a new prop, so life.ts needs **no
route changes**. `eatVoiceOf` checks `kind === 'van' | 'trailer' | 'caravan'`
before a factory's own tag, so those must stay wheeled things (carts, the
wagon) that can honestly meep. `'bin'` has no voice rule, so a bell post tagged
`'bin'` still dings.

**Watch the boot sweep.** Skylark measures props by their own boxes
(`ownBox = pickedWorld === 'skylark'` in settleFootprints). That sweep once
retired 42 envelopes before the first frame [recorded, AAA-LOOP S-3]. Compare
qa/rng.mjs's placed counts with skylarkfield's post-sweep static count. A gap
over 5% means the sweep is retiring the new kit. Fix the claims, not the sweep.

---

## 7. People: sky folk, 4+ (WORLD, life.ts, Skylark branches only)

### 7.1 Three small additions to the person kit

- **Hat `'cloud'`** (P0). Add it to the `Hat` union and to `hatParts`:
  - three white puffs (`B.sphS`): one r 0.62 at (0, 0.44, −0.08), two r 0.44 at
    (±0.34, 0.36, −0.12)
  - the whole hat tipped back −0.5 (the "RIGID TIPS" rule in the hatParts
    note), seated like the toque, which reads 100 on a bald head
  - `hatCol` tints it: white, pale pink `0xfbe2ea`, pale sky `0xe2effb`.

  [target] qa/faceray.mjs, which builds every Hair × Hat, PASS with no
  exemption: worst eye at 46/55/65° in the same band as the toque's.
- **`wings?: number`** (P0, the colour; absent means none). Add it to
  `PersonOpts`. Beside the rucksack line in the body weld (near line 1567):
  - two flattened spheres (`B.sphS`, about 0.62 × 0.34 × 0.12) at
    (±0.58·gr, 0.98·th, −0.30·gr)
  - yaw ±0.5, roll ±0.35, reaching past the shoulders so they read from above
  - colour white `0xffffff` or pale gold `0xfff0cc`
  - welded into the body mesh: **no new draw call**.
- **Prop `'handbell'`** (P1). Add it to the `Prop` union and `propParts`: a
  gold `0xf2c14e` taper bell with a wooden handle in the fist, held out like
  the bubble wand so it clears the shoulder.

### 7.2 Who wears what (castFor's Skylark cases; the OUTFIT rows keyed by SkBiome)

Replace the dawn palette with sky colours:

```
SK_MUD → SK_SOFT = [0xeef2fa, 0xd8e2f4, 0xf2e6da, 0xe8dcf2]
SK_HIVIS → 0x2f5fc8 (royal blue), with SK_ORANGE → 0xf2c14e (gold)
```

Re-dress the ten OUTFIT rows in whites, sky blues, gold, rose, lilac and mint.
Wear `'robe'`, `'dress'`, `'tee'` and `'apron'` instead of `'hoodie'`;
`'shoe'` instead of `'boot'`. **Keep every role**, because qa/jobs.mjs and
qa/purpose.mjs are green on them.

| role (id stays) | who they are now | the one thing that reads from 46° |
|---|---|---|
| `spectator` | **Heights folk**, the locals | wings on 60%; cloud hat on 40%; pastel robes and dresses |
| `kid` (Skylark branch) | **sky kids** | wings on 50%; cloud hat on 30%; the party balloon on a string stays (35%) |
| `marshal` | **Bell Wardens** | royal blue with a gold sash (`pattern: 'sash'`); gold cap; `'handbell'` in place of the paddle (P1; the paddle until then) |
| `pym` | **Master Tolly, the Town Crier** | royal blue robe, gold necklace, glasses, white hair; `'handbell'` in place of the megaphone (P1); still never moves, at the foot of the Keep, facing the plaza |
| `cleaner` | **cloud sweepers** | white overalls, sky-blue top; bucket and bubble wand stay (bubbles belong on clouds) |
| `tealady` | **bakers** | white apron over pastel; toque (existing hat); tray |
| `vancrew` | **cart keepers** | striped aprons; tray |
| `crew`, `pilot`, `driver` | **balloon crews** at the dock | unchanged jobs; crew colours stay the envelope colours; mud trousers → soft |
| `tourist`, `photographer` | **visitors from the other islands** | bright coats and sunhats stay (they dressed for the postcard) |
| `guide`, `ticket` | **dock guides** | unchanged; recoloured to royal blue and gold |
| `shepherd` | **cloud shepherds** | white smock; the crook stays; walks at the cloud sheep |

Nothing scary: no masks, no helmets, no weapons. The `crook` and `broom` stay
as tools.

### 7.3 The crowd's routes

They are unchanged, because the kinds are kept (§6.6):
- cleaners walk bell post (`'bin'`) to bell post
- bakers walk cake cart (`'van'`) to balloon
- guides walk the ticket wagon → the plaza (they now go to look at the bell)
  → a cake cart
- the Crier stands at `off(tower, 5.5)`; the Keep's radius is 5.0, so he stays
  outside its wall

### 7.4 The whale's code in life.ts

In the ascension's `begin()` (near line 5632), replace
`e.stage === 4 ? (whaleGeo ??= …skWhaleStanding()…) : standing(e.cols)` with
`standing(e.cols)`, and delete `whaleGeo`. No stage-4 envelope exists any more,
so this is dead code. With the factory deleted, it would not compile.

---

## 8. The level (WORLD, prototype3d.ts LEVEL_SPEC and quest rows)

```
skylark: { eat: 30000, landmark: 'great bell', landmarkR: 4.95, rank: 1, clear: 38,
  set: [{ kind: 'gild', n: 6, label: 'GOLD', icon: '💰' },
        { kind: 'house', n: 10, label: 'HOUSES', icon: '🏠' },
        { kind: 'snack', n: 100, label: 'SNACKS', icon: '🍿' }] },
```

- `landmark`/`landmarkR` are decided (§5.2).
- **`eat`, `clear` and every `set.n` are PROVISIONAL.** The food on the island
  has changed, so they must be re-measured with qa/goalcurve.mjs skylark (five
  seeded runs plus the hunting runs), under the rules the other five rows'
  comments follow:
  - `eat` at about half the clock for a p10 run
  - `clear` at p10 at about 70% of the clock
  - each `set.n` from the hunt's timing, and at most one sixth of the island's
    supply of that kind (the "6N rule" the old VANS 15 comment cites)
- The set moves from `car` (VANS 15) to `house`, because there are no vans in
  the sky. The house supply from §6.6's counts is cottages plus stalls, roughly
  100. That is **an estimate from the placement table, not a measurement**, and
  it would allow n ≤ 16. Count the real supply on the page (qa/questable.mjs
  prints it). If `goalcurve` cannot be run in the day, keep the numbers and
  write "PROVISIONAL — not re-measured on Bellcloud's food" in the comment.
  Never a number nobody ran.
- **Quest pools**: `HARD_BY_WORLD.skylark` → `['houses', 'rival', 'big']` (the
  house supply is no longer two). `MED_BY_WORLD.skylark` stays
  `['cars', 'evolve', 'combo']` (carts). qa/questable.mjs decides both. If it
  fails a chip, drop that chip, as the Powder row does.
- **Par**: `WORLD_PAR.skylark` 35,000 was measured on the airfield's food.
  Re-run `qa/ab.mjs 5 skylark` (P1). The operative bars stay the ones its
  comment names: the lane reaches its target, and the place floor (never below
  3rd) holds.

---

## 9. The words (WORDS builder)

### 9.1 Names and the menu

| where | today | Bellcloud |
|---|---|---|
| `WORLD_NAMES.skylark` (title card, `document.title`, loading screen) | SKYLARK FIELD | **BELLCLOUD HEIGHTS** |
| `unlocks.ts` `WORLD_LABEL.skylark` ("finish X to unlock") | SKYLARK FIELD | **BELLCLOUD HEIGHTS** |
| `renderBook` NAMES.skylark (scrapbook tab) | 🎈 SKYLARK FIELD | **🔔 BELLCLOUD HEIGHTS** |
| index.html picker card `<b>` / `<span>` | SKYLARK FIELD / BEFORE THEY ALL GO UP | **BELLCLOUD HEIGHTS** / **RING THE GREAT BELL** |
| `COPY.icon` | 🎈 | **🔔** |
| `COPY.sub` (title card line) | get them before they go up | **the last stop. the biggest bell.** |

The picker tagline is four words, in the house style of "SUN, SAND, SNACKS" and
"SCHOOL'S SHUT. SLIDE."

### 9.2 The goals per dot

`goalLine` builds these from `COPY.place` and LEVEL_SPEC; nothing else to
write.

- dot 1: **EAT 30,000 OF THE KINGDOM** (`place: 'the kingdom'`; the number is
  provisional, §8)
- dot 2: **💰 6 GOLD · 🏠 10 HOUSES · 🍿 100 SNACKS**
- dot 3: **EAT THE GREAT BELL**
- dot 4: **BE THE BIGGEST VOID**
- dot 5: **EAT 38% OF THE KINGDOM**

All five are six words or fewer, number first (§4.1 of the menu brief).

### 9.3 `WORLD_COPY.skylark`

Change the string fields only. Keep `n`, `hero`, `introLen`, `newsGap` and
`signOn`.

```
ender:        '🔔 WORLD ENDER! The kingdom is CLEAR.'
enderNews:    'BY ROYAL PROCLAMATION: Bellcloud Heights is officially finished. Well done, everybody.'
houseNews:    'A cloud cottage has floated off. The Crier has proclaimed it a holiday home.'
rivalFullNews:'The second visitor has stopped moving. It is now, by proclamation, scenery.'
winSub:       'the whole kingdom belongs to the void'
place:        'the kingdom'
winTitles:    ['KINGDOM: DEVOURED', 'SUMMIT!', 'BURP OF CHAMPIONS', 'THE BELL HAS SPOKEN', 'CHOMPION OF THE CLOUDS']
heroCue:      '🔔 YOU CAN EAT THE GREAT BELL NOW — GO!'
heroCueNews:  'It is big enough for the Great Bell. Master Tolly asks everybody to hold their ears.'
heroGone:     '🔔 BONG!! THE GREAT BELL IS GONE.'
heroName:     'The Great Bell'
```

`BURP OF CHAMPIONS` stays: all six worlds promise the burp.

### 9.4 The newsroom: THE BELLCLOUD CRIER (newsroom_skylark.ts)

**The desk.** Master Tolly, the Town Crier, with a hand bell and a scroll: the
Festival Programme. The other five denials are:
- Maple: a mayor who denies
- Pirate: a tannoy that covers
- Game Day: commentators calling it as a game
- Lantern: a recording that only knows hospitality
- Powder: a closures desk that will not be hurried
- Skylark's old desk: instruments that report conditions improving

His is **ceremonial**. He can only read things *off the programme* or proclaim
them *onto* it. The void is proclaimed a festival visitor, then a float, then
part of the Ringing. Everything it eats is proclaimed "gone up early". **The
joke is wired to the child's progress**, as the old desk's was: as the kingdom
empties, the programme gets shorter. At tier 2 he proclaims the festival
**running ahead of schedule**, the quickest in the kingdom's history, and by
his own scroll he is right. He never breaks format: every line opens or closes
like a proclamation, and "Oyez" is allowed.

**Brand, one per tier (`SKYLARK_BRAND`)**:
`['🔔 THE BELLCLOUD CRIER', '📜 BY ROYAL PROCLAMATION', '🔔 OYEZ!! OYEZ!!']`

**District names (`DIST_NAME`)**:

| id | name |
|---|---|
| circle | 'the Bell Plaza' |
| runway | 'the Grand Avenue' |
| perimeter | 'the Rainbow Ring' |
| launchfield | 'the Cloud Gardens' |
| arrivals | 'the Balloon Dock' |
| tower | 'the Castle Keep' |
| hangars | 'the Castle Yard' |
| breakfast | 'the Cloud Market' |
| meadow | 'the Cloud Meadows' |

`slab` stays outside `SkDist`, as today.

**Rewrite every pool.** Every line in `SIGN_ON`, `MORNING`, `T0/T1/T2_GENERAL`,
the three `*_BY_DIST` tables, the four `MEAL_*` pools, `LIVE` and `SIGN_OFF`
mentions the airfield, the whale, Pym or the balloons as a meet. Keep the
exports, types, `pickSkylarkNews` logic, the `{S}` gate, the drone guard and
`TICKER_MAX` exactly as they are. The rewrite is text only.

House style (qa/newsstyle.mjs is the judge):
- a capital at the start
- one joke per line
- tier 0 has no "!", tier 1 exactly one, tier 2 "!!" or none
- `{S}` only in lines the code gates to the endgame
- 78 characters at worst-case fill (`{M}` 22, `{F}` 14, `{D}` 17 for "the
  Cloud Meadows")
- never open with `{D}` or `{M}`
- no rival names ("a second visitor")
- some questions, and not every line two sentences
- 4+: nobody hurt; everybody gets to a balloon

**Fresh headlines** (23, to set the voice; the builder writes the rest to the
existing pool sizes). Each was counted at worst-case fill: 76 characters or
fewer.

```
SIGN_ON  'Oyez, oyez! The Festival of the Great Bell is open. Mind the edges.'
SIGN_ON  'Good morning, Bellcloud Heights! Bunting up, balloons in, bell polished.'
MORNING  'Balloons are docking all along the edge. Every island sent somebody.'
MORNING  'The cloud sheep have been asked to leave the Grand Avenue.'
MORNING  'Master Tolly has polished the Great Bell, and is now polishing it again.'
MORNING  'Cake carts open. The queue already reaches the Rainbow Ring.'
MORNING  'Has anybody seen the bell rope? It was here a minute ago.'
T0       'A small violet visitor has arrived. It is not on the programme.'
T0       'The {F} at {D} is now on the programme, in pencil.'
T0       'It ate {M}. The Crier has crossed that off the programme.'
T0       'Is the {F} a festival float? The Crier is checking the scroll.'
T1       'By royal proclamation, the {F} is now part of the festival!'
T1       'The festival is running ahead of schedule! Well ahead.'
T1       'It took {M} from {D}. Gone up early!'
T1       'Oyez! {P} percent of the kingdom has been proclaimed finished.'
T2       'The festival has never finished this quickly!! A record for the scroll.'
T2       '{R} percent of the kingdom remains, and all of it is very tidy.'
T2       'It ate {M}!! One item left on the programme: the Bell.'
T2       '{S} seconds!! Everybody into a balloon. Bring nothing but a smile.'
T2       'Only the Great Bell is left on the scroll. Master Tolly is standing near it.'
SIGN_OFF 'That was the last stop. Everybody back in the balloons, please.'
SIGN_OFF 'Oyez, oyez. The festival is over, and it was the best one yet.'
SIGN_OFF 'The Great Bell has been rung. Well, eaten. The Crier will allow it.'
```

**References to the trip.** "The last stop", "the summit" and "every island on
the trip" are in. Do **not** name Grandma Void or the siblings in Bellcloud copy
until the family-story item (S-11) has landed on the branch. A ticker that
names a character the game has not introduced is a leak, the same class as a
line naming a rival.

### 9.5 Reactions (newsroom_react.ts: `SKYLARK` and the `skylark.*` MID_REACT pools)

These are in the Crier's voice. Rewrite:
- `landmark`: e.g. `'{X} has been proclaimed finished.'`,
  `'{X} has gone up early for the Ringing.'`
- the four `beat` pools, to match §9.7
- `evolve`: e.g. `'The visitor has been re-proclaimed a {F}.'`
- `rivalGone`: e.g. `'One visitor has absorbed the other. The scroll is simpler now.'`
- `'skylark.crown'` and `'skylark.bacon'`, to match the renamed middles

### 9.6 The crowd's lines (`SKYLARK_VOICE_AMBIENT` / `_PANIC`)

**Keep the voice keys**: crew, pilot, marshal, cleaner, tea, van, guide,
tourist, ticket, shepherd, spectator, pym, kid. Rewrite every line for who they
are now (§7.2). Lower case; one line on a phone; panic in "!!" like every
world. Seeds:

- `spectator` (Heights folk): `'best festival of the year, this'`,
  `'I have come for the BONG'`, `'my wings are new. do you like them?'`
- `kid`: `'the BELL!'`, `'can I ring it? can I?'`,
  `'the sheep are made of CLOUD'`; panic `'it ate the BELL!!'`
- `marshal` (Bell Warden): `'mind the bell rope, please'`,
  `'one ring each. ONE.'`
- `pym` (Master Tolly): `'oyez! oyez! bell at the end!'`,
  `'that is not on the programme'`; panic
  `'OYEZ!! everybody to the balloons!!'`
- `tea` (baker): `'cloud buns, still warm'`
- `van` (cart keeper): `'cake or bun, love? both?'`
- `shepherd`: `'they will move when they move. they are clouds.'`
- panic, anyone: `'to the balloons!! GO!!'`,
  `'hold on to your hat!! the CLOUD one!!'`

### 9.7 Beats (`SKYLARK_BEATS` and the two skylark `MID_POOL` extras)

Change `icon`/`title`/`sub`/`news` only. Every `id`, `cue`, `at`, `dur`, `mult`
and `col` stays. If the events merge has removed them, skip this subsection.

| beat | icon | title | sub | news |
|---|---|---|---|---|
| 1 (30 s) | 🔔 | The festival is open! | bunting up, bells out | The Crier proclaims the Festival of the Great Bell open. The bunting agrees. |
| 2 `skylark.burner` | 🎈 | Balloons arriving! | visitors from every island | Balloons are docking along the edge. Every island on the map sent somebody. |
| 3 `skylark.sheep` (cue sheep) | 🐑 | The cloud sheep are on the avenue! | they are always on the avenue | The cloud sheep are on the Grand Avenue. They are on it every year and will not be moved. |
| 4 (cue whale → the balloon cascade) | 🎈 | THE BALLOONS ARE LIFTING!! | catch them before they float off | Every balloon at the dock has been cleared to lift. The sky is filling up. |
| mid `skylark.crown` | 🎏 | Banner parade! | blue, gold, and very long | The banner parade is crossing the Castle Yard. It is longer than the Castle Yard. |
| mid `skylark.bacon` | 🧁 | The cake carts are open! | the queue goes round the rainbow | The Cloud Market has opened its cake carts. The queue can be seen from the Keep. |

Beat 4's cue still lifts the balloons (life.ts), so its words describe what
happens. The world's old tagline survives as the last-quarter gag.

### 9.8 Stickers (stickers.ts SKYLARK + NIGHTGLOW)

The **ids never change**: they are save keys and art filenames, and the
scrapbook's promise is that nothing found ever expires. Keep `biome` and `tier`
too. Rewrite `name`, `where` (the district's new name), `hint` (in the Crier's
voice) and `art` (a plain object, no style words).

| id (kept) | biome | name | hint (seed) | art |
|---|---|---|---|---|
| whale-rosette | circle | The First Bell Rope | Plaited from a hundred cloud threads. Pulled once a year, gently. | a thick braided golden bell rope with a tasselled end, coiled on white stone |
| pyms-anemometer | tower | Master Tolly's Hand Bell | He rings it before every proclamation, and after, and sometimes during. | a small polished brass hand bell with a wooden handle on a stone windowsill |
| first-skylark | meadow | The First Skylark | Sings above the clouds before the bell is rung. Nobody taught it the tune. | a small brown skylark hovering above soft white clouds, wings blurred |
| gretes-binoculars | perimeter | The Rainbow Chalk | Somebody redraws the ring every morning. Nobody has seen who. | a box of pastel chalk sticks in rainbow colours on pale stone |
| sheep-of-zero-nine | runway | The Sheep On The Avenue | Asked to move for the parade since the first festival. Position unchanged. | a fluffy white sheep standing calmly on pale stone paving |
| rosette-board | hangars | The Banner Of The First Festival | Blue and gold, and older than the castle. The castle is very old. | a faded blue and gold banner with a bell emblem hanging on a stone wall |
| hares-form | meadow | The Cloud Bunny's Burrow | A bunny-shaped dent in the softest cloud on the island, still warm. | a small rabbit-shaped hollow pressed into a soft white cloud |
| franz-gloves | launchfield | The Gardener's Watering Can | For watering cloud trees. Nobody knows if it helps. It seems to help. | a small gold watering can on a white garden path |
| last-bacon-roll | breakfast | The Last Cloud Bun | Baked at dawn. Still warm. Nobody will admit to wanting it. | a round fluffy white bun with a swirl of pink icing on a paper napkin |
| thirty-pence-teapot | hangars | The Castle Teapot | Tea has been three pennies since the castle was built. The teapot remembers. | a round blue and white china teapot on a stone table |
| old-windsock | runway | The Paper Crown | Fell off in last year's parade. Still the best crown on the island. | a gold paper party crown lying on pale stone paving |
| retrieve-map | arrivals | The Balloon Pilot's Map | Every island on the trip, and a big X on this one. | a folded paper map of little floating islands with a red X, on a wicker basket rim |
| glow-baton (nightglow) | circle | The Chime Master's Baton | Every little bell on the island, on the count of three. | a slim white conductor's baton resting on white stone beside a small gold bell |
| tethered-whale (nightglow) | launchfield | The Balloon, Lit | She does not fly tonight. She glows, which the Crier prefers. | a striped hot air balloon standing tethered and glowing from within at dusk |
| glow-programme (nightglow) | breakfast | The Evening Chimes Programme | Lists every bell on the island in the order it will ring. | a folded paper programme with a small gold bell printed on the cover |
| last-burner (nightglow) | tower | The Last Chime | Rings one beat after the rest, every year, by somebody who cannot count. | a single small brass bell swinging on a post against a dusk sky |

**Season** (seasons.ts, id `'nightglow'`, dates kept): name
**'THE EVENING CHIMES'**, icon **'🔔'**, line
**'every little bell on the island, one after another'**.

---

## 10. Probes

### 10.1 Probes that pin something deliberately gone

| probe | what it pins today | status | the replacement bar |
|---|---|---|---|
| **qa/airfield.mjs** (push gate) | A: every runway designator matches its bearing | **A's first half retired**: no numerals are painted any more | A keeps its second half, renamed "every avenue stays on the island" (worst clearance ≥ 150; today 224 on 03/21 [ran]). B (the ring closes), C (the plaza sits on the avenues' crossing: 0 units today [ran]), D, E and F unchanged. Rename the header and output to Bellcloud; update the gate `why:` |
| **qa/skyland.mjs** (push gate) | placeable ≥ 56%, largest piece ≥ 50%, spawn in `arrivals`, **the whale** ≤ 20° off-axis | **Arrivals is kept deliberately**: it is the Balloon Dock and the spawn does not move | Bars unchanged; only the label changes: "**the Great Bell** is 5.4° off the camera centreline" (it reads LAUNCH, which is the bell's spot). Today's values [ran]: 61.5%, 51.0%, `arrivals`, 5.4°. Update the gate `why:` |
| **qa/skylarkfield.mjs** (live, quality) | A: an envelope in frame from ≥ 60% of each part / 80% of the island; C: ≥ 25% of envelopes standing; frame luma and "grass" stats | **A and C retired**: the envelopes left the middle on purpose, and the gardens hold castles now; the grass metric is meaningless on cloud | **A′**: a big meal (r ≥ 2.5: cottage, turret, keep, gate, wall, bridge, balloon) within the frame radius from ≥ 60% of each part's cells and ≥ 80% of the island. **B** unchanged (mid 1-3). **C′**: ≥ 24 flyable balloons (stage 1-3) on the island; ≥ 60% of them in `arrivals` or within 1,200 of the coast; ≥ 25% of them standing (the poster's docked balloons). **D** (new): L1-L3 from §4 on its own frames, with the grass stats replaced by the cloud metric (sat ≤ 0.20, luma ≥ 0.60) and a bar of ≥ 45% cloud pixels per frame. **E** (new): exactly one static edible tagged `landmark === 'great bell'`, within 60 world units of (6107, 4349), whose `r` ≥ every other static edible's `r` (so `heroProp` resolves to it; add `lm: u.landmark` to the props dump). **Run it on today's build first.** E and D must FAIL there (no bell, green ground). C′ should FAIL too, because today most balloons stand in the middle; if it passes on today's build it is not measuring the change, so tighten it until it fails (rule 2). That run is GOVERNOR rule 2's evidence; commit it before the change |
| **qa/ascension.mjs** (not gated; 27 min) | B: 3:00 ≥ 35 airborne (the whale's cascade); D: spacing "before the whale beat" | **Retired with the whale** | A (the third state) and C (≥ 8 on the ground at 3:00) unchanged. **B′**: 1:00 ≥ 3, 1:30 ≥ 6 (the one-at-a-time rule), and 25 s after `life.cue('bell')` ≥ 50% of the non-tethered flyable balloons still on the ground have lifted. **D′**: "before the bell" in place of "before the whale beat". Run `--quick` in the day; the full run is P2 |

### 10.2 Probes whose bars stand and must be run on the new world

- **WORLD builder**:
  - qa/kitfit.mjs: every factory on y = 0, one mesh
  - qa/placement.mjs skylark: nothing on the Grand Avenue (RWY03 full half)
    or the Rainbow Ring; the plaza precinct is exempt as authored. Relabel its
    comments only
  - qa/rng.mjs skylark: ≥ 97% placed, no district under 80%, no pass placing
    nothing
  - qa/formsep.mjs (push)
  - qa/halocensus.mjs skylark
  - qa/rigexposure.mjs skylark, qa/lightdrift.mjs
  - qa/groundgrain.mjs skylark, after the lookpair spot in §3.2;
    qa/groundtruth.mjs skylark
  - qa/faceray.mjs (the cloud hat)
  - qa/eatvoice.mjs `--only=census maple,skylark`, plus the offline parts for
    `'ding'`
  - qa/icons.mjs (the dot-3 pip renders the bell off its tag, automatically)
  - qa/levels.mjs, qa/questable.mjs
  - qa/jobs.mjs, qa/purpose.mjs (the crowd still has jobs and errands)
  - qa/beattruth.mjs (cue ids unchanged)
  - qa/goalcurve.mjs and qa/ab.mjs (§8)
- **WORDS builder**:
  - qa/newsstyle.mjs, qa/newsfeed.mjs, qa/newsarc.mjs skylark
  - qa/stickerreg.mjs, qa/worldlists.mjs, qa/worldreg.mjs, qa/glyphs.mjs
  - qa/pickerfit.mjs: "BELLCLOUD HEIGHTS" is 17 characters, the same as
    "PIRATE BAY RESORT"; the card shows it on the plate at every width
  - qa/chipfit.mjs, qa/endlayout.mjs (the win titles and world name fit the
    end card)
  - qa/pictograph.mjs: 🎈 → 🔔 on the book tab. If its frozen list names 🎈 for
    skylark, update the entry with the reason.

**A caution for probe authors**: `SK.skCrewSites()` is not idempotent within
one process. It returned 58 sites on the first call and 55 on the second in the
same vite SSR session [ran]. island.ts calls it once per build, which is fine;
a probe should call it once too.

---

## 11. The owner sheets (WORLD builder)

1. **BEFORE, first thing, before any edit**:
   `node qa/skylarkfield.mjs <port> --tag=before --out=qa/out/bellcloud` on the
   base build. It writes:
   - `before_overview.png`: orthographic, straight down, the whole island
   - `before_spawn.png`
   - `before_northarm.png` at (6000, 3000)
   - `before_westshoulder.png` at (3500, 6500)
   - `before_southwestarm.png` at (3200, 7700)

   It also writes their frame luma. This is also §10.1's failing run.
2. **AFTER**: the same command with `--tag=after` on the finished build.
3. **The sheet**: a new `qa/bellsheet.mjs`. It builds an HTML page of the ten
   PNGs (two columns, BEFORE | AFTER; five rows: overview, spawn, north arm,
   west shoulder, south-west arm) with each tile captioned with its frame luma.
   It screenshots the page with the same slot-locked chromium to
   `qa/out/bellcloud/owner-sheet.png`.
4. **P1: the finale frame**: `qa/out/bellcloud/finale.png`, taken 3 s after the
   bell is eaten (warp to the plaza, `__setVoidR(5.2)`, let the eat land):
   - the look-up
   - the gold ring
   - the first balloons lifting
5. **P1: a people crop** from qa/personsheet.mjs showing the sky folk (wings,
   cloud hats, a Bell Warden, the Crier).

`qa/out/` is never committed. Hand the paths over.

---

## 12. The day, in order

### WORLD builder

P0 is the ship; P1 if the day allows; P2 is post-launch.

| step | P | what | done when |
|---|---|---|---|
| W-0 | P0 | symlink node_modules; shoot BEFORE (§11.1) | five PNGs + luma in qa/out/bellcloud |
| W-1 | P0 | rewrite skylarkfield's bars (A′ C′ D E), trim airfield A, relabel skyland; run skylarkfield on the base build | skylarkfield FAILs on E and D (and C′, or C′ is tightened until it does), and that run is committed with the probe |
| W-2 | P0 | skyfield.ts: palette, factories 1-10, re-skins, deletions, gloss | qa/kitfit.mjs PASS |
| W-3 | P0 | island.ts populate (§6.6), Great Bell placement (§5.2), loading lines | qa/rng.mjs + qa/placement.mjs skylark PASS |
| W-4 | P0 | island.ts: cloud bake (§3.2), halo guard, cliff, cloud sea, SKY_MOOD | the overview reads as cloud |
| W-5 | P0 | prototype3d.ts: WORLD_LIGHT + HOURS (§4), LEVEL_SPEC (§8), the three shared lines (§5.4), finale lines (§5.5), CARD_FALLBACK sky gradient `radial-gradient(ellipse at 50% 40%, #fff4d6 0%, #f2d488 26%, #8fc4ee 60%, #3a5fa8 100%)`, MENU_ART/CARD_ART when the poster URL arrives | L1-L6 measured and written into the WORLD_LIGHT comment |
| W-6 | P0 | audio3d and eatvoice: `greatBell()`, the skylark whistle branch, the `'ding'` voice at its starting level (§6.5) | S1-S4; the game type-checks with the bell voiced `'ding'` |
| W-7 | P0 | life.ts: cloud hat, wings, sky palette, OUTFIT rows, `'bell'` cue, whale geometry out | qa/faceray.mjs, qa/jobs.mjs PASS |
| W-8 | P1 | factories 11-15; coast lip; calibrate `'ding'` (qa/eatvoice.mjs offline); `'handbell'`; the lookpair spot for groundgrain; quest rows; goalcurve + ab.mjs | numbers in LEVEL_SPEC are measured, or marked provisional |
| W-9 | P0 | skylarkfield AFTER, bellsheet; the full probe list in §10.2 | owner-sheet.png, and every listed probe PASS or explained |
| W-10 | P2 | score: skylark's "burner interrupts" hook becomes "the bell tolls" (a soft `bellStrike` at F3 in `skSchedule`); SKIES recolour; the menu's falling touch for skylark (little gold confetti); the nightglow palette checked on the new ground | post-launch |

### WORDS builder

The WORDS builder starts at once; nothing in it waits on the WORLD builder.

| step | what |
|---|---|
| T-1 | §9.1 names, §9.3 COPY (prototype3d.ts rows only; rebase first, the HUD/events team is in this file) |
| T-2 | §9.4 the whole newsroom_skylark.ts rewrite (header comment included), then qa/newsstyle.mjs |
| T-3 | §9.5 reactions, §9.6 crowd lines |
| T-4 | §9.7 beats (after rebasing on the events merge if it has landed) |
| T-5 | §9.8 stickers, season, unlock label, picker card |
| T-6 | the §10.2 WORDS probe list |
| T-7 | a last grep of `src/`, `index.html` and `docs/` string literals for SKYLARK FIELD, Skylark Field, whale, runway, Pym, bacon and hangar in anything a child can see. Comments may keep history, but a comment that describes the old world as current gets a one-line update |

### Commit etiquette

Each commit message ends with exactly these two lines:

```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012vcNjvSfmhbYsyieHYvqXq
```

- Git user "Claude" <noreply@anthropic.com>.
- Do not push.
- No model identifiers in code, comments or commits.

---

## 13. Risks, and which bar catches each

| risk | caught by |
|---|---|
| A white ground under a noon key blooms like a lamp | L4 halocensus; `bloomCut` per world |
| White stone and white ground merge | L1/L2 bands; the eave-ring rule; pastel cloud trees, never white |
| `heroProp` resolves to something other than the bell | skylarkfield E |
| The boot sweep retires the new kit | the rng-vs-skylarkfield count gap (§6.6) |
| Two banners on dot 3 | the `goalProp !== heroProp` line (§5.4 #1) |
| A sibling rings the bell | the reservation line (§5.4 #2) |
| The events merge removes beat 4 | the bell cue starts the cascade on its own (§5.5 #4) |
| Goal numbers stale on the new food | goalcurve re-measure, or "PROVISIONAL" written on them (§8) |
| Merge conflicts in prototype3d.ts / index.html | row-only edits; the rebase before commit (§1.4) |
| A borrowed design | the banned list (§1.2); the reviewer greps `src/`, `index.html` and `qa/` for every word on it. This file is the only place the list may appear |

---

## 14. What was measured for this spec [ran], base 66d9b51, 2026-09-25

- **qa/airfield.mjs PASS**:
  - 03/21 at 30.0°, 09/27 at 90.0°, 15/33 at 150.1°
  - worst strip clearance 224 at (7444, 3035)
  - the 31-point ring closes
  - the launch circle sits 0 units from the 03/21 × 15/33 crossing
  - spawn 1,310 from the coast
  - district room: launchfield 83%, arrivals 97%, tower 100%, hangars 98%,
    breakfast 52%
- **qa/skyland.mjs PASS**:
  - placeable 61.5% of the island, in 7 pieces; largest 51.0%
  - spawn (7800, 5750) is `arrivals`
  - LAUNCH 5.4° off the camera centreline at 110 units (3D)
- **qa/kitfit.mjs PASS** on 50 factories:
  - standing envelope h 9.48, footprint 9.6 × 9.6
  - control tower h 8.08
  - hangar h 5.12, footprint 7.4 × 9.5
  - whale standing h 17.60

  skyfield.ts's STANDING comment says "~14 units tall"; the factory measures
  9.48. Correct it when the file is rewritten.
- **Geometry**, a scratch script over `skylark.ts` through vite SSR, not
  committed:
  - island area 47.8 M square world units; coast 26,498 units long; ring
    22,524
  - area-weighted centroid (6130, 6520), inside the launch field, 2,171 units
    south of LAUNCH
  - from the spawn: LAUNCH 5.4° off-axis at 2,198 units, the centroid 69.8° at
    1,839
  - district shares (`skRegionAt` on a 40-unit grid): meadow 40.9%,
    launchfield 16.9%, perimeter 14.6%, runway 11.7%, circle 8.0%, arrivals
    2.6%, tower 2.5%, hangars 1.8%, breakfast 1.1%, **slab 0%**. The whole-island
    `meadow` polygon matches first (§2.2 note).
  - `skCrewSites()`: 58 sites on first call, 31 of them within 900 of the coast
    and 45 within 1,200; 55 on a second call in the same process
- **Source reads** (no run): Skylark has no ground bake of its own (§3.1). The
  heroGone, goal-cue, reservation, sink, gulp and whistle call sites are at the
  lines cited in §5.
