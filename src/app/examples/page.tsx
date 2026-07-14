"use client";

import Link from "next/link";
import { Play, BookOpen, Upload, BarChart3, Trophy, Hash, ArrowRight, CheckCircle } from "lucide-react";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { Reveal, Stagger, StaggerItem, TiltCard, Magnetic, HeroBackground } from "@/components/ui/motion";

const sampleQuestions = [
  {
    text: "What is the process by which plants convert sunlight into food?",
    options: ["Respiration", "Photosynthesis", "Transpiration", "Osmosis"],
    correct: 1,
    subject: "Biology",
  },
  {
    text: "Which data structure follows the Last-In-First-Out (LIFO) principle?",
    options: ["Queue", "Linked List", "Stack", "Binary Tree"],
    correct: 2,
    subject: "Computer Science",
  },
  {
    text: "In which year did World War II end?",
    options: ["1943", "1944", "1945", "1946"],
    correct: 2,
    subject: "History",
  },
];

const teacherSteps = [
  {
    step: "1",
    icon: Upload,
    title: "Upload your slides",
    desc: "Upload PDF, PPTX, or any slide format. The AI reads every slide and extracts key concepts.",
    color: "bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400",
  },
  {
    step: "2",
    icon: BookOpen,
    title: "Review AI questions",
    desc: "The AI generates multiple-choice questions. You can edit, delete, or add new ones manually.",
    color: "bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400",
  },
  {
    step: "3",
    icon: Play,
    title: "Run live quiz",
    desc: "Start a session and share the 6-character code. Students join from any device instantly.",
    color: "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300",
  },
];

