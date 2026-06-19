"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Sun, Moon, Menu, X, LogOut, LayoutDashboard, BookOpen } from "lucide-react";
import { getUser, removeToken } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ScrollProgress } from "@/components/ui/motion";

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

  const isTeacher = pathname.startsWith("/teacher");
  const isAuth = pathname.startsWith("/auth");

  if (isAuth) return null;

  return (
    <>
    <ScrollProgress />
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 shadow-sm"
          : "bg-transparent"
      )}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <motion.div
            whileHover={{ scale: 1.1, rotate: -8 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center shadow-md shadow-primary-500/30"
          >
            <Brain className="w-5 h-5 text-white" />
          </motion.div>
          <span className="text-lg font-bold text-slate-900 dark:text-white hidden sm:block">
            EduTest <span className="text-primary-600">AI</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          <Link href="/examples" className="btn-ghost text-sm">Examples</Link>
          <Link href="/pricing" className="btn-ghost text-sm">Pricing</Link>
          {user ? (
            <>
              <Link href="/teacher/dashboard" className="btn-ghost text-sm">
                <LayoutDashboard className="w-4 h-4" />Dashboard
              </Link>
              <button onClick={handleLogout} className="btn-ghost text-sm text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                <LogOut className="w-4 h-4" />Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/student/join" className="btn-ghost text-sm">
                <BookOpen className="w-4 h-4" />Join Quiz
              </Link>
              <Link href="/auth/login" className="btn-ghost text-sm">Login</Link>
              <Link href="/auth/register" className="btn-primary text-sm py-2 px-4">
                Get Started
              </Link>
            </>
          )}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="btn-ghost p-2 rounded-xl ml-1"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Mobile */}
        <div className="flex md:hidden items-center gap-2">
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="btn-ghost p-2"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}
          <button onClick={() => setMenuOpen(!menuOpen)} className="btn-ghost p-2">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800"
          >
            <div className="px-4 py-4 flex flex-col gap-2">
              <Link href="/examples" onClick={() => setMenuOpen(false)} className="btn-ghost justify-start">Examples</Link>
              <Link href="/pricing" onClick={() => setMenuOpen(false)} className="btn-ghost justify-start">Pricing</Link>
              <Link href="/student/join" onClick={() => setMenuOpen(false)} className="btn-ghost justify-start">
                <BookOpen className="w-4 h-4" />Join Quiz
              </Link>
              {user ? (
                <>
                  <Link href="/teacher/dashboard" onClick={() => setMenuOpen(false)} className="btn-ghost justify-start">
                    <LayoutDashboard className="w-4 h-4" />Dashboard
                  </Link>
                  <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="btn-ghost justify-start text-red-600">
                    <LogOut className="w-4 h-4" />Logout
                  </button>
                </>
              ) : (
                <>
                  <Link href="/auth/login" onClick={() => setMenuOpen(false)} className="btn-ghost justify-start">Login</Link>
                  <Link href="/auth/register" onClick={() => setMenuOpen(false)} className="btn-primary justify-center">Get Started</Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
    </>
  );
}
