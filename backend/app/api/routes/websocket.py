from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from jose import jwt
from datetime import datetime
import json, asyncio, random

from app.config import settings
from app.database import get_db, SessionLocal
from app.models.session import QuizSession, Participant, Answer
from app.models.quiz import Question

router = APIRouter()


def _ws_user_id(ws: WebSocket) -> int | None:
    """Resolve the authenticated user from the ?token= query parameter.
    Browsers can't set an Authorization header on WebSockets, so the JWT
    travels as a query param instead."""
    token = ws.query_params.get("token")
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return int(payload.get("sub"))
    except Exception:
        return None


class ConnectionManager:
    def __init__(self):
        # code -> WebSocket (teacher)
        self.teachers: dict[str, WebSocket] = {}
        # code -> {participant_id: WebSocket}
        self.students: dict[str, dict[int, WebSocket]] = {}

    async def connect_teacher(self, code: str, ws: WebSocket):
        await ws.accept()
        self.teachers[code] = ws

    async def connect_student(self, code: str, participant_id: int, ws: WebSocket):
        await ws.accept()
        if code not in self.students:
            self.students[code] = {}
        self.students[code][participant_id] = ws

    def disconnect_teacher(self, code: str):
        self.teachers.pop(code, None)

    def disconnect_student(self, code: str, participant_id: int):
        if code in self.students:
            self.students[code].pop(participant_id, None)

    async def send_to_teacher(self, code: str, data: dict):
        ws = self.teachers.get(code)
        if ws:
            try:
                await ws.send_json(data)
            except Exception:
                pass

    async def broadcast_to_students(self, code: str, data: dict):
        if code not in self.students:
            return
        dead = []
        for pid, ws in self.students[code].items():
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(pid)
        for pid in dead:
            self.students[code].pop(pid, None)

    async def send_to_student(self, code: str, participant_id: int, data: dict):
        ws = self.students.get(code, {}).get(participant_id)
        if ws:
            try:
                await ws.send_json(data)
            except Exception:
                pass

    def student_count(self, code: str) -> int:
        return len(self.students.get(code, {}))


manager = ConnectionManager()


def get_session_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _seeded_permutation(participant_id: int, question_id: int, n: int) -> list[int]:
    """Deterministic per-(participant, question) shuffle of option indices.

    Anti-cheat: each student sees the same options in a different order, so
    "the answer is C" can't be shouted across the room. Re-derived from the
    seed every time (on question send, answer submit, and reveal) instead of
    being stored, so no extra DB/connection state is needed.
    perm[shuffled_position] = canonical_index.
    """
    indices = list(range(n))
    random.Random(f"{participant_id}:{question_id}").shuffle(indices)
    return indices


def _invert_permutation(perm: list[int]) -> list[int]:
    """inv[canonical_index] = shuffled_position — the reverse mapping."""
    inv = [0] * len(perm)
    for shuffled_pos, canonical_idx in enumerate(perm):
        inv[canonical_idx] = shuffled_pos
    return inv


def _map_idx(mapping: list[int], idx):
    if not isinstance(idx, int) or idx < 0 or idx >= len(mapping):
        return idx
    return mapping[idx]


def _build_student_question_payload(q: Question, participant_id: int, index: int, total: int) -> dict:
    options = q.options or []
    perm = _seeded_permutation(participant_id, q.id, len(options))
    return {
        "type": "question",
        "index": index,
        "total": total,
        "question": {
            "id": q.id,
            "text": q.text,
            "options": [options[i] for i in perm],
            "time_limit": q.time_limit,
            "multiple": q.multiple,
        },
    }


async def _send_question_to_students(code: str, q: Question, index: int, total: int):
    for pid in list(manager.students.get(code, {}).keys()):
        await manager.send_to_student(code, pid, _build_student_question_payload(q, pid, index, total))