export default function ExamplesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 overflow-x-hidden">
      <Navbar />
      <main className="flex-1 pt-20">

        {/* Hero */}
        <section className="relative py-20 overflow-hidden">
          <HeroBackground />
          <div className="relative max-w-4xl mx-auto px-4 text-center">
            <Reveal direction="none">
              <div className="badge-green mx-auto mb-4 inline-flex">Platform Preview</div>
            </Reveal>
            <Reveal delay={0.1}>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4">
                See EduTest AI in action
              </h1>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                Here&apos;s what the experience looks like for teachers and students
              </p>
            </Reveal>
          </div>
        </section>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 space-y-24">

          {/* Teacher workflow */}
          <section>
            <Reveal className="mb-10">
              <div className="badge-blue mb-3 inline-flex">For Teachers</div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white">How teachers prepare quizzes</h2>
            </Reveal>

            <Stagger gap={0.1} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {teacherSteps.map((item, i) => (
                <StaggerItem key={i}>
                  <TiltCard intensity={6} className="h-full">
                    <div className="card shine p-6 h-full group">
                      <div style={{ transform: "translateZ(30px)" }}>
                        <div className={`w-12 h-12 rounded-2xl ${item.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                          <item.icon className="w-6 h-6" />
                        </div>
                        <div className="badge bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 text-xs mb-3">
                          Step {item.step}
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{item.title}</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </TiltCard>
                </StaggerItem>
              ))}
            </Stagger>
          </section>

          {/* Example questions */}
          <section>
            <Reveal className="mb-8">
              <div className="badge-green mb-3 inline-flex">Sample Quiz</div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white">Example questions (AI-generated)</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2">These are the kind of questions the AI creates from your slides</p>
            </Reveal>

            <Stagger gap={0.1} className="space-y-4">
              {sampleQuestions.map((q, i) => (
                <StaggerItem key={i}>
                  <div className="card p-6 hover:-translate-y-1 transition-transform duration-300">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center text-primary-600 font-bold text-sm flex-shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="badge-blue mb-2">{q.subject}</div>
                        <p className="font-semibold text-slate-900 dark:text-white mb-3">{q.text}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {q.options.map((opt, j) => (
                            <div
                              key={j}
                              className={`text-sm px-3 py-2 rounded-xl flex items-center gap-2 ${
                                j === q.correct
                                  ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 font-semibold"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              }`}
                            >
                              {j === q.correct && <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                              <span>{String.fromCharCode(65 + j)}. {opt}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </section>

          {/* Live quiz experience */}
          <section>
            <Reveal className="mb-8">
              <div className="badge-orange mb-3 inline-flex">For Students</div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white">The live quiz experience</h2>
            </Reveal>

            <Stagger gap={0.12} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Student join mock */}
              <StaggerItem>
                <div className="card p-6 h-full">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Hash className="w-4 h-4 text-primary-600" />Joining a quiz
                  </h3>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 space-y-4">
                    <div>
                      <p className="text-xs text-slate-400 mb-1 font-semibold uppercase">Quiz code</p>
                      <div className="text-3xl font-black font-mono text-primary-600 tracking-widest">AB3XK9</div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1 font-semibold uppercase">Your name</p>
                      <div className="input bg-white dark:bg-slate-800 pointer-events-none text-slate-600 dark:text-slate-300">Sarah M.</div>
                    </div>
                    <div className="btn-primary w-full justify-center pointer-events-none opacity-80">
                      Join Quiz <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </StaggerItem>

              {/* Question mock */}
              <StaggerItem>
                <div className="card p-6 h-full bg-slate-950 text-white border-slate-800">
                  <h3 className="font-bold text-slate-300 mb-4 flex items-center gap-2">
                    <Play className="w-4 h-4 text-primary-400" />During the quiz
                  </h3>
                  <div className="bg-slate-900 rounded-xl p-4 mb-3 flex items-center justify-between">
                    <span className="text-sm text-slate-400">Question 2 of 10</span>
                    <span className="text-primary-400 font-black text-xl">24s</span>
                  </div>
                  <div className="bg-slate-900 rounded-xl p-4 mb-3">
                    <p className="text-white font-semibold text-sm">What is the process by which plants make food using sunlight?</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {["Respiration", "Photosynthesis", "Osmosis", "Transpiration"].map((opt, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                          i === 1 ? "bg-primary-600 text-white" : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        <span className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center text-xs">{String.fromCharCode(65+i)}</span>
                        {opt}
                      </div>
                    ))}
                  </div>
                </div>
              </StaggerItem>

              {/* Leaderboard mock */}
              <StaggerItem className="md:col-span-2">
                <div className="card p-6">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />Final leaderboard
                  </h3>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {[
                      { rank: 1, name: "Sarah M.", score: 9400, correct: 9 },
                      { rank: 2, name: "Ahmed K.", score: 8750, correct: 8 },
                      { rank: 3, name: "Liu W.", score: 7200, correct: 7 },
                    ].map((e) => (
                      <div key={e.rank} className="flex items-center gap-4 py-3">
                        <span className="text-xl">{["🥇","🥈","🥉"][e.rank-1]}</span>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900 dark:text-white">{e.name}</p>
                          <p className="text-xs text-slate-400">{e.correct}/10 correct</p>
                        </div>
                        <span className="font-black text-primary-600 text-lg">{e.score.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </StaggerItem>
            </Stagger>
          </section>

          {/* CTA */}
          <Reveal>
            <div className="card p-10 text-center bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-900/10 border-primary-200 dark:border-primary-800 border-2">
              <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3">Ready to try it?</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-lg mx-auto">
                Create a free teacher account and run your first AI-powered quiz in minutes.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Magnetic>
                  <Link href="/auth/register" className="btn-primary shine py-3 px-8 text-base">
                    Start for free <ArrowRight className="w-5 h-5" />
                  </Link>
                </Magnetic>
                <Magnetic strength={0.25}>
                  <Link href="/student/join" className="btn-secondary py-3 px-8 text-base">
                    <Hash className="w-5 h-5" />Join a quiz
                  </Link>
                </Magnetic>
              </div>
            </div>
          </Reveal>
        </div>
      </main>
      <Footer />
    </div>
  );
}
