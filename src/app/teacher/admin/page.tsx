"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft, Ticket, Users, Loader2, Plus, Copy, Check, Trash2,
  ShieldCheck, AlertCircle, Sparkles,
} from "lucide-react";
import { adminApi } from "@/lib/api";
import { getUser } from "@/lib/utils";
import Navbar from "@/components/layout/navbar";

type Tier = "free" | "pro" | "max";

interface PromoCode {
  id: number;
  code: string;
  tier: string;
  used: boolean;
  used_by_email: string | null;
  used_at: string | null;
  created_at: string;
}

interface AdminUser {
  id: number;
  email: string;
  name: string;
  tier: Tier;
  is_premium: boolean;
  is_admin: boolean;
  generation_limit: number;
  generations_remaining: number;
  quiz_count: number;
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"codes" | "users">("codes");

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push("/auth/login"); return; }
    if (!u.is_admin) { router.push("/teacher/dashboard"); return; }
    setAuthorized(true);
  }, [router]);

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Navbar />
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        <Link href="/teacher/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white mb-6 group">
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />Back to dashboard
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-2xl bg-primary-100 dark:bg-primary-900/30 grid place-items-center">
            <ShieldCheck className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin panel</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Mint promo codes and manage subscriptions</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("codes")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors inline-flex items-center gap-2 ${tab === "codes" ? "bg-primary-600 text-white" : "bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-700"}`}
          >
            <Ticket className="w-4 h-4" />Promo codes
          </button>
          <button
            onClick={() => setTab("users")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors inline-flex items-center gap-2 ${tab === "users" ? "bg-primary-600 text-white" : "bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-700"}`}
          >
            <Users className="w-4 h-4" />Subscriptions
          </button>
        </div>

        {tab === "codes" ? <CodesTab /> : <UsersTab />}
      </main>
    </div>
  );
}

const TIER_BADGE: Record<string, string> = {
  free: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  pro: "badge-green",
  max: "badge-blue",
};

function CodesTab() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState<"pro" | "max">("pro");
  const [count, setCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [justCreated, setJustCreated] = useState<PromoCode[]>([]);
  const [copiedAll, setCopiedAll] = useState(false);
  const [error, setError] = useState("");

  const load = () => adminApi.listCodes().then(setCodes).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    try {
      const res = await adminApi.generateCodes(tier, count);
      setJustCreated(res.created);
      await load();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to generate codes");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this unused code?")) return;
    await adminApi.deleteCode(id);
    setCodes((prev) => prev.filter((c) => c.id !== id));
  };

  const copyAll = () => {
    navigator.clipboard.writeText(justCreated.map((c) => c.code).join("\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const available = codes.filter((c) => !c.used).length;

  return (
    <div className="space-y-6">
      {/* Generator */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary-600" />Generate new codes
        </h3>
        {error && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl mb-4 text-sm">
            <AlertCircle className="w-4 h-4" />{error}
          </div>
        )}
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="label text-xs">Tier</label>
            <select value={tier} onChange={(e) => setTier(e.target.value as "pro" | "max")} className="input w-32">
              <option value="pro">Pro</option>
              <option value="max">Max</option>
            </select>
          </div>
          <div>
            <label className="label text-xs">How many</label>
            <input type="number" min={1} max={100} value={count} onChange={(e) => setCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} className="input w-28" />
          </div>
          <button onClick={handleGenerate} disabled={generating} className="btn-primary py-2.5 px-5">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Generate
          </button>
        </div>

        {justCreated.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-900/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-primary-700 dark:text-primary-300">{justCreated.length} new {justCreated[0].tier.toUpperCase()} code{justCreated.length === 1 ? "" : "s"} — copy them now</p>
              <button onClick={copyAll} className="btn-secondary py-1.5 px-3 text-xs">
                {copiedAll ? <><Check className="w-3.5 h-3.5" />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy all</>}
              </button>
            </div>
            <div className="font-mono text-sm text-slate-700 dark:text-slate-300 space-y-0.5 max-h-48 overflow-y-auto">
              {justCreated.map((c) => <div key={c.id}>{c.code}</div>)}
            </div>
          </motion.div>
        )}
      </div>

      {/* Existing codes */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 dark:text-white">All codes</h3>
          <span className="text-sm text-slate-500 dark:text-slate-400">{available} available · {codes.length} total</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-primary-500 animate-spin" /></div>
        ) : codes.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">No codes yet — generate some above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800">
                  <th className="py-2 pr-3 font-semibold">Code</th>
                  <th className="py-2 px-3 font-semibold">Tier</th>
                  <th className="py-2 px-3 font-semibold">Status</th>
                  <th className="py-2 px-3 font-semibold">Redeemed by</th>
                  <th className="py-2 pl-3"></th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50 dark:border-slate-800/60">
                    <td className="py-2.5 pr-3 font-mono text-slate-700 dark:text-slate-300">{c.code}</td>
                    <td className="py-2.5 px-3"><span className={`badge ${TIER_BADGE[c.tier]}`}>{c.tier}</span></td>
                    <td className="py-2.5 px-3">
                      {c.used
                        ? <span className="text-slate-400">Used</span>
                        : <span className="text-primary-600 dark:text-primary-400 font-semibold">Available</span>}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{c.used_by_email || "—"}</td>
                    <td className="py-2.5 pl-3 text-right">
                      {!c.used && (
                        <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = () => adminApi.listUsers().then(setUsers).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const changeTier = async (u: AdminUser, tier: Tier) => {
    setSavingId(u.id);
    try {
      const updated = await adminApi.setUserTier(u.id, tier);
      setUsers((prev) => prev.map((x) => x.id === u.id ? updated : x));
    } finally {
      setSavingId(null);
    }
  };

  const removeUser = async (u: AdminUser) => {
    if (!confirm(`Delete ${u.email} and all their quizzes? This can't be undone.`)) return;
    await adminApi.deleteUser(u.id);
    setUsers((prev) => prev.filter((x) => x.id !== u.id));
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 dark:text-white">All accounts</h3>
        <span className="text-sm text-slate-500 dark:text-slate-400">{users.length} user{users.length === 1 ? "" : "s"}</span>
      </div>
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-primary-500 animate-spin" /></div>
      ) : users.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-10">No accounts yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800">
                <th className="py-2 pr-3 font-semibold">User</th>
                <th className="py-2 px-3 font-semibold">Quizzes</th>
                <th className="py-2 px-3 font-semibold">Left</th>
                <th className="py-2 px-3 font-semibold">Plan</th>
                <th className="py-2 pl-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-50 dark:border-slate-800/60">
                  <td className="py-2.5 pr-3">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      {u.name}
                      {u.is_admin && <span className="badge-blue text-[10px]">admin</span>}
                    </div>
                    <div className="text-xs text-slate-400">{u.email}</div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{u.quiz_count}</td>
                  <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{u.generations_remaining}/{u.generation_limit}</td>
                  <td className="py-2.5 px-3">
                    <select
                      value={u.tier}
                      onChange={(e) => changeTier(u, e.target.value as Tier)}
                      disabled={savingId === u.id}
                      className="input py-1.5 text-xs w-24"
                    >
                      <option value="free">Free</option>
                      <option value="pro">Pro</option>
                      <option value="max">Max</option>
                    </select>
                  </td>
                  <td className="py-2.5 pl-3 text-right">
                    {savingId === u.id
                      ? <Loader2 className="w-4 h-4 animate-spin text-primary-500 inline" />
                      : !u.is_admin && (
                        <button onClick={() => removeUser(u)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
