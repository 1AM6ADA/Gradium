"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  FileText, Upload, X, Loader2, BookOpen, ArrowLeft,
  Sparkles, Copy, Check, AlertCircle, Hash
} from "lucide-react";
import { studentApi } from "@/lib/api";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

export default function SummarizePage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleFile = (f: File) => {
    setFile(f);
    setSummary("");
    setError("");
  };

  const handleSummarize = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setSummary("");
    try {
      const result = await studentApi.summarize(file);
      setSummary(result.summary);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "Failed to summarize. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Render markdown-like summary
  const renderSummary = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      if (line.startsWith("**") && line.endsWith("**")) {
        return <h3 key={i} className="font-bold text-slate-900 dark:text-white text-lg mt-4 mb-2 first:mt-0">{line.replace(/\*\*/g, "")}</h3>;
      }
      if (line.startsWith("## ")) return <h3 key={i} className="font-bold text-slate-900 dark:text-white text-lg mt-4 mb-2">{line.replace("## ", "")}</h3>;
      if (line.startsWith("# ")) return <h2 key={i} className="font-black text-slate-900 dark:text-white text-xl mt-4 mb-2">{line.replace("# ", "")}</h2>;
      if (line.startsWith("- ") || line.startsWith("• ")) return <li key={i} className="ml-4 text-slate-700 dark:text-slate-300">{line.slice(2)}</li>;
      if (line.trim() === "") return <br key={i} />;
      // Handle inline bold
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i} className="text-slate-700 dark:text-slate-300 leading-relaxed">
          {parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="font-semibold text-slate-900 dark:text-white">{part}</strong> : part)}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-16 w-full">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/student/join" className="btn-ghost p-2">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">PDF Summarizer</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Upload any document and get an AI-generated summary</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Upload */}
          <div className="card p-6">
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                dragOver ? "border-primary-400 bg-primary-50 dark:bg-primary-900/20" :
                file ? "border-primary-300 bg-primary-50/50 dark:bg-primary-900/10" :
                "border-slate-200 dark:border-slate-700 hover:border-primary-300 hover:bg-slate-50 dark:hover:bg-slate-900"
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.pptx,.ppt,.txt,.md"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              {file ? (
                <div>
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-6 h-6 text-primary-600" />
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-white">{file.name}</p>
                  <p className="text-sm text-slate-400 mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); setSummary(""); }}
                    className="mt-2 text-xs text-red-500 hover:text-red-700 flex items-center gap-1 mx-auto"
                  >
                    <X className="w-3 h-3" />Remove
                  </button>
                </div>
              ) : (
                <div>
                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Drop your document here</p>
                  <p className="text-sm text-slate-400 mt-0.5">PDF, PPTX, PPT, TXT</p>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl mt-4 text-sm">
                <AlertCircle className="w-4 h-4" />{error}
              </div>
            )}

            <button
              onClick={handleSummarize}
              disabled={!file || loading}
              className="btn-primary w-full mt-4 py-3"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" />Summarizing...</>
              ) : (
                <><Sparkles className="w-5 h-5" />Summarize with AI</>
              )}
            </button>
          </div>

          {/* Result */}
          {summary && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary-600" />Summary
                </h2>
                <button onClick={handleCopy} className="btn-ghost py-1.5 px-3 text-sm">
                  {copied ? <><Check className="w-3.5 h-3.5 text-primary-600" />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
                </button>
              </div>
              <div className="prose prose-slate dark:prose-invert max-w-none space-y-1">
                {renderSummary(summary)}
              </div>
            </motion.div>
          )}

          {/* CTA to join quiz */}
          {!summary && (
            <div className="card p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 text-center">
              <Hash className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Have a quiz code?</p>
              <p className="text-sm text-slate-400 mb-4">Join your class quiz instead</p>
              <Link href="/student/join" className="btn-primary py-2 text-sm">
                Join a quiz
              </Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
