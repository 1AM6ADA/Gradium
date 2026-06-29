import Link from "next/link";
import { Layers } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative bg-primary-950 text-primary-300 mt-auto overflow-hidden">
      <div className="absolute inset-0 arches opacity-20" />
      <div className="relative max-w-6xl mx-auto px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <span className="grid place-items-center w-8 h-8 rounded-md bg-primary-700 text-white">
                <Layers className="w-4 h-4" />
              </span>
              <span className="font-display text-lg text-white">Gradium</span>
            </div>
            <p className="text-sm leading-relaxed text-primary-400">
              Composed learning — turn your slides into calm, live quizzes your students will love.
            </p>
          </div>
          <div>
            <h4 className="text-white font-medium mb-3 text-sm">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/auth/register" className="hover:text-white transition-colors">For teachers</Link></li>
              <li><Link href="/student/join" className="hover:text-white transition-colors">For students</Link></li>
              <li><Link href="/examples" className="hover:text-white transition-colors">Examples</Link></li>
              <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium mb-3 text-sm">Features</h4>
            <ul className="space-y-2 text-sm text-primary-400">
              <li>AI quiz generation</li>
              <li>Live interactive sessions</li>
              <li>Attendance &amp; CSV export</li>
              <li>Multiple-answer &amp; untimed</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 mt-10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm">
          <p>© 2026 Gradium · Captain&apos;s Blue</p>
          <p className="text-primary-400 text-xs">Built for modern classrooms</p>
        </div>
      </div>
    </footer>
  );
}
