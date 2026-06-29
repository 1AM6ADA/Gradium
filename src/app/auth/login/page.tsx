"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Layers, Eye, EyeOff, ArrowRight, AlertCircle } from "lucide-react";
import { authApi } from "@/lib/api";
import { setToken, setUser } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await authApi.login({ email, password });
      setToken(data.access_token);
      setUser(data.user);
      router.push("/teacher/dashboard");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-[#f5f8fa]">
      {/* serene blue backdrop */}
      <div className="absolute inset-0 arches opacity-60" />
      <div className="absolute -right-40 -top-40 w-[34rem] h-[34rem] rounded-full bg-gradient-to-br from-primary-200/60 to-primary-400/30 blur-3xl drift" />
      <div className="absolute -left-40 -bottom-40 w-[30rem] h-[30rem] rounded-full bg-gradient-to-tr from-primary-100/70 to-primary-300/40 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="grid place-items-center w-11 h-11 rounded-lg bg-primary-700 text-white shadow-lg shadow-primary-500/30">
              <Layers className="w-5 h-5" />
            </span>
            <span className="font-display text-2xl text-primary-950">Gradium</span>
          </Link>
          <p className="text-primary-700/70 mt-3">Welcome back — sign in to your studio</p>
        </div>

        <div className="card p-8">
          <h1 className="font-display font-light text-3xl text-primary-950 mb-6">Sign in</h1>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
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
                  placeholder="••••••••"
                  required
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400 hover:text-primary-700">
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Sign in <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        </div>

        <p className="text-center text-primary-700/70 mt-6 text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/auth/register" className="text-primary-700 font-semibold hover:underline">Sign up free</Link>
        </p>
        <p className="text-center mt-3">
          <Link href="/student/join" className="text-sm text-primary-500 hover:text-primary-700">Join a quiz as a student →</Link>
        </p>
      </motion.div>
    </div>
  );
}
