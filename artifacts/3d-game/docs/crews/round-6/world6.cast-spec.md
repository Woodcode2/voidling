# THE CAST OF SKYLARK FIELD — engineering contract

*Director's spec for brief §3D (`world6.rebuild-brief.md`). Three implementers
work in parallel on disjoint regions; the director integrates the skylark block.
Names below are the interface: every implementer uses exactly these strings.*

## The world as it is

- `src/proto3d/life.ts` — one file, ~5,800 lines. People are built by
  `makePerson(biome, colOverride, PersonOpts)` (~line 1000) and dressed by
  `makeCast(role: Role, dress: string, side?: number)` (~1253). `Role` is a
  string union (~1237); `Prop` (~636) is the hand-kind union built by
  `propParts(out, kind, s)` (~794) in ARM-PIVOT space (origin at the shoulder,
  the hand is at y ≈ -1.1·s, forward is +z; read `clipboard`, `tray`, `leash`,
  `horn`, `placard` for the conventions and the `pc()` helper at ~603).
- `OUTFIT: Record<string, Fit>` (~894) is keyed by the biome id under a
  person's feet. Skylark's ids are `launchfield`, `arrivals`, `breakfast`,
  `hangars`, `tower`, `meadow`, `perimeter`, `slab`, `circle`, `runway`
  (see `SkBiome` in `src/proto3d/skylark.ts`). **None has an entry today**, so
  every adult falls through to `OUTFIT.cozy` — Maple's suburb.
- `VOICE_OF: Partial<Record<Role, string>>` (~1506) maps role → voice key;
  inside `createLife`, `ambPool()`/`panPool()` (~2350) resolve a key against
  the world's own pools (`MAPLE_VOICE_*`, `GAMEDAY_VOICE_*`) then the module
  tables `AMBIENT`/`PANIC`. Skylark has no pools, so its crowd says
  "bin day tomorrow!".
- A rooted job is `p.userData.dancer = { t, spin, mode }`; the per-frame
  dispatch (~2829–2925) animates `mesh.userData.limbs` (`Limbs`: la, ra, ll,
  rl, torso, head — rotations in radians; `head.rotation.x` negative = looking
  UP, positive = down; `ra.rotation.x = -1.35` = right arm held out forward,
  `-2.25` = arm straight up-ish). Modes in use: 1 event manager, 2 kids skip,
  3 working both hands, 4 conga, 5 campaigning, 6 protesting, 7 heckling.
- Walkers come from `addWanderer(mesh, hx, hz, tether, base, fear, radius,
  biome, panicLines?, voice?, leg?, paceMul)` (~2602); with `leg` set they
  walk a leg, dwell 2.5–6 s, pick the next. It returns a record (the `peds`
  entry) or undefined.
