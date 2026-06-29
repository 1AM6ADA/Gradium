"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { useRef, useState, useEffect, ReactNode } from "react";
import { ArrowRight, Layers, Radio, ShieldCheck, FileText, Check, Clock, LayoutDashboard, LogOut } from "lucide-react";
import { BlueShowcase } from "@/components/blue-showcase";
import { getUser, removeToken } from "@/lib/utils";

function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-12%" });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.85, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function Nav() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUser(getUser());
  }, []);

  const handleLogout = () => {
    removeToken();
    setUser(null);
    router.refresh();
  };

  return (
    <header className="absolute top-0 inset-x-0 z-30">
      <nav className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo doubles as the "go to main page" button */}
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid place-items-center w-8 h-8 rounded-md bg-primary-700 text-white">
            <Layers className="w-4 h-4" />
          </span>
          <span className="font-display text-xl text-primary-900">Gradium</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm text-primary-700/80">
          <a href="#how" className="hover:text-primary-900 transition-colors">Method</a>
          <a href="#features" className="hover:text-primary-900 transition-colors">Features</a>
          <Link href="/examples" className="hover:text-primary-900 transition-colors">Examples</Link>
          <Link href="/pricing" className="hover:text-primary-900 transition-colors">Pricing</Link>
        </div>

        <div className="flex items-center gap-2">
          {mounted && user ? (
            <>
              <button onClick={handleLogout} className="hidden sm:inline-flex items-center gap-1.5 text-sm text-primary-700/80 hover:text-primary-900 px-3 py-2 transition-colors">
                <LogOut className="w-4 h-4" />Log out
              </button>
              <Link href="/teacher/dashboard" className="inline-flex items-center gap-1.5 rounded-lg bg-primary-700 px-5 py-2.5 text-sm text-white hover:bg-primary-800 transition-colors shadow-sm">
                <LayoutDashboard className="w-4 h-4" />Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="hidden sm:inline-flex text-sm text-primary-700/80 hover:text-primary-900 px-3 py-2 transition-colors">
                Login
              </Link>
              <Link href="/auth/register" className="rounded-lg bg-primary-700 px-5 py-2.5 text-sm text-white hover:bg-primary-800 transition-colors shadow-sm">
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

export default function BlueHome() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const layerA = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const layerB = useTransform(scrollYProgress, [0, 1], [0, 220]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <main className="bg-[#f5f8fa] text-primary-950 overflow-x-hidden selection:bg-primary-200">
      <Nav />

      {/* HERO — layered depth */}
      <section ref={heroRef} className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        <div className="absolute inset-0 arches opacity-70" />
        {/* stacked translucent panels suggesting cathedral depth */}
        <motion.div style={{ y: layerB }} className="absolute right-[-6%] top-[12%] w-[40rem] h-[40rem] rounded-[3rem] bg-gradient-to-br from-primary-300/50 to-primary-500/30 blur-2xl" />
        <motion.div style={{ y: layerA }} className="absolute right-[6%] top-[26%] w-[26rem] h-[30rem] rounded-[2.5rem] bg-gradient-to-br from-primary-200/70 to-primary-400/40 blur-xl drift" />

        <motion.div style={{ opacity: fade }} className="relative max-w-6xl mx-auto px-6 grid lg:grid-cols-12 gap-10 items-center w-full">
          <div className="lg:col-span-7">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/70 border border-primary-200 px-3.5 py-1.5 text-xs font-medium text-primary-700 backdrop-blur">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500" /> Composed learning, built to last
              </span>
            </Reveal>
            <h1 className="font-display font-light text-primary-950 mt-7 leading-[1.02] text-5xl sm:text-6xl lg:text-7xl">
              {["Turn your slides", "into a quiz with", "quiet authority."].map((line, i) => (
                <span key={i} className="block overflow-hidden">
                  <motion.span
                    className="inline-block"
                    initial={{ y: "110%" }}
                    animate={{ y: 0 }}
                    transition={{ duration: 0.95, delay: 0.15 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {i === 2 ? <em className="italic text-primary-600 font-normal">{line}</em> : line}
                  </motion.span>
                </span>
              ))}
            </h1>
            <Reveal delay={0.5}>
              <p className="mt-7 max-w-lg text-lg leading-relaxed text-primary-700/90">
                Upload a deck, let AI compose the questions, and run a calm, structured
                live quiz your whole class can join in seconds.
              </p>
            </Reveal>
            <Reveal delay={0.62}>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link href="/auth/register" className="group inline-flex items-center gap-2 rounded-lg bg-primary-700 px-7 py-3.5 text-white text-sm hover:bg-primary-800 transition-colors shadow-md shadow-primary-500/20">
                  Start for free <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link href="/student/join" className="rounded-lg border border-primary-300 bg-white/60 px-7 py-3.5 text-sm text-primary-800 hover:bg-white transition-colors backdrop-blur">
                  Join a quiz
                </Link>
              </div>
            </Reveal>
          </div>

          {/* quiz panel */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-5"
          >
            <div className="rounded-2xl bg-white/85 backdrop-blur-xl border border-primary-200 p-6 shadow-[0_30px_70px_-30px_rgba(34,48,69,0.4)]">
              <div className="flex items-center justify-between text-xs text-primary-500 mb-4">
                <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> 22s</span>
                <span>Question 4 / 12</span>
              </div>
              <p className="font-display text-xl text-primary-950 leading-snug mb-5">
                Which arch distributes weight most efficiently?
              </p>
              <div className="space-y-2.5">
                {[
                  { t: "Pointed (Gothic)", ok: true },
                  { t: "Rounded (Romanesque)", ok: false },
                  { t: "Flat lintel", ok: false },
                ].map((o, i) => (
                  <div key={i} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${o.ok ? "bg-primary-600 text-white" : "bg-primary-50 text-primary-700"}`}>
                    <span className={`grid place-items-center w-6 h-6 rounded-md text-xs ${o.ok ? "bg-white/25" : "bg-primary-200"}`}>
                      {o.ok ? <Check className="w-3.5 h-3.5" /> : String.fromCharCode(65 + i)}
                    </span>
                    {o.t}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* HOW — horizontal scroll (scroll down → panels move left) */}
      <div id="how">
        <BlueShowcase />
      </div>

      {/* FEATURES */}
      <section id="features" className="py-24 bg-gradient-to-b from-transparent via-primary-100/50 to-transparent">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal className="mb-14 text-center">
            <h2 className="font-display font-light text-4xl sm:text-5xl text-primary-950">A toolkit with poise</h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Radio, t: "Live sessions", d: "Real-time rooms with a shared join code and instant entry." },
              { icon: ShieldCheck, t: "Attendance roster", d: "Collect verified-style emails and export the class as CSV." },
              { icon: FileText, t: "Study summaries", d: "Students distil any document into a structured, calm note." },
            ].map((f, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <div className="group h-full rounded-2xl bg-white border border-primary-200/80 p-8 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_28px_60px_-28px_rgba(34,48,69,0.35)]">
                  <div className="w-12 h-12 rounded-xl bg-primary-100 grid place-items-center text-primary-700 mb-6 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                    <f.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-display text-2xl text-primary-950 mb-2">{f.t}</h3>
                  <p className="text-primary-700/80 leading-relaxed">{f.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST band */}
      <section id="trust" className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <Reveal>
            <div className="rounded-3xl bg-primary-900 text-white px-8 py-16 text-center relative overflow-hidden">
              <div className="absolute inset-0 arches opacity-20" />
              <p className="relative font-display font-light text-3xl sm:text-4xl leading-[1.35]">
                Built like a cathedral — structured, enduring, and calm under the weight
                of a full classroom.
              </p>
              <Link href="/auth/register" className="relative inline-flex items-center gap-2 mt-10 rounded-lg bg-white text-primary-900 px-8 py-3.5 text-sm font-medium hover:bg-primary-100 transition-colors">
                Begin building <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-primary-200/70 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-primary-500">
          <span className="font-display text-lg text-primary-900">Gradium</span>
          <span>Captain&apos;s Blue · 18-4020 TCX</span>
        </div>
      </footer>
    </main>
  );
}
