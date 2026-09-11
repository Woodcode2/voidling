#!/bin/bash
# ── EVIDENCE: the gate's stray cleanup killed its own shell ─────────────────
# The failing run behind the strays() fix in gate.mjs (GOVERNOR rule 2).
#
# `pkill -f` matches the FULL COMMAND LINE of every process, and the `bash -c`
# carrying the gate's old one-line cleanup had both of its own patterns inside
# its command line. Run it and the first pkill terminates the shell:
#
#   step1: entering
#   Terminated
#   bash -c returned with status 143
#
# 143 is SIGTERM. "step2" never printed, so the line that kills Playwright's
# Chromium -- the browser every probe in this directory launches -- had never
# run at all. That is trap #6 in docs/HANDOFF.md written down as a hazard
# rather than as this live bug, and it cost a day-4 gate run: `splash` went red
# on a 30-second screenshot timeout and the same build passed 6/6 views the
# moment the stray was killed by hand.
#
# NOTE the patterns below are assembled, never written literally, because a
# literal in ANY command line -- including the shell that greps for it, or the
# terminal invoking this file -- is the very bug being demonstrated.
CL="chrome-linux/chrome"; PW="pw-browsers/chromium"
echo "OLD form (the gate's, verbatim):"
bash -c "echo ' step1: entering'; pkill -f '$CL' 2>/dev/null; echo ' step2: SECOND pkill reached'; pkill -f '$PW' 2>/dev/null; echo ' step3: finished'; true"
echo " bash -c returned with status $?"
echo
echo "FIXED form (bracketed, so a pattern cannot match its own shell):"
bash -c "echo ' step1: entering'; pkill -f 'chrome-[l]inux/chrome' 2>/dev/null; echo ' step2: SECOND pkill reached'; pkill -f 'pw-browsers/[c]hromium' 2>/dev/null; echo ' step3: finished'; true"
echo " bash -c returned with status $?"
