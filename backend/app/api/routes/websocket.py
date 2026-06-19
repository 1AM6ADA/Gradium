from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from datetime import datetime
import json, asyncio

from app.database import get_db, SessionLocal
from app.models.session import QuizSession, Participant, Answer
from app.models.quiz import Question

router = APIRouter()


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


@router.websocket("/teacher/{code}")
async def teacher_ws(code: str, ws: WebSocket):
    await manager.connect_teacher(code, ws)
    db = SessionLocal()
    try:
        session = db.query(QuizSession).filter(QuizSession.code == code).first()
        if not session:
            await ws.send_json({"type": "error", "message": "Session not found"})
            await ws.close()
            return

        await ws.send_json({
            "type": "connected",
            "session_code": code,
            "status": session.status,
            "participant_count": len(session.participants),
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

                    payload = {
                        "type": "question",
                        "index": 0,
                        "total": len(questions),
                        "question": {
                            "id": q.id,
                            "text": q.text,
                            "options": q.options,
                            "time_limit": q.time_limit,
                        },
                    }
                    await manager.broadcast_to_students(code, payload)
                    await ws.send_json({**payload, "correct_answer": q.correct_answer})

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
                        payload = {
                            "type": "question",
                            "index": next_idx,
                            "total": len(questions),
                            "question": {
                                "id": q.id,
                                "text": q.text,
                                "options": q.options,
                                "time_limit": q.time_limit,
                            },
                        }
                        await manager.broadcast_to_students(code, payload)
                        await ws.send_json({**payload, "correct_answer": q.correct_answer})

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

        while True:
            try:
                data = await ws.receive_json()
                msg_type = data.get("type")

                if msg_type == "answer":
                    db.refresh(session)
                    if session.status != "active":
                        continue

                    q_id = data.get("question_id")
                    answer_idx = data.get("answer")
                    time_taken = data.get("time_taken", 0)

                    question = db.query(Question).filter(Question.id == q_id).first()
                    if not question:
                        continue

                    existing = db.query(Answer).filter(
                        Answer.participant_id == participant_id,
                        Answer.question_id == q_id,
                    ).first()
                    if existing:
                        continue

                    is_correct = answer_idx == question.correct_answer
                    ans = Answer(
                        participant_id=participant_id,
                        question_id=q_id,
                        answer=answer_idx,
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

    if getattr(quiz, "speed_bonus", True):
        limit = question.time_limit or 30
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
        await manager.send_to_student(code, pid, {
            "type": "reveal",
            "question_id": q.id,
            "correct_answer": q.correct_answer,
            "your_answer": answer.answer if answer else None,
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
        if a.answer in counts:
            counts[a.answer] += 1
    return {"options": counts, "total_answers": len(answers)}
