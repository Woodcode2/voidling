// The single source of truth for "which remote art does this build need".
//
// Both the vendoring script and the build guard read from here, so they can
// never disagree about what the set is — a mismatch between "what we download"
// and "what we check for" is exactly how a skin ends up shipping as a grey ball.
//
// References are extracted from the SOURCE, not from a hand-kept list. Adding a
// new skin or a new GLB to the pack automatically enters it into both.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// The two rewrites in vercel.json, as origins. On the web these are resolved by
// Vercel at request time; inside a Capacitor bundle there is no server to
// rewrite anything, so every one of these has to exist on disk.
// hf3d is gone with the GLB pack — see the note at the top of
// src/proto3d/assets3d.ts. Only the 2D art is remote now.
export const ORIGINS = {
  hf: 'https://d8j0ntlcm91z4.cloudfront.net/user_3EwRtVVfLRGyTM8pDPFQxKcCmqS',
};

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|mjs|html|css)$/.test(e.name)) out.push(p);
  }
  return out;
}

/**
 * Every same-origin art path the build asks for, as web paths rooted at /.
 * Deduplicated and sorted so output is stable between runs.
 */
export function collectRefs() {
  const files = [...walk(path.join(ROOT, 'src')), path.join(ROOT, 'index.html')];
  const refs = new Set();
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    // Plain literals: '/assets/hf/<file>'
    for (const m of src.matchAll(/\/assets\/hf\/[A-Za-z0-9_.-]+\.(png|jpg|jpeg|webp)/g)) refs.add(m[0]);
  }
  return [...refs].sort();
}

/** Web path → the CDN url it is rewritten to in production. */
export function remoteUrl(ref) {
  if (ref.startsWith('/assets/hf/')) return `${ORIGINS.hf}/${ref.slice('/assets/hf/'.length)}`;
  throw new Error(`not a rewritten asset: ${ref}`);
}

/** Web path → where it must live on disk to survive `vite build`. */
export function localPath(ref) { return path.join(ROOT, 'public', ref.replace(/^\//, '')); }

export { ROOT };
