import type { Metadata } from "next";
import { Inter, Spectral } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/theme-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const spectral = Spectral({ subsets: ["latin"], variable: "--font-display", weight: ["300", "400", "500", "600"] });

export const metadata: Metadata = {
  title: "Gradium — Composed learning",
  description: "Turn your slides into live quizzes. Calm, considered, and built to last.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${spectral.variable} font-sans`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
