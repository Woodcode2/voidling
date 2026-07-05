import fs from 'fs';
import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    'PORT environment variable is required but was not provided.',
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    'BASE_PATH environment variable is required but was not provided.',
  );
}

// ── read-only source browser for the dev server ───────────────────────────────
// Routes:
//   <base>/source          → HTML listing of every file under src/
//   <base>/source/<path>   → raw file contents as text/plain; charset=utf-8
// Security: paths with .., .env, or node_modules are rejected; resolution is
// verified to stay inside the project src/ directory.
function sourceBrowserPlugin(basePath: string): Plugin {
  const base = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  const srcRoot = path.resolve(import.meta.dirname, 'src');
  const srcRealRoot = fs.realpathSync(srcRoot);
  return {
    name: 'source-browser',
    configureServer(server) {
      // Insert before Vite's HTML fallback so /source requests are handled first.
      server.middlewares.stack.unshift({
        route: '',
        handle: (req, res, next) => {
          if (!req.url) return next();

          // Strip query and hash; match /source and /<base>/source routes. The base
          // prefix must be rewritten by Vite before its own middleware runs, so this
          // handler runs before that rewrite and sees the original path.
          const pathname = req.url.split(/[?#]/, 1)[0];
          const match = pathname.match(/^\/[^/]*\/source(?:\/|$)|^\/source(?:\/|$)/);
          if (!match) return next();
          const suffix = pathname.slice(match[0].length);

          let rawPath: string;
          try {
            rawPath = decodeURIComponent(suffix);
          } catch {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.end('Bad request');
            return;
          }
          if (!rawPath.startsWith('/')) rawPath = '/' + rawPath;

          // Reject any segment containing .., .env, or node_modules
          const segments = rawPath.split('/');
          if (
            segments.some(
              (p) =>
                p.includes('..') || p.includes('.env') || p.includes('node_modules'),
            )
          ) {
            res.statusCode = 403;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.end('Forbidden');
            return;
          }

          const subPath =
            rawPath === '/' ? '.' : path.normalize(rawPath.slice(1));
          const target = path.resolve(srcRoot, subPath);

          if (!fs.existsSync(target)) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.end('Not found');
            return;
          }

          // Resolve symlinks and enforce real filesystem containment inside src/
          let realTarget: string;
          try {
            realTarget = fs.realpathSync(target);
          } catch {
            res.statusCode = 403;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.end('Forbidden');
            return;
          }
          const relative = path.relative(srcRealRoot, realTarget);
          if (
            relative.startsWith('..') ||
            path.isAbsolute(relative) ||
            (realTarget !== srcRealRoot &&
              !realTarget.startsWith(srcRealRoot + path.sep))
          ) {
            res.statusCode = 403;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.end('Forbidden');
            return;
          }

          const stat = fs.statSync(target);
          if (stat.isDirectory()) {
            // Only the root /source route serves the directory listing; /source/<path>
            // must resolve to a file.
            if (rawPath !== '/') {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'text/plain; charset=utf-8');
              res.end('Not found');
              return;
            }
            const files = listFilesRecursive(target, srcRoot);
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(renderListing(files, base, rawPath));
          } else {
            const content = fs.readFileSync(target, 'utf-8');
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.end(content);
          }
        },
      });
    },
  };
}

function listFilesRecursive(dir: string, root: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(fullPath, root));
    } else if (entry.isFile()) {
      files.push(path.relative(root, fullPath));
    }
  }
  return files.sort();
}

function renderListing(
  files: string[],
  base: string,
  currentPath: string,
): string {
  const items = files
    .map((f) => {
      const url = `${base}/source/${f}`;
      return `<li><a href="${escapeHtml(url)}">${escapeHtml(f)}</a></li>`;
    })
    .join('');
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Source Browser</title>
  <style>
    body { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; background: #0a0818; color: #d4d4d4; padding: 24px; line-height: 1.5; }
    a { color: #7BFFED; text-decoration: none; }
    a:hover { text-decoration: underline; }
    ul { list-style: none; padding: 0; }
    li { padding: 2px 0; }
    h1 { font-weight: 600; font-size: 1.25rem; margin-bottom: 16px; color: #ffffff; }
  </style>
</head>
<body>
  <h1>Source — ${escapeHtml(currentPath === '/' ? 'src/' : currentPath)}</h1>
  <ul>${items}</ul>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[c];
  });
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    sourceBrowserPlugin(basePath),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
