#!/bin/bash
# Stream B re-take with the family hidden at the shutter (HIDE_RIVALS=1), for
# a pair one half of which carried a rival. The confounded originals are kept
# beside the re-take as <world>-<tag>.withrivals.* so the record shows both.
#   bash qa/_matretake.sh <port> <tag> <world>...
PORT=$1; TAG=$2; shift 2; export SEED=7 HIDE_RIVALS=1
D=docs/crews/round-5/materials-data; S=docs/crews/round-5/shots/materials
for w in "$@"; do
  while ! mkdir /tmp/gpu.lock 2>/dev/null; do sleep 5; done
  echo "== retake $w $TAG on :$PORT $(date -u +%H:%M:%S)"
  for f in json lookpair.log; do [ -s $D/$w-$TAG.$f ] && [ ! -s $D/$w-$TAG.withrivals.$f ] && mv $D/$w-$TAG.$f $D/$w-$TAG.withrivals.$f; done
  [ -s $S/${w}_$TAG.png ] && [ ! -s $S/${w}_$TAG.withrivals.png ] && mv $S/${w}_$TAG.png $S/${w}_$TAG.withrivals.png
  timeout 600 node qa/lookpair.mjs $PORT $w $TAG > $D/$w-$TAG.lookpair.log 2>&1; echo "   lookpair exit $?  $(grep -E '^\s+(hidden|family)' $D/$w-$TAG.lookpair.log | tr '\n' ' ')"
  cp qa/out/lookpair/${w}_$TAG.png $S/
  node qa/kmetric.mjs qa/out/lookpair/${w}_$TAG.png > $D/$w-$TAG.json 2>/dev/null; cat $D/$w-$TAG.json
  rmdir /tmp/gpu.lock
  git add -A $D $S && git commit -q -m "materials: $TAG re-taken for $w with the family hidden (HIDE_RIVALS=1, SEED=7); the original kept as .withrivals

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AvVs5u7wcmrqDzcSjZMuR8" && git push -q -u origin claude/aaa-game-quality-gate-wnxhat && echo "   pushed $(git rev-parse --short HEAD)"
done
echo RETAKEDONE-$TAG
