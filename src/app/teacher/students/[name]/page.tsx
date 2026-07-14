"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft, Loader2, Gamepad2, ClipboardList, ChevronRight,
  Inbox, AlertTriangle, User as UserIcon
} from "lucide-react";
import { teacherApi } from "@/lib/api";
import Navbar from "@/components/layout/navbar";

interface QuizResult {
  quiz_id: number;
  quiz_title: string;
  participant_id: number;
  score: number;
  correct: number;
  total: number;
  session_code: string;
  joined_at: string;
}

interface TestResult {
  quiz_id: number;
  quiz_title: string;
  attempt_id: number;
  score: number;
  max_score: number;
  fully_graded: boolean;
  submitted_at: string | null;
}

interface Profile {
  name: string;
  quiz_results: QuizResult[];
  test_results: TestResult[];
}

export default function StudentProfilePage() {
  const { name } = useParams<{ name: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const decodedName = decodeURIComponent(name);

  useEffect(() => {
    teacherApi.getStudentProfile(decodedName)
      .then(setProfile)
      .catch(() => router.push("/teacher/dashboard"))
      .finally(() => setLoading(false));
  }, [name]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
      <Navbar />
      <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
    </div>
  );

  if (!profile) return null;

  const totalEntries = profile.quiz_results.length + profile.test_results.length;
  const avgQuizPct = profile.quiz_results.length
    ? Math.round((profile.quiz_results.reduce((s, r) => s + (r.total > 0 ? r.correct / r.total : 0), 0) / profile.quiz_results.length) * 100)
    : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white mb-6 group">
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />Back
        </button>

        <div className="card p-6 mb-8 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-900/30 grid place-items-center text-primary-700 dark:text-primary-300 font-bold text-xl flex-shrink-0">
            {decodedName.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-slate-400" />{decodedName}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {totalEntries} {totalEntries === 1 ? "activity" : "activities"} across your quizzes and tests
              {avgQuizPct !== null && <> · avg live-quiz score {avgQuizPct}%</>}
            </p>
          </div>
        </div>

        {totalEntries === 0 ? (
          <div className="card p-16 text-center">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl grid place-items-center mx-auto mb-5">
              <Inbox className="w-8 h-8 text-primary-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No activity found</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">No record of &ldquo;{decodedName}&rdquo; in your quizzes or tests yet.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {profile.quiz_results.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Gamepad2 className="w-3.5 h-3.5" />Live quizzes
                </h2>
                <div className="space-y-2">
                  {profile.quiz_results.map((r, i) => (
                    <motion.div
                      key={r.participant_id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <Link
                        href={`/teacher/quiz/${r.quiz_id}/results/${r.participant_id}`}
                        className="card p-4 flex items-center justify-between gap-4 hover:-translate-y-0.5 transition-transform block"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">{r.quiz_title}</p>
                          <p className="text-xs text-slate-400">{new Date(r.joined_at).toLocaleString()} · {r.session_code}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs text-slate-400">{r.correct}/{r.total} correct</span>
                          <span className="font-bold text-slate-900 dark:text-white">{r.score}</span>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {profile.test_results.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5" />Tests
                </h2>
                <div className="space-y-2">
                  {profile.test_results.map((r, i) => (
                    <motion.div
                      key={r.attempt_id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <Link
                        href={`/teacher/quiz/${r.quiz_id}/results/${r.attempt_id}`}
                        className="card p-4 flex items-center justify-between gap-4 hover:-translate-y-0.5 transition-transform block"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">{r.quiz_title}</p>
                          <p className="text-xs text-slate-400">
                            {r.submitted_at ? new Date(r.submitted_at).toLocaleString() : "In progress"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {!r.fully_graded && (
                            <span className="badge-orange inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />Needs grading
                            </span>
                          )}
                          <span className="font-bold text-slate-900 dark:text-white">{r.score}/{r.max_score}</span>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
