"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Check, X, AlertCircle, Save } from "lucide-react";
import { quizApi } from "@/lib/api";
import Navbar from "@/components/layout/navbar";

interface AnswerDetail {
  question_id: number;
  question_text: string;
  qtype: "multiple_choice" | "open_ended";
  options: string[];
  correct_answer: number;
  expected_answer: string | null;
  points: number;
  grading_mode: "auto" | "manual";
  answer_index: number | null;
  answer_text: string | null;
  is_correct: boolean | null;
  points_awarded: number | null;
  graded: boolean;
}

interface AttemptDetail {
  id: number;
  name: string;
  score: number;
  max_score: number;
  fully_graded: boolean;
  started_at: string;
  submitted_at: string | null;
  answers: AnswerDetail[];
}

// Quiz-mode participant detail, normalized into the same shape as AttemptDetail
// so this page can render either with no branching in the JSX below.
interface ParticipantAnswer {
  question_id: number;
  question_text: string;
  options: string[];
  correct_answer: number;
  multiple: boolean;
  correct_answers: number[] | null;
  points: number;
  answer: number;
  selected: number[] | null;
  is_correct: boolean;
  time_taken: number;
}

interface ParticipantDetail {
  id: number;
  name: string;
  score: number;
  session_code: string;
  joined_at: string;
  answers: ParticipantAnswer[];
}

function normalizeParticipant(p: ParticipantDetail): AttemptDetail {
  return {
    id: p.id,
    name: p.name,
    score: p.score,
    max_score: p.answers.reduce((sum, a) => sum + a.points, 0),
    fully_graded: true,
    started_at: p.joined_at,
    submitted_at: p.joined_at,
    answers: p.answers.map((a) => ({
      question_id: a.question_id,
      question_text: a.question_text,
      qtype: "multiple_choice",
      options: a.options,
      correct_answer: a.correct_answer,
      expected_answer: null,
      points: a.points,
      grading_mode: "auto",
      answer_index: a.multiple ? null : a.answer,
      answer_text: a.multiple && a.selected ? a.selected.map((i) => a.options[i]).join(", ") : null,
      is_correct: a.is_correct,
      points_awarded: a.is_correct ? a.points : 0,
      graded: true,
    })),
  };
}

