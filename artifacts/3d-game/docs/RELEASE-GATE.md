# THE RELEASE GATE

*"AAA quality only, with agents gatekeeping before live to ensure quality."*
— the owner, 2026-08-23

Nothing reaches production without passing everything below. This file is the
whole procedure; `qa/gate.mjs` is the part of it a machine can run.

---

## Why this exists

Every one of the 107 named probes in `qa/` prints a verdict and then **exits 0**.
All of them. That is why `docs/FABLE-BRIEF.md` rule 3 has to say *"READ the
output for the word PASS"* — the gate was a person. The same brief records how a
person fails at it:

> `| tail -2` in an `&&` chain prints a connection-refused stack and still lets
> the push through, because `tail` exits 0.

A gate that depends on somebody being awake is not a gate. So the reading is
automated, and the reading has one rule above all others:

> **Silence is failure.** A probe that crashed, timed out, or was pointed at a
> dead server prints no verdict at all. Reading that silence as consent is the
> single most dangerous thing this system could do, so it is an explicit FAIL.

---

## The three layers

### Layer 1 — the machine gate

```bash
node qa/gate.mjs --list                # what would run, and what each step protects
node qa/gate.mjs --selftest            # prove the gate can still fail
node qa/gate.mjs --profile=push        # before any push to the working branch
node qa/gate.mjs                       # the LIVE profile — everything, all five worlds
```

| profile | when | what |
|---|---|---|
| `push` | before every push | typecheck, Maple smoke, econ, iapdoc, uisystem |
| `art` | after any visual change | smoke, juice, uisystem, postpipe and hero on all five worlds |
| `live` | **before anything reaches production** | all of the above plus traverse, vary, aftermatch, switch, newsarc, newsstyle, fresh, joyedge, joyrelease, trackprofile, across all five worlds |

Exit 0 only if every required step reached its own conclusion and that
conclusion was pass. The report lands in `qa/out/gate/report.md`.

**Preflight refuses to measure rather than measure the wrong thing.** No preview
server on the port, or a `dist/` older than `src/`, aborts with exit 2 and the
words *"Nothing was measured. This is not a FAIL of the game."* Gating a stale
bundle is worse than not gating at all, because it passes.

**`--selftest` is not optional ceremony.** It runs four synthetic steps whose
right answers are known — one prints PASS, one prints FAIL, one crashes
silently, one hangs — and the gate has to classify all four correctly. A gate
nobody has watched fail is a green light with no bulb behind it. Run it whenever
a verdict rule in `qa/gate.mjs` is edited.

### Layer 2 — the agent panel

A machine gate only catches what somebody already thought to measure. The panel
exists to find what nothing measures yet — and the case study is in this repo:
`qa/ground.mjs` reported Maple Falls as *"has texture at play distance"* for
months while the owner's own photograph showed a flat lawn. Both were right.
The probe measured grain; nobody had measured sameness. The number that mattered
(87% of the town at one facing) did not exist until an agent went looking.

Nine lenses read HEAD, and every finding is then handed to an **independent
skeptic whose job is to refute it** — open the cited file, check the cited line,
and default to NOT REAL when uncertain. Only what survives goes on the work list.

| lens | asks |
|---|---|
| art-first-glance | what a child sees in the first second, judged against a real render |
| world-openings | the opening frame of each of the five worlds |
| kids-privacy | what leaves the device, what is behind the parental gate, the 4+ rating |
| store-readiness | APPSTORE.md vs the client, the rename sweep, what blocks an archive |
| perf-memory | the stated budget: 60fps tiers, 450 MB heap, 120Hz constants |
| feel | how many channels answer a bite; anticipation and settle; cuts |
| ui-hud | safe areas, 44px targets, contrast, blurs over the canvas |
| economy-repeat | what is different when the child opens the app tomorrow |
| correctness | ordinary bugs on paths a child actually walks |

The panel is advisory on taste and **blocking on kids-privacy and
store-readiness**. Nothing ships with an unresolved finding in those two.

### Layer 3 — the phone

The owner playtests on a real iPhone with his daughter. That is the highest-value
signal in the project and it outranks both layers above.

> **When the phone disagrees with the instrument, widen the instrument.**

This has been true every single time it has come up. The shake round: the census
counted firings and said 19/min was fine; he still felt it, because amplitude
and the lens channel were never in the count. The lawn: the probe measured grain
and said textured; he said bare; sameness had no instrument. Suspect the
instrument first, and if the instrument turns out to be right about its own
question, ask whether it is measuring the right question.

---

## What this gate deliberately does NOT cover

None of the following can be checked from here, and no amount of green above
should be read as covering them. They need a Mac and a device:

- Xcode build, archive, signing, upload, TestFlight.
- Real WKWebView WebGL behaviour, sustained frame rate across a full three
  minutes, thermal throttling, the jetsam memory ceiling, true touch latency.
  **This sandbox renders at ~1 fps under swiftshader — never quote harness frame
  timing as the game's.**
- iOS audio reality: the WebAudio unlock, the silent switch, ducking, and
  recovery after a phone call or a backgrounding.
- Whether the taptic engine actually fires.
- Safe-area insets and the home-indicator gesture against a drag control on a
  notched device.

Screenshots are the honest substitute for the eye, not for the device:
`qa/shippedlook.mjs` photographs the CANVAS, which is the only thing that can
catch a whole-pipeline swap. `qa/_dumpbake.mjs` writes the baked ground texture
out so it can be looked at rather than argued about.

---

## The procedure before going live

1. `node qa/gate.mjs --selftest` — the gate can still fail.
2. `node qa/gate.mjs` — the LIVE profile, green, all five worlds.
3. The agent panel, with the skeptic pass. No open kids-privacy or
   store-readiness finding.
4. A ledger entry in `docs/AAA-BRIEF.md` §7 for every change: MEASURED /
   CHANGED / NOW / GATE, and retractions loudly.
5. The owner's eyes on a real phone.
6. Only then: push to `main`. Push is deploy — never deploy by hand.
