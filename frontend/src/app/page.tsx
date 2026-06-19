"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";
import {
  Brain, Users, FileText, ChevronRight, Play, BookOpen,
  ArrowRight, Upload, BarChart3, Trophy, Sparkles, FileType2, Presentation, FileSpreadsheet
} from "lucide-react";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import {
  Reveal, Stagger, StaggerItem, AnimatedText, TiltCard,
  Magnetic, AnimatedCounter, Marquee,
} from "@/components/ui/motion";

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
    desc: "The AI reads your content and crafts smart multiple-choice questions in seconds.",
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

const stats = [
  { to: 6, suffix: "+", label: "Slide formats supported" },
  { to: 10, suffix: "s", label: "To generate a full quiz" },
  { to: 100, suffix: "%", label: "Free for students" },
  { to: 0, prefix: "$", suffix: "", label: "Setup cost", display: "0" },
];

const formats = ["PDF", "PPTX", "PPT", "ODP", "DOCX", "TXT", "Images", "Slides"];

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const blobY = useTransform(scrollYProgress, [0, 1], [0, -80]);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 overflow-x-hidden">
      <Navbar />

      {/* ===================== HERO ===================== */}
      <section ref={heroRef} className="relative pt-28 pb-24 overflow-hidden">
        {/* Layered animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-primary-950/20" />
        <div className="absolute inset-0 bg-grid" />
        <motion.div style={{ y: blobY }} className="absolute inset-0">
          <div className="blob animate-blob top-0 right-0 w-[600px] h-[600px] bg-primary-300/30 dark:bg-primary-700/15 -translate-y-1/3 translate-x-1/4" />
          <div className="blob animate-blob-slow bottom-0 left-0 w-[450px] h-[450px] bg-teal-300/25 dark:bg-teal-700/12 translate-y-1/3 -translate-x-1/4" />
          <div className="blob animate-blob top-1/3 left-1/3 w-[350px] h-[350px] bg-emerald-300/20 dark:bg-emerald-700/10" />
        </motion.div>

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
        >
          {/* Floating badge */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="inline-flex items-center gap-2 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-primary-200/60 dark:border-primary-800/60 text-primary-700 dark:text-primary-300 text-sm font-semibold px-4 py-2 rounded-full mb-6 shadow-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-500" />
            </span>
            AI-Powered Education Platform
          </motion.div>

          {/* Headline with word-by-word reveal */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-slate-900 dark:text-white leading-[1.05] mb-6 tracking-tight">
            <AnimatedText text="Turn slides into" className="block" />
            <AnimatedText text="live quizzes" highlight="quizzes" delay={0.25} className="block" />
            <AnimatedText text="in seconds" delay={0.5} className="block" />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Upload your lecture slides. AI generates smart questions. Run interactive live quizzes
            your students will love — from any device.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.85 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Magnetic>
              <Link href="/auth/register" className="btn-primary shine text-base px-8 py-4 shadow-lg shadow-primary-500/25">
                Start for free <ArrowRight className="w-5 h-5" />
              </Link>
            </Magnetic>
            <Magnetic strength={0.25}>
              <Link href="/student/join" className="btn-secondary text-base px-8 py-4">
                <BookOpen className="w-5 h-5" />
                Join a quiz
              </Link>
            </Magnetic>
          </motion.div>

          {/* Role cards with 3D tilt */}
          <Stagger gap={0.15} className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto mt-16">
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
              <StaggerItem key={i}>
                <TiltCard>
                  <Link
                    href={card.href}
                    className="group card p-6 text-left block border-2 hover:border-primary-200 dark:hover:border-primary-800 transition-colors duration-300"
                  >
                    <div style={{ transform: "translateZ(40px)" }}>
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-4 shadow-md group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300`}>
                        <card.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="badge-green text-xs mb-2">{card.badge}</div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{card.title}</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{card.desc}</p>
                      <div className="flex items-center gap-1 text-primary-600 font-semibold text-sm mt-4 group-hover:gap-2 transition-all">
                        Get started <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </Link>
                </TiltCard>
              </StaggerItem>
            ))}
          </Stagger>
        </motion.div>
      </section>

      {/* ===================== FORMAT MARQUEE ===================== */}
      <section className="py-8 border-y border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <Reveal className="text-center mb-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Works with every slide format
          </p>
        </Reveal>
        <div className="relative">
          {/* edge fades */}
          <div className="absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-slate-50 dark:from-slate-950 to-transparent" />
          <div className="absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-slate-50 dark:from-slate-950 to-transparent" />
          <Marquee>
            {formats.map((fmt, i) => (
              <div
                key={i}
                className="mx-3 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm whitespace-nowrap"
              >
                <FileType2 className="w-4 h-4 text-primary-500" />
                <span className="font-bold text-slate-700 dark:text-slate-300">{fmt}</span>
              </div>
            ))}
          </Marquee>
        </div>
      </section>

      {/* ===================== STATS ===================== */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <StaggerItem key={i}>
                <div className="text-center">
                  <div className="text-5xl sm:text-6xl font-black text-gradient mb-2">
                    {"display" in s ? (
                      <span>{s.prefix}{s.display}</span>
                    ) : (
                      <AnimatedCounter to={s.to} prefix={s.prefix} suffix={s.suffix} />
                    )}
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{s.label}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ===================== HOW IT WORKS ===================== */}
      <section className="py-24 bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <Reveal className="text-center mb-16">
            <h2 className="section-title mb-4">How it works</h2>
            <p className="section-subtitle max-w-xl mx-auto">From slides to live quiz in under 2 minutes</p>
          </Reveal>

          <Stagger gap={0.12} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <StaggerItem key={i} className="relative">
                <div className="card p-6 h-full hover:-translate-y-1.5 transition-transform duration-300">
                  <div className="text-5xl font-black text-primary-200 dark:text-primary-900 mb-3">{step.n}</div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{step.title}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">{step.desc}</p>
                </div>
                {i < 3 && (
                  <motion.div
                    className="hidden lg:flex absolute top-1/2 -right-4 z-10"
                    animate={{ x: [0, 6, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <ArrowRight className="w-6 h-6 text-primary-400 dark:text-primary-600" />
                  </motion.div>
                )}
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ===================== FEATURES ===================== */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-16">
            <h2 className="section-title mb-4">Everything you need</h2>
            <p className="section-subtitle max-w-xl mx-auto">Built for modern classrooms and remote learning</p>
          </Reveal>

          <Stagger gap={0.08} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <StaggerItem key={i}>
                <TiltCard intensity={6} className="h-full">
                  <div className="card shine p-6 group h-full">
                    <div style={{ transform: "translateZ(30px)" }}>
                      <div className={`w-12 h-12 rounded-2xl ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                        <f.icon className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{f.title}</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                </TiltCard>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ===================== CTA ===================== */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 to-primary-800" />
        <motion.div
          className="absolute inset-0 opacity-20"
          animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          style={{
            backgroundImage: "radial-gradient(circle at 20% 30%, white 0%, transparent 40%), radial-gradient(circle at 80% 70%, white 0%, transparent 40%)",
            backgroundSize: "200% 200%",
          }}
        />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <Reveal>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
              Ready to transform your classroom?
            </h2>
            <p className="text-xl text-primary-100 mb-10 max-w-2xl mx-auto">
              Join educators using AI to create engaging quizzes in minutes, not hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Magnetic>
                <Link href="/auth/register" className="shine inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-primary-700 font-bold rounded-xl hover:bg-primary-50 transition-all shadow-xl text-base">
                  Create free account <ArrowRight className="w-5 h-5" />
                </Link>
              </Magnetic>
              <Magnetic strength={0.25}>
                <Link href="/examples" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary-500/30 text-white font-bold rounded-xl hover:bg-primary-500/50 transition-all border border-primary-400/50 text-base backdrop-blur-sm">
                  <Play className="w-5 h-5" />See examples
                </Link>
              </Magnetic>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