- Beat cues arrive through `cues.push((name, x, z) => …)`; `life.cue(name)`
  fans out. The ascension (skylark block, director's code) will call the
  listeners with `'lift'` and the balloon's x/z on every departure, and with
  `'telegraph'` on every first burner pulse.

## Implementer A — the hands (life.ts: `Prop` + `propParts` only)

Add eight kinds to `Prop` and build them in `propParts`, arm-pivot space,
same `pc()` idiom, same scale param `s`:

| kind | what it is | must read from 46° up |
|---|---|---|
| `rope` | a coil of rope over the shoulder/forearm: a torus-ish ring of 2–3 boxes, tan 0xc9a86b, a dark end | a pale ring on the arm |
| `paddle` | a marshal's bat: a short grey handle, a round ORANGE disc 0xff7a1a at the hand, held slightly forward | an orange dot beside the body |
| `bubblewand` | a thin white stick with a small ring at the top, held up and out | a small ring above the hand |
| `bucket` | a yellow 0xf2c623 bucket hanging from the hand (a tube below the hand, dark rim) | a yellow blob at the hip |
| `broom` | a long tan handle angled to the ground with a dark bristle block at the far end | a diagonal line to the ground |
| `camera` | a small dark box 0x2a2a34 with a lens dot, held at eye level in front of the face (the arm is raised: place it high, y ≈ -0.3·s, z ≈ 0.55·s) | a dark square over the shoulder |
| `crook` | a long pale staff 0xd9c9a4 with a curled hook at the top, upright, taller than the head | a vertical line topped with a hook |
| `balloon` | a party balloon on a string: a thin string up from the hand and a round ball (r ≈ 0.42·s) 1.6·s above the head, colour from `propCol` if present else 0xff5d7e | a bright dot floating beside the head |

`propParts` has no colour parameter today. Add an optional 4th param
`col?: number` to `propParts` and thread it from `PersonOpts.propCol` where
`propParts` is called (there are two call sites, prop and propL — find them).
Only `balloon` uses it.

Deliverable: tsc clean; the diff touches only the `Prop` type, `propParts`,
`PersonOpts.propCol`, and the two call sites.

## Implementer B — the roles and the wardrobe (life.ts: `Role`, `makeCast`, `VOICE_OF`, `OUTFIT`, `KID_ROLES`)

**Roles.** Extend `Role` with: `crew`, `pilot`, `marshal`, `cleaner`,
`tealady`, `vancrew`, `guide`, `tourist`, `photographer`, `ticket`, `driver`,
`shepherd`, `spectator`, `pym`. Add a `makeCast` case for each. The rule for
every one: **readable at a glance from 46° up on a phone** — a silhouette, a
colour, a carried thing. Use the existing `Wear`/`Hat`/`Shoe`/`Hair`
vocabularies (read their unions); do not add mesh parts. Each case ends with
`p.userData.role = role` — in fact set `userData.role` for EVERY role by
setting it once after the switch (find the single return path or wrap).

| role | dress | prop |
|---|---|---|
| `crew` | overalls (`dungarees`) in one of THREE crew colours picked by `side` (0/1/2): 0x2f6fd0 blue, 0xd8443a red, 0x3a9a5a green; white tee under; `cap` 0.7; `boot` | `rope` |
| `pilot` | brown leather jacket (`blazer`, shirt 0x6b4a33), cream pants, `cap` always, glasses 0.5 | `clipboard` |
| `marshal` | HI-VIS: `tee` shirt 0xffd23f or 0xff7a1a, dark pants, hat `cap` white 0xffffff always | `paddle` |
| `cleaner` | blue overalls (`dungarees` 0x2f6fd0), yellow accent 0xf2c623, no hat, `boot` | prop `bubblewand`, propL `bucket` (half of them get `broom` instead of the wand) |
| `tealady` | `apron` white over a floral pattern, hat `bandana` (headscarf) always | `coffeepot` or `tray` |
| `vancrew` | white coat (`apron` shirt 0xffffff), paper hat = `toque` | `tray` |
| `guide` | red jacket (`blazer` shirt 0xd8443a), `cap` 0.3 | `placard` |
| `tourist` | bright coats: `hoodie`/`open` in 0xff8a3a, 0x35d6f0, 0xffd23f, 0xb875ff, 0x7be8b0; `sun` hat 0.5; three body types = vary `hair` and `wear` | `camera` 0.5, else none |
| `photographer` | khaki vest (`open` shirt 0x8a8a5a), dark pants, `cap` | `camera` |
| `ticket` | booth: navy `blazer`, hat `cap` navy | `leaflets` |
| `driver` | boiler suit (`dungarees` orange 0xe8702a or blue), `cap` | `tape` |
| `shepherd` | tweed (`blazer` shirt 0x7a6a4a), flat cap = `cap` brown, `boot` | `crook` |
| `spectator` | anoraks: `hoodie` in muted 0x4a7a8a, 0x8a4a5a, 0x5a6a3a, 0x3a4a6a; `beanie` 0.5 | `juice` 0.3 |
| `pym` | white shirt `tee` 0xffffff, dark pants, no hat, glasses | `horn` |

`VOICE_OF`: crew→'crew', pilot→'pilot', marshal→'marshal', cleaner→'cleaner',
tealady→'tea', vancrew→'van', guide→'guide', tourist→'tourist',
photographer→'tourist', ticket→'ticket', driver→'crew', shepherd→'shepherd',
spectator→'spectator', pym→'pym'. (`kid` stays 'kid'.)

**Kids for a dawn field.** In `makeCast` case `'kid'`: when
`dress` is one of skylark's biome ids (import `isSkBiome`-style check: the
ids listed above — define a local `SK_IDS` set in life.ts), never `swim`, never
armbands/floatRing: anoraks (`hoodie`/`tee`), `beanie` (bobble hat) 0.6, and
prop `balloon` 0.35 with `propCol` one of 0xd8443a, 0x2f6fd0, 0xffd23f,
0x3a9a5a, 0xff5d7e. Keep the Math.random draw ORDER for non-skylark kids
identical (the Pirate Bay seed rule in the makeCast comment) — branch on the
dress BEFORE drawing, and draw the same count in both branches, or gate the
skylark branch so Pirate/Maple/Game Day draws are untouched.

**Wardrobe.** `OUTFIT` gains entries for all ten skylark ids. Dawn, wet grass,
early autumn: anoraks and fleeces, not pastels. `launchfield`: crew colours +
cream, `cap`; `arrivals`: the same plus hi-vis; `breakfast`: aprons and
anoraks; `hangars`: fleeces, `beanie`; `tower`: shirts and ties (blazer),
`cap`; `meadow`/`perimeter`: anoraks, `beanie`, `boot`; `slab`/`circle`/`runway`:
hi-vis and overalls. Every entry sets `wear` and `shoe` lists.

Deliverable: tsc clean; `git diff` touches only those regions. Write a 6-line
summary of what each role looks like from above.

## Implementer C — the voice, the look-up, the bubbles, the jobs (newsroom_skylark.ts + life.ts runtime)

