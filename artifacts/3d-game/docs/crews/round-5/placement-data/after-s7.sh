#!/bin/bash
# AFTER at SEED=7 against THIS worktree's build on :4181, photographing the BEFORE run's offender spots.
# usage: after-s7.sh <tag> [worlds...]
export SEED=7
OUT=/tmp/crew-placement
TAG=${1:-after}; shift
WORLDS=${@:-maple gameday lantern powder pirate}
cd /home/user/voidling/.claude/worktrees/wf_92bcb5f4-e68-1/artifacts/3d-game || exit 1
pick() { case $1 in
  maple)   echo "inside:2,overlap:2,road:1,door:1";;
  pirate)  echo "overlap:2,inside:1,roadend:4";;
  gameday) echo "overlap:2,inside:1";;
  lantern) echo "overlap:2,inside:1,water:1";;
  powder)  echo "overlap:2,inside:1,water:1";;
esac; }
for w in $WORLDS; do
  $OUT/gpu.sh $OUT/s7-$TAG-$w.log timeout 900 node qa/placement.mjs $w 4181 --json=$OUT/s7-$TAG-$w.json --shots=$OUT/shots-s7 --tag=$TAG --pick="$(pick $w)" --spots=$OUT/s7-before-$w.json
done
echo ALLDONE >> $OUT/s7-$TAG-done.log
