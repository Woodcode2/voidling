# Retired 2D game — art

This is the art for the **retired 2D game**. It is kept because
`vite.config.ts` deliberately keeps that game's *source* in the tree
("The source stays in the tree; it just stops shipping. Restore this line if
the 2D game is ever revived") — and art that has been deleted cannot be
revived alongside it.

It lives here rather than in `public/` because **Vite copies `publicDir`
wholesale into the build output**. Nothing has to reference a file for it to
ship; being in `public/` is enough. That is how 200 MB of art for a game that
is no longer built ended up inside every web deploy and every iOS binary.

## What was measured

The authoritative test is the set of `/assets/…` **path literals** in the
emitted bundle, because a reference that resolves at runtime has to appear as a
path. Extracted from `dist/index.html` + `dist/assets/*.js` + `*.css`, the 3D
game references exactly four things out of `public/assets/`:

| kept | why |
|---|---|
| `audio/` (all 30 files) | reached via the one dynamic path in the whole bundle: `fetch("/assets/audio/" + name)`. The directory has to stay whole. |
| `music/theme.mp3` | referenced by literal path |
| `splash_hero.webp` | referenced by literal path |
| `splash_hero_sm.webp` | referenced by literal path |

Everything else — 138 files, 199 MB — had **zero** references. Sprite sheets
(`zoo_clay_sheet`, `downtown_clay2_sheet`, `airport_clay_sheet`, …), the ground
textures, `island_map.png`, the tutorial `ui/guide_*.png`, the world-picker
`card_maple/card_pirate.webp`, `splash.png`, `splash_screen.jpg`, and the
`layers/` and `fx/` sets are all reachable only from `src/game/` and `src/ui/`,
neither of which is a build entry.

There is exactly **one** dynamically-composed `/assets/` path in the emitted
code and it is the audio one above, so there is no wildcard escape hatch that a
literal scan could have missed.

## Two traps this hid behind

**A stem match is not a reference.** A first pass counted `skins/dragon.png` as
live because the *string* `"dragon"` appears in the bundle — as a skin **id**,
not a path. `ghost` matched the three.js CSS colour `ghostwhite`; `pond` matches
`correspond`; `scar` matches minified identifiers. Match on the path, not the
filename stem, or you will keep 13 MB you do not need and believe you checked.

**`webDir` pointed somewhere innocent.** `capacitor.config.ts` says
`webDir: 'dist'`, so `public/` looks unrelated to the iOS binary. Vite copies
`public/` *into* `dist/` at build time, so it was 205 MB of the 207 MB `dist/`.

## Reviving the 2D game

Restore the `classic` entry in `vite.config.ts` `rollupOptions.input`, then move
this directory back to `public/assets` and merge it with what is there now. Note
that `src/game/iap.ts` registers six product ids that do not exist in App Store
Connect and its non-native branch grants skins for free — read the comment at
`vite.config.ts:282` before shipping any of it.

## Also in here

`music/track_1.mp3` is byte-identical to the shipped `music/theme.mp3`
(md5 `e3f47fa7…`); `track_2` and `track_3` differ from it and from each other.
None of the three is referenced.
