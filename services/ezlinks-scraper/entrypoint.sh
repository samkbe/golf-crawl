#!/bin/bash
set -e

# Container restarts keep /tmp, so a crashed run leaves its lock behind and
# Xvfb refuses to start on the same display.
rm -f /tmp/.X99-lock /tmp/.X11-unix/X99

Xvfb :99 -screen 0 1920x1080x24 -nolisten tcp &
XVFB_PID=$!

sleep 1

if ! kill -0 $XVFB_PID 2>/dev/null; then
    echo "Xvfb failed to start on display :99" >&2
    exit 1
fi

cleanup() {
    kill $XVFB_PID 2>/dev/null || true
}
trap cleanup EXIT

exec node dist/index.js
