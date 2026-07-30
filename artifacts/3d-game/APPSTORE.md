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
- **App Store screenshots** — `store/01..06-*.png` EXIST BUT MUST BE RESHOT.
  They are of the RETIRED 2D game, which is no longer what the bundle runs.
  Submitting screenshots that do not match the app is Guideline 2.3.3, and it
  is what got the previous attempt rejected. Same for `store/preview.mp4`.
  Reshoot at iPhone 6.7" (1290×2796) from the 3D build before submitting.
- **Capacitor** — `capacitor.config.ts` (appId `com.voidling.game`), iOS
  platform generated in `ios/` (SwiftPM, no CocoaPods needed), portrait-only,
  status bar hidden, haptics + status-bar plugins installed.

- **Audio** — 30 layered WAV SFX (`public/assets/audio/`) + 3 intensity-tiered
  music tracks (`public/assets/music/track_1..3.mp3`, chill → groove → epic,
  crossfading on evolution). Synth engine remains as offline fallback.

- **Preview video** — `store/preview.mp4` (1080x1920 H.264, 30s, music bed),
  auto-transcoded by CI from `store/preview-raw.webm`. Upload to the App
  Preview slot above the screenshots.
- **Analytics** — OFF BY DEFAULT, and behind a parental gate. Batched client
  (`src/game/analytics.ts`, 3D wrapper `src/proto3d/telemetry.ts`) → Supabase
  edge function `ingest-events` → `vd_events` table (project
  `uzkzuxwykajzoicuxhic`). Nothing is transmitted until a grown-up switches
  ANONYMOUS STATS on in Settings and answers the gate; verified as zero
  requests in the first 16 seconds of a cold boot.

  There is NO persistent identifier. The old `vd_uid` is gone and is actively
  deleted from any device that still has one, `installed_at` and `first_open`
  are gone with it, and the device fingerprint (dpr, viewport, cores, memory,
  touch) collapsed to a single `low`/`mid`/`high` tier. Apple's Kids rule bars
  sending personal OR DEVICE information to a third party, and Supabase is a
  third party. The cost is real: D1/D7 retention can no longer be computed,
  because measuring it means recognising the same child across launches.

  Events: day_open, app_open, device, play_tap, world_pick, tutorial_view/done,
  load_wait, match_start, evolve, caught, ate_rival, match_end, match_quit,
  shop_view, skin_view, skin_buy, skin_short, legendary_tap, gate_pass,
  gate_cancel, purchase_intent/complete, session_end. match_end and match_quit
  carry fps + worst-second fps, so a quit spike can be checked against the
  hardware tier that produced it. Filter on `app_version`: the 3D game reports
  `3d-v*`, the retired 2D build `2d-v*`.
  **`analytics/funnels.sql`** holds the ready-made queries. The D1/D7 retention
  query in it no longer returns anything and is kept only as a record of what
  was dropped.
- **In-app pause** — the ⌂ button opens a pause sheet (SOUND / RUMBLE / KEEP
  PLAYING / LEAVE) and the match holds still behind it. Backgrounding the app
  pauses it too. Before this there was no pause at all and no way to reach
  sound mid-match, because `#btnSettings` lives inside `#menu` and measures
  0x0 during play — a parent who needed quiet had to end the child's run.
