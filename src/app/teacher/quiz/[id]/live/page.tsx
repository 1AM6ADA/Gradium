"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Play, ChevronRight, Trophy, Square, QrCode,
  Copy, Check, BarChart3, Clock, AlertCircle, Wifi, WifiOff, Eye, Download
} from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { WS_URL } from "@/lib/api";
import { quizApi } from "@/lib/api";
import Navbar from "@/components/layout/navbar";

interface Question {
  id: number;
  text: string;
  options: string[];
  time_limit: number;
  multiple?: boolean;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  correct: number;
  total: number;
}

type Phase = "waiting" | "question" | "ended";

export default function LiveQuizPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get("code") || "";

  const [phase, setPhase] = useState<Phase>("waiting");
  const [attendanceEnabled, setAttendanceEnabled] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [participants, setParticipants] = useState<{ name: string }[]>([]);
  const [currentQ, setCurrentQ] = useState<Question | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [qTotal, setQTotal] = useState(0);
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null);
  const [correctAnswers, setCorrectAnswers] = useState<number[]>([]);
  const [stats, setStats] = useState<{ options: Record<number, number>; total_answers: number } | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [copied, setCopied] = useState(false);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const handleMessage = useCallback((data: Record<string, unknown>) => {
    const type = data.type as string;

    if (type === "participant_joined") {
      setParticipants((prev) => [...prev, { name: data.name as string }]);
    } else if (type === "question") {
      const q = data.question as Question;
      setCurrentQ(q);
      setQIndex(data.index as number);
      setQTotal(data.total as number);
      setCorrectAnswer(data.correct_answer as number);
      setCorrectAnswers((data.correct_answers as number[]) ?? [data.correct_answer as number]);
      setPhase("question");
      setStats(null);
      setAnsweredCount(0);
      setRevealed(false);
      setTimeLeft(q.time_limit);
    } else if (type === "stats") {
      setStats(data.stats as { options: Record<number, number>; total_answers: number });
      setAnsweredCount(data.answered_count as number ?? 0);
    } else if (type === "revealed") {
      setRevealed(true);
    } else if (type === "quiz_ended") {
      setLeaderboard(data.leaderboard as LeaderboardEntry[]);
      setPhase("ended");
    } else if (type === "connected") {
      setParticipants([]); // Reset on reconnect
    }
  }, []);

  const wsUrl = code ? `${WS_URL}/ws/teacher/${code}` : null;
  const { connected, send } = useWebSocket(wsUrl, handleMessage);

  // Load whether this quiz takes attendance (controls the CSV button)
  useEffect(() => {
    quizApi.get(Number(id)).then((q) => setAttendanceEnabled(!!q.attendance_enabled)).catch(() => {});
  }, [id]);

  // Timer countdown
  useEffect(() => {
    if (phase !== "question" || timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(t);
  }, [phase, timeLeft]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCsv = async () => {
    setDownloading(true);
    try {
      await quizApi.downloadAttendance(Number(id), code);
    } finally {
      setDownloading(false);
    }
  };

  const timerPct = currentQ ? (timeLeft / currentQ.time_limit) * 100 : 100;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Top bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              {connected ? <Wifi className="w-4 h-4 text-primary-400" /> : <WifiOff className="w-4 h-4 text-red-400" />}
              <span className={connected ? "text-primary-400" : "text-red-400"}>
                {connected ? "Connected" : "Reconnecting..."}
              </span>
            </div>
            {phase !== "waiting" && (
              <div className="badge-green">
                Q {qIndex + 1}/{qTotal}
              </div>
            )}
          </div>

          {/* Code display */}
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-xl font-mono font-bold text-lg transition-colors"
          >
            {code}
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4 opacity-70" />}
          </button>

          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Users className="w-4 h-4" />
            {participants.length} joined
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* WAITING ROOM */}
          {phase === "waiting" && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              {/* Left: join info */}
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-slate-400 text-sm mb-4">Students join at:</p>
                <p className="text-primary-400 font-mono text-lg mb-6">localhost:3000/student/join</p>
                <p className="text-slate-300 mb-3 text-sm">Enter code:</p>
                <div className="text-6xl font-black font-mono text-white bg-primary-600/20 border-2 border-primary-500 rounded-2xl px-8 py-4 mb-8 tracking-widest">
                  {code}
                </div>
                <button
                  onClick={handleCopyCode}
                  className="btn-secondary text-sm mb-8"
                >
                  {copied ? <><Check className="w-4 h-4 text-primary-600" />Copied!</> : <><Copy className="w-4 h-4" />Copy code</>}
                </button>
                <button
                  onClick={() => send({ type: "start" })}
                  disabled={participants.length === 0}
                  className="btn-primary text-lg px-8 py-4 shadow-xl shadow-primary-900/50 disabled:opacity-50"
                >
                  <Play className="w-5 h-5" />
                  Start Quiz {participants.length > 0 && `(${participants.length})`}
                </button>
                {participants.length === 0 && (
                  <p className="text-slate-500 text-sm mt-3">Waiting for students to join...</p>
                )}
              </div>

              {/* Right: participant list */}
              <div>
                <h3 className="font-semibold text-slate-300 mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4" />Participants ({participants.length})
                </h3>
                <div className="bg-slate-900 rounded-2xl p-4 max-h-96 overflow-y-auto space-y-2">
                  <AnimatePresence>
                    {participants.map((p, i) => (
                      <motion.div
                        key={`${p.name}-${i}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 py-2 px-3 bg-slate-800 rounded-xl"
                      >
                        <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center font-bold text-sm">
                          {p.name[0]?.toUpperCase()}
                        </div>
                        <span className="text-slate-200">{p.name}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {participants.length === 0 && (
                    <p className="text-slate-500 text-center py-8 text-sm">Nobody here yet...</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ACTIVE QUESTION */}
          {phase === "question" && currentQ && (
            <motion.div
              key={`q-${currentQ.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Question + timer */}
              <div className="lg:col-span-2">
                {/* Timer */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Clock className="w-4 h-4" />
                    {currentQ.time_limit === 0 ? (
                      <span className="text-lg font-semibold text-slate-300">No time limit</span>
                    ) : (
                      <span className={`text-2xl font-black ${timeLeft <= 5 ? "text-red-400" : "text-white"}`}>
                        {timeLeft}s
                      </span>
                    )}
                    {currentQ.multiple && (
                      <span className="ml-2 text-xs bg-primary-500/20 text-primary-300 px-2 py-0.5 rounded-full">Multiple</span>
                    )}
                  </div>
                  <div className="text-slate-400 text-sm">{answeredCount}/{participants.length} answered</div>
                </div>
                {currentQ.time_limit > 0 && (
                  <div className="h-2 bg-slate-800 rounded-full mb-6 overflow-hidden">
                    <motion.div
                      className="h-full bg-primary-500 rounded-full"
                      style={{ width: `${timerPct}%` }}
                      transition={{ duration: 1, ease: "linear" }}
                    />
                  </div>
                )}

                {/* Question */}
                <div className="bg-slate-900 rounded-2xl p-8 mb-6">
                  <p className="text-xs text-slate-500 mb-3">Question {qIndex + 1} of {qTotal}</p>
                  <h2 className="text-2xl font-bold text-white leading-relaxed">{currentQ.text}</h2>
                </div>

                {/* Options with stats overlay */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentQ.options.map((opt, i) => {
                    const count = stats?.options[i] ?? 0;
                    const total = stats?.total_answers ?? 0;
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    const isCorrect = correctAnswers.includes(i);
                    return (
                      <div
                        key={i}
                        className={`relative rounded-xl p-4 overflow-hidden border-2 ${
                          isCorrect
                            ? "border-primary-500 bg-primary-500/10"
                            : "border-slate-700 bg-slate-900"
                        }`}
                      >
                        {stats && (
                          <div
                            className={`absolute inset-0 left-0 ${isCorrect ? "bg-primary-500/20" : "bg-slate-700/40"} transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          />
                        )}
                        <div className="relative flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                            isCorrect ? "bg-primary-600 text-white" : "bg-slate-700 text-slate-300"
                          }`}>
                            {String.fromCharCode(65 + i)}
                          </div>
                          <span className="text-slate-100 flex-1">{opt}</span>
                          {stats && <span className="text-slate-400 text-sm font-mono">{count}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Controls */}
              <div className="lg:col-span-1 flex flex-col gap-4">
                <div className="bg-slate-900 rounded-2xl p-5">
                  <h3 className="font-semibold text-slate-300 mb-3 text-sm">Controls</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => { send({ type: "reveal" }); setRevealed(true); }}
                      disabled={revealed}
                      className={`w-full transition-colors ${
                        revealed
                          ? "btn-secondary opacity-70 cursor-default"
                          : "inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl"
                      }`}
                    >
                      {revealed ? (
                        <><Check className="w-4 h-4" />Answers revealed</>
                      ) : (
                        <><Eye className="w-4 h-4" />Reveal answers</>
                      )}
                    </button>
                    <button
                      onClick={() => send({ type: "next" })}
                      className="btn-primary w-full"
                    >
                      <ChevronRight className="w-4 h-4" />
                      {qIndex + 1 < qTotal ? "Next question" : "End quiz"}
                    </button>
                    <button
                      onClick={() => send({ type: "end" })}
                      className="btn-danger w-full"
                    >
                      <Square className="w-4 h-4" />End quiz now
                    </button>
                    {attendanceEnabled && (
                      <button
                        onClick={handleDownloadCsv}
                        disabled={downloading}
                        className="btn-secondary w-full"
                      >
                        {downloading ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> : <Download className="w-4 h-4" />}
                        Attendance CSV
                      </button>
                    )}
                  </div>
                  {!revealed && (
                    <p className="mt-3 text-xs text-slate-500">
                      Students see only that their answer is locked until you reveal.
                    </p>
                  )}
                </div>

                {stats && (
                  <div className="bg-slate-900 rounded-2xl p-5">
                    <h3 className="font-semibold text-slate-300 mb-3 text-sm flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />Answer stats
                    </h3>
                    <div className="space-y-2">
                      {currentQ.options.map((_, i) => {
                        const count = stats.options[i] ?? 0;
                        const total = stats.total_answers;
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        return (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <span className="w-6 font-bold text-slate-400">{String.fromCharCode(65 + i)}</span>
                            <div className="flex-1 bg-slate-800 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${correctAnswers.includes(i) ? "bg-primary-500" : "bg-slate-600"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-slate-400 w-8 text-right">{count}</span>
                          </div>
                        );
                      })}
                      <p className="text-xs text-slate-500 mt-2">{stats.total_answers} responses</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ENDED - LEADERBOARD */}
          {phase === "ended" && (
            <motion.div key="ended" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-yellow-500/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-10 h-10 text-yellow-400" />
                </div>
                <h2 className="text-3xl font-black text-white">Quiz Complete!</h2>
                <p className="text-slate-400 mt-2">Final leaderboard</p>
              </div>

              <div className="bg-slate-900 rounded-2xl overflow-hidden">
                <div className="grid grid-cols-4 text-xs text-slate-500 font-semibold uppercase px-5 py-3 border-b border-slate-800">
                  <span>#</span><span className="col-span-2">Name</span><span className="text-right">Score</span>
                </div>
                <div className="divide-y divide-slate-800">
                  {leaderboard.map((entry) => (
                    <motion.div
                      key={entry.rank}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: entry.rank * 0.05 }}
                      className={`grid grid-cols-4 items-center px-5 py-4 ${
                        entry.rank <= 3 ? "bg-yellow-500/5" : ""
                      }`}
                    >
                      <div className={`font-black text-lg ${
                        entry.rank === 1 ? "text-yellow-400" :
                        entry.rank === 2 ? "text-slate-300" :
                        entry.rank === 3 ? "text-orange-400" : "text-slate-500"
                      }`}>
                        {entry.rank <= 3 ? ["🥇","🥈","🥉"][entry.rank - 1] : entry.rank}
                      </div>
                      <div className="col-span-2">
                        <p className="font-semibold text-white">{entry.name}</p>
                        <p className="text-xs text-slate-500">{entry.correct}/{entry.total} correct</p>
                      </div>
                      <div className="text-right font-black text-primary-400 text-lg">{entry.score.toLocaleString()}</div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {attendanceEnabled && (
                <button
                  onClick={handleDownloadCsv}
                  disabled={downloading}
                  className="btn-primary w-full mt-6 bg-amber-500 hover:bg-amber-600 shadow-amber-500/30"
                >
                  {downloading ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Download className="w-4 h-4" />}
                  Download attendance (CSV)
                </button>
              )}

              <div className="flex gap-3 mt-3">
                <button onClick={() => router.push("/teacher/dashboard")} className="btn-secondary flex-1">
                  Back to dashboard
                </button>
                <button
                  onClick={async () => {
                    const session = await quizApi.startSession(Number(id));
                    router.push(`/teacher/quiz/${id}/live?code=${session.code}`);
                  }}
                  className="btn-primary flex-1"
                >
                  <Play className="w-4 h-4" />Run again
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
