// Game Center bridge — authenticates the player on iOS and feeds their real
// Game Center alias into meta.playerName (used in-match + on the ladder).
//
// On web / non-iOS this is a graceful no-op: the plugin isn't registered, so
// signIn() rejects and we keep the 'You' fallback. All calls are best-effort
// and never throw into the game loop.
import { registerPlugin, Capacitor } from '@capacitor/core';
import { meta } from './meta';

// App Store Connect leaderboard identifier — create this ID in App Store
// Connect (Features → Game Center) and it will start receiving scores.
export const GC_LEADERBOARD_ID = 'voidling.weekly.best';

interface GameCenterPlugin {
  /** Authenticate the local player. Resolves with their Game Center identity. */
  signIn(): Promise<{ authenticated: boolean; alias?: string; displayName?: string; playerID?: string }>;
  /** Submit a score to a Game Center leaderboard. */
  submitScore(options: { leaderboardId: string; score: number }): Promise<void>;
  /** Present the native Game Center leaderboard UI. */
  showLeaderboard(options: { leaderboardId: string }): Promise<void>;
}

const GameCenter = registerPlugin<GameCenterPlugin>('GameCenter');

let _authenticated = false;
export function isGameCenterAuthenticated(): boolean { return _authenticated; }

/** True only on the native iOS shell where Game Center exists. */
function onIOS(): boolean {
  return Capacitor.getPlatform() === 'ios' && Capacitor.isNativePlatform();
}

/** Boot-time sign-in. Call once at app start. Pulls the alias into meta. */
export async function initGameCenter(): Promise<void> {
  if (!onIOS()) return;
  try {
    const res = await GameCenter.signIn();
    if (res && res.authenticated) {
      _authenticated = true;
      const alias = res.alias || res.displayName;
      if (alias) meta.setPlayerName(alias);
      console.log('[gamecenter] signed in as', alias);
    }
  } catch (e) {
    console.log('[gamecenter] sign-in unavailable', e);
  }
}

/** Best-effort weekly-best submission. No-ops off iOS or when signed out. */
export async function submitWeeklyBest(score: number): Promise<void> {
  if (!onIOS() || !_authenticated || score <= 0) return;
  try {
    await GameCenter.submitScore({ leaderboardId: GC_LEADERBOARD_ID, score });
  } catch (e) {
    console.log('[gamecenter] submitScore failed', e);
  }
}

/** Open the native Game Center leaderboard, if signed in. */
export async function openGameCenterLeaderboard(): Promise<boolean> {
  if (!onIOS() || !_authenticated) return false;
  try {
    await GameCenter.showLeaderboard({ leaderboardId: GC_LEADERBOARD_ID });
    return true;
  } catch (e) {
    console.log('[gamecenter] showLeaderboard failed', e);
    return false;
  }
}
