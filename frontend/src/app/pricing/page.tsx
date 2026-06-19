"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Check, X, Zap, Crown, ArrowRight, Loader2,
  BookOpen, Users, Sparkles, Play, BarChart3, Trophy
} from "lucide-react";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { authApi } from "@/lib/api";
import { getUser, setToken, setUser } from "@/lib/utils";
import { Reveal, Stagger, StaggerItem, TiltCard, Magnetic, HeroBackground, PulseBadge } from "@/components/ui/motion";

const FREE_FEATURES = [
  { label: "Create a free account", ok: true },
  { label: "Join live quizzes as student", ok: true },
  { label: "View example quizzes", ok: true },
  { label: "Create & run quizzes", ok: false },
  { label: "AI quiz generation from slides", ok: false },
  { label: "Live quiz sessions", ok: false },
  { label: "Real-time leaderboards", ok: false },
  { label: "PDF summarizer", ok: false },
];

const PREMIUM_FEATURES = [
  { icon: Sparkles, label: "AI quiz generation from slides" },
  { icon: Play, label: "Unlimited live quiz sessions" },
  { icon: Users, label: "Unlimited participants per session" },
  { icon: BarChart3, label: "Real-time answer statistics" },
  { icon: Trophy, label: "Gamified leaderboards" },
  { icon: BookOpen, label: "PDF & document summarizer" },
];

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const user = getUser();

  const handleUpgrade = async () => {
    if (!user) {
      router.push("/auth/register");
      return;
    }
    setLoading(true);
    try {
      const data = await authApi.upgrade();
      setToken(data.access_token);
      setUser(data.user);
      setSuccess(true);
      setTimeout(() => router.push("/teacher/dashboard"), 1500);
    } catch {
      router.push("/auth/register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 overflow-x-hidden">
      <Navbar />
      <main className="flex-1 pt-20">

        {/* Hero */}
        <section className="relative py-20 overflow-hidden">
          <HeroBackground />
          <div className="relative max-w-4xl mx-auto px-4 text-center">
            <PulseBadge className="mb-6 !bg-yellow-100/80 dark:!bg-yellow-900/20 !border-yellow-200/60 dark:!border-yellow-800/60 !text-yellow-700 dark:!text-yellow-400">
              <Crown className="w-4 h-4" />Simple pricing
            </PulseBadge>
            <Reveal delay={0.1}>
              <h1 className="text-5xl font-black text-slate-900 dark:text-white mb-4">
                Free to join,<br />
                <span className="text-gradient">powerful to teach</span>
              </h1>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                Sign up for free. Upgrade once to unlock AI quiz generation, live sessions, and everything else.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Plans */}
        <section className="py-20 max-w-5xl mx-auto px-4">
          <Stagger gap={0.15} className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

            {/* Free */}
            <StaggerItem>
            <TiltCard intensity={5}>
            <div className="card p-8">
              <div className="mb-6">
                <div className="badge bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 mb-3">Free</div>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-5xl font-black text-slate-900 dark:text-white">$0</span>
                  <span className="text-slate-500 pb-1">/forever</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm">No credit card needed</p>
              </div>

              <ul className="space-y-3 mb-8">
                {FREE_FEATURES.map((f, i) => (
                  <li key={i} className={`flex items-center gap-3 text-sm ${f.ok ? "text-slate-700 dark:text-slate-300" : "text-slate-400 dark:text-slate-600"}`}>
                    {f.ok
                      ? <div className="w-5 h-5 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center flex-shrink-0"><Check className="w-3 h-3 text-primary-600" /></div>
                      : <div className="w-5 h-5 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center flex-shrink-0"><X className="w-3 h-3 text-slate-400" /></div>
                    }
                    {f.label}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => router.push(user ? "/teacher/dashboard" : "/auth/register")}
                className="btn-secondary w-full py-3"
              >
                {user ? "Go to dashboard" : "Get started free"}
              </button>
            </div>
            </TiltCard>
            </StaggerItem>

            {/* Premium */}
            <StaggerItem>
            <TiltCard intensity={5}>
            <div className="relative card p-8 border-2 border-primary-400 dark:border-primary-600 shadow-xl shadow-primary-500/10">
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
                className="absolute -top-3.5 left-1/2 -translate-x-1/2"
              >
                <div className="flex items-center gap-1.5 bg-primary-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md shadow-primary-500/40">
                  <Zap className="w-3.5 h-3.5" />MOST POPULAR
                </div>
              </motion.div>

              <div className="mb-6">
                <div className="badge-green mb-3">Premium</div>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-5xl font-black text-slate-900 dark:text-white">$9</span>
                  <span className="text-slate-500 pb-1">/month</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Everything in Free, plus:</p>
              </div>

              <ul className="space-y-3 mb-8">
                {PREMIUM_FEATURES.map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                    <div className="w-5 h-5 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-primary-600" />
                    </div>
                    {f.label}
                  </li>
                ))}
              </ul>

              {success ? (
                <div className="flex items-center justify-center gap-2 py-3 bg-primary-600 rounded-xl text-white font-semibold">
                  <Check className="w-5 h-5" />Premium activated! Redirecting...
                </div>
              ) : (
                <button
                  onClick={handleUpgrade}
                  disabled={loading || user?.is_premium}
                  className="btn-primary shine w-full py-3 text-base shadow-lg shadow-primary-500/30 disabled:opacity-70"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : user?.is_premium ? (
                    <><Check className="w-5 h-5" />Already Premium</>
                  ) : (
                    <><Crown className="w-5 h-5" />Activate Premium <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              )}

              <p className="text-center text-xs text-slate-400 mt-3">
                {user ? "One click to unlock all features" : "Create an account first, then upgrade"}
              </p>
            </div>
            </TiltCard>
            </StaggerItem>
          </Stagger>

          {/* FAQ */}
          <div className="mt-20 max-w-2xl mx-auto">
            <Reveal>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-8">Common questions</h2>
            </Reveal>
            <Stagger gap={0.08} className="space-y-4">
              {[
                {
                  q: "Can students use EduTest AI for free?",
                  a: "Yes — students always join quizzes for free with just a code. No account needed.",
                },
                {
                  q: "What file formats does AI generation support?",
                  a: "PDF, PPTX, PPT, ODP, TXT, and image files. Just upload your lecture slides.",
                },
                {
                  q: "How many students can join a session?",
                  a: "There's no hard limit on participants per session.",
                },
                {
                  q: "Do I need to install anything?",
                  a: "No. Everything runs in the browser — students just need a phone or laptop.",
                },
              ].map((item, i) => (
                <StaggerItem key={i}>
                  <div className="card p-5 hover:-translate-y-1 transition-transform duration-300">
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{item.q}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{item.a}</p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
