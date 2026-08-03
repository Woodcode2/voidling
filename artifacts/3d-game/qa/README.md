# QA harnesses

Playwright probes that measure the game instead of eyeballing it. Every one of
these was written to answer a specific question that an opinion could not
settle, and several of them have overturned a confident wrong answer.

```bash
npm i -D playwright                               # once — these are the only
                                                  # thing in the repo that needs it
npm run build                                     # FROM artifacts/3d-game, not the
                                                  # repo root (the root build fails)
npx vite preview --port 4177 --host 127.0.0.1     # NOT the dev server: it
                                                  # hot-reloads under a capture
node qa/<probe>.mjs [worlds] [runs]
```

In a sandbox where playwright is installed globally rather than locally, ESM
will not find it — symlink it in once:
`ln -sfn /opt/node22/lib/node_modules/playwright node_modules/playwright`

Worlds are `maple,pirate,gameday,lantern`. Output images land in `qa-out/`.

| probe | answers |
|---|---|
| `pace.mjs` | Does a match accelerate or die? Eats/sec, dead time, travel-per-eat, radius and score in 20s windows, plus headline cadence. **The single most useful probe in here.** |
| `sizes.mjs` | What can a LATE void eat? Radius histogram + the biggest objects in the world. A world with nothing above r4 has no last minute. |
| `dens.mjs` | Objects per 100u² of legal ground, per district. "It feels empty" as a number. |
| `replay.mjs` | Will it stick? Diffs headlines, crowd lines, beats and rivals across N full matches, and counts repeats *within* one match. |
| `determ.mjs` | Is the layout the same every load? Waits for async props to settle first — see the trap below. |
| `ground.mjs` | Is the ground textured or flat? Hides every prop, then high-passes the frame at three radii to separate texture from lighting. |
| `funnel.mjs` | Cold boot vs returning player: modals, tap targets, taps-to-play, picker state. |
| `contrast2.mjs` | HUD legibility. Diffs a frame with and without the overlay, so it measures chrome against its own backing rather than against the scene. |
| `pockets.mjs` | Invisible walls. Floods the map for illegal cells that do not connect to the coast. Found Maple's pond sitting in Game Day. |
| `val.mjs` | Runs `__validateWorld()` on all four and reports anything but the expected placement-sweep line. |
| `lnperf.mjs` | Draw calls, triangles, geometries per world. |
| `lnsound.mjs` | Does the score actually PLAY? Counts voices constructed per second — a score that compiles is not a score that makes a sound. |
| `invert.mjs` | Lantern Night's three acts: net crowd movement toward/away from the void, bucketed by tension band. |

## Debug hooks these rely on

Exposed from `src/prototype3d.ts` (QA only, safe to call any time):

`__voidState()` · `__matchState()` (includes `tense`) · `__biomeAt(x,z)` ·
`__insideIsland3` · `__inDeepWater3` · `__edibles` · `__scene` · `__renderer` ·
`__setVoidR(r)` · `__warpVoid(x,z)` · `__setMood(m)` · `__rushClock(t)` ·
`__validateWorld()` · `__news()` · `__audio`

`?w=<world>` picks a world directly. `?walls=1` draws the containment boundary.

## Traps these probes learned the hard way

- **The software renderer is ~1/9 to 1/40 real time.** Never report a wall-clock
  timing from here as a device number. Sample against `__matchState().t`, not
  `Date.now()`. Setting `__renderer.render = () => {}` makes the sim run at its
  proper rate when you do not need pixels.
- **`preserveDrawingBuffer` is off.** `drawImage()` from the live WebGL canvas
  returns an empty buffer — it once reported a scene luminance of 0.000 for
  three worlds. Screenshot, then decode the PNG in-page as a data URL.
- **Async props.** `glb()` registers model-backed edibles inside a
  `template(url).then()`. With the asset CDN unreachable each one falls back
  after a failed round trip at a varying time, so anything that fingerprints
  `__edibles` early counts a different world every run. Wait for a stable count.
- **A whole-set hash flips on ONE differing prop.** It cannot tell "the world
  reseeds" from "six props landed late". Use set overlap if you need degree.
- **Box-mean luminance cannot see a text outline.** It averages glyphs together
  with the ground showing through between them; on that metric the match timer
  looked like the worst element in the game when it is the best.
- **Do not rebuild while a determinism or replay probe is running.** It changes
  the bundle underneath the test.
