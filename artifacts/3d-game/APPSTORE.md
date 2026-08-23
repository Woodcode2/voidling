# THE CUTE WORLD ENDER — App Store shipping guide

> **THE NAME (2026-08-23).** "Voidling" is a live App Store arcade game
> already (Voidling by Douglas Johnson, updated 2026) — Apple names are
> unique, so the app ships as **THE CUTE WORLD ENDER** (store name, ≤30
> chars) with home-screen label **World Ender** (fits untruncated; set via
> Capacitor appName). "Voidling" remains the SPECIES and first form inside
> the game — no in-world copy changes. Searches found no registered
> trademark on the phrase; the full four-word name had zero collisions.

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
- **App Store screenshots** — `pnpm shoot:store` captures **eight** at
  1290x2796 (the 6.7" slot, which also covers 6.5"): menu, world picker, a
  match mid-devour, Lantern Night's market and bathhouse, Game Day, the shop
  framed on the legendary tier, and the results screen. It seeds a wallet and a
  play history first so the shop photographs the catalogue rather than an empty
  account, and it REFUSES to run until the art is vendored — screenshots of grey
  boxes would misrepresent the app in the other direction. Run it against
  `vite preview`, never the dev server, which hot-reloads the page mid-capture.
  It deletes every old `.png` in `store/` BEFORE the first capture and verifies
  all eight exist afterwards, so a run that fails half way leaves an obviously
  short set rather than a plausible mixture of old and new.
- **The existing `store/01..06-*.png` MUST BE REPLACED.**
  They are of the RETIRED 2D game, which is no longer what the bundle runs.
  Submitting screenshots that do not match the app is Guideline 2.3.3, and it
  is what got the previous attempt rejected. `shoot:store` now handles this
  itself — it purges them before shooting.
- **`store/preview.mp4` IS ALSO THE RETIRED 2D GAME, AND THERE IS NO TOOL TO
  RESHOOT IT.** The transcode step below turns `preview-raw.webm` into the mp4,
  but nothing produces that raw capture, so "reshoot it" is not an instruction
  anyone can follow. An App Preview is **optional** in App Store Connect.
  Until a real one exists: **do not upload the existing file** — submitting a
  video of a different game is the same 2.3.3 finding as the screenshots.
  Ship the eight screenshots alone, or record a fresh capture by hand first.
- **Capacitor** — `capacitor.config.ts` (appId `com.voidling.game`), iOS
  platform generated in `ios/` (SwiftPM, no CocoaPods needed), portrait-only,
  status bar hidden, haptics + status-bar plugins installed.

- **Audio** — 30 layered WAV SFX (`public/assets/audio/`) + **six** recorded
  tracks: one per world plus the menu theme (`public/assets/music/{menu,maple,
  pirate,gameday,lantern,powder}.mp3`), all mastered to the house spec
  (−16 LUFS ±1, ≤−1 dBTP). Presence of the file is the entire switch; absent
  means that world plays its synth score, which remains the fallback.
  (This said "3 intensity-tiered tracks, `track_1..3.mp3`". No such file has
  existed for months.)

- **Preview video** — **DO NOT UPLOAD.** `store/preview.mp4` exists and is
  footage of the RETIRED 2D game. This bullet used to end with an instruction
  to put it in the App Preview slot — fourteen lines after the block above
  tells you that same file is a Guideline 2.3.3 rejection. A deliverables list
  that contradicts itself gets followed at the point it is actionable, so the
  instruction is gone rather than merely qualified.
  An App Preview is optional. Ship the screenshots alone until a real capture
  of the 3D game exists.
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
  `src/prototype3d.ts`) in front of all FIVE things that spend money or leave
  the app: the legendary void purchase, the HAT purchase, RESTORE PURCHASES,
  the privacy-policy link, and the analytics switch. (This said "four" and
  omitted hats — the code gates them, but this bullet is what gets pasted into
  App Review notes, and it under-described the app while leaving out the path a
  reviewer is most likely to tap.) Two-digit x one-digit multiplication, re-rolled
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

