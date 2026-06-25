# Gradium

Gradium is a web platform for teachers and students that helps generate, edit, share, and complete tests based on uploaded lecture materials.

Teachers can upload PDF/PPTX lecture files, generate tests with AI, edit questions, run live sessions, and track student results. Students can join tests, answer questions, and generate lecture summaries.

## Features

### For teachers

* Upload lecture materials
* Generate tests from uploaded files
* Edit generated questions
* Regenerate questions
* Start live test sessions
* Share tests with students using a join code
* View student results and leaderboard
* Export attendance and roster data

### For students

* Join tests by code
* Answer test questions
* View results
* Generate summaries from lecture materials

## Tech stack

### Frontend

* Next.js
* TypeScript
* Tailwind CSS
* Framer Motion

### Backend

* Python
* FastAPI
* SQLAlchemy
* SQLite
* WebSockets
* PyMuPDF
* python-pptx
* LibreOffice for PPTX/PPT conversion

### AI

* Gemini API
* Model: `gemini-2.5-flash`

### Infrastructure

* Docker
* Docker Compose
* GitHub Actions
* Self-hosted GitHub runner on university VM

## Repository structure

```text
frontend/            Web interface
backend/             Backend API and business logic
ml/                  AI experiments, parsers, and prompts
docs/                API notes, design assets, and project documentation
infra/               Docker and deployment configuration
.github/workflows/   CI/CD workflows
```

## Environment variables

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Important variables:

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash

SECRET_KEY=

BACKEND_PORT=8000
FRONTEND_PORT=80

CORS_ORIGINS=http://10.93.27.10,http://10.93.27.10:80,http://10.93.27.10:3000

NEXT_PUBLIC_API_URL=http://10.93.27.10:8000
NEXT_PUBLIC_WS_URL=ws://10.93.27.10:8000
```

For local development, use localhost values instead:

```env
BACKEND_PORT=8000
FRONTEND_PORT=3000

CORS_ORIGINS=http://localhost:3000

NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

## Run with Docker

Docker is the recommended way to run the project.

```bash
docker compose up -d --build
```

Open:

```text
Frontend: http://localhost:3000
Backend API: http://localhost:8000
Swagger docs: http://localhost:8000/docs
```

For VM deployment:

```text
Frontend: http://10.93.27.10
Backend API: http://10.93.27.10:8000
Swagger docs: http://10.93.27.10:8000/docs
```

Useful commands:

```bash
docker compose ps
docker compose logs -f
docker compose logs backend --tail=100
docker compose logs frontend --tail=100
docker compose down
docker compose down -v
```

## Run without Docker

Install backend dependencies:

```bash
pip install -r backend/requirements.txt
```

Then use the helper scripts:

```bash
./setup.sh
./start.sh
```

Docker is preferred because the backend depends on additional system tools such as LibreOffice for presentation conversion.

## CI/CD

The project uses GitHub Actions with a self-hosted runner on the university VM.

Current deployment flow:

```text
Push or merge to main
→ GitHub Actions starts
→ self-hosted runner checks out the latest code
→ Docker Compose rebuilds the services
→ frontend and backend containers restart on the VM
```

This keeps the deployed version updated automatically after changes are merged into `main`.

## Notes

* `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` are compiled into the frontend at build time. After changing them, rebuild the frontend container.
* Uploaded files and the SQLite database are stored in Docker volumes, so they survive normal container restarts.
* Use `docker compose down -v` only when you intentionally want to remove stored data.
* The first Docker build may take longer because backend dependencies include LibreOffice.
