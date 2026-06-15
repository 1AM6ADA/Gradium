#!/bin/bash
set -e

echo "🔧 EduTest AI — First-time Setup"
echo "================================="

# Backend
echo ""
echo "1️⃣  Setting up Python backend..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
echo "✅ Backend ready"
deactivate
cd ..

# Frontend
echo ""
echo "2️⃣  Setting up Next.js frontend..."
cd frontend
npm install
echo "✅ Frontend ready"
cd ..

echo ""
echo "3️⃣  Configuration"
echo "================================="
echo "Add your FREE Google Gemini API key to backend/.env:"
echo ""
echo "  GOOGLE_API_KEY=your-key-here"
echo ""
echo "Get a free key at: https://aistudio.google.com/app/apikey"
echo "(Free tier: 15 req/min, no credit card needed)"
echo ""
echo "================================="
echo "✅ Setup complete!"
echo ""
echo "To start the app, run:  ./start.sh"
echo "Or start individually:"
echo "  Backend:  cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
echo "  Frontend: cd frontend && npm run dev"
