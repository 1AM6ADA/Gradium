"use client";

import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Sparkles, FileText, ChevronRight, X, CheckCircle,
  ArrowLeft, Loader2, Plus, AlertCircle, Gamepad2, ClipboardList, Edit2
} from "lucide-react";
import { quizApi } from "@/lib/api";
import Navbar from "@/components/layout/navbar";

// Must match the backend's allowed extensions for /generate uploads.
const ACCEPTED = ".pdf,.pptx,.ppt,.odp";

type Mode = "quiz" | "test";

export default function CreateQuizPage() {
  return (
    <Suspense>
      <CreateQuizForm />
    </Suspense>
  );
}

function CreateQuizForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"info" | "upload" | "done">("info");
  const [mode, setMode] = useState<Mode>(searchParams.get("mode") === "test" ? "test" : "quiz");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [numQuestions, setNumQuestions] = useState(10);
  const [numOpenEnded, setNumOpenEnded] = useState(2);
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatedCount, setGeneratedCount] = useState(0);
  const [quizId, setQuizId] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError("");
    try {
      const quiz = await quizApi.create({ title: title.trim(), description: description.trim(), mode });
      setQuizId(quiz.id);
      if (mode === "test" && (opensAt || closesAt)) {
        await quizApi.update(quiz.id, {
          opens_at: opensAt || null,
          closes_at: closesAt || null,
        });
      }
      setStep("upload");
    } catch {
      setError("Failed to create quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!file || !quizId) return;
    setLoading(true);
    setError("");
    try {
      const result = await quizApi.generateFromSlides(
        quizId, file, numQuestions, mode === "test" ? numOpenEnded : 0
      );
      setGeneratedCount(result.generated);
      setStep("done");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "Failed to generate questions. Check your API key or try a different file.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkipUpload = () => {
    if (quizId) router.push(`/teacher/quiz/${quizId}/edit`);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        {/* Back */}
        <Link href="/teacher/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white mb-8 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to dashboard
        </Link>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {["info", "upload", "done"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === s
                  ? "bg-primary-600 text-white"
                  : i < ["info", "upload", "done"].indexOf(step)
                  ? "bg-primary-100 text-primary-600 dark:bg-primary-900/30"
                  : "bg-slate-200 text-slate-400 dark:bg-slate-800"
              }`}>
                {i < ["info", "upload", "done"].indexOf(step) ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              {i < 2 && <div className={`h-0.5 w-16 rounded ${i < ["info", "upload", "done"].indexOf(step) ? "bg-primary-300" : "bg-slate-200 dark:bg-slate-800"}`} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === "info" && (
            <motion.div key="info" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="card p-8">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Name your {mode === "test" ? "test" : "quiz"}</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Give it a clear title so you can find it later</p>

                {error && (
                  <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl mb-5 text-sm">
                    <AlertCircle className="w-4 h-4" />{error}
                  </div>
                )}

                <form onSubmit={handleInfoSubmit} className="space-y-4">
                  <div>
                    <label className="label">Title *</label>
                    <input
                      className="input"
                      placeholder="e.g. Chapter 5: Photosynthesis"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Description (optional)</label>
                    <textarea
                      className="input resize-none h-20"
                      placeholder="Brief description of what this covers..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <button type="submit" disabled={loading || !title.trim()} className="btn-primary w-full py-3">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Continue <ChevronRight className="w-4 h-4" /></>}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {step === "upload" && (
            <motion.div key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="card p-8">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Choose a format</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">
                  How should students take this?
                </p>

                {/* Mode picker — two big buttons */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button
                    type="button"
                    onClick={() => setMode("quiz")}
                    className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-5 transition-all ${
                      mode === "quiz"
                        ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20"
                        : "border-slate-200 dark:border-slate-700 hover:border-primary-300"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${mode === "quiz" ? "bg-primary-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                      <Gamepad2 className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">Quiz</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 text-center">Live, Kahoot-style — everyone plays together in real time</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode("test")}
                    className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-5 transition-all ${
                      mode === "test"
                        ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20"
                        : "border-slate-200 dark:border-slate-700 hover:border-primary-300"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${mode === "test" ? "bg-primary-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                      <ClipboardList className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">Test</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 text-center">Async, form-style — share a link, students complete on their own</span>
                  </button>
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl mb-5 text-sm">
                    <AlertCircle className="w-4 h-4" />{error}
                  </div>
                )}

                {/* Drop zone */}
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                    dragOver
                      ? "border-primary-400 bg-primary-50 dark:bg-primary-900/20"
                      : file
                      ? "border-primary-300 bg-primary-50/50 dark:bg-primary-900/10"
                      : "border-slate-200 dark:border-slate-700 hover:border-primary-300 hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept={ACCEPTED}
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  {file ? (
                    <div>
                      <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <FileText className="w-7 h-7 text-primary-600" />
                      </div>
                      <p className="font-semibold text-slate-900 dark:text-white">{file.name}</p>
                      <p className="text-sm text-slate-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                        className="mt-2 text-xs text-red-500 hover:text-red-700 flex items-center gap-1 mx-auto"
                      >
                        <X className="w-3 h-3" />Remove
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <Upload className="w-7 h-7 text-slate-400" />
                      </div>
                      <p className="font-semibold text-slate-700 dark:text-slate-300">Drop your slides here</p>
                      <p className="text-sm text-slate-400 mt-1">or click to browse</p>
                      <p className="text-xs text-slate-300 dark:text-slate-600 mt-3">PDF, PPTX, PPT, ODP</p>
                    </div>
                  )}
                </div>

                <div className="mt-5">
                  <label className="label">Number of questions to generate</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={3}
                      max={25}
                      value={numQuestions}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setNumQuestions(v);
                        if (numOpenEnded > v) setNumOpenEnded(v);
                      }}
                      className="flex-1 accent-primary-600"
                    />
                    <span className="w-12 text-center font-bold text-primary-600 bg-primary-50 dark:bg-primary-900/20 rounded-lg py-1 text-sm">
                      {numQuestions}
                    </span>
                  </div>
                </div>

                {/* Test-only extras */}
                {mode === "test" && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-5 space-y-5 overflow-hidden">
                    <div>
                      <label className="label">Open-ended questions ({numOpenEnded} of {numQuestions})</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          max={numQuestions}
                          value={numOpenEnded}
                          onChange={(e) => setNumOpenEnded(Number(e.target.value))}
                          className="flex-1 accent-primary-600"
                        />
                        <span className="w-12 text-center font-bold text-primary-600 bg-primary-50 dark:bg-primary-900/20 rounded-lg py-1 text-sm">
                          {numOpenEnded}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">The rest will be multiple-choice with AI-suggested correct answers.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label text-xs">Opens at (optional)</label>
                        <input type="datetime-local" className="input" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} />
                      </div>
                      <div>
                        <label className="label text-xs">Closes at (optional)</label>
                        <input type="datetime-local" className="input" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleGenerate}
                    disabled={!file || loading}
                    className="btn-primary flex-1 py-3"
                  >
                    {loading ? (
                      <><Loader2 className="w-5 h-5 animate-spin" />Generating...</>
                    ) : (
                      <><Sparkles className="w-4 h-4" />Generate with AI</>
                    )}
                  </button>
                  <button onClick={handleSkipUpload} className="btn-secondary py-3 px-4 whitespace-nowrap">
                    <Edit2 className="w-4 h-4" />Add manually instead
                  </button>
                </div>
                <p className="text-xs text-slate-400 text-center mt-3">
                  No AI needed — this stays a {mode === "test" ? "test" : "quiz"} either way. You can mix manual and AI-generated questions anytime in the editor.
                </p>
              </div>
            </motion.div>
          )}

          {step === "done" && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="card p-12 text-center">
                <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-primary-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  {generatedCount} questions generated!
                </h2>
                {generatedCount < numQuestions && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 mb-3">
                    The AI produced {generatedCount} of the {numQuestions} requested questions —
                    you can generate or add more in the editor.
                  </p>
                )}
                <p className="text-slate-500 dark:text-slate-400 mb-8">
                  {mode === "test"
                    ? "Review the questions, adjust grading and weights, then publish to get your share link."
                    : "Review, edit, and add more questions before running your live quiz."}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href={`/teacher/quiz/${quizId}/edit`} className="btn-primary">
                    <Plus className="w-4 h-4" />Review & Edit
                  </Link>
                  {mode === "quiz" && (
                    <button
                      onClick={async () => {
                        if (!quizId) return;
                        const session = await quizApi.startSession(quizId);
                        router.push(`/teacher/quiz/${quizId}/live?code=${session.code}`);
                      }}
                      className="btn-secondary"
                    >
                      Start quiz now
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
