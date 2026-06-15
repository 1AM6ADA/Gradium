"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Brain, Zap, Users, FileText, ChevronRight, Play, BookOpen,
  Star, ArrowRight, Upload, BarChart3, Trophy, Sparkles
} from "lucide-react";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" },
  }),
};

const features = [
  {
    icon: Upload,
    title: "Upload Any Slides",
    desc: "Support for PDF, PPTX, PPT, ODP, and more. Just drag and drop your lecture materials.",
    color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  },
  {
    icon: Sparkles,
    title: "AI Generates Questions",
    desc: "Powered by Google Gemini, the AI reads your content and crafts smart multiple-choice questions instantly.",
    color: "bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400",
  },
  {
    icon: Play,
    title: "Run Live Quiz",
    desc: "Start a session, share a 6-character code with students. They join instantly — no registration needed.",
    color: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
  },
  {
    icon: BarChart3,
    title: "Real-time Stats",
    desc: "Watch answers roll in live. See how your class performs on every question in real time.",
    color: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
  },
  {
    icon: Trophy,
    title: "Leaderboard",
    desc: "Gamified scoring keeps students engaged. Faster correct answers earn more points.",
    color: "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400",
  },
  {
    icon: FileText,
    title: "PDF Summarizer",
    desc: "Students can upload any document and get an AI-generated summary with key concepts.",
    color: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
  },
];

const steps = [
  { n: "01", title: "Upload slides", desc: "PPTX, PDF, or any format" },
  { n: "02", title: "AI creates quiz", desc: "Questions generated in seconds" },
  { n: "03", title: "Share the code", desc: "Students join from any device" },
  { n: "04", title: "Run live quiz", desc: "Control, monitor, celebrate" },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-28 pb-24 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-primary-950/20" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-100/50 dark:bg-primary-900/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-100/50 dark:bg-blue-900/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0}
            className="inline-flex items-center gap-2 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-semibold px-4 py-2 rounded-full mb-6"
          >
            <Sparkles className="w-4 h-4" />
            AI-Powered Education Platform
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={1}
            className="text-5xl sm:text-6xl lg:text-7xl font-black text-slate-900 dark:text-white leading-tight mb-6"
          >
            Turn slides into{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-primary-700">
              live quizzes
            </span>{" "}
            <br className="hidden sm:block" />
            in seconds
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={2}
            className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Upload your lecture slides. AI generates smart questions. Run interactive live quizzes
            your students will love — from any device.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={3}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link href="/auth/register" className="btn-primary text-base px-8 py-4 shadow-lg shadow-primary-500/25">
              Start for free <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/student/join" className="btn-secondary text-base px-8 py-4">
              <BookOpen className="w-5 h-5" />
              Join a quiz
            </Link>
          </motion.div>

          {/* Role cards */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={5}
            className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto mt-16"
          >
            {[
              {
                href: "/auth/register",
                icon: Brain,
                title: "I'm a Teacher",
                desc: "Create quizzes from slides, run live sessions, track results",
                color: "from-primary-500 to-primary-700",
                badge: "Professor / Instructor",
              },
              {
                href: "/student/join",
                icon: BookOpen,
                title: "I'm a Student",
                desc: "Join quiz with a code or summarize your study materials",
                color: "from-blue-500 to-blue-700",
                badge: "Student / Learner",
              },
            ].map((card, i) => (
              <Link
                key={i}
                href={card.href}
                className="group card p-6 text-left hover:scale-[1.02] transition-all duration-200 border-2 hover:border-primary-200 dark:hover:border-primary-800"
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform`}>
                  <card.icon className="w-6 h-6 text-white" />
                </div>
                <div className="badge-green text-xs mb-2">{card.badge}</div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{card.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{card.desc}</p>
                <div className="flex items-center gap-1 text-primary-600 font-semibold text-sm mt-4 group-hover:gap-2 transition-all">
                  Get started <ChevronRight className="w-4 h-4" />
                </div>
              </Link>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <h2 className="section-title mb-4">How it works</h2>
            <p className="section-subtitle max-w-xl mx-auto">From slides to live quiz in under 2 minutes</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                className="relative"
              >
                <div className="card p-6">
                  <div className="text-5xl font-black text-primary-100 dark:text-primary-900 mb-3">{step.n}</div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{step.title}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">{step.desc}</p>
                </div>
                {i < 3 && (
                  <div className="hidden lg:flex absolute top-1/2 -right-3 z-10">
                    <ArrowRight className="w-5 h-5 text-primary-300 dark:text-primary-700" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <h2 className="section-title mb-4">Everything you need</h2>
            <p className="section-subtitle max-w-xl mx-auto">Built for modern classrooms and remote learning</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i * 0.5}
                className="card p-6 group hover:scale-[1.01] transition-transform"
              >
                <div className={`w-12 h-12 rounded-2xl ${f.color} flex items-center justify-center mb-4`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{f.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-br from-primary-600 to-primary-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
              Ready to transform your classroom?
            </h2>
            <p className="text-xl text-primary-100 mb-10 max-w-2xl mx-auto">
              Join educators using AI to create engaging quizzes in minutes, not hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-primary-700 font-bold rounded-xl hover:bg-primary-50 transition-all shadow-xl hover:-translate-y-0.5 text-base">
                Create free account <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/examples" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary-500/30 text-white font-bold rounded-xl hover:bg-primary-500/40 transition-all border border-primary-400/50 text-base">
                <Play className="w-5 h-5" />See examples
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
