#!/bin/bash

# Observatory - Start Script
# Starts backend API and frontend dev server

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT=8100
FRONTEND_PORT=3100

echo "Starting Observatory..."

# Kill any existing processes on our ports
lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true
lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true

sleep 1

# Start backend using venv python directly
echo "Starting backend on port $BACKEND_PORT..."
cd "$SCRIPT_DIR/backend"
"$SCRIPT_DIR/backend/.venv/bin/uvicorn" app.main:app --port $BACKEND_PORT --reload &
BACKEND_PID=$!
echo $BACKEND_PID > "$SCRIPT_DIR/.backend.pid"

# Wait for backend to be ready
echo "Waiting for backend..."
sleep 3

# Verify backend is running
if ! curl -s "http://localhost:$BACKEND_PORT/api/companies" > /dev/null 2>&1; then
    echo "Warning: Backend may not be ready yet. Give it a few more seconds."
fi

# Start frontend
echo "Starting frontend on port $FRONTEND_PORT..."
cd "$SCRIPT_DIR/frontend"
NEXT_PUBLIC_API_URL="http://localhost:$BACKEND_PORT" npm run dev -- -p $FRONTEND_PORT &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$SCRIPT_DIR/.frontend.pid"

echo ""
echo "Observatory is starting up!"
echo "  Backend:  http://localhost:$BACKEND_PORT"
echo "  Frontend: http://localhost:$FRONTEND_PORT"
echo ""
echo "Run ./stop.sh to shut down"
