"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Plus, FileQuestion, Play, Trash2, Edit, Brain, Clock,
  BarChart3, Sparkles, Crown, Lock, ArrowRight, Loader2
} from "lucide-react";
import { quizApi } from "@/lib/api";
import { getUser, removeToken, timeAgo } from "@/lib/utils";
import Navbar from "@/components/layout/navbar";

interface Quiz {
  id: number;
  title: string;
  description: string;
  created_at: string;
  question_count: number;
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

  const isPremium = user?.is_premium ?? false;

  return (
    <div className="min-h-screen bg-[#f5f8fa] dark:bg-[#151f2e]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">

        {/* Premium upgrade banner */}
        {user && !isPremium && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 rounded-2xl bg-gradient-to-r from-yellow-500/10 to-primary-500/10 border border-yellow-300/50 dark:border-yellow-700/50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <Crown className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Upgrade to Premium</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Create quizzes, run live sessions, and generate questions with AI
                </p>
              </div>
            </div>
            <Link href="/pricing" className="btn-primary text-sm py-2.5 px-5 whitespace-nowrap flex-shrink-0 bg-yellow-500 hover:bg-yellow-600 shadow-yellow-500/30">
              <Crown className="w-4 h-4" />Upgrade now <ArrowRight className="w-4 h-4" />
            </Link>
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
              {isPremium && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2.5 py-1 rounded-full">
                  <Crown className="w-3 h-3" />Premium
                </span>
              )}
            </h1>
          </motion.div>
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1} className="flex gap-3">
            {isPremium ? (
              <Link href="/teacher/quiz/create" className="btn-primary">
                <Plus className="w-4 h-4" /> New Quiz
              </Link>
            ) : (
              <Link href="/pricing" className="btn-primary bg-yellow-500 hover:bg-yellow-600 shadow-yellow-500/30">
                <Lock className="w-4 h-4" /> New Quiz
              </Link>
            )}
          </motion.div>
        </div>

        {/* Stats bar */}
        <motion.div
          initial="hidden" animate="visible" variants={fadeUp} custom={2}
          className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10"
        >
          {[
            { label: "Total Quizzes", value: quizzes.length, icon: FileQuestion, color: "text-primary-600" },
            { label: "Total Questions", value: quizzes.reduce((a, q) => a + q.question_count, 0), icon: BarChart3, color: "text-blue-600" },
            { label: "Ready to run", value: quizzes.filter(q => q.question_count > 0).length, icon: Play, color: "text-purple-600" },
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
        ) : !isPremium ? (
          /* Non-premium locked state */
          <motion.div
            initial="hidden" animate="visible" variants={fadeUp} custom={3}
            className="card p-16 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-primary-50/30 dark:from-slate-900 dark:to-primary-900/10" />
            <div className="relative">
              <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Crown className="w-10 h-10 text-yellow-500" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Quiz creation is a Premium feature</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-2 max-w-md mx-auto">
                Upgrade to create AI-powered quizzes, run live sessions, and engage your students like never before.
              </p>
              <p className="text-slate-400 dark:text-slate-500 text-sm mb-8">
                Your account is ready — you just need to unlock it.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/pricing" className="btn-primary py-3 px-8 bg-yellow-500 hover:bg-yellow-600 shadow-yellow-500/30">
                  <Crown className="w-4 h-4" /> See pricing & upgrade
                </Link>
                <Link href="/examples" className="btn-secondary py-3 px-8">
                  See how it works
                </Link>
              </div>
            </div>
          </motion.div>
        ) : quizzes.length === 0 ? (
          <motion.div
            initial="hidden" animate="visible" variants={fadeUp} custom={3}
            className="card p-16 text-center"
          >
            <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Brain className="w-10 h-10 text-primary-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Create your first quiz</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">
              Upload lecture slides and let AI generate questions in seconds.
            </p>
            <Link href="/teacher/quiz/create" className="btn-primary mx-auto">
              <Sparkles className="w-4 h-4" /> Create quiz with AI
            </Link>
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

                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 line-clamp-1">{quiz.title}</h3>
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
                  <Link href={`/teacher/quiz/${quiz.id}/edit`} className="btn-secondary py-2 px-3 text-sm">
                    <Edit className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            ))}

            {/* Add new card */}
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={quizzes.length}>
              <Link
                href="/teacher/quiz/create"
                className="card p-6 h-full min-h-[200px] flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 transition-all group"
              >
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="w-6 h-6 text-primary-600" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">New Quiz</p>
                  <p className="text-xs text-slate-400 mt-0.5">Upload slides or start blank</p>
                </div>
              </Link>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}
