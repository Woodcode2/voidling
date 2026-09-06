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

Caveats: the blob finder's rim figure is meaningless for a sphere with no rim (it counts the
whole lit body) and its default region picked the space edge on the late frame; the late void
was re-measured with a violet mask restricted to the upper 70% (in the plan). The `gw` mid and
late frames are autopilot runs, so the occlusion is one observation, not a rate.