The client uses cordova-plugin-purchase (StoreKit). `initIAP()` registers
`Object.values(IAP_PRODUCTS)` at boot — **SEVENTEEN products**: the
five legendary voids AND the twelve paid hats. Create every one of them as a
**Non-Consumable** in App Store Connect with ids that match EXACTLY. The bridge
is `src/proto3d/store3d.ts`; the shop wiring is in `src/prototype3d.ts`.

An everything-bundle SKU shipped for one commit and was REMOVED by the owner's
decision ("I don't like the idea of everything free forever") —
do not create `com.voidling.bundle.everything`, ever.
The game also has a soft GEM currency
(earned in play, spends on premium colourways); gems are NOT purchasable for
money today. If gem packs are ever sold they will be **Consumable** products —
a separate owner decision and a separate review conversation, recorded here
when it happens.

### Voids — five, all one price

| Product id | Skin | Price | Character |
|---|---|---|---|
| com.voidling.skin.univoid | Uni-Void | $2.99 | unicorn: horn, mane, star eyes |
| com.voidling.skin.rexling | Rexling | $2.99 | dino: snout, crest, scales |
| com.voidling.skin.shadowninja | Shadow Ninja | $2.99 | ninja: mask, stitching |
| com.voidling.skin.drako | Drako | $2.99 | dragon: muzzle, wings, embers |
| com.voidling.skin.kingvoid | King Void | $2.99 | the crown, gold rim, stardust |

ONE price across all five — Apple tier 3 ($2.99). Every product is the same size
of decision, so the only question left is which character you like best. A
tiered ladder asked a six-year-old to rank five things by a number they cannot
judge, and asked a parent to approve $9.99 for a skin in a children's game.

Archmage and Mecha-Void were cut: Archmage's blue-violet measured weighted dE
17.2 from the FREE default skin, and Mecha-Void's rim AND glow were
byte-identical to a coin skin's, so a parent would have paid $5.99 for a colour
their child already had.

### Hats — twelve registered; the client sells six for gems

**Six of the twelve are sold by the CLIENT for the in-game gem currency**
(chef, cowboy, bobble, flower, space, propeller — the owner's earnable half of
the wardrobe) and their StoreKit registrations are PARKED: keep the products
registered exactly as listed so the ids stay reserved and a future pricing
decision needs no review of this file, but the client never opens a payment
sheet for them today. The other six (wizard, tricorn, viking, crown, horn,
tycoon) are money-only, as before.

### Hats — twelve, four price points

Any hat goes on any void, which is why they are a second slot rather than more
skins. Prices come from `src/proto3d/hats.ts`; `party` is free and is NOT an IAP.

| Product id | Hat | Price |
|---|---|---|
| com.voidling.hat.chef | Chef Toque | $1.99 |
| com.voidling.hat.cowboy | Ten-Gallon | $1.99 |
| com.voidling.hat.bobble | Bobble Beanie | $1.99 |
| com.voidling.hat.flower | Flower Crown | $1.99 |
| com.voidling.hat.wizard | Star Wizard | $2.99 |
| com.voidling.hat.tricorn | Pirate Tricorn | $2.99 |
| com.voidling.hat.viking | Viking Helm | $2.99 |
| com.voidling.hat.space | Space Helmet | $2.99 |
| com.voidling.hat.propeller | Propeller Cap | $2.99 |
| com.voidling.hat.crown | Crown of the Void King | $4.99 |
| com.voidling.hat.horn | Rainbow Horn | $4.99 |
| com.voidling.hat.tycoon | The Tycoon | $6.99 |

Note the tension with the one-price rule above: the hats DO ladder, $1.99 to
$6.99. That is deliberate — a hat is an accessory and the ladder is a size-of-
gift signal a parent reads, not a ranking a child is asked to make — but if the
ladder is ever cut, cut it here and not on the voids.

What still needs a human with the Apple account:

1. Create all SEVENTEEN non-consumables above, each at the price listed, with a
   localized display name, description, and a review screenshot (`store/07-skins.png`
   covers the voids; the hat card art renders from geometry, so a shop capture
   works for those too). If any already exist at an older price, edit the tier —
   do NOT create a second product, the ids must stay exactly as listed.
