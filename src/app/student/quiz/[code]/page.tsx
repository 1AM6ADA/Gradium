"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Clock, Check, X, Users, Wifi, WifiOff, Loader2 } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { WS_URL } from "@/lib/api";

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

type Phase = "waiting" | "question" | "submitted" | "revealed" | "ended";

// A cohesive quartet anchored on the brand steel-blue — four distinct hues so
// students can pick an answer at a glance, but harmonized (steel · teal · gold ·
// rose) instead of raw primary colors, so the live quiz still feels like Gradium.
const OPTION_COLORS = [
  { bg: "bg-primary-600 hover:bg-primary-700 active:bg-primary-800", selected: "bg-primary-800 ring-4 ring-primary-300" },
  { bg: "bg-teal-600 hover:bg-teal-700 active:bg-teal-800", selected: "bg-teal-800 ring-4 ring-teal-300" },
  { bg: "bg-amber-500 hover:bg-amber-600 active:bg-amber-700", selected: "bg-amber-700 ring-4 ring-amber-300" },
  { bg: "bg-rose-500 hover:bg-rose-600 active:bg-rose-700", selected: "bg-rose-700 ring-4 ring-rose-300" },
];

export default function StudentQuizPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("waiting");
  const [currentQ, setCurrentQ] = useState<Question | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [qTotal, setQTotal] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [selectedSet, setSelectedSet] = useState<number[]>([]);  // multi-answer picks
  const [submitted, setSubmitted] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null);
  const [correctAnswers, setCorrectAnswers] = useState<number[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myName, setMyName] = useState("");
  const [participantId, setParticipantId] = useState<number | null>(null);
  const answerTime = useRef<number>(0);

  useEffect(() => {
    setMyName(localStorage.getItem("participant_name") || "You");
    const pid = localStorage.getItem("participant_id");
    if (!pid) {
      router.push(`/student/join`);
      return;
    }
    setParticipantId(Number(pid));
  }, []);

  const handleMessage = useCallback((data: Record<string, unknown>) => {
    const type = data.type as string;

    if (type === "connected") {
      const status = data.status as string;
      if (status === "active") {
        // Quiz already running
      }
    } else if (type === "question") {
      const q = data.question as Question;
      setCurrentQ(q);
      setQIndex(data.index as number);
      setQTotal(data.total as number);
      setPhase("question");
      setSelectedAnswer(null);
      setSelectedSet([]);
      setSubmitted(false);
      setCorrectAnswer(null);
      setCorrectAnswers([]);
      setIsCorrect(null);
      setTimeLeft(q.time_limit);
      answerTime.current = Date.now();
    } else if (type === "answer_locked") {
      // Answer recorded — wait for the teacher to reveal results
      setPhase("submitted");
    } else if (type === "reveal") {
      setCorrectAnswer(data.correct_answer as number);
      setCorrectAnswers((data.correct_answers as number[]) ?? [data.correct_answer as number]);
      setIsCorrect(data.correct as boolean);
      setScore(data.points as number);
      setPhase("revealed");
    } else if (type === "quiz_ended") {
      setLeaderboard(data.leaderboard as LeaderboardEntry[]);
      setPhase("ended");
    }
  }, []);

  const wsUrl = participantId ? `${WS_URL}/ws/student/${code}/${participantId}` : null;
  const { connected, send } = useWebSocket(wsUrl, handleMessage);

  // Timer
  useEffect(() => {
    if (phase !== "question" || timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft((prev) => {
      if (prev <= 1) { clearInterval(t); return 0; }
      return prev - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [phase, timeLeft]);

  const handleAnswer = (idx: number) => {
    if (submitted || !currentQ) return;
    if (currentQ.multiple) {
      // toggle selection; submit happens via the button
      setSelectedSet((prev) => prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx]);
      return;
    }
    setSelectedAnswer(idx);
    setSubmitted(true);
    const elapsed = (Date.now() - answerTime.current) / 1000;
    send({ type: "answer", question_id: currentQ.id, answer: idx, time_taken: elapsed });
  };

  const handleSubmitMultiple = () => {
    if (submitted || !currentQ || selectedSet.length === 0) return;
    setSubmitted(true);
    const elapsed = (Date.now() - answerTime.current) / 1000;
    send({ type: "answer", question_id: currentQ.id, selected: selectedSet, time_taken: elapsed });
  };

  const myResult = leaderboard.find((e) => e.name === myName);

  if (!participantId) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Status bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            {connected ? <Wifi className="w-3.5 h-3.5 text-primary-400" /> : <WifiOff className="w-3.5 h-3.5 text-red-400 animate-pulse" />}
            <span className="text-slate-400 font-mono">{code}</span>
          </div>
          <div className="flex items-center gap-3">
            {phase !== "waiting" && phase !== "ended" && (
              <span className="text-xs text-slate-400">Q {qIndex + 1}/{qTotal}</span>
            )}
            <div className="flex items-center gap-1.5 bg-primary-600/20 px-2.5 py-1 rounded-full">
              <Trophy className="w-3 h-3 text-primary-400" />
              <span className="text-xs font-bold text-primary-300">{score.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {/* WAITING */}
            {phase === "waiting" && (
              <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                <div className="w-20 h-20 bg-primary-600/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <div className="w-10 h-10 border-4 border-primary-400 border-t-transparent rounded-full animate-spin" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">You&apos;re in!</h2>
                <p className="text-slate-400 mb-1">Welcome, <span className="text-white font-semibold">{myName}</span></p>
                <p className="text-slate-500 text-sm">Waiting for the teacher to start the quiz...</p>
                <div className="mt-8 flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </motion.div>
            )}

            {/* QUESTION */}
            {(phase === "question" || phase === "submitted" || phase === "revealed") && currentQ && (
              <motion.div key={`q-${currentQ.id}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {/* Timer */}
                <div className="flex items-center justify-between mb-4">
                  {currentQ.time_limit === 0 ? (
                    <div className="flex items-center gap-1.5 text-sm text-slate-400">
                      <Clock className="w-4 h-4" />
                      <span className="font-semibold">No time limit</span>
                    </div>
                  ) : (
                    <div className={`flex items-center gap-1.5 text-sm ${timeLeft <= 5 ? "text-red-400" : "text-slate-300"}`}>
                      <Clock className="w-4 h-4" />
                      <span className="font-black text-xl">{timeLeft}</span>
                    </div>
                  )}
                  {phase === "submitted" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold bg-slate-700/50 text-slate-300"
                    >
                      <Check className="w-4 h-4" />Answer locked
                    </motion.div>
                  )}
                  {phase === "revealed" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${
                        isCorrect
                          ? "bg-primary-500/20 text-primary-300"
                          : "bg-red-500/20 text-red-300"
                      }`}
                    >
                      {isCorrect ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      {isCorrect ? "Correct!" : "Wrong"}
                    </motion.div>
                  )}
                </div>

                {/* Timer bar (hidden for untimed questions) */}
                {currentQ.time_limit > 0 && (
                  <div className="h-1.5 bg-slate-800 rounded-full mb-6">
                    <motion.div
                      className={`h-1.5 rounded-full ${timeLeft <= 5 ? "bg-red-500" : "bg-primary-500"}`}
                      style={{ width: `${(timeLeft / currentQ.time_limit) * 100}%` }}
                      transition={{ duration: 1, ease: "linear" }}
                    />
                  </div>
                )}

                {/* Question */}
                <div className="bg-slate-900 rounded-2xl p-6 mb-6">
                  <h2 className="text-xl font-bold text-white leading-relaxed">{currentQ.text}</h2>
                </div>

                {/* Options */}
                {currentQ.multiple && phase === "question" && (
                  <p className="text-center text-xs text-slate-400 mb-2">Select all that apply, then submit</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentQ.options.map((opt, i) => {
                    const color = OPTION_COLORS[i];
                    const isSelected = currentQ.multiple ? selectedSet.includes(i) : selectedAnswer === i;
                    const locked = phase === "submitted" || phase === "revealed";
                    const isRight = phase === "revealed" && correctAnswers.includes(i);
                    const isWrong = phase === "revealed" && isSelected && !correctAnswers.includes(i);

                    return (
                      <motion.button
                        key={i}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleAnswer(i)}
                        disabled={submitted}
                        className={`relative p-4 rounded-2xl text-left font-semibold transition-all text-white
                          ${isRight ? "bg-primary-500 ring-4 ring-primary-300" :
                            isWrong ? "bg-red-500/50 opacity-70" :
                            isSelected ? color.selected :
                            locked ? "bg-slate-800 opacity-50" :
                            color.bg
                          } disabled:cursor-default`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-black text-sm flex-shrink-0">
                            {currentQ.multiple && isSelected && phase === "question" ? <Check className="w-4 h-4" /> : String.fromCharCode(65 + i)}
                          </span>
                          <span className="text-sm leading-tight">{opt}</span>
                        </div>
                        {isRight && (
                          <div className="absolute top-2 right-2">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Submit button for multiple-answer questions */}
                {currentQ.multiple && phase === "question" && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmitMultiple}
                    disabled={selectedSet.length === 0}
                    className="mt-4 w-full rounded-2xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed py-4 font-bold text-white transition-colors"
                  >
                    Submit {selectedSet.length > 0 && `(${selectedSet.length} selected)`}
                  </motion.button>
                )}

                {phase === "submitted" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-4 py-3 text-sm text-slate-300"
                  >
                    <div className="w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                    Answer locked in — waiting for the teacher to reveal results…
                  </motion.div>
                )}

                {phase === "revealed" && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-slate-400 text-sm mt-4"
                  >
                    Waiting for next question...
                  </motion.p>
                )}
              </motion.div>
            )}

            {/* ENDED */}
            {phase === "ended" && (
              <motion.div key="ended" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="text-center mb-8">
                  <div className="text-6xl mb-4">
                    {myResult?.rank === 1 ? "🥇" : myResult?.rank === 2 ? "🥈" : myResult?.rank === 3 ? "🥉" : "🎉"}
                  </div>
                  <h2 className="text-2xl font-black text-white">Quiz Over!</h2>
                  {myResult && (
                    <div className="mt-3">
                      <p className="text-primary-400 font-bold text-lg">#{myResult.rank} place</p>
                      <p className="text-3xl font-black text-white mt-1">{myResult.score.toLocaleString()} pts</p>
                      <p className="text-slate-400 text-sm mt-1">{myResult.correct}/{myResult.total} correct</p>
                    </div>
                  )}
                </div>

                <div className="bg-slate-900 rounded-2xl overflow-hidden mb-6">
                  <div className="px-4 py-3 border-b border-slate-800 text-xs text-slate-500 uppercase font-semibold grid grid-cols-4">
                    <span>#</span><span className="col-span-2">Name</span><span className="text-right">Score</span>
                  </div>
                  {leaderboard.slice(0, 10).map((entry) => (
                    <div
                      key={entry.rank}
                      className={`grid grid-cols-4 items-center px-4 py-3 border-b border-slate-800 last:border-0 ${entry.name === myName ? "bg-primary-900/20" : ""}`}
                    >
                      <span className={`font-bold ${entry.rank === 1 ? "text-amber-400" : entry.rank === 2 ? "text-slate-300" : entry.rank === 3 ? "text-amber-600" : "text-slate-500"}`}>
                        {entry.rank}
                      </span>
                      <span className={`col-span-2 ${entry.name === myName ? "text-primary-300 font-bold" : "text-slate-200"}`}>{entry.name}</span>
                      <span className="text-right text-slate-300 font-mono">{entry.score.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <button onClick={() => router.push("/student/join")} className="btn-primary w-full py-3">
                  Play another quiz
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
