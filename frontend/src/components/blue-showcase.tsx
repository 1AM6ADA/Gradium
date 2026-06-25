"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Upload, Sparkles, Radio, BarChart3 } from "lucide-react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const panels = [
  {
    n: "I",
    icon: Upload,
    title: "Upload your slides",
    desc: "PDF, PPTX or PPT — rendered visually, slide by slide, so nothing is lost in translation.",
  },
  {
    n: "II",
    icon: Sparkles,
    title: "Compose the quiz",
    desc: "AI drafts precise, on-topic questions in seconds. Refine each one to your own standard.",
  },
  {
    n: "III",
    icon: Radio,
    title: "Open the room",
    desc: "Share a six-character code. Students arrive from any device — no app, no account.",
  },
  {
    n: "IV",
    icon: BarChart3,
    title: "Read the room",
    desc: "Live answers, scoring and streaks, and a final leaderboard that closes the lesson.",
  },
];

export function BlueShowcase() {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px)", () => {
        const trackEl = track.current!;
        const distance = trackEl.scrollWidth - window.innerWidth;

        const tween = gsap.to(trackEl, {
          x: -distance,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: () => `+=${distance}`,
            scrub: 1,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        gsap.utils.toArray<HTMLElement>(".bs-panel").forEach((panel) => {
          const inner = panel.querySelector(".bs-inner");
          if (!inner) return;
          gsap.fromTo(
            inner,
            { y: 36 },
            {
              y: -36,
              ease: "none",
              scrollTrigger: {
                trigger: panel,
                containerAnimation: tween,
                start: "left right",
                end: "right left",
                scrub: true,
              },
            }
          );
        });
      });
    },
    { scope: root }
  );

  return (
    <section ref={root} className="relative bg-[#eef3f7] md:h-screen md:overflow-hidden">
      <div className="absolute inset-0 arches opacity-60 pointer-events-none" />
      <div ref={track} className="relative flex flex-col md:flex-row md:h-screen md:w-max">
        {/* Intro panel */}
        <div className="bs-panel flex md:h-screen w-full md:w-screen shrink-0 items-center justify-center px-6 py-24 md:py-0">
          <div className="bs-inner max-w-md">
            <p className="text-sm uppercase tracking-[0.2em] text-primary-500 mb-5">The method</p>
            <h2 className="font-display font-light text-5xl md:text-6xl leading-[1.02] text-primary-950">
              Four measured<br />steps.
            </h2>
            <p className="mt-6 text-lg text-primary-700/80 leading-relaxed">
              Scroll on — the whole flow unfolds sideways, from a raw lecture deck to a
              live, scored quiz.
            </p>
            <div className="mt-8 hidden md:flex items-center gap-3 text-sm text-primary-400">
              <span className="h-px w-12 bg-primary-300" /> keep scrolling
            </div>
          </div>
        </div>

        {/* Step panels */}
        {panels.map((p) => (
          <div
            key={p.n}
            className="bs-panel relative flex md:h-screen w-full md:w-screen shrink-0 items-center justify-center px-6 py-24 md:py-0"
          >
            <div className="bs-inner w-full max-w-lg">
              <div className="flex items-center gap-6">
                <span className="font-display text-[7rem] md:text-[10rem] font-light leading-none text-primary-200 select-none">
                  {p.n}
                </span>
                <div className="grid place-items-center h-16 w-16 rounded-2xl bg-primary-700 text-white shadow-xl shadow-primary-500/20">
                  <p.icon className="h-8 w-8" />
                </div>
              </div>
              <h3 className="mt-6 font-display font-light text-4xl md:text-5xl text-primary-950">{p.title}</h3>
              <p className="mt-4 text-lg leading-relaxed text-primary-700/80">{p.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
