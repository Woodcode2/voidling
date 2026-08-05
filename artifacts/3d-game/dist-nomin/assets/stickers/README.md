# Sticker art — 48 cards, one set

`<id>.webp` per sticker, ids in `src/game/stickers.ts`. Drop a file in and that
sticker's card paints; leave it out and the card falls back to its tier glyph.
`stickerFace()` swaps on `onerror`, so a half-delivered set degrades one cell
at a time and the book is never broken and never waits.

## The brief — this is the part that matters

Forty-eight cards have to read as **one set**. Generated one at a time they
drift, and a drifting set looks worse than no art at all, because emoji are at
least consistent with each other. So the style is fixed here and every prompt
inherits it verbatim:

- **One object, centred, whole.** No scenes, no backgrounds, no characters
  holding things. A sticker is an object.
- **Soft 3D toy render** — matte clay surfaces, gentle bevels, the same
  language as the game's own props. Not flat vector, not photoreal, not
  painterly.
- **Key light upper-left, cool bounce lower-right**, identical on every card,
  so a page of 12 does not look like 12 different afternoons.
- **A soft contact shadow directly beneath.** Everything is standing on the
  same invisible floor.
- **Transparent or single flat background.** The card supplies its own colour.
- **Square, 1:1.** Delivered at 512+ and downscaled.
- **Nothing frightening, nobody hurt, no faces on inanimate objects** — the
  void is the only character in this product with a face.

## Getting them in

The dev container's egress proxy blocks the generation CDN, so a session
cannot download them. Push a `.github/asset-manifest.txt` whose first line is
`artifacts/3d-game/public/assets/stickers` and whose remaining lines are
`<id><TAB><url><TAB><licence>`; `.github/workflows/fetch-assets.yml` fetches,
verifies and commits them under the slot name with a CREDITS.txt beside it.
