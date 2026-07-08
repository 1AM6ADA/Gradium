#!/bin/bash
# Start the Gradium (blue v4) backend + frontend for local viewing.
set -e
cd "$(dirname "$0")"

echo "▶ starting backend on :8000 ..."
( cd backend && source venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8000 ) &
BACK=$!

echo "▶ starting frontend on :3000 ..."
npm run dev &
FRONT=$!

trap "echo; echo 'stopping...'; kill $BACK $FRONT 2>/dev/null" INT TERM
echo ""
echo "  Frontend : http://localhost:3000"
echo "  Backend  : http://localhost:8000"
echo "  Login    : teacher@gradium.app  /  gradium123  (premium)"
echo ""
echo "Press Ctrl+C to stop."
wait
