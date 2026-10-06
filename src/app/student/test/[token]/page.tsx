"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers, Loader2, AlertCircle, Clock, Check, FileSignature,
  ChevronRight, PartyPopper
} from "lucide-react";
import { testApi } from "@/lib/api";

interface TestInfo {
  quiz_id: number;
  title: string;
  description: string;
  question_count: number;
  opens_at: string | null;
  closes_at: string | null;
  status: "not_open" | "open" | "closed";
}

interface TestQuestion {
  id: number;
  text: string;
  qtype: "multiple_choice" | "open_ended";
  options: string[];
  points: number;
  order: number;
}

type Phase = "loading" | "blocked" | "name" | "form" | "done";

export default function StudentTestPage() {
  const { token } = useParams<{ token: string }>();
  const [phase, setPhase] = useState<Phase>("loading");
  const [info, setInfo] = useState<TestInfo | null>(null);
  const [name, setName] = useState("");
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, { answer_index?: number; answer_text?: string }>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ score: number; max_score: number; fully_graded: boolean } | null>(null);

  useEffect(() => {
    testApi.getInfo(token).then((data) => {
      setInfo(data);
      setPhase(data.status === "open" ? "name" : "blocked");
    }).catch(() => setPhase("blocked"));
  }, [token]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const data = await testApi.start(token, name.trim());
      setAttemptId(data.attempt_id);
      setQuestions(data.questions.sort((a: TestQuestion, b: TestQuestion) => a.order - b.order));
      setPhase("form");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "Could not start the test");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!attemptId) return;
    if (!confirm("Submit your answers? You won't be able to change them afterward.")) return;
    setLoading(true);
    setError("");
    try {
      const payload = questions.map((q) => ({
        question_id: q.id,
        ...(answers[q.id] || {}),
      }));
      const res = await testApi.submit(token, attemptId, payload);
      setResult(res);
      setPhase("done");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "Could not submit your answers");
    } finally {
      setLoading(false);
    }
  };

  const answeredCount = questions.filter((q) => {
    const a = answers[q.id];
    return a && (a.answer_index !== undefined || (a.answer_text && a.answer_text.trim()));
  }).length;

  return (
    <div className="min-h-screen bg-[#f5f8fa] dark:bg-[#151f2e]">
      <header className="border-b border-primary-200/60 dark:border-primary-800/60">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-20 flex items-center">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid place-items-center w-10 h-10 rounded-lg bg-primary-700 text-white">
              <Layers className="w-5 h-5" />
            </span>
            <span className="font-display text-2xl text-primary-950 dark:text-white">Gradium</span>
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <AnimatePresence mode="wait">
          {phase === "loading" && (
            <motion.div key="loading" className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </motion.div>
          )}

          {phase === "blocked" && (
            <motion.div key="blocked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-10 text-center">
              <div className="w-16 h-16 icon-premium rounded-2xl grid place-items-center mx-auto mb-5">
                <Clock className="w-8 h-8" />
              </div>
              <h1 className="text-xl font-bold text-primary-950 dark:text-white mb-2">
                {info?.status === "not_open" ? "This test hasn't opened yet" : info?.status === "closed" ? "This test has closed" : "Test not found"}
              </h1>
              {info?.opens_at && info.status === "not_open" && (
                <p className="text-sm text-primary-600 dark:text-primary-300">Opens at {new Date(info.opens_at).toLocaleString()}</p>
              )}
              {info?.closes_at && info.status === "closed" && (
                <p className="text-sm text-primary-600 dark:text-primary-300">Closed at {new Date(info.closes_at).toLocaleString()}</p>
              )}
            </motion.div>
          )}

          {phase === "name" && info && (
            <motion.div key="name" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-8">
              <div className="badge-blue mb-3 inline-flex"><FileSignature className="w-3 h-3" />Test</div>
              <h1 className="text-2xl font-bold text-primary-950 dark:text-white mb-1">{info.title}</h1>
              {info.description && <p className="text-primary-600 dark:text-primary-300 text-sm mb-4">{info.description}</p>}
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{info.question_count} questions</p>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl mb-5 text-sm">
                  <AlertCircle className="w-4 h-4" />{error}
                </div>
              )}

              <form onSubmit={handleStart} className="space-y-4">
                <div>
                  <label className="label">Your name</label>
                  <input className="input" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
                </div>
                <button type="submit" disabled={loading || !name.trim()} className="btn-primary w-full py-3">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Begin test <ChevronRight className="w-4 h-4" /></>}
                </button>
              </form>
            </motion.div>
          )}

          {phase === "form" && (
            <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center justify-between mb-5">
                <h1 className="text-xl font-bold text-primary-950 dark:text-white">{info?.title}</h1>
                <span className="text-sm text-primary-600 dark:text-primary-300">{answeredCount}/{questions.length} answered</span>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl mb-5 text-sm">
                  <AlertCircle className="w-4 h-4" />{error}
                </div>
              )}

              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <div key={q.id} className="card p-6">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <p className="font-medium text-primary-950 dark:text-white">{idx + 1}. {q.text}</p>
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold whitespace-nowrap">{q.points} pts</span>
                    </div>

                    {q.qtype === "multiple_choice" ? (
                      <div className="space-y-2">
                        {q.options.map((opt, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: { answer_index: i } }))}
                            className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-left transition-colors ${
                              answers[q.id]?.answer_index === i
                                ? "bg-primary-600 text-white"
                                : "bg-primary-50 dark:bg-primary-900/20 text-primary-800 dark:text-primary-200 hover:bg-primary-100 dark:hover:bg-primary-900/40"
                            }`}
                          >
                            <span className={`grid place-items-center w-6 h-6 rounded-md text-xs flex-shrink-0 ${answers[q.id]?.answer_index === i ? "bg-white/25" : "bg-primary-200 dark:bg-primary-800"}`}>
                              {answers[q.id]?.answer_index === i ? <Check className="w-3.5 h-3.5" /> : String.fromCharCode(65 + i)}
                            </span>
                            {opt}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <textarea
                        className="input resize-none h-24"
                        placeholder="Type your answer..."
                        value={answers[q.id]?.answer_text || ""}
                        onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: { answer_text: e.target.value } }))}
                      />
                    )}
                  </div>
                ))}
              </div>

              <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full py-3.5 mt-6">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit test"}
              </button>
            </motion.div>
          )}

          {phase === "done" && result && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="card p-10 text-center">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl grid place-items-center mx-auto mb-5">
                <PartyPopper className="w-8 h-8 text-primary-600" />
              </div>
              <h1 className="text-xl font-bold text-primary-950 dark:text-white mb-2">Thanks, {name}!</h1>
              <p className="text-primary-600 dark:text-primary-300 mb-6">Your answers have been submitted.</p>
              {result.fully_graded ? (
                <div className="inline-flex items-baseline gap-1 bg-primary-50 dark:bg-primary-900/20 rounded-2xl px-6 py-4">
                  <span className="text-3xl font-bold text-primary-700 dark:text-primary-300">{result.score}</span>
                  <span className="text-primary-500">/ {result.max_score}</span>
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">Some answers need your teacher&apos;s review — your final score will follow.</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
