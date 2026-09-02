#!/bin/bash
# BEFORE at SEED=7 against the unpatched :4177 build for the four worlds the first crew did not reach.
export SEED=7
OUT=/tmp/crew-placement
cd /home/user/voidling/.claude/worktrees/wf_92bcb5f4-e68-1/artifacts/3d-game || exit 1
pick() { case $1 in
  maple)   echo "inside:2,overlap:2,road:1,door:1";;
  pirate)  echo "overlap:2,inside:1,roadend:1";;
  gameday) echo "overlap:2,inside:1";;
  lantern) echo "overlap:2,inside:1,road:1";;
  powder)  echo "overlap:2,inside:1,water:1";;
esac; }
for w in gameday lantern powder pirate; do
  $OUT/gpu.sh $OUT/s7-before-$w.log timeout 900 node qa/placement.mjs $w 4177 --json=$OUT/s7-before-$w.json --shots=$OUT/shots-s7 --tag=before --pick="$(pick $w)"
done
echo ALLDONE >> $OUT/s7-before-pirate.log
