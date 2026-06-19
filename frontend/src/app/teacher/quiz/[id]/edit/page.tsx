"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, Trash2, Edit2, Check, X, Play, Upload,
  Sparkles, GripVertical, Clock, AlertCircle, Loader2, ChevronDown, ChevronUp,
  SlidersHorizontal, Trophy
} from "lucide-react";
import { quizApi } from "@/lib/api";
import Navbar from "@/components/layout/navbar";

interface Question {
  id: number;
  text: string;
  options: string[];
  correct_answer: number;
  time_limit: number;
  points: number;
  order: number;
}

interface Quiz {
  id: number;
  title: string;
  description: string;
  attendance_enabled: boolean;
  speed_bonus: boolean;
  streak_bonus: boolean;
  questions: Question[];
}

const BLANK_Q = { text: "", options: ["", "", "", ""], correct_answer: 0, time_limit: 30, points: 1000 };

export default function EditQuizPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState(BLANK_Q);
  const [error, setError] = useState("");

  // Upload state
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [numQ, setNumQ] = useState(5);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    quizApi.get(Number(id)).then((data) => {
      setQuiz(data);
    }).catch(() => router.push("/teacher/dashboard")).finally(() => setLoading(false));
  }, [id]);

  const startEdit = (q: Question) => {
    setEditingId(q.id);
    setForm({ text: q.text, options: [...q.options], correct_answer: q.correct_answer, time_limit: q.time_limit, points: q.points ?? 1000 });
    setError("");
  };

  // Quiz settings (attendance + scoring)
  const updateSetting = async (patch: Partial<Pick<Quiz, "attendance_enabled" | "speed_bonus" | "streak_bonus">>) => {
    if (!quiz) return;
    const prevQuiz = quiz;
    setQuiz({ ...quiz, ...patch });
    try {
      await quizApi.update(quiz.id, patch);
    } catch {
      setQuiz(prevQuiz); // revert on failure
    }
  };

  const applyPointsToAll = async (points: number) => {
    if (!quiz) return;
    await Promise.all(quiz.questions.map((q) => quizApi.updateQuestion(quiz.id, q.id, { points })));
    setQuiz({ ...quiz, questions: quiz.questions.map((q) => ({ ...q, points })) });
  };

  const startNew = () => {
    setEditingId("new");
    setForm({ ...BLANK_Q, options: ["", "", "", ""] });
    setError("");
  };

  const cancelEdit = () => { setEditingId(null); setError(""); };

  const validateForm = () => {
    if (!form.text.trim()) return "Question text is required";
    if (form.options.some((o) => !o.trim())) return "All 4 options are required";
    return null;
  };

  const saveQuestion = async () => {
    const err = validateForm();
    if (err) { setError(err); return; }
    setSaving(true);
    try {
      if (editingId === "new") {
        const q = await quizApi.addQuestion(Number(id), { ...form, order: quiz!.questions.length });
        setQuiz((prev) => prev ? { ...prev, questions: [...prev.questions, q] } : prev);
      } else {
        const q = await quizApi.updateQuestion(Number(id), editingId as number, form);
        setQuiz((prev) => prev ? { ...prev, questions: prev.questions.map((qq) => qq.id === q.id ? q : qq) } : prev);
      }
      setEditingId(null);
    } catch {
      setError("Failed to save question");
    } finally {
      setSaving(false);
    }
  };

  const deleteQuestion = async (qId: number) => {
    if (!confirm("Delete this question?")) return;
    await quizApi.deleteQuestion(Number(id), qId);
    setQuiz((prev) => prev ? { ...prev, questions: prev.questions.filter((q) => q.id !== qId) } : prev);
  };

  const handleFileUpload = async (file: File) => {
    if (!quiz) return;
    setUploading(true);
    setError("");
    try {
      const result = await quizApi.generateFromSlides(quiz.id, file, numQ);
      setUploadCount(result.generated);
      const fresh = await quizApi.get(quiz.id);
      setQuiz(fresh);
      setShowUpload(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "Generation failed");
    } finally {
      setUploading(false);
    }
  };

  const handleStart = async () => {
    const session = await quizApi.startSession(Number(id));
    router.push(`/teacher/quiz/${id}/live?code=${session.code}`);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
      <Navbar />
      <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <Link href="/teacher/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white mb-2 group">
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />Back
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{quiz?.title}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{quiz?.questions.length ?? 0} questions</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="btn-secondary text-sm"
            >
              <Sparkles className="w-4 h-4" />Add with AI
            </button>
            <button
              onClick={handleStart}
              disabled={!quiz?.questions.length}
              className="btn-primary text-sm disabled:opacity-50"
            >
              <Play className="w-4 h-4" />Start Quiz
            </button>
          </div>
        </div>

        {/* AI Upload panel */}
        <AnimatePresence>
          {showUpload && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="card p-6 border-primary-200 dark:border-primary-800 border-2">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary-600" />Generate more questions from slides
                </h3>
                {error && (
                  <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg text-sm mb-3">
                    <AlertCircle className="w-4 h-4" />{error}
                  </div>
                )}
                {uploadCount > 0 && (
                  <div className="flex items-center gap-2 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 px-3 py-2 rounded-lg text-sm mb-3">
                    <Check className="w-4 h-4" />{uploadCount} questions added!
                  </div>
                )}
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <label className="label text-xs">Number of questions</label>
                    <input type="number" min={1} max={20} value={numQ} onChange={(e) => setNumQ(Number(e.target.value))} className="input" />
                  </div>
                  <div className="flex-1">
                    <label className="label text-xs">Upload file</label>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pdf,.pptx,.ppt,.odp,.txt,.md,.png,.jpg"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
                    />
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="btn-secondary w-full"
                    >
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploading ? "Generating..." : "Choose file"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quiz settings: attendance + scoring */}
        {quiz && (
          <div className="card p-5 mb-6">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-primary-600" />Quiz settings
            </h3>
            <div className="space-y-1">
              <SettingToggle
                title="Attendance"
                desc="Require students to enter an email so you can export a roster (CSV)."
                checked={quiz.attendance_enabled}
                onChange={(v) => updateSetting({ attendance_enabled: v })}
              />
              <SettingToggle
                title="Speed bonus"
                desc="Faster correct answers earn more points. Turn off for fixed points."
                checked={quiz.speed_bonus}
                onChange={(v) => updateSetting({ speed_bonus: v })}
              />
              <SettingToggle
                title="Streak bonus"
                desc="Consecutive correct answers add a multiplier (up to 2×)."
                checked={quiz.streak_bonus}
                onChange={(v) => updateSetting({ streak_bonus: v })}
              />
            </div>
            {quiz.questions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Set the same points for every question:</span>
                {[500, 1000, 2000].map((p) => (
                  <button
                    key={p}
                    onClick={() => applyPointsToAll(p)}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-primary-100 hover:text-primary-700 dark:hover:bg-primary-900/30 transition-colors"
                  >
                    {p} pts
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Questions */}
        <div className="space-y-3">
          {quiz?.questions.map((q, idx) => (
            <motion.div
              key={q.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
            >
              {editingId === q.id ? (
                <QuestionForm
                  form={form}
                  setForm={setForm}
                  onSave={saveQuestion}
                  onCancel={cancelEdit}
                  saving={saving}
                  error={error}
                />
              ) : (
                <div className="p-5 flex items-start gap-4">
                  <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center text-primary-600 font-bold text-sm flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white mb-2">{q.text}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {q.options.map((opt, i) => (
                        <div
                          key={i}
                          className={`text-xs px-2.5 py-1.5 rounded-lg ${
                            i === q.correct_answer
                              ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 font-semibold"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {String.fromCharCode(65 + i)}. {opt}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />{q.time_limit}s
                      </span>
                      <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 font-semibold">
                        <Trophy className="w-3 h-3" />{q.points ?? 1000} pts
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(q)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteQuestion(q.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}

          {/* New question */}
          {editingId === "new" ? (
            <div className="card">
              <QuestionForm
                form={form}
                setForm={setForm}
                onSave={saveQuestion}
                onCancel={cancelEdit}
                saving={saving}
                error={error}
                isNew
              />
            </div>
          ) : (
            <button onClick={startNew} className="w-full card p-4 flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-700 transition-all">
              <Plus className="w-4 h-4" />Add question manually
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

function QuestionForm({
  form, setForm, onSave, onCancel, saving, error, isNew = false,
}: {
  form: typeof BLANK_Q;
  setForm: React.Dispatch<React.SetStateAction<typeof BLANK_Q>>;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string;
  isNew?: boolean;
}) {
  return (
    <div className="p-5">
      <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
        {isNew ? "New question" : "Edit question"}
      </h3>
      {error && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg text-sm mb-4">
          <AlertCircle className="w-4 h-4" />{error}
        </div>
      )}
      <div className="space-y-4">
        <div>
          <label className="label text-xs">Question</label>
          <textarea
            className="input resize-none h-20"
            placeholder="Enter your question..."
            value={form.text}
            onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
          />
        </div>
        <div>
          <label className="label text-xs">Answer options</label>
          <div className="space-y-2">
            {form.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, correct_answer: i }))}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors border-2 ${
                    form.correct_answer === i
                      ? "bg-primary-600 border-primary-600 text-white"
                      : "border-slate-300 dark:border-slate-600 text-slate-400 hover:border-primary-400"
                  }`}
                >
                  {String.fromCharCode(65 + i)}
                </button>
                <input
                  className="input"
                  placeholder={`Option ${String.fromCharCode(65 + i)}`}
                  value={opt}
                  onChange={(e) => setForm((f) => {
                    const opts = [...f.options];
                    opts[i] = e.target.value;
                    return { ...f, options: opts };
                  })}
                />
              </div>
            ))}
            <p className="text-xs text-slate-400 mt-1">Click the letter to mark correct answer</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div>
            <label className="label text-xs">Time limit (seconds)</label>
            <input
              type="number"
              min={5}
              max={300}
              className="input w-32"
              value={form.time_limit}
              onChange={(e) => setForm((f) => ({ ...f, time_limit: Number(e.target.value) }))}
            />
          </div>
          <div>
            <label className="label text-xs">Points</label>
            <input
              type="number"
              min={0}
              max={10000}
              step={100}
              className="input w-32"
              value={form.points}
              onChange={(e) => setForm((f) => ({ ...f, points: Number(e.target.value) }))}
            />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onSave} disabled={saving} className="btn-primary py-2 text-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save
          </button>
          <button onClick={onCancel} className="btn-ghost py-2 text-sm">
            <X className="w-4 h-4" />Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingToggle({
  title, desc, checked, onChange,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
          checked ? "bg-primary-600" : "bg-slate-300 dark:bg-slate-700"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