**Voice.** In `src/proto3d/newsroom_skylark.ts` export
`SKYLARK_VOICE_AMBIENT` and `SKYLARK_VOICE_PANIC` (`Record<string, string[]>`),
keyed by the voice keys above plus `kid`: crew, pilot, marshal, cleaner, tea,
van, guide, tourist, ticket, shepherd, spectator, pym, kid. Eight to twelve
ambient lines each, five to eight panic lines. In the voice of the file (read
its existing lines; it is dry, specific, British-festival). A marshal:
"keep behind the rope, please". Crew: "hold it — hold it — GO". A tourist:
"is that one going next?". A kid: "the WHALE!". Panic is the void arriving.
No alcohol, nothing a 4+ rating would flag. Wire them in `createLife` next to
`MAPLE_VOICE_*`: `WID === 'skylark' ? SKYLARK_VOICE_AMBIENT : …`, and treat
skylark like gameday in `ambPool`/`panPool` (the module tables are NOT a
fallback on this world: an unknown key returns null).

**The look-up.** Add to the wanderer record a `lookT` (seconds) and `flash`
(seconds). Register `cues.push((n, x, z) => …)` handling `'lift'` and
`'telegraph'`: every wanderer within 40 units of (x, z) gets `lookT = 2.5`
(telegraph: 1.2). In the per-frame wanderer update: while `lookT > 0`, decay
it, hold the walker still (no travel this frame), set
`limbs.head.rotation.x = -0.85`, and: if `userData.role === 'spectator'`,
clap (both arms `rotation.x = -1.3 ± sin(t·14)·0.35`); if
`userData.role === 'tourist'` and the prop is a camera and `flash` is unset,
fire a flash: `flash = 0.15`, and a shared white `THREE.Sprite`
(SpriteMaterial, additive, depthWrite false — one sprite reused, or a pool of
4) is placed at the head and scaled 2.4 for those 0.15 s. When `lookT`
reaches 0 the head returns to 0 over 0.5 s.

**Bubbles.** A single `THREE.Points` (or ≤ 64 sprites) emitter owned by
createLife: `bubbles.emit(x, z, n)` spawns n soft white translucent discs
(a 32-px radial-gradient CanvasTexture, `transparent`, `depthWrite:false`,
opacity 0.55) at y = 1.4 with random x/z jitter 0.6, rising 3 u/s with a sine
wobble (±0.4 at 2 Hz), each popping (removed) at 4–6 s. Cap 64 live. Drive
from the wanderer update: a wanderer with `userData.role === 'cleaner'`, at
each dwell start (the moment the errand loop stops walking), emits 6–10, and
again every 1.5 s while dwelling.

**Job animations.** New dancer modes in the dispatch, same style as 1–7,
each on `dnc.mode`:
- **8 SWEEPING** (cleaner with `broom`): rooted, torso stooped 0.2, right
  arm sweeping x from -0.9 to -0.3 at 1.2 Hz, left arm follows, body yaw
  ±0.15.
- **9 POINTING UP** (guide, pym): right arm straight up (`ra.rotation.x =
  -2.6`), head up -0.7, torso turns slowly ±0.3 at 0.3 Hz.
- **10 CAMERA UP** (photographer): both arms raised to the face (`la/ra
  rotation.x = -2.0`, z ±0.2), head up -0.5, a tiny sway.
- **11 ROPE** (crew holding a rope): both arms forward and up (-1.6), torso
  leaning back -0.18, feet planted; head up -0.6.
- **12 WAVE** (everyone at the whale): right arm up -2.4 swinging z ±0.4 at
  2 Hz.
- **13 SERVING** (vancrew/tealady): both hands out in front at -1.2, small
  torso turn ±0.2.

Deliverable: tsc clean; note in the summary the exact record field names you
added (`lookT`, `flash`, the bubble API) so the director can call them.

## The director — the skylark block (life.ts ~4223–4290 and the ascension block)

Casts by the brief's table (counts, districts, loops), wires
`cues` `'lift'`/`'telegraph'` from the ascension, the crew step-back and
rope-hold on telegraph, the conga behind a guide, the shepherd's sheep,
Mr Pym's turn. Writes `qa/jobs.mjs` (counts `userData.role` per district
against the table; ≥ 90% of people in a role with a prop or a uniform).

## Rules for every implementer

- Read the regions you touch first. Match the file's voice in comments: say
  what was measured or what broke, not what the code does.
- No new draw calls per person beyond the existing welded mesh (props are
  geometry welded into the arm; the flash sprite and the bubble emitter are
  the only new objects, and they are shared).
- `npx tsc --noEmit -p tsconfig.json` must exit 0 in your worktree before
  you finish. Do not run browsers; do not touch `dist/`.
- Your final answer is the raw content described under Deliverable, plus the
  absolute path of a patch file you wrote with
  `git diff > <scratchpad>/cast-<A|B|C>.diff` from the repo root of your
  worktree (the scratchpad is
  `/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad`).
