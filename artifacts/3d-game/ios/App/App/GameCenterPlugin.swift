import Foundation
import Capacitor
import GameKit

// Native Game Center bridge for VOIDLING.
// Exposed to JS as `GameCenter` (see src/game/gameCenter.ts).
//
// Xcode setup required once (see the handoff notes):
//   1. Add this file to the "App" target (drag into the project if not listed).
//   2. Target ▸ Signing & Capabilities ▸ + Capability ▸ Game Center.
//   3. App Store Connect ▸ your app ▸ Features ▸ Game Center ▸ add a
//      leaderboard with ID "voidling.weekly.best" (matches GC_LEADERBOARD_ID).
@objc(GameCenterPlugin)
public class GameCenterPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GameCenterPlugin"
    public let jsName = "GameCenter"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "submitScore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showLeaderboard", returnType: CAPPluginReturnPromise),
    ]

    // Authenticate the local player. The handler may fire more than once
    // (present-UI, then success), so guard against resolving the call twice.
    @objc func signIn(_ call: CAPPluginCall) {
        var settled = false
        let player = GKLocalPlayer.local
        player.authenticateHandler = { [weak self] viewController, _ in
            DispatchQueue.main.async {
                if let vc = viewController {
                    self?.bridge?.viewController?.present(vc, animated: true, completion: nil)
                    return
                }
                if settled { return }
                settled = true
                if player.isAuthenticated {
                    call.resolve([
                        "authenticated": true,
                        "alias": player.alias,
                        "displayName": player.displayName,
                        "playerID": player.gamePlayerID
                    ])
                } else {
                    call.resolve(["authenticated": false])
                }
            }
        }
    }

    @objc func submitScore(_ call: CAPPluginCall) {
        guard let leaderboardId = call.getString("leaderboardId") else {
            call.reject("leaderboardId is required")
            return
        }
        let score = call.getInt("score") ?? 0
        guard GKLocalPlayer.local.isAuthenticated else {
            call.reject("not authenticated")
            return
        }
        if #available(iOS 14.0, *) {
            GKLeaderboard.submitScore(score, context: 0, player: GKLocalPlayer.local,
                                      leaderboardIDs: [leaderboardId]) { error in
                if let error = error { call.reject(error.localizedDescription) } else { call.resolve() }
            }
        } else {
            let gkScore = GKScore(leaderboardIdentifier: leaderboardId)
            gkScore.value = Int64(score)
            GKScore.report([gkScore]) { error in
                if let error = error { call.reject(error.localizedDescription) } else { call.resolve() }
            }
        }
    }

    @objc func showLeaderboard(_ call: CAPPluginCall) {
        guard GKLocalPlayer.local.isAuthenticated else {
            call.reject("not authenticated")
            return
        }
        let leaderboardId = call.getString("leaderboardId")
        DispatchQueue.main.async {
            let gcVC: GKGameCenterViewController
            if #available(iOS 14.0, *) {
                if let lid = leaderboardId {
                    gcVC = GKGameCenterViewController(leaderboardID: lid, playerScope: .global, timeScope: .week)
                } else {
                    gcVC = GKGameCenterViewController(state: .leaderboards)
                }
            } else {
                gcVC = GKGameCenterViewController()
                gcVC.viewState = .leaderboards
                if let lid = leaderboardId { gcVC.leaderboardIdentifier = lid }
            }
            gcVC.gameCenterDelegate = self
            self.bridge?.viewController?.present(gcVC, animated: true, completion: nil)
            call.resolve()
        }
    }
}

extension GameCenterPlugin: GKGameCenterControllerDelegate {
    public func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
        gameCenterViewController.dismiss(animated: true, completion: nil)
    }
}
