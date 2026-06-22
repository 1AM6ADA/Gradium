# Gradium

Gradium is a web platform for teachers and students.

Teachers turn uploaded lecture slides into quizzes with AI, then run them **live** for the class — students join from any device with a code, answer in real time, and see a leaderboard. Students can also summarize PDFs/slides into study notes.

## Versions

- **MVP 0** — AI quiz generation, quiz editing, live single-answer/timed quizzes, code-based join, scoring + leaderboard, PDF summarizer, free/premium gating.
- **MVP 1 (current)** — adds **attendance & CSV export**, **teacher-controlled answer reveal**, **configurable scoring** (per-question points, speed & streak bonuses), **multiple-answer** and **no-time-limit** questions, and the **Captain's Blue** visual identity.

See **[`docs/MVP1.md`](docs/MVP1.md)** for the full MVP 1 feature list and the new/changed API endpoints.

## Repository structure

```text
frontend/            Web interface
backend/             Backend API and business logic
ml/                  AI, document parsing, prompts, and experiments
docs/                API notes, design assets, and technical documentation
infra/               Docker, deployment, and infrastructure configuration
.github/workflows/   CI/CD workflows
```

## Main modules

- Teacher profile
- File upload
- Slide/test generation
- Test editing
- Test sharing with students
- Student test passing
- Partial answer verification
- Lecture summary generation

## How to launch

### With Docker (recommended)

Requires Docker with the Compose plugin.

```bash
# 1. Configure environment
cp .env.example .env
#    then edit .env and set GEMINI_API_KEY (get one at https://aistudio.google.com/app/apikey)

# 2. Build and start both services
docker compose up --build
```

Then open:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API docs (Swagger): http://localhost:8000/docs

Useful commands:

```bash
docker compose up -d --build     # run in the background
docker compose logs -f           # follow logs
docker compose down              # stop and remove containers
docker compose down -v           # also wipe the database/uploads volume
```

**Notes**

- The backend image bundles **LibreOffice** so uploaded PPTX/PPT slides can be
  converted to PDF before AI generation. The first build is therefore larger and
  slower; subsequent builds are cached.
- The SQLite database and uploaded files are persisted in the named volume
  `backend_data` (mounted at `/data`), so they survive `docker compose down`.
- `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL` are compiled into the frontend at
  build time. If you deploy under a different host/domain, set them in `.env`
  and rebuild the frontend image.

### Without Docker (local dev)

- Install everything from `backend/requirements.txt`
- Launch `setup.sh`
- Launch `start.sh`

