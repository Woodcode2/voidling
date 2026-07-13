# Game Center — one-time Xcode / App Store Connect setup

The code is done and wired (JS bridge `src/game/gameCenter.ts`, native
`ios/App/App/GameCenterPlugin.swift`, entitlements `App.entitlements`). The
player's Game Center **alias** flows into `meta.playerName` and shows in-match
+ on the weekly ladder; weekly scores mirror to a Game Center leaderboard.

These steps must be done in Xcode / App Store Connect (they touch the
provisioning profile + Apple's servers, so they can't be scripted):

1. **Add the plugin to the target** — In Xcode, if `GameCenterPlugin.swift`
   isn't already shown under the `App` group, drag it in and check "App" under
   *Target Membership*. (It lives in `ios/App/App/`.)

2. **Enable the capability** — Select the `App` target ▸ *Signing &
   Capabilities* ▸ **+ Capability** ▸ **Game Center**. This also attaches
   `App.entitlements` (set *Code Signing Entitlements* to
   `App/App.entitlements` if it isn't auto-set).

3. **Create the leaderboard** — App Store Connect ▸ your app ▸ *Features* ▸
   *Game Center* ▸ add a **leaderboard** with ID **`voidling.weekly.best`**
   (this exact string matches `GC_LEADERBOARD_ID` in `gameCenter.ts`). Score
   format: Integer, sort High→Low.

That's it. On launch the app calls `signIn()`; on web / simulator without a
Game Center account it silently falls back to the name **"You"**.
