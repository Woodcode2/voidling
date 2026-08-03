# VOIDLING — engineering handoff

Written to survive a context reset. If you are picking this up cold, read this
file, then `qa/README.md`, then start measuring before you change anything.

---

## 1. What this is

**VOIDLING — "the cute world ender".** A hole.io-style 3D game for children
aged roughly 6–11. You are a small purple void with a face. You roll around a
world swallowing things, you get bigger, everything you swallow makes you
bigger still, and in three minutes you eat an entire town.

The goal the owner has stated: **a top-10 game in the Apple App Store.**

It ships as a web build (Vercel, at the site root) and is wrapped for iOS with
Capacitor. The repo is `woodcode2/voidling`; the game is in
`artifacts/3d-game/`.

---

## 2. Standing directives

These persist across sessions. They are not suggestions.

- **Ship via git push only. NEVER deploy manually to Vercel.**
- Push to **both** `claude/voidling-engineering-handoff-w2uweh` **and** `main`.
- **Never bypass CDN egress blocks.** Asset requests 403 in the sandbox. That
  is expected and correct. Do not work around it.
- **Keep the model identifier out of anything pushed** — commits, PR bodies,
  code comments. Chat replies only.
- Commit trailers:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01U1BQwTkg2ZaQ8vS8MGsJz9`
- **Powers stay OFF** (`POWERS_ON = false`).
- **Spawn and the opening are hand-authored and identical every load.**
- The flow is **PLAY → world picker → match**.
- **Do not open a pull request** unless explicitly asked.
- **Verify with screenshots or measurements before claiming anything is done.**

---

## 3. Tech stack

- **Three.js 0.185.1**, TypeScript, Vite. No game engine.
- **Capacitor** for the iOS shell (`ios/`, `capacitor.config.ts`).
- **Supabase** edge function for telemetry (`telemetry.ts`); harnesses stub it.
- **Playwright + Chromium** at `/opt/pw-browsers/chromium` for all QA.
  Flags: `--use-gl=angle --use-angle=swiftshader --no-sandbox`.
- Generated art (skins, posters, sky) is fetched at runtime from a CDN through
  a `vercel.json` rewrite. **Nothing is vendored into the repo**;
  `scripts/vendor-assets.mjs` pulls it down for an iOS build.

### Commands

```bash
npm run build            # vite build  — RUN FROM artifacts/3d-game
npx tsc --noEmit -p tsconfig.json
npx vite preview --port 4177 --host 127.0.0.1
node qa/pace.mjs maple,gameday
pnpm build:ios           # vendor-assets && build && check-assets && cap sync
npm run shoot:store      # 8 App Store screenshots; refuses without the art
```

> **Watch the working directory.** `npm run build` from the repo root runs the
> workspace build and fails. It must run from `artifacts/3d-game`. This has
> silently produced stale measurements more than once.

---

## 4. Code map

Everything lives in `artifacts/3d-game/`.

| file | lines | what |
|---|---|---|
| `src/proto3d/island.ts` | 5.8k | **The big one.** Ground bake, sky, starfield, coastline, and the populate block for every world. Each world's block ends in an explicit `return` — the Maple grid pass at the foot is unguarded and will otherwise leak into your level. |
| `src/proto3d/life.ts` | 5.0k | Crowds: people, movement, flee/greet behaviour, all spoken lines. |
| `src/prototype3d.ts` | 4.2k | Match loop, HUD, camera, growth law, beats, rivals, debug hooks. |
| `src/proto3d/audio3d.ts` | 3.2k | Four separate synthesised scores. No samples for music. |
| `src/proto3d/void3d.ts` | 1.5k | The hero: body, face rig, moods, rings, skins. |
| `mainstreet.ts` `bay.ts` `tailgate.ts` `lantern.ts` | | Per-world geometry + region polygons. |
| `luxe.ts` `nightmarket.ts` | | Per-world prop kits. |
| `newsroom*.ts` | | Per-world headline pools. |
| `index.html` | | All CSS and HUD markup. Not a React app. |

### The coordinate system

`SCALE = 0.05`, world centre `(6000, 6000)`, so `w(v) = (v - 6000) * 0.05`.
Level files author in world units; the renderer works in 3D units.

**Screen-up is not north.** `camOffset = (0.62, 0.92, 0.62)`, so the ground
direction away from the camera is `(-1,-1)/√2` — x and y decrease *equally*.
To put something *d* units straight up-screen from the void, offset by
`d/√2` in **both** axes. Three attempts at a hero shot missed by moving due
north before this was worked out.

### Growth

`growRadius(R, eR) = min(12, sqrt(R² + 0.5·eR²·rookie·diminish))` — area-based,
so **R² is the correct progress axis**. `R_CAP = 12`. Something is edible when
its radius `< voidR * 0.92`.

### Containment

`solid(x,z)` = `biomeAt()` truthy AND `!inDeepWater3()` AND eight
`insideIsland3()` probes at margin `m = min(R*0.75, 4+R*0.15) + 1.2`.
An interior cell that fails this is an invisible wall — `qa/pockets.mjs` finds
them all.

---

## 5. The four worlds

| # | world | theme | density (obj/100u²) | hero landmark |
|---|---|---|---|---|
| 1 | **MAPLE FALLS** 🍁 | sleepy autumn town | 2.31 | none (biggest is a 6.5 town hall) |
| 2 | **PIRATE BAY** 🏴‍☠️ | pirate island that now takes tourists | 3.11 | The Royal Mariner, r10 |
| 3 | **GAME DAY** 🏈 | college football Saturday | 3.80 | the stadium, r11 |
| 4 | **LANTERN NIGHT** 🏮 | spirit night market | 4.85 | the bathhouse, r11 |

Maple is what a first-ever launch drops you into (no menu on run one — that is
deliberate, "the menu earns its place from session two").

**Lantern Night's one idea:** the spirits think the void is a guest. For the
first act they walk *toward* it (+82% net movement), freeze in the middle
(+1%), and flee in the third (−67%). The score says the same thing in the
scale — it opens on **yo** (bright pentatonic) and bends to **in** (two
degrees flattened, measured at exactly −100 cents) as tension climbs.

---

## 6. Current state — what is measured

Last full pass (commit `78408d8`):

```
                     late-game eats/sec        final score
  MAPLE FALLS        26.3 → 26.5  ^              222,999
  PIRATE BAY         30.1 → 27.7  ^              256,586
  GAME DAY           30.5 → 32.1  ^              326,319
  LANTERN NIGHT      28.5 → 40.0  ^              304,234
