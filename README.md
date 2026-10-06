# Gradium (Blue) — v4

AI-powered quiz platform for teachers and students. FastAPI + SQLAlchemy + SQLite backend, Next.js 15 (App Router) + TypeScript + Tailwind frontend.

A teacher uploads lecture slides (PDF/PPTX), the AI turns them into questions, and the class takes the quiz one of two ways:

- **Quiz mode** — live, Kahoot-style: students join a session code, questions appear in real time over WebSocket, answers are locked in and revealed together.
- **Test mode** — async, Google-Forms-style: the teacher publishes a link, students complete it on their own within an optional time window, including open-ended questions that can be auto- or manually graded.

## What's new since v2

v2 was quiz-mode only, single AI provider (Gemini), no written-test support. Everything below was added across v3 and v4.

### Added in v3
- **Test mode** — the whole async, link-based test flow: publish/share links (`share_token`), optional open/close windows, open-ended free-text questions with auto or manual grading, a dedicated student test-taking page, and teacher results + per-attempt grading pages.
- **DeepSeek as a second AI provider** alongside Gemini — a provider abstraction in `ai_service.py` lets generation run on either; DeepSeek is text-only, so slides are converted to extracted text first (Gemini reads the PDF visually).
- **Cross-quiz student history** — look up a student by name and see every quiz/test they've taken across all of a teacher's quizzes (`/teacher/students/[name]`).

### Added in v4
1. **Timezone fix** — test open/close times were displaying in the wrong timezone for students (e.g. teacher sets 1:33pm, student saw ~10:33am). Fixed at both the response-serialization boundary (`schemas/common.py`) and the input boundary, since SQLite silently discards timezone offsets on write instead of converting to UTC.
2. **Question source attribution** — every generated question now shows which slide it came from (e.g. "Slide 5"), and the quiz shows which file it was generated from. Works for both AI providers.
3. **Topic picker (experimental)** — an additional button next to "Add with AI": upload slides, see the topics the AI found, check/uncheck which ones to cover, then generate questions scoped to just those topics. The original one-click "Add with AI" flow is untouched.
4. **Per-student answer shuffling (anti-cheat)** — in live Quiz mode, each student sees multiple-choice options in their own shuffled order (deterministic per student+question, no extra state needed), so "the answer is C" doesn't work across a room. Test mode is unaffected. Teacher's own view stays in the original order.
5. **PDF export** — "Download PDF" on the quiz editor renders a printable handout (with blank answer space for open-ended questions), with an optional trailing answer-key page for the teacher's own copy.

Also fixed in v4: the Docker Compose setup was missing the `AI_PROVIDER`/`DEEPSEEK_*` environment variables, so a containerized backend would silently fail AI generation even with a valid `.env` (`DEEPSEEK_API_KEY is not configured`) — the variables are now passed through correctly.

## Project structure

```
.
├── src/                  # Next.js app (App Router)
├── backend/
│   └── app/
│       ├── api/routes/   # auth, quiz, student, test, teacher, websocket
│       ├── models/       # SQLAlchemy models
│       ├── schemas/      # Pydantic request/response models
│       └── services/     # ai_service (Gemini/DeepSeek), pdf_service, file_service
├── docker-compose.yml
├── Dockerfile            # frontend (multi-stage Next.js standalone build)
└── backend/Dockerfile    # backend
```

## Running locally

**Backend**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # if present, otherwise create one — see "Configuration" below
uvicorn app.main:app --reload --port 8000
```

**Frontend**
```bash
npm install
npm run dev
```

Or both at once: `./run-dev.sh` (expects `backend/venv` to already exist).

## Running with Docker

```bash
cp .env.example .env   # fill in at least one AI provider's API key
docker compose up --build
```
Frontend on `:3000`, backend on `:8000` (override with `FRONTEND_PORT`/`BACKEND_PORT`).

## Configuration

Backend reads from `backend/.env`; Docker Compose reads from a root `.env` (see `.env.example`). Key settings:

| Variable | Purpose |
|---|---|
| `AI_PROVIDER` | `deepseek` (default) or `gemini` |
| `DEEPSEEK_API_KEY` / `DEEPSEEK_MODEL` / `DEEPSEEK_BASE_URL` | DeepSeek provider config |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Gemini provider config |
| `SECRET_KEY` | JWT signing key — change in production |
| `DATABASE_URL` | SQLite by default |

> **Note:** `deepseek-chat`/`deepseek-reasoner` model names are deprecated by DeepSeek on **2026-07-24**, replaced by `deepseek-v4-flash`/`deepseek-v4-pro`. Update `DEEPSEEK_MODEL` before then.

To start, register a teacher account from the sign-up page, then upgrade to premium from the dashboard (gating around AI generation/live sessions is intentional — see `app/api/deps.py`).
