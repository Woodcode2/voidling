# Sound effects — three slots, and a synth that covers you

Drop a file here under the exact name and it plays. Leave it out, or ship one
that fails to decode, and the caller silently falls back to the hand-written
synth voice — sound never goes silent either way (`audio3d.ts`, `sample()`).

| file | fires when | search for |
|---|---|---|
| `eaten_deep.wav` | swallowing something big | deep whoosh, swallow, gulp, soft impact, sub drop |
| `evolve_epic.wav` | evolving to the next form | power up, level up, magic sparkle, riser, transform |
| `win_warm.wav` | winning a match | success, fanfare, win jingle, celebration |

`.wav` please — open-source Chromium cannot decode AAC, so `.m4a` has to be
transcoded first.

**Where to get them, and which licences are safe for a children's App Store
release: see `docs/AUDIO-SOURCING.md`.** Short version: Pixabay, Kenney (CC0),
Freesound filtered to CC0, Mixkit, or generate them yourself at sfxr.me.
