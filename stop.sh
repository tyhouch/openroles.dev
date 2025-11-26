#!/bin/bash

# Observatory - Stop Script
# Stops backend API and frontend dev server

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT=8100
FRONTEND_PORT=3100

echo "Stopping Observatory..."

# Kill by PID files if they exist
if [ -f "$SCRIPT_DIR/.backend.pid" ]; then
    kill $(cat "$SCRIPT_DIR/.backend.pid") 2>/dev/null || true
    rm "$SCRIPT_DIR/.backend.pid"
fi

if [ -f "$SCRIPT_DIR/.frontend.pid" ]; then
    kill $(cat "$SCRIPT_DIR/.frontend.pid") 2>/dev/null || true
    rm "$SCRIPT_DIR/.frontend.pid"
fi

# Also kill by port to be safe
lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true
lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true

echo "Observatory stopped."
