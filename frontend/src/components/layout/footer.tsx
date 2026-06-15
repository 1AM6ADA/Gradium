import Link from "next/link";
import { Brain, Github } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-bold text-lg">EduTest AI</span>
            </div>
            <p className="text-sm leading-relaxed">
              AI-powered quiz platform for modern educators. Create, run, and analyze quizzes with ease.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/auth/register" className="hover:text-primary-400 transition-colors">For Teachers</Link></li>
              <li><Link href="/student/join" className="hover:text-primary-400 transition-colors">For Students</Link></li>
              <li><Link href="/examples" className="hover:text-primary-400 transition-colors">Examples</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Features</h4>
            <ul className="space-y-2 text-sm">
              <li>AI Quiz Generation</li>
              <li>Live Interactive Quizzes</li>
              <li>PDF Summarization</li>
              <li>Real-time Leaderboards</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm">© 2025 EduTest AI. Built for educators.</p>
          <p className="text-xs">Powered by Google Gemini AI</p>
        </div>
      </div>
    </footer>
  );
}
