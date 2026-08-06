import UIKit
import Capacitor
import AVFoundation

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    /// THE RING/SILENT SWITCH WAS SILENCING THE WHOLE GAME.
    ///
    /// Nothing anywhere in ios/ set an audio session category, so WKWebView
    /// used its default of `soloAmbient` — which obeys the hardware mute
    /// switch. A phone left on silent played no music, no newsroom sting and
    /// no chomp, while the game's own sound toggle went on saying sound was
    /// ON. That is most hand-me-down kids' phones, and the child has no way to
    /// tell the difference between "muted" and "broken".
    ///
    /// `.playback` is the category for an app whose audio is part of the
    /// content, and it ignores the mute switch. Deliberately WITHOUT
    /// `.mixWithOthers`: this game has four scores of its own, and layering
    /// them over a parent's podcast is worse than taking the session, which is
    /// what every other game on the device does too. Anyone who wants silence
    /// has the in-game toggle, which now tells the truth.
    private func configureAudioSession() {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [])
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            // A failed session is not worth killing the app over — the game is
            // fully playable silent, which is the state it shipped in until now.
            NSLog("VOIDLING: could not configure audio session: \(error)")
        }
    }

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        configureAudioSession()
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
        // AND TAKE THE AUDIO SESSION BACK. An incoming call, Siri, or another
        // app's alarm deactivates ours, and iOS does not hand it back on its
        // own — without this the game comes back from a phone call permanently
        // mute, which reads exactly like the bug this replaced.
        configureAudioSession()
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