```

All four accelerate to the whistle. Maple and Pirate did not before this pass
(they finished at 6.9 and 3.9 eats/sec, on 82,902 and 110,841).

Other verified numbers: all four worlds validate clean; zero interior pockets
on every map; ground detail energy 0.042–0.052 mid-band across all four (none
reads flat); Maple 323 draw calls, Game Day 550, Lantern 514; newsroom shows
15–17 headlines a match with **zero repeats within a run**.

**Three second-match bugs are fixed** (`qa/rematch.mjs`, both tests verified
against a reverted build so they are known to have power):

- **The ghost train.** Maple Falls' commuter train rebuilds itself six seconds
  after being swallowed. The consumed group stayed in `edibles`, and
  `resetMatch` restored it to its remembered home — `(0,0,0)`, because
  `addEdible` snapshots `home` and the replacement was registered before the
  rail placed it. That is world 6000, the central crossroads. Every match after
  the first opened with a dead four-car locomotive in the middle of town, on the
  world the store screenshots come from. Fixed with a general `userData.retired`
  guard plus registering the new train on the rail. Reverting the fix puts the
  ghost back at exactly `(0.0, 0.0)`.
- **The rival clock.** The family was scheduled off `tClock - startT` — wall
  time, which keeps running while the pause sheet is up — while everything else
  in the match uses the visible countdown. Any pause slid the rivals forward:
  the hunt window closed early, rivals scheduled during the pause all joined on
  the resume frame, and past ~99s the hunter was stuffed before play resumed.
  `?fast` diverged the two 6× for a whole match, quietly making every harness
  run with that flag see a family that barely joined. Now one named
  `matchElapsed()` shared by all four call sites. Measured drift across a 3s
  pause: 1.566s before, 0s after.
- **The finale cue was Game Day's on every world.** `heroProp` resolves as the
  largest edible in whatever world is loaded, but the three cue strings were
  hard-coded, so Pirate Bay's Royal Mariner and Lantern Night's bathhouse both
  announced "🏟️ THE STADIUM IS IN REACH" and a headline naming Hank, Game Day's
  commentator, at the biggest moment of the match. Moved into `WORLD_COPY` so
  the compiler names any world left out. The "GONE" banner also fired when a
  *rival* ate the hero prop — now gated on `byPlayer`, which was already tracked.

**Four accessibility fixes**, all confirmed in the built output: `#evolve` got
the stroke its three sibling hero messages already had (its `.sm` line was 16px
untreated over arbitrary bright terrain); `#btnHome` and `.goShop` raised to the
44pt floor — `#btnHome` measured at 44.0px, and it sits 12px under a pulsing
PLAY AGAIN, so a low-landing tap started an unwanted match; the smallest text in
the app raised from 8.5px to 11px (it carried "DAY 8" on the returning-player
card, which is the entire point of a deliberate retention fix); and reduce-motion
support, which the game had none of. That last one is JS, not CSS — the flash is
an inline style and the shake is a WebGL camera offset, so the
`prefers-reduced-motion` block in `src/ui.css` never applied to this game and in
any case belongs to the retired React shell. Defaults to the OS setting and is
overridable in Settings and the pause sheet as **BIG MOTION** (phrased so a
parent is not reasoning about a double negative). Verified: label reads ON under
`no-preference` and OFF under `reduce`.

