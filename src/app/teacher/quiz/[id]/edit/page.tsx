"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, Trash2, Edit2, Check, X, Play, Upload,
  Sparkles, Clock, AlertCircle, Loader2,
  SlidersHorizontal, Trophy, CheckSquare, RefreshCw, Link2, Copy,
  ListChecks, FileSignature, BarChart3, FileText, FileDown, Layers
} from "lucide-react";
import { quizApi } from "@/lib/api";
import Navbar from "@/components/layout/navbar";

interface Question {
  id: number;
  text: string;
  options: string[];
  correct_answer: number;
  multiple: boolean;
  correct_answers: number[] | null;
  time_limit: number;
  points: number;
  order: number;
  qtype: "multiple_choice" | "open_ended";
  grading_mode: "auto" | "manual";
  expected_answer: string | null;
  source_label: string | null;
}

interface Quiz {
  id: number;
  title: string;
  description: string;
  mode: "quiz" | "test";
  attendance_enabled: boolean;
  speed_bonus: boolean;
  streak_bonus: boolean;
  opens_at: string | null;
  closes_at: string | null;
  share_token: string | null;
  source_filename: string | null;
  questions: Question[];
}

const BLANK_Q = {
  text: "", options: ["", "", "", ""], correct_answer: 0, multiple: false,
  correct_answers: [] as number[], time_limit: 30, points: 1000,
  qtype: "multiple_choice" as "multiple_choice" | "open_ended",
  grading_mode: "auto" as "auto" | "manual",
  expected_answer: "",
};

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditQuizPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState(BLANK_Q);
  const [error, setError] = useState("");
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);
  const [regenError, setRegenError] = useState<{ id: number; msg: string } | null>(null);

  // Upload state
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [numQ, setNumQ] = useState(5);
  const [showUpload, setShowUpload] = useState(false);

  // Test mode: publish state
  const [publishing, setPublishing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // PDF export
  const [pdfIncludeAnswers, setPdfIncludeAnswers] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Topic picker (experimental): extract topics from slides, let the
  // teacher pick a subset, then generate questions scoped to just those.
  const topicFileRef = useRef<HTMLInputElement>(null);
  const [showTopicPicker, setShowTopicPicker] = useState(false);
  const [extractingTopics, setExtractingTopics] = useState(false);
  const [topics, setTopics] = useState<{ topic: string; source_label: string | null }[] | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [generatingFromTopics, setGeneratingFromTopics] = useState(false);

  useEffect(() => {
    quizApi.get(Number(id)).then((data) => {
      setQuiz(data);
      if (data.share_token) {
        setShareUrl(`${window.location.origin}/student/test/${data.share_token}`);
      }
    }).catch(() => router.push("/teacher/dashboard")).finally(() => setLoading(false));
  }, [id]);

  const isTest = quiz?.mode === "test";

  const startEdit = (q: Question) => {
    setEditingId(q.id);
    setForm({
      text: q.text,
      options: q.options.length ? [...q.options] : ["", "", "", ""],
      correct_answer: q.correct_answer >= 0 ? q.correct_answer : 0,
      multiple: q.multiple ?? false,
      correct_answers: q.correct_answers ?? [],
      time_limit: q.time_limit,
      points: q.points ?? 1000,
      qtype: q.qtype ?? "multiple_choice",
      grading_mode: q.grading_mode ?? "auto",
      expected_answer: q.expected_answer ?? "",
    });
    setError("");
  };

  // Quiz settings (attendance + scoring for quiz mode; window for test mode)
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

  const updateWindow = async (field: "opens_at" | "closes_at", localValue: string) => {
    if (!quiz) return;
    const iso = localValue ? new Date(localValue).toISOString() : null;
    setQuiz({ ...quiz, [field]: iso });
    try {
      await quizApi.update(quiz.id, { [field]: iso });
    } catch {
      // non-fatal; leave optimistic value
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
    if (form.qtype === "open_ended") {
      if (form.grading_mode === "auto" && !form.expected_answer.trim()) {
        return "Provide an expected answer, or switch this question to manual grading";
      }
      return null;
    }
    if (form.options.some((o) => !o.trim())) return "All 4 options are required";
    if (form.multiple && form.correct_answers.length === 0) return "Mark at least one correct answer";
    return null;
  };

  const saveQuestion = async () => {
    const err = validateForm();
    if (err) { setError(err); return; }
    setSaving(true);
    try {
      const payload = form.qtype === "open_ended" ? { ...form, options: [] } : form;
      if (editingId === "new") {
        const q = await quizApi.addQuestion(Number(id), { ...payload, order: quiz!.questions.length });
        setQuiz((prev) => prev ? { ...prev, questions: [...prev.questions, q] } : prev);
      } else {
        const q = await quizApi.updateQuestion(Number(id), editingId as number, payload);
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

  const regenerateQuestion = async (qId: number) => {
    setRegeneratingId(qId);
    setRegenError(null);
    try {
      const q = await quizApi.regenerateQuestion(Number(id), qId);
      setQuiz((prev) => prev ? { ...prev, questions: prev.questions.map((qq) => qq.id === q.id ? q : qq) } : prev);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setRegenError({ id: qId, msg: msg || "Regeneration failed" });
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!quiz) return;
    setUploading(true);
    setError("");
    try {
      const result = await quizApi.generateFromSlides(quiz.id, file, numQ, isTest ? Math.ceil(numQ / 3) : 0);
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

  const handleTopicFileUpload = async (file: File) => {
    if (!quiz) return;
    setExtractingTopics(true);
    setError("");
    setTopics(null);
    try {
      const result = await quizApi.extractTopics(quiz.id, file);
      setTopics(result);
      setSelectedTopics(new Set(result.map((t: { topic: string }) => t.topic)));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "Topic extraction failed");
    } finally {
      setExtractingTopics(false);
    }
  };

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) next.delete(topic); else next.add(topic);
      return next;
    });
  };

  const handleGenerateFromTopics = async () => {
    if (!quiz || selectedTopics.size === 0) return;
    setGeneratingFromTopics(true);
    setError("");
    try {
      const result = await quizApi.generateFromTopics(
        quiz.id, Array.from(selectedTopics), numQ, isTest ? Math.ceil(numQ / 3) : 0
      );
      setUploadCount(result.generated);
      const fresh = await quizApi.get(quiz.id);
      setQuiz(fresh);
      setShowTopicPicker(false);
      setTopics(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "Generation failed");
    } finally {
      setGeneratingFromTopics(false);
    }
  };

  const handleStart = async () => {
    const session = await quizApi.startSession(Number(id));
    router.push(`/teacher/quiz/${id}/live?code=${session.code}`);
  };

  const handlePublish = async () => {
    if (!quiz) return;
    setPublishing(true);
    setError("");
    try {
      const result = await quizApi.publishTest(quiz.id);
      setShareUrl(`${window.location.origin}${result.url_path}`);
      setQuiz({ ...quiz, share_token: result.share_token });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "Could not publish this test");
    } finally {
      setPublishing(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!quiz?.questions.length) return;
    setDownloadingPdf(true);
    setError("");
    try {
      await quizApi.downloadPdf(quiz.id, pdfIncludeAnswers);
    } catch {
      setError("Failed to generate PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{quiz?.title}</h1>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full inline-flex items-center gap-1 ${isTest ? "badge-blue" : "badge-green"}`}>
                {isTest ? <FileSignature className="w-3 h-3" /> : <ListChecks className="w-3 h-3" />}
                {isTest ? "Test" : "Quiz"}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{quiz?.questions.length ?? 0} questions</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => { setShowUpload(!showUpload); setShowTopicPicker(false); }}
              className="btn-secondary text-sm"
            >
              <Sparkles className="w-4 h-4" />Add with AI
            </button>
            <button
              onClick={() => { setShowTopicPicker(!showTopicPicker); setShowUpload(false); }}
              title="Experimental: pick which topics to generate from"
              className="btn-secondary text-sm"
            >
              <Layers className="w-4 h-4" />Pick topics
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={!quiz?.questions.length || downloadingPdf}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              Download PDF
            </button>
            <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={pdfIncludeAnswers}
                onChange={(e) => setPdfIncludeAnswers(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-600"
              />
              Include answer key
            </label>
            {isTest ? (
              <>
                <Link href={`/teacher/quiz/${id}/results`} className="btn-secondary text-sm">
                  <BarChart3 className="w-4 h-4" />Results
                </Link>
                <button
                  onClick={handlePublish}
                  disabled={!quiz?.questions.length || publishing}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  {shareUrl ? "Re-publish" : "Publish"}
                </button>
              </>
            ) : (
              <>
                <Link href={`/teacher/quiz/${id}/results`} className="btn-secondary text-sm">
                  <BarChart3 className="w-4 h-4" />Results
                </Link>
                <button
                  onClick={handleStart}
                  disabled={!quiz?.questions.length}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />Start Quiz
                </button>
              </>
            )}
          </div>
        </div>

        {/* Share link box (test mode, once published) */}
        {isTest && shareUrl && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="card p-4 mb-6 flex items-center gap-3 border-primary-200 dark:border-primary-800 border-2">
            <Link2 className="w-4 h-4 text-primary-600 flex-shrink-0" />
            <code className="flex-1 text-sm text-primary-700 dark:text-primary-300 truncate">{shareUrl}</code>
            <button onClick={handleCopyLink} className="btn-secondary py-1.5 px-3 text-xs flex-shrink-0">
              {copied ? <><Check className="w-3.5 h-3.5" />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
            </button>
          </motion.div>
        )}

        {error && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl mb-6 text-sm">
            <AlertCircle className="w-4 h-4" />{error}
          </div>
        )}

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

        {/* Topic picker panel (experimental) */}
        <AnimatePresence>
          {showTopicPicker && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="card p-6 border-primary-200 dark:border-primary-800 border-2">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary-600" />Pick topics before generating
                  <span className="text-xs font-normal text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded">Experimental</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Upload your slides to see which topics they cover, then choose which ones to turn into questions.
                </p>

                {!topics ? (
                  <div className="flex items-end gap-4">
                    <input
                      ref={topicFileRef}
                      type="file"
                      accept=".pdf,.pptx,.ppt,.odp,.txt,.md,.png,.jpg"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleTopicFileUpload(f); }}
                    />
                    <button
                      onClick={() => topicFileRef.current?.click()}
                      disabled={extractingTopics}
                      className="btn-secondary w-full"
                    >
                      {extractingTopics ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {extractingTopics ? "Analyzing slides..." : "Choose file"}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5 mb-4 max-h-64 overflow-y-auto pr-1">
                      {topics.map((t) => (
                        <label
                          key={t.topic}
                          className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedTopics.has(t.topic)}
                            onChange={() => toggleTopic(t.topic)}
                            className="rounded border-slate-300 dark:border-slate-600"
                          />
                          <span className="text-sm text-slate-700 dark:text-slate-300 flex-1">{t.topic}</span>
                          {t.source_label && (
                            <span className="text-xs text-slate-400 flex-shrink-0">{t.source_label}</span>
                          )}
                        </label>
                      ))}
                    </div>
                    <div className="flex items-end gap-4">
                      <div className="flex-1">
                        <label className="label text-xs">Number of questions</label>
                        <input type="number" min={1} max={20} value={numQ} onChange={(e) => setNumQ(Number(e.target.value))} className="input" />
                      </div>
                      <div className="flex-1 flex gap-2">
                        <button
                          onClick={handleGenerateFromTopics}
                          disabled={selectedTopics.size === 0 || generatingFromTopics}
                          className="btn-primary flex-1 disabled:opacity-50"
                        >
                          {generatingFromTopics ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          Generate from {selectedTopics.size} topic{selectedTopics.size === 1 ? "" : "s"}
                        </button>
                        <button onClick={() => { setTopics(null); setSelectedTopics(new Set()); }} className="btn-ghost">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quiz settings */}
        {quiz && (
          <div className="card p-5 mb-6">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-primary-600" />{isTest ? "Test settings" : "Quiz settings"}
            </h3>

            {isTest ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-xs">Opens at</label>
                  <input
                    type="datetime-local"
                    className="input"
                    defaultValue={toLocalInputValue(quiz.opens_at)}
                    onBlur={(e) => updateWindow("opens_at", e.target.value)}
                  />
                </div>
                <div>
                  <label className="label text-xs">Closes at</label>
                  <input
                    type="datetime-local"
                    className="input"
                    defaultValue={toLocalInputValue(quiz.closes_at)}
                    onBlur={(e) => updateWindow("closes_at", e.target.value)}
                  />
                </div>
                <p className="col-span-2 text-xs text-slate-400">Leave either side blank to leave that boundary open.</p>
              </div>
            ) : (
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
            )}

            {quiz.questions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Set the same points for every question:</span>
                {[5, 10, 20].map((p) => (
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
                  isTest={isTest}
                />
              ) : (
                <div className="p-5 flex items-start gap-4">
                  <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center text-primary-600 font-bold text-sm flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white mb-1">{q.text}</p>
                    {q.source_label && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 mb-2">
                        <FileText className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">
                          {quiz?.source_filename ? `${quiz.source_filename} · ${q.source_label}` : q.source_label}
                        </span>
                      </p>
                    )}

                    {q.qtype === "open_ended" ? (
                      <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-700 px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                        Open-ended response
                        {q.grading_mode === "auto" && q.expected_answer && (
                          <> · expected: <span className="italic">&ldquo;{q.expected_answer}&rdquo;</span></>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5">
                        {q.options.map((opt, i) => {
                          const correct = q.multiple ? (q.correct_answers ?? []).includes(i) : i === q.correct_answer;
                          return (
                            <div
                              key={i}
                              className={`text-xs px-2.5 py-1.5 rounded-lg ${
                                correct
                                  ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 font-semibold"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              }`}
                            >
                              {String.fromCharCode(65 + i)}. {opt}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      {!isTest && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />{q.time_limit === 0 ? "No limit" : `${q.time_limit}s`}
                        </span>
                      )}
                      <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 font-semibold">
                        <Trophy className="w-3 h-3" />{q.points ?? 1000} pts
                      </span>
                      {q.multiple && (
                        <span className="text-xs text-primary-600 dark:text-primary-400 flex items-center gap-1 font-semibold">
                          <CheckSquare className="w-3 h-3" />Multiple
                        </span>
                      )}
                      {isTest && (
                        <span className={`text-xs flex items-center gap-1 font-semibold ${q.grading_mode === "auto" ? "text-primary-600 dark:text-primary-400" : "text-slate-500 dark:text-slate-400"}`}>
                          {q.grading_mode === "auto" ? "Auto-graded" : "Manual grading"}
                        </span>
                      )}
                    </div>
                    {regenError?.id === q.id && (
                      <p className="text-xs text-red-500 mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{regenError.msg}</p>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => regenerateQuestion(q.id)}
                      disabled={regeneratingId === q.id}
                      title="Regenerate with AI"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors disabled:opacity-50"
                    >
                      {regeneratingId === q.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    </button>
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
                isTest={isTest}
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
  form, setForm, onSave, onCancel, saving, error, isNew = false, isTest = false,
}: {
  form: typeof BLANK_Q;
  setForm: React.Dispatch<React.SetStateAction<typeof BLANK_Q>>;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string;
  isNew?: boolean;
  isTest?: boolean;
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

        {/* Question type toggles */}
        <div className="flex flex-wrap gap-2">
          {isTest ? (
            <>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, qtype: "multiple_choice" }))}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                  form.qtype === "multiple_choice" ? "bg-primary-600 border-primary-600 text-white" : "border-slate-300 dark:border-slate-600 text-slate-500 hover:border-primary-400"
                }`}
              >
                Multiple choice
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, qtype: "open_ended" }))}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                  form.qtype === "open_ended" ? "bg-primary-600 border-primary-600 text-white" : "border-slate-300 dark:border-slate-600 text-slate-500 hover:border-primary-400"
                }`}
              >
                Open-ended
              </button>
              <span className="w-px bg-slate-200 dark:bg-slate-700 mx-1" />
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, grading_mode: f.grading_mode === "auto" ? "manual" : "auto" }))}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                  form.grading_mode === "manual" ? "bg-amber-500 border-amber-500 text-white" : "border-slate-300 dark:border-slate-600 text-slate-500 hover:border-primary-400"
                }`}
              >
                {form.grading_mode === "manual" ? "Manual check" : "Auto check"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setForm((f) => {
                  const turningOn = !f.multiple;
                  return {
                    ...f,
                    multiple: turningOn,
                    correct_answers: turningOn && f.correct_answers.length === 0 ? [f.correct_answer] : f.correct_answers,
                  };
                })}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                  form.multiple ? "bg-primary-600 border-primary-600 text-white" : "border-slate-300 dark:border-slate-600 text-slate-500 hover:border-primary-400"
                }`}
              >
                {form.multiple ? "✓ " : ""}Multiple answers
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, time_limit: f.time_limit === 0 ? 30 : 0 }))}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                  form.time_limit === 0 ? "bg-primary-600 border-primary-600 text-white" : "border-slate-300 dark:border-slate-600 text-slate-500 hover:border-primary-400"
                }`}
              >
                {form.time_limit === 0 ? "✓ " : ""}No time limit
              </button>
            </>
          )}
        </div>

        {form.qtype === "open_ended" ? (
          <div>
            {form.grading_mode === "auto" ? (
              <>
                <label className="label text-xs">Expected answer</label>
                <textarea
                  className="input resize-none h-20"
                  placeholder="The system checks the student's text against this (case-insensitive)."
                  value={form.expected_answer}
                  onChange={(e) => setForm((f) => ({ ...f, expected_answer: e.target.value }))}
                />
              </>
            ) : (
              <p className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/60 rounded-lg px-3 py-2">
                Manual grading selected — you&apos;ll review and score each student&apos;s answer yourself after they submit.
              </p>
            )}
          </div>
        ) : (
          <div>
            <label className="label text-xs">Answer options</label>
            <div className="space-y-2">
              {form.options.map((opt, i) => {
                const isCorrect = form.multiple ? form.correct_answers.includes(i) : form.correct_answer === i;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setForm((f) => {
                        if (f.multiple) {
                          const set = f.correct_answers.includes(i)
                            ? f.correct_answers.filter((x) => x !== i)
                            : [...f.correct_answers, i];
                          return { ...f, correct_answers: set };
                        }
                        return { ...f, correct_answer: i };
                      })}
                      className={`w-7 h-7 flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors border-2 ${
                        form.multiple ? "rounded-md" : "rounded-full"
                      } ${
                        isCorrect
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
                );
              })}
              <p className="text-xs text-slate-400 mt-1">
                {form.multiple ? "Tick every correct option (square = checkbox)" : "Click the letter to mark the correct answer"}
                {isTest && form.grading_mode === "manual" && " — for your reference only; you'll grade manually."}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-4">
          {!isTest && form.time_limit !== 0 && (
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
          )}
          <div>
            <label className="label text-xs">Points</label>
            <input
              type="number"
              min={0}
              max={10000}
              step={isTest ? 1 : 100}
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
