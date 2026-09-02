# Round 5 — the launch-brief round (opened 2026-09-02)

Executing `docs/FABLE-LAUNCH-BRIEF.md`. Three workflows, launched in this order:

| workflow | run | lanes | what it does |
|---|---|---|---|
| `refute-six` | `wf_8f69658f-a4d` | family, drum, popup, hand, board, cards | six independent skeptics attack the six landings the governor verified alone on 2026-09-01 (§3 of the brief, "do this first") |
| `streams-visual` | `wf_38c9ff3f-502` | sky (C), placement (A1), rungs (B1), firstframe (D) | crew files an exact proposal → skeptic applies it in its own worktree and re-measures |
| `streams-content` | `wf_788e6c53-a16` | purpose (A2), albedo (B2), newsroom; plus world6 (design only) and name (memo) | same pipeline; world6 and name are memos with no skeptic — the governor and the owner judge |

The exact briefs every agent ran under are in `briefs/` — they are the
instructions, so they are part of the record.

## Files this round produces
- `refute-<key>.verdict.md` — the six refutations
- `<key>.proposal.md` — a crew's exact patch (hunks grouped per independent change)
- `<key>.verdict.md` — the skeptic's per-hunk ruling on it
- `shots/<key>-*.png`, `shots/<key>-skeptic-*.png` — canvas screenshots
- `world6.design.md`, `name.memo.md`
- new probes land in `qa/` (new files only; crews never modify tracked files in the main checkout)

## The protocol this round (new)
- **Worktrees.** Every crew and skeptic runs in its own git worktree with
  `node_modules` symlinked from the main checkout, builds there, and serves its
  own build on its own port (crews 4180–4186, skeptics 4200–4206). The main
  checkout's preview on :4177 is the shared, unpatched BEFORE. Two crews
  patching one working tree was the alternative, and it would have contaminated
  every measurement.
- **The GPU lock.** `mkdir /tmp/gpu.lock` (atomic) around every chromium run,
  released in the same command; stale after 25 min. This box has 4 CPUs; two
  swiftshader browsers at once make the GPU process fail and both report
  failures that are not findings (the gate learned this the hard way).
- **Concurrency.** The workflow runtime caps concurrent agents at CPUs−2 = 2 per
  workflow, so the three workflows run at most six agents at once; lanes are
  ordered by priority (sky and placement first).

## Landing rule
The governor lands only hunk groups a skeptic ruled SOUND or SOUND WITH
CORRECTIONS (corrections applied verbatim), one group at a time, each with the
probe that fails before it, then the gate on a quiet box before main moves.
KILLED groups are recorded here, never hidden.