**The shipped payload was 207 MB and is now 6.5 MB.** `public/assets` held
200 MB of art for the **retired 2D game**, and Vite copies `publicDir` wholesale
into the build output — nothing has to reference a file for it to ship. Because
`capacitor.config.ts` reads `webDir: 'dist'`, `public/` looked unrelated to the
iOS binary while being 205 MB of the 207 MB `dist/`.

Measured by extracting the `/assets/…` **path literals** from the emitted bundle
(the authoritative test — a reference that resolves at runtime must appear as a
path). The 3D game uses exactly four things out of `public/assets`: the whole
`audio/` directory (reached by the one dynamic path in the bundle,
`fetch("/assets/audio/" + name)`), `music/theme.mp3`, and the two
`splash_hero` webps. The other 138 files had zero references. They are moved to
`legacy-2d/`, not deleted, because `vite.config.ts` deliberately keeps the 2D
game's *source* for a possible revival — see `legacy-2d/README.md`.

Verified rather than assumed: `qa/smoke.mjs` on all four worlds against the new
build — zero same-origin asset failures, radius 0.90→~1.98, 121–144 props
consumed in 25 match-seconds, audio graph present — statistically identical to
the same probe against the 207 MB build (136 props). All four still validate
clean, with byte-identical placement-sweep output.

**The crowd's recency guard is proved** (`qa/fresh.mjs`, 100k draws per pool
size against the shipped `window.__pickFresh`). At the median shipped pool
(n=6) it turns a 16.84% chance of hearing a line twice in a row into 0.05% —
358× fewer — and a 42.30% chance of repeating inside its own memory into 0.18%.
It wins at every shipped pool size (n=2…22).

It also did **not** buy that with a skewed distribution, which is the way this
fix could have traded one defect for a worse one: the guard measures *flatter*
than uniform sampling in almost every row (0.6% vs 1.8% at n=6, 1.0% vs 3.8%
at n=22). Anti-clustering pushes toward even usage, not away from it.

Two things that result does not say. Min gap is 1 in every guarded row — the
eight retries can all miss, and that *is* the 0.05%; it is a strong
probabilistic guarantee, not a hard one. And at n=2 the ring holds 1, so the
four two-line pools now alternate ABAB near-strictly — probably better than
random doubling for a pool of two, but a behaviour change, not a free win.

