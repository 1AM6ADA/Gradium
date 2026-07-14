"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Check, Zap, Crown, ArrowRight, Loader2, Sparkles, Rocket,
  Send, Ticket, AlertCircle, Lock,
} from "lucide-react";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { authApi } from "@/lib/api";
import { getUser, setToken, setUser, type Tier } from "@/lib/utils";
import { Reveal, Stagger, StaggerItem, TiltCard, HeroBackground, PulseBadge } from "@/components/ui/motion";

const TELEGRAM = "muhammadjonaslonov";

// Shared, tier-independent capabilities — every logged-in teacher gets these.
const SHARED_FEATURES = [
  "Create live quizzes & tests",
  "Run unlimited live sessions",
  "Unlimited participants",
  "Publish tests & share links",
  "Real-time stats & leaderboards",
  "PDF & document summarizer",
  "Add & edit questions manually",
];

interface Plan {
  tier: Tier;
  name: string;
  price: string;
  perMonth: number;
  blurb: string;
  icon: typeof Sparkles;
  popular?: boolean;
}

const PLANS: Plan[] = [
  { tier: "free", name: "Free", price: "$0", perMonth: 3, blurb: "Try AI generation", icon: Sparkles },
  { tier: "pro", name: "Pro", price: "$9.99", perMonth: 30, blurb: "For regular teaching", icon: Zap, popular: true },
  { tier: "max", name: "Max", price: "$14.99", perMonth: 60, blurb: "For power users", icon: Rocket },
];

const RANK: Record<Tier, number> = { free: 0, pro: 1, max: 2 };

