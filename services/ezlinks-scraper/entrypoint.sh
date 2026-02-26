#!/bin/bash
set -e

Xvfb :99 -screen 0 1920x1080x24 -nolisten tcp &
XVFB_PID=$!

sleep 1

cleanup() {
    kill $XVFB_PID 2>/dev/null || true
}
trap cleanup EXIT

exec node dist/index.js