@router.websocket("/teacher/{code}")
async def teacher_ws(code: str, ws: WebSocket):
    await ws.accept()
    db = SessionLocal()
    registered = False
    try:
        session = db.query(QuizSession).filter(QuizSession.code == code).first()
        if not session:
            await ws.send_json({"type": "error", "message": "Session not found"})
            await ws.close()
            return

        # Only the teacher who owns this quiz may drive the session — the
        # 6-char code is public knowledge (it's on every student's screen),
        # so without this check any student could start/end/reveal.
        user_id = _ws_user_id(ws)
        if user_id is None or session.quiz.teacher_id != user_id:
            await ws.send_json({"type": "error", "message": "Not authorized to control this session"})
            await ws.close()
            return

        manager.teachers[code] = ws
        registered = True

        await ws.send_json({
            "type": "connected",
            "session_code": code,
            "status": session.status,
            "participant_count": len(session.participants),
            # Roster so a page refresh / reconnect doesn't show an empty list.
            "participants": [p.name for p in session.participants],
        })

        while True:
            try:
                data = await ws.receive_json()
                msg_type = data.get("type")

                db.refresh(session)

                if msg_type == "start":
                    if session.status != "waiting":
                        await ws.send_json({"type": "error", "message": "Quiz already started"})
                        continue
                    session.status = "active"
                    session.current_question_index = 0
                    session.started_at = datetime.utcnow()
                    db.commit()

                    quiz = session.quiz
                    questions = sorted(quiz.questions, key=lambda q: q.order)
                    q = questions[0]

                    await _send_question_to_students(code, q, 0, len(questions))
                    teacher_payload = {
                        "type": "question",
                        "index": 0,
                        "total": len(questions),
                        "question": {
                            "id": q.id,
                            "text": q.text,
                            "options": q.options,
                            "time_limit": q.time_limit,
                            "multiple": q.multiple,
                        },
                    }
                    await ws.send_json({**teacher_payload, "correct_answer": q.correct_answer, "correct_answers": q.correct_answers})

                elif msg_type == "next":
                    if session.status != "active":
                        continue
                    quiz = session.quiz
                    questions = sorted(quiz.questions, key=lambda q: q.order)
                    next_idx = session.current_question_index + 1

                    if next_idx >= len(questions):
                        # End quiz
                        session.status = "finished"
                        session.ended_at = datetime.utcnow()
                        db.commit()
                        leaderboard = _build_leaderboard(session)
                        end_payload = {"type": "quiz_ended", "leaderboard": leaderboard}
                        await manager.broadcast_to_students(code, end_payload)
                        await ws.send_json(end_payload)
                    else:
                        session.current_question_index = next_idx
                        db.commit()
                        q = questions[next_idx]
                        await _send_question_to_students(code, q, next_idx, len(questions))
                        teacher_payload = {
                            "type": "question",
                            "index": next_idx,
                            "total": len(questions),
                            "question": {
                                "id": q.id,
                                "text": q.text,
                                "options": q.options,
                                "time_limit": q.time_limit,
                                "multiple": q.multiple,
                            },
                        }
                        await ws.send_json({**teacher_payload, "correct_answer": q.correct_answer, "correct_answers": q.correct_answers})

                elif msg_type == "end":
                    session.status = "finished"
                    session.ended_at = datetime.utcnow()
                    db.commit()
                    leaderboard = _build_leaderboard(session)
                    end_payload = {"type": "quiz_ended", "leaderboard": leaderboard}
                    await manager.broadcast_to_students(code, end_payload)
                    await ws.send_json(end_payload)

                elif msg_type == "reveal":
                    # Teacher reveals the correct answer for the current question.
                    # Every connected student learns the correct option; those who
                    # answered also learn whether they were right and their score.
                    if session.status != "active":
                        continue
                    revealed = await _reveal_current_question(db, session, code)
                    if revealed:
                        q_id, correct_answer = revealed
                        await ws.send_json({
                            "type": "revealed",
                            "question_id": q_id,
                            "correct_answer": correct_answer,
                        })

                elif msg_type == "get_stats":
                    if session.status == "active":
                        q_id = data.get("question_id")
                        stats = _get_answer_stats(db, q_id, session.id)
                        await ws.send_json({"type": "stats", "question_id": q_id, "stats": stats})

            except WebSocketDisconnect:
                break
            except Exception as e:
                await ws.send_json({"type": "error", "message": str(e)})
    finally:
        # Only unregister if this connection actually became THE teacher
        # socket — otherwise a rejected client would evict the real teacher.
        if registered and manager.teachers.get(code) is ws:
            manager.disconnect_teacher(code)
        db.close()


