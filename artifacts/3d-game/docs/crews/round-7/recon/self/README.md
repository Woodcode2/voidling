# Our own frames, measured the way theirs were

Taken 2026-09-06 from the build at the head of `claude/holeio-recon`, via `qa/menushot.mjs`,
`qa/shot.mjs maple` and `qa/_worldshots.mjs maple` on port 4177 (viewport 430×932, DPR 2;
the `gw` frames DPR 3). `self.py` reports the playfield chroma histogram (HUD bands
excluded, chroma = (max−min)/255 as in the recon), and locates the void by its violet
cluster. Numbers are quoted in `../../holeio.polish-plan.md` §0 and stream D.

| file | t | what it shows |
|---|---|---|
| `menu.png` | — | the menu: dark violet ground `#1b0f38`, painted art over 82% of height |
| `maple-spawn-t5.png` | 5 s | void 159 px = 18.5% of width; 26% of the playfield near-neutral; timer already at 2:55 |
| `maple-mid-t88.png` | 88 s | the void fully hidden behind a landmark; only the joystick ring shows |
| `maple-late-t163.png` | 163 s | void at 17 m = 31.9% of width; 9% of the playfield near-neutral |
| `pirate-spawn-t5.png` | 5 s | void 20.7% of width; 14.7% of the playfield near-neutral (sand is warm, chroma median 0.19) |
| `pirate-mid-t88.png` | 88 s | void 23.3% of width; 8% near-neutral |
| `pirate-late-t163.png` | 163 s | void 31.2% of width; 2% near-neutral |
| `gameday-spawn-t5.png` | 5 s | void 20.7% of width; **70% of the playfield near-neutral** (grey lot, chroma median 0.06), props at p90 chroma 0.51 — the neutral stage, already in our engine |
| `gameday-mid-t88.png` | 88 s | void 26.8% of width; 55% near-neutral |
| `gameday-late-t163.png` | 163 s | void 31.5% of width; 64% near-neutral |

Caveats: the rim figure is meaningless for a sphere with no rim (it counts the whole lit body).
The first version of the finder (lilac-or-dark) picked shadows and the space edge on three
frames; `self.py` now uses the violet body mask only, rows 5–75% of the playfield, and gives
20.2–20.7% of width at spawn and 31.2–31.9% late on both worlds (the DPR-2 `qa/shot.mjs`
frame gave 18.5% at spawn). Corrected here, not hidden. The `gw` mid and
late frames are autopilot runs, so the occlusion is one observation, not a rate.
