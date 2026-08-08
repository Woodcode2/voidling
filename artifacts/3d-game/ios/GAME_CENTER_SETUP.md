# Game Center — NOT SHIPPED. Do not follow the old steps.

**This document used to tell you to enable Game Center. Do not.** It opened
with "The code is done and wired", and both halves of that were false. It sat
in the submission folder giving the exact opposite instruction to
`App/App.entitlements`, which is three files away and says:

> The Game Center entitlement was declared here and never used. […] Declaring
> it makes the archive fail unless the capability is enabled on the App ID, and
> once enabled App Store Connect expects a configured leaderboard that nothing
> submits a score to. It also contradicted privacy.html, which correctly tells
> parents the game has no social features.

## What is actually true

Checked against the tree, not remembered:

| Claim the old doc made | Reality |
|---|---|
| `GameCenterPlugin.swift` is in the App target | `grep GameCenter ios/App/App.xcodeproj/project.pbxproj` → **0 matches**. It is in no target and no build config. |
| The code is "done and wired" | `initGameCenter()` is called from exactly one place: `src/main.tsx:46`. |
| …and that entry point ships | It does not. `vite.config.ts` has a single rollup input, `index.html`, under the comment "THE RETIRED 2D GAME IS NO LONGER BUILT". `index.html` loads `src/prototype3d.ts`, which imports no leaderboard module. |
| `App.entitlements` declares the capability | It is an empty `<dict/>` containing only the comment above. |

So the shipping app contains no Game Center code path at all. Following the old
steps would have enabled a capability nothing calls, created an App Store
Connect leaderboard nothing writes a score to, and put both in front of a
reviewer reading `public/privacy.html:39` — "no chat, no social features".

## If Game Center is ever actually wanted

It is a real feature, not a bug, and the pieces still exist
(`src/game/gameCenter.ts`, `ios/App/App/GameCenterPlugin.swift`). Reviving it
means all of this, and none of it is optional:

1. Call `initGameCenter()` from the SHIPPING entry point (`src/prototype3d.ts`),
   not from `src/main.tsx`. Until that happens nothing else below matters.
2. Submit a score from somewhere. A leaderboard Apple can see but the game never
   writes to is worse than no leaderboard.
3. Add `GameCenterPlugin.swift` to the `App` target in Xcode (*Target
   Membership* ▸ App) and set *Code Signing Entitlements* to
   `App/App.entitlements`.
4. Restore the entitlement key in `App.entitlements` AND enable the capability
   on the App ID — the archive fails if you do one without the other.
5. Create the leaderboard in App Store Connect with ID `voidling.weekly.best`,
   matching `GC_LEADERBOARD_ID` in `gameCenter.ts`. Integer, High→Low.
6. **Update `public/privacy.html` first.** It currently promises parents there
   are no social features. A Game Center alias shown next to other players is a
   social feature, and shipping it against that sentence is the kind of
   contradiction App Review reads as a misrepresentation rather than an
   oversight.

The weekly ladder the game already has is local and seeded per ISO week
(see APPSTORE.md). It needs none of the above and tells parents nothing untrue.
