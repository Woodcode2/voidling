#!/bin/bash
# usage: gpu.sh <logfile> <cmd...>  — holds /tmp/gpu.lock for the browser run only
LOG=$1; shift
while ! mkdir /tmp/gpu.lock 2>/dev/null; do
  [ -n "$(find /tmp/gpu.lock -maxdepth 0 -mmin +25 2>/dev/null)" ] && rmdir /tmp/gpu.lock && continue
  sleep 5
done
while [ "$(cut -d' ' -f1 /proc/loadavg | cut -d. -f1)" -ge 3 ]; do sleep 5; done
echo "START $(date -u +%H:%M:%S) $*" > "$LOG"
"$@" >> "$LOG" 2>&1
echo "EXIT $? $(date -u +%H:%M:%S)" >> "$LOG"
rmdir /tmp/gpu.lock
