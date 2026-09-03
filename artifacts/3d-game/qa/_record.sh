#!/bin/bash
# RECORD NOW — commit and push one file the moment it exists.
#
#   bash qa/_record.sh <path> "<one-line message>"
#
# Crews die with the container (~35-minute lifetime when probing) and a restart
# reverts the checkout; the remote branch is the only durable copy. Fifteen
# agents once finished with nothing on disk. So every report is pushed the
# moment it is written, by its author, under a file lock so parallel authors do
# not fight over .git/index.
set -e
F="$1"; M="$2"
[ -s "$F" ] || { echo "record: $F is missing or empty"; exit 1; }
cd "$(git rev-parse --show-toplevel)"
flock -w 120 /tmp/git-record.lock bash -c "
  git add -- '$F' &&
  git commit -q -m \"\$0

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AvVs5u7wcmrqDzcSjZMuR8\" &&
  for i in 1 2 3 4; do git push -q -u origin claude/aaa-game-quality-gate-wnxhat && break || sleep \$((i*2)); done &&
  echo \"recorded \$(git rev-parse --short HEAD) $F\"
" "$M"
