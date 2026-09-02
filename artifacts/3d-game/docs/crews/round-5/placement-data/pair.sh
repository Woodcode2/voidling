#!/bin/bash
# BEFORE (:4177, unpatched HEAD) and AFTER (:4181, this worktree's build) at the same SEED,
# world by world, with AFTER shots taken at the BEFORE run's offender coordinates.
export SEED=${SEED:-7}
OUT=/tmp/crew-placement
cd /home/user/voidling/.claude/worktrees/wf_4583cfd9-6a7-1/artifacts/3d-game || exit 1
pick() { case $1 in
  maple)   echo "inside:2,overlap:2,road:1,door:1";;
  pirate)  echo "overlap:2,inside:1,roadend:1";;
  gameday) echo "overlap:2,inside:1";;
  lantern) echo "overlap:2,inside:1,road:1";;
  powder)  echo "overlap:2,inside:1,water:1";;
esac; }
for w in maple gameday lantern powder pirate; do
  timeout 900 node qa/placement.mjs $w 4177 --json=$OUT/s7-before-$w.json --shots=$OUT/shots-s7 --tag=before --pick="$(pick $w)"
  timeout 900 node qa/placement.mjs $w 4181 --json=$OUT/s7-after-$w.json  --shots=$OUT/shots-s7 --tag=after  --pick="$(pick $w)" --spots=$OUT/s7-before-$w.json
done
