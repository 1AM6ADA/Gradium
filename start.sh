#!/bin/bash
set -e

echo "🚀 Starting EduTest AI..."

# Backend
echo ""
echo "📦 Setting up backend..."
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt -q
echo "✅ Backend dependencies installed"

# Start backend in background
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "✅ Backend running on http://localhost:8000 (PID: $BACKEND_PID)"

# Frontend
echo ""
echo "📦 Setting up frontend..."
cd ../frontend
if [ ! -d "node_modules" ]; then
    npm install
fi
echo "✅ Frontend dependencies installed"

# Start frontend
npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend running on http://localhost:3000 (PID: $FRONTEND_PID)"

echo ""
echo "🎉 EduTest AI is running!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo "   API docs: http://localhost:8000/docs"
echo ""
echo "📝 Add your Google Gemini API key to backend/.env"
echo "   GOOGLE_API_KEY=your-key-from-aistudio.google.com"
echo ""
echo "Press Ctrl+C to stop all services"

wait
