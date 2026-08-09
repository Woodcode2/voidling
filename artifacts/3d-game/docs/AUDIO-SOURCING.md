# Where to get music and SFX for VOIDLING

This is a **children's app** going to the App Store, so the licence matters more
than the track. The rule for everything below:

> **Accept: Pixabay Content Licence, CC0, Public Domain, Kenney, Mixkit, Sonniss.
> Reject: anything CC-BY-NC (bars commercial release outright) and, by
> preference, anything CC-BY (the credit is a real, enforceable obligation).**

Keep a record of every file's source and licence even when attribution is not
required. `CREDITS.txt` next to the asset is enough, and the CI fetch writes it
automatically.

---

## WHAT IS ACTUALLY MISSING — the whole shopping list

**Music** → `public/assets/music/<slot>.mp3`. Presence of the file is the entire
switch; no code change, no flag, no rebuild.

| slot | world | what to search for |
|---|---|---|
| `maple.mp3` | Maple Falls 🍁 | `small town`, `americana`, `autumn`, `marching band`, `wholesome`, `county fair` |
| `pirate.mp3` | Pirate Bay 🏴‍☠️ | `tropical`, `steel drum`, `ukulele`, `beach`, `calypso`, `island holiday` |
| `gameday.mp3` | Game Day 🏈 | `drumline`, `stadium`, `sports rock`, `brass`, `pep band`, `fanfare` |
| `lantern.mp3` | Lantern Night 🏮 | `koto`, `shakuhachi`, `night market`, `festival`, `mystical`, `lo-fi japanese` |

`theme.mp3` (the menu) is already in place.

**SFX** → `public/assets/audio/<name>`. The engine asks for exactly three, and
falls back to its synth voice if a file is absent or fails to decode:

| file | when it fires | what to search for |
|---|---|---|
| `eaten_deep.wav` | swallowing something big | `deep whoosh`, `swallow`, `gulp`, `impact soft`, `sub drop` |
| `evolve_epic.wav` | evolving to the next form | `power up`, `level up`, `magic sparkle`, `riser`, `transform` |
| `win_warm.wav` | winning a match | `success`, `fanfare`, `win jingle`, `celebration`, `positive` |

---

## THE SITES, AND WHERE TO LOOK ON EACH

### Start here — no attribution, commercial-safe

**Pixabay** — the best default for both.
- Music: <https://pixabay.com/music/> — use the left sidebar to filter by
  **Genre** and **Mood**. Search the terms in the table above.
- SFX: <https://pixabay.com/sound-effects/> — same search box.
- Licence: Pixabay Content Licence. Free commercial use, **no attribution
  required**. You may not redistribute the audio *as* audio (i.e. don't ship a
  soundtrack album); using it inside a game is exactly what it is for.

**Kenney** — <https://kenney.nl/assets?q=audio>
- The single best source for a cute game's UI and impact sounds. Packs worth
  grabbing: *Interface Sounds*, *UI Audio*, *Impact Sounds*, *Digital Audio*,
  *Music Jingles*.
- Licence: **CC0**. No attribution, no conditions. Already the standard this
  repo's art follows.

**Mixkit** — <https://mixkit.co/free-sound-effects/> and
<https://mixkit.co/free-stock-music/>
- Licence: Mixkit Free Licence — commercial use, no attribution. Read the page
  once; a few items are "Mixkit Premium" and are not free.

### Deeper libraries, worth the extra care

**Freesound** — <https://freesound.org>
- Search, then **filter by licence in the left sidebar and select `Creative
  Commons 0`**. This is the important step: Freesound is a mixed pool and plenty
  of it is CC-BY or CC-BY-NC. The licence is per sound, not per site.
- Best for raw, characterful one-shots — gulps, whooshes, pops.

**Sonniss — GDC Game Audio Bundle** — <https://sonniss.com/gameaudiogdc>
- Every year Sonniss releases a very large (tens of GB) bundle of professional
  SFX libraries, free and **royalty-free for commercial game use**. Past years
  stay downloadable. This is where "expensive game" sound comes from.
- Overkill for three files, but if you want one download that solves SFX
  permanently, it is this one.

**OpenGameArt** — <https://opengameart.org/art-search-advanced>
- Set **Art Licence → CC0** in the advanced search. Quality varies a lot;
  good for filler, rarely for a hero track.

### Make it yourself — genuinely a good option for two of the three

**jsfxr** <https://sfxr.me> · **ChipTone** <https://sfbgames.itch.io/chiptone> ·
**Bfxr** <https://www.bfxr.net>
- Browser tools that generate game SFX from a few sliders. Output is yours
  outright, no licence question at all. `eaten_deep.wav` and `evolve_epic.wav`
  are exactly the kind of sound these are built for.

### Avoid for this project

| source | why |
|---|---|
| **Incompetech / Kevin MacLeod** | CC-BY. Usable, but the credit is enforceable and has to live somewhere a reviewer can find it. |
| **Uppbeat, Epidemic Sound, Artlist** | Free tiers require credit or an active subscription — if the subscription lapses, the licence for a shipped app gets murky. |
| **YouTube Audio Library** | Terms are scoped to YouTube. Not a licence for an App Store binary. |
| Anything **CC-BY-NC** | Non-commercial bars a paid or ad-supported release outright. |

---

## PRACTICAL NOTES BEFORE YOU DOWNLOAD

- **Format.** Music as `.mp3`. SFX as `.wav`. Open-source Chromium **cannot
  decode AAC**, so an `.m4a` must be transcoded — the CI fetch does this
  automatically.
- **Length.** 60–120s for a music loop is plenty; a match is three minutes.
  Prefer tracks that already loop, or ones whose ending is quiet enough to
  crossfade. The engine loops with a scheduled equal-power crossfade, so a hard
  ending is survivable but a natural loop is better.
- **Size.** Keep each track under ~3 MB. This ships in an app bundle.
- **Loudness.** Aim around −16 LUFS. The mix is tuned for a phone speaker, not
  headphones.
- **Vocals.** Avoid them. Lyrics date fast, localise badly, and compete with the
  chatter bubbles.

## LANDING A FILE

**By hand:** download, drop it in the folder under the exact slot name, commit.
That is the whole procedure.

**By CI**, if the file is behind a URL: put it in `.github/asset-manifest.txt`
as `slot<TAB>url<TAB>licence`. This dev container's egress proxy blocks external
hosts, so from a session this is the only route that works.

**Then verify:** `node qa/music.mjs` loads each world in a real browser and
reports whether the recording or the synth is playing. It is the only check that
catches a file that downloaded fine and does not decode.
