"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Sun, Moon, Menu, X, LogOut, LayoutDashboard, BookOpen } from "lucide-react";
import { getUser, removeToken } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    setUser(getUser());
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  const handleLogout = () => {
    removeToken();
    setUser(null);
    router.push("/");
  };

  const isAuth = pathname.startsWith("/auth");
  if (isAuth) return null;

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-[#f5f8fa]/85 dark:bg-[#151f2e]/85 backdrop-blur-md border-b border-primary-200/60 dark:border-primary-800/60"
          : "bg-transparent"
      )}
    >
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <span className="grid place-items-center w-12 h-12 rounded-lg bg-primary-700 text-white shadow-md shadow-primary-500/30 group-hover:scale-105 transition-transform">
            <Layers className="w-6 h-6" />
          </span>
          <span className="font-display text-3xl text-primary-950 dark:text-white">Gradium</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-7 text-sm text-primary-700/80 dark:text-primary-300">
          <Link href="/examples" className="hover:text-primary-950 dark:hover:text-white transition-colors">Examples</Link>
          <Link href="/pricing" className="hover:text-primary-950 dark:hover:text-white transition-colors">Pricing</Link>
          {user ? (
            <>
              <Link href="/teacher/dashboard" className="inline-flex items-center gap-1.5 hover:text-primary-950 dark:hover:text-white transition-colors">
                <LayoutDashboard className="w-4 h-4" />Dashboard
              </Link>
              <button onClick={handleLogout} className="inline-flex items-center gap-1.5 text-red-600/90 hover:text-red-700 transition-colors">
                <LogOut className="w-4 h-4" />Logout
              </button>
            </>
          ) : (
            <Link href="/student/join" className="inline-flex items-center gap-1.5 hover:text-primary-950 dark:hover:text-white transition-colors">
              <BookOpen className="w-4 h-4" />Join quiz
            </Link>
          )}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="grid place-items-center w-9 h-9 rounded-lg text-primary-600 hover:bg-primary-100 dark:text-primary-300 dark:hover:bg-primary-900/40 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}
          <Link
            href={user ? "/teacher/dashboard" : "/auth/register"}
            className="rounded-lg bg-primary-700 px-5 py-2.5 text-white hover:bg-primary-800 transition-colors shadow-sm"
          >
            {user ? "Dashboard" : "Get started"}
          </Link>
        </div>

        {/* Mobile */}
        <div className="flex md:hidden items-center gap-2">
          {mounted && (
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="grid place-items-center w-9 h-9 rounded-lg text-primary-600 dark:text-primary-300">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}
          <button onClick={() => setMenuOpen(!menuOpen)} className="grid place-items-center w-9 h-9 rounded-lg text-primary-700 dark:text-primary-200">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#f5f8fa] dark:bg-[#151f2e] border-b border-primary-200/60 dark:border-primary-800/60 overflow-hidden"
          >
            <div className="px-5 py-4 flex flex-col gap-1 text-primary-700 dark:text-primary-200">
              <Link href="/examples" onClick={() => setMenuOpen(false)} className="py-2">Examples</Link>
              <Link href="/pricing" onClick={() => setMenuOpen(false)} className="py-2">Pricing</Link>
              <Link href="/student/join" onClick={() => setMenuOpen(false)} className="py-2">Join quiz</Link>
              {user ? (
                <>
                  <Link href="/teacher/dashboard" onClick={() => setMenuOpen(false)} className="py-2">Dashboard</Link>
                  <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="py-2 text-left text-red-600">Logout</button>
                </>
              ) : (
                <Link href="/auth/register" onClick={() => setMenuOpen(false)} className="mt-1 rounded-lg bg-primary-700 px-5 py-2.5 text-white text-center">Get started</Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
