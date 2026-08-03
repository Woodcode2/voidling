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
| `hero.mjs` | Is the hero CLEAR in the opening frame? Samples a disc over the void's silhouette from a reconstructed opening camera and reports what fraction is behind scenery. A single centre ray misses the case that actually looks wrong — scenery clipping the edge. |
| `shot.mjs` | Writes `qa-out/<world>-spawn.png` so the opening can be looked at rather than argued about, plus what stands nearest the spawn. |
| `rematch.mjs` | The two bugs that only exist on the **second** match or **after a pause**: a retired mover resurrected at the world origin by `resetMatch`, and the rival schedule drifting because it ran off wall time instead of the match clock. Both were invisible to a one-match playtest. |
| `smoke.mjs` | Does a build boot, load its assets, grow, eat and make a sound? `node qa/smoke.mjs [world] [port]`. Separates **expected** CDN-blocked `/assets/hf*` failures from real same-origin ones and fails only on the second kind — run it against two ports to compare builds. |
| `fresh.mjs` | Does the crowd's per-pool recency guard actually work? Drives the **shipped** `__pickFresh` 100k times per pool size and reports immediate repeats, repeats inside the guard's own ring, closest recurrence, and distribution skew — the last so a guard that bought freshness by developing favourites cannot pass. |

## Debug hooks these rely on

Exposed from `src/prototype3d.ts` (QA only, safe to call any time):

`__voidState()` · `__matchState()` (includes `tense`) · `__biomeAt(x,z)` ·
`__insideIsland3` · `__inDeepWater3` · `__edibles` · `__scene` · `__renderer` ·
`__setVoidR(r)` · `__warpVoid(x,z)` · `__setMood(m)` · `__rushClock(t)` ·
`__validateWorld()` · `__news()` · `__audio` · `__pickFresh(arr)`

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
- **A guard keyed on an object identity dies silently if the caller rebuilds
  that object.** `pickFresh` keeps each pool's ring in a `WeakMap` keyed on the
  pool ARRAY. Any caller that composed its pool per call — `[...A, ...B]` —
  would miss the map every time, leave the ring permanently empty, and disable
  the guard while reading as completely correct. Check the call sites return
  stable references *before* writing the test, not after it comes back null.
- **Test the shipped function, not a copy of it.** `fresh.mjs` reaches the real
  `pickFresh` through a `window.__` hook. Reimplementing the algorithm in the
  probe proves only that it can be written twice.
- **Check the ruler against a known answer first.** Two oracles cost minutes and
  make every later number trustworthy: uniform sampling must give an
  immediate-repeat rate of exactly 1/n and a mean recurrence gap of exactly n;
  a strict round-robin must give zero, a minimum gap of exactly n, and no skew.
- **Measure the number that would show the fix made things worse**, not only the
  one that shows it working. A recency guard trades distribution flatness for
  freshness; a repeat count alone cannot see a pool that has developed
  favourites, which is the more noticeable bug.
- **Do not launch a long probe with `nohup … &` from a backgrounded shell.** The
  child is reaped when the wrapper task completes, and the log simply stops —
  a full four-world `pace` run died after world one and looked like it was still
  going. Launch it as the background task itself.
- **`public/` ships whether or not anything references it.** Vite copies
  `publicDir` wholesale into `outDir`, and `capacitor.config.ts` says
  `webDir: 'dist'` — so `public/` looked unrelated to the iOS binary while being
  205 MB of the 207 MB `dist/`. Measure `du -sh dist` after a build, not `public`.
- **Match asset references on the PATH, not the filename stem.** A scan that
  looked for `dragon` counted `skins/dragon.png` as live because `"dragon"` is a
  skin **id** in the bundle; `ghost` matched three.js's `ghostwhite`, `pond`
  matched `correspond`. Extract the `/assets/…` string literals instead, and
  check separately for dynamically-composed paths (`"/assets/audio/" + name`) —
  there is exactly one in this bundle.
- **Three different "how many did it eat" fields are wrong.** `__edibles` filtered
  on `eaten` gives ~3 and `__matchState().ate.you` gives ~1 — `ate` is the
  devoured PERCENTAGE, and eaten props do not linger in the array wearing a flag.
  Count the drop in the live edible count, as `pace.mjs` does (~130 in 25s).
- **Measure the spawn against `__spawn()`, not `__voidState()`.** The void drifts
  toward whatever it is eating, so a few seconds in it is a couple of units off
  its mark — the same build read 8.2% and 51% occluded on two runs. The authored
  spawn is fixed forever; that is the thing with a right answer. `hero.mjs` also
  reconstructs the opening camera (`spawn + camOffset * 50`) rather than reading
  the live one, which has followed the void.
- **The hero's own rig is not an occluder.** The void carries a find-ring, a
  contact shadow and a glow disc, all centred on it and wider than the body.
  Counting them reported 94% of the hero "hidden" — behind itself.
- **Run the negative control.** A regression test that passes tells you nothing
  until you have watched it fail. Both of `rematch.mjs`'s were verified by
  reverting the fix and rebuilding: the ghost train reappeared at exactly
  `(0.0, 0.0)` with 2 visible trains, and the paused match clock drifted 1.566s.
  A test with no demonstrated power is worse than no test, because it is
  believed.
- **Identify a thing by what it IS, not by its size.** `rematch.mjs` first
  looked for the train by `radius === 5.4` and found two — Maple Falls has a
  static prop of exactly that radius — so the check silently measured the wrong
  object and reported a failure that was not there. The train is the mover whose
  group carries four cars.
- **A mover has to be chased.** Warping onto the train once lands where it was;
  it runs a rail loop. The first version of the swallow step reported no eat at
  all and looked like a passing test of nothing.
- **Filter the expected CDN failures out of the CONSOLE log too**, not just the
  request log. A blocked asset shows up in both, and `smoke.mjs` first reported
  41 console errors on a build that was completely fine.
- **`pgrep -f <probe>` matches your own waiter.** A `while pgrep -f pace.mjs;
  do sleep; done` shell has `pace.mjs` in its own command line, so it waits on
  itself forever and reports the probe as running long after it exited.
