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
- **Analytics** — live funnel pipeline: batched client
  (`src/game/analytics.ts`, 3D wrapper `src/proto3d/telemetry.ts`) → Supabase
  edge function `ingest-events` → `vd_events` table (project
  `uzkzuxwykajzoicuxhic`). Filter on `app_version`: the 3D game reports
  `3d-v*`, the retired 2D build `2d-v*`. Key 3D events: first_open, day_open,
  app_open, device, play_tap, world_pick, tutorial_view/done, load_wait,
  match_start, evolve, caught, ate_rival, match_end, match_quit, shop_view,
  skin_view, skin_buy, skin_short, legendary_tap, purchase_intent/complete,
  session_end. match_end and match_quit both carry fps + worst-second fps, so
  a quit spike can be checked against the hardware that produced it. Query
  funnels in the Supabase SQL editor.
- **Notifications** — Daily Bite reminder at 18:30 next-day, scheduled after
  each session (`src/game/notifications.ts`). Permission is requested after
  the FIRST finished match, never at boot.
- **Weekly ladder** — TOP VOIDS board (menu pill), seeded per ISO week,
  player climbs with their best family-match score of the week.

## In-App Purchases (App Store Connect setup)

The client uses cordova-plugin-purchase (StoreKit) with product ids
`com.voidling.skin.<id>` — create these as **Non-Consumable** IAPs in
App Store Connect with ids that match EXACTLY. The bridge is
`src/proto3d/store3d.ts`; the shop wiring is in `src/prototype3d.ts`.

| Product id | Skin | Price |
|---|---|---|
| com.voidling.skin.univoid | Uni-Void | $4.99 |
| com.voidling.skin.rexling | Rexling | $4.99 |
| com.voidling.skin.shadowninja | Shadow Ninja | $4.99 |
| com.voidling.skin.mecha | Mecha-Void | $5.99 |
| com.voidling.skin.archmage | Archmage | $6.99 |
| com.voidling.skin.drako | Drako | $7.99 |
| com.voidling.skin.kingvoid | King Void | $9.99 |

What still needs a human with the Apple account:

1. Create the seven non-consumables above, each with a localized display
   name, description, and a review screenshot (the shop card art in
   `public/assets/hf/` is fine).
2. Fill in the Paid Applications agreement and banking/tax details, or every
   product stays in "Missing Metadata" and StoreKit returns nothing.
3. Test each product end to end with a Sandbox Apple ID before submitting.

Behaviour, by platform:

- **iOS (Capacitor shell)** — real StoreKit. `initIAP()` registers all seven
  at boot, `purchase()` opens the sheet, and the `approved` handler unlocks
  the skin and calls `finish()` on the transaction. Prices shown in the shop
  come from StoreKit itself, so they are correct in every storefront and
  currency; the USD figures above are only the fallback.
- **Web (the public URL)** — no payment path exists, so the shop says
  "ON THE APP STORE" and grants nothing. This is deliberate: the older 2D
  bridge fell back to a sandbox mock that handed the skin over for free on
  any non-native platform, which on a live web build gives away every paid
  skin to anyone who finds the page. `?iapmock=1` re-enables that mock for
  testing only.

**RESTORE PURCHASES** sits at the foot of the shop. App Review requires it for
non-consumables, and a child moving to a new iPad genuinely needs it.

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
