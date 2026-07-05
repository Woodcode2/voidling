---
name: Vite middleware before base-path rewrite
description: Why dev-server middleware in Vite must be unshifted and match the base-prefixed URL path.
---

# Vite middleware before base-path rewrite

When adding a custom dev-server middleware in Vite that intercepts a route, use `server.middlewares.stack.unshift(...)` inside `configureServer` and match the incoming URL **including the configured `base` prefix** (e.g. `/3d-game/source`).

**Why:** Vite's own base-path rewrite middleware runs *after* user middlewares inserted via `unshift`, so the custom handler sees the original request path. If it only matches the post-rewrite path (`/source`), requests coming through the Replit proxy as `/<base>/source` will fall through to the SPA fallback and return `index.html`.

**How to apply:**
- Match `^\/[^/]*\/source(?:\/|$)|^\/source(?:\/|$)` (or similar) so the route works both with and without a base prefix.
- Return `next()` for non-matching routes so the rest of the Vite stack (including the base rewrite and HTML fallback) still runs normally.
