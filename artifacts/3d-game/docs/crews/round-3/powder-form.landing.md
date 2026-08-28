# crew:powder-form — LANDING

**The verdict is the specification.** `docs/crews/round-3/powder-form.verdict.md`
split the proposal into six pieces and I landed exactly the four it cleared,
with its corrections applied, and left the two it killed on the floor.

| piece | verdict | what I did |
|---|---|---|
| FINDING 1 — Powder is flat | SOUND | reproduced a third time, on my own cold instrument, before touching anything |
| **B** — `GRAIN.powder` weights | SOUND WITH CORRECTIONS | **LANDED**, `[0.20,0.06,0.00,9]` → `[0.45,0.16,0.22,7]`, comment rewritten off canvas numbers and a device-pixel table |
| **A** — the bake's wind/chip pass | SOUND WITH CORRECTIONS | **LANDED**, 1b/1c after the base speckle loop |
| **C1** — `body.castShadow` size gate | NOT LANDABLE AS FILED | **NOT LANDED.** A compiling shape is proposed at the bottom of this note for a future round, and nothing more |
| **C2** — the ring-weighted disc | KILLED | **NOT LANDED**, and not refiled |
| `qa/groundgrain.mjs` | fails today — good, bar is wrong | **LANDED with a re-derived bar**: one limb, `median tile sd ≥ 0.0060`. The flat-share limb is printed and NOT gated |
| `qa/grounding.mjs` | SOUND WITH CORRECTIONS + one missed | **LANDED**, instrument first — and I found two more instrument faults on top of the one the skeptic found |

FINDING 2 — the mascot casts no ground shadow — **stands, confirmed, and has no
landed fix.** See §6; it is written down here so that it is not lost with C1.

Nothing is committed. Files touched: `src/proto3d/island.ts`,
`qa/groundgrain.mjs` (new), `qa/grounding.mjs`. `src/proto3d/alpine.ts` was
cleared for me and I did not need it — §7.

---

## 0. THE BUILDS, SO EVERY NUMBER BELOW HAS AN ADDRESS

PLACEHOLDER-BUILDS

---
PLACEHOLDER-BODY
