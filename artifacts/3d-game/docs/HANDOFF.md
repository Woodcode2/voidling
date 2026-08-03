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
Capacitor.

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
- **Crowd-line repetition.** A per-pool recency guard is in
  (`pickFresh` in `life.ts`) and is correct by construction, but the
  end-to-end measurement was too noisy at n=2 to prove it (9 and 16 repeats
  against a 21/11/14 baseline). Prove it on the function, not on a match.
- **Layout determinism.** `island.ts` says Maple is deterministic. Measured
  layouts agree to within 0.1% but not exactly — and that residue cannot be
  separated from CDN-blocked async prop loading in this sandbox. Re-run
  `qa/determ.mjs` somewhere the CDN resolves.
- **Two candidate posters** for Lantern Night exist
  (`hf_20260802_020636_0bc97a9d…` is wired, `hf_20260802_020637_ab38aed8…` is
  the alternate). Neither can be viewed here. The owner should pick.

---

## 8. How to work on this

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
trap list in `qa/README.md`) — but once the probe is sound, take the number.
