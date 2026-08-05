# Music — one slot per world

Drop a looping track in here under the world's name and that world plays it.
Leave it out and the world keeps its hand-written synthesised score. **Presence
of the file is the entire switch** — no flag, no code change, no rebuild.

| file | world | what it must sound like |
|---|---|---|
| `maple.mp3` | MAPLE FALLS 🍁 | sleepy American small town, autumn, county fair. Warm, unhurried, a bit brass-band. |
| `pirate.mp3` | PIRATE BAY 🏴‍☠️ | five-star tropical resort cosplaying as a pirate hideout. Steel drums, ukulele, holiday shuffle. |
| `gameday.mp3` | GAME DAY 🏈 | college football Saturday. Drumline, brass stabs, crowd energy. |
| `lantern.mp3` | LANTERN NIGHT 🏮 | a spirit night market. Koto/shakuhachi colour, lantern-lit, gentle and a little uncanny. |

## The two ways to land a track

**By hand.** Download the mp3, drop it in this folder under the slot name,
commit. That is the whole procedure.

**By CI**, when the file is behind a URL. Push a `.github/asset-manifest.txt`
whose first line is `artifacts/3d-game/public/assets/music` and whose remaining
lines are `slot<TAB>url<TAB>licence` — `.github/workflows/fetch-assets.yml`
downloads each one, transcodes `.m4a` to `.mp3` (open-source Chromium cannot
decode AAC), names it for its slot, and writes the licence record to
`CREDITS.txt` beside it. This dev container's egress proxy blocks external
hosts, so this is the only route that works from a session.

Either way, verify with `node qa/music.mjs` — it loads each world in a browser
and reports whether the recording or the synth is playing, which is the only
check that catches a file that downloaded fine and does not decode.

## Licence — this is a children's app, so it is not optional

**Pixabay Content Licence, CC0, Public Domain or Kenney CC0 only.** All four
allow commercial use with no attribution obligation and no share-alike.

Avoid:
- **CC-BY** (this is what Incompetech / Kevin MacLeod is). Usable, but the
  credit is a real, enforceable obligation that has to live somewhere a
  reviewer can find it. Prefer a licence with no strings.
- **CC-BY-NC** — non-commercial bars an App Store release outright.
- **CC-BY-SA** — share-alike is incompatible with a closed binary.

**Record the source URL and the licence for every track shipped**, in
`CREDITS.txt` in this folder. That record is what answers a rights query two
years from now, and it is the difference between "we licensed this" and "we
think we found it somewhere".

## Where to look, per slot

Searched and read, but **not auditioned** — nothing in this repo can play audio,
and the dev container cannot reach these hosts, so somebody has to listen before
any of it ships. These are starting points, not selections.

| slot | start here |
|---|---|
| `maple` | [Pixabay: banjo instrumental](https://pixabay.com/music/search/banjo%20instrumental/) · [country banjo](https://pixabay.com/music/search/country%20banjo/) · [autumn](https://pixabay.com/music/search/autumn/). One named candidate: [Bluegrass Banjo Time](https://pixabay.com/music/traditional-country-bluegrass-banjo-time-4307/) |
| `pirate` | [Pixabay: steel drum](https://pixabay.com/music/search/steel%20drum/) · [happy ukulele](https://pixabay.com/music/search/happy%20ukulele/) · [tropical island](https://pixabay.com/music/search/tropical%20island/). One named candidate: [Zouk — Marimba & Steel Drum](https://pixabay.com/music/island-zouk-caribbean-music-marimba-amp-steel-drum-3362/) |
| `gameday` | [Pixabay: drumline](https://pixabay.com/music/search/drumline/) · [marching band](https://pixabay.com/music/search/marching%20band/) · [stadium drums](https://pixabay.com/music/search/stadium%20drums/) |
| `lantern` | [Pixabay: koto](https://pixabay.com/music/search/koto/) · [shakuhachi](https://pixabay.com/music/search/shakuhachi/) · [japanese garden](https://pixabay.com/music/search/japanese%20garden/) |

Also worth a look: **Kenney** (kenney.nl/assets, CC0) and **OpenGameArt**
filtered to CC0. Both are CC0 throughout, so neither carries an attribution
obligation.

### What to listen for

The track plays for the whole of an ~80-second match, on a phone speaker,
under a child. So: no vocals, no sudden silence, no dramatic build that peaks
and dies, and **a loop point that does not click** — the player crossfades, but
it cannot rescue a track that ends on a cymbal decay. Two minutes is plenty.
Quiet and characterful beats loud and generic every time; the game already has
a busy sound bed of crunches and crowd noise to sit under.

## What ships today

Every world falls back to its own hand-written synthesised score — `startTown`,
`startTropical`, `startGameday`, `startLantern` in `src/proto3d/audio3d.ts`.
These are genuinely per-world and genuinely playing: `node qa/lnsound.mjs
<world>` measures ~12 voices/sec on Maple and ~45 on Pirate Bay with no files
present. Nothing is silent while these slots are empty.

`startMusic()` fetches the slot for the current world; if it decodes, it plays
on a gapless crossfade loop, and if it 404s the synth comes up. It deliberately
does **not** start the synth first as a stopgap — `startThemeLoop()` has no way
to stop a running score, so both would play at once.

## One open item: `theme.mp3`

`theme.mp3` is in this folder, it is 1.4 MB, and **it has no licence record**.
It came over from the legacy 2D game, where it also appears as
`legacy-2d/assets/music/track_1.mp3`, byte-identical. It is gated behind the
`voidTheme=1` localStorage flag, so nothing plays it by default — but `public/`
is copied wholesale into `dist/`, which means it is in the shipping bundle
either way.

Two options, and it is the owner's call: establish where it came from and write
that into `CREDITS.txt`, or take it out of `public/` so it stops shipping. It is
in git history either way, so removing it loses nothing.
