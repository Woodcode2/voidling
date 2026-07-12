# VOIDLING — App Store shipping guide

Everything in this folder is ready for an iOS submission. The web build is the
game; Capacitor wraps it in a native shell.

## What's already done

- **App icon** — `public/icon-1024.png`: top-charts-style 3D scene — the void
  (eyes + blush on the rim, galaxy pit) devouring a skyscraper at a city
  intersection. Alternate takes in `store/candidates/`. Already installed at
  `ios/App/App/Assets.xcassets/AppIcon.appiconset/` and wired into the web app
  (`favicon.png`, `apple-touch-icon.png`, `icon-192/512.png`, `manifest.json`).
- **Launch screen** — cosmic splash (2732×2732) in
  `ios/App/App/Assets.xcassets/Splash.imageset/`.
- **App Store screenshots** — `store/01..05-*.png`, iPhone 6.7" (1290×2796):
  menu, skin shop, downtown WORLD ENDER, savanna zoo, champion results.
  Upload these directly to App Store Connect (6.7" slot covers 6.5" too).
- **Capacitor** — `capacitor.config.ts` (appId `com.voidling.game`), iOS
  platform generated in `ios/` (SwiftPM, no CocoaPods needed), portrait-only,
  status bar hidden, haptics + status-bar plugins installed.

- **Audio** — 30 layered WAV SFX (`public/assets/audio/`) + 3 intensity-tiered
  music tracks (`public/assets/music/track_1..3.mp3`, chill → groove → epic,
  crossfading on evolution). Synth engine remains as offline fallback.

- **Preview video** — `store/preview.mp4` (1080x1920 H.264, 30s, music bed),
  auto-transcoded by CI from `store/preview-raw.webm`. Upload to the App
  Preview slot above the screenshots.
- **Analytics** — live funnel pipeline: batched client (`src/game/analytics.ts`)
  → Supabase edge function `ingest-events` → `vd_events` table (project
  `uzkzuxwykajzoicuxhic`). Key events: first_open, day_open, round_start,
  round_end, evolve, knockout, shop_view, purchase_intent/complete. Query
  funnels in the Supabase SQL editor.
- **Notifications** — Daily Bite reminder at 18:30 next-day, scheduled after
  each session (`src/game/notifications.ts`). Permission is requested after
  the FIRST finished match, never at boot.
- **Weekly ladder** — TOP VOIDS board (menu pill), seeded per ISO week,
  player climbs with their best family-match score of the week.

## In-App Purchases (App Store Connect setup)

The client uses cordova-plugin-purchase (StoreKit) with product ids
`com.voidling.skin.<id>` — create these as **Non-Consumable** IAPs in
App Store Connect with matching ids:

| Product id | Skin | Suggested tier |
|---|---|---|
| com.voidling.skin.lava | Lava | Tier 2 ($1.99) |
| com.voidling.skin.ghost | Ghost | Tier 2 ($1.99) |
| com.voidling.skin.galaxy | Galaxy | Tier 3 ($2.99) |
| com.voidling.skin.midas | King Midas | Tier 3 ($2.99) |
| com.voidling.skin.disco | Disco | Tier 3 ($2.99) |
| com.voidling.skin.dragon | Dragon | Tier 4 ($3.99) |

Purchases unlock via the ownership callback (also fires on RESTORE PURCHASES
in the shop, an App Review requirement). On web the same flow runs in a
sandbox mock so it stays testable. Test with a Sandbox Apple ID before
submission.

## Build & submit (on a Mac with Xcode 15+)

```bash
cd artifacts/3d-game
pnpm install
pnpm build              # web build -> dist/
npx cap sync ios        # copies dist/ into the iOS shell
npx cap open ios        # opens Xcode
```

In Xcode:
1. Select the **App** target → Signing & Capabilities → pick your team.
2. Product → Archive → Distribute App → App Store Connect → Upload.
3. In App Store Connect: create the app (bundle id `com.voidling.game`,
   name **VOIDLING**), attach the uploaded build, add the `store/` screenshots,
   fill in metadata, submit for review.

## Suggested store metadata

- **Name**: VOIDLING
- **Subtitle**: The cute world ender
- **Keywords**: hole, io, black hole, eat, city, arcade, casual, devour, grow
- **Description opener**: "Feed a tiny void until it swallows the whole city.
  Outgrow your rivals, dodge the ones bigger than you, and end the world —
  adorably." Then: 3:30 matches, SOLO RUN mode, mutations, rare & legendary
  skins, trophies and ranks.
- **Category**: Games → Arcade (secondary: Casual)
- **Age rating**: 4+ (cartoon fantasy violence: none — people are "relocated
  to the void")

## TestFlight

After the first upload, add internal testers in App Store Connect →
TestFlight. External testing needs one beta review (~1 day).