export default function PricingPage() {
  const router = useRouter();
  const user = getUser();
  const currentTier: Tier = user?.tier ?? (user?.is_premium ? "max" : "free");

  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState("");
  const [successTier, setSuccessTier] = useState<Tier | null>(null);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    if (!user) { router.push("/auth/register"); return; }
    setRedeeming(true);
    setError("");
    try {
      const data = await authApi.redeem(code.trim());
      setToken(data.access_token);
      setUser(data.user);
      setSuccessTier(data.user.tier as Tier);
      setCode("");
      setTimeout(() => router.push("/teacher/dashboard"), 1400);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "Could not redeem this code. Please try again.");
    } finally {
      setRedeeming(false);
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
            <PulseBadge className="mb-6 !bg-amber-100/80 dark:!bg-amber-900/20 !border-amber-200/60 dark:!border-amber-800/60 !text-amber-700 dark:!text-amber-400">
              <Crown className="w-4 h-4" />Simple pricing
            </PulseBadge>
            <Reveal delay={0.15} duration={0.9}>
              <h1 className="text-5xl font-black text-slate-900 dark:text-white mb-4">
                Every plan does everything.<br />
                <span className="text-gradient">Pick your AI generation limit</span>
              </h1>
            </Reveal>
            <Reveal delay={0.3} duration={0.9}>
              <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                All plans unlock live quizzes, tests, and every feature. Tiers differ only by how many
                AI quiz/test generations you can run each month.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Plans */}
        <section className="pb-8 max-w-6xl mx-auto px-4">
          <Stagger gap={0.18} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {PLANS.map((plan) => {
              const isCurrent = user != null && currentTier === plan.tier;
              const isLower = user != null && RANK[plan.tier] < RANK[currentTier];
              return (
                <StaggerItem key={plan.tier}>
                  <TiltCard intensity={5}>
                    <div className={`relative card p-8 h-full ${
                      plan.popular
                        ? "border-2 border-primary-400 dark:border-primary-600 shadow-xl shadow-primary-500/10"
                        : ""
                    }`}>
                      {plan.popular && (
                        <motion.div
                          initial={{ opacity: 0, y: -8, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ delay: 0.55, type: "spring", stiffness: 180, damping: 18 }}
                          className="absolute -top-3.5 left-1/2 -translate-x-1/2"
                        >
                          <div className="flex items-center gap-1.5 bg-primary-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md shadow-primary-500/40 whitespace-nowrap">
                            <Zap className="w-3.5 h-3.5" />MOST POPULAR
                          </div>
                        </motion.div>
                      )}

                      <div className="mb-6">
                        <div className={`badge mb-3 inline-flex items-center gap-1.5 ${
                          plan.tier === "free"
                            ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            : plan.tier === "pro" ? "badge-green" : "badge-blue"
                        }`}>
                          <plan.icon className="w-3 h-3" />{plan.name}
                        </div>
                        <div className="flex items-end gap-1 mb-1">
                          <span className="text-5xl font-black text-slate-900 dark:text-white">{plan.price}</span>
                          <span className="text-slate-500 pb-1">{plan.tier === "free" ? "/forever" : "/month"}</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">{plan.blurb}</p>
                      </div>

                      {/* Headline quota */}
                      <div className={`rounded-2xl px-4 py-3 mb-6 text-center ${
                        plan.popular
                          ? "bg-primary-50 dark:bg-primary-900/20"
                          : "bg-slate-50 dark:bg-slate-800/60"
                      }`}>
                        <p className="text-3xl font-black text-primary-700 dark:text-primary-300">
                          {plan.perMonth}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          AI generation{plan.perMonth === 1 ? "" : "s"} / month
                        </p>
                      </div>

                      <ul className="space-y-2.5 mb-8">
                        {SHARED_FEATURES.map((f, i) => (
                          <li key={i} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                            <div className="w-5 h-5 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                              <Check className="w-3 h-3 text-primary-600" />
                            </div>
                            {f}
                          </li>
                        ))}
                      </ul>

                      {/* Action / status */}
                      {successTier === plan.tier ? (
                        <div className="flex items-center justify-center gap-2 py-3 bg-primary-600 rounded-xl text-white font-semibold">
                          <Check className="w-5 h-5" />{plan.name} activated!
                        </div>
                      ) : isCurrent ? (
                        <div className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300 font-semibold text-sm">
                          <Check className="w-4 h-4" />Your current plan
                        </div>
                      ) : isLower ? (
                        <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 font-semibold text-sm">
                          <Lock className="w-4 h-4" />Included in your plan
                        </div>
                      ) : plan.tier === "free" ? (
                        <button
                          onClick={() => router.push(user ? "/teacher/dashboard" : "/auth/register")}
                          className="btn-secondary w-full py-3 text-base"
                        >
                          {user ? "Go to dashboard" : "Get started free"}
                        </button>
                      ) : (
                        <a
                          href={`https://t.me/${TELEGRAM}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${plan.popular ? "btn-primary shine shadow-lg shadow-primary-500/30" : "btn-secondary"} w-full py-3 text-base`}
                        >
                          <Send className="w-4 h-4" />Get {plan.name} code
                        </a>
                      )}
                    </div>
                  </TiltCard>
                </StaggerItem>
              );
            })}
          </Stagger>
        </section>

        {/* Subscribe / redeem */}
        <section className="pb-20 max-w-2xl mx-auto px-4">
          <Reveal>
            <div className="card p-7 border-2 border-primary-200 dark:border-primary-800">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-900/30 grid place-items-center flex-shrink-0">
                  <Ticket className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">How to subscribe</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Message me on Telegram to buy a Pro or Max promo code, then redeem it below.
                    Each code works once and instantly upgrades your account.
                  </p>
                </div>
              </div>

              <a
                href={`https://t.me/${TELEGRAM}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary w-full py-3 mb-6"
              >
                <Send className="w-4 h-4" />Contact @{TELEGRAM} on Telegram
                <ArrowRight className="w-4 h-4" />
              </a>

              <div className="relative mb-5">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-700" /></div>
                <div className="relative flex justify-center"><span className="bg-white dark:bg-slate-900 px-3 text-xs text-slate-400 uppercase tracking-wider">Already have a code?</span></div>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl mb-4 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                </div>
              )}

              {successTier ? (
                <div className="flex items-center justify-center gap-2 py-3 bg-primary-600 rounded-xl text-white font-semibold">
                  <Check className="w-5 h-5" />Upgraded to {successTier.charAt(0).toUpperCase() + successTier.slice(1)}! Redirecting…
                </div>
              ) : (
                <form onSubmit={handleRedeem} className="flex flex-col sm:flex-row gap-3">
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="GRDM-PRO-XXXX-XXXX"
                    className="input flex-1 font-mono tracking-wide uppercase"
                    autoComplete="off"
                  />
                  <button type="submit" disabled={redeeming || !code.trim()} className="btn-primary py-3 px-6 whitespace-nowrap">
                    {redeeming ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Ticket className="w-4 h-4" />Redeem</>}
                  </button>
                </form>
              )}
              {!user && (
                <p className="text-xs text-slate-400 text-center mt-3">You&apos;ll need to <button onClick={() => router.push("/auth/register")} className="text-primary-600 hover:underline">create an account</button> first.</p>
              )}
            </div>
          </Reveal>

          {/* FAQ */}
          <div className="mt-16 max-w-2xl mx-auto">
            <Reveal>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-8">Common questions</h2>
            </Reveal>
            <Stagger gap={0.08} className="space-y-4">
              {[
                {
                  q: "How do I pay?",
                  a: `Message @${TELEGRAM} on Telegram. I'll send you a one-time promo code for Pro or Max, which you redeem above to upgrade instantly.`,
                },
                {
                  q: "What counts as an AI generation?",
                  a: "Each time you generate a full quiz or test from slides (or from picked topics). Editing, regenerating a single question, and adding questions manually don't count.",
                },
                {
                  q: "When does my limit reset?",
                  a: "Every month. Your generation count resets at the start of each month (UTC), so you get your full allowance back.",
                },
                {
                  q: "Can I downgrade later?",
                  a: "Plans only move up (Free → Pro → Max). A promo code can only raise your tier, never lower it.",
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