- **Storage-safe** — every `localStorage` call in the game module goes through
  a guarded shim that falls back to memory. With storage blocked (iOS "Block
  All Cookies", a managed school profile, an iframe embed, a full quota) the
  build used to throw on import and render a perfect, completely dead main
  menu. Verified: with `localStorage` throwing on every access the game now
  boots, loads 3,303 props and runs a match with zero page errors.
- **iPhone only** — `TARGETED_DEVICE_FAMILY = "1"`. There is no iPad layout
  (`#btnPlay` is the same 224px wide at 390pt and at 1366pt), and declaring
  family 2 makes App Store Connect demand 13" iPad screenshots before it will
  enable Submit. If iPad is ever wanted it needs a real layout scaled off
  `min(vw,vh)`, not just the flag flipped back.
- **Kids-category compliance** — a real parental gate (`askGrownUp()` in
  `src/prototype3d.ts`) in front of all four things that spend money or leave
  the app: the legendary purchase, RESTORE PURCHASES, the privacy-policy link,
  and the analytics switch. Two-digit x one-digit multiplication, re-rolled
  every time. The gate is enforced in BOTH directions on the analytics row, so
  a child cannot silently undo a parent's choice.
- **Privacy policy** — `public/privacy.html`, served at `/privacy.html`. Paste
  that URL into App Store Connect's Privacy Policy field; it is also linked
  from Settings behind the gate. Update the contact address in it if you want
  something other than a personal inbox on a public page.
- **Notifications** — NOT SHIPPED. `src/game/notifications.ts` exists but is
  imported only by `src/game/engine.ts`, the retired 2D build, which the
  bundle no longer runs. Nothing schedules a reminder. The plugin is still in
  package.json; either wire it into the 3D build or drop the dependency, but
  do not claim it in store copy.
- **Weekly ladder** — TOP VOIDS board (menu pill), seeded per ISO week,
  player climbs with their best family-match score of the week.

## In-App Purchases (App Store Connect setup)

The client uses cordova-plugin-purchase (StoreKit) with product ids
`com.voidling.skin.<id>` — create these as **Non-Consumable** IAPs in
App Store Connect with ids that match EXACTLY. The bridge is
`src/proto3d/store3d.ts`; the shop wiring is in `src/prototype3d.ts`.

FIVE products, not seven. Archmage and Mecha-Void were cut: Archmage's
blue-violet measured weighted dE 17.2 from the FREE default skin, and
Mecha-Void's rim AND glow were byte-identical to a coin skin's, so a parent
would have paid $5.99 for a colour their child already had.

| Product id | Skin | Price | Character |
|---|---|---|---|
| com.voidling.skin.univoid | Uni-Void | $2.99 | unicorn: horn, mane, star eyes |
| com.voidling.skin.rexling | Rexling | $2.99 | dino: snout, crest, scales |
| com.voidling.skin.shadowninja | Shadow Ninja | $2.99 | ninja: mask, stitching |
| com.voidling.skin.drako | Drako | $2.99 | dragon: muzzle, wings, embers |
| com.voidling.skin.kingvoid | King Void | $2.99 | the crown, gold rim, stardust |

ONE price across all five — Apple tier 3 ($2.99). Every product is the same
size of decision, so the only question left is which character you like best.
A tiered ladder asked a six-year-old to rank five things by a number they
cannot judge, and asked a parent to approve $9.99 for a skin in a children's
game. **Create all five at the same tier in App Store Connect.**

What still needs a human with the Apple account:

1. Create the five non-consumables above, all at the SAME price tier
   ($2.99 / tier 3), each with a localized display name, description, and a
   review screenshot (the shop card art in `public/assets/hf/` is fine).
   If any of these already exist at an older price, edit the tier — do not
   create a second product, the ids must stay exactly as listed.
2. Fill in the Paid Applications agreement and banking/tax details, or every
   product stays in "Missing Metadata" and StoreKit returns nothing.
3. Test each product end to end with a Sandbox Apple ID before submitting.

Behaviour, by platform:

- **iOS (Capacitor shell)** — real StoreKit. `initIAP()` registers all five
  at boot, `purchase()` opens the sheet, and the `approved` handler unlocks
  the skin and calls `finish()` on the transaction. Prices shown in the shop
  come from StoreKit itself, so they are correct in every storefront and
  currency; the USD figures above are only the fallback.
- **Web (the public URL)** — no payment path exists, so the shop says
  "COMING SOON ON iPHONE" and grants nothing. This is deliberate: the older 2D
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
pnpm build:ios          # vendor art -> build -> verify art -> sync into iOS
npx cap open ios        # opens Xcode
```

`build:ios` is those four steps in order:

```bash
node scripts/vendor-assets.mjs       # downloads 51 art files into public/
pnpm build                           # web build -> dist/
node scripts/check-assets.mjs dist   # refuses to continue if art is missing
npx cap sync ios                     # copies dist/ into the iOS shell
```

Vendoring skips anything already on disk, so re-running costs one directory
listing. Run it on the same Mac you archive from — it needs ordinary internet
access and nothing else.

### The vendoring step is not optional

Every piece of generated art — 17 skin and card images, 34 GLB meshes — is
referenced as a same-origin path (`/assets/hf/…`, `/assets/hf3d/…`). Those
paths resolve ONLY because `vercel.json` rewrites them to two CloudFront
distributions, with `vite.config.ts` mirroring the rewrite for the dev server.

A Capacitor bundle has neither. It loads from `file://` with no server in
front of it, so on device every one of those requests fails and the game falls
back to plain shapes: paid skins render as featureless balls, the void loses
its galaxy interior, the sky goes flat, and all 34 meshes — including every
car — become boxes. The build succeeds regardless, which is why this went
unnoticed; `dist/` has always shipped with zero AI art in it.

`scripts/vendor-assets.mjs` extracts the reference set from the source (so a
new skin enrols itself automatically), downloads each file into `public/`, and
rejects anything under 1 KB — a CDN error page saved as a `.glb` passes an
existence check and fails on device, which is the worst possible time to find
out. `scripts/check-assets.mjs` is the guard; run it before every archive.

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
  adorably." Then: 3-minute matches, five rival voids to outgrow, two worlds,
  six evolution forms, rare & legendary skins, trophies and ranks.
  Do NOT mention SOLO RUN, mutations or reminders — none of them are in this
  build. Store copy that describes absent features is Guideline 2.3.1.
- **Category**: Games → Arcade (secondary: Casual)
- **Age rating**: 4+ (cartoon fantasy violence: none — people are "relocated
  to the void")

## TestFlight

After the first upload, add internal testers in App Store Connect →
TestFlight. External testing needs one beta review (~1 day).
