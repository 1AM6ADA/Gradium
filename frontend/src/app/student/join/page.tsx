"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Brain, ArrowRight, AlertCircle, BookOpen, Users, Loader2, Hash } from "lucide-react";
import { studentApi } from "@/lib/api";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState<"code" | "name">("code");
  const [sessionInfo, setSessionInfo] = useState<{ quiz_title: string; participant_count: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCheckCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!c) return;
    setLoading(true);
    setError("");
    try {
      const info = await studentApi.checkSession(c);
      setSessionInfo(info);
      setStep("name");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "Session not found. Check the code and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await studentApi.joinSession(code.trim().toUpperCase(), name.trim());
      localStorage.setItem("participant_id", String(result.participant_id));
      localStorage.setItem("participant_name", name.trim());
      router.push(`/student/quiz/${code.trim().toUpperCase()}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "Failed to join. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-primary-50 dark:from-slate-950 dark:to-slate-900">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4 pt-20">
        <div className="w-full max-w-md">
          {step === "code" ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-600/30">
                  <Hash className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white">Join a Quiz</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Enter the code from your teacher</p>
              </div>

              <div className="card p-8">
                {error && (
                  <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl mb-5 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                  </div>
                )}
                <form onSubmit={handleCheckCode} className="space-y-4">
                  <div>
                    <label className="label">Quiz code</label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
                      className="input text-center text-3xl font-black font-mono tracking-[0.3em] uppercase"
                      placeholder="ABC123"
                      required
                      autoFocus
                    />
                  </div>
                  <button type="submit" disabled={loading || !code.trim()} className="btn-primary w-full py-3 text-base">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Continue <ArrowRight className="w-5 h-5" /></>}
                  </button>
                </form>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">or</p>
                <Link href="/student/summarize" className="btn-secondary w-full justify-center">
                  <BookOpen className="w-4 h-4" />Summarize a PDF instead
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              {sessionInfo && (
                <div className="card p-5 mb-4 border-primary-200 dark:border-primary-800 border-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{sessionInfo.quiz_title}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Users className="w-3 h-3" />{sessionInfo.participant_count} already joined
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="card p-8">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">What&apos;s your name?</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">This will be shown on the leaderboard</p>

                {error && (
                  <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl mb-5 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                  </div>
                )}

                <form onSubmit={handleJoin} className="space-y-4">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input text-lg"
                    placeholder="Your name"
                    required
                    autoFocus
                    maxLength={40}
                  />
                  <button type="submit" disabled={loading || !name.trim()} className="btn-primary w-full py-3 text-base">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Join Quiz <ArrowRight className="w-5 h-5" /></>}
                  </button>
                </form>
                <button onClick={() => { setStep("code"); setError(""); }} className="btn-ghost w-full mt-2 text-sm justify-center">
                  ← Change code
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