@router.websocket("/student/{code}/{participant_id}")
async def student_ws(code: str, participant_id: int, ws: WebSocket):
    await manager.connect_student(code, participant_id, ws)
    db = SessionLocal()
    try:
        session = db.query(QuizSession).filter(QuizSession.code == code).first()
        participant = db.query(Participant).filter(
            Participant.id == participant_id, Participant.session_id == session.id
        ).first() if session else None

        if not session or not participant:
            await ws.send_json({"type": "error", "message": "Invalid session or participant"})
            await ws.close()
            return

        await ws.send_json({
            "type": "connected",
            "status": session.status,
            "name": participant.name,
        })

        # Notify teacher of new participant
        await manager.send_to_teacher(code, {
            "type": "participant_joined",
            "name": participant.name,
            "count": manager.student_count(code),
        })

        # If the quiz is already running (late join or a dropped connection
        # that reconnected), push the current question immediately instead of
        # leaving the student stuck on the waiting screen until "next".
        if session.status == "active":
            questions = sorted(session.quiz.questions, key=lambda q: q.order)
            idx = session.current_question_index
            if 0 <= idx < len(questions):
                q = questions[idx]
                already_answered = db.query(Answer).filter(
                    Answer.participant_id == participant_id,
                    Answer.question_id == q.id,
                ).first()
                if not already_answered:
                    await ws.send_json(
                        _build_student_question_payload(q, participant_id, idx, len(questions))
                    )

        while True:
            try:
                data = await ws.receive_json()
                msg_type = data.get("type")

                if msg_type == "answer":
                    db.refresh(session)
                    if session.status != "active":
                        continue

                    q_id = data.get("question_id")
                    raw_answer_idx = data.get("answer")
                    raw_selected = data.get("selected")  # list[int] for multiple-answer
                    time_taken = data.get("time_taken", 0)

                    question = db.query(Question).filter(Question.id == q_id).first()
                    if not question:
                        continue

                    # The student answered against their own shuffled option
                    # order (see _seeded_permutation) — translate back to the
                    # canonical indices before storing/scoring.
                    perm = _seeded_permutation(participant_id, q_id, len(question.options or []))
                    answer_idx = _map_idx(perm, raw_answer_idx)
                    selected = [_map_idx(perm, i) for i in raw_selected] if raw_selected else raw_selected

                    existing = db.query(Answer).filter(
                        Answer.participant_id == participant_id,
                        Answer.question_id == q_id,
                    ).first()
                    if existing:
                        continue

                    if question.multiple:
                        chosen = set(selected or [])
                        correct_set = set(question.correct_answers or [])
                        is_correct = chosen == correct_set and len(chosen) > 0
                        ans = Answer(
                            participant_id=participant_id,
                            question_id=q_id,
                            answer=-1,
                            selected=sorted(chosen),
                            is_correct=is_correct,
                            time_taken=time_taken,
                        )
                    else:
                        is_correct = answer_idx == question.correct_answer
                        ans = Answer(
                            participant_id=participant_id,
                            question_id=q_id,
                            answer=answer_idx if answer_idx is not None else -1,
                            is_correct=is_correct,
                            time_taken=time_taken,
                        )
                    db.add(ans)

                    if is_correct:
                        participant.current_streak = (participant.current_streak or 0) + 1
                        participant.score += _compute_points(
                            quiz=session.quiz,
                            question=question,
                            time_taken=time_taken,
                            streak=participant.current_streak,
                        )
                    else:
                        participant.current_streak = 0
                    db.commit()

                    # Acknowledge the lock-in only — correctness stays hidden
                    # until the teacher chooses to reveal it.
                    await ws.send_json({
                        "type": "answer_locked",
                        "question_id": q_id,
                    })

                    # Update teacher stats
                    stats = _get_answer_stats(db, q_id, session.id)
                    await manager.send_to_teacher(code, {
                        "type": "stats",
                        "question_id": q_id,
                        "stats": stats,
                        "answered_count": stats.get("total_answers", 0),
                        "participant_count": manager.student_count(code),
                    })

            except WebSocketDisconnect:
                break
            except Exception:
                break
    finally:
        manager.disconnect_student(code, participant_id)
        db.close()


