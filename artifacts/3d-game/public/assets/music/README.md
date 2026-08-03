# Music drop-in — one slot per world

Drop a looping track in here under the world's name and that world plays it.
Leave it out and the world keeps its hand-written synthesised score. **Presence
of the file is the entire switch** — no flag, no code change, no rebuild of the
audio engine to A/B a track.

| file | world | what it must sound like |
|---|---|---|
| `maple.mp3` | MAPLE FALLS 🍁 | sleepy American small town, autumn, county fair. Warm, unhurried, a bit brass-band. |
| `pirate.mp3` | PIRATE BAY 🏴‍☠️ | five-star tropical resort cosplaying as a pirate hideout. Steel drums, ukulele, holiday shuffle. |
| `gameday.mp3` | GAME DAY 🏈 | college football Saturday. Drumline, brass stabs, crowd energy. |
| `lantern.mp3` | LANTERN NIGHT 🏮 | a spirit night market. Koto/shakuhachi colour, lantern-lit, gentle and a little uncanny. |

`theme.mp3` is Maple's legacy name and still works, but only when the
`voidTheme=1` localStorage flag is set. New tracks should use the table above.

## How it behaves

`startMusic()` in `src/proto3d/audio3d.ts` fetches the slot for the current
world. If it decodes, it plays on a gapless crossfade loop. If it 404s — which
is the case for every world today — that world falls back to its own synth
score, which is what ships now and is genuinely per-world (`startTown`,
`startTropical`, `startGameday`, `startLantern`).

Verified with `node qa/lnsound.mjs <world>`: with no files present the beds run
at ~12 voices/sec on Maple and ~45 on Pirate Bay, so the fallback is live.

The synth score is **not** stopped when a recording lands, because there is no
shared stop across the four scores — so `startMusic` deliberately does not start
one as a stopgap while a track downloads. A 404 is one round trip, so the synth
still comes up effectively immediately when there is no file.

## Licence — this is a children's app, so it is not optional

Use **CC0 / Public Domain / Pixabay Licence / Kenney CC0** only: no attribution
obligation, commercial use allowed, no share-alike. Good sources:

- **Kenney** (kenney.nl/assets — music packs, CC0)
- **OpenGameArt** filtered to CC0 (opengameart.org)
- **Pixabay Music** (Pixabay Content Licence)
- **Incompetech / Kevin MacLeod** is CC-BY — usable, but it *requires*
  attribution in the app. If you use it, the credit has to go somewhere a
  reviewer can find it, and that is a real obligation. Prefer CC0.

Avoid anything CC-BY-NC (non-commercial bars an App Store release) or
CC-BY-SA (share-alike is incompatible with a closed binary).

**Keep the source URL and a screenshot of the licence page in this folder** for
every track shipped. That record is what answers a rights query later.

## Getting the files in

This dev container's egress proxy blocks external hosts, so tracks cannot be
downloaded here. CI can: push a `.github/asset-manifest.txt` whose first line is
`artifacts/3d-game/public/assets/music` and whose remaining lines are the track
URLs, and `.github/workflows/fetch-assets.yml` fetches and commits them. It also
transcodes `.m4a` to `.mp3`, because open-source Chromium cannot decode AAC.

Rename the fetched `candidate-N.*` files to the slot names in the table above.
