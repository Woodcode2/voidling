#!/bin/bash
# BEFORE shots against the unpatched :4177 build, one world at a time, all under one lock hold.
PORT=${1:-4177}; TAG=${2:-before}; OUT=${3:-/tmp/crew-placement/shots-$TAG}
cd /home/user/voidling/.claude/worktrees/wf_4583cfd9-6a7-1/artifacts/3d-game || exit 1
run() { timeout 900 node qa/placement.mjs "$1" "$PORT" --shots="$OUT" --tag="$TAG" --pick="$2" --json="/tmp/crew-placement/$TAG-$1.json"; }
run maple   "road:2,inside:2,overlap:2,door:1,bench:1,offisland:1"
run pirate  "road:2,roadend:4,inside:1,overlap:2"
run gameday "overlap:2,inside:1,road:1"
run lantern "road:1,water:2,overlap:2,inside:1"
run powder  "water:2,overlap:2,inside:1,road:1"