export default function AttemptDetailPage() {
  const { id, attemptId } = useParams<{ id: string; attemptId: string }>();
  const router = useRouter();
  const [attempt, setAttempt] = useState<AttemptDetail | null>(null);
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<number, { points: number; correct: boolean }>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    quizApi.get(Number(id)).then(async (quiz) => {
      const quizMode = quiz.mode === "quiz";
      setIsQuizMode(quizMode);

      const data: AttemptDetail = quizMode
        ? normalizeParticipant(await quizApi.getParticipant(Number(id), Number(attemptId)))
        : await quizApi.getAttempt(Number(id), Number(attemptId));

      setAttempt(data);
      const initial: Record<number, { points: number; correct: boolean }> = {};
      data.answers.forEach((a) => {
        initial[a.question_id] = { points: a.points_awarded ?? 0, correct: a.is_correct ?? false };
      });
      setDrafts(initial);
    })
      .catch(() => router.push(`/teacher/quiz/${id}/results`))
      .finally(() => setLoading(false));
  }, [id, attemptId]);

  const handleGrade = async (qid: number) => {
    if (!attempt) return;
    setSavingId(qid);
    setError("");
    const draft = drafts[qid];
    try {
      const updated = await quizApi.gradeAttempt(Number(id), Number(attemptId), [
        { question_id: qid, points_awarded: draft.points, is_correct: draft.correct },
      ]);
      setAttempt((prev) => prev ? {
        ...prev,
        score: updated.score,
        fully_graded: updated.fully_graded,
        answers: prev.answers.map((a) => a.question_id === qid ? { ...a, points_awarded: draft.points, is_correct: draft.correct, graded: true } : a),
      } : prev);
    } catch {
      setError("Could not save this grade");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
      <Navbar />
      <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
    </div>
  );

  if (!attempt) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        <Link href={`/teacher/quiz/${id}/results`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white mb-6 group">
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />Back to results
        </Link>

        <div className="card p-6 mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <Link
              href={`/teacher/students/${encodeURIComponent(attempt.name)}`}
              className="text-2xl font-bold text-slate-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 hover:underline"
            >
              {attempt.name}
            </Link>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {isQuizMode ? "Joined" : "Submitted"} {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString() : "—"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{attempt.score}<span className="text-lg text-slate-400">/{attempt.max_score}</span></p>
            {!attempt.fully_graded && <span className="badge-orange mt-1 inline-flex">Needs grading</span>}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl mb-6 text-sm">
            <AlertCircle className="w-4 h-4" />{error}
          </div>
        )}

        <div className="space-y-4">
          {attempt.answers.map((a, idx) => (
            <motion.div key={a.question_id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }} className="card p-6">
              <div className="flex items-start justify-between gap-3 mb-3">
                <p className="font-medium text-slate-900 dark:text-white">{idx + 1}. {a.question_text}</p>
                <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold whitespace-nowrap">{a.points} pts</span>
              </div>

              {a.qtype === "multiple_choice" ? (
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  {a.options.map((opt, i) => {
                    const isStudent = a.answer_index === i;
                    const isCorrect = i === a.correct_answer;
                    return (
                      <div
                        key={i}
                        className={`text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 ${
                          isCorrect ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 font-semibold"
                          : isStudent ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {isStudent && (isCorrect ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />)}
                        {String.fromCharCode(65 + i)}. {opt}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg px-4 py-3 text-sm text-slate-700 dark:text-slate-300 mb-3 whitespace-pre-wrap">
                  {a.answer_text || <span className="italic text-slate-400">No answer provided</span>}
                  {a.expected_answer && (
                    <p className="text-xs text-slate-400 mt-2 italic">Expected: &ldquo;{a.expected_answer}&rdquo;</p>
                  )}
                </div>
              )}

              {a.grading_mode === "auto" ? (
                <div className={`inline-flex items-center gap-2 text-sm font-semibold ${a.is_correct ? "text-primary-600 dark:text-primary-400" : "text-red-500"}`}>
                  {a.is_correct ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  {a.is_correct ? "Correct" : "Incorrect"} · {a.points_awarded ?? 0} pts (auto-graded)
                </div>
              ) : (
                <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="label text-xs">Points awarded</label>
                    <input
                      type="number"
                      min={0}
                      max={a.points}
                      className="input w-24"
                      value={drafts[a.question_id]?.points ?? 0}
                      onChange={(e) => setDrafts((p) => ({ ...p, [a.question_id]: { ...p[a.question_id], points: Number(e.target.value) } }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDrafts((p) => ({ ...p, [a.question_id]: { ...p[a.question_id], correct: true } }))}
                      className={`px-3 py-2.5 rounded-lg text-xs font-semibold border ${drafts[a.question_id]?.correct ? "bg-primary-600 border-primary-600 text-white" : "border-slate-300 dark:border-slate-600 text-slate-500"}`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDrafts((p) => ({ ...p, [a.question_id]: { ...p[a.question_id], correct: false } }))}
                      className={`px-3 py-2.5 rounded-lg text-xs font-semibold border ${drafts[a.question_id]?.correct === false ? "bg-red-500 border-red-500 text-white" : "border-slate-300 dark:border-slate-600 text-slate-500"}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => handleGrade(a.question_id)}
                    disabled={savingId === a.question_id}
                    className="btn-primary py-2 px-4 text-sm"
                  >
                    {savingId === a.question_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {a.graded ? "Update" : "Save grade"}
                  </button>
                  {a.graded && <span className="text-xs text-slate-400">Graded · {a.points_awarded} pts</span>}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
