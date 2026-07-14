"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, FileQuestion, Play, Trash2, Edit, Brain, Clock,
  BarChart3, Crown, ArrowRight, Loader2, ShieldCheck,
  ListChecks, FileSignature, ChevronDown, Gamepad2, ClipboardList
} from "lucide-react";
import { quizApi, authApi } from "@/lib/api";
import { getUser, setUser, removeToken, timeAgo, type Tier } from "@/lib/utils";
import Navbar from "@/components/layout/navbar";

interface Quiz {
  id: number;
  title: string;
  description: string;
  created_at: string;
  question_count: number;
  mode: "quiz" | "test";
  share_token: string | null;
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.55, ease: [0.21, 0.47, 0.32, 0.98] },
  }),
};

export default function DashboardPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [starting, setStarting] = useState<number | null>(null);
  const [user, setUserState] = useState<ReturnType<typeof getUser>>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push("/auth/login"); return; }
    setUserState(u);
    quizApi.list().then(setQuizzes).finally(() => setLoading(false));
    // Refresh tier + today's remaining quota (the stored copy can be stale).
    authApi.me().then((fresh) => {
      setUser(fresh);
      setUserState(fresh);
    }).catch(() => {});
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this quiz and all its questions?")) return;
    setDeleting(id);
    await quizApi.delete(id);
    setQuizzes((prev) => prev.filter((q) => q.id !== id));
    setDeleting(null);
  };

  const handleStartSession = async (id: number) => {
    setStarting(id);
    try {
      const session = await quizApi.startSession(id);
      router.push(`/teacher/quiz/${id}/live?code=${session.code}`);
    } catch {
      router.push("/pricing");
    } finally {
      setStarting(null);
    }
  };

  const tier: Tier = user?.tier ?? (user?.is_premium ? "max" : "free");
  const genLimit = user?.generation_limit ?? 3;
  const genLeft = user?.generations_remaining ?? 0;
  const period = user?.generation_period ?? "month";
  const TIER_LABEL: Record<Tier, string> = { free: "Free", pro: "Pro", max: "Max" };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">

        {/* Plan + daily AI quota banner */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 rounded-2xl bg-gradient-to-r from-amber-500/10 to-primary-500/10 border border-amber-300/50 dark:border-amber-400/30 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 icon-premium rounded-xl flex items-center justify-center flex-shrink-0">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {TIER_LABEL[tier]} plan
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${genLeft > 0 ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"}`}>
                    {genLeft}/{genLimit} AI generations left this {period}
                  </span>
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {tier === "max"
                    ? `You're on the top plan — resets every ${period}.`
                    : `Need more AI generations per ${period}? Upgrade your plan.`}
                </p>
              </div>
            </div>
            {tier !== "max" && (
              <Link href="/pricing" className="btn-premium text-sm py-2.5 px-5 whitespace-nowrap flex-shrink-0">
                <Crown className="w-4 h-4" />{tier === "free" ? "Upgrade" : "Upgrade to Max"} <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </motion.div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <p className="text-sm text-primary-600 dark:text-primary-400 font-medium mb-1 uppercase tracking-wider">
              Welcome back
            </p>
            <h1 className="font-display font-light text-4xl text-primary-950 dark:text-white flex items-center gap-3">
              {user?.name ?? "Teacher"}
              <span className={`badge inline-flex items-center gap-1 ${tier === "free" ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" : tier === "pro" ? "badge-green" : "badge-premium"}`}>
                <Crown className="w-3 h-3" />{TIER_LABEL[tier]}
              </span>
            </h1>
          </motion.div>
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1} className="flex gap-3">
            {user?.is_admin && (
              <Link href="/teacher/admin" className="btn-secondary">
                <ShieldCheck className="w-4 h-4" />Admin
              </Link>
            )}
            <NewQuizMenu />
          </motion.div>
        </div>

        {/* Stats bar */}
        <motion.div
          initial="hidden" animate="visible" variants={fadeUp} custom={2}
          className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10"
        >
          {[
            { label: "Total Quizzes", value: quizzes.length, icon: FileQuestion, color: "text-primary-600" },
            { label: "Total Questions", value: quizzes.reduce((a, q) => a + q.question_count, 0), icon: BarChart3, color: "text-primary-500" },
            { label: "Ready to run", value: quizzes.filter(q => q.question_count > 0).length, icon: Play, color: "text-primary-700" },
          ].map((stat, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-center gap-3 mb-1">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <span className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</span>
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-white">{stat.value}</p>
            </div>
          ))}
        </motion.div>

        {/* Quiz list */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : quizzes.length === 0 ? (
          <motion.div
            initial="hidden" animate="visible" variants={fadeUp} custom={3}
            className="card p-16 text-center"
          >
            <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Brain className="w-10 h-10 text-primary-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Create your first quiz or test</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">
              Upload lecture slides and let AI generate questions in seconds.
            </p>
            <div className="flex justify-center gap-3">
              <Link href="/teacher/quiz/create?mode=quiz" className="btn-primary">
                <Gamepad2 className="w-4 h-4" /> Live Quiz
              </Link>
              <Link href="/teacher/quiz/create?mode=test" className="btn-secondary">
                <ClipboardList className="w-4 h-4" /> Test
              </Link>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {quizzes.map((quiz, i) => (
              <motion.div
                key={quiz.id}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={i}
                className="card p-6 group hover:-translate-y-1.5 transition-transform duration-300"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                    <FileQuestion className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex gap-1">
                    <Link
                      href={`/teacher/quiz/${quiz.id}/edit`}
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(quiz.id)}
                      disabled={deleting === quiz.id}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1">{quiz.title}</h3>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 flex-shrink-0 ${quiz.mode === "test" ? "badge-blue" : "badge-green"}`}>
                    {quiz.mode === "test" ? <FileSignature className="w-2.5 h-2.5" /> : <ListChecks className="w-2.5 h-2.5" />}
                    {quiz.mode === "test" ? "Test" : "Quiz"}
                  </span>
                </div>
                {quiz.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{quiz.description}</p>
                )}

                <div className="flex items-center gap-3 text-xs text-slate-400 mb-4">
                  <span className="badge-green">{quiz.question_count} questions</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />{timeAgo(quiz.created_at)}
                  </span>
                </div>

                <div className="flex gap-2">
                  {quiz.mode === "test" ? (
                    <Link
                      href={`/teacher/quiz/${quiz.id}/results`}
                      className="btn-primary flex-1 py-2 text-sm"
                    >
                      <BarChart3 className="w-4 h-4" />Results
                    </Link>
                  ) : (
                    <>
                      <button
                        onClick={() => handleStartSession(quiz.id)}
                        disabled={quiz.question_count === 0 || starting === quiz.id}
                        className="btn-primary flex-1 py-2 text-sm disabled:opacity-50"
                      >
                        {starting === quiz.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <><Play className="w-4 h-4" />Start</>
                        )}
                      </button>
                      <Link href={`/teacher/quiz/${quiz.id}/results`} className="btn-secondary py-2 px-3 text-sm" title="Statistics">
                        <BarChart3 className="w-4 h-4" />
                      </Link>
                    </>
                  )}
                  <Link href={`/teacher/quiz/${quiz.id}/edit`} className="btn-secondary py-2 px-3 text-sm">
                    <Edit className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            ))}

            {/* Add new card */}
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={quizzes.length}>
              <div className="card p-6 h-full min-h-[200px] flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-700 transition-all group">
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="w-6 h-6 text-primary-600" />
                </div>
                <div className="text-center mb-1">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">New</p>
                  <p className="text-xs text-slate-400 mt-0.5">Upload slides or start blank</p>
                </div>
                <div className="flex gap-2">
                  <Link href="/teacher/quiz/create?mode=quiz" className="btn-secondary py-1.5 px-3 text-xs">
                    <Gamepad2 className="w-3.5 h-3.5" />Quiz
                  </Link>
                  <Link href="/teacher/quiz/create?mode=test" className="btn-secondary py-1.5 px-3 text-xs">
                    <ClipboardList className="w-3.5 h-3.5" />Test
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}

function NewQuizMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)} className="btn-primary">
        <Plus className="w-4 h-4" /> New <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-64 card p-2 z-20 shadow-xl"
          >
            <Link
              href="/teacher/quiz/create?mode=quiz"
              className="flex items-start gap-3 rounded-xl p-3 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 flex-shrink-0">
                <Gamepad2 className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-sm text-slate-900 dark:text-white">Live Quiz</p>
                <p className="text-xs text-slate-400">Kahoot-style, everyone plays at once</p>
              </div>
            </Link>
            <Link
              href="/teacher/quiz/create?mode=test"
              className="flex items-start gap-3 rounded-xl p-3 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 flex-shrink-0">
                <ClipboardList className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-sm text-slate-900 dark:text-white">Test</p>
                <p className="text-xs text-slate-400">Share a link, students complete on their own</p>
              </div>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
