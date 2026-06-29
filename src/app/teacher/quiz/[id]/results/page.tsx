"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Users, AlertTriangle, ChevronRight, Inbox } from "lucide-react";
import { quizApi } from "@/lib/api";
import Navbar from "@/components/layout/navbar";

interface Attempt {
  id: number;
  name: string;
  score: number;
  max_score: number;
  fully_graded: boolean;
  started_at: string;
  submitted_at: string | null;
}

interface ParticipantRow {
  id: number;
  name: string;
  email: string | null;
  score: number;
  correct: number;
  total: number;
  session_code: string;
  joined_at: string;
}

export default function ResultsListPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [quizTitle, setQuizTitle] = useState("");
  const [mode, setMode] = useState<"quiz" | "test">("quiz");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    quizApi.get(Number(id)).then(async (quiz) => {
      setQuizTitle(quiz.title);
      setMode(quiz.mode);
      if (quiz.mode === "test") {
        setAttempts(await quizApi.getAttempts(Number(id)));
      } else {
        setParticipants(await quizApi.getParticipants(Number(id)));
      }
    }).catch(() => router.push("/teacher/dashboard")).finally(() => setLoading(false));
  }, [id]);

  const needsGrading = attempts.filter((a) => a.submitted_at && !a.fully_graded).length;
  const isTest = mode === "test";
  const rowCount = isTest ? attempts.length : participants.length;
  const passCount = isTest
    ? attempts.filter((a) => a.max_score > 0 && a.score / a.max_score >= 0.5).length
    : participants.filter((p) => p.total > 0 && p.correct / p.total >= 0.5).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        <Link href={`/teacher/quiz/${id}/edit`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white mb-6 group">
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />Back to editor
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{quizTitle}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <Users className="w-3.5 h-3.5" />{rowCount} {isTest ? (rowCount === 1 ? "submission" : "submissions") : (rowCount === 1 ? "participation" : "participations")}
              {rowCount > 0 && (
                <span className="text-primary-600 dark:text-primary-400 font-semibold">· {passCount} passed (≥50%)</span>
              )}
              {isTest && needsGrading > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />{needsGrading} need{needsGrading === 1 ? "s" : ""} grading
                </span>
              )}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : rowCount === 0 ? (
          <div className="card p-16 text-center">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl grid place-items-center mx-auto mb-5">
              <Inbox className="w-8 h-8 text-primary-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No {isTest ? "submissions" : "participants"} yet</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {isTest ? "Share the test link with your students to see results here." : "Run a live session to see results here."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {isTest ? attempts.map((a, i) => (
              <ResultRow
                key={a.id}
                i={i}
                name={a.name}
                subtitle={a.submitted_at ? new Date(a.submitted_at).toLocaleString() : "In progress"}
                score={a.score}
                max={a.max_score}
                badge={a.submitted_at && !a.fully_graded ? "Needs grading" : null}
                onOpen={() => router.push(`/teacher/quiz/${id}/results/${a.id}`)}
              />
            )) : participants.map((p, i) => (
              <ResultRow
                key={p.id}
                i={i}
                name={p.name}
                subtitle={`${new Date(p.joined_at).toLocaleString()} · ${p.session_code}`}
                score={p.score}
                max={null}
                correctOf={`${p.correct}/${p.total}`}
                onOpen={() => router.push(`/teacher/quiz/${id}/results/${p.id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ResultRow({
  i, name, subtitle, score, max, correctOf, badge, onOpen,
}: {
  i: number;
  name: string;
  subtitle: string;
  score: number;
  max: number | null;
  correctOf?: string;
  badge?: string | null;
  onOpen: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.03 }}
      className="w-full card p-4 flex items-center justify-between gap-4"
    >
      <button onClick={onOpen} className="flex items-center gap-3 min-w-0 text-left flex-1">
        <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 grid place-items-center text-primary-700 dark:text-primary-300 font-bold flex-shrink-0">
          {name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <Link
            href={`/teacher/students/${encodeURIComponent(name)}`}
            onClick={(e) => e.stopPropagation()}
            className="font-semibold text-slate-900 dark:text-white truncate hover:text-primary-600 dark:hover:text-primary-400 hover:underline"
          >
            {name}
          </Link>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </button>
      <button onClick={onOpen} className="flex items-center gap-3 flex-shrink-0">
        {badge && <span className="badge-orange">{badge}</span>}
        {correctOf && <span className="text-xs text-slate-400">{correctOf} correct</span>}
        <span className="font-bold text-slate-900 dark:text-white">{score}{max !== null ? `/${max}` : ""}</span>
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </button>
    </motion.div>
  );
}
