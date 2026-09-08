// IS dist/ NEWER THAN src/? — the staleness one level up from a stale frame.
//
// qa/pop.mjs was shooting a world only when its PNG was missing, so it answered
// about the previous build; that was fixed. It then answered about the previous
// build anyway, because the DIST was a minute older than the change under test:
// a colour edit was committed, the probe re-shot the frame faithfully, and the
// frame was of a bundle that did not contain the edit. The number came back
// unchanged and read exactly like a refutation of the change.
//
// A probe cannot tell that from a build it never made. So it asks.
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function newest(dir, out = { t: 0, f: null }) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { newest(p, out); continue; }
    const t = statSync(p).mtimeMs;
    if (t > out.t) { out.t = t; out.f = p; }
  }
  return out;
}

/** Throws when the built bundle predates the source it is supposed to contain.
 *  `label` names the probe so the message says who refused to measure. */
export function assertFreshDist(label = 'this probe') {
  // index.html is not in src/ and it is not a detail: it carries every line of
  // the game's CSS and the whole app shell. The first version of this guard
  // watched src/ alone, so a display-type change went in, the bundle stayed
  // older than it, and the guard said "fresh" — the exact failure it exists to
  // stop, one directory across.
  const src = newest('src');
  for (const f of ['index.html', 'vite.config.ts', 'package.json']) {
    if (existsSync(f)) { const t = statSync(f).mtimeMs; if (t > src.t) { src.t = t; src.f = f; } }
  }
  const dist = newest('dist/assets');
  if (!dist.f) throw new Error(`${label}: there is no dist/ to measure — run npm run build`);
  if (src.t > dist.t) {
    const mins = Math.round((src.t - dist.t) / 60000);
    throw new Error(
      `${label}: dist/ is ${mins} minute(s) older than src/ (${src.f} changed after ${dist.f}).\n`
      + '  Nothing was measured. A frame shot from a stale bundle reads exactly like a change that did not work.\n'
      + '  Run: npm run build');
  }
}
