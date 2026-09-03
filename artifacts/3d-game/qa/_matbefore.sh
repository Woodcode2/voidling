#!/bin/bash
# Stream B before-numbers at SEED=7 on the build served on :4177 — resumable:
# a world whose files exist is skipped. usage: bash qa/_matbefore.sh <tag>
TAG=${1:-before}; export SEED=7
D=docs/crews/round-5/materials-data; mkdir -p $D
for w in maple pirate gameday lantern powder; do
  [ -s $D/$w-$TAG.json ] && continue
  while ! mkdir /tmp/gpu.lock 2>/dev/null; do sleep 5; done
  echo "== $w $TAG $(date -u +%H:%M:%S)"
  timeout 600 node qa/lookpair.mjs 4177 $w $TAG > $D/$w-$TAG.lookpair.log 2>&1; echo "   lookpair exit $?"
  cp qa/out/lookpair/${w}_$TAG.png docs/crews/round-5/shots/materials/ 2>/dev/null || { mkdir -p docs/crews/round-5/shots/materials; cp qa/out/lookpair/${w}_$TAG.png docs/crews/round-5/shots/materials/; }
  node qa/kmetric.mjs qa/out/lookpair/${w}_$TAG.png > $D/$w-$TAG.json 2>/dev/null; cat $D/$w-$TAG.json
  timeout 600 node qa/heroswatch.mjs 4177 3 $w > $D/$w-$TAG.hero.log 2>&1; echo "   heroswatch exit $?"; tail -2 $D/$w-$TAG.hero.log
  rmdir /tmp/gpu.lock
  git add -A $D docs/crews/round-5/shots/materials && git commit -q -m "materials: $TAG numbers, $w (SEED=7)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AvVs5u7wcmrqDzcSjZMuR8" && git push -q -u origin claude/aaa-game-quality-gate-wnxhat && echo "   pushed $(git rev-parse --short HEAD)"
done
echo LOOPDONE-$TAG