2. Fill in the Paid Applications agreement and banking/tax details, or every
   product stays in "Missing Metadata" and StoreKit returns nothing.
3. Test each product end to end with a Sandbox Apple ID before submitting.

Behaviour, by platform:

- **iOS (Capacitor shell)** — real StoreKit. `initIAP()` registers all
  seventeen at boot, `purchase()` opens the sheet, and the `approved` handler unlocks
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

### Step 1 in plain words: the pictures are not in the app yet

The game's artwork — 17 images (the skin cards, the shop art) and 34 3D models
(houses, towers, palm trees, cars, the helicopter) — **is not stored in this
project**. It lives on a server on the internet, and the game downloads it every
time someone plays.

That is fine for the website. A browser is online by definition, and there is a
rule in `vercel.json` that quietly forwards each request to that server.

**It does not work for an iPhone app.** The app runs off files on the phone.
There is no server to forward anything, so every one of those 51 requests fails.
The game does not crash — it is built to cope — it just draws a plain shape
instead. On a real phone that means:

- the five paid skins are **featureless coloured balls**. Someone pays $2.99 and
  gets a sphere.
- the void loses the galaxy inside it
- the sky goes flat
- all 34 models — every house, tree, tower and car — become **grey boxes**

So the files have to be **copied into the project** before the app is built.
That is all "vendoring" means: copying them in. `node scripts/vendor-assets.mjs`
does it — it reads the game's own source to work out exactly which 51 files are
needed, downloads them into `public/`, and refuses anything suspiciously small
(a CDN error page saved as a `.glb` passes an existence check and fails on the
phone, which is the worst possible time to find out).

**It has to run on a machine with ordinary internet.** It is one command, and
`pnpm build:ios` runs it for you as its first step, so in practice you do not
type it separately — you just need to be somewhere the download can happen.
Re-running is free; it skips anything already on disk.

### Why the build cannot catch this for you

Every piece of generated art is referenced as a same-origin path
(`/assets/hf/…`, `/assets/hf3d/…`). Those paths resolve ONLY because
`vercel.json` rewrites them to two CloudFront distributions, with
`vite.config.ts` mirroring the rewrite for the dev server.

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
   name **The Cute World Ender**), attach the uploaded build, add the `store/` screenshots,
   fill in metadata, submit for review.

## Suggested store metadata

- **Name**: The Cute World Ender
- **Subtitle**: Eat the whole town in 3 mins
  - 28 of the 30 allowed. It used to repeat the Name in different case, which
    spends the second-most-valuable search field in the listing on words that
    already rank from the first. This one adds "eat", "town" and "3 mins" —
    the verb, the object and the session length, which is the question a parent
    in the store is actually asking.
- **Keywords**: hole, black hole, eat, city, arcade, casual, devour, grow, void
  - the bare token `io` is gone. On its own it is not a word a player searches,
    it exists only to ride the `.io` genre suffix, and 4.1 of the Review
    Guidelines treats metadata that leans on another app's name as
    impersonation. `hole` already reaches the same searches without inviting
    the question. `void` earns its place in a way `io` never did.
- **Description opener**: "Feed a tiny void until it swallows the whole town.
  Outgrow your rivals, dodge the ones bigger than you, and end the world —
  adorably." Then: 3-minute matches, three to five rival voids to outgrow,
  **five worlds** — Maple Falls, Pirate Bay, Game Day, Lantern Night and
  Powder Pass — six evolution forms, rare & legendary skins, trophies and ranks.
  (This said "two worlds", then "four worlds", each time a world late. The
  source of truth is `WORLD_ORDER` in `src/game/unlocks.ts` and it has five
  entries. Understating the app is not a 2.3.1 finding the way overstating it
  is, but this block is pasted straight into App Store Connect and it was
  selling a fifth of the game to nobody.)
  Do NOT mention mutations — they are not in this build. Store copy that
  describes absent features is Guideline 2.3.1. SOLO RUN *is* now in the build
  (it was coded, wired and hidden behind an inline display:none) and may be
  named: "no rivals, eat the whole town".
