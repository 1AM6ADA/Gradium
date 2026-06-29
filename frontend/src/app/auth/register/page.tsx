"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Layers, Eye, EyeOff, ArrowRight, AlertCircle, Check } from "lucide-react";
import { authApi } from "@/lib/api";
import { setToken, setUser } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const perks = [
    "Compose quizzes from your slides",
    "Run calm, live interactive sessions",
    "Attendance roster & CSV export",
    "Real-time scoring and streaks",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await authApi.register({ name, email, password });
      setToken(data.access_token);
      setUser(data.user);
      router.push("/teacher/dashboard");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-[#f5f8fa]">
      <div className="absolute inset-0 arches opacity-60" />
      <div className="absolute -right-40 -top-40 w-[36rem] h-[36rem] rounded-full bg-gradient-to-br from-primary-200/55 to-primary-400/30 blur-3xl drift" />

      <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        {/* Left: poised pitch */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="hidden lg:block"
        >
          <Link href="/" className="inline-flex items-center gap-2.5 mb-8">
            <span className="grid place-items-center w-10 h-10 rounded-lg bg-primary-700 text-white">
              <Layers className="w-5 h-5" />
            </span>
            <span className="font-display text-xl text-primary-950">Gradium</span>
          </Link>
          <h2 className="font-display font-light text-4xl text-primary-950 leading-tight mb-4">
            The composed way to run <em className="italic text-primary-600">classroom quizzes</em>
          </h2>
          <p className="text-primary-700/80 mb-8 leading-relaxed">
            Upload your slides, let AI draft the questions, and run a calm, structured live quiz.
          </p>
          <ul className="space-y-3">
            {perks.map((p, i) => (
              <li key={i} className="flex items-center gap-3 text-primary-800">
                <span className="grid place-items-center w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex-shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Right: form */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="grid place-items-center w-10 h-10 rounded-lg bg-primary-700 text-white">
                <Layers className="w-5 h-5" />
              </span>
              <span className="font-display text-xl text-primary-950">Gradium</span>
            </Link>
          </div>

          <div className="card p-8">
            <h1 className="font-display font-light text-3xl text-primary-950 mb-1">Create your account</h1>
            <p className="text-primary-700/70 text-sm mb-6">Free to begin — no credit card needed</p>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Full name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Dr. Sarah Johnson" required />
              </div>
              <div>
                <label className="label">Email address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="teacher@school.edu" required />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pr-12"
                    placeholder="Min. 6 characters"
                    required
                    minLength={6}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400 hover:text-primary-700">
                    {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Create account <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          </div>

          <p className="text-center text-primary-700/70 mt-6 text-sm">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-primary-700 font-semibold hover:underline">Sign in</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
