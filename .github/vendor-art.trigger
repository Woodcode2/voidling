Bump this file to re-run .github/workflows/vendor-art.yml.

run 1 — 19 images ok, all 34 meshes 403. Job failed wholesale, committed
nothing.
run 2 — commit what lands. 19 images + 17 meshes landed; 17 meshes still 403.
        That is what proved it is RATE LIMITING, not a private distribution:
        the same URLs that refused everything in run 1 served half of them in
        run 2.
run 3 — vendor-assets.mjs now paces itself and retries a 403 with backoff.