- **Category**: Games → Arcade (secondary: Casual)
- **Age rating**: **4+**, and answered honestly rather than defensively — the
  content questionnaire finds nothing to declare. Nobody is hurt, nobody dies,
  nobody is trapped; every newsroom file carries an explicit rule that no line
  may say a person was eaten, and the substitution point enforces it.
  NOTE: Apple replaced the tiers in July 2025 — they are now 4+, 9+, 13+, 16+
  and 18+; **12+ and 17+ no longer exist and there has never been a 6+**. The
  questionnaire was re-issued with new mandatory questions (in-app controls,
  app capabilities, violent themes) and every app had to re-answer by
  31 Jan 2026, so this must be filled in fresh rather than inherited.
  WHY NOT 9+, since hole.io is 9+ at 360M downloads: 9+ only buys headroom for
  infrequent cartoon violence, mild horror and mild profanity, and we want none
  of it — taking the rating without using it is pure cost. The cost is real and
  one-directional: a device with Screen Time content restrictions set to "4+"
  cannot see or download a 9+ app at all, and the children most likely to be
  restricted are the 6-8 half of our core audience. A 4+ app is visible at
  every setting. The rating is a content ceiling, not an audience label —
  Minecraft is 9+ and nobody reads that as "for nine-year-olds".
- **Kids Category**: stay OUT. Separate decision from the age rating. Guideline
  1.3's ratchet clause — "once customers expect your app to follow the Kids
  Category requirements, it will need to continue to meet these guidelines in
  subsequent updates, even if you decide to deselect the category" — makes
  entry permanent, and it bars the third-party analytics any paid acquisition
  needs. We adopt Kids-Category-grade behaviour voluntarily and say so in the
  copy, which is worth more than the badge.

## App Privacy — the answers, question by question

**App Store Connect will not let you submit until this section is answered, and
the answers become the public privacy label.** It is a separate screen from the
age-rating questionnaire above and it is easy to miss; the Xcode steps in this
document used to end at "Archive" and never mention it.

**Do not answer "No, we do not collect data."** It is the intuitive answer,
because the switch is off until a grown-up turns it on — but the binary
demonstrably contains a POST to a server, and a privacy label that contradicts
the binary is a Guideline 5.1.1(vi) finding. On a children's app that is the
worst possible thing to be found under-disclosing.

Answer it like this:

| App Store Connect asks | Answer | Why |
|---|---|---|
| Do you or your third-party partners collect data from this app? | **Yes** | One optional POST to our own Supabase function. |
| Which data types? | **Diagnostics → Other Diagnostic Data** only | Gameplay counters and a coarse device tier. Nothing else is sent. |
| Contact info / Identifiers / Purchases / Location / Contacts / User Content / Search / Browsing / Health / Financial / Sensitive | **None of them** | There is no user id, no IDFA, no device id, no location, no free text. The only text box in the app is the parental gate's number pad, which never leaves the device. |
| Is Other Diagnostic Data linked to the user's identity? | **No** | There is no identity to link it to. The session id is minted per launch and never written to storage. |
| Is it used for tracking? | **No** | It never leaves for an ad network and is never joined to anything. |
| What is it used for? | **App Functionality** | Telling whether a level is too hard and whether the game runs on a class of phone. |

Three supporting facts, each checkable in the source, in case review asks:

- **One external host.** `src/game/analytics.ts` holds the only non-relative
  `fetch()` in the bundle. No ad SDK, no third-party analytics, no crash
  reporter, no remote config.
- **No persistent identifier.** An earlier build minted a `vd_uid` into
  localStorage; it was removed, and the key is now actively deleted on load so
  an install that already has one stops sending it. Under COPPA a persistent
  identifier collected from a child *is* personal information.
- **Off by default.** `logEvent()` returns early unless a grown-up has switched
  analytics on in settings.

`ios/App/App/PrivacyInfo.xcprivacy` declares the same thing to Apple's tooling
and is in the App target's Resources build phase. `node qa/privacy.mjs` fails
the build if any of the above stops being true.

## TestFlight

After the first upload, add internal testers in App Store Connect →
TestFlight. External testing needs one beta review (~1 day).
