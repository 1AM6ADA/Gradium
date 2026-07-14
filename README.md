# Gradium

AI-powered quiz & test platform for teachers and students. A teacher uploads
lecture slides (PDF / PPTX / ODP), the AI turns them into questions, and the
class takes the quiz one of two ways:

- **Quiz mode** — live, Kahoot-style: students join with a session code,
  questions appear in real time over WebSocket, answers are locked in and
  revealed together, with a gamified leaderboard.
- **Test mode** — async, Google-Forms-style: the teacher publishes a link,
  students complete it on their own within an optional time window, including
  open-ended questions that are auto-graded by the AI (or graded by hand).

**Stack:** FastAPI + SQLAlchemy + SQLite (backend) · Next.js 15 (App Router) +
TypeScript + Tailwind (frontend) · WebSockets for live sessions.

---

## Features

### Creating quizzes & tests
- **AI generation from slides** — upload PDF/PPTX/ODP and generate multiple-choice
  and open-ended questions grounded in the deck. Generation reliably returns the
  requested number of questions (it tops up short batches and recovers questions
  from truncated model output).
- **Deeper questions** — prompts steer the model away from shallow recall toward
  analysis, application, cause-and-effect, and scenario questions with plausible
  distractors.
- **Topic picker** — see the topics the AI found in a deck, pick a subset, and
  generate questions scoped to just those.
- **Manual editing** — add, edit, delete, or AI-regenerate individual questions.
- **Question source attribution** — each generated question shows which slide it
  came from (e.g. "Slide 5").
- **PDF export** — printable handout with an optional answer-key page. Full
  Unicode support (e.g. Cyrillic) in the exported PDF.

### Running with students
- **Live quiz sessions** — real-time questions, answer stats, reveal control, and
  a final leaderboard, all over WebSocket.
- **Per-student answer shuffling (anti-cheat)** — in live mode each student sees
  the options in their own deterministic order, so "the answer is C" doesn't work
  across a room.
- **Unique names per session** — a student can't take over another student's
  score by joining with the same name; only the original browser can rejoin.
- **Attendance** — optionally require an email and export a roster as CSV.
- **Async tests** — shareable link, optional open/close window, open-ended
  answers auto-graded by the AI against a model answer (graceful fallback to
  manual grading).
- **Cross-quiz student history** — look up a student by name and see every quiz
  and test they've taken across all of a teacher's quizzes.

### Extras
- **PDF & document summarizer** — students can upload a document and get an
  AI-generated study summary (no account needed).

---

## Subscriptions

Every logged-in teacher can create quizzes, run live sessions, publish tests, and
add questions manually. Tiers differ **only** by how many AI quiz/test
generations you may run per period (monthly by default, `GENERATION_PERIOD`):

| Tier | AI generations / month | Price |
|------|:----------------------:|-------|
| Free | 3   | $0 |
| Pro  | 30  | $9.99 |
| Max  | 60  | $14.99 |

- **Payment is handled out-of-band.** On the pricing page a buyer contacts the
  owner (Telegram) to purchase a one-time **promo code**, then redeems it in-app
  to upgrade instantly.
- Promo codes are **single-use** and **upgrade-only** — a code can only raise a
  tier, never move it sideways or down.
- The per-tier limits, period, and pricing are configurable (see below).

### Admin panel

Accounts whose email is listed in `ADMIN_EMAILS` get an **Admin** panel at
`/teacher/admin`:

- **Mint promo codes** — generate any number of Pro/Max codes, copy them to sell.
- **Manage subscriptions** — view every account, change any user's tier (up or
  down), and remove accounts.

---

## AI providers

Question generation runs through a provider abstraction in
`backend/app/services/ai_service.py`. Choose one with `AI_PROVIDER`:

| Provider | `AI_PROVIDER` | Notes |
|----------|---------------|-------|
| **GigaChat** (Sber) | `gigachat` *(default)* | Text-only; slides are converted to extracted text first. Two-step OAuth handled automatically. |
| DeepSeek | `deepseek` | Text-only (OpenAI-compatible API). |
| Gemini | `gemini` | Reads the PDF visually (no text extraction). |

> DeepSeek's `deepseek-chat` / `deepseek-reasoner` model names are deprecated on
> **2026-07-24** in favor of `deepseek-v4-flash` / `deepseek-v4-pro`. Update
> `DEEPSEEK_MODEL` if you use that provider.

---

## Project structure

```
.
├── src/                     # Next.js app (App Router)
│   ├── app/
│   │   ├── teacher/         # dashboard, quiz create/edit/live/results, admin
│   │   ├── student/         # join, live quiz, test, summarizer
│   │   ├── auth/            # login / register
│   │   └── pricing/         # tiers + promo-code redemption
│   ├── components/          # navbar, footer, motion helpers, UI
│   └── lib/                 # api client, utils
├── public/                  # logo & favicon assets
├── backend/
│   └── app/
│       ├── api/routes/      # auth, quiz, student, test, teacher, admin, websocket
│       ├── models/          # SQLAlchemy models
│       ├── schemas/         # Pydantic request/response models
│       ├── services/        # ai_service, pdf_service, file_service
│       ├── entitlements.py  # tier limits + generation quota
│       └── promocodes.py    # promo-code generation
├── docker-compose.yml
├── Dockerfile               # frontend (multi-stage Next.js standalone build)
└── backend/Dockerfile       # backend
```

---

## Running locally

**Backend**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # then fill in your AI provider key
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
cp .env.example .env         # fill in at least one AI provider's key
docker compose up --build
```
Frontend on `:3000`, backend on `:8000` (override with `FRONTEND_PORT` /
`BACKEND_PORT`).

---

## Configuration

The backend reads `backend/.env`; Docker Compose reads a root `.env` (see
`.env.example`). Key settings:

| Variable | Purpose |
|---|---|
| `AI_PROVIDER` | `gigachat` (default), `deepseek`, or `gemini` |
| `GIGACHAT_AUTH_KEY` / `GIGACHAT_SCOPE` / `GIGACHAT_MODEL` | GigaChat (Sber) config |
| `GIGACHAT_MAX_TOKENS` | Output cap; raise it so larger question batches aren't truncated |
| `DEEPSEEK_API_KEY` / `DEEPSEEK_MODEL` / `DEEPSEEK_BASE_URL` | DeepSeek config |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Gemini config |
| `GENERATION_PERIOD` | Quota reset window: `daily`, `weekly`, or `monthly` (default) |
| `FREE_GENERATIONS` / `PRO_GENERATIONS` / `MAX_GENERATIONS` | Per-tier generation limits (3 / 30 / 60) |
| `ADMIN_EMAILS` | Comma-separated emails that can open the admin panel |
| `SECRET_KEY` | JWT signing key — change in production |
| `DATABASE_URL` | SQLite by default |
| `CORS_ORIGINS` | Allowed frontend origins |
| `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL` | Browser-facing API/WS URLs (baked into the frontend at build time) |

> When deploying behind a public IP or domain, set `NEXT_PUBLIC_API_URL`,
> `NEXT_PUBLIC_WS_URL`, and `CORS_ORIGINS` to that host — the frontend inlines
> the API/WS URLs at build time.

---

## Getting started

1. Register a teacher account. If your email is in `ADMIN_EMAILS`, you'll see an
   **Admin** button on the dashboard.
2. (Admin) Open `/teacher/admin` → **Promo codes** → generate Pro/Max codes.
3. Create a quiz or test, upload slides, and generate questions with AI.
4. Run a live session (share the code) or publish a test (share the link).
5. To lift the AI generation limit, redeem a promo code on the pricing page.