def _compute_points(quiz, question, time_taken: float, streak: int) -> int:
    """Score a correct answer using the quiz's scoring configuration.

    base points  -> from the question (teacher-set)
    speed_bonus  -> faster answers keep more points (down to 50% at the limit)
    streak_bonus -> +10% per consecutive correct answer, capped at 2x
    """
    pts = float(question.points or 1000)

    # Speed bonus only applies to timed questions
    if getattr(quiz, "speed_bonus", True) and (question.time_limit or 0) > 0:
        limit = question.time_limit
        ratio = min(max(time_taken / limit, 0.0), 1.0)
        pts *= (1.0 - 0.5 * ratio)

    if getattr(quiz, "streak_bonus", False) and streak > 1:
        multiplier = min(1.0 + 0.1 * (streak - 1), 2.0)
        pts *= multiplier

    return max(0, round(pts))


async def _reveal_current_question(db, session: QuizSession, code: str):
    """Push the correct answer for the current question to every connected
    student. Returns (question_id, correct_answer) or None if unavailable."""
    questions = sorted(session.quiz.questions, key=lambda q: q.order)
    idx = session.current_question_index
    if idx < 0 or idx >= len(questions):
        return None
    q = questions[idx]

    for pid in list(manager.students.get(code, {}).keys()):
        participant = db.query(Participant).filter(Participant.id == pid).first()
        answer = db.query(Answer).filter(
            Answer.participant_id == pid,
            Answer.question_id == q.id,
        ).first()

        # Stored answers/correct indices are canonical — re-derive this
        # student's permutation to express everything back in the shuffled
        # order they were actually shown (see _seeded_permutation).
        perm = _seeded_permutation(pid, q.id, len(q.options or []))
        inv = _invert_permutation(perm)
        canonical_correct_answers = q.correct_answers if q.multiple else [q.correct_answer]

        await manager.send_to_student(code, pid, {
            "type": "reveal",
            "question_id": q.id,
            "correct_answer": _map_idx(inv, q.correct_answer),
            "correct_answers": [_map_idx(inv, c) for c in (canonical_correct_answers or [])],
            "multiple": q.multiple,
            "your_answer": _map_idx(inv, answer.answer) if answer else None,
            "your_selected": [_map_idx(inv, s) for s in (answer.selected or [])] if answer and answer.selected else (answer.selected if answer else None),
            "correct": bool(answer.is_correct) if answer else False,
            "answered": answer is not None,
            "points": participant.score if participant else 0,
        })

    return q.id, q.correct_answer


def _build_leaderboard(session: QuizSession) -> list:
    participants = sorted(session.participants, key=lambda p: p.score, reverse=True)
    result = []
    for i, p in enumerate(participants):
        correct = sum(1 for a in p.answers if a.is_correct)
        result.append({
            "rank": i + 1,
            "name": p.name,
            "score": p.score,
            "correct": correct,
            "total": len(session.quiz.questions),
        })
    return result


def _get_answer_stats(db, question_id: int, session_id: int) -> dict:
    answers = (
        db.query(Answer)
        .join(Participant)
        .filter(Participant.session_id == session_id, Answer.question_id == question_id)
        .all()
    )
    counts = {0: 0, 1: 0, 2: 0, 3: 0}
    for a in answers:
        picks = a.selected if a.selected else ([a.answer] if a.answer is not None else [])
        for p in picks:
            if p in counts:
                counts[p] += 1
    return {"options": counts, "total_answers": len(answers)}
