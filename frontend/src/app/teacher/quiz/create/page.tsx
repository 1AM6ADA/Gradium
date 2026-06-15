"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Sparkles, FileText, ChevronRight, X, CheckCircle,
  ArrowLeft, Loader2, Plus, AlertCircle
} from "lucide-react";
import { quizApi } from "@/lib/api";
import Navbar from "@/components/layout/navbar";

const ACCEPTED = ".pdf,.pptx,.ppt,.odp,.txt,.md,.png,.jpg,.jpeg";

export default function CreateQuizPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"info" | "upload" | "done">("info");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [numQuestions, setNumQuestions] = useState(10);
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
      const quiz = await quizApi.create({ title: title.trim(), description: description.trim() });
      setQuizId(quiz.id);
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
      const result = await quizApi.generateFromSlides(quizId, file, numQuestions);
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
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Name your quiz</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Give it a clear title so you can find it later</p>

                {error && (
                  <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl mb-5 text-sm">
                    <AlertCircle className="w-4 h-4" />{error}
                  </div>
                )}

                <form onSubmit={handleInfoSubmit} className="space-y-4">
                  <div>
                    <label className="label">Quiz title *</label>
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
                      placeholder="Brief description of what this quiz covers..."
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
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Upload your slides</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                  AI will read your slides and generate quiz questions automatically
                </p>

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
                      <p className="text-xs text-slate-300 dark:text-slate-600 mt-3">PDF, PPTX, PPT, ODP, TXT, images</p>
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
                      onChange={(e) => setNumQuestions(Number(e.target.value))}
                      className="flex-1 accent-primary-600"
                    />
                    <span className="w-12 text-center font-bold text-primary-600 bg-primary-50 dark:bg-primary-900/20 rounded-lg py-1 text-sm">
                      {numQuestions}
                    </span>
                  </div>
                </div>

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
                  <button onClick={handleSkipUpload} className="btn-secondary py-3 px-4">
                    Skip
                  </button>
                </div>
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
                <p className="text-slate-500 dark:text-slate-400 mb-8">
                  Review, edit, and add more questions before running your live quiz.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href={`/teacher/quiz/${quizId}/edit`} className="btn-primary">
                    <Plus className="w-4 h-4" />Review & Edit
                  </Link>
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
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
