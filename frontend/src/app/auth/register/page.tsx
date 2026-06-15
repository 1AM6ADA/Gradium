"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Brain, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle } from "lucide-react";
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
    "Create unlimited quizzes",
    "AI generates questions from slides",
    "Run live interactive sessions",
    "Real-time student analytics",
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-primary-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left: perks */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="hidden lg:block"
        >
          <Link href="/" className="inline-flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black text-slate-900 dark:text-white">
              EduTest <span className="text-primary-600">AI</span>
            </span>
          </Link>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-4 leading-tight">
            The smartest way to run{" "}
            <span className="text-primary-600">classroom quizzes</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
            Upload your slides, let AI do the work. Your students get an engaging, game-like quiz experience.
          </p>
          <ul className="space-y-3">
            {perks.map((p, i) => (
              <li key={i} className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                <div className="w-6 h-6 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                </div>
                {p}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Right: form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-black text-slate-900 dark:text-white">EduTest AI</span>
            </Link>
          </div>

          <div className="card p-8">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Create teacher account</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Free forever — no credit card required</p>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl mb-6 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Full name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  placeholder="Dr. Sarah Johnson"
                  required
                />
              </div>
              <div>
                <label className="label">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="teacher@school.edu"
                  required
                />
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
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Create account <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-slate-500 dark:text-slate-400 mt-6 text-sm">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-primary-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
