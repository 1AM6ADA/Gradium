# Gradium

Gradium is a web platform for teachers and students.

The platform is intended to help teachers generate and edit tests from uploaded lecture materials, send tests to students, and partially check written answers. Students can pass assigned tests and receive lecture summaries.

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

