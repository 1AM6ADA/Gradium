# MVP 1 — Features & API

## Versioning

- **MVP 0** — the original platform: teacher auth, AI quiz generation from
  slides, manual quiz editing, a single-answer / always-timed live quiz,
  code-based student join, speed-based scoring, leaderboard, PDF summarizer,
  and free/premium gating.
- **MVP 1 (v2)** — begins with **attendance** and adds everything after it
  (this document). It also introduces the Captain's Blue visual identity.

---

## New features in MVP 1 (and how they extend MVP 0)

### 1. Attendance & roster export
- **MVP 0:** students joined with just a name; nothing was recorded to take away.
- **MVP 1:** a quiz can require **email at join**; name + email + score +
  correct-count are stored per participant, and the teacher can **download a
  CSV roster** from the live screen or the final leaderboard. The CSV is
  generated on demand from the database (re-downloadable, no temp files).

### 2. Teacher-controlled answer reveal
- **MVP 0:** answering instantly showed right/wrong + the correct option.
- **MVP 1:** answering only **locks the answer** ("waiting for results"); the
  teacher decides *when* to reveal with a **Reveal answers** button, at which
  point everyone who answered sees their result + the correct option.

### 3. Configurable scoring
- **MVP 0:** one fixed speed-based formula for every quiz.
- **MVP 1:** per-quiz scoring control — **per-question points**, a
  **speed-bonus** toggle (faster = more, or fixed), and a **streak-bonus**
  toggle (consecutive-correct multiplier up to 2×).

### 4. Multiple-answer questions
- **MVP 0:** exactly one correct option per question.
- **MVP 1:** a question can be **"select all that apply"** with multiple correct
  options; students get checkboxes + a Submit button, scored on exact match.

### 5. No-time-limit questions
- **MVP 0:** every question had a countdown.
- **MVP 1:** a question can be **untimed** (`time_limit = 0`) — it stays open
  until the teacher clicks **Next**, and the speed bonus is skipped so any
  correct answer earns full points.

### 6. New visual identity + UX (Captain's Blue)
- **MVP 0:** the original green theme.
- **MVP 1:** the **Captain's Blue** palette + Spectral serif, a GSAP
  **horizontal-scroll** "How it works" section, a cohesive blue design system
  across the app, and nav fixes (login-aware landing nav, reachable
  Examples/Pricing, a clear home button).

---

## API documentation — new & changed in MVP 1

No MVP 0 endpoints were removed. Interactive docs stay auto-generated at
`http://localhost:8000/docs`.

### New endpoint

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/quiz/{quiz_id}/attendance.csv` | **New.** Teacher-only. Returns the session roster as CSV (`Rank, Name, Email, Score, Correct, Total, Joined At`). Optional `?code=XXXX` selects a specific session; defaults to the latest. |

### Changed REST endpoints

| Method | Path | What changed |
|---|---|---|
| `PUT` | `/api/quiz/{quiz_id}` | Accepts new quiz settings: `attendance_enabled`, `speed_bonus`, `streak_bonus` (bools). |
| `POST` / `PUT` | `/api/quiz/{quiz_id}/questions[/{q_id}]` | New fields: `points` (int), `multiple` (bool), `correct_answers` (int[]). **`time_limit = 0` now means "no limit."** |
| `POST` | `/api/student/session/{code}/join` | Body now accepts `email`; **required (validated)** when the quiz has attendance enabled. |
| `GET` | `/api/student/session/{code}` | Response now includes `attendance_enabled`. |
| `GET` | `/api/quiz/{quiz_id}` | Question objects return `points`, `multiple`, `correct_answers`; quiz returns the three settings flags. |

### Changed WebSocket messages

Endpoints: `/ws/teacher/{code}` and `/ws/student/{code}/{participant_id}`

| Message | Direction | What changed |
|---|---|---|
| `question` | server → clients | Payload adds `multiple`; uses `time_limit: 0` for untimed. |
| `answer` | student → server | For multi-answer, send `selected: int[]` instead of `answer: int`. |
| `answer_locked` | server → student | **New** — replaces instant feedback; confirms the answer is recorded without revealing correctness. |
| `reveal` (trigger) | teacher → server | **New** — teacher pushes the result to students on demand. |
| `reveal` (payload) | server → student | **New** — `correct`, `correct_answer` / `correct_answers`, `multiple`, `points`. |
| `stats` | server → teacher | Counts each selected option (supports multi-answer). |

### Example payloads

```jsonc
// question broadcast (server → clients)
{ "type": "question", "index": 0, "total": 10,
  "question": { "id": 5, "text": "...", "options": ["A","B","C","D"],
                "time_limit": 0,        // 0 = untimed
                "multiple": true } }

// student answer (client → server)
{ "type": "answer", "question_id": 5, "selected": [0, 2], "time_taken": 3.4 }  // multiple
{ "type": "answer", "question_id": 5, "answer": 1,        "time_taken": 3.4 }  // single

// reveal (server → student)
{ "type": "reveal", "correct_answers": [0,2], "multiple": true,
  "your_selected": [0,2], "correct": true, "points": 950 }
```