The reason the earlier end-to-end attempt could not settle this: a match draws
~100 lines across **112 dialogue pools** (min 2, median 6, max 22), so no single
pool is sampled enough times in one run to have a distribution at all. Counting
repeats across a whole match is a blunt instrument for a per-pool guarantee.

---

## 7. Open work

**Needs a Mac** (the owner has access):
- `pnpm build:ios` — 52 assets to vendor, needs network.
- `npm run shoot:store` — writes `store/01..08`, deletes the retired 2D
  images. The script is verified end to end; only the art gate blocks it here.
  **The existing `store/*.png` are from the retired 2D game — Guideline 2.3.3
  is what the last submission was rejected for.**

**Product gaps:**
- **No failure state.** You cannot lose. This is a real design question and
  it is the owner's call, not an engineering one.
- **No localisation layer.** All copy is inline English.
- Privacy policy contact is the owner's personal email.

**Unresolved / worth re-checking:**
- **Layout determinism.** `island.ts` says Maple is deterministic. Measured
  layouts agree to within 0.1% but not exactly — and that residue cannot be
  separated from CDN-blocked async prop loading in this sandbox. Re-run
  `qa/determ.mjs` somewhere the CDN resolves.
- **Two candidate posters** for Lantern Night exist
  (`hf_20260802_020636_0bc97a9d…` is wired, `hf_20260802_020637_ab38aed8…` is
  the alternate). Neither can be viewed here. The owner should pick.

---

## 8. The QA kit

`artifacts/3d-game/qa/` — fourteen Playwright probes. `pace.mjs` is the
important one: it found that the two worlds a child plays first were the two
whose matches died in the last forty seconds. Also `sizes`/`dens` for "it feels
empty" as a number, `pockets` for invisible walls, `contrast2` for HUD
legibility, `ground` for texture-vs-lighting, `replay` for whether run 20
differs from run 2, `lnsound` for whether a score that compiles actually makes
a sound, and `fresh` for whether the crowd's recency guard does anything.

`fresh.mjs` is the one to copy the *shape* of when a per-unit guarantee needs
proving. It drives the shipped function through a QA hook rather than a copy of
it, it checks its own metrics against two oracles with known answers before
trusting them (uniform must give 1/n and mean gap n; round-robin must give 0
and exactly n), and it reports the number that would reveal the fix having
made things worse alongside the one that shows it working.

Setup: `npm i -D playwright`, then build, then `npx vite preview --port 4177`.
If Playwright is a global install, ESM will not find it —
`ln -sfn /opt/node22/lib/node_modules/playwright node_modules/playwright`.

**Traps, all learned the hard way:**
- The software renderer is 1/9 to 1/40 real time — never quote a wall clock.
  Sample against `__matchState().t`.
- `preserveDrawingBuffer` is off, so reading the live WebGL canvas returns
  black. Screenshot, then decode the PNG in-page.
- `glb()` registers props asynchronously — anything fingerprinting the world
  early counts a different one each run.
- A whole-set hash flips on ONE prop; it cannot measure degree.
- A box mean cannot see a text outline.
- Do not rebuild while a determinism or replay probe is running.

---

## 9. How to work on this

The thing that has repeatedly worked: **measure, change, re-measure, and
believe the number over the intuition.** In one session the measurements
overturned four confident wrong answers —

- a size cliff that turned out not to be costing any pace;
- a "bug" in the first-run flow that was documented design;
- an eyebrow whose defect was resolution, not shape;
- an environment-map "upgrade" that made the control world 15% darker, with
  "no world's exposure moves" already written into the file next to it.

Equally: **two of the audit's most useful results were "change nothing"** —
ground detail across the worlds, and Pirate Bay's theme, both of which looked
wrong and measured fine.

When a probe and your expectation disagree, suspect the probe first (see the
trap list above and in `qa/README.md`) — but once the probe is sound, take the
number.
